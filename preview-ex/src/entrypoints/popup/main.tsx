import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  MapPin,
  SpellCheck,
  LogOut,
  Shield,
  Globe,
  Trash2,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import type { Site } from "../../types";

function bg<T = any>(msg: any): Promise<T> {
  return chrome.runtime.sendMessage(msg);
}

const GLOBAL_CSS = `
  @keyframes _fadeUp {
    from { opacity: 0; transform: translateY(9px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes _fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes _shake {
    0%,100% { transform: translateX(0);    }
    18%     { transform: translateX(-5px); }
    36%     { transform: translateX(5px);  }
    54%     { transform: translateX(-3px); }
    72%     { transform: translateX(3px);  }
  }
  @keyframes _arc {
    to { transform: rotate(360deg); }
  }
  @keyframes _dot {
    0%,80%,100% { opacity: 0.2; transform: scale(0.7); }
    40%         { opacity: 1;   transform: scale(1);   }
  }

  .p-fadeUp { animation: _fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both; }
  .p-fadeIn { animation: _fadeIn 0.22s ease both; }
  .p-shake  { animation: _shake  0.42s ease; }

  .p-d1 { animation-delay: 50ms;  }
  .p-d2 { animation-delay: 95ms;  }
  .p-d3 { animation-delay: 140ms; }
  .p-d4 { animation-delay: 185ms; }

  @media (prefers-reduced-motion: reduce) {
    .p-fadeUp, .p-fadeIn, .p-shake { animation: none; }
  }
`;

function StyleInjector() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

const C = {
  bg: "#122620", panel: "#1A3028", raised: "#223A30",
  fold: "rgba(207,194,146,0.12)", foldHi: "rgba(207,194,146,0.20)",
  txt1: "#CFC292", txt2: "#B8A87A", txt3: "#8A7D5E",
  pin: "#CFC292", pinBg: "rgba(207,194,146,0.10)", pinBd: "rgba(207,194,146,0.25)",
  mark: "#CFC292", markBg: "rgba(207,194,146,0.10)", markBd: "rgba(207,194,146,0.25)",
  red: "#EF4444", redBg: "rgba(239,68,68,0.10)", redBd: "rgba(239,68,68,0.22)",
};

function Spinner({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <span style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      border: `1.75px solid ${color}28`,
      borderTopColor: color,
      animation: "_arc 0.72s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function PinInput({
  type, placeholder, value, onChange, required, minLength,
}: {
  type: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      minLength={minLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        padding: "10px 13px",
        borderRadius: "9px",
        border: `1px solid ${focused ? C.pinBd : C.fold}`,
        background: C.raised,
        color: C.txt1,
        fontSize: "13px",
        letterSpacing: "-0.01em",
        outline: "none",
        boxShadow: focused ? `0 0 0 3px ${C.pinBg}` : "none",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      }}
    />
  );
}

function Toggle({
  enabled, onChange, icon: Icon, label, description, color = "pin",
}: {
  enabled: boolean; onChange: () => void;
  icon: React.ElementType; label: string; description: string;
  color?: "pin" | "mark";
}) {
  const [pressed, setPressed] = useState(false);
  const accent   = color === "pin" ? C.pin   : C.mark;
  const accentBg = color === "pin" ? C.pinBg : C.markBg;
  const accentBd = color === "pin" ? C.pinBd : C.markBd;

  return (
    <button
      onClick={onChange}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "11px 12px",
        borderRadius: "11px",
        border: `1px solid ${enabled ? accentBd : C.fold}`,
        background: enabled
          ? `radial-gradient(ellipse 60% 100% at 0% 50%, ${accentBg} 0%, transparent 70%), ${C.panel}`
          : C.panel,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transform: pressed ? "scale(0.983)" : "scale(1)",
        transition: "border-color 0.22s ease, background 0.22s ease, transform 0.12s ease",
        gap: "10px",
        textAlign: "left",
      }}
    >
      <span style={{
        position: "absolute",
        left: 0,
        top: "10px",
        bottom: "10px",
        width: "2.5px",
        borderRadius: "0 2px 2px 0",
        background: accent,
        opacity: enabled ? 0.9 : 0,
        transform: enabled ? "scaleY(1)" : "scaleY(0.4)",
        transformOrigin: "center",
        transition: "opacity 0.2s ease, transform 0.25s cubic-bezier(0.22,1,0.36,1)",
      }} />

      <span style={{
        flexShrink: 0,
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: enabled ? accent : C.raised,
        border: `1px solid ${enabled ? "transparent" : C.fold}`,
        transition: "background 0.2s ease, border-color 0.2s ease",
        marginLeft: "4px",
      }}>
        <Icon size={14} style={{ color: enabled ? "#122620" : C.txt2, transition: "color 0.2s ease" }} />
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          letterSpacing: "-0.015em",
          color: enabled ? C.txt1 : C.txt2,
          lineHeight: 1.25,
          transition: "color 0.2s ease",
        }}>
          {label}
        </span>
        <span style={{
          display: "block",
          fontSize: "11px",
          color: C.txt3,
          marginTop: "2px",
          lineHeight: 1.35,
        }}>
          {description}
        </span>
      </span>

      <span style={{
        flexShrink: 0,
        width: "34px",
        height: "18px",
        borderRadius: "9px",
        background: enabled ? accent : C.raised,
        border: `1px solid ${enabled ? "transparent" : C.foldHi}`,
        position: "relative",
        transition: "background 0.22s ease",
      }}>
        <span style={{
          position: "absolute",
          top: "2px",
          left: enabled ? "16px" : "2px",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "#122620",
          boxShadow: "0 1px 3px rgba(0,0,0,0.28)",
          transition: "left 0.26s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </span>
    </button>
  );
}

