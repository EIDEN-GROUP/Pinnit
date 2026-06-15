"use client";

import { useState } from "react";
import { MessageSquare, X, Trash2, ImageIcon } from "lucide-react";
import type { Comment } from "@/types";

interface CommentPinProps {
  comment: Comment;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  currentUserId: string | null;
  isAdmin: boolean;
}

export default function CommentPin({
  comment,
  isSelected,
  onSelect,
  onDelete,
  currentUserId,
  isAdmin,
}: CommentPinProps) {
  const [showImage, setShowImage] = useState(false);

  const canDelete = currentUserId === comment.user_id || isAdmin;

  return (
    <div className="z-10" style={{ transform: "translate(-50%, -50%)" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className="w-7 h-7 bg-gold rounded-full flex items-center justify-center shadow-lg hover:bg-gold-light transition-colors cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5 text-dark" />
      </button>

      {isSelected && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-dark border border-gold/20 rounded-xl shadow-2xl p-3 w-64 z-20">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gold whitespace-pre-wrap break-words flex-1">
              {comment.text}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="text-gold-dim hover:text-gold-light shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {comment.image_url && (
            <div className="mt-2">
              {showImage ? (
                <img
                  src={comment.image_url}
                  alt="Comment attachment"
                  className="rounded-lg max-h-40 object-cover cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setShowImage(false); }}
                />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowImage(true); }}
                  className="flex items-center gap-1.5 text-xs text-gold hover:underline"
                >
                  <ImageIcon className="w-3 h-3" />
                  View image
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gold/15">
            <span className="text-xs text-gold-dim">
              {comment.profiles?.username ?? "Anonymous"}
            </span>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
