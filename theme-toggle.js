(function initThemeToggle() {
  const STORAGE_KEY = "dil-theme-mode";
  const VALID_THEMES = new Set(["light", "dark"]);

  function safeGetStoredTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (VALID_THEMES.has(value)) {
        return value;
      }
      return "";
    } catch (_error) {
      return "";
    }
  }

  function safeSetStoredTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (_error) {
      return;
    }
  }

  function getSystemTheme() {
    if (typeof window.matchMedia !== "function") {
      return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function prefersReducedMotion() {
    if (typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function applyTheme(theme, options) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    const opts = options || {};

    document.body.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;

    if (opts.persist !== false) {
      safeSetStoredTheme(nextTheme);
    }

    const button = document.getElementById("themeToggleBtn");
    if (button) {
      const label = button.querySelector(".theme-toggle-label");
      const nextLabel = nextTheme === "dark" ? "Dark" : "Light";
      if (label) {
        label.textContent = nextLabel;
      }
      button.setAttribute("aria-pressed", nextTheme === "dark" ? "true" : "false");
      button.setAttribute(
        "aria-label",
        nextTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      );
    }

    if (opts.animate && !prefersReducedMotion()) {
      document.body.classList.remove("theme-swap-anim");
      void document.body.offsetWidth;
      document.body.classList.add("theme-swap-anim");
      window.setTimeout(() => {
        document.body.classList.remove("theme-swap-anim");
      }, 460);
    }
  }

  function resolveToggleMount() {
    const navActions = document.querySelector(".top-nav .nav-actions");
    if (navActions) {
      return {
        node: navActions,
        inline: true
      };
    }

    return {
      node: document.body,
      inline: false
    };
  }

  function bindCursorHover(button) {
    if (!button || button.dataset.cursorHoverBound === "true") {
      return;
    }

    const cursorFx = document.getElementById("cursorFx");
    if (!cursorFx) {
      return;
    }

    button.dataset.cursorHoverBound = "true";

    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      cursorFx.classList.add("hovering");
    });

    button.addEventListener("pointerleave", () => {
      cursorFx.classList.remove("hovering");
    });
  }

  function createToggleButton(initialTheme) {
    if (document.getElementById("themeToggleBtn")) {
      return;
    }

    const mount = resolveToggleMount();
    const button = document.createElement("button");
    button.id = "themeToggleBtn";
    button.className = "theme-toggle-btn";
    button.type = "button";
    button.setAttribute("aria-live", "polite");

    if (mount.inline) {
      button.classList.add("theme-toggle-inline");
    }

    button.innerHTML = [
      '<span class="theme-toggle-track" aria-hidden="true">',
      '  <span class="theme-toggle-icon sun">☀</span>',
      '  <span class="theme-toggle-icon moon">🌙</span>',
      '  <span class="theme-toggle-thumb"></span>',
      "</span>",
      `<span class="theme-toggle-label">${initialTheme === "dark" ? "Dark" : "Light"}</span>`
    ].join("\n");

    button.addEventListener("click", () => {
      const currentTheme = document.body.dataset.theme === "dark" ? "dark" : "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, { persist: true, animate: true });
    });

    mount.node.appendChild(button);

    bindCursorHover(button);
  }

  function init() {
    if (!document.body) {
      return;
    }

    const startingTheme = safeGetStoredTheme() || getSystemTheme();
    applyTheme(startingTheme, { persist: false, animate: false });
    createToggleButton(startingTheme);

    const media = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

    if (!media || typeof media.addEventListener !== "function") {
      return;
    }

    media.addEventListener("change", () => {
      const storedTheme = safeGetStoredTheme();
      if (storedTheme) {
        return;
      }
      applyTheme(getSystemTheme(), { persist: false, animate: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
