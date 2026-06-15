import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ImageIcon, Trash2 } from "lucide-react";
import type { Site, Comment } from "@/types";
import DeleteCommentButton from "./delete-comment";

export const dynamic = "force-dynamic";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .single();

  if (!site) notFound();

  const { data: rawComments } = await supabase
    .from("comments")
    .select("*")
    .eq("site_id", id)
    .order("created_at", { ascending: false });

  let comments: Comment[] = [];

  if (rawComments && rawComments.length > 0) {
    const userIds = [...new Set(rawComments.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }])
    );

    comments = rawComments.map((c) => ({
      ...c,
      profiles: profileMap[c.user_id] ?? { username: null, avatar_url: null },
    })) as unknown as Comment[];
  }

  const isAdmin = user
    ? (await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle())
        .data?.is_admin ?? false
    : false;

  const canDelete = (comment: Comment) => user && (comment.user_id === user.id || isAdmin);

  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-surface/80 backdrop-blur-sm border-b border-gold/15 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-gold font-bold text-lg shrink-0">
            <img src="/logo.jpeg" alt="Pinnit" className="w-7 h-7 rounded-[30%] object-cover" />
            <span className="hidden sm:inline">Pinnit</span>
          </Link>
          <div className="h-5 w-px bg-gold/15" />
          <h1 className="text-gold font-bold text-lg truncate">{site.title}</h1>
          <span className="text-xs text-gold-dim ml-auto">
            {comments.length} pin{comments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {site.description && (
          <p className="text-gold-dim text-sm mb-8">{site.description}</p>
        )}

        {comments.length === 0 ? (
          <div className="text-center py-20 text-gold-dim">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No pins yet</p>
            <p className="text-sm mt-1">
              Install the Pinnit extension to start pinning comments on this site
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-surface border border-gold/15 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gold text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">
                    {comment.text}
                  </p>
                  {canDelete(comment) && (
                    <DeleteCommentButton commentId={comment.id} />
                  )}
                </div>

                {comment.image_url && (
                  <div className="mt-3">
                    <img
                      src={comment.image_url}
                      alt=""
                      className="rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gold/12">
                  <div className="flex items-center gap-2 text-xs text-gold-dim">
                    <span className="text-gold-light font-medium">
                      {comment.profiles?.username ?? "Anonymous"}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(comment.created_at)}</span>
                  </div>
                  <a
                    href={comment.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gold-dim hover:text-gold transition-colors truncate max-w-[200px]"
                  >
                    {new URL(comment.page_url).pathname || "/"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
