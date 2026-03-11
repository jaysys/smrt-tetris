"use client";

import {
  createAnalyticsEvent,
  type AnalyticsEvent
} from "@tetris/analytics";

export type FunnelEventName =
  | "landing_view"
  | "quick_start_click"
  | "game_start"
  | "game_finish"
  | "retry_click";

declare global {
  interface Window {
    __tetrisAnalyticsEvents?: AnalyticsEvent[];
  }
}

export function trackFunnelEvent(
  name: FunnelEventName,
  attributes?: AnalyticsEvent["attributes"]
) {
  if (typeof window === "undefined") {
    return;
  }

  const event = createAnalyticsEvent(name, attributes);
  const queue = window.__tetrisAnalyticsEvents ?? [];
  queue.push(event);
  window.__tetrisAnalyticsEvents = queue;
}

export function readTrackedEventNames() {
  if (typeof window === "undefined") {
    return [];
  }

  return (window.__tetrisAnalyticsEvents ?? []).map((event) => event.name);
}
