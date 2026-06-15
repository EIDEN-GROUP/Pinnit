"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import CommentPin from "./comment-pin";
import PinForm from "./pin-form";
import {
  ArrowLeft,
  MapPin,
  SpellCheck,
  MessageSquare,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import type { Site, Comment } from "@/types";

interface SiteViewerProps {
  site: Site;
  userId: string | null;
}

export default function SiteViewer({ site, userId }: SiteViewerProps) {
  const [pinMode, setPinMode] = useState(false);
  const [typoFix, setTypoFix] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [placingPin, setPlacingPin] = useState<{ x: number; y: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [useDirect, setUseDirect] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const scrollYRef = useRef(0);
  const [, forceRender] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useRef(createClient()).current;

  const pageUrl = site.url;
  const proxySrc = `/api/proxy?url=${encodeURIComponent(pageUrl)}`;
  const trackScroll = !useDirect;

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "pinnit-scroll") {
        scrollYRef.current = e.data.scrollY;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (useDirect) return;
    let raf: number;
    function poll() {
      forceRender((n) => n + 1);
      raf = requestAnimationFrame(poll);
    }
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [useDirect]);

  const loadComments = useCallback(async () => {
    const res = await fetch(
      `/api/comments?site_id=${site.id}&page_url=${encodeURIComponent(pageUrl)}`
    );
    if (res.ok) {
      const data = await res.json();
      setComments(data);
    }
  }, [site.id, pageUrl]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (userId) {
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true);
        });
    }
  }, [userId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleIframeLoad() {
    setIframeReady(true);
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (!pinMode || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const viewX = e.clientX - rect.left;
    const viewY = e.clientY - rect.top;

    const contentY = viewY + scrollYRef.current;

    setPlacingPin({ x: viewX, y: contentY });
    setPinMode(false);
  }

  function handlePinPlaced() {
    setPlacingPin(null);
    setSelectedPinId(null);
    loadComments();
  }

  async function handleDeleteComment(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id));
      setSelectedPinId(null);
    }
  }

  const showFallbackHint = !useDirect && iframeReady;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-dark">
      {!fullscreen && (
      <div className="flex items-center justify-between px-4 h-12 bg-surface border-b border-gold/15 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-gold-dim hover:text-gold transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-medium text-gold truncate">{site.title}</h1>
          <a href={site.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-gold-dim hover:text-gold truncate hidden sm:block"
          >
            {new URL(site.url).hostname}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gold-dim mr-1">
            {comments.length} pin{comments.length !== 1 ? "s" : ""}
          </span>

          <button onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded-lg text-gold-dim hover:text-gold hover:bg-raised transition-colors"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button onClick={() => setTypoFix(!typoFix)}
            className={`p-1.5 rounded-lg transition-colors ${
              typoFix
                ? "bg-gold text-dark"
                : "text-gold-dim hover:text-gold hover:bg-raised"
            }`}
            title={typoFix ? "Auto-fix enabled" : "Enable auto-fix typos"}
          >
            <SpellCheck className="w-4 h-4" />
          </button>

          <button onClick={() => { setPinMode(!pinMode); setPlacingPin(null); setSelectedPinId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pinMode
                ? "bg-gold text-dark"
                : "bg-raised text-gold-light hover:text-gold hover:bg-surface"
            }`}
          >
            <MapPin className="w-4 h-4" />
            {pinMode ? "Cancel" : "Pin"}
          </button>
        </div>
      </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-raised">
        {!useDirect && (
          <iframe
            ref={iframeRef}
            src={proxySrc}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}

        {useDirect && (
          <iframe
            ref={iframeRef}
            src={pageUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}

        {showFallbackHint && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            <button
              onClick={() => setUseDirect(true)}
              className="bg-dark/80 hover:bg-surface text-gold-light hover:text-gold text-xs px-3 py-1.5 rounded-full border border-gold/20 transition-colors"
            >
              Not loading right? Load directly
            </button>
          </div>
        )}

        {useDirect && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-yellow-900/90 text-yellow-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
            <AlertTriangle className="w-3 h-3" />
            Pins are viewport-fixed (loaded directly, no scroll tracking)
          </div>
        )}

        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className={`absolute inset-0 transition-colors duration-200 ${
            pinMode
              ? "bg-gold/5 cursor-crosshair z-20"
              : "pointer-events-none"
          }`}
        >
          {pinMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gold text-dark text-sm px-4 py-1.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
              Click anywhere to place a pin
            </div>
          )}

          {comments.map((comment) => {
            const displayY = trackScroll
              ? comment.y_pos - scrollYRef.current
              : comment.y_pos;

            return (
              <div key={comment.id} className="pointer-events-auto absolute" style={{ left: comment.x_pos, top: displayY }}>
                <CommentPin
                  comment={comment}
                  isSelected={selectedPinId === comment.id}
                  onSelect={() =>
                    setSelectedPinId(selectedPinId === comment.id ? null : comment.id)
                  }
                  onDelete={handleDeleteComment}
                  currentUserId={userId}
                  isAdmin={isAdmin}
                />
              </div>
            );
          })}

          {placingPin && (
            <div className="pointer-events-auto">
              <PinForm
                x={placingPin.x}
                y={placingPin.y}
                siteId={site.id}
                pageUrl={pageUrl}
                scrollX={0}
                scrollY={scrollYRef.current}
                typoFix={typoFix}
                onClose={() => setPlacingPin(null)}
                onSuccess={handlePinPlaced}
              />
            </div>
          )}
        </div>
      </div>

      {!fullscreen && (
      <div className="flex items-center justify-between px-4 h-10 bg-surface border-t border-gold/15 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gold-dim">
          <MessageSquare className="w-3 h-3" />
          <span>
            {comments.length > 0
              ? `${comments.length} pin${comments.length !== 1 ? "s" : ""}`
              : "No pins yet"}
          </span>
        </div>
        <div className="text-xs text-gold-dim">
          {useDirect
            ? "Pins are viewport-fixed"
            : pinMode
              ? "Pin mode active — click to place a comment"
              : 'Toggle "Pin" to add comments'}
        </div>
      </div>
      )}
    </div>
  );
}
