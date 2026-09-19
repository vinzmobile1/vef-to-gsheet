export interface VefUser {
  username: string;
  isLoggedIn: boolean;
  cookie?: string;
  loginTime?: string;
}

export interface ItemSummaryRow {
  item: string; // Item Code
  item_name: string;
  brand: string;
  item_group: string;
  parent_item_group: string;
  actual_qty: number | string;
  available_qty: number | string;
  reserved_qty: number | string;
  uom: string;
  [key: string]: any;
}

export interface SheetProfile {
  id: string;
  name: string;
  description?: string;
  spreadsheetId: string;
  sheetName: string;
  startCell: string;
  appsScriptUrl?: string;
  googleAccessToken?: string;

  // Owner user isolation (per-user card management)
  ownerUsername: string;

  // VEF Query settings per card
  company: string;
  sumAllWarehouses: number; // 1 = All warehouses, 0 = Per warehouse
  vefBaseUrl?: string;

  // Schedule settings per card (Timezone GMT+7 Asia/Jakarta)
  scheduleEnabled: boolean;
  scheduleTimes?: string[]; // e.g. ["09:00", "14:00", "17:00"]
  nextRunTimeStr?: string; // e.g. "Hari ini 14:00 WIB"
  lastExecutedSlot?: string; // e.g. "2026-09-19_09:00"
  intervalHours?: number; // legacy fallback
  timezone: string; // "Asia/Jakarta" (GMT+7)
  lastRunTimestamp: number | null;
  nextRunTimestamp: number | null;
  lastRunStatus?: "success" | "error" | null;
  lastRunMessage?: string;
  lastRowCount?: number;

  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  profileId?: string;
  profileName?: string;
  ownerUsername?: string;
  timestamp: string;
  type: "manual" | "scheduled";
  status: "success" | "error";
  message: string;
  rowCount?: number;
  durationMs: number;
  details?: any;
}

export interface ScheduleConfig {
  enabled: boolean;
  intervalHours: number; // 3, 6, etc.
  timezone: string; // "Asia/Jakarta"
  spreadsheetId: string;
  sheetName: string;
  startCell: string;
  appsScriptUrl?: string;
  googleAccessToken?: string;
  vefBaseUrl: string;
  company: string;
  sumAllWarehouses: number;
  lastRunTimestamp: number | null;
  nextRunTimestamp: number | null;
  hasSavedCredentials?: boolean;
  savedUsername?: string;
}

export interface WorkHoursStatus {
  isWithin: boolean;
  currentLocalTime: string;
  reason?: string;
}

export interface NotificationItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: Date;
  rowCount?: number;
}

export interface MongoUserRecord {
  username: string;
  password?: string;
  lastLoginAt: string;
  loginCount: number;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  loginHistory?: Array<{
    timestamp: string;
    ip?: string;
    userAgent?: string;
  }>;
}

export interface MongoStatus {
  configured: boolean;
  connected: boolean;
  dbName: string;
  error?: string;
  errorCode?: string;
  isIpBlocked?: boolean;
  collections: string[];
  lastChecked: string;
}
