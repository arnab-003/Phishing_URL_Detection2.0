function normalizeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
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
  } catch {
    return "";
  }
}

function getShortDisplayUrl(url, maxLength = 45) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const shortBase = `${host}${path}`;
    return shortBase.length <= maxLength
      ? shortBase
      : `${shortBase.slice(0, maxLength - 3)}...`;
  } catch {
    return url || "";
  }
}

function matchRule(url, rules = []) {
  const hostname = normalizeHostname(url);
  const fullUrl = normalizeUrl(url);

  return rules.some((entry) => {
    const cleanEntry = String(entry || "").trim().toLowerCase();
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

function buildPrediction(tabId, tabUrl, data = {}) {
  const rawLabel = String(data.label || "").trim().toLowerCase();
  let riskLevel = String(data.risk_level || "").trim().toLowerCase();

  if (!riskLevel) {
    if (rawLabel === "safe") riskLevel = "safe";
    else if (rawLabel === "phishing") riskLevel = "danger";
    else if (rawLabel === "suspicious") riskLevel = "suspicious";
    else riskLevel = "unknown";
  }

  const explanations = Array.isArray(data.explanations)
    ? data.explanations
    : data.reason
      ? [data.reason]
      : [];

  return {
    url: tabUrl,
    pageUrl: tabUrl,
    tabId,
    timestamp: Date.now(),
    short_url: getShortDisplayUrl(tabUrl),
    normalized_url: normalizeUrl(tabUrl),
    normalized_host: normalizeHostname(tabUrl),
    label: String(data.label || "UNKNOWN").toUpperCase(),
    prob_legit: Number(data.prob_legit ?? 0),
    risk_level: riskLevel,
    explanations,
    trusted_by_user: Boolean(data.trusted_by_user),
    manual_override: data.manual_override || null
  };
}

function storeAndNotify(tabId, tabUrl, data) {
  const payload = buildPrediction(tabId, tabUrl, data);

  chrome.storage.local.set({ latestPrediction: payload }, () => {
    chrome.tabs.sendMessage(tabId, payload, () => {
      if (chrome.runtime.lastError) {
        console.warn("Content script message skipped:", chrome.runtime.lastError.message);
      }
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  if (isIgnoredUrl(tab.url)) return;

  chrome.storage.local.get(["safeUrls", "dangerUrls"], (res) => {
    const safeUrls = res.safeUrls || [];
    const dangerUrls = res.dangerUrls || [];

    if (matchRule(tab.url, safeUrls)) {
      storeAndNotify(tabId, tab.url, {
        label: "SAFE",
        prob_legit: 1,
        risk_level: "safe",
        explanations: ["This URL or domain is manually marked safe by the user."],
        trusted_by_user: true,
        manual_override: "safe"
      });
      return;
    }

    if (matchRule(tab.url, dangerUrls)) {
      storeAndNotify(tabId, tab.url, {
        label: "PHISHING",
        prob_legit: 0,
        risk_level: "danger",
        explanations: ["This URL or domain is manually marked dangerous by the user."],
        trusted_by_user: false,
        manual_override: "danger"
      });
      return;
    }

    fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: tab.url })
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        storeAndNotify(tabId, tab.url, data);
      })
      .catch((err) => {
        console.error("Prediction request failed:", err);
        storeAndNotify(tabId, tab.url, {
          label: "SUSPICIOUS",
          prob_legit: 0.5,
          risk_level: "suspicious",
          explanations: ["Could not contact the local prediction server."]
        });
      });
  });
});