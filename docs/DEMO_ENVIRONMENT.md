# Prinodia Workspace — Demo Environment

> v1.1.0 · Product Readiness & Demo Environment

## Overview

The demo environment lets you generate realistic data across all supported organization types, so you can present Prinodia Workspace to governments, companies, schools, hospitals, NGOs, and churches without any manual data entry.

---

## How to Generate Demo Data

### Via the UI (recommended)

1. Navigate to **Administration → Environnement démo** (`/admin/demo-data`)
2. Select a **seed size** (Small / Medium / Large / Government Ministry)
3. Select an **org type** (All / Government / Enterprise / Education / Healthcare / NGO / Church)
4. Click **⚡ Générer les données démo**

### Via the API

```bash
curl -X POST http://localhost:3001/v1/demo/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"seedSize": "MEDIUM", "orgType": "ALL"}'
```

---

## Seed Sizes

| Size | Employees | Meetings | Documents | Tasks | Notes |
|------|-----------|----------|-----------|-------|-------|
| Small | 3 | 3 | 4 | 5 | Quick demo |
| Medium | 5 | 8 | 10 | 12 | Default |
| Large | 10 | 15 | 20 | 25 | Full demo |
| Government Ministry | 5 | 8 | 10 | 12 | Focused on gov structure |

---

## Demo Organizations

| Code | Name | Type |
|------|------|------|
| DEMO-GOV-FIN | Ministère des Finances | GOVERNMENT |
| DEMO-ENT-TECH | Prinodia Technologies | ENTERPRISE |
| DEMO-EDU-UNI | Université Nationale | EDUCATION |
| DEMO-HEA-HOP | Hôpital Central | HEALTHCARE |
| DEMO-NGO-HOPE | Hope Foundation | NGO |
| DEMO-CHU-LCN | Local Church Network | CHURCH |

---

## Demo Login Accounts

**Password for all demo accounts:** `Demo@2025!`

As of v1.1.1, demo users can log in with **any** of three identifiers:

| Identifier type | Example |
|-----------------|---------|
| Email | `demo.exec.demogov-fin@demo.prinodia` |
| Username | `demo.exec.demogov-fin` |
| Employee ID | `EMP-DEMO-001` |

Demo emails, usernames, and employee numbers follow stable patterns:
- Email: `demo.<role>.<orgcode>@demo.prinodia`
- Username: `demo.<role>.<orgcode>`
- Employee number: `EMP-DEMO-<padded-index>` (001, 002, …)

Example accounts (after generating with orgType=ALL, seedSize=MEDIUM):

| Email | Username | Employee # | Role |
|-------|----------|------------|------|
| `demo.exec.demogov-fin@demo.prinodia` | `demo.exec.demogov-fin` | `EMP-DEMO-001` | Executive / Super Admin |
| `demo.mgr1.demogov-fin@demo.prinodia` | `demo.mgr1.demogov-fin` | `EMP-DEMO-002` | Manager |
| `demo.mgr2.demogov-fin@demo.prinodia` | `demo.mgr2.demogov-fin` | `EMP-DEMO-003` | Manager |
| `demo.emp1.demogov-fin@demo.prinodia` | `demo.emp1.demogov-fin` | `EMP-DEMO-004` | Employee |
| `demo.hr.demogov-fin@demo.prinodia` | `demo.hr.demogov-fin` | `EMP-DEMO-005` | HR Manager |

---

## How to Reset Demo Data

### Via the UI

1. Go to **Administration → Environnement démo**
2. Click **🗑 Réinitialiser**
3. Confirm the dialog

### Via the API

```bash
curl -X DELETE http://localhost:3001/v1/demo/reset \
  -H "Authorization: Bearer <token>"
```

---

## Safety Rules

The demo system is designed to be completely safe:

1. **Idempotent generation** — Running generate twice produces the same records (ON CONFLICT DO NOTHING). No duplicates.
2. **Demo registry** — Every generated entity ID is tracked in the `demo_registry` table. Reset only deletes these IDs.
3. **Never touches non-demo data** — Reset uses explicit ID-list deletion, never mass deletes by type.
4. **Demo email domain** — All demo users have emails ending in `@demo.prinodia`, clearly separating them from real users.
5. **isDemo flag** — All demo organizations have `isDemo = true` in the database.
6. **Audit trail** — Every generation run creates audit log entries.

---

## Database Markers

| Signal | Location | Value |
|--------|----------|-------|
| isDemo flag | organizations.isDemo | true |
| Email domain | users.email | @demo.prinodia |
| Title prefix | meetings, documents, tasks, notifications | [DEMO] prefix |
| Org code prefix | organizations.code | DEMO- prefix |
| Registry tracking | demo_registry table | All entity IDs |

---

## Architecture

```
DemoService
├── generate(dto)         → Creates all demo data, writes demo_registry
│   ├── Step 1: Organizations (via $executeRaw — pre-generate compat)
│   ├── Step 2: Departments (attached to first ministry found)
│   ├── Step 3: Users (stable emails, bcrypt password)
│   ├── Step 4: Meetings ([DEMO] prefix)
│   ├── Step 5: Documents ([DEMO] prefix)
│   ├── Step 6: Tasks ([DEMO] prefix)
│   ├── Step 7: Notifications ([DEMO] prefix)
│   ├── Step 8: Audit logs
│   └── Step 9: demo_registry entries
├── reset()               → Reads demo_registry, deletes in safe order
└── getStatus()           → Returns counts and last generated timestamp
```

---

## Required Permissions

| Action | Permission |
|--------|------------|
| View demo status | DEMO:READ |
| Generate demo data | DEMO:MANAGE |
| Reset demo data | DEMO:MANAGE |

These permissions must be assigned to admin roles via the RBAC system.
