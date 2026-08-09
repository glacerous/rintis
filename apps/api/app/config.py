from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    firecrawl_api_key: str = ""
    groq_api_key: str = ""
    tinyfish_api_key: str = ""
    assemblyai_api_key: str = ""
    port: int = 8080
    env: str = "development"

    # Pydantic Settings configuration:
    # It will search for uppercase versions (SUPABASE_URL, etc.) in system env or .env file.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

try:
    settings = Settings()
except Exception as e:
    # If environment variables are missing (e.g. during initial setup/build),
    # print a warning but don't crash immediately so utility scripts/lints can run.
    print(f"Warning: Configuration initialization failed. Error: {e}")
    # Fallback with dummy values for build phase safety
    class DummySettings:
        supabase_url = ""
        supabase_service_role_key = ""
        port = 8080
        env = "development"
    settings = DummySettings()
