"""
Configuration — reads from .env via Pydantic BaseSettings.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MODEL_NAME: str = "all-MiniLM-L6-v2"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    DEBUG: bool = True
    BACKEND_URL: str = "http://localhost:5000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
