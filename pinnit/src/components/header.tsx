"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, UserPlus, LayoutDashboard } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const fetchAdminStatus = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    setIsAdmin(data?.is_admin ?? false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        fetchAdminStatus(data.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchAdminStatus(u.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAdminStatus, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-surface/80 backdrop-blur-sm border-b border-gold/15 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-gold font-bold text-lg">
          <img src="/logo.jpeg" alt="Pinnit" className="w-7 h-7 rounded-[30%] object-cover" />
          Pinnit
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-sm text-gold-light hover:text-gold px-3 py-1.5 rounded-lg hover:bg-raised transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <span className="text-sm text-gold-dim hidden sm:block">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-gold-light hover:text-gold px-3 py-1.5 rounded-lg hover:bg-raised transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 text-sm text-gold-light hover:text-gold px-3 py-1.5 rounded-lg hover:bg-raised transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-1.5 text-sm bg-gold hover:bg-gold-light text-dark px-3 py-1.5 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
