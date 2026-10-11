import fs from "fs";
import path from "path";

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DATA_DIR = path.join(process.cwd(), "data");
const DATA_DIR = IS_SERVERLESS ? "/tmp" : path.join(process.cwd(), "data");

export type SupportedProjectId = "dispatchgeeni" | "tidyups";

export function resolveStoreFilePath(projectId?: string): string {
  const norm = (projectId || "").toLowerCase();
  if (norm.includes("tidyup")) {
    return path.join(DATA_DIR, "tidyups_cleaning_store.json");
  }
  if (norm.includes("dispatch")) {
    return path.join(DATA_DIR, "dispatch_geeni_store.json");
  }
  // Default to dispatch_geeni_store.json or legacy dispatch_store.json
  const defaultFile = path.join(DATA_DIR, "dispatch_geeni_store.json");
  if (fs.existsSync(defaultFile)) {
    return defaultFile;
  }
  return path.join(DATA_DIR, "dispatch_store.json");
}

export function resolveBundledStoreFilePath(projectId?: string): string {
  const norm = (projectId || "").toLowerCase();
  if (norm.includes("tidyup")) {
    return path.join(BUNDLED_DATA_DIR, "tidyups_cleaning_store.json");
  }
  if (norm.includes("dispatch")) {
    return path.join(BUNDLED_DATA_DIR, "dispatch_geeni_store.json");
  }
  const defaultFile = path.join(BUNDLED_DATA_DIR, "dispatch_geeni_store.json");
  if (fs.existsSync(defaultFile)) {
    return defaultFile;
  }
  return path.join(BUNDLED_DATA_DIR, "dispatch_store.json");
}

export interface AppPersistentStore {
  version: number;
  lastSavedAt: string;
  tickets: any[];
  cleanerOverrides: Record<string, any>;
  scheduledVisits: any[];
  unscheduledJobs?: any[];
  staffRoster?: any[];
  clients?: any[];
  quotes: any[];
  invoices: any[];
  quoCallLogs?: any[];
  chatMessages?: any[];
  jobberConfig?: {
    isConnected: boolean;
    accountName: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    lastSyncedAt: string;
  };
  quoConfig?: {
    isConnected: boolean;
    apiKey: string;
    phoneNumbers: any[];
  };
  apiKeys?: {
    mapsApiKey?: string;
    geminiApiKey?: string;
  };
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

/**
 * Loads stored data from disk for a specific project (or default)
 */
export function loadStore(projectId?: string): AppPersistentStore | null {
  const targetFile = resolveStoreFilePath(projectId);
  const bundledFile = resolveBundledStoreFilePath(projectId);
  const fallbackLegacyFile = path.join(DATA_DIR, "dispatch_store.json");

  try {
    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, "utf-8");
      return JSON.parse(raw);
    }
    // If project file doesn't exist yet, seed it from legacy dispatch_store.json or bundled file
    if (fs.existsSync(fallbackLegacyFile)) {
      const raw = fs.readFileSync(fallbackLegacyFile, "utf-8");
      // Seed target file for future standalone mutations
      try {
        fs.writeFileSync(targetFile, raw, "utf-8");
      } catch (seedErr) {
        // ignore seed error
      }
      return JSON.parse(raw);
    }
    if (IS_SERVERLESS && fs.existsSync(bundledFile)) {
      const raw = fs.readFileSync(bundledFile, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Could not read store file (${targetFile}), creating initial store:`, err);
  }
  return null;
}

/**
 * Atomically writes data to disk for a specific project
 */
export function saveStore(store: AppPersistentStore, projectId?: string): boolean {
  const targetFile = resolveStoreFilePath(projectId);

  try {
    let existing: Partial<AppPersistentStore> = {};
    if (fs.existsSync(targetFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(targetFile, "utf-8")) || {};
      } catch {
        // use empty if corrupt
      }
    } else {
      const fallbackLegacyFile = path.join(DATA_DIR, "dispatch_store.json");
      if (fs.existsSync(fallbackLegacyFile)) {
        try {
          existing = JSON.parse(fs.readFileSync(fallbackLegacyFile, "utf-8")) || {};
        } catch {
          // ignore
        }
      }
    }

    const merged: AppPersistentStore = {
      ...existing,
      ...store,
      // Ensure nested API configurations are never erased if not explicitly provided
      jobberConfig: store.jobberConfig || existing.jobberConfig,
      quoConfig: store.quoConfig || existing.quoConfig,
      apiKeys: store.apiKeys || existing.apiKeys,
      lastSavedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(merged, null, 2);
    fs.writeFileSync(targetFile, json, "utf-8");
    return true;
  } catch (err) {
    console.error(`Failed to write store (${targetFile}):`, err);
    return false;
  }
}
