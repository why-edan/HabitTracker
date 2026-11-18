import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let docRef = null;
let unsubscribeDoc = null;

const defaultHabits = [
  { id: crypto.randomUUID(), name: "🌅 Wake up by 5:00" },
  { id: crypto.randomUUID(), name: "🏋️ Gym / Workout" },
  { id: crypto.randomUUID(), name: "📚 Reading / Learning" },
  { id: crypto.randomUUID(), name: "🇯🇵 Japanese" },
  { id: crypto.randomUUID(), name: "💻 Project Work" },
  { id: crypto.randomUUID(), name: "💼 Job Applications" },
  { id: crypto.randomUUID(), name: "😴 7+ Hours Sleep" }
];

function ex(name, sets) {
  return { id: crypto.randomUUID(), name, sets };
}

// Current 4-day plan + boxing day (appended below the original PPL days)
function newPlanDays() {
  return [
    { id: crypto.randomUUID(), title: "Push", exercises: [
      ex("Explosive Push-ups", "3 x 8"),
      ex("Military Press", "3 x 8"),
      ex("DB Chest Press", "4 x 10"),
      ex("DB Flyes", "3 x 15"),
      ex("Lateral Raises", "3 x 15"),
      ex("Overhead Tricep Cable Extension", "3 x 12"),
      ex("Cable Tricep Pushdown", "3 x 15"),
      ex("Leg Raises", "3 x 15")
    ]},
    { id: crypto.randomUUID(), title: "Pull", exercises: [
      ex("Heavy Deadlift", "3 x 5"),
      ex("Lat Pulldown", "4 x 10"),
      ex("Chest-Supported Rows", "3 x 10"),
      ex("Reverse Pec Deck", "3 x 15"),
      ex("Hammer Curls", "3 x 15"),
      ex("Preacher Curls", "3 x 15"),
      ex("Reverse EZ-Bar Forearm Curls", "3 x 12"),
      ex("Smith Shrugs", "3 x 12"),
      ex("Cable Crunch", "3 x 12"),
      ex("Neck", "3 x 15")
    ]},
    { id: crypto.randomUUID(), title: "Legs", exercises: [
      ex("Box Jump", "3 x 5"),
      ex("Leg Press", "4 x 8-10"),
      ex("Romanian Deadlift", "3 x 8-10"),
      ex("Leg Curls", "3 x 10"),
      ex("Leg Extension", "3 x 12"),
      ex("Bulgarian Split Squats", "3 x 8 each"),
      ex("Hip Adductor/Abductor Superset", "3 x 15"),
      ex("Calf Raises", "3 x 20")
    ]},
    { id: crypto.randomUUID(), title: "Upper", exercises: [
      ex("Landmine Rotation", "3 x 8"),
      ex("Incline DB Press", "4 x 8"),
      ex("Pec Dec", "3 x 10"),
      ex("Lat Pulldown (Magnet Grip)", "3 x 10"),
      ex("Single-Arm DB Row", "3 x 10"),
      ex("Face Pulls", "3 x 15"),
      ex("Lateral Raises", "3 x 15"),
      ex("Overhead Tricep (DB)", "3 x 10"),
      ex("Bayesian Curls", "3 x 15"),
      ex("Wrist Superset", "3 x 15"),
      ex("Cable Woodchop", "3 x 10"),
      ex("Neck", "3 x 15")
    ]},
    { id: crypto.randomUUID(), title: "Boxing", exercises: [
      ex("Landmine Rotations", "3 x 10 each side"),
      ex("Weighted Half-Kneeling Switch", "3 x 10 each side"),
      ex("HYROX Wall Ball Throws", "3 x 12"),
      ex("Box Jumps", "3 x 6"),
      ex("Kettlebell Swings", "3 x 12"),
      ex("Explosive Incline Push-ups", "3 x 8"),
      ex("Shadow Boxing", "2 min"),
      ex("Heavy Bag Punches", "2 min"),
      ex("Boxing Combinations", "2 min"),
      ex("Shadow Boxing + Footwork", "2 min"),
      ex("Heavy Bag", "2 min"),
      ex("Suitcase Carry", "2 x 30 sec each side"),
      ex("High Knees", "2 x 20 sec"),
      ex("Incline Treadmill Walk", "5 min")
    ]}
  ];
}

