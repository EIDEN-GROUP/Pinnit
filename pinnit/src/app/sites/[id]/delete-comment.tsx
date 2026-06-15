"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";

export default function DeleteCommentButton({ commentId }: { commentId: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("comments").delete().eq("id", commentId);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-400 hover:text-red-300 p-1 shrink-0 transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
