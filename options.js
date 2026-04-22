const DEFAULTS = {
  enableDeleteButton: false,
  enableRecentCount: false,
  enableDeleteShortcut: false,
  enableNavShortcuts: false,
  enableRandomThreadButton: false,
  enableAutoScrollRecent: false,
  enableDeleteTimerDisplay: false,
  deleteTimerDurationMs: 300000,
  autoScrollIntervalMs: 60000,
  autoScrollMaxRuns: 20,
  autoScrollStepWaitMs: 2000,
  autoScrollRecentThreshold: 100,
};

const NUMERIC_SETTING_KEYS = [
  "deleteTimerDurationMs",
  "autoScrollIntervalMs",
  "autoScrollMaxRuns",
  "autoScrollStepWaitMs",
  "autoScrollRecentThreshold",
];

const STATUS_CLEAR_DELAY_MS = 1200;

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function getCheckboxSettingKeys() {
  return Object.keys(DEFAULTS).filter((key) => !NUMERIC_SETTING_KEYS.includes(key));
}

function setStatus(message) {
  const status = document.getElementById("status");
  status.textContent = message;
  setTimeout(() => {
    status.textContent = "";
  }, STATUS_CLEAR_DELAY_MS);
}

function loadCheckboxes(data) {
  for (const key of getCheckboxSettingKeys()) {
    document.getElementById(key).checked = !!data[key];
  }
}

function loadNumericInputs(data) {
  document.getElementById("deleteTimerMin").value = String(
    Math.round((data.deleteTimerDurationMs || 300000) / 60000),
  );
  document.getElementById("autoScrollIntervalMin").value = String(
    Math.round((data.autoScrollIntervalMs || 60000) / 60000),
  );
  document.getElementById("autoScrollMaxRuns").value = String(data.autoScrollMaxRuns || 20);
  document.getElementById("autoScrollStepWaitSec").value = String(
    Math.round((data.autoScrollStepWaitMs || 2000) / 1000),
  );
  document.getElementById("autoScrollRecentThreshold").value = String(
    data.autoScrollRecentThreshold || 100,
  );
}

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  loadCheckboxes(data);
  loadNumericInputs(data);
}

function buildPayload() {
  const payload = {};

  for (const key of getCheckboxSettingKeys()) {
    payload[key] = document.getElementById(key).checked;
  }

  payload.deleteTimerDurationMs =
    clamp(document.getElementById("deleteTimerMin").value, 1, 1440, 5) * 60000;
  payload.autoScrollIntervalMs =
    clamp(document.getElementById("autoScrollIntervalMin").value, 1, 30, 1) * 60000;
  payload.autoScrollMaxRuns = clamp(document.getElementById("autoScrollMaxRuns").value, 1, 200, 20);
  payload.autoScrollStepWaitMs =
    clamp(document.getElementById("autoScrollStepWaitSec").value, 1, 300, 2) * 1000;
  payload.autoScrollRecentThreshold = clamp(
    document.getElementById("autoScrollRecentThreshold").value,
    1,
    1000,
    100,
  );

  return payload;
}

async function save() {
  await chrome.storage.sync.set(buildPayload());
  setStatus("保存しました");
}

async function disableAll() {
  await chrome.storage.sync.set(DEFAULTS);
  await load();
  setStatus("全部オフにしました");
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("disableAll").addEventListener("click", disableAll);

load();
