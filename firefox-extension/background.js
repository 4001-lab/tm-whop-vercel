let proxyMap = {};
let tabData = {};
let processingQueue = [];
let currentIndex = 0;
let isProcessing = false;

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === "start") {
    const { eventUrls, credentials } = message;
    
    // Reset processing state
    processingQueue = [];
    currentIndex = 0;
    isProcessing = false;
    
    // Prepare queue
    for (let i = 0; i < credentials.length; i++) {
      processingQueue.push({
        eventUrl: eventUrls.length === 1 ? eventUrls[0] : eventUrls[i],
        credentials: credentials[i],
        index: i
      });
    }

    //console.log(processingQueue.length, 'tabs to process with credentials:', credentials.length);
    
    // Start sequential processing
    await processNextTab();
  } else if (message.action === "loginComplete") {
    //console.log('Login completed for tab:', sender.tab.id);
    // Process next tab after current login is complete
    setTimeout(() => processNextTab(), 2000);
  } else if (message.action === "getCredentials") {
    //console.log('Asking credentials for tab:', sender.tab.id);
    //console.log('Available tabData:', Object.keys(tabData));
    const tabId = sender.tab.id;
    const data = tabData[tabId];
    if (data) {
      //console.log('Sending credentials for tab:', tabId);
      return Promise.resolve({ username: data.username, password: data.password });
    } else {
      console.log('No data found for tab:', tabId);
    }
  }
  return Promise.resolve({});
});

// Sequential tab processing function
async function processNextTab() {
  if (currentIndex >= processingQueue.length || isProcessing) {
    return;
  }
  
  isProcessing = true;
  const item = processingQueue[currentIndex];
  const { eventUrl, credentials: creds, index } = item;
  const [proxyWithPort, username, password] = creds;
  // amazonq-ignore-next-line
  const [proxyHost, proxyPort] = proxyWithPort.split(':');
  
  //console.log(`Processing tab ${currentIndex + 1}/${processingQueue.length}`);
  //console.log('Extracted:', { proxyHost, proxyPort, username, password });
  
  // Create container
  const colors = ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"];
  const identity = await browser.contextualIdentities.create({
    name: username,
    color: colors[index % colors.length],
    icon: "fingerprint"
  });
  
  const cookieStoreId = identity.cookieStoreId;
  proxyMap[cookieStoreId] = { host: proxyHost, port: parseInt(proxyPort) };
  
  // Create tab with focus
  const tab = await browser.tabs.create({
    cookieStoreId,
    url: "https://www.ticketmaster.com/member?tm_link=edp_Login",
    active: true // Focus on this tab
  });
  
  tabData[tab.id] = { username, password, eventUrl, state: "login", index };
  currentIndex++;
  isProcessing = false;
}

// Handle tab updates for login and navigation
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tabData[tabId]) {
    const data = tabData[tabId];
    if (data.state === "login") {
      data.state = "waiting_for_login";
    } else if (data.state === "waiting_for_login" && tab.url.includes("my.ticketmaster.com")) {
      browser.tabs.update(tabId, { url: data.eventUrl });
      tabData[tabId] = undefined;
    }
  }
});

// Proxy setup
browser.proxy.onRequest.addListener((details) => {
  const cookieStoreId = details.cookieStoreId;
  const proxy = proxyMap[cookieStoreId];
  if (proxy) {
    //console.log(`Using proxy ${proxy.host}:${proxy.port} for container ${cookieStoreId}`);
    return { type: "http", host: proxy.host, port: proxy.port };
  }
  //console.log(`Direct connection for ${details.url}`);
  return { type: "direct" };
}, { urls: ["<all_urls>"] });

// Open sidepanel when extension icon is clicked
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.open();
});

