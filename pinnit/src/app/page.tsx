import { createClient } from "@/lib/supabase/server";
import Header from "@/components/header";
import SiteGrid from "@/components/site-grid";
import type { Site } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-dark">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gold">Curated Sites</h1>
          <p className="text-gold-dim mt-1">
            Browse and pin comments on any page
          </p>
        </div>
        <SiteGrid sites={(sites as Site[]) ?? []} />
      </main>
    </div>
  );
}
