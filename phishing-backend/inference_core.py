import pickle
import numpy as np
from tensorflow import keras
from keras.preprocessing.sequence import pad_sequences
from urllib.parse import urlparse, urlunparse
import re, zlib
from math import log2

MAX_URL_LENGTH = 200
FEATURE_COLS = [
    "LengthOfURL", "DomainLengthOfURL", "IsDomainIP",
    "LetterCntInURL", "URLLetterRatio", "DigitCntInURL",
    "ShannonEntropy", "KolmogorovComplexity", "HexPatternCnt",
    "Base64PatternCnt",
]

# Thresholds for gray zone
UPPER = 0.7   # >= UPPER => clearly LEGITIMATE
LOWER = 0.3   # <= LOWER => clearly PHISHING

# Suspicious TLDs for rule layer
SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq"}

# Load model + tokenizer + scaler
model = keras.models.load_model("phishing_cnn_bigru_model.h5")
with open("tokenizer (1).pkl", "rb") as f:
    tokenizer = pickle.load(f)
with open("scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

def domain_of(url: str) -> str:
    return urlparse(url).netloc.lower()

def has_bad_tld(url: str) -> bool:
    host = domain_of(url)
    return any(host.endswith(tld) for tld in SUSPICIOUS_TLDS)

def has_at_symbol(url: str) -> bool:
    parsed = urlparse(url)
    return "@" in parsed.netloc or "@" in parsed.path

def normalize_url_for_model(raw_url: str) -> str:
    """
    Keep only scheme + domain, drop path/query/fragment.
    Example:
      https://www.perplexity.ai/search/abc -> https://www.perplexity.ai
    """
    parsed = urlparse(raw_url)
    cleaned = parsed._replace(path="", params="", query="", fragment="")
    return urlunparse(cleaned)

def extract_url_features(url: str):
    parsed = urlparse(url)
    domain = parsed.netloc if parsed.netloc else parsed.path
    feats = {}
    feats["LengthOfURL"] = len(url)
    feats["DomainLengthOfURL"] = len(domain)
    ip_pattern = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")
    feats["IsDomainIP"] = 1 if ip_pattern.match(domain.split(":")[0]) else 0
    feats["LetterCntInURL"] = sum(c.isalpha() for c in url)
    feats["URLLetterRatio"] = (
        feats["LetterCntInURL"] / len(url) if len(url) > 0 else 0
    )
    feats["DigitCntInURL"] = sum(c.isdigit() for c in url)

    def entropy(text):
        if not text:
            return 0
        p = [text.count(c) / len(text) for c in set(text)]
        return -sum(pi * log2(pi) for pi in p if pi > 0)

    feats["ShannonEntropy"] = entropy(url)
    compressed = zlib.compress(url.encode())
    feats["KolmogorovComplexity"] = (
        len(compressed) / len(url) if len(url) > 0 else 0
    )
    hex_pattern = re.compile(r"[0-9a-fA-F]{4,}")
    feats["HexPatternCnt"] = len(hex_pattern.findall(url))
    b64_pattern = re.compile(r"[A-Za-z0-9+/]{20,}={0,2}")
    feats["Base64PatternCnt"] = len(b64_pattern.findall(url))
    return feats

def explain_url(url, feats, prob_legit):
    reasons = []

    # 1) IP address as domain
    if feats["IsDomainIP"] == 1:
        reasons.append(
            "This link uses a number-only address instead of a normal website name. "
            "Attackers often use this trick to hide the real site."
        )

    # 2) Very long / random URL
    if feats["LengthOfURL"] > 100 or feats["ShannonEntropy"] > 4.0:
        reasons.append(
            "This link is unusually long and looks random. "
            "Real websites rarely use such confusing links."
        )

    # 3) Suspicious encoded / hex patterns
    if feats["HexPatternCnt"] > 0 or feats["Base64PatternCnt"] > 0:
        reasons.append(
            "The link contains hidden or encoded text. "
            "This is often used to hide dangerous actions."
        )

    # 4) Many digits in URL
    if feats["DigitCntInURL"] > 10:
        reasons.append(
            "The link has a lot of numbers in it. "
            "Phishing links often add many numbers to look unique."
        )

    # 5) Low letter ratio (many symbols)
    if feats["URLLetterRatio"] < 0.4:
        reasons.append(
            "The link has many symbols and special characters. "
            "Safe websites usually have simpler, cleaner addresses."
        )

    if not reasons:
        reasons.append(
            "This link looks similar to many phishing links in the training data. "
            "It does not match the patterns of normal websites."
        )

    return reasons[:3]

def predict_url(raw_url: str):
    # 1. Normalize URL for the model
    url = normalize_url_for_model(raw_url)

    # 2. Model inputs
    seq = tokenizer.texts_to_sequences([url])
    pad = pad_sequences(
        seq, maxlen=MAX_URL_LENGTH, padding="post", truncating="post"
    )

    feats = extract_url_features(url)
    feat_arr = np.array([[feats[c] for c in FEATURE_COLS]], dtype=np.float32)
    feat_scaled = scaler.transform(feat_arr)

    # 3. Model prediction (probability of LEGITIMATE)
    prob_legit = float(model.predict([pad, feat_scaled], verbose=0)[0][0])

    # 4. Rule layer for very risky structure
    structurally_bad = (
        feats["IsDomainIP"] == 1 or has_bad_tld(raw_url) or has_at_symbol(raw_url)
    )

    # 5. Threshold + gray zone
    if structurally_bad and prob_legit < 0.8:
        label = "PHISHING"
        risk_level = "danger"
    else:
        if prob_legit >= UPPER:
            label = "LEGITIMATE"
            risk_level = "safe"
        elif prob_legit <= LOWER:
            label = "PHISHING"
            risk_level = "danger"
        else:
            label = "SUSPICIOUS"
            risk_level = "warning"

    # 6. Explanations only for warning / danger
    if label == "LEGITIMATE":
        explanations = []
    else:
        explanations = explain_url(url, feats, prob_legit)

    return {
        "original_url": raw_url,
        "normalized_url": url,
        "label": label,
        "prob_legit": prob_legit,
        "risk_level": risk_level,
        "explanations": explanations,
    }

if __name__ == "__main__":
    test = "https://www.perplexity.ai/search/i-am-currently-building-my-fin-tuoXjxbvQuS2Yvx1a2lWUA"
    result = predict_url(test)
    print("Original URL:", result["original_url"])
    print("Normalized URL:", result["normalized_url"])
    print("Label:", result["label"], "Prob_legit:", result["prob_legit"])
    print("Risk level:", result["risk_level"])
    print("Explanations:")
    for r in result["explanations"]:
        print(" -", r)
