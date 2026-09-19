import React, { useState, useEffect } from "react";
import {
  Database,
  Users,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  Server,
  Layers,
  Globe,
  Clock,
  Key,
} from "lucide-react";
import { MongoStatus, MongoUserRecord } from "../types";

interface MongoMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: MongoStatus | null;
  onRefreshStatus: () => Promise<void>;
  onTriggerReconnect: () => Promise<void>;
}

export const MongoMonitorModal: React.FC<MongoMonitorModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  onTriggerReconnect,
}) => {
  const [activeTab, setActiveTab] = useState<"database" | "users">("database");
  const [users, setUsers] = useState<MongoUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [username: string]: boolean }>({});
  const [searchFilter, setSearchFilter] = useState("");

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/mongodb/users");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data monitored users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      onRefreshStatus();
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await onTriggerReconnect();
      await fetchUsers();
    } finally {
      setIsReconnecting(false);
    }
  };

  const togglePasswordVisibility = (username: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const isConnected = Boolean(status?.connected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="modal-mongo-monitor"
        className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isConnected
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  MongoDB Atlas & Pemantauan Pengguna
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                    isConnected
                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-200"
                      : "bg-amber-100/70 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  ></span>
                  {isConnected ? "Terhubung ke Database" : "Perlu Whitelist IP Atlas"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Database: <span className="font-semibold text-slate-700">vef_to_gsheet</span> | Cluster:{" "}
                <span className="text-slate-600">vef-to-gsheet.w96ifya.mongodb.net</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              title="Test & Sambungkan Ulang"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? "animate-spin text-blue-600" : ""}`} />
              <span>{isReconnecting ? "Mengecek..." : "Cek Ulang"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("database")}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
              activeTab === "database"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Koleksi & Status Database</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("users");
              fetchUsers();
            }}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold transition border-b-2 ${
              activeTab === "users"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Monitoring Pengguna (Collection users)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded-full">
              {users.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === "database" && (
            <div className="space-y-4">
              {/* Alert if not connected / IP needs whitelist */}
              {!isConnected && (
                <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        IP Server Belum Diizinkan di MongoDB Atlas (Network Access)
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Koneksi ke cluster Anda ditolak oleh firewall MongoDB Atlas dengan status{" "}
                        <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">
                          TLS Alert 80 (Access Denied)
                        </code>
                        . Agar server dapat membaca dan menyimpan data card dan pengguna, izinkan akses IP pada MongoDB Atlas:
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 p-3 rounded-lg border border-amber-200 text-xs text-slate-800 space-y-1.5 pl-4">
                    <div className="font-semibold text-amber-950 text-[11px]">
                      Langkah Cepat Mengaktifkan Akses (1 Menit):
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                      <li>
                        Buka{" "}
                        <a
                          href="https://cloud.mongodb.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5"
                        >
                          MongoDB Atlas Dashboard <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </li>
                      <li>
                        Di menu sebelah kiri, klik <strong>Security</strong> → <strong>Network Access</strong>
                      </li>
                      <li>
                        Klik tombol hijau <strong>"+ ADD IP ADDRESS"</strong>
                      </li>
                      <li>
                        Klik tombol <strong>"ALLOW ACCESS FROM ANYWHERE"</strong> (IP:{" "}
                        <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900 font-bold">
                          0.0.0.0/0
                        </code>
                        )
                      </li>
                      <li>
                        Klik <strong>Confirm</strong>, lalu tunggu statusnya menjadi <em>Active</em> (~30 detik)
                      </li>
                      <li>
                        Kembali ke sini dan klik tombol <strong>"Cek Ulang"</strong> di atas.
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Connected Success Banner */}
              {isConnected && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <span className="font-bold">Database MongoDB Atlas Berjalan Normal.</span>
                    <span className="block text-[11px] text-emerald-700 mt-0.5">
                      Seluruh pengaturan Card target, pemantauan pengguna (user & password login), serta riwayat log sinkronisasi otomatis tersimpan aman di cloud database.
                    </span>
                  </div>
                </div>
              )}

              {/* Collections Breakdown Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>card_profiles</span>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                      Collection
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Menyimpan daftar card profil Google Sheet, spreadsheet ID, tab, cell awal, dan jadwal otomatis.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>users</span>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">
                      Collection
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Menyimpan kredensial username & password login VEF, IP address, waktu login, dan riwayat sesi pengguna.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>sync_logs</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                      Collection
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Menyimpan riwayat ekspor manual dan ekspor otomatis terjadwal beserta jumlah baris data dan durasi.
                  </p>
                </div>
              </div>

              {/* Database Technical Parameters */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <span>Konfigurasi Koneksi Aktif</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Database Name</span>
                    <span className="font-mono font-bold text-slate-800">vef_to_gsheet</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Cluster Host</span>
                    <span className="font-mono font-semibold text-slate-800">
                      vef-to-gsheet.w96ifya.mongodb.net
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Database User</span>
                    <span className="font-mono font-semibold text-slate-800">salesvinzmobile1_db_user</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Status Fallback</span>
                    <span className="font-medium text-slate-700">
                      Cache memori aktif jika koneksi database terputus
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Daftar Pengguna Login (Collection: users)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Memantau setiap pengguna yang memasukkan username & password untuk mengakses sistem VEF.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Cari nama pengguna..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44"
                  />
                  <button
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                    title="Segarkan Data Pengguna"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-semibold text-slate-700">Belum Ada Pengguna Tercatat</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Saat pengguna login melalui tombol "Login VEF" di bilah atas, akun dan riwayat aktivitasnya akan otomatis terekam ke MongoDB.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Username VEF</th>
                        <th className="px-3.5 py-2.5">Password</th>
                        <th className="px-3.5 py-2.5">Terakhir Login</th>
                        <th className="px-3.5 py-2.5 text-center">Frekuensi</th>
                        <th className="px-3.5 py-2.5">IP & Perangkat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((user) => {
                        const isRevealed = Boolean(revealedPasswords[user.username]);
                        const lastLogin = new Date(user.lastLoginAt);
                        const timeStr = isNaN(lastLogin.getTime())
                          ? user.lastLoginAt
                          : lastLogin.toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                        return (
                          <tr key={user.username} className="hover:bg-slate-50/70 transition">
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-800">{user.username}</span>
                              </div>
                            </td>

                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                                  {isRevealed
                                    ? user.password || "<kosong>"
                                    : user.password
                                    ? "••••••••"
                                    : "—"}
                                </span>
                                {user.password && (
                                  <button
                                    onClick={() => togglePasswordVisibility(user.username)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5"
                                    title={isRevealed ? "Sembunyikan password" : "Lihat password"}
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="px-3.5 py-3 text-slate-600 text-[11px]">
                              {timeStr} WIB
                            </td>

                            <td className="px-3.5 py-3 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px]">
                                {user.loginCount || 1}x login
                              </span>
                            </td>

                            <td className="px-3.5 py-3 text-[11px] text-slate-500 font-mono">
                              <div className="truncate max-w-[180px]" title={user.ipAddress || "-"}>
                                IP: {user.ipAddress || "127.0.0.1"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={user.userAgent || ""}>
                                {user.userAgent ? user.userAgent.split(")")[0] + ")" : "Browser"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500">
            Koleksi aktif: <span className="font-mono text-slate-700">card_profiles</span>,{" "}
            <span className="font-mono text-slate-700">users</span>,{" "}
            <span className="font-mono text-slate-700">sync_logs</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 font-semibold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
