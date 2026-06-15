"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewSitePage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const { error: err } = await supabase.from("sites").insert({
      title,
      url,
      description: description || null,
      thumbnail: thumbnail || null,
      added_by: user.id,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/admin/sites");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gold mb-6">Add New Site</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gold-light mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-gold/20 rounded-lg text-gold placeholder-gold-dim focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="My Cool Site"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gold-light mb-1">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-gold/20 rounded-lg text-gold placeholder-gold-dim focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gold-light mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-gold/20 rounded-lg text-gold placeholder-gold-dim focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            placeholder="What's this site about?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gold-light mb-1">
            Thumbnail URL (optional)
          </label>
          <input
            type="url"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-gold/20 rounded-lg text-gold placeholder-gold-dim focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gold hover:bg-gold-light disabled:opacity-50 text-dark rounded-lg transition-colors text-sm"
          >
            {loading ? "Adding..." : "Add Site"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-raised hover:bg-surface text-gold rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
