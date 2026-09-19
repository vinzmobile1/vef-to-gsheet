import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  FileSpreadsheet,
  Clock,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertCircle,
  CheckCircle2,
  Layers,
  Save,
  Trash2,
  Calendar,
  Sliders,
  Database,
  Building,
  Eye,
  Info,
} from "lucide-react";
import { SheetProfile, ItemSummaryRow, VefUser } from "../types";
import { DataPreviewTable } from "./DataPreviewTable";
import { DeleteCardModal } from "./DeleteCardModal";
import { ScheduleTimeListManager } from "./ScheduleTimeListManager";

interface CardDetailPageProps {
  profile: SheetProfile;
  user: VefUser;
  onBack: () => void;
  onUpdateProfile: (id: string, updates: Partial<SheetProfile>) => Promise<void>;
  onExportProfile: (id: string) => Promise<void>;
  onPreviewProfile: (id: string) => Promise<{
    previewRows: ItemSummaryRow[];
    totalRows: number;
    sheetData: any[][];
    headers: string[];
  }>;
  onDeleteProfile: (id: string) => Promise<void>;
  isExporting: boolean;
  isPreviewing: boolean;
}

export const CardDetailPage: React.FC<CardDetailPageProps> = ({
  profile,
  user,
  onBack,
  onUpdateProfile,
  onExportProfile,
  onPreviewProfile,
  onDeleteProfile,
  isExporting,
  isPreviewing,
}) => {
  const [activeTab, setActiveTab] = useState<"sheets" | "schedule" | "preview">("sheets");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Local form state
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description || "");
  const [spreadsheetId, setSpreadsheetId] = useState(profile.spreadsheetId || "");
  const [sheetName, setSheetName] = useState(profile.sheetName || "Item Summary");
  const [startCell, setStartCell] = useState(profile.startCell || "A1");
  const [appsScriptUrl, setAppsScriptUrl] = useState(profile.appsScriptUrl || "");
  const [googleAccessToken, setGoogleAccessToken] = useState(profile.googleAccessToken || "");

  // VEF query filters
  const [company, setCompany] = useState(profile.company || "DG Group");
  const [sumAllWarehouses, setSumAllWarehouses] = useState(profile.sumAllWarehouses ?? 1);
  const [vefBaseUrl, setVefBaseUrl] = useState(profile.vefBaseUrl || "https://dgi.vef-solution.com");

  // Schedule settings (Timezone GMT+7 Asia/Jakarta)
  const [scheduleEnabled, setScheduleEnabled] = useState(profile.scheduleEnabled || false);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(
    profile.scheduleTimes && profile.scheduleTimes.length > 0
      ? profile.scheduleTimes
      : ["09:00", "14:00", "17:00"]
  );
  const [intervalHours, setIntervalHours] = useState(profile.intervalHours || 3);
  const [timezone, setTimezone] = useState(profile.timezone || "Asia/Jakarta");

  // Preview & Scorecard state
  const [previewRows, setPreviewRows] = useState<ItemSummaryRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(profile.lastRowCount || 0);
  const [sheetData, setSheetData] = useState<any[][] | null>(null);
  const [tableHeaders, setTableHeaders] = useState<string[]>([
    "Item Code",
    "Item Name",
    "Brand",
    "Item Group",
    "Parent Item Group",
    "Actual QTY",
    "Available QTY",
    "Reserved QTY",
    "UOM",
  ]);

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Prevent background polling from wiping unsaved inputs in the active card
  const currentProfileIdRef = useRef<string | null>(null);

  // Sync state ONLY when switching to a different card profile
  useEffect(() => {
    if (currentProfileIdRef.current !== profile.id) {
      currentProfileIdRef.current = profile.id;
      setName(profile.name);
      setDescription(profile.description || "");
      setSpreadsheetId(profile.spreadsheetId || "");
      setSheetName(profile.sheetName || "Item Summary");
      setStartCell(profile.startCell || "A1");
      setAppsScriptUrl(profile.appsScriptUrl || "");
      setGoogleAccessToken(profile.googleAccessToken || "");
      setCompany(profile.company || "DG Group");
      setSumAllWarehouses(profile.sumAllWarehouses ?? 1);
      setVefBaseUrl(profile.vefBaseUrl || "https://dgi.vef-solution.com");
      setScheduleEnabled(profile.scheduleEnabled || false);
      setScheduleTimes(
        profile.scheduleTimes && profile.scheduleTimes.length > 0
          ? profile.scheduleTimes
          : ["09:00", "14:00", "17:00"]
      );
      setIntervalHours(profile.intervalHours || 3);
      setTimezone(profile.timezone || "Asia/Jakarta");
    }
    // Keep live row count synced if updated from background
    if (profile.lastRowCount !== undefined) setTotalRows(profile.lastRowCount);
  }, [profile.id, profile.lastRowCount]);

  // Clean spreadsheet link
  const spreadsheetLink = useMemo(() => {
    if (!spreadsheetId.trim()) return "";
    if (spreadsheetId.startsWith("http")) return spreadsheetId;
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }, [spreadsheetId]);

  // Handle URL paste & auto extract ID
  const handleSpreadsheetInput = (val: string) => {
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      setSpreadsheetId(match[1]);
    } else {
      setSpreadsheetId(val);
    }
  };

  // Robust Apps Script Web App URL input & paste handler
  const handleAppsScriptUrlChange = (val: string) => {
    // Strip accidental wrapping quotes or spaces
    const cleaned = val.trim().replace(/^['"]|['"]$/g, "");
    setAppsScriptUrl(cleaned);
  };

  const handleAppsScriptPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text) {
      e.preventDefault();
      const cleaned = text.trim().replace(/^['"]|['"]$/g, "");
      setAppsScriptUrl(cleaned);
    }
  };

  const handleAppsScriptBlur = async () => {
    const cleaned = appsScriptUrl.trim().replace(/^['"]|['"]$/g, "");
    if (cleaned !== appsScriptUrl) {
      setAppsScriptUrl(cleaned);
    }
    // Auto-save to server if URL changed so it is never lost on refresh or tab switch
    if (cleaned && cleaned !== (profile.appsScriptUrl || "")) {
      try {
        await onUpdateProfile(profile.id, { appsScriptUrl: cleaned });
      } catch (err) {
        console.warn("Auto-save Apps Script URL on blur:", err);
      }
    }
  };

  // Dynamic Apps Script Code generator - user explicitly requested sheet and cell to change dynamically!
  const dynamicAppsScriptCode = useMemo(() => {
    const targetSheet = (sheetName.trim() || "Item Summary").replace(/'/g, "\\'");
    const targetCell = (startCell.trim() || "A1").replace(/"/g, '\\"');

    return `// Google Apps Script - Web App Receiver untuk VEF Exporter (${name || "Target Sheet"})
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = body.spreadsheetId 
      ? SpreadsheetApp.openById(body.spreadsheetId) 
      : SpreadsheetApp.getActiveSpreadsheet();
      
    var sheet = ss.getSheetByName(body.sheetName || '${targetSheet}');
    if (!sheet) {
      sheet = ss.insertSheet(body.sheetName || '${targetSheet}');
    }
    
    if (body.clearSheet) {
      sheet.clear();
    }
    
    var startCell = body.startCell || "${targetCell}";
    var range = sheet.getRange(startCell);
    var rows = body.rows;
    
    if (rows && rows.length > 0) {
      sheet.getRange(range.getRow(), range.getColumn(), rows.length, rows[0].length).setValues(rows);
      sheet.getRange(range.getRow(), range.getColumn(), 1, rows[0].length).setFontWeight("bold");
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }, [name, sheetName, startCell]);

  const copyAppsScript = () => {
    navigator.clipboard.writeText(dynamicAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copySpreadsheetId = () => {
    if (!spreadsheetId) return;
    navigator.clipboard.writeText(spreadsheetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile(profile.id, {
        name: name.trim(),
        description: description.trim(),
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim() || "Item Summary",
        startCell: startCell.trim() || "A1",
        appsScriptUrl: appsScriptUrl.trim(),
        googleAccessToken: googleAccessToken.trim(),
        company: company.trim(),
        sumAllWarehouses: Number(sumAllWarehouses),
        vefBaseUrl: vefBaseUrl.trim(),
        scheduleEnabled,
        scheduleTimes: scheduleTimes.length > 0 ? scheduleTimes : ["09:00", "14:00", "17:00"],
        intervalHours: Number(intervalHours),
        timezone,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // Export with auto pre-save of current inputs (so Apps Script URL / Sheet ID are immediately persisted before export runs)
  const handleExportWithPreSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile(profile.id, {
        name: name.trim(),
        description: description.trim(),
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim() || "Item Summary",
        startCell: startCell.trim() || "A1",
        appsScriptUrl: appsScriptUrl.trim().replace(/^['"]|['"]$/g, ""),
        googleAccessToken: googleAccessToken.trim(),
        company: company.trim(),
        sumAllWarehouses: Number(sumAllWarehouses),
        vefBaseUrl: vefBaseUrl.trim(),
        scheduleEnabled,
        scheduleTimes: scheduleTimes.length > 0 ? scheduleTimes : ["09:00", "14:00", "17:00"],
        intervalHours: Number(intervalHours),
        timezone,
      });
    } catch (err) {
      console.warn("Pre-save before export warning:", err);
    } finally {
      setIsSaving(false);
    }

    onExportProfile(profile.id);
  };

  // Trigger preview for this card
  const handleFetchPreview = async () => {
    try {
      const res = await onPreviewProfile(profile.id);
      if (res) {
        setPreviewRows(res.previewRows || []);
        setTotalRows(res.totalRows || 0);
        setSheetData(res.sheetData || null);
        if (res.headers) setTableHeaders(res.headers);
        setActiveTab("preview");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Download CSV
  const handleDownloadCsv = () => {
    if (!sheetData || sheetData.length === 0) {
      // If no preview data yet, alert or fetch
      handleFetchPreview();
      return;
    }

    const csvContent = sheetData
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? "");
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `VEF_${(name || "Item_Summary").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumbs & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-cards"
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Daftar Card</span>
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {name || "Pengaturan Card Google Sheet"}
              </h1>
              {scheduleEnabled ? (
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Jadwal Aktif ({intervalHours} Jam)</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  Jadwal Nonaktif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tab: <b className="text-slate-700 font-mono">[{sheetName || "Item Summary"}]</b> • Cell:{" "}
              <b className="text-slate-700 font-mono">[{startCell || "A1"}]</b> • Perusahaan:{" "}
              <b className="text-slate-700">{company}</b>
            </p>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-card-preview"
            onClick={handleFetchPreview}
            disabled={isPreviewing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
          >
            <Eye className={`w-3.5 h-3.5 ${isPreviewing ? "animate-spin" : ""}`} />
            <span>{isPreviewing ? "Memuat..." : "Pratinjau Data"}</span>
          </button>

          <button
            id="btn-card-save"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Card</span>
              </>
            )}
          </button>

          <button
            id="btn-card-export"
            onClick={handleExportWithPreSave}
            disabled={isExporting || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExporting ? "animate-spin" : ""}`} />
            <span>{isExporting ? "Mengekspor..." : "Ekspor ke Google Sheet"}</span>
          </button>

          <button
            id="btn-card-header-delete"
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title="Hapus Card ini"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveTab("sheets")}
          className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "sheets"
              ? "border-blue-600 text-blue-600 bg-blue-50/40"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Koneksi Google Sheet & Apps Script</span>
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "schedule"
              ? "border-blue-600 text-blue-600 bg-blue-50/40"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Penjadwalan & Jam Kerja Card</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "preview"
              ? "border-blue-600 text-blue-600 bg-blue-50/40"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Score Card & Pratinjau Data</span>
        </button>
      </div>

      {/* TAB CONTENT 1: GOOGLE SHEETS SETTINGS & DYNAMIC APPS SCRIPT CODE */}
      {activeTab === "sheets" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Box: Sheet Form Inputs */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Pengaturan Target Google Sheet</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Nama Card / Target Sheet
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Card Profil..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    ID Google Spreadsheet
                  </label>
                  {spreadsheetLink && (
                    <a
                      href={spreadsheetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                    >
                      <span>Buka Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => handleSpreadsheetInput(e.target.value)}
                    placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-9"
                  />
                  {spreadsheetId && (
                    <button
                      type="button"
                      onClick={copySpreadsheetId}
                      title="Salin ID"
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bisa paste ID langsung atau seluruh URL link Google Sheet di address bar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase mb-1.5">
                    Nama Tab (Sheet)
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Item Summary"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Otomatis dibuat jika belum ada</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase mb-1.5">
                    Cell Posisi Awal
                  </label>
                  <input
                    type="text"
                    value={startCell}
                    onChange={(e) => setStartCell(e.target.value)}
                    placeholder="A1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Default cell A1</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800 uppercase">
                    URL Google Apps Script Web App (Direkomendasikan)
                  </label>
                  {appsScriptUrl.trim() && (
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>URL Siap</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="input-card-apps-script-url"
                    type="text"
                    inputMode="url"
                    value={appsScriptUrl}
                    onChange={(e) => handleAppsScriptUrlChange(e.target.value)}
                    onPaste={handleAppsScriptPaste}
                    onBlur={handleAppsScriptBlur}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tempel URL Web App dari Deploy Google Sheets (Execute as: Me, Anyone). URL tidak akan hilang dan otomatis tersimpan saat berpindah atau ekspor.
                </p>
              </div>

              {/* Filter ERPNext Frappe VEF */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter Query ERPNext VEF</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Perusahaan (Company)
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="DG Group"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Sum All Warehouses
                    </label>
                    <select
                      value={sumAllWarehouses}
                      onChange={(e) => setSumAllWarehouses(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                    >
                      <option value={1}>1 - Semua Gudang (Aktif)</option>
                      <option value={0}>0 - Pisahkan Gudang</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: DYNAMIC APPS SCRIPT CODE RECEIVER */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      GAS
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Kode Google Apps Script Receiver (Otomatis Menyesuaikan)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Nama Sheet dan Cell di dalam script berubah otomatis sesuai input Anda
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-copy-apps-script"
                    type="button"
                    onClick={copyAppsScript}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Script</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Preview Box */}
                <div className="relative bg-slate-900 rounded-xl p-3.5 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                  <pre>{dynamicAppsScriptCode}</pre>
                </div>

                {/* Steps instructions */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cara Pasang di Google Sheets:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                    <li>
                      Buka Google Sheet target &rarr; menu <b>Extensions</b> &rarr; <b>Apps Script</b>.
                    </li>
                    <li>
                      Paste kode di atas &rarr; klik tombol <b>Deploy</b> (kanan atas) &rarr; <b>New deployment</b>.
                    </li>
                    <li>
                      Pilih jenis <b>Web app</b> &rarr; Execute as: <b>Me</b> &rarr; Who has access: <b>Anyone</b>.
                    </li>
                    <li>Salin URL Web App yang dihasilkan dan tempel ke kolom URL di sebelah kiri.</li>
                  </ol>
                </div>
              </div>

              {/* Danger Zone: Delete Profile */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Hapus card target ini jika sudah tidak digunakan</span>
                <button
                  id="btn-delete-card"
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PER-CARD SCHEDULE & WORKING HOURS */}
      {activeTab === "schedule" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Otomasi Penjadwalan untuk Card: {name}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Atur jadwal penarikan otomatis mandiri untuk Google Sheet ini tanpa memengaruhi card lainnya.
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className="text-xs font-bold text-slate-800">
                {scheduleEnabled ? "Jadwal Aktif" : "Jadwal Nonaktif"}
              </span>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Time-based Scheduling (GMT+7 Jakarta) */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <ScheduleTimeListManager
              scheduleTimes={scheduleTimes}
              onChange={setScheduleTimes}
              nextRunTimeStr={profile.nextRunTimeStr}
              disabled={!scheduleEnabled}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: SCORE CARD & DATA PREVIEW PER CARD */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          {/* Action to refresh / download */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Score Card & Pratinjau Data: {name}
              </h2>
              <p className="text-xs text-slate-500">
                Data ditarik dari Frappe ERPNext VEF dengan filter Perusahaan: <b>{company}</b>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download CSV</span>
              </button>
              <button
                onClick={handleFetchPreview}
                disabled={isPreviewing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPreviewing ? "animate-spin" : ""}`} />
                <span>{isPreviewing ? "Memuat..." : "Tarik Ulang Data"}</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <DataPreviewTable
            data={previewRows}
            headers={tableHeaders}
            totalCount={totalRows}
            lastUpdated={profile.lastRunTimestamp ? new Date(profile.lastRunTimestamp).toLocaleTimeString() : undefined}
          />
        </div>
      )}

      {/* Confirmation Modal to Delete Card */}
      <DeleteCardModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        profile={profile}
        onConfirmDelete={async (id) => {
          await onDeleteProfile(id);
          onBack();
        }}
      />
    </div>
  );
};
