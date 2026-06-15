/**
 * Pinnit — Create admin user
 *   node scripts/create-admin.mjs <email> <password>
 *
 * Also runs the SQL schema via the Supabase Dashboard API.
 * If that fails, you'll need to run supabase-schema.sql manually.
 */

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

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || supabaseUrl.includes("your_")) {
  console.error("❌ Set NEXT_PUBLIC_SUPABASE_URL in .env");
  process.exit(1);
}
if (!serviceRoleKey || serviceRoleKey.includes("your_")) {
  console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Step 1: Try running the SQL schema
console.log("1/3  Applying database schema...");
const schemaPath = resolve(__dirname, "..", "supabase-schema.sql");
const sql = readFileSync(schemaPath, "utf-8");

const sqlRes = await fetch(`${supabaseUrl}/sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  },
  body: JSON.stringify({ query: sql }),
});

if (sqlRes.ok) {
  console.log("  ✅ Schema applied");
} else {
  const text = await sqlRes.text();
  if (text.includes("already exists")) {
    console.log("  ✅ Schema already exists");
  } else {
    console.log(`  ⚠️  Could not auto-apply schema (${sqlRes.status}).`);
    console.log("     Run supabase-schema.sql manually in your Supabase SQL Editor.");
  }
}

// Step 2: Create the user
console.log("2/3  Creating user...");
const { data: userData, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

let userId;

if (createError) {
  if (createError.message.includes("already registered")) {
    console.log("  ℹ️  User already exists");
    const { data: users } = await supabase.auth.admin.listUsers();
    const found = users?.users?.find((u) => u.email === email);
    if (found) userId = found.id;
  } else {
    console.error("  ❌", createError.message);
    process.exit(1);
  }
} else {
  userId = userData.user.id;
  console.log(`  ✅ Created: ${userId}`);
}

// Step 3: Promote to admin
console.log("3/3  Promoting to admin...");
const { error: upsertError } = await supabase
  .from("profiles")
  .upsert({ id: userId, is_admin: true }, { onConflict: "id" });

if (upsertError) {
  console.log(`  ⚠️  ${upsertError.message}`);
  console.log("\nRun this in Supabase SQL Editor:");
  console.log(`  UPDATE profiles SET is_admin = true WHERE id = '${userId}';`);
  console.log("Or if profiles table doesn't exist yet, run supabase-schema.sql first.\n");
  process.exit(1);
}

// Ensure admin flag is set
const { error: updateError } = await supabase
  .from("profiles")
  .update({ is_admin: true })
  .eq("id", userId);

if (updateError) {
  console.log(`  ⚠️  ${updateError.message}`);
} else {
  console.log(`  ✅ ${email} is now an admin!`);
}

console.log("\nReady! Run 'npm run dev' and sign in.\n");
