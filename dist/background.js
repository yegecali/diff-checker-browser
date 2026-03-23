chrome.runtime.onMessage.addListener((e,a)=>{var t;e.type==="STATE_UPDATE"&&e.state.phase==="SHOWING_DIFF"&&((t=a.tab)!=null&&t.id)&&chrome.sidePanel.open({tabId:a.tab.id}).catch(()=>{})});
