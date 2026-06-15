"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

export default function DeleteSiteButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  async function handleDelete() {
    if (!confirm("Delete this site and all its comments?")) return;
    await supabase.from("comments").delete().eq("site_id", siteId);
    await supabase.from("sites").delete().eq("id", siteId);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-400 hover:text-red-300 p-1"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
