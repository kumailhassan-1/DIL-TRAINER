const STORAGE_KEY_PREFIX = "dil-daily-trainer-v1";

const DEFAULT_EXERCISES = [
  "Breathing drill - 5 minutes",
  "Bodyweight squats - 3 x 15",
  "Push-ups - 3 x 10",
  "Plank hold - 2 minutes total"
];

const DEFAULT_TASKS = [
  "Plan top 3 priorities",
  "Read or study for 25 minutes",
  "Hydrate and take a short walk"
];

const STATE_SCHEMA_VERSION = 2;
const EXERCISE_DIFFICULTY_VALUES = ["easy", "medium", "hard"];
const DEFAULT_SESSION_CONFIG = {
  workSeconds: 45,
  restSeconds: 20,
  rounds: 6
};
const DEFAULT_MOTIVATION_STATE = {
  weeklyGoal: 4,
  freezeCredits: 1,
  frozenDates: [],
  badges: [],
  challengeTargetGroups: 4,
  awardedFreezeWeeks: []
};
const MOTIVATION_BADGE_RULES = [
  { id: "first-lock", label: "First Lock", test: (ctx) => ctx.totalCompleteDays >= 1 },
  { id: "streak-3", label: "3-Day Chain", test: (ctx) => ctx.streak >= 3 },
  { id: "streak-7", label: "7-Day Chain", test: (ctx) => ctx.streak >= 7 },
  { id: "volume-250", label: "Volume 250", test: (ctx) => ctx.bestDayVolume >= 250 },
  { id: "balanced-week", label: "Balanced Week", test: (ctx) => ctx.challengeComplete }
];

