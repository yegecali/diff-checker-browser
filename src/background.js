// Auto-open side panel when diff is ready
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'STATE_UPDATE' && msg.state.phase === 'SHOWING_DIFF' && sender.tab?.id) {
    // Chrome / Edge — sidePanel API
    if (chrome.sidePanel?.open) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    }
    // Firefox — sidebarAction.open() requires a user gesture so auto-open is not
    // possible from a background message handler; the user opens it via the popup.
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    if (command === 'start_element_1') {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_PICK', slot: 1 });
    } else if (command === 'start_element_2') {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_PICK', slot: 2 });
    }
  } catch (error) {
    // Content script not ready - try to inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css'],
      });
      // Retry the command after injection
      setTimeout(async () => {
        try {
          if (command === 'start_element_1') {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_PICK', slot: 1 });
          } else if (command === 'start_element_2') {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_PICK', slot: 2 });
          }
        } catch (_) {
          // Silently fail if still not working
        }
      }, 150);
    } catch (_) {
      // Can't inject on this page (e.g., chrome://)
    }
  }
});
