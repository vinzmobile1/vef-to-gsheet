import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileSpreadsheet,
  Clock,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Settings,
  LogIn,
  RefreshCw,
  Info,
  Sliders,
  Bell,
} from "lucide-react";
import {
  VefUser,
  SheetProfile,
  ScheduleConfig,
  WorkHoursStatus,
  ItemSummaryRow,
  SyncLog,
  NotificationItem,
  MongoStatus,
} from "./types";
import { Navbar } from "./components/Navbar";
import { LoginPage } from "./components/LoginPage";
import { LoginModal } from "./components/LoginModal";
import { CardListDashboard } from "./components/CardListDashboard";
import { CardDetailPage } from "./components/CardDetailPage";
import { AddCardModal } from "./components/AddCardModal";
import { SettingsModal } from "./components/SettingsModal";
import { SyncLogsDrawer } from "./components/SyncLogsDrawer";
import { NotificationToast } from "./components/NotificationToast";
import { MongoMonitorModal } from "./components/MongoMonitorModal";
import { playNotificationSound, sendBrowserNotification } from "./utils/audio";

export default function App() {
  // User Session State
  const [user, setUser] = useState<VefUser>(() => {
    const savedUser = localStorage.getItem("vef_active_user") || sessionStorage.getItem("vef_active_user");
    const savedCookie = localStorage.getItem("vef_session_cookie") || sessionStorage.getItem("vef_session_cookie");
    if (savedUser && savedCookie) {
      return { username: savedUser, isLoggedIn: true, cookie: savedCookie };
    }
    return { username: "", isLoggedIn: false };
  });

  // Multi-card Sheet Profiles State
  const [profiles, setProfiles] = useState<SheetProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Modals and Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);

  // Syncing & Loading states
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Logs & Notifications
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("vef_sound_enabled") !== "false";
  });
  const [desktopNotificationEnabled, setDesktopNotificationEnabled] = useState<boolean>(() => {
    return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
  });

  // Track latest known log to detect background sync runs
  const lastKnownLogTimestampRef = useRef<string>("");

  // Helper for safe JSON fetching preventing HTML parse errors
  const safeFetchJson = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T | null> => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return null;
      }
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }, []);

  // In-app Notification Trigger
  const addNotification = useCallback(
    (type: "success" | "error" | "info" | "warning", title: string, message: string, rowCount?: number) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newNotif: NotificationItem = {
        id,
        type,
        title,
        message,
        timestamp: new Date(),
        rowCount,
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

      // Audio feedback
      if (soundEnabled && (type === "success" || type === "error")) {
        playNotificationSound(type);
      }

      // Desktop browser notification
      if (desktopNotificationEnabled) {
        sendBrowserNotification(title, message, type === "error");
      }

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6000);
    },
    [soundEnabled, desktopNotificationEnabled]
  );

  // Fetch Profiles from Server (Filtered per logged-in user)
  const fetchProfiles = useCallback(async () => {
    if (!user.isLoggedIn || !user.username) {
      setProfiles([]);
      return;
    }
    try {
      const data = await safeFetchJson<{
        profiles?: SheetProfile[];
        hasSavedCredentials?: boolean;
        savedUsername?: string;
      }>(`/api/profiles?username=${encodeURIComponent(user.username)}`, {
        headers: {
          "x-vef-username": user.username,
        },
      });

      if (data?.profiles) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    }
  }, [user.isLoggedIn, user.username, safeFetchJson]);

  // Fetch Logs from Server (Filtered per logged-in user)
  const fetchSyncLogs = useCallback(
    async (isBackground: boolean = false) => {
      if (!user.isLoggedIn || !user.username) {
        setSyncLogs([]);
        return;
      }
      try {
        if (!isBackground) setIsRefreshingLogs(true);
        const data = await safeFetchJson<{ logs?: SyncLog[] }>(
          `/api/sync-logs?username=${encodeURIComponent(user.username)}`,
          {
            headers: {
              "x-vef-username": user.username,
            },
          }
        );
        if (data?.logs) {
          const logs: SyncLog[] = data.logs || [];
          setSyncLogs(logs);

          // Check if a new background scheduled log occurred
          if (logs.length > 0) {
            const latestLog = logs[0];
            if (
              lastKnownLogTimestampRef.current &&
              latestLog.timestamp > lastKnownLogTimestampRef.current &&
              latestLog.type === "scheduled"
            ) {
              if (latestLog.status === "success") {
                addNotification(
                  "success",
                  "Jadwal Otomatis Berhasil",
                  latestLog.message,
                  latestLog.rowCount
                );
              } else {
                addNotification(
                  "error",
                  "Jadwal Otomatis Gagal",
                  latestLog.message
                );
              }
            }
            lastKnownLogTimestampRef.current = latestLog.timestamp;
          }
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        if (!isBackground) setIsRefreshingLogs(false);
      }
    },
    [user.isLoggedIn, user.username, addNotification, safeFetchJson]
  );

  // Fetch MongoDB connection & collection status
  const fetchMongoStatus = useCallback(async () => {
    try {
      const data = await safeFetchJson<MongoStatus>("/api/mongodb/status");
      if (data) {
        setMongoStatus(data);
      }
    } catch (err) {
      console.error("Gagal mengambil status MongoDB:", err);
    }
  }, [safeFetchJson]);

  const handleTriggerReconnect = useCallback(async () => {
    try {
      const data = await safeFetchJson<MongoStatus>("/api/mongodb/reconnect", { method: "POST" });
      if (data) {
        setMongoStatus(data);
        if (data.connected) {
          addNotification(
            "success",
            "MongoDB Terhubung!",
            `Database [${data.dbName || "vef_to_gsheet"}] siap digunakan dan seluruh data tersinkronisasi.`
          );
          fetchProfiles();
          fetchSyncLogs(true);
        } else {
          addNotification(
            "warning",
            "Akses MongoDB Ditolak (IP Whitelist)",
            "Tambahkan IP 0.0.0.0/0 di Security > Network Access pada MongoDB Atlas Anda."
          );
        }
      }
    } catch (err) {
      console.error("Gagal reconnect MongoDB:", err);
    }
  }, [addNotification, fetchProfiles, fetchSyncLogs, safeFetchJson]);

  // Initial load
  useEffect(() => {
    fetchProfiles();
    fetchSyncLogs(false);
    fetchMongoStatus();
  }, [fetchProfiles, fetchSyncLogs, fetchMongoStatus]);

  // Periodic polling for status & logs (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProfiles();
      fetchSyncLogs(true);
      fetchMongoStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchProfiles, fetchSyncLogs, fetchMongoStatus]);

  // Add Card Handler
  const handleAddCard = async (cardData: Partial<SheetProfile>) => {
    if (!user.username) {
      throw new Error("Silakan login terlebih dahulu.");
    }
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vef-username": user.username,
      },
      body: JSON.stringify({ ...cardData, ownerUsername: user.username }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal membuat card baru.");
    }

    if (data.profiles) {
      setProfiles(data.profiles);
    }
    if (data.profile) {
      // Automatically open detail page of newly created card
      setSelectedProfileId(data.profile.id);
    }
    addNotification("success", "Card Ditambahkan", `Card "${data.profile?.name}" berhasil dibuat.`);
  };

  // Update Card Handler
  const handleUpdateCard = async (id: string, updates: Partial<SheetProfile>) => {
    if (!user.username) {
      throw new Error("Silakan login terlebih dahulu.");
    }
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-vef-username": user.username,
      },
      body: JSON.stringify({ ...updates, ownerUsername: user.username }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menyimpan perubahan.");
    }

    if (data.profiles) {
      setProfiles(data.profiles);
    }
    addNotification("success", "Card Diperbarui", data.message || "Pengaturan berhasil disimpan.");
  };

  // Delete Card Handler
  const handleDeleteCard = async (id: string) => {
    if (!user.username) {
      throw new Error("Silakan login terlebih dahulu.");
    }
    const res = await fetch(`/api/profiles/${id}?username=${encodeURIComponent(user.username)}`, {
      method: "DELETE",
      headers: {
        "x-vef-username": user.username,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus card.");
    }

    if (data.profiles) {
      setProfiles(data.profiles);
    }
    if (selectedProfileId === id) {
      setSelectedProfileId(null);
    }
    addNotification("info", "Card Dihapus", data.message || "Card berhasil dihapus.");
  };

  // Export Card Handler (Shortcut or Detail Page)
  const handleExportCard = async (id: string) => {
    const targetCard = profiles.find((p) => p.id === id);
    const cardName = targetCard?.name || "Target Sheet";

    if (!user.isLoggedIn || !user.username) {
      setIsLoginOpen(true);
      addNotification("warning", "Login Diperlukan", "Silakan login akun VEF terlebih dahulu.");
      return;
    }

    setIsSyncingId(id);
    try {
      const res = await fetch(`/api/profiles/${id}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vef-username": user.username,
        },
        body: JSON.stringify({ username: user.username }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengekspor data.");
      }

      addNotification(
        "success",
        `Ekspor Berhasil [${cardName}]`,
        data.message || `Berhasil mengekspor data ke Google Sheet.`,
        data.rowCount
      );

      // Refresh profiles & logs
      fetchProfiles();
      fetchSyncLogs(true);
    } catch (err: any) {
      addNotification("error", `Ekspor Gagal [${cardName}]`, err.message || "Terjadi kesalahan saat ekspor.");
      fetchSyncLogs(true);
    } finally {
      setIsSyncingId(null);
    }
  };

  // Preview Data for Card
  const handlePreviewCard = async (id: string) => {
    if (!user.isLoggedIn || !user.username) {
      setIsLoginOpen(true);
      addNotification("warning", "Login Diperlukan", "Silakan login akun VEF terlebih dahulu.");
      throw new Error("Silakan login ke akun VEF terlebih dahulu.");
    }

    setIsPreviewing(true);
    try {
      const res = await fetch(`/api/profiles/${id}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vef-username": user.username,
        },
        body: JSON.stringify({ username: user.username }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memuat pratinjau data.");
      }

      addNotification("info", "Pratinjau Diperbarui", `Ditemukan ${data.totalRows} baris Item Summary dari VEF.`);
      return {
        previewRows: data.previewRows,
        totalRows: data.totalRows,
        sheetData: data.sheetData,
        headers: data.headers,
      };
    } catch (err: any) {
      addNotification("error", "Pratinjau Gagal", err.message || "Gagal mengambil data dari VEF.");
      throw err;
    } finally {
      setIsPreviewing(false);
    }
  };

  // Toggle Schedule for a Card
  const handleToggleSchedule = async (id: string) => {
    if (!user.username) return;
    try {
      const res = await fetch(`/api/profiles/${id}/toggle-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vef-username": user.username,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification("info", "Jadwal Diubah", data.message);
        fetchProfiles();
      }
    } catch (err: any) {
      addNotification("error", "Gagal Mengubah Jadwal", err.message);
    }
  };

  // VEF Login Success
  const handleLoginSuccess = (username: string, cookie: string, remember: boolean = true) => {
    const newUser: VefUser = { username, isLoggedIn: true, cookie };
    setUser(newUser);
    if (remember) {
      localStorage.setItem("vef_active_user", username);
      localStorage.setItem("vef_session_cookie", cookie);
      localStorage.setItem("vef_saved_username", username);
    } else {
      sessionStorage.setItem("vef_active_user", username);
      sessionStorage.setItem("vef_session_cookie", cookie);
      localStorage.removeItem("vef_active_user");
      localStorage.removeItem("vef_session_cookie");
    }
    setIsLoginOpen(false);
    addNotification("success", "Login Berhasil", `Selamat datang, ${username}. Akun VEF terhubung.`);
  };

  // VEF Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/vef/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vef-username": user.username,
        },
        body: JSON.stringify({ username: user.username }),
      });
    } catch (e) {
      console.error(e);
    }
    setUser({ username: "", isLoggedIn: false });
    setProfiles([]);
    setSyncLogs([]);
    setSelectedProfileId(null);
    localStorage.removeItem("vef_active_user");
    localStorage.removeItem("vef_session_cookie");
    sessionStorage.removeItem("vef_active_user");
    sessionStorage.removeItem("vef_session_cookie");
    addNotification("info", "Logout", "Anda telah keluar dari akun VEF.");
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      await fetch("/api/sync-logs/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vef-username": user.username,
        },
        body: JSON.stringify({ username: user.username }),
      });
      setSyncLogs([]);
      addNotification("info", "Riwayat Bersih", "Seluruh log sinkronisasi telah dibersihkan.");
    } catch (err) {
      console.error(err);
    }
  };

  // Active selected profile
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;

  // If user is not logged in, render the dedicated LoginPage first
  if (!user.isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Real-time Notifications Popups */}
        <NotificationToast
          notifications={notifications}
          onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
        />
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          savedUsername={localStorage.getItem("vef_saved_username") || ""}
        />
      </div>
    );
  }

  // Global schedule summary for Navbar display
  const activeSchedulesCount = profiles.filter((p) => p.scheduleEnabled).length;
  const dummyScheduleConfig: ScheduleConfig = {
    enabled: activeSchedulesCount > 0,
    intervalHours: 3,
    timezone: "Asia/Jakarta",
    spreadsheetId: "",
    sheetName: "Item Summary",
    startCell: "A1",
    vefBaseUrl: "https://dgi.vef-solution.com",
    company: "DG Group",
    sumAllWarehouses: 1,
    lastRunTimestamp: null,
    nextRunTimestamp: null,
  };

  const workHoursStatus: WorkHoursStatus = {
    isWithin: true,
    currentLocalTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }),
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Real-time Notifications Popups */}
      <NotificationToast
        notifications={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      {/* Navigation Bar */}
      <Navbar
        user={user}
        scheduleConfig={dummyScheduleConfig}
        workHoursStatus={workHoursStatus}
        logsCount={syncLogs.length}
        mongoStatus={mongoStatus}
        onOpenMongoMonitor={() => setIsMongoModalOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        isSyncing={Boolean(isSyncingId)}
      />

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedProfile ? (
          /* Card Dedicated Page View */
          <CardDetailPage
            profile={selectedProfile}
            user={user}
            onBack={() => setSelectedProfileId(null)}
            onUpdateProfile={handleUpdateCard}
            onExportProfile={handleExportCard}
            onPreviewProfile={handlePreviewCard}
            onDeleteProfile={handleDeleteCard}
            isExporting={isSyncingId === selectedProfile.id}
            isPreviewing={isPreviewing}
          />
        ) : (
          /* Multi-Card / List Overview Dashboard */
          <CardListDashboard
            profiles={profiles}
            onSelectProfile={(profile) => setSelectedProfileId(profile.id)}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onExportCard={handleExportCard}
            onToggleSchedule={handleToggleSchedule}
            onDeleteProfile={handleDeleteCard}
            isSyncingId={isSyncingId}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCard={handleAddCard}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(username, cookie, remember) => handleLoginSuccess(username, cookie, remember)}
        defaultBaseUrl="https://dgi.vef-solution.com"
      />

      <SyncLogsDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={syncLogs}
        onClearLogs={handleClearLogs}
        onRefreshLogs={() => fetchSyncLogs(false)}
        isRefreshing={isRefreshingLogs}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={dummyScheduleConfig}
        onSaveConfig={async (updates) => {
          fetchProfiles();
        }}
        soundEnabled={soundEnabled}
        onToggleSound={(nextVal) => {
          setSoundEnabled(nextVal);
          localStorage.setItem("vef_sound_enabled", String(nextVal));
        }}
        desktopNotificationEnabled={desktopNotificationEnabled}
        onRequestDesktopNotification={async () => {
          if (!desktopNotificationEnabled && "Notification" in window) {
            const permission = await Notification.requestPermission();
            setDesktopNotificationEnabled(permission === "granted");
          } else {
            setDesktopNotificationEnabled(false);
          }
        }}
      />

      <MongoMonitorModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        status={mongoStatus}
        onRefreshStatus={fetchMongoStatus}
        onTriggerReconnect={handleTriggerReconnect}
      />
    </div>
  );
}
