import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(__dirname, "..", name);
    if (existsSync(p)) {
      const content = readFileSync(p, "utf-8");
      const vars = {};
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
      return vars;
    }
  }
  return {};
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: profile } = await supabase
  .from("profiles")
  .select("id, username, is_admin")
  .eq("id", (await supabase.auth.admin.listUsers()).data?.users?.find(u => u.email === "y.brox95@gmail.com")?.id)
  .single();

if (profile) {
  console.log("Profile:", JSON.stringify(profile, null, 2));
  if (profile.is_admin) {
    console.log("✅ Admin status: CONFIRMED");
  } else {
    console.log("⚠️  Not admin. Run: UPDATE profiles SET is_admin = true WHERE id = '" + profile.id + "';");
  }
} else {
  console.log("Profile not found — run supabase-schema.sql first");
}

const { data: sites } = await supabase.from("sites").select("id, title, url");
console.log("\nSites:", JSON.stringify(sites, null, 2));
