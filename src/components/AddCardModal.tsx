import React, { useState } from "react";
import { X, Plus, FileSpreadsheet, Layers, Clock, Check } from "lucide-react";
import { SheetProfile } from "../types";
import { ScheduleTimeListManager } from "./ScheduleTimeListManager";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (cardData: Partial<SheetProfile>) => Promise<void>;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isOpen,
  onClose,
  onAddCard,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Item Summary");
  const [startCell, setStartCell] = useState("A1");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["09:00", "14:00", "17:00"]);
  const [company, setCompany] = useState("DG Group");
  const [sumAllWarehouses, setSumAllWarehouses] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSpreadsheetInput = (val: string) => {
    // Auto extract ID if full Google Sheets URL is pasted
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      setSpreadsheetId(match[1]);
    } else {
      setSpreadsheetId(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama card Google Sheet wajib diisi.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      await onAddCard({
        name: name.trim(),
        description: description.trim(),
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim() || "Item Summary",
        startCell: startCell.trim() || "A1",
        scheduleEnabled,
        scheduleTimes: scheduleTimes.length > 0 ? scheduleTimes : ["09:00", "14:00", "17:00"],
        intervalHours: 3,
        company,
        sumAllWarehouses,
        timezone: "Asia/Jakarta",
      });
      // Reset form
      setName("");
      setDescription("");
      setSpreadsheetId("");
      setSheetName("Item Summary");
      setStartCell("A1");
      setScheduleEnabled(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat card baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tambah Target Google Sheet Baru
              </h2>
              <p className="text-xs text-slate-700">
                Satu card untuk pengaturan satu target Google Sheet
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Nama Card / Target Sheet <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Stok Gudang Utama, Rekap Cabang Surabaya..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Deskripsi Singkat (Opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Rekap persediaan per 3 jam untuk tim gudang"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              ID atau URL Google Sheet
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => handleSpreadsheetInput(e.target.value)}
              placeholder="Paste ID Google Sheet atau tautan URL dokumen..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Bisa langsung paste link Google Spreadsheet lengkap, ID akan terdeteksi otomatis.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Nama Tab (Sheet)
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Item Summary"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Cell Awal
              </label>
              <input
                type="text"
                value={startCell}
                onChange={(e) => setStartCell(e.target.value)}
                placeholder="A1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Aktifkan Jadwal Otomatis Card Ini
                </span>
              </div>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {scheduleEnabled && (
              <div className="pt-3 border-t border-slate-200/80">
                <ScheduleTimeListManager
                  scheduleTimes={scheduleTimes}
                  onChange={setScheduleTimes}
                />
              </div>
            )}
          </div>

          {/* Footer inside form */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Buat Card Google Sheet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
