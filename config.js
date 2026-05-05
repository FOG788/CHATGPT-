(function initSharedConfig(global) {
  const DEFAULTS = {
    enableDeleteButton: false,
    enableRecentCount: false,
    enableDeleteShortcut: false,
    enableNavShortcuts: false,
    enableRandomThreadButton: false,
    enableThreadNavButtons: false,
    enableAutoScrollRecent: false,
    afterDeleteMoveMode: "random",
    shortcutDelete: "Ctrl+Shift+Backspace",
    shortcutNavDown: "Alt+J",
    shortcutNavUp: "Alt+K",
    shortcutRandom: "Alt+R",
    autoScrollIntervalMs: 60000,
    autoScrollMaxRuns: 20,
    autoScrollStepWaitMs: 2000,
    autoScrollRecentThreshold: 100,
    snippet1Text: "お疲れさまです。要点だけ3つでお願いします。",
    snippet1Shortcut: "Alt+1",
    snippet2Text: "結論→理由→次アクションの順で整理してください。",
    snippet2Shortcut: "Alt+2",
    snippet3Text: "小学生にもわかる言葉で説明してください。",
    snippet3Shortcut: "Alt+3",
    snippet4Text: "この内容を箇条書きで5行以内に要約してください。",
    snippet4Shortcut: "Alt+4",
    snippet5Text: "この文章を丁寧語に書き換えてください。",
    snippet5Shortcut: "Alt+5",
  };

  const NUMERIC_SETTING_KEYS = [
    "autoScrollIntervalMs",
    "autoScrollMaxRuns",
    "autoScrollStepWaitMs",
    "autoScrollRecentThreshold",
  ];

  const TEXT_SETTING_KEYS = [
    "afterDeleteMoveMode",
    "shortcutDelete",
    "shortcutNavDown",
    "shortcutNavUp",
    "shortcutRandom",
    "snippet1Text", "snippet1Shortcut",
    "snippet2Text", "snippet2Shortcut",
    "snippet3Text", "snippet3Shortcut",
    "snippet4Text", "snippet4Shortcut",
    "snippet5Text", "snippet5Shortcut",
  ];

  function normalizeShortcut(shortcut) {
    return String(shortcut || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function matchesShortcut(event, shortcut) {
    const raw = normalizeShortcut(shortcut);
    if (!raw) return false;
    const parts = raw.split("+").filter(Boolean);
    const needCtrl = parts.includes("ctrl") || parts.includes("control");
    const needMeta = parts.includes("cmd") || parts.includes("meta");
    const needAlt = parts.includes("alt") || parts.includes("option");
    const needShift = parts.includes("shift");
    const key = parts[parts.length - 1];
    if (!key) return false;

    if (!!event.ctrlKey !== needCtrl) return false;
    if (!!event.metaKey !== needMeta) return false;
    if (!!event.altKey !== needAlt) return false;
    if (!!event.shiftKey !== needShift) return false;

    return String(event.key || "").toLowerCase() === key.toLowerCase();
  }

  global.ChatGPTThreadDeleterConfig = {
    DEFAULTS,
    NUMERIC_SETTING_KEYS,
    TEXT_SETTING_KEYS,
    normalizeShortcut,
    matchesShortcut,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
