export type NotificationPayload = { title: string; body: string };
export type NotificationResult = { ok: boolean; response: string; error: string };

export interface NotificationAdapter {
  send(config: Record<string, unknown>, payload: NotificationPayload): Promise<NotificationResult>;
}

const requiredKeys: Record<string, string[]> = {
  smtp: ["host", "to"],
  telegram: ["botToken", "chatId"],
  webhook: ["url"],
  bark: ["endpoint"],
  serverchan: ["sendKey"],
  pushplus: ["token"]
};

function validate(type: string, config: Record<string, unknown>) {
  const missing = (requiredKeys[type] ?? []).filter((key) => !config[key]);
  if (missing.length > 0) {
    return { ok: false, response: "", error: `Missing config: ${missing.join(", ")}` };
  }
  return undefined;
}

export function getNotificationAdapter(type: string): NotificationAdapter {
  return {
    async send(config, payload) {
      const invalid = validate(type, config);
      if (invalid) {
        return invalid;
      }
      return { ok: true, response: `dry-run:${type}:${payload.title}`, error: "" };
    }
  };
}