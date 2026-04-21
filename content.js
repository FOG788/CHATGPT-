(() => {
  const DEFAULTS = {
    enableDeleteButton: false,
    enableRecentCount: false,
    enableDeleteShortcut: false,
    enableNavShortcuts: false,
    enableAutoScrollRecent: false,
    enableAutoMoveAfterDelete: false,
    enableDeleteTimerDisplay: false,
    deleteTimerDurationMs: 300000,
    autoMoveDelayMs: 4000,
    autoScrollIntervalMs: 60000,
    autoScrollMaxRuns: 20,
    autoScrollStepWaitMs: 2000,
    autoScrollRecentThreshold: 100,
  };

  const IDS = {
    slot: "cgpt-inline-slot",
    count: "cgpt-recent-count",
    del: "cgpt-delete",
    settings: "cgpt-open-settings",
    style: "cgpt-inline-style",
    toast: "cgpt-inline-toast",
    timer: "cgpt-delete-timer",
  };

  const STORAGE_KEYS = {
    deleteTimerEndsAt: "cgpt_delete_timer_ends_at",
    nextAutoScrollAt: "cgpt_next_auto_scroll_at",
  };

  let settings = { ...DEFAULTS };
  let cachedToken = null;
  let tokenTime = 0;
  let deleteInFlight = false;
  let lastPath = location.pathname;
  let healTimer = null;
  let autoScrollInFlight = false;
  let lastAutoScrollAt = 0;
  let recentRefreshTimer = null;
  let deleteTimerTicker = null;
  let deleteTimerEndsAt = 0;

  function clamp(n, min, max, fallback) {
    n = Number(n);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function normalizeSettings(raw) {
    const s = { ...DEFAULTS, ...raw };
    s.autoMoveDelayMs = clamp(s.autoMoveDelayMs, 3000, 5000, 4000);
    s.autoScrollIntervalMs = clamp(s.autoScrollIntervalMs, 60000, 1800000, 60000);
    s.autoScrollMaxRuns = clamp(s.autoScrollMaxRuns, 1, 200, 20);
    s.autoScrollStepWaitMs = clamp(s.autoScrollStepWaitMs, 1000, 300000, 2000);
    s.autoScrollRecentThreshold = clamp(s.autoScrollRecentThreshold, 1, 1000, 100);
    s.deleteTimerDurationMs = clamp(s.deleteTimerDurationMs, 60000, 86400000, 300000);
    return s;
  }

  function getConversationIdFromPath(path = location.pathname) {
    const m = path.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function isConversation(path = location.pathname) {
    return !!getConversationIdFromPath(path);
  }

  function hrefPath(href) {
    try {
      return new URL(href, location.origin).pathname;
    } catch {
      return href || "";
    }
  }

  function formatMs(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function showToast(message, kind = "info", ms = 1500) {
    let el = document.getElementById(IDS.toast);
    if (!el) {
      el = document.createElement("div");
      el.id = IDS.toast;
      Object.assign(el.style, {
        position: "fixed",
        left: "16px",
        bottom: "16px",
        zIndex: "2147483647",
        padding: "10px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "700",
        color: "#fff",
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      });
      document.body.appendChild(el);
    }
    el.style.background = kind === "error" ? "#b91c1c" : "#111827";
    el.textContent = message;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { if (el && el.parentNode) el.remove(); }, ms);
  }

  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get(DEFAULTS);
      settings = normalizeSettings(data);
    } catch {
      settings = { ...DEFAULTS };
    }
  }

  function loadNextAutoScrollAt() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.nextAutoScrollAt);
      const n = Number(raw);
      if (Number.isFinite(n) && n > Date.now()) {
        lastAutoScrollAt = n - settings.autoScrollIntervalMs;
        return;
      }
    } catch {}
    // Respect interval from startup, not immediate execution.
    lastAutoScrollAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.nextAutoScrollAt, String(Date.now() + settings.autoScrollIntervalMs));
    } catch {}
  }

  function setNextAutoScrollAtFromNow() {
    lastAutoScrollAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.nextAutoScrollAt, String(lastAutoScrollAt + settings.autoScrollIntervalMs));
    } catch {}
  }

  function markAutoScrollCompleted() {
    lastAutoScrollAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.nextAutoScrollAt, String(lastAutoScrollAt + settings.autoScrollIntervalMs));
    } catch {}
  }

  function injectStyle() {
    if (document.getElementById(IDS.style)) return;
    const style = document.createElement("style");
    style.id = IDS.style;
    style.textContent = `
      #${IDS.slot}{display:flex;gap:8px;align-items:center;margin-right:8px;flex:0 0 auto}
      #${IDS.count},#${IDS.timer}{padding:0 10px;height:36px;display:flex;align-items:center;background:#111827;color:#fff;border-radius:8px;font-size:12px;font-weight:700}
      #${IDS.del}{height:36px;padding:0 12px;background:#e11d48;color:#fff;border:none;border-radius:8px;cursor:pointer}
      #${IDS.del}:disabled{opacity:.72;cursor:wait}
      #${IDS.settings}{height:36px;padding:0 12px;background:#374151;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-left:8px;flex:0 0 auto}
    `;
    document.documentElement.appendChild(style);
  }

  function findAnchor() {
    return document.querySelector("form") || document.querySelector("textarea")?.parentElement || null;
  }

  function getRecentLinks() {
    return [...document.querySelectorAll('nav a[href*="/c/"]')];
  }

  function getRecentCount() {
    return getRecentLinks().length;
  }

  function getConversationLinks() {
    return [...document.querySelectorAll('a[href*="/c/"]')];
  }

  function getNeighborHref(offset) {
    const currentPath = location.pathname;
    const links = getConversationLinks();
    const idx = links.findIndex(a => hrefPath(a.href || a.getAttribute("href")) === currentPath);
    const target = idx >= 0 ? links[idx + offset] : null;
    return target ? (target.href || target.getAttribute("href")) : null;
  }

  function findSidebarScrollable() {
    const links = getRecentLinks();
    const seen = new Set();
    for (const link of links.slice(0, 5)) {
      let node = link;
      for (let i = 0; i < 8 && node; i++) {
        node = node.parentElement;
        if (!node || seen.has(node)) continue;
        seen.add(node);
        try {
          const style = getComputedStyle(node);
          const canScroll = /(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow);
          if (canScroll && node.scrollHeight > node.clientHeight + 20) return node;
        } catch {}
      }
    }
    return null;
  }

  function updateTimerUI() {
    const el = document.getElementById(IDS.timer);
    if (!el || !settings.enableDeleteTimerDisplay) return;
    const remaining = deleteTimerEndsAt - Date.now();
    el.textContent = "削除タイマー: " + formatMs(remaining);
  }

  function startDeleteTimer() {
    deleteTimerEndsAt = Date.now() + settings.deleteTimerDurationMs;
    try {
      localStorage.setItem(STORAGE_KEYS.deleteTimerEndsAt, String(deleteTimerEndsAt));
    } catch {}
    updateTimerUI();
    if (deleteTimerTicker) clearInterval(deleteTimerTicker);
    deleteTimerTicker = setInterval(() => {
      updateTimerUI();
      if (Date.now() >= deleteTimerEndsAt) {
        clearInterval(deleteTimerTicker);
        deleteTimerTicker = null;
      }
    }, 1000);
  }

  function restoreDeleteTimer() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.deleteTimerEndsAt);
      const n = Number(raw);
      if (Number.isFinite(n) && n > Date.now()) {
        deleteTimerEndsAt = n;
        if (deleteTimerTicker) clearInterval(deleteTimerTicker);
        deleteTimerTicker = setInterval(() => {
          updateTimerUI();
          if (Date.now() >= deleteTimerEndsAt) {
            clearInterval(deleteTimerTicker);
            deleteTimerTicker = null;
            showToast("削除タイマー終了");
          }
        }, 1000);
      }
    } catch {}
  }

  function ensureSettingsButton(anchor) {
    let btn = document.getElementById(IDS.settings);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = IDS.settings;
      btn.type = "button";
      btn.textContent = "機能設定";
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const extUrl = chrome.runtime.getURL("options.html");
        try {
          const resp = await chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
          if (resp && resp.ok) return;
        } catch {}
        try {
          window.open(extUrl, "_blank", "noopener,noreferrer");
        } catch {
          location.href = extUrl;
        }
      });
    }
    if (btn.parentElement !== anchor) anchor.appendChild(btn);
  }

  function removeInlineUI() {
    document.getElementById(IDS.slot)?.remove();
    document.getElementById(IDS.settings)?.remove();
  }

  function rerender() {
    injectStyle();
    if (!isConversation()) {
      removeInlineUI();
      return;
    }

    const anchor = findAnchor();
    if (!anchor) return;

    ensureSettingsButton(anchor);

    const anyInlineEnabled = settings.enableRecentCount || settings.enableDeleteButton || settings.enableDeleteTimerDisplay;
    let slot = document.getElementById(IDS.slot);

    if (!anyInlineEnabled) {
      if (slot) slot.remove();
      return;
    }

    if (!slot) {
      slot = document.createElement("div");
      slot.id = IDS.slot;
    }

    const countEl = document.getElementById(IDS.count);
    if (countEl && !settings.enableRecentCount) countEl.remove();

    const delEl = document.getElementById(IDS.del);
    if (delEl && !settings.enableDeleteButton) delEl.remove();

    const timerEl = document.getElementById(IDS.timer);
    if (timerEl && !settings.enableDeleteTimerDisplay) timerEl.remove();

    if (settings.enableRecentCount) {
      let count = document.getElementById(IDS.count);
      if (!count) {
        count = document.createElement("div");
        count.id = IDS.count;
        slot.appendChild(count);
      }
      count.textContent = "最近: " + getRecentCount();
    }

    if (settings.enableDeleteTimerDisplay) {
      let timer = document.getElementById(IDS.timer);
      if (!timer) {
        timer = document.createElement("div");
        timer.id = IDS.timer;
        slot.appendChild(timer);
      }
      updateTimerUI();
    }

    if (settings.enableDeleteButton && !document.getElementById(IDS.del)) {
      const btn = document.createElement("button");
      btn.id = IDS.del;
      btn.type = "button";
      btn.textContent = "削除";
      btn.addEventListener("click", deleteCurrentThread);
      slot.appendChild(btn);
    }

    if (slot.parentElement !== anchor) anchor.prepend(slot);
  }

  function startRecentCountAutoRefresh() {
    if (recentRefreshTimer) clearInterval(recentRefreshTimer);
    recentRefreshTimer = setInterval(() => {
      if (!settings.enableRecentCount) return;
      const el = document.getElementById(IDS.count);
      if (el) el.textContent = "最近: " + getRecentCount();
    }, 60000);
  }

  async function autoScrollRecentIfNeeded() {
    if (!settings.enableAutoScrollRecent) return;
    if (autoScrollInFlight) return;
    const now = Date.now();
    if (now - lastAutoScrollAt < settings.autoScrollIntervalMs) return;
    if (getRecentCount() > settings.autoScrollRecentThreshold) return;

    const scroller = findSidebarScrollable();
    if (!scroller) return;

    autoScrollInFlight = true;
    try {
      for (let i = 0; i < settings.autoScrollMaxRuns; i++) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" });
        scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
        await new Promise(r => setTimeout(r, settings.autoScrollStepWaitMs));
      }
      markAutoScrollCompleted();
      rerender();
    } finally {
      autoScrollInFlight = false;
    }
  }

  async function getToken() {
    const now = Date.now();
    if (cachedToken && (now - tokenTime) < 5 * 60 * 1000) return cachedToken;
    const res = await fetch("/api/auth/session");
    if (!res.ok) throw new Error("session fetch failed");
    const data = await res.json();
    if (!data || !data.accessToken) throw new Error("access token missing");
    cachedToken = data.accessToken;
    tokenTime = now;
    return cachedToken;
  }

  async function deleteCurrentThread() {
    if (!settings.enableDeleteButton && !settings.enableDeleteShortcut) return;
    if (deleteInFlight) return;

    const btn = document.getElementById(IDS.del);
    deleteInFlight = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "削除中…";
    }

    try {
      const id = getConversationIdFromPath();
      if (!id) throw new Error("conversation id not found");
      const token = await getToken();
      await new Promise(r => setTimeout(r, 1200));
      const res = await fetch(`/backend-api/conversation/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_visible: false })
      });
      if (!res.ok) throw new Error("delete failed");

      if (settings.enableDeleteTimerDisplay) startDeleteTimer();

      const shouldMove = settings.enableAutoMoveAfterDelete && !settings.enableAutoScrollRecent;
      if (!shouldMove) {
        showToast("削除しました");
        return;
      }

      const nextHref = getNeighborHref(1) || getNeighborHref(-1);
      if (!nextHref) {
        showToast("削除しました");
        return;
      }

      showToast(`削除後に ${Math.round(settings.autoMoveDelayMs / 1000)} 秒待って移動`);
      setTimeout(() => { location.href = nextHref; }, settings.autoMoveDelayMs);
    } catch (e) {
      console.error(e);
      alert("削除失敗");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "削除";
      }
    } finally {
      setTimeout(() => {
        deleteInFlight = false;
        const liveBtn = document.getElementById(IDS.del);
        if (liveBtn) {
          liveBtn.disabled = false;
          liveBtn.textContent = "削除";
        }
      }, 50);
    }
  }

  function navigate(offset) {
    if (!settings.enableNavShortcuts) return;
    const href = getNeighborHref(offset);
    if (href) location.href = href;
  }

  function startHealingLoop() {
    if (healTimer) clearTimeout(healTimer);
    const tick = () => {
      const anchor = findAnchor();
      const settingsBtn = document.getElementById(IDS.settings);
      const slot = document.getElementById(IDS.slot);
      const inlineNeeded = settings.enableRecentCount || settings.enableDeleteButton || settings.enableDeleteTimerDisplay;
      const needsRepair =
        (anchor && settingsBtn && settingsBtn.parentElement !== anchor) ||
        (anchor && !settingsBtn) ||
        (inlineNeeded && anchor && (!slot || slot.parentElement !== anchor));
      if (needsRepair) rerender();
      if (settings.enableAutoScrollRecent) autoScrollRecentIfNeeded();
      healTimer = setTimeout(tick, 1500);
    };
    healTimer = setTimeout(tick, 1500);
  }

  function installKeyboard() {
    document.addEventListener("keydown", (e) => {
      const key = (e.key || "").toLowerCase();
      if (settings.enableNavShortcuts && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && key === "j") {
        e.preventDefault();
        navigate(1);
        return;
      }
      if (settings.enableNavShortcuts && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && key === "k") {
        e.preventDefault();
        navigate(-1);
        return;
      }
      if (settings.enableDeleteShortcut && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        deleteCurrentThread();
      }
    }, true);
  }

  function onPathChange() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      setTimeout(rerender, 250);
      setTimeout(rerender, 900);
      setTimeout(rerender, 1600);
    }
  }

  function hookHistory() {
    const wrap = (name) => {
      const original = history[name];
      if (typeof original !== "function") return;
      history[name] = function(...args) {
        const result = original.apply(this, args);
        queueMicrotask(onPathChange);
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", onPathChange, true);
  }

  function installStorageListener() {
    if (!chrome?.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      let changed = false;
      for (const key of Object.keys(DEFAULTS)) {
        if (changes[key]) {
          settings[key] = changes[key].newValue;
          changed = true;
        }
      }
      settings = normalizeSettings(settings);
      if (changes.autoScrollIntervalMs || changes.enableAutoScrollRecent) {
        setNextAutoScrollAtFromNow();
      }
      if (changed) {
        rerender();
        startRecentCountAutoRefresh();
      }
    });
  }

  async function boot() {
    await loadSettings();
    loadNextAutoScrollAt();
    restoreDeleteTimer();
    injectStyle();
    installKeyboard();
    hookHistory();
    installStorageListener();
    startRecentCountAutoRefresh();
    setTimeout(rerender, 400);
    setTimeout(rerender, 1200);
    setTimeout(rerender, 2200);
    startHealingLoop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();