import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4I0aYiQ2XVfUnDj2K_avXUtQa2hUIuZY",
  authDomain: "habittracker-10264.firebaseapp.com",
  projectId: "habittracker-10264",
  storageBucket: "habittracker-10264.firebasestorage.app",
  messagingSenderId: "1076569237929",
  appId: "1:1076569237929:web:e6320b55672d187b873cb8",
  measurementId: "G-VZGMWXRBRD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "habitTracker", "sharedData");

const defaultHabits = [
  { id: crypto.randomUUID(), name: "🌅 Wake up by 5:00" },
  { id: crypto.randomUUID(), name: "🏋️ Gym / Workout" },
  { id: crypto.randomUUID(), name: "📚 Reading / Learning" },
  { id: crypto.randomUUID(), name: "🇯🇵 Japanese" },
  { id: crypto.randomUUID(), name: "💻 Project Work" },
  { id: crypto.randomUUID(), name: "💼 Job Applications" },
  { id: crypto.randomUUID(), name: "😴 7+ Hours Sleep" }
];

let state = { habits: defaultHabits, checks: {} };
let viewDate = new Date();
let isRemoteUpdate = false;

const monthLabel = document.getElementById("monthLabel");
const yearLabel = document.getElementById("yearLabel");
const tableHead = document.querySelector("#habitTable thead");
const tableBody = document.querySelector("#habitTable tbody");
const completionEl = document.getElementById("completion");
const bestStreakEl = document.getElementById("bestStreak");
const todayCountEl = document.getElementById("todayCount");

async function saveState() {
  isRemoteUpdate = true;
  try {
    await setDoc(docRef, state);
  } catch (e) {
    console.error("Failed to save to Firestore", e);
  }
}

// Live sync: whenever Firestore data changes (from any device), update UI
onSnapshot(docRef, snap => {
  if (isRemoteUpdate) {
    isRemoteUpdate = false;
    return;
  }
  if (snap.exists()) {
    const data = snap.data();
    if (Array.isArray(data.habits) && data.checks) {
      state = data;
      render();
    }
  } else {
    // First time ever — seed Firestore with defaults
    setDoc(docRef, state);
  }
});

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

  completionEl.textContent = total ? `${Math.round((completed / total) * 100)}%` : "0%";

  const now = new Date();
  let todayCount = 0;
  if (now.getFullYear() === year && now.getMonth() === month) {
    state.habits.forEach(habit => {
      if (state.checks[keyFor(habit.id, year, month, now.getDate())]) todayCount++;
    });
  }
  todayCountEl.textContent = `${todayCount} / ${state.habits.length}`;

  bestStreakEl.textContent = `${calculateBestStreak()} days 🔥`;
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
    state = { habits: [], checks: {} };
    saveState();
    render();
  }
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

render();