const elements = {
  userEmail: document.getElementById("guideUserEmail"),
  searchInput: document.getElementById("guideSearchInput"),
  groupFilter: document.getElementById("guideGroupFilter"),
  count: document.getElementById("guideCount"),
  status: document.getElementById("guideStatus"),
  grid: document.getElementById("guideGrid"),
  sceneTitle: document.getElementById("guideSceneTitle"),
  sceneBody: document.getElementById("guideSceneBody"),
  sceneProgress: document.getElementById("guideSceneProgress"),
  sceneImage: document.getElementById("guideSceneImage")
};

const EXERCISE_IMAGE_ASSETS = {
  cardio: "assets/exercises/cardio-hiit.jpg",
  pull: "assets/exercises/pull.jpg",
  push: "assets/exercises/push.jpg",
  legs: "assets/exercises/legs.jpg",
  core: "assets/exercises/core.jpg",
  mobility: "assets/exercises/mobility.jpg",
  yoga: "assets/exercises/yoga-flow.jpg"
};

const GUIDE_DEFAULTS = {
  cardio: {
    tag: "CARDIO",
    image: EXERCISE_IMAGE_ASSETS.cardio,
    imageAlt: "Athletes performing cardio drills",
    how: "Keep posture upright, stay controlled, and breathe rhythmically through the full interval.",
    why: "Cardio conditioning improves endurance, heart health, and recovery speed between sets."
  },
  lowerBody: {
    tag: "LEGS",
    image: EXERCISE_IMAGE_ASSETS.legs,
    imageAlt: "Athlete training lower body strength",
    how: "Control each rep, track knees with toes, and use full range with stable foot pressure.",
    why: "Lower-body strength supports posture, balance, power, and injury resilience."
  },
  push: {
    tag: "PUSH",
    image: EXERCISE_IMAGE_ASSETS.push,
    imageAlt: "Athlete doing push-up training",
    how: "Brace core, control the lowering phase, and press smoothly without collapsing form.",
    why: "Push training builds chest, shoulder, and triceps strength with strong core stability."
  },
  pull: {
    tag: "PULL",
    image: EXERCISE_IMAGE_ASSETS.pull,
    imageAlt: "Athlete performing pull-up training",
    how: "Set shoulder blades first, drive elbows down, and control the eccentric phase.",
    why: "Pulling improves upper-back strength, grip, posture, and shoulder health."
  },
  core: {
    tag: "CORE",
    image: EXERCISE_IMAGE_ASSETS.core,
    imageAlt: "Athlete training core control",
    how: "Keep ribs down, brace around the midsection, and avoid momentum-driven reps.",
    why: "Core control improves force transfer and protects the lower back during training."
  },
  mobility: {
    tag: "MOBILITY",
    image: EXERCISE_IMAGE_ASSETS.mobility,
    imageAlt: "Athlete doing stretching and mobility work",
    how: "Move into end ranges slowly, breathe deeply, and stay in pain-free motion.",
    why: "Mobility sessions support recovery, range of motion, and movement quality."
  },
  custom: {
    tag: "CUSTOM",
    image: EXERCISE_IMAGE_ASSETS.push,
    imageAlt: "Athlete performing custom training movement",
    how: "Use controlled technique and stop the set when form quality drops.",
    why: "Quality movement practice builds safe long-term progress."
  }
};

const supportsIntersectionObserver = "IntersectionObserver" in window;
const prefersReducedMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let authService = null;
let currentUser = null;
let guideCatalog = [];
let animationObserver = null;
let guideCardObserver = null;
let guideCards = [];
let guideCardImages = [];
let activeGuideCard = null;
let guideScrollFxRaf = null;
let hasBoundGuideScrollFx = false;
let guideSceneImageToken = 0;

function slugifyExerciseName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getDedicatedExerciseImagePath(name) {
  const slug = slugifyExerciseName(name);
  if (!slug) {
    return GUIDE_DEFAULTS.custom.image;
  }
  return `assets/exercises/library/${slug}.jpg`;
}

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

