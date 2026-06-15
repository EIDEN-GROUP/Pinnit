import { useState } from "react";
import { MessageSquare, X, Trash2, ImageIcon } from "lucide-react";
import type { Comment } from "../types";

interface CommentPinProps {
  comment: Comment;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

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

export default function CommentPin({
  comment,
  isSelected,
  onSelect,
  onDelete,
}: CommentPinProps) {
  const [showImage, setShowImage] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(comment.id);
  }

  return (
    <div>
      <style>{`
        @keyframes p-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 0 rgba(207,194,146,0.5); }
          50% { box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 6px rgba(207,194,146,0); }
        }
        @keyframes p-popover-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .p-pulse { animation: p-pulse 2s ease-in-out infinite; }
        .p-popover-in { animation: p-popover-in 0.18s ease-out; }
      `}</style>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="p-pulse"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isSelected ? "#B8A87A" : "#CFC292",
          border: `2px solid ${isSelected ? "#CFC292" : "rgba(207,194,146,0.4)"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          transition: "all 0.15s",
          transform: "translate(-50%, -50%) scale(1)",
          padding: 0,
          color: "#122620",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#B8A87A";
          e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.15)";
          e.currentTarget.style.borderColor = "rgba(207,194,146,0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isSelected ? "#B8A87A" : "#CFC292";
          e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
          e.currentTarget.style.borderColor = isSelected ? "#CFC292" : "rgba(207,194,146,0.4)";
        }}
      >
        <MessageSquare size={13} />
      </button>

      {isSelected && (
        <div
          className="p-popover-in"
          style={{
            position: "absolute",
            top: 34,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#122620",
            border: "1px solid rgba(207,194,146,0.18)",
            borderRadius: 14,
            boxShadow: "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(207,194,146,0.05)",
            padding: 14,
            width: 264,
            zIndex: 2147483647,
            color: "#CFC292",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                flex: 1,
                margin: 0,
              }}
            >
              {comment.text}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#8A7D5E",
                cursor: "pointer",
                padding: 2,
                flexShrink: 0,
                borderRadius: 4,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#B8A87A"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#8A7D5E"}
            >
              <X size={14} />
            </button>
          </div>

          {comment.image_url && (
            <div style={{ marginTop: 10 }}>
              {showImage ? (
                <img
                  src={comment.image_url}
                  alt=""
                  style={{
                    borderRadius: 10,
                    maxHeight: 160,
                    objectFit: "cover",
                    cursor: "pointer",
                    width: "100%",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImage(false);
                  }}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImage(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "#CFC292",
                    background: "rgba(207,194,146,0.10)",
                    border: "1px solid rgba(207,194,146,0.20)",
                    borderRadius: 8,
                    cursor: "pointer",
                    padding: "5px 8px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(207,194,146,0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(207,194,146,0.10)"}
                >
                  <ImageIcon size={12} />
                  View image
                </button>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(207,194,146,0.12)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#B8A87A" }}>
                {comment.profiles?.username ?? "Anonymous"}
              </span>
              <span style={{ fontSize: 10, color: "#8A7D5E" }}>
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <button
              onClick={handleDelete}
              style={{
                background: "none",
                border: "none",
                color: "#8A7D5E",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8A7D5E";
                e.currentTarget.style.background = "none";
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
