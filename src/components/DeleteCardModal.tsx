import React, { useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { SheetProfile } from "../types";

interface DeleteCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SheetProfile | null;
  onConfirmDelete: (profileId: string) => Promise<void> | void;
}

export const DeleteCardModal: React.FC<DeleteCardModalProps> = ({
  isOpen,
  onClose,
  profile,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !profile) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete(profile.id);
      onClose();
    } catch (err) {
      console.error("Gagal menghapus card:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="modal-delete-card"
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Hapus Target Google Sheet</h2>
              <p className="text-[11px] text-slate-500">Konfirmasi penghapusan card profil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <p className="font-semibold">Tindakan ini tidak dapat dibatalkan.</p>
              <p className="text-rose-700 text-[11px] mt-0.5">
                Konfigurasi profil dan jadwal otomatis untuk card ini akan dihapus dari aplikasi. Data yang telah tersimpan di Google Sheet Anda tetap aman dan tidak akan terhapus.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
            <div className="text-slate-500 text-[11px]">Nama Card yang akan dihapus:</div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{profile.name}</span>
            </div>
            {profile.sheetName && (
              <div className="text-[11px] text-slate-600">
                Target Tab: <span className="font-mono font-semibold text-slate-800">[{profile.sheetName}]</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-delete-card"
            disabled={isDeleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Menghapus..." : "Ya, Hapus Card"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
