"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageIcon, X, Send, Loader2 } from "lucide-react";

interface PinFormProps {
  x: number;
  y: number;
  siteId: string;
  pageUrl: string;
  scrollX: number;
  scrollY: number;
  typoFix: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function autocorrect(text: string): string {
  const common: Record<string, string> = {
    teh: "the", Teh: "The", adn: "and", Adn: "And",
    dont: "don't", didnt: "didn't", doesnt: "doesn't",
    cant: "can't", wont: "won't", woudl: "would",
    should: "should", could: "could", taht: "that", Taht: "That",
    wiht: "with", hte: "the", Hte: "The", alot: "a lot",
    recieve: "receive", recieved: "received",
    beleive: "believe", beleived: "believed",
  };
  return text
    .split(" ")
    .map((w) => common[w] ?? w)
    .join(" ");
}

export default function PinForm({
  x,
  y,
  siteId,
  pageUrl,
  scrollX,
  scrollY,
  typoFix,
  onClose,
  onSuccess,
}: PinFormProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient()).current;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const finalText = typoFix ? autocorrect(text) : text;
    let imageUrl: string | null = null;

    if (image) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", image);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setSubmitting(false);
        setUploading(false);
        return;
      }
      imageUrl = data.url;
      setUploading(false);
    }

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_id: siteId,
        page_url: pageUrl,
        x_pos: x,
        y_pos: y,
        scroll_x: scrollX,
        scroll_y: scrollY,
        text: finalText,
        image_url: imageUrl,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save comment");
    } else {
      setText("");
      setImage(null);
      setImagePreview(null);
      onSuccess();
    }
    setSubmitting(false);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB)");
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  return (
    <div
      className="absolute z-30"
      style={{
        left: `${Math.min(x, window.innerWidth - 280)}px`,
        top: `${y - scrollY}px`,
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-dark border border-gold/20 rounded-xl shadow-2xl p-3 w-64"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gold-light">New pin</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gold-dim hover:text-gold-light"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your comment..."
          spellCheck={typoFix}
          rows={3}
          required
          className="w-full px-2 py-1.5 bg-surface border border-gold/20 rounded-lg text-gold text-sm placeholder-gold-dim focus:outline-none focus:ring-1 focus:ring-gold resize-none"
        />

        {imagePreview && (
          <div className="relative mt-2 inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => { setImage(null); setImagePreview(null); }}
              className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-gold-dim hover:text-gold-light transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="flex items-center gap-1 px-3 py-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-dark text-xs rounded-lg transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            {uploading ? "Uploading..." : "Pin it"}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </form>
    </div>
  );
}
