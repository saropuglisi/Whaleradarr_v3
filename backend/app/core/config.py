from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "WhaleRadarr"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = "user"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "whaleradarr"
    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: str = "5433"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True
        # env_file = ".env"  # Disabled due to macOS permission issues

settings = Settings()