const elements = {
  todayLabel: document.getElementById("todayLabel"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  streakValue: document.getElementById("streakValue"),
  streakHint: document.getElementById("streakHint"),
  energyValue: document.getElementById("energyValue"),
  energyHint: document.getElementById("energyHint"),
  exerciseList: document.getElementById("exerciseList"),
  taskList: document.getElementById("taskList"),
  exerciseCount: document.getElementById("exerciseCount"),
  taskCount: document.getElementById("taskCount"),
  exerciseForm: document.getElementById("exerciseForm"),
  taskForm: document.getElementById("taskForm"),
  exerciseInput: document.getElementById("exerciseInput"),
  exerciseSubmitBtn: document.getElementById("exerciseSubmitBtn"),
  exerciseFormCancelBtn: document.getElementById("exerciseFormCancelBtn"),
  exerciseSetsInput: document.getElementById("exerciseSetsInput"),
  exerciseRepsInput: document.getElementById("exerciseRepsInput"),
  exerciseSecondsInput: document.getElementById("exerciseSecondsInput"),
  exerciseRestInput: document.getElementById("exerciseRestInput"),
  exerciseDifficultyInput: document.getElementById("exerciseDifficultyInput"),
  exerciseSuggestions: document.getElementById("exerciseSuggestions"),
  taskInput: document.getElementById("taskInput"),
  taskSubmitBtn: document.getElementById("taskSubmitBtn"),
  taskFormCancelBtn: document.getElementById("taskFormCancelBtn"),
  historyGrid: document.getElementById("historyGrid"),
  analyticsWeeklyCompletion: document.getElementById("analyticsWeeklyCompletion"),
  analyticsVolume: document.getElementById("analyticsVolume"),
  analyticsPb: document.getElementById("analyticsPb"),
  analyticsVolumeTrend: document.getElementById("analyticsVolumeTrend"),
  analyticsBalance: document.getElementById("analyticsBalance"),
  sessionWorkInput: document.getElementById("sessionWorkInput"),
  sessionRestInput: document.getElementById("sessionRestInput"),
  sessionRoundsInput: document.getElementById("sessionRoundsInput"),
  sessionStartBtn: document.getElementById("sessionStartBtn"),
  sessionPauseBtn: document.getElementById("sessionPauseBtn"),
  sessionResetBtn: document.getElementById("sessionResetBtn"),
  sessionStatus: document.getElementById("sessionStatus"),
  sessionTimer: document.getElementById("sessionTimer"),
  sessionPhase: document.getElementById("sessionPhase"),
  sessionRound: document.getElementById("sessionRound"),
  weeklyGoalInput: document.getElementById("weeklyGoalInput"),
  saveWeeklyGoalBtn: document.getElementById("saveWeeklyGoalBtn"),
  useFreezeBtn: document.getElementById("useFreezeBtn"),
  freezeCount: document.getElementById("freezeCount"),
  challengeText: document.getElementById("challengeText"),
  badgeList: document.getElementById("badgeList"),
  cloudSyncStatus: document.getElementById("cloudSyncStatus"),
  statusMessage: document.getElementById("statusMessage"),
  userEmailLabel: document.getElementById("userEmailLabel"),
  logoutBtn: document.getElementById("logoutBtn"),
  menuLogoutBtn: document.getElementById("menuLogoutBtn"),
  resetDayBtn: document.getElementById("resetDayBtn"),
  saveTrainingBtn: document.getElementById("saveTrainingBtn"),
  markAllBtn: document.getElementById("markAllBtn"),
  menuOverlay: document.getElementById("menuOverlay"),
  menuToggleBtn: document.getElementById("menuToggleBtn"),
  menuCloseBtn: document.getElementById("menuCloseBtn"),
  storySteps: document.getElementById("storySteps"),
  sceneTitle: document.getElementById("sceneTitle"),
  sceneBody: document.getElementById("sceneBody"),
  sceneProgress: document.getElementById("sceneProgress"),
  sceneImage: document.getElementById("sceneImage"),
  cursorFx: document.getElementById("cursorFx"),
  appDialogOverlay: document.getElementById("appDialogOverlay"),
  appDialogCard: document.getElementById("appDialogCard"),
  appDialogTitle: document.getElementById("appDialogTitle"),
  appDialogMessage: document.getElementById("appDialogMessage"),
  appDialogConfirmBtn: document.getElementById("appDialogConfirmBtn"),
  appDialogCancelBtn: document.getElementById("appDialogCancelBtn")
};

const supportsIntersectionObserver = "IntersectionObserver" in window;
const prefersReducedMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsFinePointer =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

let animationObserver = null;
let scrollFxRaf = null;
let parallaxNodes = [];
let storyObserver = null;
let storySteps = [];
let storyImageNodes = [];
let activeStoryStep = null;
let cursorFrameId = null;
let cursorX = -120;
let cursorY = -120;
let targetCursorX = -120;
let targetCursorY = -120;
let sceneImageToken = 0;
let midnightTimerId = null;
let dialogResolve = null;
let isDialogOpen = false;
let authService = null;
let firestoreService = null;
let currentUser = null;
let hasStartedAppRuntime = false;
let storyExerciseSignature = null;
let editingExerciseId = null;
let editingTaskId = null;
let cloudSaveTimerId = null;
let cloudSyncStatusText = "Cloud sync: local only";
let sessionTickTimerId = null;
let sessionState = {
  running: false,
  paused: false,
  phase: "idle",
  round: 0,
  totalRounds: 0,
  remainingSeconds: 0,
  workSeconds: 45,
  restSeconds: 20
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

function slugifyExerciseName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getExerciseLibraryImagePath(name) {
  const slug = slugifyExerciseName(name);
  if (!slug) {
    return STORY_FALLBACK_IMAGE;
  }
  return `assets/exercises/library/${slug}.jpg`;
}

const STORY_FALLBACK_IMAGE = EXERCISE_IMAGE_ASSETS.push;
const PULL_TRAINING_IMAGE = EXERCISE_IMAGE_ASSETS.pull;

const EXERCISE_GUIDE_GROUPS = {
  cardio: {
    tag: "CARDIO",
    image: EXERCISE_IMAGE_ASSETS.cardio,
    imageAlt: "Athletes doing high-knee cardio drills in a fitness studio",
    how:
      "Keep a steady breathing rhythm, stay light on your feet, and maintain posture while moving through full range.",
    why:
      "Cardio drills improve conditioning, heart health, and work capacity for longer training sessions."
  },
  lowerBody: {
    tag: "LEGS",
    image: EXERCISE_IMAGE_ASSETS.legs,
    imageAlt: "Athlete performing lower-body training",
    how:
      "Keep your core braced, knees aligned with toes, and move through a controlled range without collapsing form.",
    why:
      "Lower-body strength improves stability, power, and injury resilience for daily life and sports."
  },
  push: {
    tag: "PUSH",
    image: EXERCISE_IMAGE_ASSETS.push,
    imageAlt: "Athlete performing push-up training",
    how:
      "Maintain a rigid torso, control the lowering phase, and press with smooth tempo while keeping shoulders stable.",
    why:
      "Push patterns build chest, shoulder, and tricep strength while reinforcing core tension."
  },
  pull: {
    tag: "PULL",
    image: EXERCISE_IMAGE_ASSETS.pull,
    imageAlt: "Athlete performing pull-up training in a gym",
    how:
      "Start each rep by setting your shoulder blades, pull with elbows toward ribs, and lower under control.",
    why:
      "Pulling strength improves posture, upper-back development, and shoulder health."
  },
  core: {
    tag: "CORE",
    image: EXERCISE_IMAGE_ASSETS.core,
    imageAlt: "Athlete practicing core training",
    how:
      "Brace your midsection, keep your spine neutral, and avoid using momentum while controlling each rep.",
    why:
      "A stronger core improves force transfer, balance, and protection for the lower back."
  },
  mobility: {
    tag: "MOBILITY",
    image: EXERCISE_IMAGE_ASSETS.mobility,
    imageAlt: "Athlete performing mobility and stretching practice",
    how:
      "Move slowly into each position, breathe deeply, and hold tension only within a pain-free range.",
    why:
      "Mobility work improves joint range, recovery, and long-term movement quality."
  }
};

function createLibraryEntry({ name, aliases = [], group, how, why, image, imageAlt, tag }) {
  const guide = EXERCISE_GUIDE_GROUPS[group] || {};
  const dedicatedImage = getExerciseLibraryImagePath(name);
  return {
    name,
    aliases,
    tag: tag || guide.tag || "CUSTOM",
    image: dedicatedImage || image || guide.image || STORY_FALLBACK_IMAGE,
    imageAlt: imageAlt || guide.imageAlt || `Person performing ${name}`,
    how:
      how ||
      guide.how ||
      "Use controlled technique with steady breathing and stop before form breaks down.",
    why:
      why ||
      guide.why ||
      "Consistent quality reps improve strength and reduce injury risk over long-term training."
  };
}

const EXERCISE_LIBRARY = [
  createLibraryEntry({
    name: "Burpees",
    aliases: ["burpee"],
    group: "cardio",
    how:
      "Squat down, jump feet back to plank, optional push-up, jump feet forward, then explode upward with a small jump.",
    why:
      "Burpees train full-body power, conditioning, and mental resilience under fatigue."
  }),
  createLibraryEntry({
    name: "Jumping Jacks",
    aliases: ["jumping jack"],
    group: "cardio",
    how:
      "Jump feet apart while raising arms overhead, then return to start with soft, controlled landings.",
    why: "They quickly raise heart rate and improve coordination for warm-ups and conditioning blocks."
  }),
  createLibraryEntry({
    name: "Mountain Climbers",
    aliases: ["mountain climber", "climbers"],
    group: "core",
    how:
      "From a plank, drive one knee toward chest at a time while keeping hips level and shoulders stacked over hands.",
    why: "Builds core endurance and cardio capacity simultaneously with minimal equipment."
  }),
  createLibraryEntry({
    name: "Bear Crawls",
    aliases: ["bear crawl"],
    group: "core",
    how:
      "Keep knees hovering close to floor, move opposite hand and foot together, and maintain a flat back.",
    why: "Improves full-body coordination, shoulder stability, and trunk control."
  }),
  createLibraryEntry({
    name: "High Knees",
    aliases: ["high knee", "running in place"],
    group: "cardio",
    how:
      "Run in place driving knees to hip height with active arm swing and quick, light contacts.",
    why: "Develops speed, hip flexor endurance, and cardiovascular fitness."
  }),
  createLibraryEntry({
    name: "Star Jumps",
    aliases: ["star jump", "jumping jack jump"],
    group: "cardio",
    how:
      "Dip slightly, jump explosively spreading arms and legs into a star position, then land softly and reset.",
    why: "Builds explosive leg power and elevates heart rate quickly."
  }),
  createLibraryEntry({
    name: "Bodyweight Squats",
    aliases: ["bodyweight squat", "squat", "squats"],
    group: "lowerBody",
    how:
      "Stand shoulder-width, sit hips back and down, keep chest up, and drive through mid-foot to stand tall.",
    why: "Strengthens quads, glutes, and core while improving movement mechanics."
  }),
  createLibraryEntry({
    name: "Forward Lunges",
    aliases: ["forward lunge", "lunge"],
    group: "lowerBody",
    how:
      "Step forward, lower until both knees are bent, keep front knee tracking over toes, then push back to start.",
    why: "Improves unilateral leg strength, balance, and hip stability."
  }),
  createLibraryEntry({
    name: "Reverse Lunges",
    aliases: ["reverse lunge", "back lunge"],
    group: "lowerBody",
    how:
      "Step backward into a lunge, keep torso upright, and drive through front leg to return.",
    why: "Reduces knee stress while building strong quads and glutes."
  }),
  createLibraryEntry({
    name: "Lateral (Side) Lunges",
    aliases: ["lateral lunge", "side lunge", "side lunges"],
    group: "lowerBody",
    how:
      "Step wide to one side, sit hips back over the working leg, keep opposite leg long, then return to center.",
    why: "Builds frontal-plane strength and hip mobility often missed in straight-line training."
  }),
  createLibraryEntry({
    name: "Glute Bridges",
    aliases: ["glute bridge", "hip bridge"],
    group: "lowerBody",
    how:
      "Lie on your back, feet planted, drive hips up by squeezing glutes, then lower with control.",
    why: "Activates posterior chain and supports healthier lower-back mechanics."
  }),
  createLibraryEntry({
    name: "Wall Sits",
    aliases: ["wall sit"],
    group: "lowerBody",
    how:
      "Slide down a wall until knees are near 90 degrees, keep lower back lightly supported, and hold steady.",
    why: "Builds isometric leg endurance for quads and glutes."
  }),
  createLibraryEntry({
    name: "Calf Raises",
    aliases: ["calf raise", "heel raises"],
    group: "lowerBody",
    how:
      "Rise onto balls of feet with full ankle extension, pause briefly at top, then lower slowly.",
    why: "Strengthens calves and ankle stability for running, jumping, and balance."
  }),
  createLibraryEntry({
    name: "Step-Ups (using a sturdy chair or stairs)",
    aliases: ["step up", "step-up", "step ups", "stepups"],
    group: "lowerBody",
    how:
      "Plant one foot fully on a stable platform, drive through that leg to stand, then lower under control.",
    why: "Improves single-leg strength and real-world stair power."
  }),
  createLibraryEntry({
    name: "Bulgarian Split Squats (foot elevated on a sofa/chair)",
    aliases: ["bulgarian split squat", "rear foot elevated split squat", "split squat"],
    group: "lowerBody",
    how:
      "Elevate rear foot, keep front foot planted, lower straight down with controlled knee tracking, then drive up.",
    why: "Builds strong quads and glutes while correcting left-right strength imbalances."
  }),
  createLibraryEntry({
    name: "Push-Ups (Standard, Wide, or Diamond)",
    aliases: ["push up", "push-up", "pushup", "pushups"],
    group: "push",
    how:
      "Brace core, keep elbows controlled, lower chest toward floor, and press back up without sagging hips.",
    why: "A foundational bodyweight push pattern for chest, shoulders, triceps, and trunk stability."
  }),
  createLibraryEntry({
    name: "Decline Push-Ups (feet on a chair)",
    aliases: ["decline push up", "decline push-up", "decline pushup"],
    group: "push",
    how:
      "Elevate feet, keep body rigid, lower under control, and press up while maintaining neck alignment.",
    why: "Shifts demand to upper chest and shoulders for harder pressing stimulus."
  }),
  createLibraryEntry({
    name: "Incline Push-Ups (hands on a table/counter)",
    aliases: ["incline push up", "incline push-up", "incline pushup"],
    group: "push",
    how:
      "Hands on elevated surface, body straight, lower chest to edge, then press away with controlled tempo.",
    why: "Great regression to build strength and volume with cleaner technique."
  }),
  createLibraryEntry({
    name: "Tricep Dips (using a chair or bench)",
    aliases: ["tricep dip", "triceps dip", "chair dips", "bench dips"],
    group: "push",
    how:
      "Hands on chair edge, hips close to seat, bend elbows to lower, then extend elbows to rise.",
    why: "Targets triceps and lockout strength for pressing movements."
  }),
  createLibraryEntry({
    name: "Pike Push-Ups (for shoulders)",
    aliases: ["pike push up", "pike push-up", "pike pushup"],
    group: "push",
    how:
      "Form an inverted V, lower head between hands, and press back up while keeping hips high.",
    why: "Develops shoulder strength and pressing mechanics for overhead control."
  }),
  createLibraryEntry({
    name: "Supermans (for lower back)",
    aliases: ["superman", "superman hold"],
    group: "core",
    how:
      "Lie face-down, lift arms and legs slightly while keeping neck neutral, hold briefly, then lower.",
    why: "Strengthens spinal erectors and posterior-chain endurance."
  }),
  createLibraryEntry({
    name: "Plank Shoulder Taps",
    aliases: ["shoulder taps", "plank tap"],
    group: "core",
    how:
      "From plank, tap opposite shoulder with minimal hip sway, alternating sides with control.",
    why: "Improves anti-rotation core strength and shoulder stability."
  }),
  createLibraryEntry({
    name: "Inchworms",
    aliases: ["inchworm", "walkout"],
    group: "core",
    how:
      "Hinge forward, walk hands to plank, hold briefly, then walk hands back and stand tall.",
    why: "Builds core control while improving hamstring mobility and shoulder loading tolerance."
  }),
  createLibraryEntry({
    name: "Standard Plank",
    aliases: ["plank", "front plank"],
    group: "core",
    how:
      "Forearms down, shoulders stacked, glutes tight, and body straight from head to heels.",
    why: "Foundational core isometric that reinforces full-body bracing."
  }),
  createLibraryEntry({
    name: "Side Planks",
    aliases: ["side plank"],
    group: "core",
    how:
      "Stack shoulders and hips, lift hips from floor, and hold while keeping torso long and straight.",
    why: "Targets obliques and lateral hip stabilizers for better spinal support."
  }),
  createLibraryEntry({
    name: "Bicycle Crunches",
    aliases: ["bicycle crunch", "bicycles"],
    group: "core",
    how:
      "Alternate elbow to opposite knee with controlled trunk rotation and extended opposite leg.",
    why: "Builds rotational core endurance and coordination."
  }),
  createLibraryEntry({
    name: "Leg Raises",
    aliases: ["leg raise", "lying leg raise"],
    group: "core",
    how:
      "Keep low back lightly pressed down, raise legs with control, and lower slowly without arching.",
    why: "Strengthens lower-ab engagement and pelvic control."
  }),
  createLibraryEntry({
    name: "Russian Twists",
    aliases: ["russian twist", "twists"],
    group: "core",
    how:
      "Lean back slightly, rotate torso side to side with controlled tempo while keeping chest lifted.",
    why: "Improves rotational trunk strength and anti-collapse endurance."
  }),
  createLibraryEntry({
    name: "Hollow Body Hold",
    aliases: ["hollow hold", "hollow body"],
    group: "core",
    how:
      "Press low back into floor, lift shoulders and legs, and hold a tight hollow shape.",
    why: "Builds deep anterior-core tension critical for gymnastics and bodyweight control."
  }),
  createLibraryEntry({
    name: "Flutter Kicks",
    aliases: ["flutter kick", "flutters"],
    group: "core",
    how:
      "Keep legs long and alternate small fast kicks while maintaining low-back contact with floor.",
    why: "Improves lower-core endurance and hip-flexor stamina."
  }),
  createLibraryEntry({
    name: "V-Sits",
    aliases: ["v sit", "v-sit", "v sits"],
    group: "core",
    how:
      "Balance on sit bones, lift legs and torso into a V position, and hold or pulse with control.",
    why: "Challenges full-core integration, balance, and hip flexor strength."
  }),
  createLibraryEntry({
    name: "Dead Bugs",
    aliases: ["dead bug", "deadbugs"],
    group: "core",
    how:
      "Lie on back with arms up, extend opposite arm and leg while keeping ribs down, then alternate.",
    why: "Teaches core bracing with coordinated limb movement, reducing compensations."
  }),
  createLibraryEntry({
    name: "Cat-Cow Stretch",
    aliases: ["cat cow", "cat-cow"],
    group: "mobility",
    how:
      "On hands and knees, alternate rounding and extending spine slowly with breath-matched movement.",
    why: "Improves spinal mobility and awareness before strength work."
  }),
  createLibraryEntry({
    name: "Child's Pose",
    aliases: ["child pose", "childs pose"],
    group: "mobility",
    how:
      "Sit hips toward heels, reach arms long, and breathe deeply into your back and ribs.",
    why: "Promotes recovery, nervous system downshift, and gentle back/hip relief."
  }),
  createLibraryEntry({
    name: "Downward Dog",
    aliases: ["down dog", "downward-dog"],
    group: "mobility",
    image: EXERCISE_IMAGE_ASSETS.yoga,
    how:
      "Lift hips up and back, keep spine long, press hands firmly, and pedal heels toward floor.",
    why: "Improves posterior-chain mobility and shoulder endurance."
  }),
  createLibraryEntry({
    name: "Cobra Stretch",
    aliases: ["cobra", "cobra pose"],
    group: "mobility",
    image: EXERCISE_IMAGE_ASSETS.yoga,
    how:
      "Lie face-down, press chest up using back muscles first, and keep shoulders away from ears.",
    why: "Opens the front body and improves spinal extension tolerance."
  }),
  createLibraryEntry({
    name: "Pigeon Pose",
    aliases: ["pigeon", "pigeon stretch"],
    group: "mobility",
    image: EXERCISE_IMAGE_ASSETS.yoga,
    how:
      "Bring one shin forward, extend opposite leg back, square hips, and fold forward as tolerated.",
    why: "Improves hip external rotation and relieves glute/piriformis tension."
  }),
  createLibraryEntry({
    name: "World's Greatest Stretch",
    aliases: ["worlds greatest stretch", "world's greatest stretch"],
    group: "mobility",
    image: EXERCISE_IMAGE_ASSETS.yoga,
    how:
      "Step into deep lunge, place hand down, rotate chest open, then switch sides with control.",
    why: "Combines hip, thoracic, and hamstring mobility in one efficient sequence."
  }),
  createLibraryEntry({
    name: "Chin-Ups",
    aliases: ["chin up", "chin-up", "chinup", "chinups"],
    group: "pull",
    how:
      "Use a shoulder-width underhand grip, pull chest toward bar with elbows down, then lower to full extension.",
    why: "Builds lats, biceps, and grip strength while improving scapular control."
  }),
  createLibraryEntry({
    name: "Pull-Ups",
    aliases: ["pull up", "pull-up", "pullup", "pullups"],
    group: "pull",
    how:
      "Use an overhand grip, maintain tight core, drive elbows toward sides, and control the eccentric phase.",
    why: "Develops upper-back strength and shoulder stability for balanced training."
  })
];

const EXERCISE_INTENT_OVERRIDES = [
  {
    tag: "PULL",
    keywords: ["chin up", "chin-up", "chinup", "chinups", "pull up", "pull-up", "pullup", "pullups"],
    titleSuffix: "Pulling Technique Guide",
    image: PULL_TRAINING_IMAGE,
    imageAlt: "Athlete performing pull-up training in a gym",
    how:
      "Start from a dead hang with active shoulders, pull elbows toward your ribs, clear the bar, then lower smoothly.",
    why:
      "Builds lats, biceps, and grip while improving shoulder stability and posture."
  },
  {
    tag: "PUSH",
    keywords: ["push up", "push-up", "pushup", "pushups"],
    titleSuffix: "Pressing Technique Guide",
    image: EXERCISE_IMAGE_ASSETS.push,
    imageAlt: "Athlete performing push-up training",
    how:
      "Keep your body in one line, lower under control, and press up while maintaining trunk tension.",
    why:
      "Builds pressing strength and coordination across chest, shoulders, triceps, and core."
  },
  {
    tag: "LEGS",
    keywords: ["squat", "squats", "lunge", "lunges"],
    titleSuffix: "Lower-Body Technique Guide",
    image: EXERCISE_IMAGE_ASSETS.legs,
    imageAlt: "Athlete performing lower-body training",
    how:
      "Control knee alignment and hip motion through each rep while keeping a stable torso.",
    why:
      "Improves leg strength, balance, and durability for high-volume training."
  },
  {
    tag: "CORE",
    keywords: ["plank", "planks", "hollow hold", "hollow body"],
    titleSuffix: "Core Stability Guide",
    image: EXERCISE_IMAGE_ASSETS.core,
    imageAlt: "Athlete practicing core training",
    how:
      "Brace deeply, avoid spinal collapse, and move with slow controlled tempo.",
    why:
      "Core control transfers force better and protects the lower back."
  },
  {
    tag: "MOBILITY",
    keywords: ["stretch", "mobility", "yoga", "pose", "cat cow", "downward dog", "pigeon"],
    titleSuffix: "Mobility Technique Guide",
    image: EXERCISE_IMAGE_ASSETS.mobility,
    imageAlt: "Athlete performing mobility and stretching practice",
    how:
      "Move slowly into end ranges with calm breathing and no pain.",
    why:
      "Improves recovery, joint range, and long-term movement quality."
  }
];

const TRAINING_GUIDE_TEMPLATES = [
  {
    tag: "PULL",
    keywords: [
      "chin up",
      "chin-up",
      "chinup",
      "chinups",
      "pull up",
      "pull-up",
      "pullup",
      "pullups",
      "row",
      "rows",
      "inverted row",
      "lat pulldown",
      "lat pull down",
      "dead hang"
    ],
    image: EXERCISE_IMAGE_ASSETS.pull,
    imageAlt: "Athlete performing pull-up training in a gym",
    how:
      "Lead with elbows and shoulder blades, avoid swinging, and control both concentric and eccentric phases.",
    why:
      "Improves upper-back strength, grip capacity, and posture."
  },
  {
    tag: "PUSH",
    keywords: ["push up", "pushup", "push-up", "press up", "dips", "bench press", "chest press"],
    image: EXERCISE_IMAGE_ASSETS.push,
    imageAlt: "Athlete performing push-up training",
    how:
      "Keep body rigid, lower with control, and press back up without shoulder collapse.",
    why:
      "Builds chest, triceps, shoulders, and anti-extension core strength."
  },
  {
    tag: "LEGS",
    keywords: ["squat", "squats", "lunge", "lunges", "split squat", "deadlift", "calf raise", "step up"],
    image: EXERCISE_IMAGE_ASSETS.legs,
    imageAlt: "Athlete performing lower-body training",
    how:
      "Track knees with toes, keep torso controlled, and maintain stable foot pressure through each rep.",
    why:
      "Lower-body strength supports speed, balance, and power."
  },
  {
    tag: "CORE",
    keywords: ["plank", "planks", "core", "sit up", "sit-up", "crunch", "hollow", "mountain climber", "leg raise"],
    image: EXERCISE_IMAGE_ASSETS.core,
    imageAlt: "Athlete practicing core training",
    how:
      "Keep ribs down, spine neutral, and tempo controlled with no momentum cheating.",
    why:
      "Core endurance improves movement efficiency and reduces injury risk."
  },
  {
    tag: "CARDIO",
    keywords: ["run", "jog", "sprint", "cardio", "jump rope", "skip", "burpee", "high knees", "cycling"],
    image: EXERCISE_IMAGE_ASSETS.cardio,
    imageAlt: "Athletes doing cardio drills in a fitness studio",
    how:
      "Use upright posture, controlled breathing, and consistent effort across the full interval.",
    why:
      "Improves conditioning, recovery speed, and overall work capacity."
  },
  {
    tag: "MOBILITY",
    keywords: ["breath", "breathing", "mobility", "stretch", "yoga", "warm up", "warm-up", "cooldown", "pose"],
    image: EXERCISE_IMAGE_ASSETS.mobility,
    imageAlt: "Athlete performing mobility and stretching practice",
    how:
      "Move into positions gradually, breathe deeply, and avoid forcing painful ranges.",
    why:
      "Supports tissue recovery and keeps joints moving freely."
  }
];

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getStorageKeyForUid(uid) {
  return `${STORAGE_KEY_PREFIX}:${uid}`;
}

function getStorageKeyForCurrentUser() {
  if (!currentUser || !currentUser.uid) {
    return null;
  }
  return getStorageKeyForUid(currentUser.uid);
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

function initializeAuthService() {
  if (authService) {
    return true;
  }

  if (typeof firebase === "undefined" || !hasValidFirebaseConfig()) {
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  authService = firebase.auth();

  if (typeof firebase.firestore === "function") {
    try {
      firestoreService = firebase.firestore();
      cloudSyncStatusText = "Cloud sync: ready";
    } catch (error) {
      firestoreService = null;
      cloudSyncStatusText = "Cloud sync: unavailable";
    }
  } else {
    firestoreService = null;
    cloudSyncStatusText = "Cloud sync: unavailable";
  }

  return true;
}

function redirectToAuthPage(query = "") {
  const suffix = query ? `?${query}` : "";
  window.location.replace(`login.html${suffix}`);
}

function updateSignedInLabel() {
  if (!elements.userEmailLabel) {
    return;
  }

  if (!currentUser || !currentUser.email) {
    elements.userEmailLabel.textContent = "Not signed in";
    return;
  }

  elements.userEmailLabel.textContent = currentUser.email;
}

function signOutCurrentUser() {
  clearSessionTimer();
  if (cloudSaveTimerId !== null) {
    window.clearTimeout(cloudSaveTimerId);
    cloudSaveTimerId = null;
  }

  if (!authService) {
    redirectToAuthPage();
    return;
  }

  authService.signOut().catch(() => {
    redirectToAuthPage();
  });
}

function setCloudSyncStatus(text) {
  cloudSyncStatusText = text;
  if (elements.cloudSyncStatus) {
    elements.cloudSyncStatus.textContent = text;
  }
}

function getCloudUserDocument() {
  if (!firestoreService || !currentUser || !currentUser.uid) {
    return null;
  }

  return firestoreService.collection("dashboards").doc(currentUser.uid);
}

function queueCloudSave() {
  if (!firestoreService || !currentUser) {
    return;
  }

  if (cloudSaveTimerId !== null) {
    window.clearTimeout(cloudSaveTimerId);
  }

  cloudSaveTimerId = window.setTimeout(() => {
    cloudSaveTimerId = null;
    pushCloudState();
  }, 600);
}

async function pushCloudState() {
  const userDoc = getCloudUserDocument();
  if (!userDoc) {
    return;
  }

  try {
    setCloudSyncStatus("Cloud sync: syncing...");
    await userDoc.set(
      {
        updatedAt: appState.updatedAt,
        state: appState
      },
      { merge: true }
    );
    setCloudSyncStatus("Cloud sync: up to date");
  } catch (error) {
    setCloudSyncStatus("Cloud sync: offline");
  }
}

async function pullCloudState() {
  const userDoc = getCloudUserDocument();
  if (!userDoc) {
    return;
  }

  try {
    setCloudSyncStatus("Cloud sync: checking...");
    const snapshot = await userDoc.get();
    if (!snapshot.exists) {
      setCloudSyncStatus("Cloud sync: local baseline");
      return;
    }

    const payload = snapshot.data();
    if (!payload || !payload.state) {
      setCloudSyncStatus("Cloud sync: local baseline");
      return;
    }

    const cloudState = normalizeStatePayload(payload.state);
    const localUpdatedAt = Number.isFinite(appState.updatedAt) ? appState.updatedAt : 0;
    const cloudUpdatedAt = Number.isFinite(cloudState.updatedAt) ? cloudState.updatedAt : 0;

    if (cloudUpdatedAt > localUpdatedAt) {
      appState = rolloverIfNeeded(cloudState);
      saveState({ skipCloud: true });
      render();
      setCloudSyncStatus("Cloud sync: pulled latest");
      return;
    }

    if (localUpdatedAt > cloudUpdatedAt) {
      queueCloudSave();
    }

    setCloudSyncStatus("Cloud sync: up to date");
  } catch (error) {
    setCloudSyncStatus("Cloud sync: offline");
  }
}

function startAppRuntimeOnce() {
  if (hasStartedAppRuntime) {
    return;
  }

  initScrollEffects();
  initCustomCursor();
  populateExerciseSuggestions();
  setCloudSyncStatus(cloudSyncStatusText);
  sessionState.totalRounds = normalizeSessionConfig(appState.sessionConfig).rounds;
  bindEvents();
  scheduleMidnightReset();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      applyDailyResetBoundary();
      scheduleMidnightReset();
    }
  });

  hasStartedAppRuntime = true;
}

function normalizeExerciseLookup(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeExerciseToken(token) {
  const base = String(token || "").toLowerCase().trim();
  if (!base) {
    return "";
  }

  if (base.endsWith("s") && base.length > 3 && !base.endsWith("ss")) {
    return base.slice(0, -1);
  }

  return base;
}

function createExerciseLookupModel(value) {
  const normalized = normalizeExerciseLookup(value);
  const compact = normalized.replace(/\s+/g, "");
  const tokens = new Set();

  normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      tokens.add(token);
      tokens.add(normalizeExerciseToken(token));
    });

  if (compact) {
    tokens.add(compact);
    tokens.add(normalizeExerciseToken(compact));
  }

  return {
    normalized,
    compact,
    tokens
  };
}

