import React from "react";
import {
  FileSpreadsheet,
  Clock,
  Settings,
  Bell,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
} from "lucide-react";
import { VefUser, ScheduleConfig, WorkHoursStatus, MongoStatus } from "../types";

interface NavbarProps {
  user: VefUser;
  scheduleConfig: ScheduleConfig;
  workHoursStatus: WorkHoursStatus;
  logsCount: number;
  mongoStatus: MongoStatus | null;
  onOpenMongoMonitor: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  scheduleConfig,
  workHoursStatus,
  logsCount,
  mongoStatus,
  onOpenMongoMonitor,
  onOpenLogin,
  onLogout,
  onOpenSettings,
  onOpenLogs,
  isSyncing,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  VEF to Sheets
                </span>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Naufal
                </span>
              </div>
              <p className="text-xs text-slate-700 hidden sm:block">
                Item Summary Real-time Sync & Automation
              </p>
            </div>
          </div>

          {/* Center Info: Real-time Jakarta Clock & Automation Info */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold font-mono">
                {workHoursStatus.currentLocalTime || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">Asia/Jakarta (GMT+7)</span>
            </div>

            {scheduleConfig.enabled && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Otomasi Aktif</span>
              </div>
            )}
          </div>

          {/* Right Actions: Settings, Logs, User Account */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* MongoDB Atlas Database & User Monitoring Button */}
            <button
              id="btn-nav-mongodb"
              onClick={onOpenMongoMonitor}
              title="Status Database MongoDB Atlas & Monitoring Pengguna"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                mongoStatus?.connected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70"
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline font-mono">MongoDB</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  mongoStatus?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              ></span>
            </button>

            {/* Logs Button with Badge */}
            <button
              id="btn-nav-logs"
              onClick={onOpenLogs}
              title="Lihat Riwayat & Notifikasi Sinkronisasi"
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {logsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {/* Settings Button */}
            <button
              id="btn-nav-settings"
              onClick={onOpenSettings}
              title="Pengaturan Jadwal & Integrasi"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <Settings className="w-5 h-5 text-slate-500" />
              <span className="hidden lg:inline text-slate-700">Pengaturan</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* User Session status */}
            {user.isLoggedIn ? (
              <div className="flex items-center gap-2 pl-1">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-slate-800 leading-tight">
                      {user.username}
                    </div>
                    <div className="text-[10px] text-emerald-600 flex items-center gap-1 leading-none mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      VEF Terhubung
                    </div>
                  </div>
                </div>

                <button
                  id="btn-nav-logout"
                  onClick={onLogout}
                  title="Logout dari VEF"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-nav-login"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg transition shadow-xs"
              >
                <UserIcon className="w-4 h-4" />
                <span>Login VEF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
