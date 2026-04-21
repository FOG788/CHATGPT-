chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "OPEN_OPTIONS_PAGE") {
    chrome.runtime.openOptionsPage(() => {
      const err = chrome.runtime.lastError;
      if (err) sendResponse({ ok: false, error: err.message });
      else sendResponse({ ok: true });
    });
    return true;
  }
});