function scoreKeywordMatch(lookupModel, keyword) {
  const normalizedKeyword = normalizeExerciseLookup(keyword);
  if (!normalizedKeyword) {
    return 0;
  }

  const keywordTokens = normalizedKeyword
    .split(" ")
    .map((token) => normalizeExerciseToken(token))
    .filter(Boolean);
  const compactKeyword = normalizeExerciseToken(normalizedKeyword.replace(/\s+/g, ""));

  let score = 0;

  if (lookupModel.normalized.includes(normalizedKeyword)) {
    score += keywordTokens.length > 1 ? 6 : 5;
  }

  if (compactKeyword && lookupModel.tokens.has(compactKeyword)) {
    score += 4;
  }

  if (keywordTokens.length > 0) {
    const matchedTokens = keywordTokens.filter((token) => lookupModel.tokens.has(token)).length;
    if (matchedTokens === keywordTokens.length) {
      score += 4;
    } else if (matchedTokens > 0) {
      score += 2;
    }
  }

  return score;
}

function scoreGuideTemplate(lookupModel, template) {
  let bestScore = 0;

  template.keywords.forEach((keyword) => {
    const score = scoreKeywordMatch(lookupModel, keyword);
    if (score > bestScore) {
      bestScore = score;
    }
  });

  return bestScore;
}

function findExerciseIntentOverride(lookupModel) {
  for (const rule of EXERCISE_INTENT_OVERRIDES) {
    const score = scoreGuideTemplate(lookupModel, rule);
    if (score >= 8) {
      return rule;
    }
  }

  return null;
}

function cleanExerciseTitle(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized || "Custom Exercise";
}

function getExerciseMatchText(value) {
  const title = cleanExerciseTitle(value);
  const stripped = title
    .replace(/\b\d+\s*(x|×)\s*\d+\b/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\b(reps?|rep|sets?|set|seconds?|secs?|minutes?|mins?|min)\b/gi, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped || title;
}

function scoreExerciseLibraryEntry(lookupModel, entry) {
  let bestScore = scoreKeywordMatch(lookupModel, entry.name);

  entry.aliases.forEach((alias) => {
    const score = scoreKeywordMatch(lookupModel, alias);
    if (score > bestScore) {
      bestScore = score;
    }
  });

  const canonicalName = normalizeExerciseLookup(entry.name);
  if (lookupModel.normalized === canonicalName) {
    bestScore += 2;
  }

  return bestScore;
}

function findKnownExerciseLibraryEntry(lookupModel) {
  let bestEntry = null;
  let bestScore = 0;

  EXERCISE_LIBRARY.forEach((entry) => {
    const score = scoreExerciseLibraryEntry(lookupModel, entry);
    if (score > bestScore) {
      bestEntry = entry;
      bestScore = score;
    }
  });

  if (!bestEntry || bestScore < 7) {
    return null;
  }

  return bestEntry;
}

function populateExerciseSuggestions() {
  if (!elements.exerciseSuggestions || elements.exerciseSuggestions.dataset.ready === "true") {
    return;
  }

  const names = EXERCISE_LIBRARY.map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  const seen = new Set();
  const fragment = document.createDocumentFragment();

  names.forEach((name) => {
    const normalized = normalizeExerciseLookup(name);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);

    const option = document.createElement("option");
    option.value = name;
    fragment.appendChild(option);
  });

  elements.exerciseSuggestions.innerHTML = "";
  elements.exerciseSuggestions.appendChild(fragment);
  elements.exerciseSuggestions.dataset.ready = "true";
}

function getStoryExerciseSignature(exercises) {
  return exercises
    .map((item) => `${item.id}:${cleanExerciseTitle(item.title)}`)
    .join("|");
}

function getGuideForExercise(exerciseTitle) {
  const title = cleanExerciseTitle(exerciseTitle);
  const lookupModel = createExerciseLookupModel(getExerciseMatchText(title));

  const knownEntry = findKnownExerciseLibraryEntry(lookupModel);
  if (knownEntry) {
    return {
      tag: knownEntry.tag,
      cardTitle: title,
      canonicalName: knownEntry.name,
      sceneTitle: `${knownEntry.name}: Training Guide`,
      how: knownEntry.how,
      why: knownEntry.why,
      image: knownEntry.image,
      imageAlt: knownEntry.imageAlt
    };
  }

  const override = findExerciseIntentOverride(lookupModel);
  if (override) {
    return {
      tag: override.tag,
      cardTitle: title,
      canonicalName: title,
      sceneTitle: `${title}: ${override.titleSuffix}`,
      how: override.how,
      why: override.why,
      image: override.image,
      imageAlt: override.imageAlt
    };
  }

  let bestTemplate = null;
  let bestTemplateScore = 0;

  TRAINING_GUIDE_TEMPLATES.forEach((template) => {
    const score = scoreGuideTemplate(lookupModel, template);
    if (score > bestTemplateScore) {
      bestTemplate = template;
      bestTemplateScore = score;
    }
  });

  if (!bestTemplate || bestTemplateScore < 6) {
    return {
      tag: "CUSTOM",
      cardTitle: title,
      canonicalName: title,
      sceneTitle: `${title}: Technique Guide`,
      how:
        "Start with lighter intensity, use a smooth controlled range, and stop the set when your form begins to break.",
      why:
        "Consistent quality reps build strength safely and reduce injury risk over long-term training.",
      image: STORY_FALLBACK_IMAGE,
      imageAlt: `Person performing ${title}`
    };
  }

  return {
    tag: bestTemplate.tag,
    cardTitle: title,
    canonicalName: title,
    sceneTitle: `${title}: Training Guide`,
    how: bestTemplate.how,
    why: bestTemplate.why,
    image: bestTemplate.image,
    imageAlt: bestTemplate.imageAlt
  };
}

