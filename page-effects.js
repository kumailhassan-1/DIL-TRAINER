(function () {
  const supportsIntersectionObserver = "IntersectionObserver" in window;
  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsFinePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const elements = {
    scrollLine: document.getElementById("scrollLine"),
    cursorFx: document.getElementById("cursorFx")
  };

  let revealObserver = null;
  let scrollRaf = null;
  let parallaxNodes = [];
  let cursorFrameId = null;
  let cursorX = -120;
  let cursorY = -120;
  let targetCursorX = -120;
  let targetCursorY = -120;

  function setRevealDelay(node) {
    const delay = Number(node.dataset.delay);
    if (!Number.isFinite(delay) || delay < 0) {
      return;
    }

    node.style.setProperty("--reveal-delay", `${delay.toFixed(2)}s`);
  }

  function ensureRevealObserver() {
    if (revealObserver || prefersReducedMotion || !supportsIntersectionObserver) {
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px"
      }
    );
  }

  function initRevealAnimations(scope) {
    const root = scope || document;
    const nodes = root.querySelectorAll(".scroll-reveal[data-animate]");
    if (nodes.length === 0) {
      return;
    }

    nodes.forEach((node) => {
      setRevealDelay(node);
    });

    if (prefersReducedMotion || !supportsIntersectionObserver) {
      nodes.forEach((node) => {
        node.classList.add("in-view");
      });
      return;
    }

    ensureRevealObserver();
    nodes.forEach((node) => {
      if (node.dataset.observedSimple === "true") {
        return;
      }

      node.dataset.observedSimple = "true";
      revealObserver.observe(node);
    });
  }

  function paintScrollEffects() {
    scrollRaf = null;

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    if (elements.scrollLine) {
      elements.scrollLine.style.transform = `scaleX(${progress})`;
    }

    if (prefersReducedMotion || parallaxNodes.length === 0) {
      return;
    }

    const y = window.scrollY;
    parallaxNodes.forEach((node) => {
      const speed = Number(node.dataset.parallax);
      const shift = Number.isFinite(speed) ? Math.round(y * speed) : 0;
      node.style.transform = `translate3d(0, ${shift}px, 0)`;
    });
  }

  function requestScrollEffects() {
    if (scrollRaf !== null) {
      return;
    }

    scrollRaf = window.requestAnimationFrame(paintScrollEffects);
  }

  function initScrollEffects() {
    parallaxNodes = Array.from(document.querySelectorAll("[data-parallax]"));
    paintScrollEffects();
    window.addEventListener("scroll", requestScrollEffects, { passive: true });
    window.addEventListener("resize", requestScrollEffects);
  }

  function runCursorFrame() {
    cursorFrameId = null;

    cursorX += (targetCursorX - cursorX) * 0.2;
    cursorY += (targetCursorY - cursorY) * 0.2;

    if (elements.cursorFx) {
      elements.cursorFx.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    }

    if (Math.abs(targetCursorX - cursorX) > 0.12 || Math.abs(targetCursorY - cursorY) > 0.12) {
      cursorFrameId = window.requestAnimationFrame(runCursorFrame);
    }
  }

  function queueCursorFrame() {
    if (cursorFrameId !== null) {
      return;
    }

    cursorFrameId = window.requestAnimationFrame(runCursorFrame);
  }

  function bindDistortionNode(node) {
    if (node.dataset.distortBoundSimple === "true") {
      return;
    }

    node.dataset.distortBoundSimple = "true";

    node.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      node.classList.add("distort-on");
      if (elements.cursorFx) {
        elements.cursorFx.classList.add("hovering");
      }
    });

    node.addEventListener("pointerleave", () => {
      node.classList.remove("distort-on");
      node.style.removeProperty("--distort-x");
      node.style.removeProperty("--distort-y");
      if (elements.cursorFx) {
        elements.cursorFx.classList.remove("hovering");
      }
    });

    node.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      node.style.setProperty("--distort-x", `${x.toFixed(2)}%`);
      node.style.setProperty("--distort-y", `${y.toFixed(2)}%`);
    });
  }

  function initHoverDistortion(scope) {
    if (prefersReducedMotion) {
      return;
    }

    const root = scope || document;
    root.querySelectorAll("[data-distort]").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      bindDistortionNode(node);
    });
  }

  function initCustomCursor() {
    if (!elements.cursorFx || prefersReducedMotion || !supportsFinePointer) {
      return;
    }

    document.body.classList.add("fx-cursor");

    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") {
          return;
        }

        targetCursorX = event.clientX;
        targetCursorY = event.clientY;
        elements.cursorFx.classList.add("active");
        queueCursorFrame();
      },
      { passive: true }
    );

    window.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      elements.cursorFx.classList.add("pressed");
    });

    window.addEventListener("pointerup", () => {
      elements.cursorFx.classList.remove("pressed");
    });

    document.addEventListener("mouseleave", () => {
      elements.cursorFx.classList.remove("active", "pressed", "hovering");
    });

    window.addEventListener("blur", () => {
      elements.cursorFx.classList.remove("active", "pressed", "hovering");
    });
  }

  function initPageEffects() {
    initRevealAnimations(document);
    initHoverDistortion(document);
    initScrollEffects();
    initCustomCursor();
  }

  window.refreshSimplePageEffects = function refreshSimplePageEffects(scope) {
    initRevealAnimations(scope || document);
    initHoverDistortion(scope || document);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageEffects, { once: true });
  } else {
    initPageEffects();
  }
})();
