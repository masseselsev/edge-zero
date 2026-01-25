from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Overwatch"
    DATABASE_URL: str = "postgresql+asyncpg://overwatch:overwatch_password@overwatch-db:5432/overwatch"

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