function toIntInRange(value, { min = 0, max = Number.POSITIVE_INFINITY, fallback = null } = {}) {
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

function normalizeDifficulty(value) {
  const normalized = String(value || "").toLowerCase().trim();
  return EXERCISE_DIFFICULTY_VALUES.includes(normalized) ? normalized : "medium";
}

function getExerciseMetadata(title) {
  const guide = getGuideForExercise(title);
  const canonicalName = cleanExerciseTitle(guide.canonicalName || title);
  const key = normalizeExerciseLookup(canonicalName).replace(/\s+/g, "-") || uid();
  const group = String(guide.tag || "CUSTOM").toUpperCase();

  return {
    key,
    group,
    canonicalName
  };
}

function parseExercisePresetFromTitle(title) {
  const value = String(title || "");
  const setsRepsMatch = value.match(/(\d+)\s*(?:x|×)\s*(\d+)/i);
  if (setsRepsMatch) {
    return {
      sets: toIntInRange(setsRepsMatch[1], { min: 1, max: 20, fallback: null }),
      reps: toIntInRange(setsRepsMatch[2], { min: 1, max: 400, fallback: null }),
      seconds: null
    };
  }

  const minuteMatch = value.match(/(\d+)\s*(?:minutes?|mins?|min)\b/i);
  if (minuteMatch) {
    const minutes = toIntInRange(minuteMatch[1], { min: 1, max: 120, fallback: null });
    return {
      sets: 1,
      reps: null,
      seconds: minutes ? minutes * 60 : null
    };
  }

  const secondMatch = value.match(/(\d+)\s*(?:seconds?|secs?|sec|s)\b/i);
  if (secondMatch) {
    return {
      sets: 1,
      reps: null,
      seconds: toIntInRange(secondMatch[1], { min: 5, max: 3600, fallback: null })
    };
  }

  const repMatch = value.match(/(\d+)\s*(?:reps?|rep)\b/i);
  if (repMatch) {
    return {
      sets: 1,
      reps: toIntInRange(repMatch[1], { min: 1, max: 400, fallback: null }),
      seconds: null
    };
  }

  return {
    sets: null,
    reps: null,
    seconds: null
  };
}

function normalizeExerciseItem(item, fallbackTitle = "Custom Exercise") {
  const title = cleanExerciseTitle(typeof item.title === "string" ? item.title : fallbackTitle);
  const preset = parseExercisePresetFromTitle(title);
  const sets = toIntInRange(item.sets, { min: 1, max: 20, fallback: preset.sets });
  const reps = toIntInRange(item.reps, { min: 1, max: 400, fallback: preset.reps });
  const seconds = toIntInRange(item.seconds, { min: 5, max: 3600, fallback: preset.seconds });
  const restSeconds = toIntInRange(item.restSeconds, { min: 0, max: 900, fallback: 60 });
  const metadata = getExerciseMetadata(title);

  return {
    id: typeof item.id === "string" ? item.id : uid(),
    title,
    done: Boolean(item.done),
    sets,
    reps,
    seconds,
    restSeconds,
    difficulty: normalizeDifficulty(item.difficulty),
    group: metadata.group,
    progressKey: metadata.key,
    canonicalName: metadata.canonicalName
  };
}

function normalizeTaskItem(item) {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  if (!title) {
    return null;
  }

  return {
    id: typeof item.id === "string" ? item.id : uid(),
    title,
    done: Boolean(item.done)
  };
}

function formatExercisePrescription(item) {
  const fragments = [];
  if (item.sets && item.reps) {
    fragments.push(`${item.sets} x ${item.reps}`);
  } else if (item.reps) {
    fragments.push(`${item.reps} reps`);
  }

  if (item.seconds) {
    fragments.push(`${item.seconds}s`);
  }

  if (Number.isFinite(item.restSeconds) && item.restSeconds > 0) {
    fragments.push(`rest ${item.restSeconds}s`);
  }

  const difficultyLabel = String(item.difficulty || "medium").toUpperCase();
  fragments.push(difficultyLabel);

  return fragments.join(" • ");
}

function calculateExerciseVolume(item) {
  if (!item || !item.done) {
    return 0;
  }

  const sets = Number.isFinite(item.sets) && item.sets > 0 ? item.sets : 1;
  const reps = Number.isFinite(item.reps) && item.reps > 0 ? item.reps : 0;
  const seconds = Number.isFinite(item.seconds) && item.seconds > 0 ? item.seconds : 0;
  const repScore = sets * reps;
  const timeScore = Math.round((sets * seconds) / 10);
  return Math.max(repScore, timeScore, sets * 6);
}

function normalizeSessionConfig(config) {
  const input = config && typeof config === "object" ? config : {};
  return {
    workSeconds: toIntInRange(input.workSeconds, { min: 10, max: 3600, fallback: DEFAULT_SESSION_CONFIG.workSeconds }),
    restSeconds: toIntInRange(input.restSeconds, { min: 5, max: 1800, fallback: DEFAULT_SESSION_CONFIG.restSeconds }),
    rounds: toIntInRange(input.rounds, { min: 1, max: 50, fallback: DEFAULT_SESSION_CONFIG.rounds })
  };
}

function normalizeMotivationState(motivation) {
  const input = motivation && typeof motivation === "object" ? motivation : {};
  const frozenDates = Array.isArray(input.frozenDates)
    ? input.frozenDates.filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)))
    : [];
  const badges = Array.isArray(input.badges) ? input.badges.filter((badge) => typeof badge === "string") : [];
  const awardedFreezeWeeks = Array.isArray(input.awardedFreezeWeeks)
    ? input.awardedFreezeWeeks.filter((weekKey) => /^\d{4}-W\d{2}$/.test(String(weekKey)))
    : [];

  return {
    weeklyGoal: toIntInRange(input.weeklyGoal, { min: 1, max: 7, fallback: DEFAULT_MOTIVATION_STATE.weeklyGoal }),
    freezeCredits: toIntInRange(input.freezeCredits, { min: 0, max: 3, fallback: DEFAULT_MOTIVATION_STATE.freezeCredits }),
    frozenDates,
    badges,
    challengeTargetGroups: toIntInRange(input.challengeTargetGroups, {
      min: 2,
      max: 6,
      fallback: DEFAULT_MOTIVATION_STATE.challengeTargetGroups
    }),
    awardedFreezeWeeks
  };
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

function formatTimer(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function getGuideCoachingDetails(guide) {
  const byTag = {
    PULL: {
      cue: "Initiate each rep from the shoulder blades before pulling with the arms.",
      mistake: "Avoid kicking or overextending your lower back to force extra reps.",
      progression: "Progression: add 1 strict rep or a 2-second controlled descent."
    },
    PUSH: {
      cue: "Keep ribs down and elbows stacked so pressing force travels cleanly.",
      mistake: "Do not flare elbows too wide or let hips sag on fatigue.",
      progression: "Progression: add 2 reps per set before increasing difficulty variation."
    },
    LEGS: {
      cue: "Grip the floor with your feet and keep knee tracking aligned through each rep.",
      mistake: "Avoid collapsing knees inward or bouncing at the bottom position.",
      progression: "Progression: slow your lowering phase to 3 seconds for control and strength."
    },
    CORE: {
      cue: "Brace around your entire midsection and control breathing under tension.",
      mistake: "Do not compensate with neck strain or momentum swings.",
      progression: "Progression: increase hold time by 5-10 seconds while maintaining form."
    },
    CARDIO: {
      cue: "Hold a sustainable pace and keep breathing cadence steady.",
      mistake: "Avoid sprinting too early and fading before interval completion.",
      progression: "Progression: add 1 round or increase work interval by 10 seconds."
    },
    MOBILITY: {
      cue: "Use slow nasal breaths to relax into each range without forcing depth.",
      mistake: "Avoid painful end ranges or holding your breath in stretches.",
      progression: "Progression: add one extra mobility set with the same smooth tempo."
    },
    CUSTOM: {
      cue: "Prioritize controlled reps and stable body positions.",
      mistake: "Avoid chasing speed when range or posture is not controlled.",
      progression: "Progression: increase either quality reps or time, not both at once."
    }
  };

  return byTag[guide.tag] || byTag.CUSTOM;
}

function buildStoryStepNode(exercise, index) {
  const guide = getGuideForExercise(exercise.title);
  const coaching = getGuideCoachingDetails(guide);
  const stepNumber = index + 1;

  const article = document.createElement("article");
  article.className = index === 0 ? "panel story-step scroll-pop is-active" : "panel story-step scroll-pop";
  article.dataset.animate = "true";
  article.dataset.repeat = "true";
  article.dataset.delay = (Math.min(index, 8) * 0.04 + 0.04).toFixed(2);
  article.dataset.storyStep = "true";
  article.dataset.step = String(stepNumber);
  article.dataset.title = guide.sceneTitle;
  article.dataset.copy = `How: ${guide.how} Why: ${guide.why} Coach cue: ${coaching.cue}`;
  article.dataset.image = guide.image;
  article.dataset.imageAlt = guide.imageAlt;
  article.dataset.distort = "true";

  const figure = document.createElement("figure");
  figure.className = "story-image-wrap";

  const image = document.createElement("img");
  image.className = "story-image";
  image.src = guide.image;
  image.alt = guide.imageAlt;
  image.loading = "lazy";
  image.decoding = "async";
  figure.appendChild(image);

  const indexLabel = document.createElement("p");
  indexLabel.className = "story-index";
  indexLabel.textContent = `${String(stepNumber).padStart(2, "0")} / ${guide.tag}`;

  const heading = document.createElement("h3");
  heading.textContent = guide.cardTitle;

  const how = document.createElement("p");
  const howStrong = document.createElement("strong");
  howStrong.textContent = "How to perform:";
  how.appendChild(howStrong);
  how.append(` ${guide.how}`);

  const why = document.createElement("p");
  const whyStrong = document.createElement("strong");
  whyStrong.textContent = "Why it is important:";
  why.appendChild(whyStrong);
  why.append(` ${guide.why}`);

  const cue = document.createElement("p");
  const cueStrong = document.createElement("strong");
  cueStrong.textContent = "Coach cue:";
  cue.appendChild(cueStrong);
  cue.append(` ${coaching.cue}`);

  const mistake = document.createElement("p");
  const mistakeStrong = document.createElement("strong");
  mistakeStrong.textContent = "Common mistake:";
  mistake.appendChild(mistakeStrong);
  mistake.append(` ${coaching.mistake}`);

  const progression = document.createElement("p");
  const progressionStrong = document.createElement("strong");
  progressionStrong.textContent = "Progression:";
  progression.appendChild(progressionStrong);
  progression.append(` ${coaching.progression}`);

  article.appendChild(figure);
  article.appendChild(indexLabel);
  article.appendChild(heading);
  article.appendChild(how);
  article.appendChild(why);
  article.appendChild(cue);
  article.appendChild(mistake);
  article.appendChild(progression);

  return article;
}

function buildEmptyStoryStep() {
  const article = document.createElement("article");
  article.className = "panel story-step story-empty scroll-pop is-active";
  article.dataset.animate = "true";
  article.dataset.repeat = "true";
  article.dataset.delay = "0.04";
  article.dataset.storyStep = "true";
  article.dataset.step = "1";
  article.dataset.title = "Add Exercises To Generate Training Cards";
  article.dataset.copy =
    "How: Add an exercise from the Training Exercises section. Why: Each exercise automatically creates a card with form guidance and importance for your own dashboard.";
  article.dataset.image = STORY_FALLBACK_IMAGE;
  article.dataset.imageAlt = "Athlete running on track";
  article.dataset.distort = "true";

  const figure = document.createElement("figure");
  figure.className = "story-image-wrap";

  const image = document.createElement("img");
  image.className = "story-image";
  image.src = STORY_FALLBACK_IMAGE;
  image.alt = "Athlete running on track";
  image.loading = "lazy";
  image.decoding = "async";
  figure.appendChild(image);

  const indexLabel = document.createElement("p");
  indexLabel.className = "story-index";
  indexLabel.textContent = "00 / READY";

  const heading = document.createElement("h3");
  heading.textContent = "Add Your First Exercise";

  const body = document.createElement("p");
  body.textContent =
    "Use Add Exercise below. A training guide card with picture, form tips, and why it matters will appear automatically for your account.";

  article.appendChild(figure);
  article.appendChild(indexLabel);
  article.appendChild(heading);
  article.appendChild(body);

  return article;
}

function renderStorySteps(exercises) {
  if (!elements.storySteps) {
    return;
  }

  elements.storySteps.innerHTML = "";
  const fragment = document.createDocumentFragment();

  if (exercises.length === 0) {
    fragment.appendChild(buildEmptyStoryStep());
  } else {
    exercises.forEach((exercise, index) => {
      fragment.appendChild(buildStoryStepNode(exercise, index));
    });
  }

  elements.storySteps.appendChild(fragment);
}

function bootstrapAuthGate() {
  if (!initializeAuthService()) {
    showAppDialog({
      title: "Firebase Config Needed",
      message:
        "Set your Firebase keys in firebase-config.js to enable email login and per-user dashboards.",
      confirmLabel: "Okay",
      tone: "warning"
    });
    return;
  }

  authService.onAuthStateChanged((user) => {
    clearSessionTimer();
    sessionState.running = false;
    sessionState.paused = false;
    sessionState.phase = "idle";
    sessionState.round = 0;
    sessionState.remainingSeconds = 0;

    if (!user) {
      currentUser = null;
      redirectToAuthPage();
      return;
    }

    if (!user.emailVerified) {
      authService.signOut().catch(() => {});
      redirectToAuthPage("verify=1");
      return;
    }

    currentUser = user;
    updateSignedInLabel();
    appState = rolloverIfNeeded(loadState());
    saveState();
    startAppRuntimeOnce();
    render();

    if (firestoreService) {
      pullCloudState();
    } else {
      setCloudSyncStatus("Cloud sync: unavailable");
    }
  });
}

function isTodayLocked(state = appState) {
  return state.lockDate === getDateKey();
}

function blockWhenLocked() {
  if (!isTodayLocked(appState)) {
    return false;
  }

  if (elements.statusMessage) {
    elements.statusMessage.textContent = "Training is saved for today. It unlocks automatically after 12:00 AM.";
  }
  return true;
}

function closeAppDialog(result = false) {
  if (!elements.appDialogOverlay || !isDialogOpen) {
    return;
  }

  elements.appDialogOverlay.classList.remove("open");
  elements.appDialogOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialog-open");

  const resolve = dialogResolve;
  dialogResolve = null;
  isDialogOpen = false;

  if (resolve) {
    resolve(Boolean(result));
  }
}

function showAppDialog({ title, message, confirmLabel = "Okay", cancelLabel = null, tone = "info" }) {
  if (
    !elements.appDialogOverlay ||
    !elements.appDialogCard ||
    !elements.appDialogTitle ||
    !elements.appDialogMessage ||
    !elements.appDialogConfirmBtn ||
    !elements.appDialogCancelBtn
  ) {
    if (cancelLabel) {
      return Promise.resolve(window.confirm(message));
    }
    window.alert(message);
    return Promise.resolve(true);
  }

  if (isDialogOpen) {
    closeAppDialog(false);
  }

  elements.appDialogTitle.textContent = title;
  elements.appDialogMessage.textContent = message;
  elements.appDialogConfirmBtn.textContent = confirmLabel;
  elements.appDialogCard.dataset.tone = tone;

  if (cancelLabel) {
    elements.appDialogCancelBtn.hidden = false;
    elements.appDialogCancelBtn.disabled = false;
    elements.appDialogCancelBtn.textContent = cancelLabel;
  } else {
    elements.appDialogCancelBtn.hidden = true;
    elements.appDialogCancelBtn.disabled = true;
  }

  elements.appDialogOverlay.classList.add("open");
  elements.appDialogOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("dialog-open");
  isDialogOpen = true;

  const focusTarget = cancelLabel ? elements.appDialogCancelBtn : elements.appDialogConfirmBtn;
  window.requestAnimationFrame(() => {
    focusTarget.focus();
  });

  return new Promise((resolve) => {
    dialogResolve = resolve;
  });
}

function initAppDialog() {
  if (
    !elements.appDialogOverlay ||
    !elements.appDialogConfirmBtn ||
    !elements.appDialogCancelBtn ||
    elements.appDialogOverlay.dataset.bound === "true"
  ) {
    return;
  }

  elements.appDialogOverlay.dataset.bound = "true";

  elements.appDialogConfirmBtn.addEventListener("click", () => {
    closeAppDialog(true);
  });

  elements.appDialogCancelBtn.addEventListener("click", () => {
    closeAppDialog(false);
  });

  elements.appDialogOverlay.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("[data-dialog-close='cancel']")) {
      closeAppDialog(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!isDialogOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeAppDialog(false);
      return;
    }

    if (event.key === "Enter" && document.activeElement !== elements.appDialogCancelBtn) {
      event.preventDefault();
      closeAppDialog(true);
    }
  });
}

function showResetLockedDialog() {
  return showAppDialog({
    title: "Training Locked",
    message: "Training is saved for today and cannot be reset now. It will reset automatically after 12:00 AM.",
    confirmLabel: "Understood",
    tone: "warning"
  });
}

