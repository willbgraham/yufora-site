"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Analytics records page URLs, including query strings. Personal
 * giveaway links carry a signed token (?t=…) — strip it before anything is
 * sent, so entry and claim links never land in analytics.
 */
function redact(event: BeforeSendEvent): BeforeSendEvent {
  try {
    const url = new URL(event.url);
    if (url.searchParams.has("t")) {
      url.searchParams.delete("t");
      return { ...event, url: url.toString() };
    }
  } catch {
    // Unparseable URL: send as-is.
  }
  return event;
}

export default function AnalyticsWithRedaction() {
  return <Analytics beforeSend={redact} />;
}
