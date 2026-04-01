const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function createNoopAnalytics() {
  return {
    logConversationEvent() {},
    logFeedbackEvent() {},
    logErrorEvent() {}
  };
}

function createAnalytics({ enabled, privacyMode, logFile }) {
  if (!enabled) {
    return createNoopAnalytics();
  }

  const resolvedPath = path.join(process.cwd(), logFile);
  const dir = path.dirname(resolvedPath);

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_error) {
    return createNoopAnalytics();
  }

  function digest(value) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 16);
  }

  function redact(content) {
    const text = String(content || "");
    if (!privacyMode) {
      return text;
    }

    return {
      length: text.length,
      hash: digest(text)
    };
  }

  function append(payload) {
    const line = `${JSON.stringify(payload)}\n`;
    try {
      fs.appendFileSync(resolvedPath, line, "utf8");
    } catch (_error) {
      return;
    }
  }

  return {
    logConversationEvent(event) {
      append({
        type: "conversation",
        at: new Date().toISOString(),
        sessionId: event.sessionId,
        messageId: event.messageId,
        role: event.role,
        content: redact(event.content),
        metadata: event.metadata || {}
      });
    },
    logFeedbackEvent(event) {
      append({
        type: "feedback",
        at: new Date().toISOString(),
        sessionId: event.sessionId,
        messageId: event.messageId,
        feedback: event.feedback,
        metadata: event.metadata || {}
      });
    },
    logErrorEvent(event) {
      append({
        type: "error",
        at: new Date().toISOString(),
        sessionId: event.sessionId || "",
        message: event.message,
        code: event.code || "unknown"
      });
    }
  };
}

module.exports = {
  createAnalytics
};