function redirectToLogin(extraQuery = "") {
  const suffix = extraQuery ? `?${extraQuery}` : "";
  window.location.replace(`login.html${suffix}`);
}

function normalizeGroup(group) {
  const value = String(group || "").trim();
  if (value in GUIDE_DEFAULTS) {
    return value;
  }

  if (value.toLowerCase() === "lowerbody") {
    return "lowerBody";
  }

  if (value.toLowerCase() === "legs") {
    return "lowerBody";
  }

  return "custom";
}

function normalizeEntry(rawEntry) {
  const group = normalizeGroup(rawEntry.group);
  const defaults = GUIDE_DEFAULTS[group] || GUIDE_DEFAULTS.custom;
  const name = String(rawEntry.name || "").trim();

  if (!name) {
    return null;
  }

  const dedicatedImage = getDedicatedExerciseImagePath(name);
  const explicitImage = String(rawEntry.image || "").trim();
  const image = String(explicitImage || dedicatedImage || defaults.image || GUIDE_DEFAULTS.custom.image);
  const imageAlt = String(rawEntry.imageAlt || defaults.imageAlt || `Athlete performing ${name}`);

  return {
    name,
    group,
    tag: String(rawEntry.tag || defaults.tag),
    image,
    imageAlt,
    how: String(rawEntry.how || defaults.how),
    why: String(rawEntry.why || defaults.why)
  };
}

function extractExerciseLibraryEntries(source) {
  const startToken = "const EXERCISE_LIBRARY = [";
  const startIndex = source.indexOf(startToken);
  if (startIndex < 0) {
    return [];
  }

  const endIndex = source.indexOf("];", startIndex);
  if (endIndex < 0) {
    return [];
  }

  const libraryChunk = source.slice(startIndex, endIndex);
  const entryRegex = /createLibraryEntry\(\{([\s\S]*?)\}\),?/g;
  const entries = [];

  let match = entryRegex.exec(libraryChunk);
  while (match) {
    const objectLiteral = `{${match[1]}}`;

    try {
      const evaluator = new Function("EXERCISE_IMAGE_ASSETS", `return (${objectLiteral});`);
      const parsed = evaluator(EXERCISE_IMAGE_ASSETS);
      if (parsed && parsed.name) {
        entries.push(parsed);
      }
    } catch (error) {
      // Ignore malformed entries and continue parsing next card.
    }

    match = entryRegex.exec(libraryChunk);
  }

  return entries;
}

function dedupeAndSort(entries) {
  const seen = new Set();
  const next = [];

  entries.forEach((entry) => {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    next.push(entry);
  });

  next.sort((a, b) => a.name.localeCompare(b.name));
  return next;
}

function setRevealDelay(node) {
  const delay = Number(node.dataset.delay);
  if (!Number.isFinite(delay) || delay < 0) {
    return;
  }
  node.style.setProperty("--reveal-delay", `${delay.toFixed(2)}s`);
}

function ensureAnimationObserver() {
  if (animationObserver || prefersReducedMotion || !supportsIntersectionObserver) {
    return;
  }

  animationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const node = entry.target;
        const repeat = node.dataset.repeat === "true";

        if (entry.isIntersecting) {
          node.classList.add("in-view");

          if (!repeat) {
            node.dataset.animated = "true";
            animationObserver.unobserve(node);
          }
          return;
        }

        if (repeat) {
          node.classList.remove("in-view");
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px"
    }
  );
}

function registerScrollAnimations(scope = document) {
  const nodes = scope.querySelectorAll("[data-animate]");
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

  ensureAnimationObserver();
  nodes.forEach((node) => {
    if (node.dataset.observed === "true" || node.dataset.animated === "true") {
      return;
    }
    node.dataset.observed = "true";
    animationObserver.observe(node);
  });
}

