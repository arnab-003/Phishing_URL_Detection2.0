console.log("content_script loaded on", window.location.href);

chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
  if (!data || !data.label || !data.risk_level) return;

  // Do nothing for safe / legitimate sites
  if (data.risk_level === "safe") {
    console.log("Safe site:", data.url);
    return;
  }

  // Remove any existing popup first (avoid duplicates)
  const existing = document.getElementById("phish-guard-popup");
  if (existing) existing.remove();

  // Choose colors based on risk level
  const isDanger = data.risk_level === "danger";
  const bgColor = isDanger ? "#b00020" : "#ff9800"; // red / orange
  const titleText = isDanger
    ? "Warning: This site looks like a phishing website"
    : "Caution: This site looks suspicious";
  const borderColor = isDanger ? "#ffcccc" : "#fff3cd";

  // Build explanation list (HTML)
  const explanationItems = (data.explanations || [])
    .map((e) => `<li style="margin-bottom:4px;">${e}</li>`)
    .join("");

  // Create popup container
  const wrapper = document.createElement("div");
  wrapper.id = "phish-guard-popup";
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.right = "0";
  wrapper.style.zIndex = "999999";
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "center";
  wrapper.style.pointerEvents = "none"; // let inner box handle events

  const box = document.createElement("div");
  box.style.maxWidth = "600px";
  box.style.margin = "16px";
  box.style.padding = "16px";
  box.style.borderRadius = "8px";
  box.style.background = bgColor;
  box.style.color = "#ffffff";
  box.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
  box.style.border = "2px solid " + borderColor;
  box.style.pointerEvents = "auto";

  box.innerHTML = `
    <div style="font-size:16px; font-weight:600; margin-bottom:8px;">
      ${titleText}
    </div>
    <div style="font-size:12px; opacity:0.9; margin-bottom:8px;">
      URL: <span style="word-break:break-all;">${data.url}</span>
    </div>
    ${
      explanationItems
        ? `<ul style="font-size:13px; margin:0 0 12px 18px; padding:0;">
             ${explanationItems}
           </ul>`
        : ""
    }
    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
      <button id="phish-guard-stay"
              style="padding:6px 12px; border-radius:4px; border:none;
                     background:#ffffff; color:${bgColor}; font-weight:500; cursor:pointer;">
        Stay here
      </button>
      <button id="phish-guard-back"
              style="padding:6px 12px; border-radius:4px; border:none;
                     background:#000000; color:#ffffff; font-weight:500; cursor:pointer;">
        Go back
      </button>
    </div>
  `;

  wrapper.appendChild(box);
  document.body.appendChild(wrapper);

  // Button handlers
  const stayBtn = document.getElementById("phish-guard-stay");
  const backBtn = document.getElementById("phish-guard-back");

  if (stayBtn) {
    stayBtn.onclick = () => {
      wrapper.remove(); // just close popup, stay on page
    };
  }

  if (backBtn) {
    backBtn.onclick = () => {
      // Try browser back; if no history, close tab
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    };
  }
});