const defaultSchedule = [
  { id: crypto.randomUUID(), title: "Day 1 - Push", exercises: [
    ex("Barbell Bench Press", "3 x 5-8"),
    ex("Incline Dumbbell Press", "3 x 8-10"),
    ex("Dumbbell Shoulder Press", "3 x 6-10"),
    ex("Cable Lateral Raises", "3 x 12-15"),
    ex("Cable Fly", "2 x 10-15"),
    ex("Overhead Tricep Ext.", "3 x 8-12"),
    ex("Tricep Dips", "2 x 10-12")
  ]},
  { id: crypto.randomUUID(), title: "Day 2 - Pull", exercises: [
    ex("Lat Pulldown", "3 x 6-10"),
    ex("Chest-Supported Rows", "3 x 6-10"),
    ex("Single-Arm Cable Pulldown", "2 x 8-12"),
    ex("Reverse Pec Deck", "3 x 12-20"),
    ex("Incline Dumbbell Curls", "3 x 8-12"),
    ex("Hammer Curls", "3 x 8-12")
  ]},
  { id: crypto.randomUUID(), title: "Day 3 - Legs", exercises: [
    ex("Back Squats", "3 x 5-8"),
    ex("Romanian Deadlift", "3 x 6-10"),
    ex("Leg Press", "3 x 8-12"),
    ex("Leg Curl", "3 x 10-15"),
    ex("Leg Extension", "3 x 10-15"),
    ex("Calf Raises", "3 x 8-15")
  ]},
  { id: crypto.randomUUID(), title: "Day 4 - Chest + Back", exercises: [
    ex("Incline Barbell Press", "3 x 6-10"),
    ex("Flat Dumbbell Press", "3 x 8-12"),
    ex("Low-to-High Cable Fly", "3 x 12-15"),
    ex("Lat Pulldown [Neutral]", "3 x 6-10"),
    ex("Chest-Supported T-Bar Row", "2 x 8-12"),
    ex("Straight-Arm Cable Pulldown", "3 x 12-15")
  ]},
  { id: crypto.randomUUID(), title: "Day 5 - Shoulders + Arms", exercises: [
    ex("Dumbbell Shoulder Press", "3 x 6-10"),
    ex("Cable Lateral Raises", "4 x 12-15"),
    ex("Dumbbell Shrugs", "3 x 8-12"),
    ex("Cable Pressdown", "3 x 10-12"),
    ex("Overhead Skull Crusher", "3 x 8-10"),
    ex("Hammer Curls", "2 x 10-15"),
    ex("Dumbbell Curls (finisher)", "2 x 12-15")
  ]},
  { id: crypto.randomUUID(), title: "Day 6 - Legs + Core", exercises: [
    ex("Hack Squats", "3 x 6-10"),
    ex("Romanian Deadlift", "3 x 6-10"),
    ex("Leg Extension", "3 x 12-15"),
    ex("Leg Curl", "3 x 12-15"),
    ex("Calf Raises", "3 x 12-15"),
    ex("Cable Crunches", "3 x 10-15"),
    ex("Hanging Leg Raises", "3 x 8-15")
  ]}
];

let state = { habits: [], checks: {}, pplSchedule: [], planSchedule: [] };
let viewDate = new Date();
let isRemoteUpdate = false;
let loaded = false;
let currentDayIndex = 0;

const monthLabel = document.getElementById("monthLabel");
const yearLabel = document.getElementById("yearLabel");
const tableHead = document.querySelector("#habitTable thead");
const tableBody = document.querySelector("#habitTable tbody");
const completionEl = document.getElementById("completion");
const completionRingEl = document.getElementById("completionRing");
const bestStreakEl = document.getElementById("bestStreak");
const todayCountEl = document.getElementById("todayCount");

