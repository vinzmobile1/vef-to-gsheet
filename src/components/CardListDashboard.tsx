import React, { useState } from "react";
import {
  Plus,
  FileSpreadsheet,
  Clock,
  Settings,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { SheetProfile, WorkHoursStatus } from "../types";
import { DeleteCardModal } from "./DeleteCardModal";

interface CardListDashboardProps {
  profiles: SheetProfile[];
  onSelectProfile: (profile: SheetProfile) => void;
  onOpenAddModal: () => void;
  onExportCard: (id: string) => Promise<void>;
  onToggleSchedule: (id: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  isSyncingId: string | null;
}

export const CardListDashboard: React.FC<CardListDashboardProps> = ({
  profiles,
  onSelectProfile,
  onOpenAddModal,
  onExportCard,
  onToggleSchedule,
  onDeleteProfile,
  isSyncingId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<SheetProfile | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const activeSchedulesCount = profiles.filter((p) => p.scheduleEnabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Stats Bar & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Daftar Target Google Sheet
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {profiles.length} Card
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Satu card untuk satu ID Google Sheet. Atur tab, cell, dan jadwal otomatis secara mandiri per card.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeSchedulesCount} Jadwal Otomatis Aktif</span>
          </div>

          <button
            id="btn-add-new-card"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Target Sheet Baru</span>
          </button>
        </div>
      </div>

      {/* Card Grid / List */}
      {profiles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">Belum ada Target Google Sheet</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan card baru untuk menghubungkan Google Sheet pertama Anda dan mulai ekspor data dari VEF.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Card Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((profile) => {
            const isCardSyncing = isSyncingId === profile.id;
            const sheetUrl = profile.spreadsheetId
              ? profile.spreadsheetId.startsWith("http")
                ? profile.spreadsheetId
                : `https://docs.google.com/spreadsheets/d/${profile.spreadsheetId}/edit`
              : "";

            return (
              <div
                key={profile.id}
                id={`card-profile-${profile.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Section */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                          {profile.name}
                        </h3>
                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          {profile.description || "Ekspor data Item Summary VEF"}
                        </p>
                      </div>
                    </div>

                    {/* Schedule Badge */}
                    <div>
                      {profile.scheduleEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          <span>
                            {profile.scheduleTimes && profile.scheduleTimes.length > 0
                              ? `${profile.scheduleTimes.length} Waktu`
                              : `${profile.intervalHours || 3} Jam`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Manual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sheet Target Details */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    {/* Spreadsheet ID / Link */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-[11px]">ID Sheet:</span>
                      {profile.spreadsheetId ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800">
                          <span>{profile.spreadsheetId.substring(0, 10)}...</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(e, profile.id, profile.spreadsheetId)}
                            title="Salin ID"
                            className="p-1 hover:text-blue-600 transition"
                          >
                            {copiedId === profile.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          {sheetUrl && (
                            <a
                              href={sheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Buka Dokumen Google Sheet"
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-medium">Belum diisi</span>
                      )}
                    </div>

                    {/* Tab & Cell */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">Tab & Cell:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        [{profile.sheetName || "Item Summary"}] : [{profile.startCell || "A1"}]
                      </span>
                    </div>

                    {/* Schedule Times & Next Run */}
                    {profile.scheduleEnabled && (
                      <div className="pt-1 border-t border-slate-200/60 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Jam Jadwal:</span>
                          <span className="text-indigo-700 font-bold font-mono">
                            {profile.scheduleTimes && profile.scheduleTimes.length > 0
                              ? profile.scheduleTimes.join(", ") + " WIB"
                              : "09:00, 14:00, 17:00 WIB"}
                          </span>
                        </div>
                        {profile.nextRunTimeStr && (
                          <div className="flex items-center justify-between text-slate-500 text-[10px]">
                            <span>Ekspor Berikutnya:</span>
                            <span className="font-semibold text-indigo-900">{profile.nextRunTimeStr}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Last Sync Info */}
                  <div className="text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Status Terakhir:</span>
                      {profile.lastRunStatus === "success" ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Berhasil ({profile.lastRowCount || 0} baris)</span>
                        </span>
                      ) : profile.lastRunStatus === "error" ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Gagal Sinkron</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Belum pernah diekspor</span>
                      )}
                    </div>

                    {profile.lastRunTimestamp && (
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>Waktu:</span>
                        <span>{new Date(profile.lastRunTimestamp).toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer with Direct Export Shortcut */}
                <div className="p-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id={`btn-open-card-${profile.id}`}
                      onClick={() => onSelectProfile(profile)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-white transition border border-transparent hover:border-slate-200"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Buka & Atur</span>
                    </button>
                    <button
                      type="button"
                      id={`btn-delete-card-${profile.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardToDelete(profile);
                      }}
                      title="Hapus Card Target Ini"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Direct Export Shortcut Button */}
                  <button
                    type="button"
                    id={`btn-shortcut-export-${profile.id}`}
                    disabled={isCardSyncing}
                    onClick={() => onExportCard(profile.id)}
                    title="Tombol pintas untuk langsung ekspor data ke sheet ini"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold shadow-xs transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCardSyncing ? "animate-spin" : ""}`} />
                    <span>{isCardSyncing ? "Mengekspor..." : "Ekspor Sekarang"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Delete Card from Dashboard */}
      <DeleteCardModal
        isOpen={Boolean(cardToDelete)}
        onClose={() => setCardToDelete(null)}
        profile={cardToDelete}
        onConfirmDelete={async (id) => {
          await onDeleteProfile(id);
          setCardToDelete(null);
        }}
      />
    </div>
  );
};