function confirmResetDialog() {
  return showAppDialog({
    title: "Reset Training?",
    message: "This will clear all exercise and task checkmarks for today.",
    confirmLabel: "Reset",
    cancelLabel: "Cancel",
    tone: "warning"
  });
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

function getClosestStoryStepToAnchor(anchorY) {
  if (storySteps.length === 0) {
    return null;
  }

  let closestStep = storySteps[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  storySteps.forEach((step) => {
    const rect = step.getBoundingClientRect();
    const withinStep = anchorY >= rect.top && anchorY <= rect.bottom;
    const distance = withinStep ? 0 : Math.min(Math.abs(rect.top - anchorY), Math.abs(rect.bottom - anchorY));

    if (distance < closestDistance) {
      closestDistance = distance;
      closestStep = step;
    }
  });

  return closestStep;
}

function syncStoryStepFromViewport() {
  if (storySteps.length === 0) {
    return;
  }

  const anchorY = window.innerHeight * 0.42;
  const nextStep = getClosestStoryStepToAnchor(anchorY);
  if (!nextStep || nextStep === activeStoryStep) {
    return;
  }

  applyStoryStep(nextStep);
}

function paintScrollEffects() {
  scrollFxRaf = null;

  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  const scrollLine = document.getElementById("scrollLine");

  if (scrollLine) {
    scrollLine.style.transform = `scaleX(${progress})`;
  }

  if (!prefersReducedMotion && parallaxNodes.length > 0) {
    const scrollY = window.scrollY;
    parallaxNodes.forEach((node) => {
      const rawSpeed = Number(node.dataset.parallax);
      const speed = Number.isFinite(rawSpeed) ? rawSpeed : 0;
      const shift = Math.round(scrollY * speed);
      node.style.transform = `translate3d(0, ${shift}px, 0)`;
    });
  }

  syncStoryStepFromViewport();

  if (storyImageNodes.length === 0 || prefersReducedMotion) {
    return;
  }

  const viewportHalf = window.innerHeight * 0.5;
  storyImageNodes.forEach((image) => {
    const rect = image.getBoundingClientRect();
    const center = rect.top + rect.height * 0.5;
    const ratio = (center - viewportHalf) / Math.max(1, viewportHalf);
    const bounded = Math.max(-1, Math.min(1, ratio));
    const shift = Math.round(bounded * -22);
    image.style.setProperty("--img-shift", `${shift}px`);
  });
}

function requestScrollEffects() {
  if (scrollFxRaf !== null) {
    return;
  }
  scrollFxRaf = window.requestAnimationFrame(paintScrollEffects);
}

function initScrollEffects() {
  parallaxNodes = Array.from(document.querySelectorAll("[data-parallax]"));
  paintScrollEffects();
  window.addEventListener("scroll", requestScrollEffects, { passive: true });
  window.addEventListener("resize", requestScrollEffects);
}

function millisecondsUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(100, next.getTime() - now.getTime());
}

function applyDailyResetBoundary() {
  appState = rolloverIfNeeded(appState);
  saveState();
  render();
}

function scheduleMidnightReset() {
  if (midnightTimerId !== null) {
    window.clearTimeout(midnightTimerId);
  }

  midnightTimerId = window.setTimeout(() => {
    applyDailyResetBoundary();
    scheduleMidnightReset();
  }, millisecondsUntilNextMidnight() + 400);
}

function updateSceneImage(stepNode) {
  if (!(stepNode instanceof HTMLElement) || !elements.sceneImage) {
    return;
  }

  const nextSrc = stepNode.dataset.image;
  if (!nextSrc) {
    return;
  }

  const nextAlt = stepNode.dataset.imageAlt || "Training story image";
  if (elements.sceneImage.dataset.currentSrc === nextSrc) {
    elements.sceneImage.alt = nextAlt;
    return;
  }

  sceneImageToken += 1;
  const token = sceneImageToken;
  const preloader = new Image();

  elements.sceneImage.classList.add("is-loading");
  preloader.src = nextSrc;

  preloader.onload = () => {
    if (token !== sceneImageToken || !elements.sceneImage) {
      return;
    }

    elements.sceneImage.src = nextSrc;
    elements.sceneImage.alt = nextAlt;
    elements.sceneImage.dataset.currentSrc = nextSrc;
    window.requestAnimationFrame(() => {
      if (elements.sceneImage) {
        elements.sceneImage.classList.remove("is-loading");
      }
    });
  };

  preloader.onerror = () => {
    if (token !== sceneImageToken || !elements.sceneImage) {
      return;
    }
    elements.sceneImage.classList.remove("is-loading");
  };
}

function smoothScrollTo(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start"
  });
}

function openMenuOverlay() {
  if (!elements.menuOverlay) {
    return;
  }

  elements.menuOverlay.classList.add("open");
  elements.menuOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("menu-open");
}

function closeMenuOverlay({ focusToggle = false } = {}) {
  if (!elements.menuOverlay) {
    return;
  }

  elements.menuOverlay.classList.remove("open");
  elements.menuOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("menu-open");

  if (focusToggle && elements.menuToggleBtn) {
    elements.menuToggleBtn.focus();
  }
}

function initMenuOverlay() {
  if (!elements.menuOverlay || !elements.menuToggleBtn || !elements.menuCloseBtn) {
    return;
  }

  elements.menuToggleBtn.addEventListener("click", () => {
    openMenuOverlay();
  });

  elements.menuCloseBtn.addEventListener("click", () => {
    closeMenuOverlay({ focusToggle: true });
  });

  elements.menuOverlay.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("[data-close-menu]")) {
      closeMenuOverlay({ focusToggle: true });
    }
  });

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.addEventListener("click", () => {
      const sectionId = button.dataset.scrollTarget;
      if (!sectionId) {
        return;
      }

      smoothScrollTo(sectionId);
      closeMenuOverlay({ focusToggle: true });
    });
  });

  document.querySelectorAll("[data-menu-action]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.addEventListener("click", () => {
      const action = button.dataset.menuAction;
      if (action === "save") {
        saveTrainingDay();
        closeMenuOverlay({ focusToggle: true });
        return;
      }

      if (action === "complete") {
        markEverythingDone();
        closeMenuOverlay({ focusToggle: true });
        return;
      }

      if (action === "reset") {
        if (isTodayLocked(appState)) {
          closeMenuOverlay({ focusToggle: true });
          showResetLockedDialog();
          return;
        }

        closeMenuOverlay({ focusToggle: true });
        confirmResetDialog().then((ok) => {
          if (ok) {
            resetToday();
          }
        });
      }
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.menuOverlay.classList.contains("open")) {
      closeMenuOverlay({ focusToggle: true });
    }
  });
}

function applyStoryStep(stepNode) {
  if (!(stepNode instanceof HTMLElement)) {
    return;
  }

  if (activeStoryStep === stepNode) {
    return;
  }

  activeStoryStep = stepNode;

  storySteps.forEach((step) => {
    step.classList.toggle("is-active", step === stepNode);
  });

  if (elements.sceneTitle && stepNode.dataset.title) {
    elements.sceneTitle.textContent = stepNode.dataset.title;
  }

  if (elements.sceneBody && stepNode.dataset.copy) {
    elements.sceneBody.textContent = stepNode.dataset.copy;
  }

  updateSceneImage(stepNode);

  const total = Math.max(1, storySteps.length);
  const rawStep = Number(stepNode.dataset.step);
  const current = Number.isFinite(rawStep) ? Math.min(Math.max(rawStep, 1), total) : 1;
  const percentage = Math.round((current / total) * 100);

  if (elements.sceneProgress) {
    elements.sceneProgress.style.width = `${percentage}%`;
  }
}

function initStoryScene() {
  if (storyObserver) {
    storyObserver.disconnect();
    storyObserver = null;
  }

  storySteps = Array.from(document.querySelectorAll("[data-story-step]"));
  storyImageNodes = Array.from(document.querySelectorAll(".story-image"));
  activeStoryStep = null;
  if (storySteps.length === 0) {
    if (elements.sceneProgress) {
      elements.sceneProgress.style.width = "0%";
    }
    return;
  }

  if (elements.sceneImage && elements.sceneImage.currentSrc) {
    elements.sceneImage.dataset.currentSrc = elements.sceneImage.currentSrc;
  }

  applyStoryStep(storySteps[0]);
  requestScrollEffects();
  syncStoryStepFromViewport();

  if (prefersReducedMotion || !supportsIntersectionObserver) {
    return;
  }

  storyObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        applyStoryStep(visible[0].target);
      }
    },
    {
      threshold: [0.35, 0.5, 0.75],
      rootMargin: "-18% 0px -30% 0px"
    }
  );

  storySteps.forEach((step) => {
    storyObserver.observe(step);
  });
}

function bindDistortionNode(node) {
  if (node.dataset.distortBound === "true") {
    return;
  }

  node.dataset.distortBound = "true";

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

function initHoverDistortion(scope = document) {
  if (prefersReducedMotion) {
    return;
  }

  scope.querySelectorAll("[data-distort]").forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    bindDistortionNode(node);
  });
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

function createDefaultState() {
  const defaultExercises = DEFAULT_EXERCISES.map((title) =>
    normalizeExerciseItem({
      id: uid(),
      title,
      done: false,
      restSeconds: 60,
      difficulty: "medium"
    })
  );

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    lastActiveDate: getDateKey(),
    lockDate: null,
    exercises: defaultExercises,
    tasks: DEFAULT_TASKS.map((title) => ({
      id: uid(),
      title,
      done: false
    })),
    history: {},
    dailyExercisePerformance: {},
    exerciseProgress: {},
    motivation: { ...DEFAULT_MOTIVATION_STATE },
    sessionConfig: { ...DEFAULT_SESSION_CONFIG },
    cloud: {
      lastSyncedAt: null
    },
    updatedAt: Date.now()
  };
}

function normalizeItems(items, type = "task") {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (type === "exercise") {
        return normalizeExerciseItem(item);
      }

      return normalizeTaskItem(item);
    })
    .filter(Boolean);
}

function normalizeHistory(history) {
  if (!history || typeof history !== "object") {
    return {};
  }

  const nextHistory = {};
  Object.entries(history).forEach(([dateKey, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return;
    }

    const done = Number.isFinite(entry.done) ? Math.max(0, Math.round(entry.done)) : 0;
    const total = Number.isFinite(entry.total) ? Math.max(0, Math.round(entry.total)) : 0;
    const totalVolume = Number.isFinite(entry.totalVolume) ? Math.max(0, Math.round(entry.totalVolume)) : 0;

    const groupCounts = {};
    if (entry.groupCounts && typeof entry.groupCounts === "object") {
      Object.entries(entry.groupCounts).forEach(([group, count]) => {
        const safeCount = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
        if (safeCount > 0) {
          groupCounts[String(group).toUpperCase()] = safeCount;
        }
      });
    }

    nextHistory[dateKey] = {
      done,
      total,
      completed: total > 0 && done >= total,
      frozen: Boolean(entry.frozen),
      exerciseDone: Number.isFinite(entry.exerciseDone) ? Math.max(0, Math.round(entry.exerciseDone)) : 0,
      taskDone: Number.isFinite(entry.taskDone) ? Math.max(0, Math.round(entry.taskDone)) : 0,
      totalVolume,
      groupCounts
    };
  });

  return nextHistory;
}

function normalizeDailyExercisePerformance(dailyPerformance) {
  if (!dailyPerformance || typeof dailyPerformance !== "object") {
    return {};
  }

  const nextPerformance = {};
  Object.entries(dailyPerformance).forEach(([dateKey, dayEntry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !dayEntry || typeof dayEntry !== "object") {
      return;
    }

    const normalizedDay = {};
    Object.entries(dayEntry).forEach(([exerciseKey, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const key = String(exerciseKey).trim();
      if (!key) {
        return;
      }

      normalizedDay[key] = {
        name: cleanExerciseTitle(value.name || key),
        group: String(value.group || "CUSTOM").toUpperCase(),
        volume: Number.isFinite(value.volume) ? Math.max(0, Math.round(value.volume)) : 0,
        sets: toIntInRange(value.sets, { min: 1, max: 20, fallback: null }),
        reps: toIntInRange(value.reps, { min: 1, max: 400, fallback: null }),
        seconds: toIntInRange(value.seconds, { min: 5, max: 3600, fallback: null }),
        difficulty: normalizeDifficulty(value.difficulty)
      };
    });

    nextPerformance[dateKey] = normalizedDay;
  });

  return nextPerformance;
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
      name: cleanExerciseTitle(value.name || progressKey),
      group: String(value.group || "CUSTOM").toUpperCase(),
      sessions: Number.isFinite(value.sessions) ? Math.max(0, Math.round(value.sessions)) : 0,
      totalVolume: Number.isFinite(value.totalVolume) ? Math.max(0, Math.round(value.totalVolume)) : 0,
      bestVolume: Number.isFinite(value.bestVolume) ? Math.max(0, Math.round(value.bestVolume)) : 0,
      lastVolume: Number.isFinite(value.lastVolume) ? Math.max(0, Math.round(value.lastVolume)) : 0,
      lastDate: typeof value.lastDate === "string" ? value.lastDate : null,
      bestLoad: value.bestLoad && typeof value.bestLoad === "object" ? value.bestLoad : null
    };
  });

  return nextProgress;
}

function normalizeStatePayload(parsed) {
  const source = parsed && typeof parsed === "object" ? parsed : {};
  const base = createDefaultState();
  const nextState = {
    schemaVersion: STATE_SCHEMA_VERSION,
    lastActiveDate: typeof source.lastActiveDate === "string" ? source.lastActiveDate : base.lastActiveDate,
    lockDate:
      typeof source.lockDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.lockDate)
        ? source.lockDate
        : null,
    exercises: normalizeItems(source.exercises, "exercise"),
    tasks: normalizeItems(source.tasks, "task"),
    history: normalizeHistory(source.history),
    dailyExercisePerformance: normalizeDailyExercisePerformance(source.dailyExercisePerformance),
    exerciseProgress: normalizeExerciseProgress(source.exerciseProgress),
    motivation: normalizeMotivationState(source.motivation),
    sessionConfig: normalizeSessionConfig(source.sessionConfig),
    cloud: {
      lastSyncedAt:
        source.cloud && Number.isFinite(source.cloud.lastSyncedAt) ? Math.round(source.cloud.lastSyncedAt) : null
    },
    updatedAt: Number.isFinite(source.updatedAt) ? Math.round(source.updatedAt) : Date.now()
  };

  if (nextState.exercises.length === 0) {
    nextState.exercises = base.exercises;
  }

  if (nextState.tasks.length === 0) {
    nextState.tasks = base.tasks;
  }

  // Ensure all exercises have fresh metadata in case names changed or old schema was loaded.
  nextState.exercises = nextState.exercises.map((item) => normalizeExerciseItem(item));

  if (Object.keys(nextState.dailyExercisePerformance).length > 0) {
    rebuildExerciseProgress(nextState);
  }

  refreshMotivationState(nextState);
  return nextState;
}

