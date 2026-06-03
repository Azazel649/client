import unittest
from datetime import datetime

from fastapi.testclient import TestClient

from backend.app.algorithms.transfer.anomaly_detector import AnomalyDetector, HIReading
from backend.app.main import app


class Step9BackendSmokeTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        login = self.client.post("/auth/login", json={"username": "admin", "password": "123456"})
        if login.status_code != 200:
            raise unittest.SkipTest("admin/123456 login is not available in this database")
        self.headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def test_anomaly_detector_threshold(self):
        event = AnomalyDetector().detect(
            [
                HIReading(
                    device_id="CNC-01",
                    current_hi=22,
                    last_hi=68,
                    status="running",
                    read_time=datetime.now(),
                )
            ]
        )
        self.assertEqual(len(event), 1)
        self.assertEqual(event[0].device_id, "CNC-01")

    def test_alert_and_model_management_endpoints(self):
        defaults = self.client.post("/models/register-defaults", headers=self.headers)
        self.assertEqual(defaults.status_code, 200, defaults.text)
        self.assertGreaterEqual(len(defaults.json()), 2)

        amd_status = self.client.get("/models/status/amd", headers=self.headers)
        self.assertEqual(amd_status.status_code, 200, amd_status.text)
        self.assertTrue(amd_status.json()["file_exists"])

        classifier_status = self.client.get("/models/status/failure_classifier", headers=self.headers)
        self.assertEqual(classifier_status.status_code, 200, classifier_status.text)
        self.assertTrue(classifier_status.json()["file_exists"])

        alerts = self.client.get("/alerts/unhandled", headers=self.headers)
        self.assertEqual(alerts.status_code, 200, alerts.text)

        logs = self.client.get("/alerts/schedule-logs?limit=5", headers=self.headers)
        self.assertEqual(logs.status_code, 200, logs.text)

    def test_dispatch_and_transfer_routes_are_available(self):
        dispatch = self.client.get("/dispatch/devices", headers=self.headers)
        self.assertEqual(dispatch.status_code, 200, dispatch.text)

        check = self.client.post("/transfers/monitor/check", headers=self.headers)
        self.assertEqual(check.status_code, 200, check.text)
        self.assertIn("anomalies", check.json())


if __name__ == "__main__":
    unittest.main()