function resetGuideCardScene() {
  if (guideCardObserver) {
    guideCardObserver.disconnect();
    guideCardObserver = null;
  }

  guideCards = [];
  guideCardImages = [];
  activeGuideCard = null;

  if (elements.sceneProgress) {
    elements.sceneProgress.style.width = "0%";
  }
}

function updateGuideSceneImage(src, alt) {
  if (!elements.sceneImage || !src) {
    return;
  }

  const nextAlt = alt || "Training guide image";
  if (elements.sceneImage.dataset.currentSrc === src) {
    elements.sceneImage.alt = nextAlt;
    return;
  }

  guideSceneImageToken += 1;
  const token = guideSceneImageToken;
  const preloader = new Image();

  elements.sceneImage.classList.add("is-loading");
  preloader.src = src;

  preloader.onload = () => {
    if (token !== guideSceneImageToken || !elements.sceneImage) {
      return;
    }

    elements.sceneImage.src = src;
    elements.sceneImage.alt = nextAlt;
    elements.sceneImage.dataset.currentSrc = src;
    window.requestAnimationFrame(() => {
      if (elements.sceneImage) {
        elements.sceneImage.classList.remove("is-loading");
      }
    });
  };

  preloader.onerror = () => {
    if (token !== guideSceneImageToken || !elements.sceneImage) {
      return;
    }
    elements.sceneImage.classList.remove("is-loading");
  };
}

function updateGuidePinnedScene(card) {
  if (!(card instanceof HTMLElement)) {
    return;
  }

  if (elements.sceneTitle && card.dataset.title) {
    elements.sceneTitle.textContent = card.dataset.title;
  }

  if (elements.sceneBody && card.dataset.copy) {
    elements.sceneBody.textContent = card.dataset.copy;
  }

  updateGuideSceneImage(card.dataset.image, card.dataset.imageAlt);

  const total = Math.max(1, guideCards.length);
  const rawStep = Number(card.dataset.step);
  const current = Number.isFinite(rawStep) ? Math.min(Math.max(rawStep, 1), total) : 1;
  const percentage = Math.round((current / total) * 100);

  if (elements.sceneProgress) {
    elements.sceneProgress.style.width = `${percentage}%`;
  }
}

function applyGuideActiveCard(card) {
  if (!(card instanceof HTMLElement)) {
    return;
  }

  if (activeGuideCard === card) {
    return;
  }

  activeGuideCard = card;
  guideCards.forEach((node) => {
    node.classList.toggle("is-active", node === card);
  });

  updateGuidePinnedScene(card);
}

function getClosestGuideCardToAnchor(anchorY) {
  if (guideCards.length === 0) {
    return null;
  }

  let closestCard = guideCards[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  guideCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const withinCard = anchorY >= rect.top && anchorY <= rect.bottom;
    const distance = withinCard ? 0 : Math.min(Math.abs(rect.top - anchorY), Math.abs(rect.bottom - anchorY));

    if (distance < closestDistance) {
      closestDistance = distance;
      closestCard = card;
    }
  });

  return closestCard;
}

function syncGuideActiveCardFromViewport() {
  if (guideCards.length === 0) {
    return;
  }

  const anchorY = window.innerHeight * 0.42;
  const nextCard = getClosestGuideCardToAnchor(anchorY);
  if (!nextCard) {
    return;
  }

  applyGuideActiveCard(nextCard);
}

function paintGuideScrollEffects() {
  guideScrollFxRaf = null;
  syncGuideActiveCardFromViewport();

  if (guideCardImages.length === 0 || prefersReducedMotion) {
    return;
  }

  const viewportHalf = window.innerHeight * 0.5;
  guideCardImages.forEach((image) => {
    const rect = image.getBoundingClientRect();
    const center = rect.top + rect.height * 0.5;
    const ratio = (center - viewportHalf) / Math.max(1, viewportHalf);
    const bounded = Math.max(-1, Math.min(1, ratio));
    const shift = Math.round(bounded * -22);
    image.style.setProperty("--img-shift", `${shift}px`);
  });
}