async function saveState() {
  if (!docRef) return;
  isRemoteUpdate = true;
  try {
    await setDoc(docRef, state);
  } catch (e) {
    console.error("Failed to save to Firestore", e);
  }
}

function normalizeState() {
  let changed = false;
  if (!Array.isArray(state.pplSchedule) || !state.pplSchedule.length) {
    state.pplSchedule = defaultSchedule;
  } else {
    // clean out any new-plan days that were appended to the old PPL by an earlier version
    const planTitles = new Set(newPlanDays().map(d => d.title));
    const kept = state.pplSchedule.filter(d => !planTitles.has(d.title));
    if (kept.length !== state.pplSchedule.length) { state.pplSchedule = kept; changed = true; }
  }
  if (!Array.isArray(state.planSchedule) || !state.planSchedule.length) {
    state.planSchedule = newPlanDays();
    changed = true;
  }
  delete state.scheduleVersion;
  if (changed) saveState();
}

// Live sync: whenever Firestore data changes (from any device), update UI
function subscribeToUserData() {
  docRef = doc(db, "habitTracker", "shared");
  unsubscribeDoc = onSnapshot(docRef, snap => {
    if (isRemoteUpdate) {
      isRemoteUpdate = false;
      return;
    }
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.habits) && data.checks) {
        state = data;
        normalizeState();
        loaded = true;
        render();
        renderSchedule();
      }
    } else {
      // First time ever for this account — seed Firestore with defaults
      state = { habits: defaultHabits, checks: {}, pplSchedule: defaultSchedule, planSchedule: newPlanDays() };
      loaded = true;
      setDoc(docRef, state);
      render();
      renderSchedule();
    }
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function keyFor(habitId, year, month, day) {
  return `${habitId}|${year}-${pad(month + 1)}-${pad(day)}`;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isToday(year, month, day) {
  const now = new Date();
  return now.getFullYear() === year &&
         now.getMonth() === month &&
         now.getDate() === day;
}

function render() {
  if (!loaded) {
    tableBody.innerHTML = `<tr><td style="padding:20px;text-align:center;">Loading habits…</td></tr>`;
    return;
  }
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = daysInMonth(year, month);

  monthLabel.textContent = viewDate.toLocaleString("en-US", { month: "long" });
  yearLabel.textContent = year;

  renderHeader(year, month, days);
  renderBody(year, month, days);
  updateStats(year, month, days);
}

function renderHeader(year, month, days) {
  let html = `<tr><th class="habit-head">HABIT</th>`;

  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month, day);
    const weekday = date.toLocaleString("en-US", { weekday: "short" });
    const todayClass = isToday(year, month, day) ? "today-head" : "";
    html += `
      <th class="${todayClass}" title="${date.toDateString()}">
        <span class="day-number">${day}</span>
        <span class="day-name">${weekday}</span>
      </th>`;
  }

  html += `</tr>`;
  tableHead.innerHTML = html;
}

