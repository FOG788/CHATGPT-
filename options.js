const SHARED = globalThis.ChatGPTThreadDeleterConfig || {};
const DEFAULTS = SHARED.DEFAULTS || {};
const NUMERIC_SETTING_KEYS = SHARED.NUMERIC_SETTING_KEYS || [];
const TEXT_SETTING_KEYS = SHARED.TEXT_SETTING_KEYS || [];
const STATUS_CLEAR_DELAY_MS = 1200;

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function getCheckboxSettingKeys() {
  return Object.keys(DEFAULTS).filter(
    (key) => !NUMERIC_SETTING_KEYS.includes(key) && !TEXT_SETTING_KEYS.includes(key),
  );
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
  document.getElementById("railLeftPx").value = String(data.railLeftPx || 340);
  document.getElementById("railBottomPx").value = String(data.railBottomPx || 150);
  document.getElementById("mainTextMaxWidthPx").value = String(data.mainTextMaxWidthPx || 760);
  document.getElementById("snippetButtonWidthPx").value = String(data.snippetButtonWidthPx || 88);
  document.getElementById("moveScrollTopThresholdPx").value = String(data.moveScrollTopThresholdPx || 3000);
}

function loadTextInputs(data) {
  for (const key of TEXT_SETTING_KEYS) {
    const el = document.getElementById(key);
    if (el) el.value = String(data[key] ?? DEFAULTS[key] ?? "");
  }
}

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  loadCheckboxes(data);
  loadNumericInputs(data);
  loadTextInputs(data);
}

function buildPayload() {
  const payload = {};

  for (const key of getCheckboxSettingKeys()) {
    payload[key] = document.getElementById(key).checked;
  }

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
  payload.railLeftPx = clamp(document.getElementById("railLeftPx").value, 0, 1600, 340);
  payload.railBottomPx = clamp(document.getElementById("railBottomPx").value, 0, 1200, 150);
  payload.mainTextMaxWidthPx = clamp(
    document.getElementById("mainTextMaxWidthPx").value,
    480,
    2000,
    760,
  );
  payload.snippetButtonWidthPx = clamp(
    document.getElementById("snippetButtonWidthPx").value,
    56,
    320,
    88,
  );
  payload.moveScrollTopThresholdPx = clamp(
    document.getElementById("moveScrollTopThresholdPx").value,
    800,
    40000,
    3000,
  );
  for (const key of TEXT_SETTING_KEYS) {
    const el = document.getElementById(key);
    payload[key] = (el?.value || "").trim() || DEFAULTS[key];
  }

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

async function enableAll() {
  const payload = { ...DEFAULTS };
  for (const key of getCheckboxSettingKeys()) payload[key] = true;
  await chrome.storage.sync.set(payload);
  await load();
  setStatus("全部オンにしました");
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("enableAll").addEventListener("click", enableAll);
document.getElementById("disableAll").addEventListener("click", disableAll);

load();
