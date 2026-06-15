import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const SCROLL_SCRIPT = `
<script>
(function(){
  var ticking = false;
  function send(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(function(){
      try{
        window.parent.postMessage({type:'pinnit-scroll',scrollY:window.scrollY||window.pageYOffset||0},'*');
      }catch(e){}
      ticking=false;
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',send);
  }else{
    send();
  }
  window.addEventListener('scroll',send,{passive:true});
  window.addEventListener('load',send);
})();
</script>`;

const TAGS_TO_REWRITE: Record<string, string[]> = {
  script: ["src"],
  img: ["src", "srcset"],
  link: ["href"],
  source: ["src", "srcset"],
  video: ["src"],
  audio: ["src"],
  iframe: ["src"],
  embed: ["src"],
  object: ["data"],
  image: ["src", "srcset"],  // SVG image tag
};

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function resolveUrl(base: string, relative: string): string {
  if (isAbsoluteUrl(relative)) {
    // Handle protocol-relative URLs
    if (relative.startsWith("//")) {
      const protocol = base.startsWith("https") ? "https:" : "http:";
      return protocol + relative;
    }
    return relative;
  }
  // Handle absolute paths
  if (relative.startsWith("/")) {
    const origin = base.match(/^https?:\/\/[^/]+/)?.[0] || "";
    return origin + relative;
  }
  // Handle relative paths
  const baseWithoutQuery = base.split("?")[0];
  const basePath = baseWithoutQuery.substring(0, baseWithoutQuery.lastIndexOf("/") + 1);
  return basePath + relative;
}

function proxyUrl(targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `/api/proxy?url=${encoded}`;
}

function rewriteHtml(html: string, pageUrl: string): string {
  const $ = cheerio.load(html);

  // Remove existing <base> tags
  $("base").remove();

  // Inject <base> as fallback for any URLs we didn't rewrite
  const baseOrigin = pageUrl.match(/^https?:\/\/[^/]+/)?.[0] || pageUrl;
  $("head").prepend(`<base href="${baseOrigin}/">`);

  // Inject scroll-tracking script before </body>
  $("body").append(SCROLL_SCRIPT);

  // Rewrite URLs in specific tags
  for (const [tag, attrs] of Object.entries(TAGS_TO_REWRITE)) {
    $(tag).each((_, el) => {
      for (const attr of attrs) {
        const val = $(el).attr(attr);
        if (!val || val.trim() === "") continue;
        const trimmed = val.trim();
        // Skip data URIs, javascript:, mailto:, etc.
        if (/^(data:|javascript:|mailto:|tel:|#)/i.test(trimmed)) continue;
        // Skip already-proxied URLs
        if (trimmed.startsWith("/api/proxy?")) continue;
        const absolute = resolveUrl(pageUrl, trimmed);
        $(el).attr(attr, proxyUrl(absolute));
      }
    });
  }

  // Rewrite CSS url() references in style attributes
  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (!style) return;
    const rewritten = style.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
      const trimmed = url.trim();
      if (/^(data:|#)/i.test(trimmed) || trimmed.startsWith("/api/proxy?")) return match;
      const absolute = resolveUrl(pageUrl, trimmed);
      return `url(${proxyUrl(absolute)})`;
    });
    $(el).attr("style", rewritten);
  });

  // Rewrite CSS url() references in <style> tags
  $("style").each((_, el) => {
    const content = $(el).html();
    if (!content) return;
    const rewritten = content.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
      const trimmed = url.trim();
      if (/^(data:|#)/i.test(trimmed) || trimmed.startsWith("/api/proxy?")) return match;
      const absolute = resolveUrl(pageUrl, trimmed);
      return `url(${proxyUrl(absolute)})`;
    });
    $(el).html(rewritten);
  });

  return $.html();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isHtml = ct.includes("text/html");

    const text = await res.text();
    if (text.length > MAX_SIZE) {
      return NextResponse.json({ error: "Page too large" }, { status: 413 });
    }

    if (isHtml) {
      const modified = rewriteHtml(text, url);
      return new NextResponse(modified, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Non-HTML resource: forward as-is with CORS headers
    return new NextResponse(text, {
      headers: {
        "Content-Type": ct,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Proxy error: ${err.message}` },
      { status: 502 }
    );
  }
}
