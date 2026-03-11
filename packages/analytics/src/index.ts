export interface AnalyticsEvent {
  readonly name: string;
  readonly occurredAt: string;
  readonly attributes?: Record<string, string | number | boolean | null>;
}

export function createAnalyticsEvent(
  name: string,
  attributes?: AnalyticsEvent["attributes"]
): AnalyticsEvent {
  return {
    name,
    occurredAt: new Date().toISOString(),
    attributes
  };
}
