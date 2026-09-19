import React, { useState } from "react";
import {
  Lock,
  User,
  KeyRound,
  Server,
  Eye,
  EyeOff,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  Database,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (username: string, cookie: string, remember: boolean) => void;
  savedUsername?: string;
  defaultBaseUrl?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  savedUsername = "",
  defaultBaseUrl = "https://dgi.vef-solution.com",
}) => {
  const [username, setUsername] = useState(
    savedUsername || localStorage.getItem("vef_saved_username") || ""
  );
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Silakan masukkan Username dan Password akun VEF ERPNext Anda.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/vef/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          baseUrl: baseUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Login Gagal. Periksa kembali Username atau Password VEF Anda."
        );
      }

      if (rememberMe) {
        localStorage.setItem("vef_saved_username", username.trim());
      } else {
        localStorage.removeItem("vef_saved_username");
      }

      onLoginSuccess(username.trim(), data.cookie || "", rememberMe);
    } catch (err: any) {
      setErrorMsg(
        err.message || "Terjadi kesalahan saat menghubungi server VEF. Pastikan koneksi dan URL server sesuai."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Subtle background ambient gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Simple Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-base sm:text-lg tracking-tight leading-none flex items-center gap-2">
              <span>VEF to Google Sheets</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ERPNext Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
              Sistem Otomasi Penarikan Data & Penjadwalan Jakarta (GMT+7)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-slate-300">WIB (GMT+7)</span>
        </div>
      </header>

      {/* Main Login Content Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header Title inside card */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Masuk ke Akun VEF
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Login dengan akun ERPNext Frappe untuk membuka dashboard card dan memulai sinkronisasi Google Sheets.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
              >
                Username VEF
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus={!username}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Contoh: user_vef atau gratisan_"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
              >
                Password VEF
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus={!!username}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Toggle Advanced Server URL */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1.5 transition"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{showAdvanced ? "Tutup Pengaturan Server URL" : "Ubah Server URL ERPNext"}</span>
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs space-y-1.5 animate-in fade-in duration-150">
                  <label htmlFor="login-baseurl" className="block text-slate-300 font-medium">
                    Base URL Server ERPNext Frappe
                  </label>
                  <input
                    id="login-baseurl"
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://dgi.vef-solution.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Default: <code className="text-blue-300">https://dgi.vef-solution.com</code>
                  </p>
                </div>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Ingat username di peramban ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-600/50 disabled:text-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghubungkan ke Server VEF...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Security / Feature Badges */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Autentikasi Aman</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Tersimpan di MongoDB</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500">
        <p>VEF ERPNext to Google Sheets Sync Automation &bull; Timezone GMT+7 (Asia/Jakarta)</p>
      </footer>
    </div>
  );
};
