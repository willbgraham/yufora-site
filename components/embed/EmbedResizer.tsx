"use client";

import { useEffect } from "react";

/**
 * Reports the document height to the parent page so embed.js can size the
 * iframe. Height is not sensitive, so targetOrigin "*" is fine here — the
 * parent side verifies origin AND source before trusting the message.
 */
export default function EmbedResizer() {
  useEffect(() => {
    if (window.parent === window) return; // not framed — nothing to do

    let last = 0;
    const send = () => {
      const height = document.body.scrollHeight;
      if (height !== last) {
        last = height;
        window.parent.postMessage({ type: "yufora:height", height }, "*");
      }
    };

    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    window.addEventListener("load", send);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", send);
    };
  }, []);

  return null;
}
