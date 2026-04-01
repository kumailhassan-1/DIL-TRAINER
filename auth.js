const authEls = {
  showLoginBtn: document.getElementById("showLoginBtn"),
  showSignupBtn: document.getElementById("showSignupBtn"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  signupEmail: document.getElementById("signupEmail"),
  signupPassword: document.getElementById("signupPassword"),
  signupConfirmPassword: document.getElementById("signupConfirmPassword"),
  authMessage: document.getElementById("authMessage"),
  authScrollLine: document.getElementById("authScrollLine"),
  cursorFx: document.getElementById("cursorFx")
};

const authMode = document.body.dataset.authMode === "signup" ? "signup" : "login";
const prefersReducedMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

let authService = null;
let revealObserver = null;
let scrollRaf = null;
let parallaxNodes = [];
let cursorFrameId = null;
let cursorX = -120;
let cursorY = -120;
let targetCursorX = -120;
let targetCursorY = -120;

function hasValidFirebaseConfig() {
  if (!window.firebaseConfig || typeof window.firebaseConfig !== "object") {
    return false;
  }

  const config = window.firebaseConfig;
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      !String(config.apiKey).includes("YOUR_") &&
      !String(config.projectId).includes("YOUR_")
  );
}

function getQueryNotice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("created") === "1") {
    return {
      message: "Account created. Verify your email, then log in.",
      tone: "success"
    };
  }

  if (params.get("verify") === "1") {
    return {
      message: "Verify your email to continue. After verification, log in again.",
      tone: "error"
    };
  }

  return null;
}

function getEmailFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const rawEmail = params.get("email");
  return rawEmail ? rawEmail.trim() : "";
}

function setMessage(message, tone = "info") {
  if (!authEls.authMessage) {
    return;
  }

  authEls.authMessage.textContent = message;
  authEls.authMessage.classList.remove("error", "success");
  if (tone === "error") {
    authEls.authMessage.classList.add("error");
  }
  if (tone === "success") {
    authEls.authMessage.classList.add("success");
  }
}

function setFormDisabled(form, disabled) {
  if (!form) {
    return;
  }

  Array.from(form.querySelectorAll("input, button")).forEach((node) => {
    node.disabled = disabled;
  });
}

function setFormsDisabled(disabled) {
  setFormDisabled(authEls.loginForm, disabled);
  setFormDisabled(authEls.signupForm, disabled);
}

