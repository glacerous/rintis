from supabase import create_client, Client
from app.config import settings

supabase_client: Client = None

if settings.supabase_url and settings.supabase_service_role_key:
    supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
else:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Supabase calls will fail.")
