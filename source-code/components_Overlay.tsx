import { useState, useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import CommentPin from "./CommentPin";
import PinForm from "./PinForm";
import type { Comment } from "../types";

interface OverlayProps {
  shadowRoot: ShadowRoot;
}

export default function Overlay({ shadowRoot }: OverlayProps) {
  const [pinMode, setPinMode] = useState(false);
  const [typoFix, setTypoFix] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [placingPin, setPlacingPin] = useState<{ x: number; y: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollYRef = useRef(0);
  const pinModeRef = useRef(false);
  const supabaseRef = useRef<SupabaseClient>(null!);
  const [, forceRender] = useState(0);

  pinModeRef.current = pinMode;

  if (!supabaseRef.current) supabaseRef.current = getSupabase();
  const supabase = supabaseRef.current;

  const pageUrl = window.location.href;

  useEffect(() => {
    function handle(e: Event) {
      const msg = (e as CustomEvent).detail;
      if (msg.type === "PIN_MODE_CHANGED") setPinMode(msg.active);
      if (msg.type === "TYPO_FIX_CHANGED") setTypoFix(msg.active);
      if (msg.type === "PLACE_PIN") {
        setPlacingPin({ x: msg.x, y: msg.y });
        setPinMode(false);
      }
      if (msg.type === "AUTH_CHANGED") {
        if (msg.session === null) {
          setUserId(null);
          setIsAdmin(false);
          setComments([]);
        }
      }
    }
    shadowRoot.addEventListener("pinnit-message", handle);
    return () => shadowRoot.removeEventListener("pinnit-message", handle);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .maybeSingle()
          .then((res) => {
            if (res.data?.is_admin) setIsAdmin(true);
          });
      }
    });
  }, []);

  useEffect(() => {
    function onScroll() {
      scrollYRef.current = window.scrollY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let raf: number;
    function tick() {
      forceRender((n) => n + 1);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const origin = window.location.origin;
      const { data: site } = await supabase
        .from("sites")
        .select("id")
        .eq("url", origin)
        .maybeSingle();
      if (!site) return;
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("site_id", site.id)
        .eq("page_url", pageUrl)
        .order("created_at", { ascending: true });
      if (cancelled || !commentsData) return;
      const withProfiles: Comment[] = [];
      for (const c of commentsData) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", c.user_id)
          .maybeSingle();
        withProfiles.push({ ...(c as Comment), profiles: profile ?? undefined });
      }
      setComments(withProfiles);
    }
    load();
    return () => { cancelled = true; };
  }, [pageUrl]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!pinModeRef.current) return;

      const host = document.getElementById("pinnit-host");
      if (host && host.contains(e.target as Node)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const contentY = e.clientY + window.scrollY;
      setPlacingPin({ x: e.clientX, y: contentY });
      setPinMode(false);
    }

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("auxclick", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("auxclick", handleClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && pinModeRef.current) {
        setPinMode(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  async function handlePinPlaced() {
    setPlacingPin(null);
    setSelectedPinId(null);
    const origin = window.location.origin;
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("url", origin)
      .maybeSingle();
    if (!site) return;
    const { data: commentsData } = await supabase
      .from("comments")
      .select("*")
      .eq("site_id", site.id)
      .eq("page_url", pageUrl)
      .order("created_at", { ascending: true });
    if (!commentsData) return;
    const withProfiles: Comment[] = [];
    for (const c of commentsData) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", c.user_id)
        .maybeSingle();
      withProfiles.push({ ...(c as Comment), profiles: profile ?? undefined });
    }
    setComments(withProfiles);
  }

  async function handleDeleteComment(id: string) {
    if (!userId) return;
    const { data: comment } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    if (!comment) return;
    const isOwner = comment.user_id === userId;
    if (!isOwner && !isAdmin) return;
    await supabase.from("comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    setSelectedPinId(null);
  }

  const scrollY = scrollYRef.current;

  return (
    <div style={{ all: "initial" }}>
      <style>{`
        * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>

      {comments.map((comment) => {
        const displayY = comment.y_pos - scrollY;
        return (
          <div
            key={comment.id}
            style={{
              position: "fixed",
              left: comment.x_pos,
              top: displayY,
              zIndex: 2147483646,
              pointerEvents: "auto",
            }}
          >
            <CommentPin
              comment={comment}
              isSelected={selectedPinId === comment.id}
              onSelect={() =>
                setSelectedPinId(selectedPinId === comment.id ? null : comment.id)
              }
              onDelete={handleDeleteComment}
            />
          </div>
        );
      })}

      {placingPin && userId && (
        <div style={{ pointerEvents: "auto", zIndex: 2147483647 }}>
          <PinForm
            x={placingPin.x}
            y={placingPin.y}
            pageUrl={pageUrl}
            scrollY={scrollY}
            typoFix={typoFix}
            userId={userId}
            supabase={supabase}
            onClose={() => setPlacingPin(null)}
            onSuccess={handlePinPlaced}
          />
        </div>
      )}
    </div>
  );
}
