import Link from "next/link";
import { Globe, Users, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { count: siteCount } = await supabase
    .from("sites")
    .select("*", { count: "exact", head: true });

  const { count: commentCount } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-gold/15 rounded-xl p-5">
          <Globe className="w-8 h-8 text-gold mb-3" />
          <p className="text-2xl font-bold text-gold">{siteCount ?? 0}</p>
          <p className="text-sm text-gold-dim">Sites</p>
        </div>
        <div className="bg-surface border border-gold/15 rounded-xl p-5">
          <MessageSquare className="w-8 h-8 text-gold mb-3" />
          <p className="text-2xl font-bold text-gold">{commentCount ?? 0}</p>
          <p className="text-sm text-gold-dim">Comments</p>
        </div>
        <div className="bg-surface border border-gold/15 rounded-xl p-5">
          <Users className="w-8 h-8 text-gold mb-3" />
          <p className="text-2xl font-bold text-gold">-</p>
          <p className="text-sm text-gold-dim">Users</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/admin/sites"
          className="px-4 py-2 bg-raised hover:bg-surface text-gold rounded-lg transition-colors text-sm"
        >
          Manage Sites
        </Link>
        <Link
          href="/admin/sites/new"
          className="px-4 py-2 bg-gold hover:bg-gold-light text-dark rounded-lg transition-colors text-sm"
        >
          Add New Site
        </Link>
      </div>
    </div>
  );
}
