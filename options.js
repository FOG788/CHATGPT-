const SHARED = globalThis.ChatGPTThreadDeleterConfig || {};
const DEFAULTS = SHARED.DEFAULTS || {};
const NUMERIC_SETTING_KEYS = SHARED.NUMERIC_SETTING_KEYS || [];
const TEXT_SETTING_KEYS = SHARED.TEXT_SETTING_KEYS || [];
const STATUS_CLEAR_DELAY_MS = 1200;

const NUMERIC_INPUT_DEFS = [
  {
    id: "autoScrollIntervalMin",
    payloadKey: "autoScrollIntervalMs",
    min: 1,
    max: 30,
    fallback: 1,
    read: (data) => Math.round((data.autoScrollIntervalMs || 60000) / 60000),
    write: (value) => value * 60000,
  },
  {
    id: "autoScrollMaxRuns",
    payloadKey: "autoScrollMaxRuns",
    min: 1,
    max: 200,
    fallback: 20,
    read: (data) => data.autoScrollMaxRuns || 20,
  },
  {
    id: "autoScrollStepWaitSec",
    payloadKey: "autoScrollStepWaitMs",
    min: 1,
    max: 300,
    fallback: 2,
    read: (data) => Math.round((data.autoScrollStepWaitMs || 2000) / 1000),
    write: (value) => value * 1000,
  },
  {
    id: "autoScrollRecentThreshold",
    payloadKey: "autoScrollRecentThreshold",
    min: 1,
    max: 1000,
    fallback: 100,
    read: (data) => data.autoScrollRecentThreshold || 100,
  },
  { id: "railLeftPx", payloadKey: "railLeftPx", min: 0, max: 1600, fallback: 340, read: (data) => data.railLeftPx || 340 },
  { id: "railBottomPx", payloadKey: "railBottomPx", min: 0, max: 1200, fallback: 150, read: (data) => data.railBottomPx || 150 },
  {
    id: "mainTextMaxWidthPx",
    payloadKey: "mainTextMaxWidthPx",
    min: 480,
    max: 2000,
    fallback: 760,
    read: (data) => data.mainTextMaxWidthPx || 760,
  },
  {
    id: "snippetButtonWidthPx",
    payloadKey: "snippetButtonWidthPx",
    min: 56,
    max: 320,
    fallback: 88,
    read: (data) => data.snippetButtonWidthPx || 88,
  },
];

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
  for (const def of NUMERIC_INPUT_DEFS) {
    document.getElementById(def.id).value = String(def.read(data));
  }
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

  for (const def of NUMERIC_INPUT_DEFS) {
    const rawValue = document.getElementById(def.id).value;
    const clamped = clamp(rawValue, def.min, def.max, def.fallback);
    payload[def.payloadKey] = def.write ? def.write(clamped) : clamped;
  }

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
