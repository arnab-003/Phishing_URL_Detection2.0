import os
import json
import pickle
import re
from urllib.parse import urlparse

from tensorflow import keras
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import tokenizer_from_json


MODEL_PATH = "model.h5"
MAX_LEN = 200

SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "rb.gy", "cutt.ly", "rebrand.ly", "shorturl.at"
}

SUSPICIOUS_KEYWORDS = {
    "login", "verify", "update", "secure", "account", "bank",
    "signin", "confirm", "password", "wallet", "payment",
    "otp", "gift", "bonus", "free", "reward", "invoice"
}


model = keras.models.load_model(MODEL_PATH)

tokenizer = None

if os.path.exists("tokenizer.pkl"):
    with open("tokenizer.pkl", "rb") as f:
        tokenizer = pickle.load(f)
elif os.path.exists("tokenizer.json"):
    with open("tokenizer.json", "r", encoding="utf-8") as f:
        tokenizer_json = json.load(f)
    tokenizer = tokenizer_from_json(tokenizer_json)
else:
    raise FileNotFoundError(
        "Tokenizer file not found. Put either tokenizer.pkl or tokenizer.json in phishing-backend."
    )

if not hasattr(tokenizer, "texts_to_sequences"):
    raise TypeError(
        f"Loaded tokenizer is invalid: {type(tokenizer)}. "
        "Use a real Keras tokenizer saved as tokenizer.pkl or tokenizer.json."
    )


def is_ip_address(hostname: str) -> bool:
    return bool(re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", hostname or ""))


def count_subdomains(hostname: str) -> int:
    parts = [p for p in (hostname or "").split(".") if p]
    return max(0, len(parts) - 2)


def extract_url_signals(url: str):
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""
    query = parsed.query or ""
    full = url.lower()

    signals = {
        "hostname": hostname,
        "path": path,
        "query": query,
        "url_length": len(url),
        "hostname_length": len(hostname),
        "subdomain_count": count_subdomains(hostname),
        "has_ip": is_ip_address(hostname),
        "has_at_symbol": "@" in url,
        "has_hyphen_in_host": "-" in hostname,
        "has_double_slash_in_path": "//" in path,
        "has_https_token_in_host": "https" in hostname or "http" in hostname,
        "dot_count": hostname.count("."),
        "digit_count": sum(ch.isdigit() for ch in url),
        "special_char_count": sum(ch in "@?=&_%.-" for ch in url),
        "uses_shortener": hostname in SHORTENER_DOMAINS,
        "matched_keywords": [kw for kw in SUSPICIOUS_KEYWORDS if kw in full],
        "has_long_query": len(query) > 30,
        "path_depth": len([p for p in path.split("/") if p]),
    }
    return signals


def build_explanations(url: str, label: str, prob_legit: float):
    s = extract_url_signals(url)
    explanations = []

    if label == "phishing":
        if s["has_ip"]:
            explanations.append("The URL uses an IP address instead of a normal domain name, which is a strong phishing indicator.")
        if s["uses_shortener"]:
            explanations.append("The URL uses a shortening service, which can hide the real destination.")
        if s["has_at_symbol"]:
            explanations.append("The URL contains '@', which can be used to mislead users about the real destination.")
        if s["subdomain_count"] >= 2:
            explanations.append(f"The domain has {s['subdomain_count']} subdomain levels, which can be used to imitate trusted brands.")
        if s["url_length"] > 75:
            explanations.append(f"The URL is unusually long ({s['url_length']} characters), which is common in phishing links.")
        if s["has_hyphen_in_host"]:
            explanations.append("The domain contains hyphens, which are often used in lookalike phishing domains.")
        if s["has_https_token_in_host"]:
            explanations.append("The domain name itself contains 'http' or 'https', which is a common deception trick.")
        if s["has_double_slash_in_path"]:
            explanations.append("The URL path contains a double slash, which can be used for misleading redirection patterns.")
        if s["matched_keywords"]:
            explanations.append(
                "The URL contains suspicious keywords often used in phishing pages: "
                + ", ".join(s["matched_keywords"][:5]) + "."
            )
        if s["has_long_query"]:
            explanations.append("The URL has a long query string, which may be used to hide tracking or deceptive parameters.")

        if not explanations:
            explanations.append("The model detected phishing-like URL patterns even though no single strong rule dominated the decision.")

    elif label == "suspicious":
        if s["url_length"] > 60:
            explanations.append(f"The URL is moderately long ({s['url_length']} characters), which increases suspicion.")
        if s["subdomain_count"] >= 1:
            explanations.append(f"The domain uses {s['subdomain_count']} subdomain level(s), which should be checked carefully.")
        if s["matched_keywords"]:
            explanations.append(
                "The URL contains attention-grabbing or account-related keywords: "
                + ", ".join(s["matched_keywords"][:5]) + "."
            )
        if s["has_hyphen_in_host"]:
            explanations.append("The domain contains hyphens, which can appear in impersonation-style domains.")
        if s["digit_count"] >= 6:
            explanations.append("The URL contains many digits, which can indicate autogenerated or suspicious link patterns.")
        if s["has_long_query"]:
            explanations.append("The URL contains a long query string with extra parameters, which may need caution.")

        if not explanations:
            explanations.append("The URL has some unusual patterns, so the model could not classify it as clearly safe.")

    else:  # safe
        if not s["has_ip"]:
            explanations.append("The URL uses a normal domain name instead of an IP address.")
        if s["subdomain_count"] == 0:
            explanations.append("The domain structure is simple and does not use excessive subdomains.")
        if s["url_length"] <= 60:
            explanations.append(f"The URL length is normal ({s['url_length']} characters), which is typical of legitimate pages.")
        if not s["has_at_symbol"] and not s["has_https_token_in_host"]:
            explanations.append("The URL does not contain obvious deceptive patterns such as '@' or fake 'http/https' text inside the domain.")
        if not s["matched_keywords"]:
            explanations.append("The URL does not contain common phishing lure keywords.")
        if not explanations:
            explanations.append("The URL structure appears normal and the model found no strong phishing indicators.")

    confidence_note = f"Model legitimacy confidence: {round(prob_legit * 100, 2)}%."
    explanations.append(confidence_note)

    return explanations[:5]


def predict_url(url: str):
    url = str(url).strip()

    sequence = tokenizer.texts_to_sequences([url])
    padded = pad_sequences(
        sequence,
        maxlen=MAX_LEN,
        padding="post",
        truncating="post"
    )

    prediction = model.predict(padded, verbose=0)
    prob_legit = float(prediction[0][0])

    if prob_legit > 0.7:
        label = "safe"
        risk_level = "safe"
    elif prob_legit >= 0.3:
        label = "suspicious"
        risk_level = "suspicious"
    else:
        label = "phishing"
        risk_level = "danger"

    explanations = build_explanations(url, label, prob_legit)

    if label == "safe":
        reason = "URL pattern appears legitimate."
    elif label == "suspicious":
        reason = "URL contains unusual patterns."
    else:
        reason = "URL matches phishing-like patterns."

    return {
        "url": url,
        "label": label,
        "prob_legit": round(prob_legit, 4),
        "risk_level": risk_level,
        "reason": reason,
        "explanations": explanations
    }