function requestGuideScrollEffects() {
  if (guideScrollFxRaf !== null) {
    return;
  }
  guideScrollFxRaf = window.requestAnimationFrame(paintGuideScrollEffects);
}

function initGuideScrollEffects() {
  if (hasBoundGuideScrollFx) {
    return;
  }

  hasBoundGuideScrollFx = true;
  paintGuideScrollEffects();
  window.addEventListener("scroll", requestGuideScrollEffects, { passive: true });
  window.addEventListener("resize", requestGuideScrollEffects);
}

function initGuideCardScene() {
  resetGuideCardScene();

  if (!elements.grid) {
    return;
  }

  guideCards = Array.from(elements.grid.querySelectorAll(".guide-card"));
  guideCardImages = guideCards
    .map((card) => card.querySelector(".guide-image"))
    .filter((image) => image instanceof HTMLImageElement);

  if (guideCards.length === 0) {
    return;
  }

  if (elements.sceneImage && elements.sceneImage.currentSrc) {
    elements.sceneImage.dataset.currentSrc = elements.sceneImage.currentSrc;
  }

  applyGuideActiveCard(guideCards[0]);
  requestGuideScrollEffects();
  syncGuideActiveCardFromViewport();

  if (prefersReducedMotion || !supportsIntersectionObserver) {
    return;
  }

  guideCardObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        applyGuideActiveCard(visible[0].target);
      }
    },
    {
      threshold: [0.35, 0.5, 0.75],
      rootMargin: "-18% 0px -30% 0px"
    }
  );

  guideCards.forEach((card) => {
    guideCardObserver.observe(card);
  });
}

async function loadGuideCatalog() {
  if (elements.status) {
    elements.status.textContent = "Loading exercises...";
  }

  try {
    const staticEntries = Array.isArray(window.EXERCISE_LIBRARY_DATA)
      ? window.EXERCISE_LIBRARY_DATA
      : [];

    if (staticEntries.length > 0) {
      const normalizedStatic = staticEntries.map((entry) => normalizeEntry(entry)).filter(Boolean);
      guideCatalog = dedupeAndSort(normalizedStatic);
      populateGroupFilter(guideCatalog);
      renderGuideGrid();

      if (elements.status) {
        elements.status.textContent = `Loaded ${guideCatalog.length} exercises.`;
      }
      return;
    }

    const response = await fetch("app.js", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load exercise source");
    }

    const source = await response.text();
    const rawEntries = extractExerciseLibraryEntries(source);
    const normalized = rawEntries.map((entry) => normalizeEntry(entry)).filter(Boolean);

    if (normalized.length === 0) {
      throw new Error("No exercises found in source");
    }

    guideCatalog = dedupeAndSort(normalized);
    populateGroupFilter(guideCatalog);
    renderGuideGrid();

    if (elements.status) {
      elements.status.textContent = `Loaded ${guideCatalog.length} exercises.`;
    }
  } catch (error) {
    guideCatalog = [];
    renderGuideGrid();
    if (elements.status) {
      elements.status.textContent = "Could not load full exercise library.";
    }
  }
}

function formatGroupLabel(group) {
  const map = {
    cardio: "Cardio",
    lowerBody: "Legs",
    push: "Push",
    pull: "Pull",
    core: "Core",
    mobility: "Mobility",
    custom: "Custom"
  };

  return map[group] || "Custom";
}

function populateGroupFilter(entries) {
  if (!elements.groupFilter) {
    return;
  }

  const groups = Array.from(new Set(entries.map((entry) => entry.group)));
  groups.sort((a, b) => formatGroupLabel(a).localeCompare(formatGroupLabel(b)));

  const currentValue = elements.groupFilter.value;
  elements.groupFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All groups";
  elements.groupFilter.appendChild(allOption);

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = formatGroupLabel(group);
    elements.groupFilter.appendChild(option);
  });

  if (Array.from(elements.groupFilter.options).some((option) => option.value === currentValue)) {
    elements.groupFilter.value = currentValue;
  }
}

