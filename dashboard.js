const STORAGE_KEY_PREFIX = "dil-daily-trainer-v1";

const elements = {
  userEmail: document.getElementById("dashboardUserEmail"),
  logoutBtn: document.getElementById("dashboardLogoutBtn"),
  dialogOverlay: document.getElementById("dashboardDialogOverlay"),
  dialogCard: document.getElementById("dashboardDialogCard"),
  dialogTitle: document.getElementById("dashboardDialogTitle"),
  dialogMessage: document.getElementById("dashboardDialogMessage"),
  dialogConfirmBtn: document.getElementById("dashboardDialogConfirmBtn"),
  dialogCancelBtn: document.getElementById("dashboardDialogCancelBtn"),
  weeklyCompletion: document.getElementById("dashboardWeeklyCompletion"),
  volume: document.getElementById("dashboardVolume"),
  pb: document.getElementById("dashboardPb"),
  streakValue: document.getElementById("dashboardStreakValue"),
  historyGrid: document.getElementById("dashboardHistoryGrid"),
  volumeTrend: document.getElementById("dashboardVolumeTrend"),
  balance: document.getElementById("dashboardBalance"),
  motivationState: document.getElementById("dashboardMotivationState"),
  motivationSummary: document.getElementById("dashboardMotivationSummary"),
  weeklyGoal: document.getElementById("dashboardWeeklyGoal"),
  weeklyGoalProgress: document.getElementById("dashboardWeeklyGoalProgress"),
  weeklyGoalFill: document.getElementById("dashboardWeeklyGoalFill"),
  freezeCount: document.getElementById("dashboardFreezeCount"),
  freezeHint: document.getElementById("dashboardFreezeHint"),
  challengeText: document.getElementById("dashboardChallengeText"),
  badgeList: document.getElementById("dashboardBadgeList")
};

let authService = null;
let currentUser = null;
let currentStorageKey = "";
let dashboardDialogResolve = null;
let isDashboardDialogOpen = false;

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey)
    .split("-")
    .map((value) => Number(value));
  return new Date(year, month - 1, day);
}

function formatDay(dateKey) {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "short" });
  return formatter.format(parseDateKey(dateKey));
}

function toIntInRange(value, { min = 0, max = Number.POSITIVE_INFINITY, fallback = 0 } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  if (rounded < min || rounded > max) {
    return fallback;
  }

  return rounded;
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
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

function closeDashboardDialog(result = false) {
  if (!elements.dialogOverlay || !isDashboardDialogOpen) {
    return;
  }

  elements.dialogOverlay.classList.remove("open");
  elements.dialogOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialog-open");

  const resolve = dashboardDialogResolve;
  dashboardDialogResolve = null;
  isDashboardDialogOpen = false;

  if (resolve) {
    resolve(Boolean(result));
  }
}

function showDashboardDialog({ title, message, confirmLabel = "Okay", cancelLabel = null, tone = "info" }) {
  if (
    !elements.dialogOverlay ||
    !elements.dialogCard ||
    !elements.dialogTitle ||
    !elements.dialogMessage ||
    !elements.dialogConfirmBtn ||
    !elements.dialogCancelBtn
  ) {
    if (cancelLabel) {
      return Promise.resolve(window.confirm(message));
    }
    window.alert(message);
    return Promise.resolve(true);
  }

  if (isDashboardDialogOpen) {
    closeDashboardDialog(false);
  }

  elements.dialogTitle.textContent = title;
  elements.dialogMessage.textContent = message;
  elements.dialogConfirmBtn.textContent = confirmLabel;
  elements.dialogCard.dataset.tone = tone;

  if (cancelLabel) {
    elements.dialogCancelBtn.hidden = false;
    elements.dialogCancelBtn.disabled = false;
    elements.dialogCancelBtn.textContent = cancelLabel;
  } else {
    elements.dialogCancelBtn.hidden = true;
    elements.dialogCancelBtn.disabled = true;
  }

  elements.dialogOverlay.classList.add("open");
  elements.dialogOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("dialog-open");
  isDashboardDialogOpen = true;

  const focusTarget = cancelLabel ? elements.dialogCancelBtn : elements.dialogConfirmBtn;
  window.requestAnimationFrame(() => {
    focusTarget.focus();
  });

  return new Promise((resolve) => {
    dashboardDialogResolve = resolve;
  });
}

function initDashboardDialog() {
  if (
    !elements.dialogOverlay ||
    !elements.dialogConfirmBtn ||
    !elements.dialogCancelBtn ||
    elements.dialogOverlay.dataset.bound === "true"
  ) {
    return;
  }

  elements.dialogOverlay.dataset.bound = "true";

  elements.dialogConfirmBtn.addEventListener("click", () => {
    closeDashboardDialog(true);
  });

  elements.dialogCancelBtn.addEventListener("click", () => {
    closeDashboardDialog(false);
  });

  elements.dialogOverlay.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("[data-dashboard-dialog-close='cancel']")) {
      closeDashboardDialog(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!isDashboardDialogOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDashboardDialog(false);
      return;
    }

    if (event.key === "Enter" && document.activeElement !== elements.dialogCancelBtn) {
      event.preventDefault();
      closeDashboardDialog(true);
    }
  });
}

