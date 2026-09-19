import React, { useState } from "react";
import {
  X,
  Settings,
  Clock,
  Save,
  Link,
  Shield,
  Volume2,
  Bell,
  Code,
  Copy,
  Check,
  Server,
  Sliders,
  FileSpreadsheet,
} from "lucide-react";
import { ScheduleConfig } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ScheduleConfig;
  onSaveConfig: (updated: Partial<ScheduleConfig>) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  desktopNotificationEnabled: boolean;
  onRequestDesktopNotification: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  soundEnabled,
  onToggleSound,
  desktopNotificationEnabled,
  onRequestDesktopNotification,
}) => {
  const [activeTab, setActiveTab] = useState<"sheets" | "vef" | "notifications">("sheets");

  const [timezone, setTimezone] = useState(config.timezone || "Asia/Jakarta");

  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || "");
  const [googleAccessToken, setGoogleAccessToken] = useState(config.googleAccessToken || "");

  const [vefBaseUrl, setVefBaseUrl] = useState(config.vefBaseUrl || "https://dgi.vef-solution.com");
  const [company, setCompany] = useState(config.company || "DG Group");
  const [sumAllWarehouses, setSumAllWarehouses] = useState(config.sumAllWarehouses ?? 1);

  const [copiedScript, setCopiedScript] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      timezone,
      appsScriptUrl: appsScriptUrl.trim(),
      googleAccessToken: googleAccessToken.trim(),
      vefBaseUrl: vefBaseUrl.trim(),
      company: company.trim(),
      sumAllWarehouses: Number(sumAllWarehouses),
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const appsScriptCodeSnippet = `// Google Apps Script - Web App Receiver untuk VEF Exporter
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = body.spreadsheetId 
      ? SpreadsheetApp.openById(body.spreadsheetId) 
      : SpreadsheetApp.getActiveSpreadsheet();
      
    var sheet = ss.getSheetByName(body.sheetName || 'Item Summary');
    if (!sheet) {
      sheet = ss.insertSheet(body.sheetName || 'Item Summary');
    }
    
    if (body.clearSheet) {
      sheet.clear();
    }
    
    var startCell = body.startCell || "A1";
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

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCodeSnippet);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pengaturan Dashboard Aplikasi
              </h2>
              <p className="text-xs text-slate-700">
                Konfigurasi batas jam kerja, koneksi Google Sheets, dan server VEF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab("sheets")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "sheets"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Koneksi Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab("vef")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "vef"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Server ERPNext VEF</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "notifications"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifikasi</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* TAB 2: GOOGLE SHEETS */}
          {activeTab === "sheets" && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                Aplikasi ini mendukung ekspor langsung menggunakan <b>Google Apps Script Web App</b> (sangat mudah, tanpa konfigurasi GCP Cloud) atau <b>Google Sheets API OAuth / Access Token</b>.
              </div>

              {/* Method A: Google Apps Script Webhook */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-800 uppercase">
                    URL Google Apps Script Web App (Direkomendasikan)
                  </label>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Kode Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Script Receiver</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="url"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value.trim().replace(/^['"]|['"]$/g, ""))}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text) {
                      e.preventDefault();
                      setAppsScriptUrl(text.trim().replace(/^['"]|['"]$/g, ""));
                    }
                  }}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-600 mt-1">
                  Deploy kode di bawah ini pada Google Sheets Anda sebagai <i>Web App</i> (Execute as: Me, Who has access: Anyone).
                </p>
              </div>

              {/* Code Snippet Box */}
              <div className="relative bg-slate-900 rounded-xl p-3 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-36">
                <pre>{appsScriptCodeSnippet}</pre>
              </div>

              {/* Method B: Direct API Access Token */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-800 uppercase mb-1.5">
                  Alternatif: Google Sheets API Bearer Token (Opsional)
                </label>
                <input
                  type="text"
                  value={googleAccessToken}
                  onChange={(e) => setGoogleAccessToken(e.target.value)}
                  placeholder="ya29.a0AfH6SM..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: VEF SERVER PARAMETERS */}
          {activeTab === "vef" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1.5">
                  Base URL Server Frappe ERPNext
                </label>
                <input
                  type="text"
                  value={vefBaseUrl}
                  onChange={(e) => setVefBaseUrl(e.target.value)}
                  placeholder="https://dgi.vef-solution.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1.5">
                  Filter Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="DG Group"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1.5">
                  Sum All Warehouses
                </label>
                <select
                  value={sumAllWarehouses}
                  onChange={(e) => setSumAllWarehouses(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 - Gabungkan semua gudang (Aktif)</option>
                  <option value={0}>0 - Pisahkan per gudang</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      Bunyi Notifikasi (Audio Chime)
                    </div>
                    <div className="text-[11px] text-slate-700">
                      Memutar nada suara saat sinkronisasi sukses atau gagal secara real-time
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => onToggleSound(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      Notifikasi Browser Desktop
                    </div>
                    <div className="text-[11px] text-slate-700">
                      Munculkan notifikasi sistem bahkan saat tab sedang diminimize
                    </div>
                  </div>
                </div>
                {desktopNotificationEnabled ? (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Diizinkan
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestDesktopNotification}
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    Aktifkan
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
          >
            Batal
          </button>

          <button
            id="btn-save-settings"
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
