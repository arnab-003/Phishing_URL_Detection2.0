chrome.storage.local.get(["latestPrediction"], (res) => {
  const data = res.latestPrediction;
  const summary = document.getElementById("summary");
  const explanations = document.getElementById("explanations");

  if (!data) {
    summary.innerHTML = "<p>No prediction data found.</p>";
    explanations.innerHTML = "<p>No explanation available.</p>";
    return;
  }

  const probLegit = Number(data.prob_legit ?? 0);
  const probPhish = Math.max(0, 1 - probLegit);

  summary.innerHTML = `
    <p><strong>URL:</strong> ${data.url || data.pageUrl || "N/A"}</p>
    <p><strong>Normalized URL:</strong> ${data.normalized_url || "N/A"}</p>
    <p><strong>Label:</strong> ${data.label || "N/A"}</p>
    <p><strong>Risk Level:</strong> ${data.risk_level || "N/A"}</p>
    <p><strong>Legitimacy Score:</strong> ${(probLegit * 100).toFixed(2)}%</p>
    <p><strong>Phishing Score:</strong> ${(probPhish * 100).toFixed(2)}%</p>
  `;

  const listItems = (data.explanations || [])
    .map((item) => `<li>${item}</li>`)
    .join("");

  explanations.innerHTML = `
    <ul>
      ${listItems || "<li>No explanation provided.</li>"}
    </ul>
  `;

  new Chart(document.getElementById("confidenceChart"), {
    type: "doughnut",
    data: {
      labels: ["Legit", "Phishing"],
      datasets: [{
        data: [probLegit * 100, probPhish * 100],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });

  new Chart(document.getElementById("riskChart"), {
    type: "bar",
    data: {
      labels: ["Legit", "Phishing"],
      datasets: [{
        label: "Score (%)",
        data: [probLegit * 100, probPhish * 100],
        backgroundColor: ["#3b82f6", "#f59e0b"]
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
});