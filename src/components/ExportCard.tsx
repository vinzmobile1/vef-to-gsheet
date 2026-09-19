import React, { useState } from "react";
import {
  FileSpreadsheet,
  ExternalLink,
  Download,
  ArrowUpRight,
  Sparkles,
  Layers,
  HelpCircle,
  Database,
  CheckCircle,
  Loader2,
  Table,
} from "lucide-react";
import { VefUser } from "../types";

interface ExportCardProps {
  user: VefUser;
  spreadsheetId: string;
  setSpreadsheetId: (val: string) => void;
  sheetName: string;
  setSheetName: (val: string) => void;
  startCell: string;
  setStartCell: (val: string) => void;
  onExport: () => void;
  onPreview: () => void;
  onDownloadCsv: () => void;
  isExporting: boolean;
  isPreviewing: boolean;
  hasData: boolean;
  totalRows: number;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  user,
  spreadsheetId,
  setSpreadsheetId,
  sheetName,
  setSheetName,
  startCell,
  setStartCell,
  onExport,
  onPreview,
  onDownloadCsv,
  isExporting,
  isPreviewing,
  hasData,
  totalRows,
}) => {
  const [showIdHelp, setShowIdHelp] = useState(false);

  // Helper to extract clean spreadsheet ID if user pastes full URL
  const handleSpreadsheetIdChange = (val: string) => {
    let cleanVal = val.trim();
    const match = cleanVal.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanVal = match[1];
    }
    setSpreadsheetId(cleanVal);
  };

  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Tujuan Ekspor Google Sheets
            </h2>
            <p className="text-xs text-slate-700">
              Tentukan ID Spreadsheet, nama tab/sheet, dan posisi cell awal data
            </p>
          </div>
        </div>

        {sheetUrl && (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition w-fit"
          >
            <span>Buka Google Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Input Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-5">
        {/* Google Sheet ID */}
        <div className="md:col-span-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              ID Google Sheet <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowIdHelp(!showIdHelp)}
              className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Cara cari ID?</span>
            </button>
          </div>

          <div className="relative">
            <input
              id="input-sheet-id"
              type="text"
              value={spreadsheetId}
              onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
              placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {showIdHelp && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
              <strong>Tips:</strong> Anda bisa langsung paste URL lengkap dari browser (contoh:{" "}
              <code className="bg-blue-100/70 px-1 py-0.5 rounded text-blue-900">
                https://docs.google.com/spreadsheets/d/<b>1BxiMV...</b>/edit
              </code>
              ). Sistem akan otomatis mengekstrak ID-nya.
            </div>
          )}
        </div>

        {/* Nama Sheet */}
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Nama Sheet (Tab) <span className="text-rose-500">*</span>
          </label>
          <input
            id="input-sheet-name"
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Item Summary"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          <p className="text-[11px] text-slate-600 mt-1">
            Jika tab belum ada, sistem akan otomatis membuatnya.
          </p>
        </div>

        {/* Cell Mulai (A1) */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Cell Mulai
          </label>
          <input
            id="input-start-cell"
            type="text"
            value={startCell}
            onChange={(e) => setStartCell(e.target.value.toUpperCase())}
            placeholder="A1"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-center font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          <p className="text-[11px] text-slate-600 mt-1 text-center">Default: A1</p>
        </div>
      </div>

      {/* Actions / Export Button Area */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Preview Button */}
          <button
            id="btn-preview-vef-data"
            type="button"
            onClick={onPreview}
            disabled={isPreviewing || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm transition disabled:opacity-50"
          >
            {isPreviewing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Mengambil Data...</span>
              </>
            ) : (
              <>
                <Table className="w-4 h-4 text-slate-500" />
                <span>Pratinjau Data ({totalRows > 0 ? `${totalRows} Baris` : "Preview"})</span>
              </>
            )}
          </button>

          {/* Download CSV Backup */}
          {hasData && (
            <button
              id="btn-download-csv"
              type="button"
              onClick={onDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition"
              title="Download salinan data format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </button>
          )}
        </div>

        {/* Main Export Button */}
        <button
          id="btn-execute-export"
          type="button"
          onClick={onExport}
          disabled={isExporting || isPreviewing}
          className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md transition-all shadow-blue-500/20"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Memproses & Mengekspor...</span>
            </>
          ) : (
            <>
              <ArrowUpRight className="w-4 h-4" />
              <span>Tarik & Ekspor ke Google Sheets</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
