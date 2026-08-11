import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta

# Mock environment variables so settings doesn't fail
with patch.dict('os.environ', {
    'SUPABASE_URL': 'https://mock.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY': 'mock_key',
    'FIRECRAWL_API_KEY': 'mock_firecrawl',
    'GROQ_API_KEY': 'mock_groq',
    'TINYFISH_API_KEY': 'mock_tinyfish',
}):
    from app.services.confidence import compute_confidence

class TestConfidenceAndVerdict(unittest.TestCase):
    @patch('app.services.confidence.supabase_client')
    def test_compute_confidence_no_votes(self, mock_supabase):
        # Base confidence calculation should not change when no votes exist
        # W1*s1 + W2*s2 + W3*s3 + W4*s4
        # W1 = 0.5, W2 = 0.2, W3 = 0.2, W4 = 0.1
        # Let's say s1 (source_type = 'official_govt') = 1.0
        # s2 (recency = now) = 1.0
        # s3 (corroboration = empty) = 0.0
        # s4 (track_record) = 0.5
        # Expected: 0.5 * 1.0 + 0.2 * 1.0 + 0.2 * 0.0 + 0.1 * 0.5 = 0.5 + 0.2 + 0.05 = 0.75
        
        # Mock corroboration query to return empty data
        mock_supabase.table().select().eq().eq().neq().gte().is_().execute.return_value = MagicMock(data=[])
        
        score = compute_confidence(
            source_type="official_govt",
            published_or_scraped_at=datetime.now(timezone.utc),
            claim_type="hazard",
            waypoint_id=None,
            trail_id="mock-trail-id",
            current_source_url="https://mockurl.com"
        )
        self.assertEqual(score, 0.75)

    @patch('app.services.confidence.supabase_client')
    def test_compute_confidence_with_votes(self, mock_supabase):
        # Mock corroboration query
        mock_supabase.table().select().eq().eq().neq().gte().is_().execute.return_value = MagicMock(data=[])
        
        # Mock report verifications query
        # 1. 2 'still_accurate', 0 'outdated'
        # Modifier = (2.0 * (2 + 1)) / (2 + 0 + 2) = 6.0 / 4.0 = 1.5
        # Base score = 0.75. Capped expected: 1.0
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[
            {"vote": "still_accurate"},
            {"vote": "still_accurate"}
        ])
        score = compute_confidence(
            source_type="official_govt",
            published_or_scraped_at=datetime.now(timezone.utc),
            claim_type="hazard",
            waypoint_id=None,
            trail_id="mock-trail-id",
            current_source_url="https://mockurl.com",
            condition_report_id="mock-report-id"
        )
        self.assertEqual(score, 1.0)

        # 2. 0 'still_accurate', 2 'outdated'
        # Modifier = (2.0 * (0 + 1)) / (0 + 2 + 2) = 2.0 / 4.0 = 0.5
        # Base score = 0.75. Expected: 0.75 * 0.5 = 0.375
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[
            {"vote": "outdated"},
            {"vote": "outdated"}
        ])
        score = compute_confidence(
            source_type="official_govt",
            published_or_scraped_at=datetime.now(timezone.utc),
            claim_type="hazard",
            waypoint_id=None,
            trail_id="mock-trail-id",
            current_source_url="https://mockurl.com",
            condition_report_id="mock-report-id"
        )
        self.assertEqual(score, 0.375)

if __name__ == "__main__":
    unittest.main()
