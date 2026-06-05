function normalizeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch (e) {
    return "";
  }
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    let normalized = parsed.origin + parsed.pathname;
    if (parsed.search) normalized += parsed.search;

    if (normalized.endsWith("/") && parsed.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }

    return normalized.toLowerCase();
  } catch (e) {
    return "";
  }
}

function getShortDisplayUrl(url, maxLength = 45) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const shortBase = `${host}${path}`;

    if (shortBase.length <= maxLength) {
      return shortBase;
    }

    return `${shortBase.slice(0, maxLength - 3)}...`;
  } catch (e) {
    return url || "";
  }
}

function matchRule(url, rules = []) {
  const hostname = normalizeHostname(url);
  const fullUrl = normalizeUrl(url);

  return rules.some((entry) => {
    const cleanEntry = (entry || "").trim().toLowerCase();
    if (!cleanEntry) return false;

    if (cleanEntry.startsWith("http://") || cleanEntry.startsWith("https://")) {
      const normalizedEntry = normalizeUrl(cleanEntry);
      return fullUrl === normalizedEntry || fullUrl.startsWith(normalizedEntry);
    }

    return hostname === cleanEntry || hostname.endsWith("." + cleanEntry);
  });
}

function isIgnoredUrl(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://")
  );
}

function sendPredictionToTab(tabId, tabUrl, data) {
  const enriched = {
    ...data,
    url: tabUrl,
    short_url: getShortDisplayUrl(tabUrl),
    normalized_url: normalizeUrl(tabUrl),
    normalized_host: normalizeHostname(tabUrl),
    tabId: tabId,
    pageUrl: tabUrl,
    timestamp: Date.now()
  };

  chrome.storage.local.set({
    latestPrediction: enriched
  });

  chrome.tabs.sendMessage(tabId, enriched, () => {
    if (chrome.runtime.lastError) {
      console.warn("No content script in this tab:", chrome.runtime.lastError.message);
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  if (isIgnoredUrl(tab.url)) return;

  chrome.storage.local.get(["safeUrls", "dangerUrls"], (res) => {
    const safeUrls = res.safeUrls || [];
    const dangerUrls = res.dangerUrls || [];

    console.log("Checking URL:", tab.url);
    console.log("Normalized URL:", normalizeUrl(tab.url));
    console.log("Hostname:", normalizeHostname(tab.url));
    console.log("Safe rules:", safeUrls);
    console.log("Danger rules:", dangerUrls);

    if (matchRule(tab.url, safeUrls)) {
      const trustedData = {
        label: "SAFE",
        prob_legit: 1.0,
        risk_level: "safe",
        explanations: ["This URL/domain is manually marked safe by the user."],
        trusted_by_user: true,
        manual_override: "safe"
      };

      sendPredictionToTab(tabId, tab.url, trustedData);
      console.log("Safe override matched. Skipping backend prediction.");
      return;
    }

    if (matchRule(tab.url, dangerUrls)) {
      const blockedData = {
        label: "PHISHING",
        prob_legit: 0.0,
        risk_level: "danger",
        explanations: ["This URL/domain is manually marked dangerous by the user."],
        trusted_by_user: false,
        manual_override: "danger"
      };

      sendPredictionToTab(tabId, tab.url, blockedData);
      console.log("Danger override matched. Skipping backend prediction.");
      return;
    }

    fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: tab.url })
    })
      .then((res) => res.json())
      .then((data) => {
        sendPredictionToTab(tabId, tab.url, data);
      })
      .catch((err) => {
        console.error("Predict error:", err);
      });
  });
});