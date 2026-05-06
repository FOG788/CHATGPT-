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
    railLeftPx: 340,
    railBottomPx: 150,
    mainTextMaxWidthPx: 760,
    snippetButtonWidthPx: 88,
    moveScrollTopThresholdPx: 3000,
    moveScrollTopDelayMs: 1200,
    snippet1Text: "お疲れさまです。要点だけ3つでお願いします。",
    snippet1Label: "定型1",
    snippet1Shortcut: "Alt+1",
    snippet2Text: "結論→理由→次アクションの順で整理してください。",
    snippet2Label: "定型2",
    snippet2Shortcut: "Alt+2",
    snippet3Text: "小学生にもわかる言葉で説明してください。",
    snippet3Label: "定型3",
    snippet3Shortcut: "Alt+3",
    snippet4Text: "この内容を箇条書きで5行以内に要約してください。",
    snippet4Label: "定型4",
    snippet4Shortcut: "Alt+4",
    snippet5Text: "この文章を丁寧語に書き換えてください。",
    snippet5Label: "定型5",
    snippet5Shortcut: "Alt+5",
  };

  const NUMERIC_SETTING_KEYS = [
    "autoScrollIntervalMs",
    "autoScrollMaxRuns",
    "autoScrollStepWaitMs",
    "autoScrollRecentThreshold",
    "railLeftPx",
    "railBottomPx",
    "mainTextMaxWidthPx",
    "snippetButtonWidthPx",
    "moveScrollTopThresholdPx",
    "moveScrollTopDelayMs",
  ];

  const TEXT_SETTING_KEYS = [
    "afterDeleteMoveMode",
    "shortcutDelete",
    "shortcutNavDown",
    "shortcutNavUp",
    "shortcutRandom",
    "snippet1Text", "snippet1Shortcut",
    "snippet1Label",
    "snippet2Text", "snippet2Shortcut",
    "snippet2Label",
    "snippet3Text", "snippet3Shortcut",
    "snippet3Label",
    "snippet4Text", "snippet4Shortcut",
    "snippet4Label",
    "snippet5Text", "snippet5Shortcut",
    "snippet5Label",
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
