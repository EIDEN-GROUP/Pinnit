import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const STORAGE_PREFIX = "pinnit-supabase-";

const chromeStorageAdapter: Storage = {
  async getItem(key: string) {
    try {
      const result = await chrome.storage.local.get(STORAGE_PREFIX + key);
      return result[STORAGE_PREFIX + key] ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      await chrome.storage.local.set({ [STORAGE_PREFIX + key]: value });
    } catch {
      // context invalidated — ignore
    }
  },
  async removeItem(key: string) {
    try {
      await chrome.storage.local.remove(STORAGE_PREFIX + key);
    } catch {
      // context invalidated — ignore
    }
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return client;
}
