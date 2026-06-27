export type NotificationPayload = { title: string; body: string };
export type NotificationResult = { ok: boolean; response: string; error: string };

export interface NotificationAdapter {
  send(config: Record<string, unknown>, payload: NotificationPayload): Promise<NotificationResult>;
}

const requiredKeys: Record<string, string[]> = {
  smtp: ["host", "to"],
  email: ["resendApiKey", "from", "to"],
  telegram: ["botToken", "chatId"],
  webhook: ["url"],
  wechatbot: ["webhook"],
  bark: ["endpoint"],
  gotify: ["serverUrl", "appToken"],
  serverchan: ["sendKey"],
  pushplus: ["token"],
  notifyx: ["apiKey"]
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
      if (config.dryRun !== false) {
        return { ok: true, response: `dry-run:${type}:${payload.title}`, error: "" };
      }
      return sendReal(type, config, payload);
    }
  };
}

async function sendReal(type: string, config: Record<string, unknown>, payload: NotificationPayload): Promise<NotificationResult> {
  try {
    const response = await fetchRequest(type, config, payload);
    const text = await response.text();
    return response.ok ? { ok: true, response: text || `HTTP ${response.status}`, error: "" } : { ok: false, response: text, error: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, response: "", error: error instanceof Error ? error.message : String(error) };
  }
}

function fetchRequest(type: string, config: Record<string, unknown>, payload: NotificationPayload) {
  if (type === "telegram") {
    return fetch(`https://api.telegram.org/bot${stringConfig(config, "botToken")}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: stringConfig(config, "chatId"), text: `${payload.title}\n\n${payload.body}` })
    });
  }
  if (type === "wechatbot") {
    return fetch(stringConfig(config, "webhook"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content: `**${payload.title}**\n\n${payload.body}` } })
    });
  }
  if (type === "email") {
    return fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${stringConfig(config, "resendApiKey")}`, "content-type": "application/json" },
      body: JSON.stringify({ from: stringConfig(config, "from"), to: [stringConfig(config, "to")], subject: payload.title, text: payload.body })
    });
  }
  if (type === "bark") {
    return fetch(stringConfig(config, "endpoint"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: payload.title, body: payload.body })
    });
  }
  if (type === "gotify") {
    return fetch(`${stringConfig(config, "serverUrl").replace(/\/$/, "")}/message?token=${encodeURIComponent(stringConfig(config, "appToken"))}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: payload.title, message: payload.body, priority: numberConfig(config, "priority", 5) })
    });
  }
  if (type === "serverchan") {
    return fetch(`https://sctapi.ftqq.com/${stringConfig(config, "sendKey")}.send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: payload.title, desp: payload.body })
    });
  }
  if (type === "pushplus") {
    return fetch("https://www.pushplus.plus/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: stringConfig(config, "token"), title: payload.title, content: payload.body, template: "markdown" })
    });
  }
  if (type === "notifyx") {
    return fetch(`https://www.notifyx.cn/api/v1/send/${stringConfig(config, "apiKey")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: payload.title, content: payload.body, description: payload.title })
    });
  }
  if (type === "webhook" || type === "smtp") {
    return fetch(stringConfig(config, type === "webhook" ? "url" : "host"), {
      method: stringConfig(config, "method", "POST"),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: payload.title, body: payload.body, to: config.to })
    });
  }
  throw new Error(`Unsupported notification type: ${type}`);
}

function stringConfig(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

function numberConfig(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" ? value : fallback;
}
