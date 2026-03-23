chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'STATE_UPDATE' && msg.state.phase === 'SHOWING_DIFF' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
  }
});