function confirmLogoutDialog() {
  return showDashboardDialog({
    title: "Log Out?",
    message: "Are you sure you want to log out?",
    confirmLabel: "Log Out",
    cancelLabel: "Cancel",
    tone: "warning"
  });
}

function getStorageKeyForUid(uid) {
  return `${STORAGE_KEY_PREFIX}:${uid}`;
}

function getIsoWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return {
    year: d.getUTCFullYear(),
    week: weekNo
  };
}

function getWeekKey(dateKey) {
  const info = getIsoWeekInfo(parseDateKey(dateKey));
  return `${info.year}-W${String(info.week).padStart(2, "0")}`;
}

function isSameWeek(dateKey, weekKey) {
  return getWeekKey(dateKey) === weekKey;
}

function getCurrentWeekKey() {
  return getWeekKey(getDateKey());
}

function normalizeHistory(history) {
  if (!history || typeof history !== "object") {
    return {};
  }

  const nextHistory = {};
  Object.entries(history).forEach(([dateKey, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !entry || typeof entry !== "object") {
      return;
    }

    const groupCounts = {};
    if (entry.groupCounts && typeof entry.groupCounts === "object") {
      Object.entries(entry.groupCounts).forEach(([group, count]) => {
        const safeCount = toIntInRange(count, { min: 0, max: 1000, fallback: 0 });
        if (safeCount > 0) {
          groupCounts[String(group).toUpperCase()] = safeCount;
        }
      });
    }

    nextHistory[dateKey] = {
      done: toIntInRange(entry.done, { min: 0, max: 10000, fallback: 0 }),
      total: toIntInRange(entry.total, { min: 0, max: 10000, fallback: 0 }),
      completed: Boolean(entry.completed),
      frozen: Boolean(entry.frozen),
      totalVolume: toIntInRange(entry.totalVolume, { min: 0, max: 100000, fallback: 0 }),
      groupCounts
    };
  });

  return nextHistory;
}

function normalizeMotivation(motivation) {
  const input = motivation && typeof motivation === "object" ? motivation : {};
  const frozenDates = Array.isArray(input.frozenDates)
    ? input.frozenDates.filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)))
    : [];

  const badges = Array.isArray(input.badges)
    ? input.badges.filter((badge) => typeof badge === "string")
    : [];

  const challengeTargetGroups = toIntInRange(input.challengeTargetGroups, {
    min: 2,
    max: 6,
    fallback: 4
  });

  return {
    weeklyGoal: toIntInRange(input.weeklyGoal, { min: 1, max: 7, fallback: 4 }),
    freezeCredits: toIntInRange(input.freezeCredits, { min: 0, max: 3, fallback: 0 }),
    frozenDates,
    badges,
    challengeTargetGroups,
    challenge:
      input.challenge && typeof input.challenge === "object"
        ? {
            weekKey: typeof input.challenge.weekKey === "string" ? input.challenge.weekKey : getCurrentWeekKey(),
            completedGroups: Array.isArray(input.challenge.completedGroups)
              ? input.challenge.completedGroups.map((group) => String(group).toUpperCase())
              : [],
            complete: Boolean(input.challenge.complete)
          }
        : {
            weekKey: getCurrentWeekKey(),
            completedGroups: [],
            complete: false
          }
  };
}

