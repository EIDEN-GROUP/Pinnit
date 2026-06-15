import { useState, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ImageIcon, X, Send, Loader2 } from "lucide-react";

interface PinFormProps {
  x: number;
  y: number;
  pageUrl: string;
  scrollY: number;
  typoFix: boolean;
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSuccess: () => void;
}

const AUTOCORRECT: Record<string, string> = {
  teh: "the", Teh: "The", adn: "and", Adn: "And",
  dont: "don't", didnt: "didn't", doesnt: "doesn't",
  cant: "can't", wont: "won't", woudl: "would",
  should: "should", could: "could", taht: "that", Taht: "That",
  wiht: "with", hte: "the", Hte: "The", alot: "a lot",
  recieve: "receive", recieved: "received",
  beleive: "believe", beleived: "believed",
};

function autocorrect(text: string): string {
  return text.split(" ").map((w) => AUTOCORRECT[w] ?? w).join(" ");
}

export default function PinForm({
  x, y, pageUrl, scrollY, typoFix, userId, supabase, onClose, onSuccess,
}: PinFormProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLeft = Math.min(x, window.innerWidth - 280);
  const displayTop = y - scrollY;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    setError(null);

    const finalText = typoFix ? autocorrect(text) : text;
    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "png";
      const filename = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("comment-images")
        .upload(filename, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("comment-images")
        .getPublicUrl(filename);
      imageUrl = urlData?.publicUrl ?? null;
    }

    const origin = new URL(pageUrl).origin;
    let { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("url", origin)
      .maybeSingle();
    if (!site) {
      const hostname = new URL(pageUrl).hostname;
      const { data: inserted } = await supabase
        .from("sites")
        .insert({ title: hostname, url: origin })
        .select("id")
        .single();
      site = inserted;
    }
    if (!site) {
      setError("Failed to create site entry");
      setSubmitting(false);
      return;
    }

    const { error: createError } = await supabase.from("comments").insert({
      site_id: site.id,
      page_url: pageUrl,
      x_pos: x,
      y_pos: y,
      scroll_x: 0,
      scroll_y: scrollY,
      text: finalText,
      image_url: imageUrl,
      user_id: userId,
    });

    if (createError) {
      setError(createError.message);
      setSubmitting(false);
      return;
    }

    setText("");
    setImageFile(null);
    setImagePreview(null);
    onSuccess();
  }

  return (
    <>
      <style>{`
        @keyframes p-spin { to { transform: rotate(360deg); } }
        .p-spin { animation: p-spin 1s linear infinite; }
        @keyframes p-fade-in {
          from { opacity: 0; transform: scale(0.92) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .p-fade-in { animation: p-fade-in 0.2s ease-out; }
      `}</style>
      <div
        className="p-fade-in"
        style={{
          position: "fixed",
          left: maxLeft,
          top: displayTop,
          zIndex: 2147483647,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#122620",
            border: "1px solid rgba(207,194,146,0.18)",
            borderRadius: 14,
            boxShadow: "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(207,194,146,0.05)",
            padding: 14,
            width: 264,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#B8A87A", letterSpacing: "0.01em" }}>New pin</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                background: "none", border: "none", color: "#8A7D5E",
                cursor: "pointer", padding: 2, borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#B8A87A"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#8A7D5E"}
            >
              <X size={15} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your comment..."
            spellCheck={typoFix}
            rows={3}
            required
            maxLength={500}
            style={{
              width: "100%", padding: "8px 10px", background: "#1A3028",
              border: "1px solid rgba(207,194,146,0.18)", borderRadius: 10, color: "#CFC292",
              fontSize: 13, lineHeight: 1.5, resize: "none", outline: "none",
              boxSizing: "border-box", transition: "border-color 0.15s",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#CFC292"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(207,194,146,0.18)"}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "0 2px" }}>
            <span style={{ fontSize: 10, color: text.length > 450 ? text.length > 490 ? "#ef4444" : "#f59e0b" : "#8A7D5E" }}>
              {text.length}/500
            </span>
            {typoFix && text.length > 0 && (
              <span style={{ fontSize: 10, color: "#8A7D5E" }}>
                Auto-fix on
              </span>
            )}
          </div>

          {imagePreview && (
            <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
              <img
                src={imagePreview}
                alt=""
                style={{
                  height: 80, borderRadius: 10, objectFit: "cover",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                style={{
                  position: "absolute", top: -7, right: -7, background: "#ef4444",
                  borderRadius: "50%", border: "2px solid #122620", cursor: "pointer",
                  padding: 0, color: "white", width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                <X size={11} />
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              style={{
                background: "#1A3028", border: "1px solid rgba(207,194,146,0.18)", color: "#8A7D5E",
                cursor: "pointer", padding: "6px 8px", borderRadius: 8,
                display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#223A30"; e.currentTarget.style.color = "#B8A87A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1A3028"; e.currentTarget.style.color = "#8A7D5E"; }}
            >
              <ImageIcon size={13} />
              Image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            <button
              type="submit"
              disabled={submitting || !text.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px",
                background: submitting || !text.trim() ? "rgba(207,194,146,0.20)" : "#CFC292",
                color: submitting || !text.trim() ? "rgba(18,38,32,0.40)" : "#122620",
                border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: submitting || !text.trim() ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!submitting && text.trim())
                  e.currentTarget.style.background = "#B8A87A";
              }}
              onMouseLeave={(e) => {
                if (!submitting && text.trim())
                  e.currentTarget.style.background = "#CFC292";
              }}
            >
              {submitting ? (
                <Loader2 size={12} className="p-spin" />
              ) : (
                <Send size={12} />
              )}
              Pin it
            </button>
          </div>

          {error && (
            <p style={{
              color: "#f87171", fontSize: 11, marginTop: 8,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8, padding: "6px 8px",
            }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
