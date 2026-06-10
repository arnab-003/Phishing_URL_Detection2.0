import os
import json
import pickle
from tensorflow import keras
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import tokenizer_from_json

MODEL_PATH = "model.h5"
MAX_LEN = 200

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
        reason = "URL pattern appears legitimate."
    elif prob_legit >= 0.3:
        label = "suspicious"
        reason = "URL contains unusual patterns."
    else:
        label = "phishing"
        reason = "URL matches phishing-like patterns."

    return {
        "url": url,
        "label": label,
        "prob_legit": round(prob_legit, 4),
        "reason": reason
    }