const sanitizeHtml = require("sanitize-html");
const { z } = require("zod");

const requestSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  message: z.string().trim().min(1).max(10000),
  metadata: z
    .object({
      pageUrl: z.string().trim().max(500).optional(),
      referrer: z.string().trim().max(500).optional(),
      locale: z.string().trim().max(60).optional()
    })
    .optional()
});

function sanitizeUserText(input) {
  return sanitizeHtml(String(input || ""), {
    allowedTags: [],
    allowedAttributes: {}
  }).replace(/\s+/g, " ").trim();
}

function createAbuseGuard() {
  const blockedTerms = [
    "credit card",
    "ssn",
    "social security number",
    "password dump",
    "malware",
    "exploit kit"
  ];

  return function guard(text) {
    const normalized = String(text || "").toLowerCase();
    if (blockedTerms.some((term) => normalized.includes(term))) {
      return {
        ok: false,
        reason: "Message contains disallowed content."
      };
    }

    const repeatedChars = /(.)\1{25,}/.test(normalized);
    if (repeatedChars) {
      return {
        ok: false,
        reason: "Message appears abusive or invalid."
      };
    }

    return { ok: true };
  };
}

function validateChatPayload(payload, maxInputChars) {
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message)
    };
  }

  const cleanMessage = sanitizeUserText(parsed.data.message);
  if (!cleanMessage) {
    return {
      ok: false,
      errors: ["Message cannot be empty."]
    };
  }

  if (cleanMessage.length > maxInputChars) {
    return {
      ok: false,
      errors: [`Message is too long. Maximum allowed length is ${maxInputChars} characters.`]
    };
  }

  return {
    ok: true,
    value: {
      sessionId: parsed.data.sessionId,
      message: cleanMessage,
      metadata: parsed.data.metadata || {}
    }
  };
}

module.exports = {
  validateChatPayload,
  createAbuseGuard
};
