/**
 * Pinnit Setup Script
 *   node scripts/setup.mjs
 *
 * Creates an admin user and promotes them in Supabase.
 * NOTE: Run supabase-schema.sql in your Supabase Dashboard SQL Editor FIRST.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    resolve(__dirname, "..", ".env.local"),
    resolve(__dirname, "..", ".env"),
  ];
  for (const p of candidates) {
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n=== Pinnit Setup ===\n");

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

  console.log("ℹ️  Make sure you've run supabase-schema.sql in the Supabase Dashboard SQL Editor first.");
  const proceed = await ask("\n   Have you run the SQL schema? (y/n): ");
  if (proceed.toLowerCase() !== "y") {
    console.log("\n   Open https://supabase.com/dashboard → your project → SQL Editor");
    console.log("   Paste the contents of supabase-schema.sql and run it.");
    console.log("   Then run this script again.\n");
    rl.close();
    return;
  }

  const email = await ask("\n   Admin email: ");
  const password = await ask("   Admin password (min 6 chars): ");

  if (!email || !password || password.length < 6) {
    console.error("  ❌ Invalid email or password (min 6 chars)");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create the user
  console.log("\n   Creating user...");
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.includes("already registered")) {
      console.log("   ℹ️  User already exists, promoting to admin...");
    } else {
      console.error("   ❌", createError.message);
      process.exit(1);
    }
  } else {
    console.log(`   ✅ User created: ${userData.user.id}`);
  }

  // Find user ID
  let userId = userData?.user?.id;
  if (!userId) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const found = users?.users?.find((u) => u.email === email);
    if (found) {
      userId = found.id;
    } else {
      console.error("   ❌ Could not find user. Register via the app first.");
      process.exit(1);
    }
  }

  // Promote to admin (service role bypasses RLS)
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert({ id: userId, is_admin: true }, { onConflict: "id" });

  if (upsertError) {
    console.error("   ❌ Failed to set admin:", upsertError.message);
    console.log("\n   Run this in Supabase SQL Editor instead:");
    console.log(`   UPDATE profiles SET is_admin = true WHERE id = '${userId}';\n`);
    process.exit(1);
  }

  console.log(`   ✅ ${email} is now an admin!`);
  console.log("\n   You can now sign in at http://localhost:3000/auth/login\n");

  rl.close();
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
