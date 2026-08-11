import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

with patch.dict('os.environ', {
    'SUPABASE_URL': 'https://mock.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY': 'mock_key',
    'FIRECRAWL_API_KEY': 'mock_firecrawl',
    'GROQ_API_KEY': 'mock_groq',
    'TINYFISH_API_KEY': 'mock_tinyfish',
}):
    from app.main import app

class TestHikeSessions(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch('app.routers.sessions.supabase_client')
    def test_start_session(self, mock_supabase):
        # Mock trail lookup
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{"id": "mock-trail-uuid"}])
        # Mock update active sessions
        mock_supabase.table().update().eq().eq().execute.return_value = MagicMock(data=[])
        # Mock insert active session
        mock_supabase.table().insert().execute.return_value = MagicMock(data=[{"id": "mock-session-uuid", "device_id": "test-device-id"}])

        response = self.client.post("/api/trails/gunung-merbabu/sessions", json={
            "device_id": "test-device-id",
            "hiker_name": "Test Hiker",
            "emergency_contact_email": "basecamp@merbabu.id",
            "estimated_return_at": "2026-08-11T20:00:00.000Z",
            "buffer_minutes": 60
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertEqual(response.json()["session"]["id"], "mock-session-uuid")

    @patch('app.routers.sessions.supabase_client')
    def test_register_checkin(self, mock_supabase):
        # Mock trail lookup
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{"id": "mock-trail-uuid"}])
        # Mock active session lookup
        mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[{"id": "mock-session-uuid"}])
        # Mock insert checkin
        mock_supabase.table().insert().execute.return_value = MagicMock(data=[{"id": "mock-checkin-uuid"}])

        response = self.client.post("/api/trails/gunung-merbabu/checkin", json={
            "device_id": "test-device-id",
            "waypoint_id": "mock-waypoint-uuid",
            "timestamp": "2026-08-11T16:00:00.000Z",
            "lat": -7.44,
            "lng": 110.44
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    @patch('app.routers.sessions.supabase_client')
    def test_trigger_sos(self, mock_supabase):
        # Mock insert alert
        mock_supabase.table().insert().execute.return_value = MagicMock(data=[{"id": "mock-alert-uuid"}])

        response = self.client.post("/api/trails/gunung-merbabu/sos", json={
            "device_id": "test-device-id",
            "lat": -7.44,
            "lng": 110.44
        })
        print("RESPONSE CONTENT:", response.text)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

if __name__ == "__main__":
    unittest.main()
