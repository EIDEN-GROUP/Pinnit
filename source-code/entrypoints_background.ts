import { defineBackground } from "wxt/utils/define-background";
import { getSupabase } from "../lib/supabase";

export default defineBackground(() => {
  const supabase = getSupabase();

  // Register right-click context menu (web pages only)
  chrome.contextMenus.create({
    id: "pinnit-pin",
    title: "Pin comment",
    contexts: ["all"],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "pinnit-pin" && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "CONTEXT_PIN" }).catch(() => {});
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    handleMessage(msg).then(sendResponse);
    return true;
  });

  async function handleMessage(msg: any): Promise<any> {
    switch (msg.type) {
      case "LOGIN_EMAIL": {
        const { error } = await supabase.auth.signInWithPassword({
          email: msg.email,
          password: msg.password,
        });
        const session = (await supabase.auth.getSession()).data.session;
        return { error: error?.message ?? null, session };
      }

      case "REGISTER": {
        const { error } = await supabase.auth.signUp({
          email: msg.email,
          password: msg.password,
        });
        return { error: error?.message ?? null };
      }

      case "LOGIN_OAUTH": {
        const redirectUrl = chrome.identity.getRedirectURL("oauth");
        const { data, error: urlError } = await supabase.auth.signInWithOAuth({
          provider: msg.provider,
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });
        if (urlError || !data?.url) {
          return { error: urlError?.message ?? "Failed to get OAuth URL" };
        }
        try {
          const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: data.url,
            interactive: true,
          });
          const parsed = new URL(responseUrl);
          const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            return {};
          }
          const code = parsed.searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            return { error: error?.message ?? null };
          }
          return { error: "No tokens or code in redirect URL" };
        } catch (err: any) {
          return { error: err.message ?? "OAuth flow cancelled" };
        }
      }

      case "GET_SESSION": {
        const { data } = await supabase.auth.getSession();
        return { session: data.session };
      }

      case "SIGN_OUT": {
        await supabase.auth.signOut();
        return {};
      }

      case "ENSURE_SITE": {
        try {
          const origin = new URL(msg.pageUrl).origin;
          let { data } = await supabase
            .from("sites")
            .select("id")
            .eq("url", origin)
            .maybeSingle();
          if (data) return { siteId: data.id };
          const hostname = new URL(msg.pageUrl).hostname;
          const { data: inserted } = await supabase
            .from("sites")
            .insert({ title: hostname, url: origin })
            .select("id")
            .single();
          return { siteId: inserted?.id ?? null };
        } catch {
          return { siteId: null };
        }
      }

      case "GET_SITES_WITH_COMMENTS": {
        const { data } = await supabase
          .from("sites")
          .select("id, title, url, comments:comments(count)")
          .order("created_at", { ascending: false });
        const filtered = (data ?? [])
          .map((s: any) => ({ id: s.id, title: s.title, url: s.url, comment_count: s.comments?.[0]?.count ?? 0 }))
          .filter((s: any) => s.comment_count > 0);
        return { sites: filtered };
      }

      case "ADMIN_GET_SITES": {
        const { data } = await supabase
          .from("sites")
          .select("*")
          .order("created_at", { ascending: false });
        return { sites: data ?? [] };
      }

      case "ADMIN_DELETE_SITE": {
        await supabase.from("comments").delete().eq("site_id", msg.siteId);
        const { error } = await supabase
          .from("sites")
          .delete()
          .eq("id", msg.siteId);
        return { error: error?.message ?? null };
      }

      default:
        return { error: `Unknown message type: ${msg.type}` };
    }
  }
});
