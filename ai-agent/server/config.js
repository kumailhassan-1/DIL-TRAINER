const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(process.cwd(), ".env") });

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value, fallback) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function toList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 8787),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "",
  openrouterSiteUrl: process.env.OPENROUTER_SITE_URL || "",
  openrouterAppName: process.env.OPENROUTER_APP_NAME || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openaiFallbackModels: toList(process.env.OPENAI_FALLBACK_MODELS, []),
  openaiRequestTimeoutMs: toInt(process.env.OPENAI_REQUEST_TIMEOUT_MS, 22000),
  chatRequestTimeoutMs: toInt(process.env.CHAT_REQUEST_TIMEOUT_MS, 30000),
  temperature: toFloat(process.env.OPENAI_TEMPERATURE, 0.4),
  maxTokens: toInt(process.env.MAX_TOKENS, 700),
  corsOrigins: toList(process.env.CORS_ORIGINS, ["http://localhost:3000", "http://localhost:5173", "http://localhost:8787"]),
  chatMaxInputChars: toInt(process.env.CHAT_MAX_INPUT_CHARS, 2000),
  sessionTtlSeconds: toInt(process.env.SESSION_TTL_SECONDS, 86400),
  maxHistoryMessages: toInt(process.env.MAX_HISTORY_MESSAGES, 30),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 25),
  maxToolRounds: toInt(process.env.MAX_TOOL_ROUNDS, 3),
  enableToolCalls: toBool(process.env.ENABLE_TOOL_CALLS, true),
  enableAnalytics: toBool(process.env.ENABLE_ANALYTICS, true),
  analyticsPrivacyMode: toBool(process.env.ANALYTICS_PRIVACY_MODE, true),
  analyticsLogFile: process.env.ANALYTICS_LOG_FILE || "logs/conversations.ndjson",
  redisUrl: process.env.REDIS_URL || "",
  systemPromptOverride: process.env.SYSTEM_PROMPT_OVERRIDE || ""
};

module.exports = {
  config
};