function normalizeExerciseProgress(progressMap) {
  if (!progressMap || typeof progressMap !== "object") {
    return {};
  }

  const nextProgress = {};
  Object.entries(progressMap).forEach(([key, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const progressKey = String(key).trim();
    if (!progressKey) {
      return;
    }

    nextProgress[progressKey] = {
      bestVolume: toIntInRange(value.bestVolume, { min: 0, max: 100000, fallback: 0 })
    };
  });

  return nextProgress;
}

function isHistoryDayComplete(entry, frozenSet, dateKey) {
  if (!entry) {
    return frozenSet.has(dateKey);
  }
  return Boolean(entry.completed || entry.frozen || frozenSet.has(dateKey));
}

function computeStreak(history, frozenDates) {
  const frozenSet = new Set(Array.isArray(frozenDates) ? frozenDates : []);
  const today = new Date();
  const todayKey = getDateKey(today);
  const historyToday = history[todayKey];
  const cursor = new Date(today);

  if (!isHistoryDayComplete(historyToday, frozenSet, todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateKey = getDateKey(cursor);
    const entry = history[dateKey];
    if (!isHistoryDayComplete(entry, frozenSet, dateKey)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getWeeklyCompletionCount(history, frozenDates, weekKey) {
  const frozenSet = new Set(Array.isArray(frozenDates) ? frozenDates : []);
  let completed = 0;

  Object.entries(history).forEach(([dateKey, entry]) => {
    if (!isSameWeek(dateKey, weekKey)) {
      return;
    }

    if (isHistoryDayComplete(entry, frozenSet, dateKey)) {
      completed += 1;
    }
  });

  return completed;
}

function buildChallengeState(history, targetGroups) {
  const currentWeekKey = getCurrentWeekKey();
  const groups = new Set();

  Object.entries(history).forEach(([dateKey, entry]) => {
    if (!isSameWeek(dateKey, currentWeekKey) || !entry || !entry.groupCounts) {
      return;
    }

    Object.entries(entry.groupCounts).forEach(([group, count]) => {
      const safeCount = toIntInRange(count, { min: 0, max: 1000, fallback: 0 });
      if (safeCount > 0) {
        groups.add(String(group).toUpperCase());
      }
    });
  });

  return {
    weekKey: currentWeekKey,
    completedGroups: Array.from(groups),
    complete: groups.size >= targetGroups
  };
}

function loadUserState(uid) {
  const fallback = {
    history: {},
    motivation: normalizeMotivation(null),
    exerciseProgress: {}
  };

  try {
    const raw = localStorage.getItem(getStorageKeyForUid(uid));
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const state = {
      history: normalizeHistory(parsed.history),
      motivation: normalizeMotivation(parsed.motivation),
      exerciseProgress: normalizeExerciseProgress(parsed.exerciseProgress)
    };

    state.motivation.challenge = buildChallengeState(state.history, state.motivation.challengeTargetGroups);
    return state;
  } catch (error) {
    return fallback;
  }
}

function renderHistory(state) {
  if (!elements.historyGrid) {
    return;
  }

  const frozenSet = new Set(state.motivation.frozenDates || []);
  elements.historyGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = getDateKey(day);
    const entry = state.history[key];

    const tile = document.createElement("div");
    let tileClass = "empty";
    let score = "0%";

    if ((entry && entry.frozen) || (!entry && frozenSet.has(key))) {
      tileClass = "freeze";
      score = "FRZ";
    } else if (entry && entry.total > 0) {
      const percent = Math.round((entry.done / entry.total) * 100);
      score = `${percent}%`;
      tileClass = entry.completed ? "done" : "partial";
    }

    tile.className = `day-tile ${tileClass}`;

    const dayName = document.createElement("p");
    dayName.className = "day-name";
    dayName.textContent = formatDay(key);

    const dayScore = document.createElement("p");
    dayScore.className = "day-score";
    dayScore.textContent = score;

    tile.appendChild(dayName);
    tile.appendChild(dayScore);
    fragment.appendChild(tile);
  }

  elements.historyGrid.appendChild(fragment);
}

function renderVolumeTrend(history) {
  if (!elements.volumeTrend) {
    return;
  }

  const points = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const dateKey = getDateKey(day);
    const entry = history[dateKey];
    const volume = entry ? toIntInRange(entry.totalVolume, { min: 0, max: 100000, fallback: 0 }) : 0;
    points.push({ dateKey, volume });
  }

  const maxVolume = Math.max(1, ...points.map((point) => point.volume));
  elements.volumeTrend.innerHTML = "";

  const fragment = document.createDocumentFragment();
  points.forEach((point) => {
    const wrapper = document.createElement("div");

    const bar = document.createElement("div");
    bar.className = "volume-bar";

    const fill = document.createElement("div");
    fill.className = "volume-bar-fill";
    const fillHeight = point.volume <= 0 ? 0 : Math.max(2, Math.round((point.volume / maxVolume) * 100));
    fill.style.height = `${fillHeight}%`;
    bar.appendChild(fill);

    const label = document.createElement("p");
    label.className = "volume-bar-label";
    label.textContent = formatDay(point.dateKey);

    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    fragment.appendChild(wrapper);
  });

  elements.volumeTrend.appendChild(fragment);
}

function renderBalance(history) {
  if (!elements.balance) {
    return;
  }

  const counts = {};
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const dateKey = getDateKey(day);
    const entry = history[dateKey];
    if (!entry || !entry.groupCounts) {
      continue;
    }

    Object.entries(entry.groupCounts).forEach(([group, count]) => {
      const safeCount = toIntInRange(count, { min: 0, max: 1000, fallback: 0 });
      if (safeCount > 0) {
        const normalizedGroup = String(group).toUpperCase();
        counts[normalizedGroup] = (counts[normalizedGroup] || 0) + safeCount;
      }
    });
  }

  elements.balance.innerHTML = "";
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No muscle-group data yet.";
    elements.balance.appendChild(empty);
    return;
  }

  const max = Math.max(1, ...entries.map(([, count]) => count));
  const fragment = document.createDocumentFragment();

  entries.forEach(([group, count]) => {
    const row = document.createElement("div");
    row.className = "balance-row";

    const label = document.createElement("p");
    label.textContent = group;

    const track = document.createElement("div");
    track.className = "balance-track";

    const fill = document.createElement("div");
    fill.className = "balance-fill";
    fill.style.width = `${Math.round((count / max) * 100)}%`;
    track.appendChild(fill);

    const value = document.createElement("p");
    value.textContent = String(count);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    fragment.appendChild(row);
  });

  elements.balance.appendChild(fragment);
}

function renderBadges(motivation) {
  if (!elements.badgeList) {
    return;
  }

  elements.badgeList.innerHTML = "";

  if (!Array.isArray(motivation.badges) || motivation.badges.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No badges earned yet. Keep training daily.";
    elements.badgeList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  motivation.badges.forEach((badge) => {
    const chip = document.createElement("span");
    chip.className = "badge-chip";
    chip.textContent = badge;
    fragment.appendChild(chip);
  });

  elements.badgeList.appendChild(fragment);
}

function renderAnalytics(state) {
  const currentWeekKey = getCurrentWeekKey();
  const weeklyComplete = getWeeklyCompletionCount(state.history, state.motivation.frozenDates, currentWeekKey);

  let volume7d = 0;
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const dateKey = getDateKey(day);
    const entry = state.history[dateKey];
    const volume = entry ? toIntInRange(entry.totalVolume, { min: 0, max: 100000, fallback: 0 }) : 0;
    volume7d += volume;
  }

  const personalBestCount = Object.values(state.exerciseProgress).filter((entry) => entry.bestVolume > 0).length;

  if (elements.weeklyCompletion) {
    elements.weeklyCompletion.textContent = `${weeklyComplete} / 7 complete days`;
  }

  if (elements.volume) {
    elements.volume.textContent = `${volume7d} volume points in 7 days`;
  }

  if (elements.pb) {
    elements.pb.textContent = `${personalBestCount} personal best markers`;
  }

  renderVolumeTrend(state.history);
  renderBalance(state.history);
}

function renderMotivation(state, streak) {
  const motivation = state.motivation;
  const weeklyComplete = getWeeklyCompletionCount(state.history, motivation.frozenDates, getCurrentWeekKey());
  const challenge = motivation.challenge || buildChallengeState(state.history, motivation.challengeTargetGroups);
  const weeklyGoalTarget = Math.max(1, motivation.weeklyGoal);
  const weeklyProgressPercent = Math.min(100, Math.round((weeklyComplete / weeklyGoalTarget) * 100));
  const remainingDays = Math.max(weeklyGoalTarget - weeklyComplete, 0);
  const completedGroups = challenge.completedGroups.length;
  const targetGroups = motivation.challengeTargetGroups;
  const groupsLeft = Math.max(targetGroups - completedGroups, 0);

  let motivationTone = "tone-neutral";
  let motivationStateText = "Getting Started";
  let summaryText = "Complete one session to kickstart this week.";

  if (weeklyComplete >= weeklyGoalTarget) {
    motivationTone = "tone-success";
    motivationStateText = "Goal Reached";
    summaryText = "Great consistency. Your weekly goal is done, now extend your streak.";
  } else if (weeklyComplete >= Math.ceil(weeklyGoalTarget * 0.6) || streak >= 3) {
    motivationTone = "tone-progress";
    motivationStateText = "Building Momentum";
    summaryText = `You are close. ${pluralize(remainingDays, "day")} to complete your weekly goal.`;
  } else if (weeklyComplete > 0 || streak > 0) {
    motivationTone = "tone-focus";
    motivationStateText = "Stay Consistent";
    summaryText = `${pluralize(remainingDays, "day")} left for your weekly target. Keep the rhythm going.`;
  }

  if (elements.motivationState) {
    elements.motivationState.className = `status-pill ${motivationTone}`;
    elements.motivationState.textContent = motivationStateText;
  }

  if (elements.motivationSummary) {
    elements.motivationSummary.textContent = summaryText;
  }

  if (elements.weeklyGoal) {
    elements.weeklyGoal.textContent = `${weeklyComplete} / ${weeklyGoalTarget} days`;
  }

  if (elements.weeklyGoalProgress) {
    elements.weeklyGoalProgress.setAttribute("aria-valuenow", String(weeklyProgressPercent));
  }

  if (elements.weeklyGoalFill) {
    elements.weeklyGoalFill.style.width = `${weeklyProgressPercent}%`;
  }

  if (elements.freezeCount) {
    elements.freezeCount.textContent = `${pluralize(motivation.freezeCredits, "credit")} available`;
  }

  if (elements.freezeHint) {
    elements.freezeHint.textContent =
      motivation.freezeCredits > 0
        ? "Use a credit on a hard day to keep your streak alive."
        : "No credits left right now. Complete sessions to stay on track.";
  }

  if (elements.challengeText) {
    const streakText = pluralize(streak, "day");
    const challengeTail =
      groupsLeft > 0
        ? `${pluralize(groupsLeft, "group")} left to complete this week's challenge.`
        : "Challenge complete this week. Keep pushing.";

    elements.challengeText.textContent = `${completedGroups}/${targetGroups} training groups covered this week. Streak: ${streakText}. ${challengeTail}`;
  }

  renderBadges(motivation);
}

function renderDashboard(state) {
  if (elements.userEmail && currentUser && currentUser.email) {
    elements.userEmail.textContent = currentUser.email;
  }

  const streak = computeStreak(state.history, state.motivation.frozenDates);
  if (elements.streakValue) {
    elements.streakValue.textContent = String(streak);
  }

  renderAnalytics(state);
  renderHistory(state);
  renderMotivation(state, streak);
}

function bindEvents() {
  initDashboardDialog();

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      if (!authService) {
        redirectToLogin();
        return;
      }

      confirmLogoutDialog().then((shouldLogout) => {
        if (!shouldLogout) {
          return;
        }

        authService.signOut().finally(() => {
          redirectToLogin();
        });
      });
    });
  }

  window.addEventListener("storage", (event) => {
    if (!currentUser || !event.key || event.key !== currentStorageKey) {
      return;
    }

    const nextState = loadUserState(currentUser.uid);
    renderDashboard(nextState);
  });
}

function initAuth() {
  if (typeof firebase === "undefined" || !hasValidFirebaseConfig()) {
    if (elements.challengeText) {
      elements.challengeText.textContent = "Firebase config missing. Please set firebase-config.js.";
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
    currentStorageKey = getStorageKeyForUid(user.uid);
    const state = loadUserState(user.uid);
    renderDashboard(state);
  });
}

init();
