# Campus Guardian 360 - AI Service placeholder
from fastapi import FastAPI

app = FastAPI(
    title="Campus Guardian 360 AI Service",
    description="Multi-agent AI pipeline for campus feedback intelligence",
    version="1.0.0"
)

@app.get("/")
def root():
    return {"status": "Campus Guardian 360 AI Service running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