function getFilteredCatalog() {
  const query = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : "";
  const selectedGroup = elements.groupFilter ? elements.groupFilter.value : "all";

  return guideCatalog.filter((entry) => {
    if (selectedGroup && selectedGroup !== "all" && entry.group !== selectedGroup) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = `${entry.name} ${entry.tag} ${entry.how} ${entry.why}`.toLowerCase();
    return haystack.includes(query);
  });
}

function buildGuideCard(entry, index) {
  const stepNumber = index + 1;
  const article = document.createElement("article");
  article.className = "panel story-step guide-card scroll-pop";
  article.dataset.animate = "true";
  article.dataset.repeat = "true";
  article.dataset.delay = (Math.min(index, 8) * 0.04 + 0.04).toFixed(2);
  article.dataset.distort = "true";
  article.dataset.step = String(stepNumber);
  article.dataset.title = `${entry.name}: Training Guide`;
  article.dataset.copy = `How: ${entry.how} Why: ${entry.why}`;
  article.dataset.image = entry.image;
  article.dataset.imageAlt = entry.imageAlt;

  const figure = document.createElement("figure");
  figure.className = "story-image-wrap guide-image-wrap";

  const image = document.createElement("img");
  image.className = "story-image guide-image";
  image.src = entry.image;
  image.alt = entry.imageAlt;
  image.loading = "lazy";
  image.decoding = "async";
  figure.appendChild(image);

  const indexLabel = document.createElement("p");
  indexLabel.className = "story-index";
  indexLabel.textContent = `${String(stepNumber).padStart(2, "0")} / ${entry.tag}`;

  const title = document.createElement("h3");
  title.textContent = entry.name;

  const how = document.createElement("p");
  const howStrong = document.createElement("strong");
  howStrong.textContent = "How to perform:";
  how.appendChild(howStrong);
  how.append(` ${entry.how}`);

  const why = document.createElement("p");
  const whyStrong = document.createElement("strong");
  whyStrong.textContent = "Why important:";
  why.appendChild(whyStrong);
  why.append(` ${entry.why}`);

  article.appendChild(figure);
  article.appendChild(indexLabel);
  article.appendChild(title);
  article.appendChild(how);
  article.appendChild(why);

  return article;
}

function renderGuideGrid() {
  if (!elements.grid) {
    return;
  }

  resetGuideCardScene();

  const filtered = getFilteredCatalog();
  elements.grid.innerHTML = "";

  if (elements.count) {
    elements.count.textContent = `${filtered.length} cards`;
  }

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No training cards available.";
    elements.grid.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((entry, index) => {
    fragment.appendChild(buildGuideCard(entry, index));
  });

  elements.grid.appendChild(fragment);
  registerScrollAnimations(elements.grid);
  if (typeof window.refreshSimplePageEffects === "function") {
    window.refreshSimplePageEffects(elements.grid);
  }
  initGuideCardScene();
}

function bindEvents() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", () => {
      renderGuideGrid();
    });
  }

  if (elements.groupFilter) {
    elements.groupFilter.addEventListener("change", () => {
      renderGuideGrid();
    });
  }
}

function initAuth() {
  if (typeof firebase === "undefined" || !hasValidFirebaseConfig()) {
    if (elements.status) {
      elements.status.textContent = "Firebase config missing.";
    }
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  authService = firebase.auth();
  return true;
}

function init() {
  bindEvents();
  initGuideScrollEffects();

  if (!initAuth()) {
    return;
  }

  authService.onAuthStateChanged(async (user) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    if (!user.emailVerified) {
      await authService.signOut().catch(() => {});
      redirectToLogin("verify=1");
      return;
    }

    currentUser = user;
    if (elements.userEmail && currentUser.email) {
      elements.userEmail.textContent = currentUser.email;
    }

    loadGuideCatalog();
  });
}

init();