function loadState() {
  const storageKey = getStorageKeyForCurrentUser();
  if (!storageKey) {
    return createDefaultState();
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw);
    return normalizeStatePayload(parsed);
  } catch (error) {
    return createDefaultState();
  }
}

function getProgress(state) {
  const completedExercises = state.exercises.filter((item) => item.done);
  const exerciseDone = completedExercises.length;
  const taskDone = state.tasks.filter((item) => item.done).length;
  const done = exerciseDone + taskDone;
  const total = state.exercises.length + state.tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const exerciseVolume = completedExercises.reduce((sum, item) => sum + calculateExerciseVolume(item), 0);
  const groupCountsDone = completedExercises.reduce((acc, item) => {
    const group = String(item.group || "CUSTOM").toUpperCase();
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  return { done, total, percent, exerciseDone, taskDone, exerciseVolume, groupCountsDone };
}

function trimHistory(state, keep = 90) {
  const keys = Object.keys(state.history).sort();
  if (keys.length <= keep) {
    return;
  }

  const removeKeys = keys.slice(0, keys.length - keep);
  removeKeys.forEach((key) => {
    delete state.history[key];
    if (state.dailyExercisePerformance && state.dailyExercisePerformance[key]) {
      delete state.dailyExercisePerformance[key];
    }
  });
}

function rebuildExerciseProgress(state) {
  const nextProgress = {};
  const dates = Object.keys(state.dailyExercisePerformance || {}).sort();

  dates.forEach((dateKey) => {
    const dayPerformance = state.dailyExercisePerformance[dateKey];
    if (!dayPerformance || typeof dayPerformance !== "object") {
      return;
    }

    Object.entries(dayPerformance).forEach(([exerciseKey, entry]) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      if (!nextProgress[exerciseKey]) {
        nextProgress[exerciseKey] = {
          name: cleanExerciseTitle(entry.name || exerciseKey),
          group: String(entry.group || "CUSTOM").toUpperCase(),
          sessions: 0,
          totalVolume: 0,
          bestVolume: 0,
          lastVolume: 0,
          lastDate: null,
          bestLoad: null
        };
      }

      const progress = nextProgress[exerciseKey];
      const volume = Number.isFinite(entry.volume) ? Math.max(0, Math.round(entry.volume)) : 0;

      progress.sessions += 1;
      progress.totalVolume += volume;
      progress.lastVolume = volume;
      progress.lastDate = dateKey;

      if (volume >= progress.bestVolume) {
        progress.bestVolume = volume;
        progress.bestLoad = {
          sets: toIntInRange(entry.sets, { min: 1, max: 20, fallback: null }),
          reps: toIntInRange(entry.reps, { min: 1, max: 400, fallback: null }),
          seconds: toIntInRange(entry.seconds, { min: 5, max: 3600, fallback: null }),
          difficulty: normalizeDifficulty(entry.difficulty)
        };
      }
    });
  });

  state.exerciseProgress = nextProgress;
}

function isHistoryDayComplete(entry, frozenSet, dateKey) {
  if (!entry) {
    return Boolean(frozenSet && frozenSet.has(dateKey));
  }
  return Boolean(entry.completed || entry.frozen || (frozenSet && frozenSet.has(dateKey)));
}

function refreshMotivationState(state) {
  state.motivation = normalizeMotivationState(state.motivation);
  const historyKeys = new Set(Object.keys(state.history));
  state.motivation.frozenDates = state.motivation.frozenDates.filter(
    (dateKey) => historyKeys.has(dateKey) || dateKey === getDateKey()
  );
  const frozenSet = new Set(state.motivation.frozenDates);
  const weekCounts = {};
  let totalCompleteDays = 0;
  let bestDayVolume = 0;

  Object.entries(state.history).forEach(([dateKey, entry]) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const completed = isHistoryDayComplete(entry, frozenSet, dateKey);
    if (completed) {
      totalCompleteDays += 1;
      const weekKey = getWeekKey(dateKey);
      weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
    }

    const volume = Number.isFinite(entry.totalVolume) ? Math.max(0, Math.round(entry.totalVolume)) : 0;
    if (volume > bestDayVolume) {
      bestDayVolume = volume;
    }
  });

  Object.entries(weekCounts).forEach(([weekKey, completeCount]) => {
    if (completeCount < state.motivation.weeklyGoal) {
      return;
    }

    if (state.motivation.awardedFreezeWeeks.includes(weekKey)) {
      return;
    }

    state.motivation.awardedFreezeWeeks.push(weekKey);
    state.motivation.freezeCredits = Math.min(3, state.motivation.freezeCredits + 1);
  });

  const currentWeekKey = getCurrentWeekKey();
  const challengeGroups = new Set();
  Object.entries(state.history).forEach(([dateKey, entry]) => {
    if (!isSameWeek(dateKey, currentWeekKey) || !entry || !entry.groupCounts) {
      return;
    }

    Object.entries(entry.groupCounts).forEach(([group, count]) => {
      if (Number.isFinite(count) && count > 0) {
        challengeGroups.add(String(group).toUpperCase());
      }
    });
  });

  const challengeComplete = challengeGroups.size >= state.motivation.challengeTargetGroups;
  state.motivation.challenge = {
    weekKey: currentWeekKey,
    completedGroups: Array.from(challengeGroups),
    complete: challengeComplete
  };

  const streak = computeStreak(state.history, state.motivation.frozenDates);
  const badgeContext = {
    streak,
    totalCompleteDays,
    bestDayVolume,
    challengeComplete
  };

  state.motivation.badges = MOTIVATION_BADGE_RULES.filter((rule) => rule.test(badgeContext)).map((rule) => rule.label);
}

function snapshotDay(state, dateKey) {
  if (!state.dailyExercisePerformance || typeof state.dailyExercisePerformance !== "object") {
    state.dailyExercisePerformance = {};
  }
  if (!state.motivation || typeof state.motivation !== "object") {
    state.motivation = { ...DEFAULT_MOTIVATION_STATE };
  }

  const progress = getProgress(state);
  const frozenSet = new Set(state.motivation?.frozenDates || []);
  const isFrozen = frozenSet.has(dateKey);

  state.history[dateKey] = {
    done: progress.done,
    total: progress.total,
    completed: (progress.total > 0 && progress.done === progress.total) || isFrozen,
    frozen: isFrozen,
    exerciseDone: progress.exerciseDone,
    taskDone: progress.taskDone,
    totalVolume: progress.exerciseVolume,
    groupCounts: progress.groupCountsDone
  };

  const dayPerformance = {};
  state.exercises.forEach((exercise) => {
    if (!exercise.done) {
      return;
    }

    const key = exercise.progressKey || getExerciseMetadata(exercise.title).key;
    dayPerformance[key] = {
      name: cleanExerciseTitle(exercise.canonicalName || exercise.title),
      group: String(exercise.group || "CUSTOM").toUpperCase(),
      volume: calculateExerciseVolume(exercise),
      sets: exercise.sets,
      reps: exercise.reps,
      seconds: exercise.seconds,
      difficulty: exercise.difficulty
    };
  });

  state.dailyExercisePerformance[dateKey] = dayPerformance;
  rebuildExerciseProgress(state);
  refreshMotivationState(state);
  trimHistory(state);
}

function rolloverIfNeeded(state) {
  const today = getDateKey();
  if (!state.lastActiveDate) {
    state.lastActiveDate = today;
    state.lockDate = null;
    return state;
  }

  if (state.lastActiveDate === today) {
    if (state.lockDate && state.lockDate !== today) {
      state.lockDate = null;
    }
    return state;
  }

  // Save yesterday's final snapshot before clearing checkmarks for the new day.
  snapshotDay(state, state.lastActiveDate);
  state.exercises = state.exercises.map((item) => ({ ...item, done: false }));
  state.tasks = state.tasks.map((item) => ({ ...item, done: false }));
  state.lastActiveDate = today;
  state.lockDate = null;
  return state;
}

function saveState(options = {}) {
  const storageKey = getStorageKeyForCurrentUser();
  if (!storageKey) {
    return;
  }

  snapshotDay(appState, getDateKey());
  appState.updatedAt = Date.now();
  localStorage.setItem(storageKey, JSON.stringify(appState));

  if (!options.skipCloud) {
    queueCloudSave();
  }
}

function formatTodayLabel() {
  const formatter = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return formatter.format(new Date());
}

function formatDay(dateKey) {
  const formatter = new Intl.DateTimeFormat("en", {
    weekday: "short"
  });
  return formatter.format(parseDateKey(dateKey));
}

function computeStreak(history, frozenDates = []) {
  const today = new Date();
  const todayKey = getDateKey(today);
  const historyToday = history[todayKey];
  const cursor = new Date(today);
  const frozenSet = new Set(Array.isArray(frozenDates) ? frozenDates : []);

  if (!isHistoryDayComplete(historyToday, frozenSet, todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = getDateKey(cursor);
    const entry = history[key];
    if (!isHistoryDayComplete(entry, frozenSet, key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getWeeklyCompletionCount(history, frozenDates, weekKey) {
  const frozenSet = new Set(Array.isArray(frozenDates) ? frozenDates : []);
  let completeDays = 0;

  Object.entries(history).forEach(([dateKey, entry]) => {
    if (!isSameWeek(dateKey, weekKey)) {
      return;
    }

    if (isHistoryDayComplete(entry, frozenSet, dateKey)) {
      completeDays += 1;
    }
  });

  return completeDays;
}

function buildExerciseProgressCue(item) {
  const progressKey = item.progressKey || getExerciseMetadata(item.title).key;
  const progress = appState.exerciseProgress[progressKey];
  if (!progress) {
    return "Baseline: complete this movement cleanly for two sessions.";
  }

  if (progress.sessions < 2) {
    return "Build consistency first, then increase reps or time gradually.";
  }

  const currentVolume = calculateExerciseVolume({ ...item, done: true });
  if (item.done && currentVolume >= progress.bestVolume) {
    return "Personal best pace. Next progression: +1 rep or +5 seconds.";
  }

  if (item.done && currentVolume >= Math.round(progress.bestVolume * 0.9)) {
    return `Near best (${progress.bestVolume}). Keep tempo strict and add a small overload next session.`;
  }

  if (item.difficulty === "easy") {
    return "Progression cue: move to medium when this feels stable.";
  }

  return `Current best volume is ${progress.bestVolume}. Stay controlled and build gradually.`;
}

function buildActionButton({ action, label, type, id, disabled, extraClass = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = extraClass ? `mini-action-btn ${extraClass}` : "mini-action-btn";
  button.dataset.itemAction = action;
  button.dataset.type = type;
  button.dataset.id = id;
  button.disabled = Boolean(disabled);
  button.textContent = label;
  return button;
}

function buildItemNode(item, type, index, totalCount, locked) {
  const li = document.createElement("li");
  li.className = item.done ? "item done scroll-pop" : "item scroll-pop";
  li.dataset.animate = "true";
  li.dataset.repeat = "true";
  li.dataset.delay = (Math.min(index, 8) * 0.04 + 0.03).toFixed(2);
  li.dataset.distort = "true";

  const controlLabel = document.createElement("label");
  controlLabel.className = "item-control";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.done;
  checkbox.disabled = locked;
  checkbox.dataset.type = type;
  checkbox.dataset.id = item.id;
  controlLabel.appendChild(checkbox);

  const content = document.createElement("div");
  content.className = "item-content";

  const copy = document.createElement("p");
  copy.className = "item-title";
  copy.textContent = item.title;
  content.appendChild(copy);

  if (type === "exercise") {
    const prescription = document.createElement("p");
    prescription.className = "item-meta";
    prescription.textContent = `${formatExercisePrescription(item)} | group ${item.group || "CUSTOM"}`;

    const progression = document.createElement("p");
    progression.className = "item-meta";
    progression.textContent = `Coach cue: ${buildExerciseProgressCue(item)}`;

    content.appendChild(prescription);
    content.appendChild(progression);
  }

  const actions = document.createElement("div");
  actions.className = "item-actions";

  actions.appendChild(
    buildActionButton({
      action: "move-up",
      label: "Up",
      type,
      id: item.id,
      disabled: locked || index === 0
    })
  );
  actions.appendChild(
    buildActionButton({
      action: "move-down",
      label: "Down",
      type,
      id: item.id,
      disabled: locked || index >= totalCount - 1
    })
  );
  actions.appendChild(
    buildActionButton({
      action: "edit",
      label: "Edit",
      type,
      id: item.id,
      disabled: locked
    })
  );
  actions.appendChild(
    buildActionButton({
      action: "duplicate",
      label: "Copy",
      type,
      id: item.id,
      disabled: locked
    })
  );

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-btn mini-action-btn";
  removeButton.disabled = locked;
  removeButton.dataset.itemAction = "remove";
  removeButton.dataset.type = type;
  removeButton.dataset.id = item.id;
  removeButton.textContent = "Remove";
  actions.appendChild(removeButton);

  li.appendChild(controlLabel);
  li.appendChild(content);
  li.appendChild(actions);
  return li;
}

function renderList(target, items, type, locked) {
  target.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-note";
    empty.textContent = "Nothing here yet. Add your next item.";
    target.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    fragment.appendChild(buildItemNode(item, type, index, items.length, locked));
  });
  target.appendChild(fragment);
}

function renderHistory(history) {
  if (!elements.historyGrid) {
    return;
  }

  elements.historyGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = getDateKey(day);
    const entry = history[key];

    const tile = document.createElement("div");
    let stateClass = "empty";
    let scoreText = "0%";

    if (entry && entry.frozen) {
      stateClass = "freeze";
      scoreText = "FRZ";
    } else if (entry && entry.total > 0) {
      const percent = Math.round((entry.done / entry.total) * 100);
      scoreText = `${percent}%`;
      stateClass = entry.completed ? "done" : "partial";
    }

    tile.className = `day-tile ${stateClass} scroll-pop`;
    tile.dataset.animate = "true";
    tile.dataset.repeat = "true";
    tile.dataset.delay = ((6 - offset) * 0.05 + 0.04).toFixed(2);
    tile.dataset.distort = "true";

    const dayName = document.createElement("p");
    dayName.className = "day-name";
    dayName.textContent = formatDay(key);

    const dayScore = document.createElement("p");
    dayScore.className = "day-score";
    dayScore.textContent = scoreText;

    tile.appendChild(dayName);
    tile.appendChild(dayScore);
    fragment.appendChild(tile);
  }

  elements.historyGrid.appendChild(fragment);
}

function buildStatusMessage(progress) {
  if (progress.total === 0) {
    return "Add a few exercises and tasks to get started.";
  }
  if (progress.done === progress.total) {
    return "Everything is complete for today. Excellent discipline.";
  }
  if (progress.percent >= 70) {
    return "You are close. Finish strong and lock in the day.";
  }
  if (progress.percent >= 35) {
    return "Solid momentum. Keep checking off the next item.";
  }
  return "Start with one quick win, then build flow.";
}

function renderVolumeTrend(history) {
  if (!elements.analyticsVolumeTrend) {
    return;
  }

  elements.analyticsVolumeTrend.innerHTML = "";
  const points = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const dateKey = getDateKey(day);
    const entry = history[dateKey];
    const volume = entry && Number.isFinite(entry.totalVolume) ? Math.max(0, Math.round(entry.totalVolume)) : 0;
    points.push({ dateKey, volume });
  }

  const maxVolume = Math.max(1, ...points.map((point) => point.volume));
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

  elements.analyticsVolumeTrend.appendChild(fragment);
}

function renderMuscleBalance(history) {
  if (!elements.analyticsBalance) {
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
      const safeCount = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
      if (safeCount <= 0) {
        return;
      }
      const normalizedGroup = String(group).toUpperCase();
      counts[normalizedGroup] = (counts[normalizedGroup] || 0) + safeCount;
    });
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  elements.analyticsBalance.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Complete a few exercises to see group balance.";
    elements.analyticsBalance.appendChild(empty);
    return;
  }

  const maxCount = Math.max(1, ...entries.map(([, value]) => value));
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
    fill.style.width = `${Math.round((count / maxCount) * 100)}%`;
    track.appendChild(fill);

    const value = document.createElement("p");
    value.textContent = String(count);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    fragment.appendChild(row);
  });

  elements.analyticsBalance.appendChild(fragment);
}

