"""
Database models and seed data generator for Resource Management & Timesheet Hub.
Uses SQLite with sqlite3 for zero-dependency, reliable and fast storage.
"""

import sqlite3
import os
from datetime import datetime, timedelta, date
import json

DB_FILE = os.path.join(os.path.dirname(__file__), "resource_hub.db")

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users / Resources Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'employee')),
        job_title TEXT NOT NULL,
        department TEXT NOT NULL,
        hourly_rate REAL NOT NULL DEFAULT 50.0,
        cost_rate REAL NOT NULL DEFAULT 35.0,
        weekly_capacity REAL NOT NULL DEFAULT 40.0,
        avatar_url TEXT,
        skills TEXT, -- JSON array of strings
        phone TEXT,
        location TEXT DEFAULT 'San Francisco, CA',
        hire_date DATE,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'on_leave')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Clients Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Projects Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('planning', 'active', 'on_hold', 'completed')),
        start_date DATE NOT NULL,
        end_date DATE,
        budget_hours REAL NOT NULL DEFAULT 0.0,
        budget_amount REAL NOT NULL DEFAULT 0.0,
        billing_type TEXT NOT NULL DEFAULT 'hourly' CHECK(billing_type IN ('hourly', 'fixed', 'non_billable')),
        hourly_rate REAL DEFAULT 0.0,
        color TEXT DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );
    """)

    # Project Tasks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        billable INTEGER NOT NULL DEFAULT 1,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Milestones & Deliverables Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'completed')),
        progress INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Resource Allocations Table (Weekly/Scheduled staffing)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        role TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        hours_per_week REAL NOT NULL DEFAULT 20.0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Timesheets (Weekly container)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timesheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        week_start_date DATE NOT NULL, -- Format: YYYY-MM-DD (Monday)
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected')),
        total_hours REAL NOT NULL DEFAULT 0.0,
        billable_hours REAL NOT NULL DEFAULT 0.0,
        submitted_at TIMESTAMP,
        approved_at TIMESTAMP,
        approved_by INTEGER,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, week_start_date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );
    """)

    # Timesheet Entries (Daily project/task rows)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timesheet_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timesheet_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        task_id INTEGER,
        entry_date DATE NOT NULL, -- YYYY-MM-DD
        hours REAL NOT NULL CHECK(hours >= 0 AND hours <= 24),
        description TEXT,
        is_billable INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );
    """)

    conn.commit()
    conn.close()

def seed_database(force_reseed=False):
    """Populates realistic initial data if the database is newly initialized or forced."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if not force_reseed:
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] > 0:
            # Check if employee_code is populated
            cursor.execute("SELECT employee_code FROM users WHERE employee_code IS NOT NULL LIMIT 1")
            if cursor.fetchone():
                conn.close()
                return

    print("Re-seeding Resource & Timesheet database with enhanced schema...")
    cursor.execute("DROP TABLE IF EXISTS timesheet_entries;")
    cursor.execute("DROP TABLE IF EXISTS timesheets;")
    cursor.execute("DROP TABLE IF EXISTS allocations;")
    cursor.execute("DROP TABLE IF EXISTS milestones;")
    cursor.execute("DROP TABLE IF EXISTS tasks;")
    cursor.execute("DROP TABLE IF EXISTS projects;")
    cursor.execute("DROP TABLE IF EXISTS clients;")
    cursor.execute("DROP TABLE IF EXISTS users;")
    conn.commit()
    conn.close()

    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Seed Users with Employee Codes
    users_data = [
        ("EMP-101", "Sarah Jenkins", "sarah.j@acme.corp", "admin", "VP of Operations", "Leadership", 120.0, 80.0, 40.0,
         "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", '["Operations", "Leadership", "Budgeting", "Scrum"]',
         "+1 (555) 234-5678", "San Francisco, HQ", "2023-01-15", "active"),
        
        ("EMP-102", "Alex Mercer", "alex.m@acme.corp", "manager", "Lead Project Manager", "Project Management", 95.0, 65.0, 40.0,
         "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", '["Agile", "Jira", "Risk Management", "Client Relations"]',
         "+1 (555) 345-6789", "New York, NY", "2023-06-01", "active"),
        
        ("EMP-103", "Marcus Vance", "marcus.v@acme.corp", "manager", "Engineering Manager", "Engineering", 110.0, 75.0, 40.0,
         "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", '["Python", "Cloud Architecture", "Team Lead", "DevOps"]',
         "+1 (555) 456-7890", "Austin, TX", "2023-03-10", "active"),
        
        ("EMP-104", "Elena Rostova", "elena.r@acme.corp", "employee", "Senior Full-Stack Engineer", "Engineering", 85.0, 55.0, 40.0,
         "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", '["React", "TypeScript", "Python", "FastAPI", "PostgreSQL"]',
         "+1 (555) 567-8901", "Seattle, WA", "2024-02-01", "active"),
        
        ("EMP-105", "David Kim", "david.k@acme.corp", "employee", "Frontend Developer", "Engineering", 70.0, 45.0, 40.0,
         "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150", '["Vue.js", "React", "Tailwind CSS", "JavaScript"]',
         "+1 (555) 678-9012", "San Francisco, CA", "2024-04-15", "active"),
        
        ("EMP-106", "Sophia Patel", "sophia.p@acme.corp", "employee", "Lead UI/UX Designer", "Design", 80.0, 50.0, 40.0,
         "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150", '["Figma", "Design Systems", "User Research", "Wireframing"]',
         "+1 (555) 789-0123", "London, Remote", "2023-09-01", "active"),
        
        ("EMP-107", "Liam O'Connor", "liam.o@acme.corp", "employee", "UI/UX & Brand Designer", "Design", 65.0, 40.0, 40.0,
         "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150", '["Figma", "Illustrator", "Prototyping", "Motion Design"]',
         "+1 (555) 890-1234", "Dublin, Remote", "2024-05-10", "active"),
        
        ("EMP-108", "Amina Diallo", "amina.d@acme.corp", "employee", "QA & Automation Specialist", "Quality Assurance", 65.0, 42.0, 40.0,
         "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150", '["Cypress", "Selenium", "API Testing", "CI/CD"]',
         "+1 (555) 901-2345", "Toronto, Remote", "2024-01-20", "active"),
        
        ("EMP-109", "Carlos Mendez", "carlos.m@acme.corp", "employee", "DevOps & Cloud Engineer", "Infrastructure", 90.0, 60.0, 40.0,
         "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", '["Docker", "Kubernetes", "AWS", "Terraform", "Monitoring"]',
         "+1 (555) 012-3456", "Denver, CO", "2023-11-01", "active"),
        
        ("EMP-110", "Rachel Green", "rachel.g@acme.corp", "employee", "Technical Writer & Product Specialist", "Product", 60.0, 38.0, 40.0,
         "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", '["Documentation", "API Specs", "Product Strategy", "Markdown"]',
         "+1 (555) 123-4567", "Boston, MA", "2024-03-01", "active")
    ]

    cursor.executemany("""
    INSERT INTO users (employee_code, name, email, role, job_title, department, hourly_rate, cost_rate, weekly_capacity, avatar_url, skills, phone, location, hire_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users_data)

    # 2. Seed Clients
    clients_data = [
        ("Apex Financial Services", "Apex Capital Corp", "billing@apexfinancial.com", "+1-555-0199"),
        ("BioNova Healthcare", "BioNova Systems Inc", "contact@bionovahealth.io", "+1-555-0244"),
        ("HyperScale Cloud Tech", "HyperScale Global LLC", "tech@hyperscale.net", "+1-555-0377"),
        ("EcoLogistics Freight", "EcoLogistics Freight Group", "partners@ecologistics.com", "+1-555-0488")
    ]
    cursor.executemany("""
    INSERT INTO clients (name, company, email, phone)
    VALUES (?, ?, ?, ?)
    """, clients_data)

    # 3. Seed Projects
    projects_data = [
        (1, "Apex Mobile Banking Redesign", "APEX-MB", "Complete overhaul of consumer iOS/Android banking mobile app with biometrics and instant transfers.", "active", "2026-06-01", "2026-11-30", 800.0, 75000.0, "hourly", 95.0, "#3B82F6"),
        (2, "BioNova Patient Portal 2.0", "BIO-PORT", "HIPAA-compliant patient telemedicine portal, electronic health records integration, and prescription tracker.", "active", "2026-07-15", "2026-12-15", 650.0, 62000.0, "hourly", 90.0, "#10B981"),
        (3, "HyperScale Cloud Billing Dashboard", "HYPER-BILL", "Real-time cost telemetry, invoice generation, and resource provisioning analytics dashboard.", "active", "2026-08-01", "2027-01-31", 500.0, 48000.0, "hourly", 95.0, "#8B5CF6"),
        (4, "EcoLogistics Fleet Tracking IoT", "ECO-FLEET", "Real-time GPS vehicle telematics, route optimization algorithms, and fuel consumption diagnostics.", "planning", "2026-09-15", "2027-03-31", 900.0, 85000.0, "fixed", 90.0, "#F59E0B"),
        (None, "Internal Operations & Tooling", "INT-DEV", "Internal infrastructure upgrades, continuous improvement, team training, and open-source tooling.", "active", "2026-01-01", "2026-12-31", 1000.0, 0.0, "non_billable", 0.0, "#6B7280")
    ]
    cursor.executemany("""
    INSERT INTO projects (client_id, name, code, description, status, start_date, end_date, budget_hours, budget_amount, billing_type, hourly_rate, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, projects_data)

    # 4. Seed Standard Tasks
    tasks_data = [
        (1, "UI/UX & Wireframing", "Designing Figma mobile design systems and customer user journeys", 1, 1),
        (1, "Frontend React Native Dev", "Implementing responsive mobile screens and animations", 1, 1),
        (1, "Backend API & Security", "Core banking transaction APIs, OAuth2 authentication, and encryption", 1, 1),
        (1, "QA & Integration Testing", "Automated device testing and load tests", 1, 1),
        (1, "Project Management & Standups", "Sprint planning, stakeholder demos, and tracking", 1, 0),
        
        (2, "HIPAA Architecture & Compliance", "Security audits and EHR data pipeline compliance", 1, 1),
        (2, "Patient Portal Frontend", "Accessible web dashboard for patient consultations", 1, 1),
        (2, "Telehealth Video Integration", "WebRTC live consultation feature implementation", 1, 1),
        (2, "Automated E2E Testing", "End-to-end Cypress regression suites", 1, 1),
        
        (3, "Data Ingestion Pipeline", "High throughput streaming analytics for billing events", 1, 1),
        (3, "Analytics UI & Charts", "Interactive reporting components and export tools", 1, 1),
        (3, "Infrastructure & Terraform", "Kubernetes cluster configuration and CloudWatch alarms", 1, 1),
        
        (4, "Hardware IoT Gateway Protocol", "MQTT and CoAP device communication specs", 1, 1),
        (4, "Route Optimization Engine", "Geospatial routing and traffic graph algorithms", 1, 1),
        
        (5, "General Company Admin", "Team syncs, all-hands, and administrative tasks", 0, 1),
        (5, "Tech Learning & Upskilling", "Courses, research spikes, and technical certifications", 0, 1),
        (5, "Internal DevOps & CI/CD Tooling", "Maintaining GitHub Actions workflows and local dev environments", 0, 1)
    ]
    cursor.executemany("""
    INSERT INTO tasks (project_id, name, description, billable, is_default)
    VALUES (?, ?, ?, ?, ?)
    """, tasks_data)

    # 5. Seed Project Milestones for Gantt Timeline
    milestones_data = [
        # Project 1: APEX-MB
        (1, "Phase 1: Architecture & Figma Prototype", "Design system signoff and core wireframes", "2026-06-01", "2026-07-15", "completed", 100),
        (1, "Phase 2: Alpha Banking Core & OAuth", "Mobile authentication and account summary endpoints", "2026-07-16", "2026-09-15", "in_progress", 80),
        (1, "Phase 3: Beta Release & Security Pentest", "End-to-end pen-testing and customer pilot testing", "2026-09-16", "2026-10-31", "planned", 20),
        (1, "Phase 4: App Store & Play Store Launch", "Production rollout and live bank API cutover", "2026-11-01", "2026-11-30", "planned", 0),

        # Project 2: BIO-PORT
        (2, "Milestone 1: HIPAA Compliance & Security Spec", "Legal compliance verification and data encryption scheme", "2026-07-15", "2026-08-31", "completed", 100),
        (2, "Milestone 2: WebRTC Telehealth Integration", "Live patient-doctor encrypted video consulting module", "2026-09-01", "2026-10-31", "in_progress", 45),
        (2, "Milestone 3: EHR Health Records Sync", "HL7/FHIR health data integration", "2026-11-01", "2026-12-15", "planned", 0),

        # Project 3: HYPER-BILL
        (3, "Sprint 1: Real-time Telemetry Ingestion", "High-volume stream data pipeline for billing counters", "2026-08-01", "2026-09-30", "in_progress", 60),
        (3, "Sprint 2: Invoice Engine & Customer Portal", "Automated PDF invoices and payment webhook receiver", "2026-10-01", "2026-11-30", "planned", 0),
        (3, "Sprint 3: Enterprise Analytics & Export", "Multi-tenant dashboards and custom report builder", "2026-12-01", "2027-01-31", "planned", 0),

        # Project 4: ECO-FLEET
        (4, "Phase 1: Hardware MQTT Gateway Protocol", "Embedded firmware and vehicle GPS telemetry interface", "2026-09-15", "2026-11-15", "planned", 0),
        (4, "Phase 2: Geospatial Route Optimization", "AI-driven fuel efficiency and traffic path routing", "2026-11-16", "2027-01-31", "planned", 0),
        (4, "Phase 3: Driver Companion Mobile App", "Turn-by-turn navigation and manifest checkoffs", "2027-02-01", "2027-03-31", "planned", 0)
    ]
    cursor.executemany("""
    INSERT INTO milestones (project_id, title, description, start_date, due_date, status, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, milestones_data)

    # 6. Seed Allocations
    today = date.today()
    start_of_month = today.replace(day=1)
    end_of_next_month = (start_of_month + timedelta(days=62)).replace(day=28)

    allocations_data = [
        (4, 1, "Lead Frontend Engineer", start_of_month.isoformat(), end_of_next_month.isoformat(), 24.0, "Core banking screens and API integration"),
        (4, 3, "Senior Full-Stack Engineer", start_of_month.isoformat(), end_of_next_month.isoformat(), 16.0, "Billing data ingestion"),
        (5, 1, "Frontend Mobile Dev", start_of_month.isoformat(), end_of_next_month.isoformat(), 30.0, "Component library and style guide"),
        (5, 5, "Internal Frontend Refactor", start_of_month.isoformat(), end_of_next_month.isoformat(), 10.0, "Internal toolkit updates"),
        (6, 2, "Lead UX Architect", start_of_month.isoformat(), end_of_next_month.isoformat(), 20.0, "Patient workflow user testing"),
        (6, 1, "Design System Advisor", start_of_month.isoformat(), end_of_next_month.isoformat(), 15.0, "Mobile design token sync"),
        (7, 3, "UI/UX Designer", start_of_month.isoformat(), end_of_next_month.isoformat(), 25.0, "Telemetry charts and widgets"),
        (7, 2, "UI Designer", start_of_month.isoformat(), end_of_next_month.isoformat(), 10.0, "Consultation room UI"),
        (8, 1, "QA Automation", start_of_month.isoformat(), end_of_next_month.isoformat(), 20.0, "Mobile regression testing"),
        (8, 2, "Lead QA Tester", start_of_month.isoformat(), end_of_next_month.isoformat(), 25.0, "HIPAA security test suite"),
        (9, 3, "DevOps Engineer", start_of_month.isoformat(), end_of_next_month.isoformat(), 25.0, "Terraform AWS provisioning"),
        (9, 5, "Infrastructure Lead", start_of_month.isoformat(), end_of_next_month.isoformat(), 15.0, "Internal Kubernetes cluster"),
        (10, 2, "Technical Documentation", start_of_month.isoformat(), end_of_next_month.isoformat(), 20.0, "EHR integration user guides"),
        (10, 1, "API Docs Writer", start_of_month.isoformat(), end_of_next_month.isoformat(), 10.0, "Banking API specification docs")
    ]
    cursor.executemany("""
    INSERT INTO allocations (user_id, project_id, role, start_date, end_date, hours_per_week, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, allocations_data)

    # 7. Seed Timesheets & Entries
    current_monday = today - timedelta(days=today.weekday())
    last_monday = current_monday - timedelta(days=7)
    two_weeks_ago_monday = current_monday - timedelta(days=14)

    # Week 1 - Elena (Approved)
    cursor.execute("""
    INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours, submitted_at, approved_at, approved_by)
    VALUES (4, ?, 'approved', 40.0, 40.0, ?, ?, 2)
    """, (two_weeks_ago_monday.isoformat(), (two_weeks_ago_monday + timedelta(days=5)).isoformat(), (two_weeks_ago_monday + timedelta(days=6)).isoformat()))
    ts_id_1 = cursor.lastrowid
    for day_offset in range(5):
        day_date = two_weeks_ago_monday + timedelta(days=day_offset)
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 1, 2, ?, 5.0, 'OAuth2 biometric authentication', 1)", (ts_id_1, day_date.isoformat()))
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 3, 10, ?, 3.0, 'Streaming event data ingestion', 1)", (ts_id_1, day_date.isoformat()))

    # Week 2 - Elena (Submitted)
    cursor.execute("""
    INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours, submitted_at)
    VALUES (4, ?, 'submitted', 41.5, 41.5, ?)
    """, (last_monday.isoformat(), (last_monday + timedelta(days=5)).isoformat()))
    ts_id_3 = cursor.lastrowid
    for day_offset in range(5):
        day_date = last_monday + timedelta(days=day_offset)
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 1, 2, ?, 5.0, 'Transaction card component & fast payment flow', 1)", (ts_id_3, day_date.isoformat()))
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 3, 10, ?, 3.3, 'Billing query cache optimization', 1)", (ts_id_3, day_date.isoformat()))

    # Week 2 - Sophia (Submitted)
    cursor.execute("""
    INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours, submitted_at)
    VALUES (6, ?, 'submitted', 36.0, 36.0, ?)
    """, (last_monday.isoformat(), (last_monday + timedelta(days=5)).isoformat()))
    ts_id_4 = cursor.lastrowid
    for day_offset in range(5):
        day_date = last_monday + timedelta(days=day_offset)
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 2, 6, ?, 4.5, 'Telehealth consultation scheduling journey', 1)", (ts_id_4, day_date.isoformat()))
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 1, 1, ?, 2.7, 'High-fidelity quick transfer mockups', 1)", (ts_id_4, day_date.isoformat()))

    # Week 2 - Amina (Rejected with feedback)
    cursor.execute("""
    INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours, submitted_at, approved_at, approved_by, rejection_reason)
    VALUES (8, ?, 'rejected', 44.0, 44.0, ?, ?, 2, 'Please specify the exact test suites completed for BioNova and confirm if the 4h overtime was pre-approved.')
    """, (last_monday.isoformat(), (last_monday + timedelta(days=5)).isoformat(), (last_monday + timedelta(days=6)).isoformat()))
    ts_id_5 = cursor.lastrowid
    for day_offset in range(5):
        day_date = last_monday + timedelta(days=day_offset)
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 1, 4, ?, 4.0, 'Apex mobile smoke test on iOS simulator', 1)", (ts_id_5, day_date.isoformat()))
        cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 2, 9, ?, 4.8, 'E2E Cypress testing for telehealth patient signups', 1)", (ts_id_5, day_date.isoformat()))

    # Week 3 - Elena (Draft)
    cursor.execute("""
    INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours)
    VALUES (4, ?, 'draft', 16.0, 16.0)
    """, (current_monday.isoformat(),))
    ts_id_6 = cursor.lastrowid
    cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 1, 2, ?, 5.0, 'Sprint 14 backlog refinement', 1)", (ts_id_6, current_monday.isoformat()))
    cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 3, 10, ?, 3.0, 'Telemetry schema validation', 1)", (ts_id_6, current_monday.isoformat()))
    tuesday = current_monday + timedelta(days=1)
    cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 1, 2, ?, 5.0, 'Biometric prompt native bridge', 1)", (ts_id_6, tuesday.isoformat()))
    cursor.execute("INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable) VALUES (?, 3, 10, ?, 3.0, 'Unit testing for invoice endpoints', 1)", (ts_id_6, tuesday.isoformat()))

    conn.commit()
    conn.close()
    print("Database seeding completed.")

if __name__ == "__main__":
    init_db()
    seed_database(force_reseed=True)
