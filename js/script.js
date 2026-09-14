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

let state = { habits: [], checks: {}, pplSchedule: [] };
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
  if (!Array.isArray(state.pplSchedule) || !state.pplSchedule.length) {
    state.pplSchedule = defaultSchedule;
  }
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
      state = { habits: defaultHabits, checks: {}, pplSchedule: defaultSchedule };
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

document.getElementById("scheduleBtn").addEventListener("click", () => {
  habitView.classList.add("hidden");
  scheduleView.classList.remove("hidden");
  currentDayIndex = 0;
  renderSchedule();
});

document.getElementById("backToHabits").addEventListener("click", () => {
  scheduleView.classList.add("hidden");
  habitView.classList.remove("hidden");
});

function renderSchedule() {
  if (!loaded || !state.pplSchedule.length) return;

  if (currentDayIndex >= state.pplSchedule.length) currentDayIndex = 0;
  const day = state.pplSchedule[currentDayIndex];

  dayTabsEl.innerHTML = state.pplSchedule.map((d, i) => `
    <button class="day-tab${i === currentDayIndex ? " active" : ""}" data-day-index="${i}">
      ${escapeHtml(d.title)}
    </button>
  `).join("");

  dayTitleEl.textContent = day.title;

  scheduleList.innerHTML = day.exercises.map(exercise => `
    <div class="ex-row" draggable="true" data-exercise-row="${exercise.id}">
      <span class="ex-grip" title="Drag to reorder">⠿</span>
      <div class="ex-name-cell">
        <input
          class="ex-input name-input"
          data-exercise="${exercise.id}"
          value="${escapeAttr(exercise.name)}"
          placeholder="Exercise name">
      </div>
      <input
        class="ex-input sets-input"
        data-exercise="${exercise.id}"
        value="${escapeAttr(exercise.sets)}"
        placeholder="3 x 8-12">
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
  const day = state.pplSchedule[currentDayIndex];
  day.exercises.push(ex("New exercise", "3 x 10-12"));
  saveState();
  renderSchedule();
});

scheduleList.addEventListener("input", e => {
  const input = e.target.closest("[data-exercise]");
  if (!input) return;

  const day = state.pplSchedule[currentDayIndex];
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

  const day = state.pplSchedule[currentDayIndex];
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

  const day = state.pplSchedule[currentDayIndex];
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
  state = { habits: [], checks: {}, pplSchedule: [] };
  authForm.reset();
  appRoot.classList.add("hidden");
  authScreen.classList.remove("hidden");
}

function showApp() {
  console.log("[lock] showApp running");
  authScreen.classList.add("hidden");
  appRoot.classList.remove("hidden");
  loaded = false;
  state = { habits: [], checks: {}, pplSchedule: [] };
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