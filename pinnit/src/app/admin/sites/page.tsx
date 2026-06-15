import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import DeleteSiteButton from "./delete-button";
import type { Site } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminSitesPage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gold">Manage Sites</h1>
        <Link
          href="/admin/sites/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-gold-light text-dark rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </Link>
      </div>

      <div className="space-y-2">
        {(sites as Site[] ?? []).map((site) => (
          <div
            key={site.id}
            className="flex items-center justify-between bg-surface border border-gold/15 rounded-lg px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-gold font-medium truncate">{site.title}</p>
              <p className="text-sm text-gold-dim truncate">{site.url}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Link
                href={`/sites/${site.id}`}
                className="text-sm text-gold hover:underline"
              >
                View
              </Link>
              <DeleteSiteButton siteId={site.id} />
            </div>
          </div>
        ))}
        {(!sites || sites.length === 0) && (
          <p className="text-gold-dim text-center py-10">No sites yet</p>
        )}
      </div>
    </div>
  );
}
