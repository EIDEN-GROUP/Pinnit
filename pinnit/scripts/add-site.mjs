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

// Find the admin user
const { data: { users } } = await supabase.auth.admin.listUsers();
const admin = users?.find((u) => u.email === "y.brox95@gmail.com");
if (!admin) { console.error("Admin not found"); process.exit(1); }

const { data, error } = await supabase.from("sites").insert({
  title: "EduCazen Kids",
  url: "https://educazenkids.eiden-group.workers.dev/",
  description: "Interactive educational platform for kids",
  added_by: admin.id,
}).select().single();

if (error) { console.error("Error:", error.message); process.exit(1); }
console.log("✅ Site added:", data.id);