function mapAuthError(error) {
  const code = error && error.code ? String(error.code) : "";

  if (code.includes("invalid-email")) {
    return "Enter a valid email address.";
  }
  if (code.includes("email-already-in-use")) {
    return "This email is already registered. Try logging in.";
  }
  if (code.includes("weak-password")) {
    return "Use a stronger password with at least 6 characters.";
  }
  if (code.includes("wrong-password") || code.includes("invalid-credential") || code.includes("user-not-found")) {
    return "Invalid email or password.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "Authentication failed. Please try again.";
}

function initAuthService() {
  if (typeof firebase === "undefined" || !hasValidFirebaseConfig()) {
    setMessage("Set your Firebase keys in firebase-config.js to enable login/signup.", "error");
    setFormsDisabled(true);
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  authService = firebase.auth();
  return true;
}

function redirectToDashboard() {
  window.location.replace("dashboard.html");
}

function goToLoginPage(extraQuery = "") {
  const suffix = extraQuery ? `?${extraQuery}` : "";
  window.location.replace(`login.html${suffix}`);
}

function goToSignupPage() {
  window.location.replace("signup.html");
}

function bindModeSwitch() {
  if (authEls.showLoginBtn) {
    authEls.showLoginBtn.addEventListener("click", () => {
      if (authMode !== "login") {
        goToLoginPage();
      }
    });
  }

  if (authEls.showSignupBtn) {
    authEls.showSignupBtn.addEventListener("click", () => {
      if (authMode !== "signup") {
        goToSignupPage();
      }
    });
  }
}

function setRevealDelay(node) {
  const delay = Number(node.dataset.delay);
  if (!Number.isFinite(delay) || delay < 0) {
    return;
  }
  node.style.setProperty("--reveal-delay", `${delay.toFixed(2)}s`);
}

function initRevealAnimations() {
  const nodes = document.querySelectorAll("[data-animate]");
  if (nodes.length === 0) {
    return;
  }

  nodes.forEach((node) => {
    setRevealDelay(node);
  });

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => {
      node.classList.add("in-view");
    });
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  nodes.forEach((node) => {
    revealObserver.observe(node);
  });
}

function paintAuthScrollEffects() {
  scrollRaf = null;

  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  if (authEls.authScrollLine) {
    authEls.authScrollLine.style.transform = `scaleX(${progress})`;
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

function requestAuthScrollEffects() {
  if (scrollRaf !== null) {
    return;
  }
  scrollRaf = window.requestAnimationFrame(paintAuthScrollEffects);
}

function initScrollEffects() {
  parallaxNodes = Array.from(document.querySelectorAll("[data-parallax]"));
  paintAuthScrollEffects();
  window.addEventListener("scroll", requestAuthScrollEffects, { passive: true });
  window.addEventListener("resize", requestAuthScrollEffects);
}

function runCursorFrame() {
  cursorFrameId = null;

  cursorX += (targetCursorX - cursorX) * 0.2;
  cursorY += (targetCursorY - cursorY) * 0.2;

  if (authEls.cursorFx) {
    authEls.cursorFx.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
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

function bindCursorHoverTargets() {
  if (!authEls.cursorFx) {
    return;
  }

  const targets = document.querySelectorAll("button, a, [role='button']");
  targets.forEach((node) => {
    if (!(node instanceof HTMLElement) || node.dataset.cursorBound === "true") {
      return;
    }

    node.dataset.cursorBound = "true";

    node.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      authEls.cursorFx.classList.add("hovering");
    });

    node.addEventListener("pointerleave", () => {
      authEls.cursorFx.classList.remove("hovering");
    });
  });
}

function initCustomCursor() {
  if (!authEls.cursorFx || prefersReducedMotion || !supportsFinePointer) {
    return;
  }

  document.body.classList.add("fx-cursor");
  bindCursorHoverTargets();

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      targetCursorX = event.clientX;
      targetCursorY = event.clientY;
      authEls.cursorFx.classList.add("active");
      queueCursorFrame();
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    authEls.cursorFx.classList.add("pressed");
  });

  window.addEventListener("pointerup", () => {
    authEls.cursorFx.classList.remove("pressed");
  });

  document.addEventListener("mouseleave", () => {
    authEls.cursorFx.classList.remove("active", "pressed", "hovering");
  });

  window.addEventListener("blur", () => {
    authEls.cursorFx.classList.remove("active", "pressed", "hovering");
  });
}

function bindLoginForm() {
  if (!authEls.loginForm) {
    return;
  }

  authEls.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!authService) {
      return;
    }

    const email = authEls.loginEmail.value.trim();
    const password = authEls.loginPassword.value;
    if (!email || !password) {
      setMessage("Enter email and password.", "error");
      return;
    }

    setFormsDisabled(true);
    setMessage("Signing in...");

    try {
      await authService.signInWithEmailAndPassword(email, password);
      const user = authService.currentUser;
      if (user && !user.emailVerified) {
        user.sendEmailVerification().catch(() => {});
        await authService.signOut();
        setMessage("Please verify your email first. We sent a verification email again.", "error");
        setFormsDisabled(false);
        return;
      }

      setMessage("Signed in. Redirecting...", "success");
    } catch (error) {
      setMessage(mapAuthError(error), "error");
      setFormsDisabled(false);
    }
  });
}

function bindSignupForm() {
  if (!authEls.signupForm) {
    return;
  }

  authEls.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!authService) {
      return;
    }

    const email = authEls.signupEmail.value.trim();
    const password = authEls.signupPassword.value;
    const confirmPassword = authEls.signupConfirmPassword.value;

    if (!email || !password || !confirmPassword) {
      setMessage("Fill all sign up fields.", "error");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.", "error");
      return;
    }

    setFormsDisabled(true);
    setMessage("Creating your account...");

    try {
      const credential = await authService.createUserWithEmailAndPassword(email, password);
      const user = credential && credential.user ? credential.user : authService.currentUser;
      if (user && !user.emailVerified) {
        await user.sendEmailVerification().catch(() => {});
      }

      await authService.signOut();
      goToLoginPage(`created=1&email=${encodeURIComponent(email)}`);
    } catch (error) {
      setMessage(mapAuthError(error), "error");
      setFormsDisabled(false);
    }
  });
}

function init() {
  bindModeSwitch();
  initRevealAnimations();
  initScrollEffects();
  initCustomCursor();

  const queryNotice = getQueryNotice();
  if (queryNotice) {
    setMessage(queryNotice.message, queryNotice.tone);
  }

  if (authMode === "login" && authEls.loginEmail) {
    const prefilledEmail = getEmailFromQuery();
    if (prefilledEmail) {
      authEls.loginEmail.value = prefilledEmail;
    }
  }

  if (!initAuthService()) {
    return;
  }

  authService.onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
      redirectToDashboard();
      return;
    }

    if (user && !user.emailVerified) {
      setMessage("Your email is not verified yet. Check your inbox and verify first.", "error");
    }

    setFormsDisabled(false);
  });

  bindLoginForm();
  bindSignupForm();
}

init();