function renderAnalyticsPanel(state) {
  const currentWeekKey = getCurrentWeekKey();
  const weeklyComplete = getWeeklyCompletionCount(state.history, state.motivation.frozenDates, currentWeekKey);
  const totalVolume7d = Object.keys(state.history).reduce((sum, dateKey) => {
    const day = parseDateKey(dateKey);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    if (day < start) {
      return sum;
    }

    const entry = state.history[dateKey];
    const volume = entry && Number.isFinite(entry.totalVolume) ? Math.max(0, Math.round(entry.totalVolume)) : 0;
    return sum + volume;
  }, 0);
  const personalBestMarkers = Object.values(state.exerciseProgress).filter((entry) => entry.bestVolume >= 30).length;

  if (elements.analyticsWeeklyCompletion) {
    elements.analyticsWeeklyCompletion.textContent = `${weeklyComplete} / 7 complete days`;
  }

  if (elements.analyticsVolume) {
    elements.analyticsVolume.textContent = `${totalVolume7d} volume points in 7 days`;
  }

  if (elements.analyticsPb) {
    elements.analyticsPb.textContent = `${personalBestMarkers} personal best markers`;
  }

  renderVolumeTrend(state.history);
  renderMuscleBalance(state.history);
}

function renderMotivationPanel(state, streak) {
  const motivation = state.motivation;
  const currentWeekKey = getCurrentWeekKey();
  const weeklyComplete = getWeeklyCompletionCount(state.history, motivation.frozenDates, currentWeekKey);
  const challenge = motivation.challenge || {
    complete: false,
    completedGroups: []
  };

  if (elements.weeklyGoalInput && document.activeElement !== elements.weeklyGoalInput) {
    elements.weeklyGoalInput.value = String(motivation.weeklyGoal);
  }

  if (elements.freezeCount) {
    elements.freezeCount.textContent = `Freeze credits: ${motivation.freezeCredits}`;
  }

  if (elements.challengeText) {
    elements.challengeText.textContent = `Challenge: ${challenge.completedGroups.length}/${motivation.challengeTargetGroups} groups this week. Goal progress ${weeklyComplete}/${motivation.weeklyGoal}. Streak ${streak}.`;
  }

  if (elements.useFreezeBtn) {
    const todayKey = getDateKey();
    const alreadyFrozenToday = motivation.frozenDates.includes(todayKey);
    elements.useFreezeBtn.disabled = motivation.freezeCredits <= 0 || alreadyFrozenToday || isTodayLocked(state);
  }

  if (elements.cloudSyncStatus) {
    elements.cloudSyncStatus.textContent = cloudSyncStatusText;
  }

  if (!elements.badgeList) {
    return;
  }

  elements.badgeList.innerHTML = "";
  if (motivation.badges.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No badges yet. Complete full days to unlock them.";
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

function applySessionConfigFromInputs() {
  const config = normalizeSessionConfig({
    workSeconds: elements.sessionWorkInput ? elements.sessionWorkInput.value : DEFAULT_SESSION_CONFIG.workSeconds,
    restSeconds: elements.sessionRestInput ? elements.sessionRestInput.value : DEFAULT_SESSION_CONFIG.restSeconds,
    rounds: elements.sessionRoundsInput ? elements.sessionRoundsInput.value : DEFAULT_SESSION_CONFIG.rounds
  });

  appState.sessionConfig = config;
  sessionState.workSeconds = config.workSeconds;
  sessionState.restSeconds = config.restSeconds;
  sessionState.totalRounds = config.rounds;
}

function syncSessionInputsFromConfig() {
  const config = normalizeSessionConfig(appState.sessionConfig);
  appState.sessionConfig = config;

  if (elements.sessionWorkInput && document.activeElement !== elements.sessionWorkInput) {
    elements.sessionWorkInput.value = String(config.workSeconds);
  }
  if (elements.sessionRestInput && document.activeElement !== elements.sessionRestInput) {
    elements.sessionRestInput.value = String(config.restSeconds);
  }
  if (elements.sessionRoundsInput && document.activeElement !== elements.sessionRoundsInput) {
    elements.sessionRoundsInput.value = String(config.rounds);
  }

  if (!sessionState.running) {
    sessionState.workSeconds = config.workSeconds;
    sessionState.restSeconds = config.restSeconds;
    sessionState.totalRounds = config.rounds;
  }
}

function clearSessionTimer() {
  if (sessionTickTimerId !== null) {
    window.clearInterval(sessionTickTimerId);
    sessionTickTimerId = null;
  }
}

function renderSessionMode() {
  if (!elements.sessionTimer || !elements.sessionPhase || !elements.sessionRound || !elements.sessionStatus) {
    return;
  }

  if (!sessionState.running) {
    elements.sessionTimer.textContent = "00:00";
    elements.sessionPhase.textContent = "Idle";
    elements.sessionRound.textContent = `Round 0 / ${sessionState.totalRounds || normalizeSessionConfig(appState.sessionConfig).rounds}`;
    elements.sessionStatus.textContent = "Configure intervals and run a focused training block.";
  } else {
    elements.sessionTimer.textContent = formatTimer(sessionState.remainingSeconds);
    elements.sessionPhase.textContent = sessionState.phase === "work" ? "Work" : "Rest";
    elements.sessionRound.textContent = `Round ${sessionState.round} / ${sessionState.totalRounds}`;
    elements.sessionStatus.textContent = sessionState.paused
      ? "Session paused. Resume when ready."
      : `Session running: ${sessionState.phase} phase.`;
  }

  if (elements.sessionPauseBtn) {
    elements.sessionPauseBtn.disabled = !sessionState.running;
    elements.sessionPauseBtn.textContent = sessionState.paused ? "Resume" : "Pause";
  }
  if (elements.sessionStartBtn) {
    elements.sessionStartBtn.disabled = sessionState.running && !sessionState.paused;
  }
}

function completeSessionMode() {
  clearSessionTimer();
  sessionState.running = false;
  sessionState.paused = false;
  sessionState.phase = "idle";
  sessionState.round = 0;
  sessionState.remainingSeconds = 0;
  renderSessionMode();

  showAppDialog({
    title: "Session Complete",
    message: "Great work. Session rounds completed with focus.",
    confirmLabel: "Nice",
    tone: "info"
  });
}

function tickSessionMode() {
  if (!sessionState.running || sessionState.paused) {
    return;
  }

  sessionState.remainingSeconds -= 1;
  if (sessionState.remainingSeconds > 0) {
    renderSessionMode();
    return;
  }

  if (sessionState.phase === "work") {
    if (sessionState.round >= sessionState.totalRounds) {
      completeSessionMode();
      return;
    }

    sessionState.phase = "rest";
    sessionState.remainingSeconds = sessionState.restSeconds;
    renderSessionMode();
    return;
  }

  sessionState.phase = "work";
  sessionState.round += 1;
  sessionState.remainingSeconds = sessionState.workSeconds;
  renderSessionMode();
}

function startSessionMode() {
  applySessionConfigFromInputs();

  if (!sessionState.running) {
    sessionState.running = true;
    sessionState.paused = false;
    sessionState.phase = "work";
    sessionState.round = 1;
    sessionState.remainingSeconds = sessionState.workSeconds;
  } else {
    sessionState.paused = false;
  }

  clearSessionTimer();
  sessionTickTimerId = window.setInterval(tickSessionMode, 1000);
  renderSessionMode();
}

function toggleSessionPause() {
  if (!sessionState.running) {
    return;
  }
  sessionState.paused = !sessionState.paused;
  renderSessionMode();
}

function resetSessionMode() {
  clearSessionTimer();
  applySessionConfigFromInputs();
  sessionState.running = false;
  sessionState.paused = false;
  sessionState.phase = "idle";
  sessionState.round = 0;
  sessionState.remainingSeconds = 0;
  renderSessionMode();
}

function saveWeeklyGoal() {
  if (!elements.weeklyGoalInput) {
    return;
  }

  const nextGoal = toIntInRange(elements.weeklyGoalInput.value, { min: 1, max: 7, fallback: appState.motivation.weeklyGoal });
  appState.motivation.weeklyGoal = nextGoal;
  refreshMotivationState(appState);
  saveState();
  render();
}

function useStreakFreeze() {
  const todayKey = getDateKey();
  const motivation = appState.motivation;

  if (isTodayLocked(appState)) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Today is locked and already protected.";
    }
    return;
  }

  if (motivation.freezeCredits <= 0) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "No freeze credits available right now.";
    }
    return;
  }

  if (motivation.frozenDates.includes(todayKey)) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Today is already protected by a streak freeze.";
    }
    return;
  }

  const progress = getProgress(appState);
  if (progress.total > 0 && progress.done === progress.total) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Today is already complete. Freeze not needed.";
    }
    return;
  }

  motivation.freezeCredits = Math.max(0, motivation.freezeCredits - 1);
  motivation.frozenDates.push(todayKey);
  saveState();
  render();
}

function saveTrainingDay() {
  if (isTodayLocked(appState)) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Training is already saved for today. It will unlock after 12:00 AM.";
    }
    render();
    return;
  }

  const progress = getProgress(appState);
  if (progress.total === 0) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Add exercises or tasks before saving training.";
    }
    return;
  }

  if (progress.done < progress.total) {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Complete all exercises and tasks before saving training.";
    }
    return;
  }

  appState.lockDate = getDateKey();
  saveState();
  render();
}

