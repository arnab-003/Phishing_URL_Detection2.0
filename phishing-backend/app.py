from fastapi import FastAPI
from pydantic import BaseModel
from inference_core import predict_url

app = FastAPI()

class URLRequest(BaseModel):
    url: str

@app.post("/predict")
def predict_endpoint(req: URLRequest):
    result = predict_url(req.url)

    # result has: original_url, normalized_url, label, prob_legit, risk_level, explanations
    label = result["label"]
    risk_level = result["risk_level"]
    prob_legit = result["prob_legit"]
    explanations = result["explanations"]

    if risk_level == "safe":
        message = "This site is safe."
    elif risk_level == "warning":
        message = "This site looks suspicious. Be careful."
    else:  # danger
        message = "This site looks like a phishing website."

    return {
        "url": result["original_url"],
        "normalized_url": result["normalized_url"],
        "label": label,
        "prob_legit": prob_legit,
        "risk_level": risk_level,
        "message": message,
        "explanations": explanations,
    }
