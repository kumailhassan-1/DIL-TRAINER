const OpenAI = require("openai");
const { getToolDefinitions, executeToolCall } = require("./toolRegistry");

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((message) => message && typeof message === "object")
    .filter((message) => ["user", "assistant", "tool"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "")
    }));
}

function safeAssistantText(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return "";
        }
        return String(entry.text || "");
      })
      .join("\n")
      .trim();
  }

  return "";
}

function buildModelSequence(primaryModel, fallbackModels) {
  const ordered = [primaryModel, ...(Array.isArray(fallbackModels) ? fallbackModels : [])]
    .map((model) => String(model || "").trim())
    .filter(Boolean);

  return Array.from(new Set(ordered));
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function createRequestSignalWithTimeout(parentSignal, timeoutMs) {
  const safeTimeoutMs = toPositiveInt(timeoutMs, 0);
  if (!safeTimeoutMs) {
    return {
      signal: parentSignal,
      cleanup() {
        return;
      }
    };
  }

  const controller = new AbortController();
  let timeoutHandle = null;

  const onParentAbort = () => {
    controller.abort(parentSignal.reason || new Error("Request aborted"));
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason || new Error("Request aborted"));
    } else {
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }
  }

  timeoutHandle = setTimeout(() => {
    const timeoutError = new Error(`Model request timed out after ${safeTimeoutMs}ms`);
    timeoutError.code = "MODEL_TIMEOUT";
    controller.abort(timeoutError);
  }, safeTimeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (parentSignal) {
        parentSignal.removeEventListener("abort", onParentAbort);
      }
    }
  };
}

function normalizeRequestError(error, requestSignal) {
  const timeoutReason = requestSignal && requestSignal.reason && requestSignal.reason.code === "MODEL_TIMEOUT"
    ? requestSignal.reason
    : null;

  if (timeoutReason) {
    return timeoutReason;
  }

  return error;
}

function isRetryableModelError(error) {
  const status = Number(error && (error.status || (error.response && error.response.status)));
  const message = String((error && error.message) || "").toLowerCase();
  const code = String(error && error.code ? error.code : "").toUpperCase();

  if (status === 404 || status === 408 || status === 429 || status === 503) {
    return true;
  }

  if (code === "MODEL_TIMEOUT") {
    return true;
  }

  return (
    message.includes("no endpoints available") ||
    message.includes("model") && message.includes("not found") ||
    message.includes("rate limit") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

function createOpenAiAgent(config) {
  let client = null;
  const requestTimeoutMs = toPositiveInt(config.openaiRequestTimeoutMs, 22000);

  if (config.openaiApiKey) {
    const usingOpenRouter = String(config.openaiBaseUrl || "").toLowerCase().includes("openrouter.ai");
    const defaultHeaders = usingOpenRouter
      ? {
          ...(config.openrouterSiteUrl ? { "HTTP-Referer": config.openrouterSiteUrl } : {}),
          ...(config.openrouterAppName ? { "X-Title": config.openrouterAppName } : {})
        }
      : undefined;

    client = new OpenAI({
      apiKey: config.openaiApiKey,
      ...(config.openaiBaseUrl ? { baseURL: config.openaiBaseUrl } : {}),
      ...(defaultHeaders ? { defaultHeaders } : {})
    });
  }

  async function runCompletion({ model, messages, temperature, maxTokens, signal }) {
    if (!client) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    const requestScope = createRequestSignalWithTimeout(signal, requestTimeoutMs);
    let completion;
    try {
      completion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      }, {
        signal: requestScope.signal
      });
    } catch (error) {
      throw normalizeRequestError(error, requestScope.signal);
    } finally {
      requestScope.cleanup();
    }

    const choice = completion.choices && completion.choices[0] ? completion.choices[0] : null;
    const text = choice ? safeAssistantText(choice.message.content) : "";

    return {
      text,
      model: completion.model || model,
      usage: completion.usage || null,
      toolsUsed: []
    };
  }

  async function runWithTools({ model, messages, temperature, maxTokens, signal, maxRounds }) {
    if (!client) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    const tools = getToolDefinitions();
    const working = messages.slice();
    const toolsUsed = [];

    for (let round = 0; round < maxRounds; round += 1) {
      let completion;
      const requestScope = createRequestSignalWithTimeout(signal, requestTimeoutMs);
      try {
        completion = await client.chat.completions.create({
          model,
          messages: working,
          tools,
          tool_choice: "auto",
          temperature,
          max_tokens: maxTokens,
          stream: false
        }, {
          signal: requestScope.signal
        });
      } catch (error) {
        const normalizedError = normalizeRequestError(error, requestScope.signal);
        if (isRetryableModelError(normalizedError)) {
          throw normalizedError;
        }

        return runCompletion({
          model,
          messages: working,
          temperature,
          maxTokens,
          signal
        });
      } finally {
        requestScope.cleanup();
      }

      const choice = completion.choices && completion.choices[0] ? completion.choices[0] : null;
      const assistant = choice ? choice.message : null;

      if (!assistant) {
        break;
      }

      if (Array.isArray(assistant.tool_calls) && assistant.tool_calls.length > 0) {
        working.push({
          role: "assistant",
          content: assistant.content || "",
          tool_calls: assistant.tool_calls
        });

        for (const toolCall of assistant.tool_calls) {
          const result = await executeToolCall(toolCall);
          toolsUsed.push({
            tool: toolCall.function.name,
            result
          });

          working.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }

        continue;
      }

      return {
        text: safeAssistantText(assistant.content),
        model: completion.model || model,
        usage: completion.usage || null,
        toolsUsed
      };
    }

    const fallback = await runCompletion({
      model,
      messages: working,
      temperature,
      maxTokens,
      signal
    });

    return {
      ...fallback,
      toolsUsed
    };
  }

  async function generateAgentReply({
    systemPrompt,
    history,
    userMessage,
    model,
    temperature,
    maxTokens,
    enableToolCalls,
    maxToolRounds,
    signal
  }) {
    const normalizedHistory = normalizeHistory(history);

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...normalizedHistory,
      {
        role: "user",
        content: userMessage
      }
    ];

    const modelSequence = buildModelSequence(model, config.openaiFallbackModels);
    let lastError = null;

    for (let idx = 0; idx < modelSequence.length; idx += 1) {
      const candidateModel = modelSequence[idx];

      try {
        if (!enableToolCalls) {
          return await runCompletion({
            model: candidateModel,
            messages,
            temperature,
            maxTokens,
            signal
          });
        }

        return await runWithTools({
          model: candidateModel,
          messages,
          temperature,
          maxTokens,
          signal,
          maxRounds: maxToolRounds
        });
      } catch (error) {
        lastError = error;
        const canRetry = idx < modelSequence.length - 1 && isRetryableModelError(error);
        if (canRetry) {
          continue;
        }
        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("No usable model available.");
  }

  return {
    generateAgentReply
  };
}

module.exports = {
  createOpenAiAgent
};
