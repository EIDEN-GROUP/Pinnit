import { defineContentScript } from "wxt/utils/define-content-script";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import Overlay from "../components/Overlay";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let root: Root | null = null;
    let container: HTMLElement | null = null;

    container = document.createElement("div");
    container.id = "pinnit-host";
    container.style.cssText =
      "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;";
    document.documentElement.appendChild(container);
    const shadow = container.attachShadow({ mode: "closed" });

    const mountPoint = document.createElement("div");
    mountPoint.id = "pinnit-root";
    shadow.appendChild(mountPoint);

    root = createRoot(mountPoint);
    root.render(React.createElement(Overlay, { shadowRoot: shadow }));

    // Store last right-click position for context menu pinning
    let lastRightClick: { x: number; y: number } | null = null;
    document.addEventListener("contextmenu", (e: MouseEvent) => {
      lastRightClick = { x: e.clientX, y: e.clientY + window.scrollY };
    }, true);

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "CONTEXT_PIN" && lastRightClick && shadow) {
        shadow.dispatchEvent(
          new CustomEvent("pinnit-message", {
            detail: { type: "PLACE_PIN", x: lastRightClick.x, y: lastRightClick.y },
          })
        );
        lastRightClick = null;
        sendResponse({});
        return true;
      }
      if (shadow) {
        shadow.dispatchEvent(
          new CustomEvent("pinnit-message", { detail: msg })
        );
      }
      sendResponse({});
      return true;
    });

    window.addEventListener("beforeunload", () => {
      if (root) {
        root.unmount();
        root = null;
      }
      if (container) {
        container.remove();
        container = null;
      }
    });
  },
});
