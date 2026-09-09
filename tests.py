"""
Automated Integration Tests for Resource & Timesheet Hub v1.1.0.
Tests Employee ID portal, Gantt timeline, database operations, API routes, and workflows.
"""

import unittest
from fastapi.testclient import TestClient
from app import app
from database import init_db, seed_database

class TestResourceTimesheetHub(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database()
        cls.client = TestClient(app)

    def test_01_get_auth_users(self):
        response = self.client.get("/api/auth/users")
        self.assertEqual(response.status_code, 200)
        users = response.json()
        self.assertGreater(len(users), 0)
        self.assertIn("employee_code", users[0])
        print(f"[PASS] Auth users loaded: {len(users)} users found with employee codes.")

    def test_02_employee_id_lookup(self):
        # 1. Lookup by Employee Code 'EMP-104' (Elena Rostova)
        response = self.client.get("/api/auth/employee/EMP-104")
        self.assertEqual(response.status_code, 200)
        emp = response.json()
        self.assertEqual(emp["name"], "Elena Rostova")
        self.assertEqual(emp["employee_code"], "EMP-104")
        self.assertIn("allocations", emp)
        self.assertIn("timesheets", emp)
        self.assertIn("hourly_rate", emp)
        print(f"[PASS] Employee ID lookup by EMP-104: {emp['name']}, {len(emp['allocations'])} allocations, ${emp['hourly_rate']}/hr.")

        # 2. Lookup by numeric ID
        res_num = self.client.get("/api/auth/employee/4")
        self.assertEqual(res_num.status_code, 200)
        self.assertEqual(res_num.json()["name"], "Elena Rostova")
        print(f"[PASS] Employee lookup by numeric ID: Success.")

    def test_03_gantt_and_milestones(self):
        # 1. Get Gantt Timeline
        response = self.client.get("/api/gantt")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("projects", data)
        self.assertGreater(len(data["projects"]), 0)
        first_proj = data["projects"][0]
        self.assertIn("milestones", first_proj)
        self.assertIn("team", first_proj)
        print(f"[PASS] Gantt timeline loaded with {len(data['projects'])} projects and milestones.")

        # 2. Create a Milestone
        m_payload = {
            "project_id": 1,
            "title": "Security & Penetration Audit",
            "description": "SOC2 and banking encryption compliance audit",
            "start_date": "2026-09-01",
            "due_date": "2026-09-30",
            "status": "planned",
            "progress": 0
        }
        res_create = self.client.post("/api/projects/1/milestones", json=m_payload)
        self.assertEqual(res_create.status_code, 200)
        m_id = res_create.json()["id"]
        print(f"[PASS] Milestone created with ID: {m_id}.")

        # 3. Update Milestone
        res_upd = self.client.put(f"/api/milestones/{m_id}", json={"status": "in_progress", "progress": 50})
        self.assertEqual(res_upd.status_code, 200)
        print(f"[PASS] Milestone updated.")

    def test_04_dashboard_stats(self):
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_resources", data)
        self.assertIn("active_projects", data)
        print(f"[PASS] Dashboard stats verified.")

    def test_05_timesheet_workflow(self):
        week_start = "2026-09-14"
        save_payload = {
            "user_id": 4,
            "week_start_date": week_start,
            "entries": [
                {
                    "project_id": 1,
                    "task_id": 2,
                    "entry_date": week_start,
                    "hours": 8.0,
                    "description": "Full day feature implementation & unit testing",
                    "is_billable": 1
                }
            ]
        }
        save_res = self.client.post("/api/timesheets/save", json=save_payload)
        self.assertEqual(save_res.status_code, 200)
        ts_id = save_res.json()["timesheet_id"]
        
        submit_res = self.client.post("/api/timesheets/submit", json={"user_id": 4, "week_start_date": week_start})
        self.assertEqual(submit_res.status_code, 200)
        
        approve_res = self.client.post(f"/api/approvals/{ts_id}/approve", json={"reviewer_id": 2})
        self.assertEqual(approve_res.status_code, 200)
        print(f"[PASS] Timesheet full save, submit, and approval cycle tested.")

    def test_06_reports_and_csv(self):
        res_util = self.client.get("/api/reports/utilization")
        self.assertEqual(res_util.status_code, 200)

        res_csv = self.client.get("/api/reports/export-csv")
        self.assertEqual(res_csv.status_code, 200)
        self.assertIn("text/csv", res_csv.headers["content-type"])
        print(f"[PASS] Reports and CSV export verified.")

if __name__ == "__main__":
    unittest.main()