function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [mode, setMode]         = useState<"login" | "register">("login");
  const [errKey, setErrKey]     = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const type = mode === "login" ? "LOGIN_EMAIL" : "REGISTER";
    const res  = await bg<any>({ type, email, password });
    if (res.error) {
      setError(res.error);
      setErrKey(k => k + 1);
    }
    setLoading(false);
  }

  function switchMode() {
    setMode(m => m === "login" ? "register" : "login");
    setError(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      <div className="p-fadeUp" style={{ textAlign: "center" }}>
        <img
          src={chrome.runtime.getURL("icon128.png")}
          alt="Pinnit"
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "13px",
            objectFit: "cover",
            marginBottom: "13px",
            boxShadow: `0 8px 28px ${C.pinBg}, 0 0 0 1px ${C.pinBd}`,
          }}
        />
        <div style={{ fontSize: "16px", fontWeight: 650, letterSpacing: "-0.025em", color: C.txt1, lineHeight: 1.2 }}>
          Pinnit
        </div>
        <div style={{ fontSize: "12px", color: C.txt2, marginTop: "4px" }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "7px" }}
        className="p-fadeUp p-d1"
      >
        <PinInput
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <PinInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && (
          <div
            key={errKey}
            className="p-shake"
            style={{
              fontSize: "12px",
              lineHeight: 1.45,
              color: C.red,
              background: C.redBg,
              border: `1px solid ${C.redBd}`,
              borderRadius: "8px",
              padding: "8px 11px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <PrimaryButton loading={loading}>
          {mode === "login" ? "Sign in" : "Create account"}
        </PrimaryButton>

        <button
          type="button"
          onClick={switchMode}
          style={{
            fontSize: "11px",
            color: C.pin,
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "center",
            padding: "2px 0",
            opacity: 0.85,
            transition: "opacity 0.15s ease",
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.85")}
        >
          {mode === "login" ? "No account? Sign up →" : "Already have an account? Sign in →"}
        </button>
      </form>
    </div>
  );
}

function PrimaryButton({
  loading, children, onClick, type = "submit",
}: {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "10px",
        borderRadius: "9px",
        background: hov && !loading ? "#B8A87A" : C.pin,
        color: "#122620",
        fontSize: "13px",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        transition: "background 0.18s ease, opacity 0.18s ease, transform 0.12s ease",
        transform: hov && !loading ? "translateY(-0.5px)" : "none",
        marginTop: "3px",
      }}
    >
      {loading ? <Spinner color="#122620" size={13} /> : children}
    </button>
  );
}

function MainView({
  session, onSignOut,
}: {
  session: Session; onSignOut: () => void;
}) {
  const [pinMode, setPinMode]     = useState(false);
  const [typoFix, setTypoFix]     = useState(false);
  const [profile, setProfile]     = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutHov, setSignOutHov] = useState(false);
  const [isWebPage, setIsWebPage] = useState(true);

  useEffect(() => {
    bg<any>({ type: "GET_PROFILE", userId: session.user.id }).then(r =>
      setProfile(r.profile)
    );
  }, []);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url && !tab.url.startsWith("http")) {
        setIsWebPage(false);
      }
    });
  }, []);

  function sendToActiveTab(msg: any) {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    });
  }

  function togglePinMode() {
    const next = !pinMode;
    setPinMode(next);
    sendToActiveTab({ type: "PIN_MODE_CHANGED", active: next });
  }

  function toggleTypoFix() {
    const next = !typoFix;
    setTypoFix(next);
    sendToActiveTab({ type: "TYPO_FIX_CHANGED", active: next });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await onSignOut();
  }

  const isAdmin = profile?.is_admin === true;
  const email   = session.user.email ?? "User";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      <div
        className="p-fadeUp"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "14px",
          borderBottom: `1px solid ${C.fold}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src={chrome.runtime.getURL("icon128.png")}
            alt="Pinnit"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              objectFit: "cover",
              boxShadow: `0 4px 14px ${C.pinBg}`,
              flexShrink: 0,
            }}
          />

          <div>
            <div style={{
              fontSize: "13.5px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: C.txt1,
              lineHeight: 1.2,
            }}>
              Pinnit
            </div>
            <div style={{
              fontSize: "11px",
              color: C.txt3,
              marginTop: "2px",
              lineHeight: 1.2,
              maxWidth: "190px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {email}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          onMouseEnter={() => setSignOutHov(true)}
          onMouseLeave={() => setSignOutHov(false)}
          title="Sign out"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: signOutHov ? C.red : C.txt3,
            background: signOutHov ? C.redBg : "transparent",
            border: `1px solid ${signOutHov ? C.redBd : "transparent"}`,
            cursor: signingOut ? "not-allowed" : "pointer",
            transition: "all 0.18s ease",
            flexShrink: 0,
          }}
        >
          {signingOut
            ? <Spinner color={C.txt3} size={13} />
            : <LogOut size={13} />
          }
        </button>
      </div>

      {isWebPage && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div className="p-fadeUp p-d1">
            <Toggle
              enabled={pinMode}
              onChange={togglePinMode}
              icon={MapPin}
              label="Pin mode"
              description="Click anywhere to drop an annotation"
              color="pin"
            />
          </div>
          <div className="p-fadeUp p-d2">
            <Toggle
              enabled={typoFix}
              onChange={toggleTypoFix}
              icon={SpellCheck}
              label="Auto-fix typos"
              description="Quietly correct mistakes as you type"
              color="mark"
            />
          </div>
        </div>
      )}

      {pinMode && (
        <div
          className="p-fadeIn"
          style={{
            fontSize: "11px",
            lineHeight: 1.55,
            color: C.pin,
            background: C.pinBg,
            border: `1px solid ${C.pinBd}`,
            borderRadius: "9px",
            padding: "9px 12px",
          }}
        >
          Click anywhere to place a pin, or right-click → "Pin comment".{" "}
          Press{" "}
          <kbd style={{
            display: "inline-block",
            padding: "1px 5px",
            borderRadius: "4px",
            background: C.pinBd,
            color: C.pin,
            fontSize: "10px",
            fontFamily: "inherit",
            fontWeight: 600,
            letterSpacing: "0",
            lineHeight: 1.5,
          }}>
            Esc
          </kbd>{" "}
          to cancel.
        </div>
      )}

      <PinnedSites />

      {isAdmin && (
        <div
          className="p-fadeUp p-d3"
          style={{ borderTop: `1px solid ${C.fold}`, paddingTop: "12px" }}
        >
          <AdminToggle
            open={showAdmin}
            onToggle={() => setShowAdmin(v => !v)}
          />
          <div style={{
            overflow: "hidden",
            maxHeight: showAdmin ? "220px" : "0px",
            opacity: showAdmin ? 1 : 0,
            transition: "max-height 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease",
            marginTop: showAdmin ? "10px" : "0",
          }}>
            <AdminPanel />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminToggle({
  open, onToggle,
}: {
  open: boolean; onToggle: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        color: hov ? C.txt2 : C.txt3,
        background: "none",
        border: "none",
        cursor: "pointer",
        width: "100%",
        transition: "color 0.15s ease",
      }}
    >
      <Shield size={11} />
      <span>Admin</span>
      <span style={{
        marginLeft: "auto",
        fontSize: "9px",
        display: "inline-block",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1)",
        color: C.txt3,
      }}>▼</span>
    </button>
  );
}

function AdminPanel() {
  const [sites, setSites]     = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    bg<{ sites: Site[] }>({ type: "ADMIN_GET_SITES" }).then(r => {
      setSites(r.sites ?? []);
      setLoading(false);
    });
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    await bg({ type: "ADMIN_DELETE_SITE", siteId: id });
    setSites(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 0" }}>
        <Spinner color={C.txt3} size={14} />
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: "9px",
      border: `1px solid ${C.fold}`,
      background: C.panel,
      overflow: "hidden",
      maxHeight: "170px",
      overflowY: "auto",
    }}>
      <div style={{
        padding: "7px 11px",
        fontSize: "10px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: C.txt3,
        borderBottom: `1px solid ${C.fold}`,
      }}>
        {sites.length} {sites.length === 1 ? "site" : "sites"}
      </div>

      {sites.length === 0 ? (
        <div style={{ padding: "14px 11px", fontSize: "12px", color: C.txt3, textAlign: "center" }}>
          No sites yet
        </div>
      ) : (
        sites.map((site, i) => (
          <SiteRow
            key={site.id}
            site={site}
            deleting={deleting === site.id}
            onDelete={() => handleDelete(site.id)}
            last={i === sites.length - 1}
          />
        ))
      )}
    </div>
  );
}

function SiteRow({
  site, deleting, onDelete, last,
}: {
  site: Site; deleting: boolean; onDelete: () => void; last: boolean;
}) {
  const [hov, setHov] = useState(false);
  const [btnHov, setBtnHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 10px",
        background: hov ? C.raised : "transparent",
        borderBottom: last ? "none" : `1px solid ${C.fold}`,
        transition: "background 0.12s ease",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        minWidth: 0,
      }}>
        <Globe size={11} style={{ color: C.txt3, flexShrink: 0 }} />
        <span style={{
          fontSize: "12px",
          color: C.txt2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em",
        }}>
          {site.title}
        </span>
      </div>

      <button
        onClick={onDelete}
        disabled={deleting}
        onMouseEnter={() => setBtnHov(true)}
        onMouseLeave={() => setBtnHov(false)}
        style={{
          flexShrink: 0,
          width: "22px",
          height: "22px",
          borderRadius: "5px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: btnHov ? C.red : C.txt3,
          background: btnHov ? C.redBg : "transparent",
          border: `1px solid ${btnHov ? C.redBd : "transparent"}`,
          cursor: deleting ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          opacity: deleting ? 0.5 : 1,
        }}
      >
        {deleting
          ? <Spinner color={C.red} size={11} />
          : <Trash2 size={11} />
        }
      </button>
    </div>
  );
}

function PinnedSites() {
  const [sites, setSites]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hov, setHov]       = useState<string | null>(null);

  useEffect(() => {
    bg<{ sites: any[] }>({ type: "GET_SITES_WITH_COMMENTS" }).then(r => {
      setSites(r.sites ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return null;
  if (sites.length === 0) return null;

  return (
    <div style={{
      borderTop: `1px solid ${C.fold}`,
      paddingTop: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <span style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        color: C.txt3,
        paddingLeft: "2px",
      }}>
        Pinned sites · {sites.length}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {sites.slice(0, 10).map((site: any) => (
          <button
            key={site.id}
            onClick={() => window.open(site.url, "_blank")}
            onMouseEnter={() => setHov(site.id)}
            onMouseLeave={() => setHov(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              borderRadius: "9px",
              background: hov === site.id ? C.raised : "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.12s ease",
              width: "100%",
            }}
          >
            <span style={{
              fontSize: "11px",
              fontWeight: 600,
              color: C.txt2,
              minWidth: "20px",
              textAlign: "right",
              flexShrink: 0,
            }}>
              {site.comment_count}
            </span>
            <span style={{
              flex: 1,
              fontSize: "12px",
              color: C.pin,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {site.title}
            </span>
            <span style={{
              fontSize: "10px",
              color: C.txt3,
              flexShrink: 0,
            }}>
              ↗
            </span>
          </button>
        ))}
      </div>

      {sites.length > 10 && (
        <span style={{ fontSize: "10px", color: C.txt3, textAlign: "center", paddingTop: "2px" }}>
          +{sites.length - 10} more
        </span>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="p-fadeIn" style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "44px 0",
      gap: "14px",
    }}>
      <div style={{
        width: "42px",
        height: "42px",
        borderRadius: "11px",
        background: C.panel,
        border: `1px solid ${C.fold}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 2px 12px rgba(0,0,0,0.12)`,
      }}>
        <Spinner color={C.pin} size={16} />
      </div>
      <span style={{ fontSize: "11px", color: C.txt3, letterSpacing: "-0.01em" }}>
        Loading…
      </span>
    </div>
  );
}

function App() {
  const [session, setSession]   = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.body.style.background = C.bg;
    document.body.style.color      = C.txt1;
  }, []);

  useEffect(() => {
    bg<{ session: Session | null }>({ type: "GET_SESSION" }).then(r => {
      setSession(r.session);
      setChecking(false);
    });
  }, []);

  async function handleSignOut() {
    await bg({ type: "SIGN_OUT" });
    setSession(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs
        .sendMessage(tab.id, { type: "AUTH_CHANGED", session: null })
        .catch(() => {});
    }
  }

  return (
    <>
      <StyleInjector />
      {checking  ? <LoadingScreen />  :
       !session  ? <LoginForm />       :
                   <MainView session={session} onSignOut={handleSignOut} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
