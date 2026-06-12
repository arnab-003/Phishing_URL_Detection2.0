from fastapi import FastAPI
from pydantic import BaseModel
from inference_core import predict_url

app = FastAPI(title="Phishing URL Detector API")   ##connect the backend with FastAPI

class URLRequest(BaseModel):
    url: str

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.post("/predict")
def predict(data: URLRequest):
    return predict_url(data.url)