function render() {
  refreshMotivationState(appState);
  const progress = getProgress(appState);
  const locked = isTodayLocked(appState);
  const streak = computeStreak(appState.history, appState.motivation.frozenDates);
  const volumeEnergyBoost = Math.min(20, Math.round(progress.exerciseVolume / 10));
  const energy = Math.min(100, Math.round(progress.percent * 0.82 + Math.min(12, progress.done * 2) + volumeEnergyBoost));
  const nextStorySignature = getStoryExerciseSignature(appState.exercises);

  elements.todayLabel.textContent = formatTodayLabel();
  elements.progressBar.style.width = `${progress.percent}%`;
  elements.progressText.textContent = `${progress.done} / ${progress.total} done`;
  elements.exerciseCount.textContent = `${progress.exerciseDone} / ${appState.exercises.length} done`;
  elements.taskCount.textContent = `${progress.taskDone} / ${appState.tasks.length} done`;

  elements.streakValue.textContent = String(streak);
  elements.streakHint.textContent =
    streak === 0
      ? "Complete every item today to begin your streak."
      : streak === 1
      ? "One complete day in a row. Repeat tomorrow."
      : `${streak} consistent days. Protect the chain.`;

  elements.energyValue.textContent = String(energy);
  elements.energyHint.textContent =
    energy >= 85
      ? "Peak focus state. Keep this rhythm tomorrow."
      : energy >= 55
      ? "Good pace. One more push lifts your score."
      : "Momentum starts small. Finish one item right now.";

  if (locked) {
    elements.statusMessage.textContent = "Training saved for today. Reset is disabled until 12:00 AM.";
  } else {
    elements.statusMessage.textContent = buildStatusMessage(progress);
  }

  elements.resetDayBtn.disabled = false;
  elements.markAllBtn.disabled = locked;
  if (elements.saveTrainingBtn) {
    elements.saveTrainingBtn.disabled = locked || progress.total === 0 || progress.done !== progress.total;
  }

  elements.exerciseInput.disabled = locked;
  elements.taskInput.disabled = locked;
  if (elements.exerciseSetsInput) {
    elements.exerciseSetsInput.disabled = locked;
  }
  if (elements.exerciseRepsInput) {
    elements.exerciseRepsInput.disabled = locked;
  }
  if (elements.exerciseSecondsInput) {
    elements.exerciseSecondsInput.disabled = locked;
  }
  if (elements.exerciseRestInput) {
    elements.exerciseRestInput.disabled = locked;
  }
  if (elements.exerciseDifficultyInput) {
    elements.exerciseDifficultyInput.disabled = locked;
  }

  if (elements.exerciseSubmitBtn) {
    elements.exerciseSubmitBtn.disabled = locked;
    elements.exerciseSubmitBtn.textContent = editingExerciseId ? "Update Exercise" : "Add Exercise";
  }
  if (elements.taskSubmitBtn) {
    elements.taskSubmitBtn.disabled = locked;
    elements.taskSubmitBtn.textContent = editingTaskId ? "Update Task" : "Add Task";
  }
  if (elements.exerciseFormCancelBtn) {
    elements.exerciseFormCancelBtn.hidden = !editingExerciseId;
    elements.exerciseFormCancelBtn.disabled = locked;
  }
  if (elements.taskFormCancelBtn) {
    elements.taskFormCancelBtn.hidden = !editingTaskId;
    elements.taskFormCancelBtn.disabled = locked;
  }

  const menuSaveButton = document.querySelector("[data-menu-action='save']");
  if (menuSaveButton instanceof HTMLButtonElement) {
    menuSaveButton.disabled = locked || progress.total === 0 || progress.done !== progress.total;
  }
  const menuCompleteButton = document.querySelector("[data-menu-action='complete']");
  if (menuCompleteButton instanceof HTMLButtonElement) {
    menuCompleteButton.disabled = locked;
  }
  const menuResetButton = document.querySelector("[data-menu-action='reset']");
  if (menuResetButton instanceof HTMLButtonElement) {
    menuResetButton.disabled = false;
  }

  if (nextStorySignature !== storyExerciseSignature) {
    renderStorySteps(appState.exercises);
    initStoryScene();
    storyExerciseSignature = nextStorySignature;
  }

  renderList(elements.exerciseList, appState.exercises, "exercise", locked);
  renderList(elements.taskList, appState.tasks, "task", locked);
  renderHistory(appState.history);
  renderAnalyticsPanel(appState);
  renderMotivationPanel(appState, streak);
  syncSessionInputsFromConfig();
  renderSessionMode();
  initHoverDistortion();
  registerScrollAnimations();
  requestScrollEffects();
}

function updateItems(type, updater) {
  if (type === "exercise") {
    const nextExercises = updater(appState.exercises);
    appState.exercises = nextExercises.map((item) => normalizeExerciseItem(item));
    return;
  }

  const nextTasks = updater(appState.tasks).map((item) => normalizeTaskItem(item)).filter(Boolean);
  appState.tasks = nextTasks;
}

function toggleItem(type, id, checked) {
  if (blockWhenLocked()) {
    return;
  }

  updateItems(type, (items) =>
    items.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return { ...item, done: checked };
    })
  );
  saveState();
  render();
}

function deleteItem(type, id) {
  if (blockWhenLocked()) {
    return;
  }

  updateItems(type, (items) => items.filter((item) => item.id !== id));

  if (type === "exercise" && editingExerciseId === id) {
    editingExerciseId = null;
  }
  if (type === "task" && editingTaskId === id) {
    editingTaskId = null;
  }

  saveState();
  render();
}

function addItem(type, title, details = {}) {
  if (blockWhenLocked()) {
    return;
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    return;
  }

  if (type === "exercise") {
    const nextExercise = normalizeExerciseItem({
      id: uid(),
      title: cleanTitle,
      done: false,
      sets: details.sets,
      reps: details.reps,
      seconds: details.seconds,
      restSeconds: details.restSeconds,
      difficulty: details.difficulty
    });
    appState.exercises.push(nextExercise);
  } else {
    const nextItem = {
      id: uid(),
      title: cleanTitle,
      done: false
    };
    appState.tasks.push(nextItem);
  }

  saveState();
  render();
}

function moveItem(type, id, direction) {
  if (blockWhenLocked()) {
    return;
  }

  updateItems(type, (items) => {
    const currentIndex = items.findIndex((item) => item.id === id);
    if (currentIndex < 0) {
      return items;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return items;
    }

    const nextItems = items.slice();
    const [moved] = nextItems.splice(currentIndex, 1);
    nextItems.splice(nextIndex, 0, moved);
    return nextItems;
  });

  saveState();
  render();
}

function duplicateItem(type, id) {
  if (blockWhenLocked()) {
    return;
  }

  updateItems(type, (items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
      return items;
    }

    const source = items[index];
    const duplicate = {
      ...source,
      id: uid(),
      done: false,
      title: `${source.title} (copy)`
    };

    const nextItems = items.slice();
    nextItems.splice(index + 1, 0, duplicate);
    return nextItems;
  });

  saveState();
  render();
}

function clearExerciseForm() {
  if (elements.exerciseInput) {
    elements.exerciseInput.value = "";
  }
  if (elements.exerciseSetsInput) {
    elements.exerciseSetsInput.value = "";
  }
  if (elements.exerciseRepsInput) {
    elements.exerciseRepsInput.value = "";
  }
  if (elements.exerciseSecondsInput) {
    elements.exerciseSecondsInput.value = "";
  }
  if (elements.exerciseRestInput) {
    elements.exerciseRestInput.value = "";
  }
  if (elements.exerciseDifficultyInput) {
    elements.exerciseDifficultyInput.value = "medium";
  }
}

function stopEditingExercise({ shouldRender = true } = {}) {
  editingExerciseId = null;
  clearExerciseForm();
  if (shouldRender) {
    render();
  }
}

function stopEditingTask({ shouldRender = true } = {}) {
  editingTaskId = null;
  if (elements.taskInput) {
    elements.taskInput.value = "";
  }
  if (shouldRender) {
    render();
  }
}

function startEditingItem(type, id) {
  if (blockWhenLocked()) {
    return;
  }

  if (type === "exercise") {
    const item = appState.exercises.find((exercise) => exercise.id === id);
    if (!item) {
      return;
    }

    editingExerciseId = id;
    if (elements.exerciseInput) {
      elements.exerciseInput.value = item.title;
    }
    if (elements.exerciseSetsInput) {
      elements.exerciseSetsInput.value = item.sets ? String(item.sets) : "";
    }
    if (elements.exerciseRepsInput) {
      elements.exerciseRepsInput.value = item.reps ? String(item.reps) : "";
    }
    if (elements.exerciseSecondsInput) {
      elements.exerciseSecondsInput.value = item.seconds ? String(item.seconds) : "";
    }
    if (elements.exerciseRestInput) {
      elements.exerciseRestInput.value = Number.isFinite(item.restSeconds) ? String(item.restSeconds) : "";
    }
    if (elements.exerciseDifficultyInput) {
      elements.exerciseDifficultyInput.value = normalizeDifficulty(item.difficulty);
    }
    render();
    if (elements.exerciseInput) {
      elements.exerciseInput.focus();
    }
    return;
  }

  const task = appState.tasks.find((entry) => entry.id === id);
  if (!task) {
    return;
  }

  editingTaskId = id;
  if (elements.taskInput) {
    elements.taskInput.value = task.title;
    elements.taskInput.focus();
  }
  render();
}

function collectExerciseFormDetails() {
  return {
    sets: toIntInRange(elements.exerciseSetsInput ? elements.exerciseSetsInput.value : null, {
      min: 1,
      max: 20,
      fallback: null
    }),
    reps: toIntInRange(elements.exerciseRepsInput ? elements.exerciseRepsInput.value : null, {
      min: 1,
      max: 400,
      fallback: null
    }),
    seconds: toIntInRange(elements.exerciseSecondsInput ? elements.exerciseSecondsInput.value : null, {
      min: 5,
      max: 3600,
      fallback: null
    }),
    restSeconds: toIntInRange(elements.exerciseRestInput ? elements.exerciseRestInput.value : null, {
      min: 0,
      max: 900,
      fallback: 60
    }),
    difficulty: normalizeDifficulty(elements.exerciseDifficultyInput ? elements.exerciseDifficultyInput.value : "medium")
  };
}

function submitExerciseForm() {
  const title = elements.exerciseInput ? elements.exerciseInput.value : "";
  const details = collectExerciseFormDetails();
  if (!title.trim()) {
    return;
  }

  if (editingExerciseId) {
    const editingId = editingExerciseId;
    updateItems("exercise", (items) =>
      items.map((item) => {
        if (item.id !== editingId) {
          return item;
        }
        return {
          ...item,
          title: cleanExerciseTitle(title),
          sets: details.sets,
          reps: details.reps,
          seconds: details.seconds,
          restSeconds: details.restSeconds,
          difficulty: details.difficulty
        };
      })
    );

    stopEditingExercise({ shouldRender: false });
    saveState();
    render();
    return;
  }

  addItem("exercise", title, details);
  clearExerciseForm();
}

function submitTaskForm() {
  const title = elements.taskInput ? elements.taskInput.value : "";
  if (!title.trim()) {
    return;
  }

  if (editingTaskId) {
    const editingId = editingTaskId;
    updateItems("task", (items) =>
      items.map((item) => {
        if (item.id !== editingId) {
          return item;
        }
        return {
          ...item,
          title: title.trim()
        };
      })
    );

    stopEditingTask({ shouldRender: false });
    saveState();
    render();
    return;
  }

  addItem("task", title);
  if (elements.taskInput) {
    elements.taskInput.value = "";
  }
}

function resetToday() {
  if (isTodayLocked(appState)) {
    showResetLockedDialog();
    if (elements.statusMessage) {
      elements.statusMessage.textContent = "Training is saved for today. It will reset automatically after 12:00 AM.";
    }
    return;
  }

  const todayKey = getDateKey();
  appState.exercises = appState.exercises.map((item) => ({ ...item, done: false }));
  appState.tasks = appState.tasks.map((item) => ({ ...item, done: false }));
  appState.motivation.frozenDates = appState.motivation.frozenDates.filter((dateKey) => dateKey !== todayKey);
  saveState();
  render();
}

function markEverythingDone() {
  if (blockWhenLocked()) {
    return;
  }

  const todayKey = getDateKey();
  appState.exercises = appState.exercises.map((item) => ({ ...item, done: true }));
  appState.tasks = appState.tasks.map((item) => ({ ...item, done: true }));
  appState.motivation.frozenDates = appState.motivation.frozenDates.filter((dateKey) => dateKey !== todayKey);
  saveState();
  render();
}

function handleListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.type !== "checkbox") {
    return;
  }

  const { type, id } = target.dataset;
  if (!type || !id) {
    return;
  }

  toggleItem(type, id, target.checked);
}

function handleListClick(event) {
  const clicked = event.target;
  if (!(clicked instanceof HTMLElement)) {
    return;
  }

  const button = clicked.closest("button[data-item-action]");
  if (!button) {
    return;
  }

  const { itemAction, type, id } = button.dataset;
  if (!itemAction || !type || !id) {
    return;
  }

  if (itemAction === "remove") {
    deleteItem(type, id);
    return;
  }

  if (itemAction === "edit") {
    startEditingItem(type, id);
    return;
  }

  if (itemAction === "duplicate") {
    duplicateItem(type, id);
    return;
  }

  if (itemAction === "move-up") {
    moveItem(type, id, "up");
    return;
  }

  if (itemAction === "move-down") {
    moveItem(type, id, "down");
  }
}

function bindEvents() {
  initAppDialog();
  initMenuOverlay();

  elements.exerciseList.addEventListener("change", handleListChange);
  elements.taskList.addEventListener("change", handleListChange);
  elements.exerciseList.addEventListener("click", handleListClick);
  elements.taskList.addEventListener("click", handleListClick);

  elements.exerciseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitExerciseForm();
    if (elements.exerciseInput) {
      elements.exerciseInput.focus();
    }
  });

  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitTaskForm();
    if (elements.taskInput) {
      elements.taskInput.focus();
    }
  });

  if (elements.exerciseFormCancelBtn) {
    elements.exerciseFormCancelBtn.addEventListener("click", () => {
      stopEditingExercise();
    });
  }

  if (elements.taskFormCancelBtn) {
    elements.taskFormCancelBtn.addEventListener("click", () => {
      stopEditingTask();
    });
  }

  elements.resetDayBtn.addEventListener("click", () => {
    if (isTodayLocked(appState)) {
      showResetLockedDialog();
      return;
    }

    confirmResetDialog().then((ok) => {
      if (ok) {
        resetToday();
      }
    });
  });

  if (elements.saveTrainingBtn) {
    elements.saveTrainingBtn.addEventListener("click", () => {
      saveTrainingDay();
    });
  }

  elements.markAllBtn.addEventListener("click", () => {
    markEverythingDone();
  });

  if (elements.saveWeeklyGoalBtn) {
    elements.saveWeeklyGoalBtn.addEventListener("click", () => {
      saveWeeklyGoal();
    });
  }

  if (elements.useFreezeBtn) {
    elements.useFreezeBtn.addEventListener("click", () => {
      useStreakFreeze();
    });
  }

  if (elements.sessionStartBtn) {
    elements.sessionStartBtn.addEventListener("click", () => {
      startSessionMode();
      saveState();
    });
  }

  if (elements.sessionPauseBtn) {
    elements.sessionPauseBtn.addEventListener("click", () => {
      toggleSessionPause();
    });
  }

  if (elements.sessionResetBtn) {
    elements.sessionResetBtn.addEventListener("click", () => {
      resetSessionMode();
      saveState();
    });
  }

  [elements.sessionWorkInput, elements.sessionRestInput, elements.sessionRoundsInput].forEach((input) => {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    input.addEventListener("change", () => {
      applySessionConfigFromInputs();
      saveState();
      renderSessionMode();
    });
  });

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      signOutCurrentUser();
    });
  }

  if (elements.menuLogoutBtn) {
    elements.menuLogoutBtn.addEventListener("click", () => {
      closeMenuOverlay({ focusToggle: true });
      signOutCurrentUser();
    });
  }

  window.addEventListener("beforeunload", () => {
    clearSessionTimer();
  });
}

let appState = createDefaultState();
initAppDialog();
bootstrapAuthGate();