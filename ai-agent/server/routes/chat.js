const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { validateChatPayload, createAbuseGuard } = require("../middleware/validateChat");
const { initSse, sendSseEvent, closeSse, chunkText } = require("../utils/sse");
const { buildSystemPrompt } = require("../services/knowledgeBase");

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getUserFacingErrorMessage(error) {
  const status = Number(error && (error.status || (error.response && error.response.status)));
  const raw = String((error && error.message) || "");
  const lower = raw.toLowerCase();
  const code = String(error && error.code ? error.code : "").toUpperCase();

  if (code === "MODEL_TIMEOUT" || lower.includes("timeout") || lower.includes("timed out")) {
    return "The AI model is taking too long right now. Please try again in a few seconds.";
  }

  if (status === 429 || lower.includes("rate limit")) {
    return "Too many requests right now. Please wait a few seconds and try again.";
  }

  if (status === 404 && lower.includes("endpoint")) {
    return "AI provider endpoint is temporarily unavailable. Please retry in a few seconds.";
  }

  if (status === 503) {
    return "AI service is temporarily unavailable. Please try again shortly.";
  }

  return "Something went wrong while generating a response. Please try again.";
}

function createChatRouter({ config, store, agent, analytics }) {
  const router = express.Router();
  const abuseGuard = createAbuseGuard();

  router.post("/", async (req, res) => {
    if (!config.openaiApiKey) {
      res.status(503).json({
        error: "Server is not configured for AI responses. Set OPENAI_API_KEY."
      });
      return;
    }

    const payload = validateChatPayload(req.body, config.chatMaxInputChars);
    if (!payload.ok) {
      res.status(400).json({
        error: "Invalid request payload",
        details: payload.errors
      });
      return;
    }

    const abuseCheck = abuseGuard(payload.value.message);
    if (!abuseCheck.ok) {
      res.status(400).json({
        error: abuseCheck.reason
      });
      return;
    }

    const sessionId = payload.value.sessionId || `s_${uuidv4().replace(/-/g, "")}`;
    const requestId = `r_${uuidv4().replace(/-/g, "")}`;

    const userMessage = {
      id: `m_${uuidv4().replace(/-/g, "")}`,
      role: "user",
      content: payload.value.message,
      createdAt: new Date().toISOString(),
      metadata: payload.value.metadata
    };

    const historyBefore = await store.getMessages(sessionId);
    await store.appendMessage(sessionId, userMessage);

    analytics.logConversationEvent({
      sessionId,
      messageId: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      metadata: payload.value.metadata
    });

    initSse(res);
    sendSseEvent(res, "meta", {
      sessionId,
      requestId
    });

    const controller = new AbortController();

    let closed = false;
    req.on("close", () => {
      closed = true;
      controller.abort();
    });

    const chatTimeoutMs = Number.isFinite(config.chatRequestTimeoutMs) && config.chatRequestTimeoutMs > 0
      ? config.chatRequestTimeoutMs
      : 30000;

    const timeoutHandle = setTimeout(() => {
      const timeoutError = new Error(`Chat request timed out after ${chatTimeoutMs}ms`);
      timeoutError.code = "MODEL_TIMEOUT";
      controller.abort(timeoutError);
    }, chatTimeoutMs);

    try {
      sendSseEvent(res, "typing", { value: true });

      const systemPrompt = buildSystemPrompt({
        overridePrompt: config.systemPromptOverride
      });

      const result = await agent.generateAgentReply({
        systemPrompt,
        history: historyBefore,
        userMessage: payload.value.message,
        model: config.openaiModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        enableToolCalls: config.enableToolCalls,
        maxToolRounds: config.maxToolRounds,
        signal: controller.signal
      });

      const assistantText = result.text || "I can help with that. Could you share a little more detail?";
      const assistantMessage = {
        id: `m_${uuidv4().replace(/-/g, "")}`,
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        metadata: {
          model: result.model,
          toolsUsed: result.toolsUsed
        }
      };

      for (const token of chunkText(assistantText, 26)) {
        if (closed) {
          controller.abort();
          return;
        }

        sendSseEvent(res, "token", { token });
        await delay(10);
      }

      sendSseEvent(res, "typing", { value: false });
      sendSseEvent(res, "done", {
        messageId: assistantMessage.id,
        model: result.model,
        usage: result.usage,
        toolsUsed: result.toolsUsed
      });

      await store.appendMessage(sessionId, assistantMessage);

      analytics.logConversationEvent({
        sessionId,
        messageId: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        metadata: assistantMessage.metadata
      });

      closeSse(res);
    } catch (error) {
      if (closed) {
        return;
      }

      analytics.logErrorEvent({
        sessionId,
        message: "Chat request failed",
        code: error && error.code ? error.code : "chat_error"
      });

      sendSseEvent(res, "typing", { value: false });
      sendSseEvent(res, "error", {
        message: getUserFacingErrorMessage(error)
      });
      closeSse(res);
    } finally {
      clearTimeout(timeoutHandle);
    }
  });

  return router;
}

module.exports = {
  createChatRouter
};