function renderBody(year, month, days) {
  if (!state.habits.length) {
    tableBody.innerHTML = `
      <tr>
        <td class="habit-name" colspan="${days + 1}">
          No habits yet. Click "+ Add habit" to start.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = state.habits.map(habit => {
    let cells = "";

    for (let day = 1; day <= days; day++) {
      const key = keyFor(habit.id, year, month, day);
      const done = !!state.checks[key];
      const todayClass = isToday(year, month, day) ? " today" : "";

      cells += `
        <td class="check-cell">
          <button
            class="check${done ? " done" : ""}${todayClass}"
            data-habit="${habit.id}"
            data-day="${day}"
            aria-label="${done ? "Completed" : "Mark complete"} ${habit.name}, day ${day}">
          </button>
        </td>`;
    }

    return `
      <tr class="habit-row">
        <td class="habit-name">
          <div class="habit-content">
            <span>${escapeHtml(habit.name)}</span>
            <button class="delete-habit" data-delete="${habit.id}" title="Delete habit">×</button>
          </div>
        </td>
        ${cells}
      </tr>`;
  }).join("");
}

function updateStats(year, month, days) {
  let total = state.habits.length * days;
  let completed = 0;

  state.habits.forEach(habit => {
    for (let day = 1; day <= days; day++) {
      if (state.checks[keyFor(habit.id, year, month, day)]) completed++;
    }
  });

  const pct = total ? Math.round((completed / total) * 100) : 0;
  completionEl.textContent = `${pct}%`;
  if (completionRingEl) completionRingEl.style.setProperty("--pct", pct);

  const now = new Date();
  let todayCount = 0;
  if (now.getFullYear() === year && now.getMonth() === month) {
    state.habits.forEach(habit => {
      if (state.checks[keyFor(habit.id, year, month, now.getDate())]) todayCount++;
    });
  }
  todayCountEl.textContent = `${todayCount} / ${state.habits.length}`;

  bestStreakEl.textContent = `${calculateBestStreak()} days`;
}

function calculateBestStreak() {
  if (!state.habits.length) return 0;

  let best = 0;
  const today = new Date();
  let streak = 0;

  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);

    const allDone = state.habits.every(habit =>
      !!state.checks[keyFor(habit.id, d.getFullYear(), d.getMonth(), d.getDate())]
    );

    if (allDone) {
      streak++;
      best = Math.max(best, streak);
    } else {
      if (offset === 0) continue;
      streak = 0;
    }
  }

  return best;
}

tableBody.addEventListener("click", e => {
  const check = e.target.closest(".check");
  if (check) {
    const habitId = check.dataset.habit;
    const day = Number(check.dataset.day);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const key = keyFor(habitId, year, month, day);

    state.checks[key] = !state.checks[key];
    saveState();
    render();
    return;
  }

  const deleteBtn = e.target.closest("[data-delete]");
  if (deleteBtn) {
    const id = deleteBtn.dataset.delete;
    const habit = state.habits.find(h => h.id === id);

    if (habit && confirm(`Delete "${habit.name}"?`)) {
      state.habits = state.habits.filter(h => h.id !== id);

      Object.keys(state.checks).forEach(key => {
        if (key.startsWith(id + "|")) delete state.checks[key];
      });

      saveState();
      render();
    }
  }
});

document.getElementById("prevMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  render();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  viewDate = new Date();
  render();
});

const modal = document.getElementById("modal");
const habitInput = document.getElementById("habitName");

document.getElementById("addHabit").addEventListener("click", () => {
  modal.classList.remove("hidden");
  habitInput.value = "";
  habitInput.focus();
});

function closeModal() {
  modal.classList.add("hidden");
}

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelAdd").addEventListener("click", closeModal);

document.getElementById("saveHabit").addEventListener("click", addHabit);

habitInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addHabit();
  if (e.key === "Escape") closeModal();
});

function addHabit() {
  const name = habitInput.value.trim();
  if (!name) return;

  state.habits.push({
    id: crypto.randomUUID(),
    name
  });

  saveState();
  closeModal();
  render();
}

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("This will delete all habits and checkmarks. Are you sure?")) {
    state.habits = [];
    state.checks = {};
    saveState();
    render();
  }
});

/* ---------------- PPL Schedule view ---------------- */

const habitView = document.getElementById("habitView");
const scheduleView = document.getElementById("scheduleView");
const dayTabsEl = document.getElementById("dayTabs");
const dayTitleEl = document.getElementById("dayTitle");
const scheduleList = document.getElementById("scheduleList");

let activeKey = "pplSchedule";
const sched = () => state[activeKey];
const scheduleHeading = document.getElementById("scheduleHeading");

function openSchedule(key, heading) {
  activeKey = key;
  scheduleHeading.textContent = heading;
  habitView.classList.add("hidden");
  scheduleView.classList.remove("hidden");
  currentDayIndex = 0;
  renderSchedule();
}

document.getElementById("scheduleBtn").addEventListener("click", () => openSchedule("pplSchedule", "PPL Schedule"));
document.getElementById("planBtn").addEventListener("click", () => openSchedule("planSchedule", "Current Plan"));

document.getElementById("backToHabits").addEventListener("click", () => {
  scheduleView.classList.add("hidden");
  habitView.classList.remove("hidden");
});

function renderSchedule() {
  if (!loaded || !sched().length) return;

  if (currentDayIndex >= sched().length) currentDayIndex = 0;
  const day = sched()[currentDayIndex];

  dayTabsEl.innerHTML = sched().map((d, i) => `
    <button class="day-tab${i === currentDayIndex ? " active" : ""}" data-day-index="${i}">
      ${escapeHtml(d.title)}
    </button>
  `).join("");

  dayTitleEl.textContent = day.title;

  scheduleList.innerHTML = day.exercises.map((exercise, i) => `
    <div class="ex-row" draggable="true" data-exercise-row="${exercise.id}">
      <span class="ex-order" title="Drag to reorder">${i + 1}</span>
      <div class="ex-fields">
        <input
          class="ex-input name-input"
          data-exercise="${exercise.id}"
          value="${escapeAttr(exercise.name)}"
          placeholder="Exercise name">
        <input
          class="ex-input sets-input"
          data-exercise="${exercise.id}"
          value="${escapeAttr(exercise.sets)}"
          placeholder="3 x 8-12">
      </div>
      <button class="delete-exercise" data-delete-exercise="${exercise.id}" title="Remove exercise">×</button>
    </div>
  `).join("");
}

dayTabsEl.addEventListener("click", e => {
  const tab = e.target.closest("[data-day-index]");
  if (!tab) return;
  currentDayIndex = Number(tab.dataset.dayIndex);
  renderSchedule();
});

document.getElementById("addExercise").addEventListener("click", () => {
  const day = sched()[currentDayIndex];
  day.exercises.push(ex("New exercise", "3 x 10-12"));
  saveState();
  renderSchedule();
});

scheduleList.addEventListener("input", e => {
  const input = e.target.closest("[data-exercise]");
  if (!input) return;

  const day = sched()[currentDayIndex];
  const exercise = day.exercises.find(x => x.id === input.dataset.exercise);
  if (!exercise) return;

  if (input.classList.contains("name-input")) {
    exercise.name = input.value;
  } else {
    exercise.sets = input.value;
  }
});

scheduleList.addEventListener("change", () => {
  saveState();
});

scheduleList.addEventListener("click", e => {
  const deleteBtn = e.target.closest("[data-delete-exercise]");
  if (!deleteBtn) return;

  const day = sched()[currentDayIndex];
  const id = deleteBtn.dataset.deleteExercise;
  const exercise = day.exercises.find(x => x.id === id);

  if (exercise && confirm(`Remove "${exercise.name}"?`)) {
    day.exercises = day.exercises.filter(x => x.id !== id);
    saveState();
    renderSchedule();
  }
});

/* Drag-and-drop reordering with a FLIP animation */
let draggingId = null;

scheduleList.addEventListener("dragstart", e => {
  const row = e.target.closest("[data-exercise-row]");
  if (!row) return;
  draggingId = row.dataset.exerciseRow;
  row.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
});

scheduleList.addEventListener("dragend", () => {
  const row = scheduleList.querySelector(".dragging");
  if (row) row.classList.remove("dragging");
  scheduleList.querySelectorAll(".drop-target").forEach(r => r.classList.remove("drop-target"));
  draggingId = null;
});

scheduleList.addEventListener("dragover", e => {
  e.preventDefault();
  const overRow = e.target.closest("[data-exercise-row]");
  scheduleList.querySelectorAll(".drop-target").forEach(r => r.classList.remove("drop-target"));
  if (overRow && overRow.dataset.exerciseRow !== draggingId) {
    overRow.classList.add("drop-target");
  }
});

scheduleList.addEventListener("drop", e => {
  e.preventDefault();
  const overRow = e.target.closest("[data-exercise-row]");
  scheduleList.querySelectorAll(".drop-target").forEach(r => r.classList.remove("drop-target"));
  if (!overRow || !draggingId || overRow.dataset.exerciseRow === draggingId) return;

  const day = sched()[currentDayIndex];
  const fromIndex = day.exercises.findIndex(x => x.id === draggingId);
  const toIndex = day.exercises.findIndex(x => x.id === overRow.dataset.exerciseRow);
  if (fromIndex === -1 || toIndex === -1) return;

  // Capture current row positions for the FLIP animation
  const firstRects = new Map();
  scheduleList.querySelectorAll("[data-exercise-row]").forEach(r => {
    firstRects.set(r.dataset.exerciseRow, r.getBoundingClientRect());
  });

  const [moved] = day.exercises.splice(fromIndex, 1);
  day.exercises.splice(toIndex, 0, moved);
  saveState();
  renderSchedule();

  requestAnimationFrame(() => {
    scheduleList.querySelectorAll("[data-exercise-row]").forEach(r => {
      const first = firstRects.get(r.dataset.exerciseRow);
      if (!first) return;
      const last = r.getBoundingClientRect();
      const deltaY = first.top - last.top;
      if (deltaY) {
        r.style.transform = `translateY(${deltaY}px)`;
        r.style.transition = "transform 0s";
        requestAnimationFrame(() => {
          r.style.transform = "";
          r.style.transition = "transform .18s ease";
        });
      }
    });
  });
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

import { SITE_PASSCODE } from "./passcode-config.js";

/* ---------------- Lock screen ---------------- */


const authScreen = document.getElementById("authScreen");
const appRoot = document.getElementById("appRoot");
const authError = document.getElementById("authError");

const authForm = document.getElementById("authForm");
const authPasswordInput = document.getElementById("authPassword");
const rememberDeviceInput = document.getElementById("rememberDevice");

const UNLOCK_KEY = "habitTrackerUnlocked";

function isUnlocked() {
  return localStorage.getItem(UNLOCK_KEY) === "1" ||
         sessionStorage.getItem(UNLOCK_KEY) === "1";
}

function unlock(remember) {
  if (remember) {
    localStorage.setItem(UNLOCK_KEY, "1");
  } else {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  }
  showApp();
}

function lock() {
  localStorage.removeItem(UNLOCK_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
  if (unsubscribeDoc) {
    unsubscribeDoc();
    unsubscribeDoc = null;
  }
  docRef = null;
  loaded = false;
  state = { habits: [], checks: {}, pplSchedule: [], planSchedule: [] };
  authForm.reset();
  appRoot.classList.add("hidden");
  authScreen.classList.remove("hidden");
}

function showApp() {
  console.log("[lock] showApp running");
  authScreen.classList.add("hidden");
  appRoot.classList.remove("hidden");
  loaded = false;
  state = { habits: [], checks: {}, pplSchedule: [], planSchedule: [] };
  render();
  subscribeToUserData();
}
authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  authError.classList.add("hidden");

  const entered = authPasswordInput.value.trim();
  console.log("[lock] submit fired, entered length:", entered.length);

  if (entered === SITE_PASSCODE) {
    console.log("[lock] passcode correct, unlocking");
    unlock(rememberDeviceInput.checked);
  } else {
    console.log("[lock] passcode incorrect");
    authError.textContent = "Wrong passcode.";
    authError.classList.remove("hidden");
    authPasswordInput.value = "";
  }
});

document.getElementById("signOutBtn").addEventListener("click", lock);

// Quiet, invisible auth so Firestore rules (auth != null) are satisfied.
// No sign-in UI, no accounts — the passcode above is the only gate the
// user sees.
signInAnonymously(auth).catch(err => {
  console.error("Anonymous auth failed", err);
});

onAuthStateChanged(auth, user => {
  if (user && isUnlocked()) {
    showApp();
  }
});