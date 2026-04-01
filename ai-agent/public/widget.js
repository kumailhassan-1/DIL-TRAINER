(function bootstrapAiAgentWidget() {
  const DEFAULTS = {
    apiBaseUrl: "",
    storageKey: "ai-agent-widget",
    agent: {
      name: "Website Assistant",
      avatarUrl: "",
      welcomeMessage: "Hi. I am here to help. Ask me anything about this website.",
      subtitle: "Typically replies in a few seconds"
    },
    labels: {
      inputPlaceholder: "Type your message...",
      sendButton: "Send",
      clearButton: "Clear",
      closeButton: "Close"
    },
    theme: {
      mode: "auto",
      primaryColor: "#1f9dff"
    }
  };

  function mergeDeep(base, override) {
    const output = { ...base };
    Object.keys(override || {}).forEach((key) => {
      const baseValue = output[key];
      const overrideValue = override[key];
      if (baseValue && typeof baseValue === "object" && !Array.isArray(baseValue) && overrideValue && typeof overrideValue === "object" && !Array.isArray(overrideValue)) {
        output[key] = mergeDeep(baseValue, overrideValue);
      } else {
        output[key] = overrideValue;
      }
    });
    return output;
  }

  function getScriptContext() {
    let scriptSrc = "";
    const current = document.currentScript;
    if (current && current.src) {
      scriptSrc = current.src;
    } else {
      const fallback = Array.from(document.scripts).find((script) => script.src && script.src.includes("widget.js"));
      if (fallback && fallback.src) {
        scriptSrc = fallback.src;
      }
    }

    if (!scriptSrc) {
      return {
        src: "",
        directory: "",
        origin: window.location.origin || ""
      };
    }

    const parsed = new URL(scriptSrc, window.location.href);
    const origin = parsed.origin === "null" ? "" : parsed.origin;
    const href = parsed.href;
    const lastSlashIndex = href.lastIndexOf("/");
    const directory = lastSlashIndex >= 0 ? href.slice(0, lastSlashIndex + 1) : "";

    return {
      src: href,
      directory,
      origin
    };
  }

  const scriptContext = getScriptContext();

  const config = mergeDeep(DEFAULTS, window.AIAgentWidgetConfig || {});
  if (!config.apiBaseUrl) {
    config.apiBaseUrl = scriptContext.origin || "http://localhost:8787";
  }

  const mountNode = document.getElementById("ai-agent-widget") || document.body.appendChild(document.createElement("div"));
  mountNode.id = mountNode.id || "ai-agent-widget";

  if (!document.querySelector("link[data-ai-agent-widget-css='true']")) {
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = scriptContext.directory
      ? `${scriptContext.directory}widget.css`
      : `${config.apiBaseUrl.replace(/\/$/, "")}/widget.css`;
    cssLink.dataset.aiAgentWidgetCss = "true";
    document.head.appendChild(cssLink);
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
  }

  function safeLocalGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function safeLocalSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      return;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function markdownToHtml(source) {
    const input = String(source || "");

    const codeBlocks = [];
    const withCodePlaceholders = input.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || "", code: escapeHtml(code) });
      return `@@CODEBLOCK_${idx}@@`;
    });

    let html = escapeHtml(withCodePlaceholders);

    html = html
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    html = html.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
    html = `<p>${html}</p>`;

    html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (_m, idxRaw) => {
      const idx = Number(idxRaw);
      const block = codeBlocks[idx];
      if (!block) {
        return "";
      }
      const langClass = block.lang ? ` class=\"language-${escapeHtml(block.lang)}\"` : "";
      return `<pre><code${langClass}>${block.code}</code></pre>`;
    });

    return html;
  }

  const state = {
    isOpen: false,
    isSending: false,
    isTyping: false,
    error: "",
    messages: [],
    sessionId: "",
    themeMode: "auto"
  };

  const storagePrefix = config.storageKey;
  const themeStorageKey = `${storagePrefix}:theme`;
  const sessionStorageKey = `${storagePrefix}:session`;

  state.sessionId = safeLocalGet(sessionStorageKey, "") || uid("session");
  safeLocalSet(sessionStorageKey, state.sessionId);

  const messageStorageKey = `${storagePrefix}:messages:${state.sessionId}`;

  const savedMessages = safeLocalGet(messageStorageKey, []);
  if (Array.isArray(savedMessages) && savedMessages.length > 0) {
    state.messages = savedMessages;
  } else {
    state.messages = [
      {
        id: uid("assistant"),
        role: "assistant",
        text: config.agent.welcomeMessage,
        createdAt: new Date().toISOString(),
        feedback: ""
      }
    ];
  }

  state.themeMode = safeLocalGet(themeStorageKey, config.theme.mode || "auto") || "auto";

  mountNode.innerHTML = `
    <div class="aiw-root" aria-live="polite">
      <button class="aiw-launcher" type="button" aria-label="Open AI assistant">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <section class="aiw-panel" aria-label="AI assistant panel">
        <header class="aiw-header">
          <div class="aiw-header-main">
            <div class="aiw-avatar"></div>
            <div class="aiw-title-wrap">
              <p class="aiw-title"></p>
              <p class="aiw-subtitle"></p>
            </div>
          </div>

          <div class="aiw-header-actions">
            <button class="aiw-icon-btn aiw-theme-btn" type="button" aria-label="Toggle theme">Theme</button>
            <button class="aiw-icon-btn aiw-clear-btn" type="button" aria-label="Clear chat"></button>
            <button class="aiw-icon-btn aiw-close-btn" type="button" aria-label="Close chat"></button>
          </div>
        </header>

        <div class="aiw-messages" role="log" aria-live="polite"></div>

        <div class="aiw-typing" aria-hidden="true">
          <span>Assistant is typing</span>
          <span class="aiw-dot"></span>
          <span class="aiw-dot"></span>
          <span class="aiw-dot"></span>
        </div>

        <div class="aiw-input-wrap">
          <form class="aiw-form">
            <textarea class="aiw-input" rows="1"></textarea>
            <button class="aiw-send" type="submit"></button>
          </form>
          <p class="aiw-error" hidden></p>
        </div>
      </section>
    </div>
  `;

  const root = mountNode.querySelector(".aiw-root");
  const launcher = mountNode.querySelector(".aiw-launcher");
  const panel = mountNode.querySelector(".aiw-panel");
  const closeBtn = mountNode.querySelector(".aiw-close-btn");
  const clearBtn = mountNode.querySelector(".aiw-clear-btn");
  const themeBtn = mountNode.querySelector(".aiw-theme-btn");
  const titleEl = mountNode.querySelector(".aiw-title");
  const subtitleEl = mountNode.querySelector(".aiw-subtitle");
  const avatarEl = mountNode.querySelector(".aiw-avatar");
  const messagesEl = mountNode.querySelector(".aiw-messages");
  const typingEl = mountNode.querySelector(".aiw-typing");
  const formEl = mountNode.querySelector(".aiw-form");
  const inputEl = mountNode.querySelector(".aiw-input");
  const sendBtn = mountNode.querySelector(".aiw-send");
  const errorEl = mountNode.querySelector(".aiw-error");

  root.style.setProperty("--aiw-primary", config.theme.primaryColor || DEFAULTS.theme.primaryColor);

  titleEl.textContent = config.agent.name;
  subtitleEl.textContent = config.agent.subtitle;
  clearBtn.textContent = config.labels.clearButton;
  closeBtn.textContent = config.labels.closeButton;
  sendBtn.textContent = config.labels.sendButton;
  inputEl.placeholder = config.labels.inputPlaceholder;

  if (config.agent.avatarUrl) {
    avatarEl.innerHTML = `<img src="${escapeHtml(config.agent.avatarUrl)}" alt="${escapeHtml(config.agent.name)} avatar" />`;
  } else {
    avatarEl.textContent = String(config.agent.name || "A").trim().charAt(0).toUpperCase() || "A";
  }

  function saveMessages() {
    safeLocalSet(messageStorageKey, state.messages);
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showError(message) {
    state.error = message || "";
    if (!state.error) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = state.error;
  }

  function getAppliedTheme(mode) {
    if (mode === "light" || mode === "dark") {
      return mode;
    }
    const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    return media && media.matches ? "dark" : "light";
  }

  function applyTheme() {
    const applied = getAppliedTheme(state.themeMode);
    root.classList.remove("aiw-light", "aiw-dark");
    root.classList.add(applied === "dark" ? "aiw-dark" : "aiw-light");
    themeBtn.textContent = state.themeMode === "auto" ? "Auto" : state.themeMode;
  }

  function cycleThemeMode() {
    const next = state.themeMode === "auto" ? "light" : state.themeMode === "light" ? "dark" : "auto";
    state.themeMode = next;
    safeLocalSet(themeStorageKey, next);
    applyTheme();
  }

  function updateTyping() {
    typingEl.classList.toggle("aiw-visible", state.isTyping);
  }

  function renderMessages() {
    messagesEl.innerHTML = "";

    state.messages.forEach((message) => {
      const item = document.createElement("article");
      item.className = `aiw-message ${message.role === "user" ? "aiw-user" : "aiw-assistant"}`;
      item.dataset.messageId = message.id;

      if (message.role === "assistant") {
        item.innerHTML = markdownToHtml(message.text || "");

        const actions = document.createElement("div");
        actions.className = "aiw-message-actions";

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "aiw-action-btn";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(message.text || "");
            copyBtn.textContent = "Copied";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 1200);
          } catch (_error) {
            copyBtn.textContent = "Failed";
            setTimeout(() => {
              copyBtn.textContent = "Copy";
            }, 1200);
          }
        });

        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = `aiw-action-btn ${message.feedback === "up" ? "aiw-active" : ""}`;
        upBtn.textContent = "👍";
        upBtn.addEventListener("click", () => {
          submitFeedback(message.id, "up");
        });

        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = `aiw-action-btn ${message.feedback === "down" ? "aiw-active" : ""}`;
        downBtn.textContent = "👎";
        downBtn.addEventListener("click", () => {
          submitFeedback(message.id, "down");
        });

        actions.appendChild(copyBtn);
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        item.appendChild(actions);
      } else {
        item.textContent = message.text;
      }

      messagesEl.appendChild(item);
    });

    scrollToBottom();
  }

  function setOpen(isOpen) {
    state.isOpen = isOpen;
    root.classList.toggle("aiw-open", isOpen);
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    if (isOpen) {
      inputEl.focus();
      scrollToBottom();
    }
  }

  async function submitFeedback(messageId, feedback) {
    state.messages = state.messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant") {
        return message;
      }
      return {
        ...message,
        feedback
      };
    });

    saveMessages();
    renderMessages();

    try {
      await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          messageId,
          feedback,
          metadata: {
            pageUrl: window.location.href
          }
        })
      });
    } catch (_error) {
      return;
    }
  }

  async function streamReply(userText) {
    const assistantId = uid("assistant");
    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      createdAt: new Date().toISOString(),
      feedback: ""
    };

    state.messages.push(assistantMessage);
    state.isTyping = true;
    updateTyping();
    renderMessages();
    saveMessages();

    const streamController = new AbortController();
    const streamIdleTimeoutMs = 25000;
    let streamIdleTimer = null;

    function clearStreamIdleTimer() {
      if (streamIdleTimer) {
        clearTimeout(streamIdleTimer);
      }
      streamIdleTimer = null;
    }

    function resetStreamIdleTimer() {
      clearStreamIdleTimer();
      streamIdleTimer = setTimeout(() => {
        streamController.abort();
      }, streamIdleTimeoutMs);
    }

    resetStreamIdleTimer();

    let reader = null;
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    function consumeSseBlock(block) {
      const lines = block.split("\n");
      let eventName = "message";
      let payload = "";

      lines.forEach((line) => {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
          return;
        }

        if (line.startsWith("data:")) {
          payload += line.slice(5).trim();
        }
      });

      if (!payload) {
        return;
      }

      let parsed = null;
      try {
        parsed = JSON.parse(payload);
      } catch (_error) {
        parsed = null;
      }

      if (!parsed) {
        return;
      }

      if (eventName === "token") {
        const current = state.messages.find((message) => message.id === assistantId);
        if (!current) {
          return;
        }
        current.text += parsed.token || "";
        renderMessages();
        saveMessages();
      }

      if (eventName === "typing") {
        state.isTyping = Boolean(parsed.value);
        updateTyping();
      }

      if (eventName === "done" && parsed.messageId) {
        const current = state.messages.find((message) => message.id === assistantId);
        if (current) {
          current.id = parsed.messageId;
        }
      }

      if (eventName === "error") {
        throw new Error(parsed.message || "Agent failed to respond");
      }
    }

    try {
      const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: streamController.signal,
        body: JSON.stringify({
          sessionId: state.sessionId,
          message: userText,
          metadata: {
            pageUrl: window.location.href,
            referrer: document.referrer || "",
            locale: navigator.language || ""
          }
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        resetStreamIdleTimer();

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventChunk of events) {
          consumeSseBlock(eventChunk);
          resetStreamIdleTimer();
        }
      }

      state.isTyping = false;
      updateTyping();
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("The assistant took too long to respond. Please send your message again.");
      }
      throw error;
    } finally {
      clearStreamIdleTimer();
      if (reader && streamController.signal.aborted) {
        try {
          await reader.cancel();
        } catch (_error) {
          // Ignore cancel errors from already-closed streams.
        }
      }
    }
  }

  async function onSubmit(event) {
    event.preventDefault();

    if (state.isSending) {
      return;
    }

    const userText = inputEl.value.trim();
    if (!userText) {
      return;
    }

    showError("");
    state.isSending = true;
    sendBtn.disabled = true;

    const userMessage = {
      id: uid("user"),
      role: "user",
      text: userText,
      createdAt: new Date().toISOString()
    };

    state.messages.push(userMessage);
    inputEl.value = "";
    renderMessages();
    saveMessages();

    try {
      await streamReply(userText);
    } catch (_error) {
      const last = state.messages[state.messages.length - 1];
      if (last && last.role === "assistant" && !String(last.text || "").trim()) {
        state.messages.pop();
      }
      state.isTyping = false;
      updateTyping();
      const errorText =
        _error && typeof _error.message === "string" && _error.message.trim()
          ? _error.message.trim()
          : "The assistant is temporarily unavailable. Please try again.";
      showError(errorText);
    } finally {
      state.isSending = false;
      sendBtn.disabled = false;
      saveMessages();
      renderMessages();
    }
  }

  launcher.addEventListener("click", () => {
    setOpen(true);
  });

  root.addEventListener("pointerenter", () => {
    document.body.classList.add("aiw-widget-hovering");
  });

  root.addEventListener("pointerleave", () => {
    document.body.classList.remove("aiw-widget-hovering");
  });

  closeBtn.addEventListener("click", () => {
    setOpen(false);
  });

  clearBtn.addEventListener("click", () => {
    state.messages = [
      {
        id: uid("assistant"),
        role: "assistant",
        text: config.agent.welcomeMessage,
        createdAt: new Date().toISOString(),
        feedback: ""
      }
    ];
    saveMessages();
    renderMessages();
  });

  themeBtn.addEventListener("click", () => {
    cycleThemeMode();
  });

  formEl.addEventListener("submit", onSubmit);

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formEl.requestSubmit();
    }
  });

  if (window.matchMedia) {
    const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof darkMedia.addEventListener === "function") {
      darkMedia.addEventListener("change", () => {
        if (state.themeMode === "auto") {
          applyTheme();
        }
      });
    }
  }

  applyTheme();
  updateTyping();
  renderMessages();
  setOpen(false);
})();
