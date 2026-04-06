<![CDATA[<div align="center">

```
██████╗ ███████╗██████╗ ███████╗██╗███╗   ██╗███████╗██╗ ██████╗ ██╗  ██╗████████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝██║████╗  ██║██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝
██████╔╝█████╗  ██████╔╝█████╗  ██║██╔██╗ ██║███████╗██║██║  ███╗███████║   ██║
██╔═══╝ ██╔══╝  ██╔══██╗██╔══╝  ██║██║╚██╗██║╚════██║██║██║   ██║██╔══██║   ██║
██║     ███████╗██║  ██║██║     ██║██║ ╚████║███████║██║╚██████╔╝██║  ██║   ██║
╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
```

### **Performance Test Results Comparison Platform**

*Analyze. Compare. Optimize.*

---

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started (Local)](#-getting-started-local)
- [Environment Variables](#-environment-variables)
- [Role-Based Access Control](#-role-based-access-control)
- [Supported File Formats](#-supported-file-formats)
- [How to Use the Application](#-how-to-use-the-application)
  - [1. Login](#1-login)
  - [2. Dashboard](#2-dashboard)
  - [3. Managing Projects and Sub-Projects](#3-managing-projects-and-sub-projects-admin)
  - [4. Managing Users and Access](#4-managing-users-and-access-admin)
  - [5. Uploading Test Results](#5-uploading-test-results)
  - [6. Viewing Test Run Details](#6-viewing-test-run-details)
  - [7. Comparing Test Runs](#7-comparing-test-runs)
  - [8. Trend Analysis](#8-trend-analysis)
  - [9. Transaction Filter Configuration](#9-transaction-filter-configuration)
  - [10. Exporting PDF Reports](#10-exporting-pdf-reports)
- [Comparison Engine](#-comparison-engine)
- [API Reference](#-api-reference)
- [Deployment Guide](#-deployment-guide)
  - [Docker & Docker Compose](#1-docker--docker-compose)
  - [PM2 on a VPS / Bare Metal](#2-pm2-on-a-vps--bare-metal)
  - [AWS — EC2 + Nginx](#3-aws--ec2--nginx)
  - [AWS — ECS + Fargate (Containerized)](#4-aws--ecs--fargate-containerized)
  - [Azure — App Service](#5-azure--app-service)
  - [Google Cloud — Cloud Run](#6-google-cloud--cloud-run)
  - [Kubernetes (Helm-ready)](#7-kubernetes-helm-ready)
- [Security Hardening for Production](#-security-hardening-for-production)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Overview

**PerfInsight** is a full-stack web application built for Performance Testing Centers of Excellence (COE) to **upload, organize, compare, and trend-analyze performance test results** from any testing tool — JMeter, Gatling, K6, Locust, or custom CSVs.

Instead of manually comparing spreadsheets after every load test run, PerfInsight gives your team a centralized, visual platform to:

- Instantly see regressions and improvements at the transaction level
- Track metric trends across multiple test runs over time
- Score overall test quality on a 0–100 scale
- Enforce team collaboration through role-based access

> Built for teams that run performance tests regularly and need consistent, automated analysis — not one-off comparisons.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📁 **Hierarchical Organization** | Projects → Sub-Projects → Test Runs — mirrors real-world customer/application structure |
| 📤 **Multi-Tool Upload** | Parse JMeter JTL/CSV, Gatling, K6, Locust, and any generic CSV/Excel export |
| 🔍 **Transaction-Level Comparison** | Side-by-side P90, Avg, Throughput, Error Rate comparison between any two test runs |
| 📊 **Executive Summary** | "Summary at a Glance" cards + narrative + Test-Level Metrics table on every comparison |
| 📄 **PDF Export** | One-click PDF report with summary, metrics table, insights, and full transaction comparison |
| 💡 **AI-Style Insights** | Categorized insights (Critical / Warning / Info / Success) with root-cause hints |
| 📈 **Trend Analysis** | Multi-metric trend charts across test runs: response time, throughput, error rate, user load |
| 🔧 **Transaction Filters** | Configure which transactions matter per sub-project — supports manual selection and Excel import |
| ✏️ **Inline Editing** | Rename test runs directly from the table — no modal needed |
| 👥 **Role-Based Access** | Admin vs User roles with per-project allocation |
| 🔐 **JWT Authentication** | Secure, token-based login with 8-hour session expiry |
| 🌓 **Collapsible Dashboard** | Project → Sub-Project hierarchy with quick compare capability |
| 📅 **Quick Comparison** | Pick baseline + compare from the Dashboard and jump straight to results |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React 18 SPA  (Vite + TypeScript)          │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │   │
│  │  │Dashboard │  │ Compare  │  │   Trend Analysis   │ │   │
│  │  └──────────┘  └──────────┘  └────────────────────┘ │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │   │
│  │  │ Upload   │  │Projects  │  │  User Management   │ │   │
│  │  └──────────┘  └──────────┘  └────────────────────┘ │   │
│  │                                                      │   │
│  │  AuthContext ──► Axios Client ──► /api/*             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                         HTTP / REST
                              │
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER (Node.js)                   │
│                                                             │
│  ┌────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │requireAuth │  │ requireAdmin  │  │   File Upload       │ │
│  │ Middleware │  │  Middleware   │  │   (Multer)          │ │
│  └────────────┘  └───────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Route Handlers                      │ │
│  │  /auth   /projects   /subprojects   /testruns          │ │
│  │  /comparison   /trends   /dashboard                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  Comparison Engine  │  │     File Parser             │  │
│  │  (P90 regression    │  │  (CSV / Excel → normalized  │  │
│  │   detection + score)│  │   transaction rows)         │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           better-sqlite3  ──  SQLite DB              │   │
│  │  users │ projects │ sub_projects │ test_runs │       │   │
│  │  transactions │ user_project_access                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| `express` | 4.18 | HTTP server and REST API framework |
| `better-sqlite3` | 12.x | Synchronous SQLite ORM — zero-config, file-based DB |
| `jsonwebtoken` | 9.x | JWT signing and verification |
| `multer` | 1.4 | Multipart file upload handling |
| `xlsx` | 0.18 | Excel (.xlsx) and CSV parsing |
| `dotenv` | 16.x | Environment variable loading |
| `cors` | 2.8 | Cross-origin resource sharing |
| `typescript` | 5.3 | Static typing |
| `ts-node` / `nodemon` | — | Hot-reload development server |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `react` | 18.2 | UI framework |
| `react-router-dom` | 6.22 | Client-side routing |
| `axios` | 1.6 | HTTP client with interceptors |
| `recharts` | 2.12 | SVG-based charting |
| `tailwindcss` | 3.4 | Utility-first CSS framework |
| `@heroicons/react` | 2.1 | Icon set |
| `clsx` | 2.1 | Conditional class names |
| `date-fns` | 3.3 | Date formatting |
| `react-dropzone` | 14.2 | Drag-and-drop file upload |
| `jspdf` | 2.x | Client-side PDF generation |
| `jspdf-autotable` | 3.x | Table rendering plugin for jsPDF |
| `xlsx` | 0.20 | Client-side Excel/CSV parsing for transaction filter import |
| `vite` | 5.4 | Build tool and dev server |

---

## 📂 Project Structure

```
PerformanceTestResultsComparison/
│
├── package.json                    # Root workspace scripts
│
├── backend/
│   ├── .env                        # Environment configuration
│   ├── .env.example                # Template for new deployments
│   ├── tsconfig.json
│   ├── data/
│   │   └── perf_comparison.db      # SQLite database (auto-created)
│   ├── uploads/                    # Uploaded test result files
│   └── src/
│       ├── index.ts                # Express app + dashboard endpoint
│       ├── database.ts             # DB init, schema, password hashing
│       ├── middleware/
│       │   ├── auth.ts             # requireAuth + requireAdmin
│       │   └── upload.ts           # Multer config
│       ├── routes/
│       │   ├── auth.ts             # Login + user CRUD
│       │   ├── projects.ts         # Project CRUD (access-controlled)
│       │   ├── subprojects.ts      # Sub-project CRUD
│       │   ├── testruns.ts         # Upload, update, delete test runs
│       │   ├── comparison.ts       # Comparison engine orchestration
│       │   └── trends.ts           # Trend data queries
│       └── utils/
│           ├── fileParser.ts       # CSV/Excel → transaction rows
│           └── comparisonEngine.ts # Regression detection + scoring
│
└── frontend/
    ├── vite.config.ts              # Vite + API proxy config
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                 # Routes + ProtectedRoute + AdminRoute
        ├── main.tsx                # AuthProvider mount
        ├── api/
        │   ├── client.ts           # Axios instance + interceptors
        │   ├── comparison.ts       # Comparison + dashboard API
        │   ├── projects.ts         # Project + subproject API
        │   ├── testruns.ts         # Test run API
        │   └── users.ts            # User management API
        ├── components/
        │   ├── Layout.tsx
        │   ├── Sidebar.tsx         # Role-aware navigation
        │   ├── ComparisonTable.tsx # Tabbed comparison tables (RT / Throughput / Error Rate)
        │   ├── InsightCard.tsx
        │   └── charts/
        │       ├── ResponseTimeChart.tsx  # AvgResponseTimeChart + P90ResponseTimeChart
        │       ├── ThroughputChart.tsx
        │       ├── ErrorRateChart.tsx
        │       └── TrendChart.tsx         # Multi-metric line chart
        ├── contexts/
        │   └── AuthContext.tsx     # Auth state + role + isAdmin
        ├── utils/
        │   └── generateComparisonPDF.ts  # jsPDF-based PDF report generator
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   ├── Projects.tsx
        │   ├── ProjectDetail.tsx
        │   ├── SubProjectDetail.tsx
        │   ├── Upload.tsx
        │   ├── Comparison.tsx
        │   ├── Trends.tsx
        │   └── Admin.tsx           # User management (admin only)
        └── types/
            └── index.ts            # All TypeScript interfaces
```

---

## 🏁 Getting Started (Local)

### Prerequisites

- **Node.js** 18 or later — [download](https://nodejs.org)
- **npm** 9 or later (comes with Node)
- Git

### 1. Clone the repository

```bash
git clone <your-repo-url> PerformanceTestResultsComparison
cd PerformanceTestResultsComparison
```

### 2. Install dependencies

```bash
npm run install:all
```

This installs both backend and frontend dependencies in one step.

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=6001
DB_PATH=./data/perf_comparison.db
UPLOAD_DIR=./uploads
AUTH_USERNAME=admin
AUTH_PASSWORD=admin123
JWT_SECRET=change-this-to-a-random-secret-string
```

> ⚠️ `JWT_SECRET` must be changed before sharing with others. The default admin user is seeded automatically from `AUTH_USERNAME` / `AUTH_PASSWORD` on first launch.

### 4. Start development servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (hot-reload)
npm run dev:backend

# Terminal 2 — Frontend (HMR)
npm run dev:frontend
```

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| Backend (API) | http://localhost:6001 |
| API Health Check | http://localhost:6001/api/health |

### 5. Log in

Open [http://localhost:5173](http://localhost:5173) and log in with:
- **Username:** `admin`
- **Password:** `admin123`

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend HTTP port |
| `DB_PATH` | `./data/perf_comparison.db` | SQLite database file path |
| `UPLOAD_DIR` | `./uploads` | Directory where uploaded result files are stored |
| `AUTH_USERNAME` | `admin` | Username for the initial admin account (seeded once) |
| `AUTH_PASSWORD` | `admin123` | Password for the initial admin account |
| `JWT_SECRET` | `perf-insight-secret-change-me` | Secret key for signing JWT tokens — **must be changed in production** |

---

## 👥 Role-Based Access Control

PerfInsight uses a two-tier role model:

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN                                                       │
│  ────────────────────────────────────────────────────────    │
│  ✅ Create / edit / delete Projects                          │
│  ✅ Create / edit / delete Sub-Projects                      │
│  ✅ Create / edit / delete Users                             │
│  ✅ Assign projects to users                                 │
│  ✅ Upload, compare, view trends (all projects)              │
│  ✅ Configure transaction filters                            │
│  ✅ Access User Management page                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  USER                                                        │
│  ────────────────────────────────────────────────────────    │
│  ✅ View Projects and Sub-Projects (allocated only)          │
│  ✅ Upload test results (allocated projects only)            │
│  ✅ Compare test runs (allocated projects only)              │
│  ✅ View trend analysis (allocated projects only)            │
│  ✅ Configure transaction filters                            │
│  ✅ Edit test run names                                      │
│  ✅ Export PDF comparison reports                            │
│  ❌ Cannot create/delete projects or sub-projects           │
│  ❌ Cannot access User Management                           │
│  ❌ Cannot see projects not assigned to them                │
└──────────────────────────────────────────────────────────────┘
```

### How project access works

1. An **Admin** creates a User account via **Admin → User Management**
2. During creation, the Admin selects which **Projects** the user can see
3. The user immediately sees only those projects in Dashboard, Upload, Compare, and Trends
4. Sub-projects are implicitly accessible when the parent project is allocated

### Protecting the last admin

- The system prevents deleting the last admin account
- The system prevents demoting the last admin to a regular user
- A user cannot delete their own account

---

## 📄 Supported File Formats

### JMeter (JTL / Aggregate Report CSV)

The parser auto-detects JMeter format. Supported columns:

```
timeStamp, elapsed, label, responseCode, success, bytes, latency, connect
# OR aggregate report columns:
Label, # Samples, Average, Min, Max, 90th pct, 95th pct, 99th pct, Error %, Throughput, KB/sec
```

### Generic CSV / Excel

Any CSV or Excel file with a row per transaction containing these columns (case-insensitive):

| Column | Required | Description |
|---|---|---|
| `Label` / `Transaction` / `Name` | ✅ | Transaction name |
| `Samples` / `# Samples` | — | Number of requests |
| `Average` / `Avg` | — | Average response time (ms) |
| `Min` | — | Minimum response time (ms) |
| `Max` | — | Maximum response time (ms) |
| `90th pct` / `P90` | — | 90th percentile (ms) |
| `95th pct` / `P95` | — | 95th percentile (ms) |
| `99th pct` / `P99` | — | 99th percentile (ms) |
| `Error %` / `Error Rate` | — | Error rate (%) |
| `Throughput` / `RPS` | — | Requests per second |
| `KB/sec` / `Received KB/sec` | — | Throughput in KB/s |

> Values above 100 in response time columns are treated as milliseconds and automatically converted to seconds.

### Supported Test Tools

| Tool | File Format | Notes |
|---|---|---|
| Apache JMeter | `.jtl`, `.csv` | Aggregate report or raw JTL |
| Gatling | `.csv` | stats.csv from simulation |
| K6 | `.csv`, `.xlsx` | Custom summary export |
| Locust | `.csv` | stats_history.csv |
| Custom | `.csv`, `.xlsx` | Any normalized format above |

---

## 📖 How to Use the Application

This section walks through every feature of PerfInsight with step-by-step instructions.

---

### 1. Login

1. Open the application URL in your browser.
2. Enter your **Username** and **Password** on the Login page.
3. Click **Sign In**.
4. You will be redirected to the **Dashboard**.

> Sessions last 8 hours. After expiry you will be automatically redirected to the Login page.

---

### 2. Dashboard

The Dashboard is the home screen — it shows an overview of all your projects and allows quick access to comparisons.

**What you see:**

- **Summary cards** at the top: Total Projects, Total Test Runs, Good Tests, Bad Tests
- **Project accordion list**: Each project shows its sub-projects; expand a sub-project to see recent test runs
- **Quick Compare panel**: Select a Baseline and Compare test run from any sub-project's dropdown, then click **Compare** to jump straight to the Comparison page

**Navigating to a Sub-Project:**

Click on any sub-project name to open the **Sub-Project Detail** page where all test runs are listed.

---

### 3. Managing Projects and Sub-Projects *(Admin)*

**Creating a Project:**

1. Go to **Projects** in the sidebar.
2. Click **New Project**.
3. Fill in: **Project Name**, **Customer Name**, and an optional **Description**.
4. Click **Create**.

**Creating a Sub-Project:**

1. Click on a Project to open its detail page.
2. Click **New Sub-Project**.
3. Enter a **Name** and optional **Description**.
4. Click **Create**.

**Editing / Deleting:**

- Use the pencil icon next to a project or sub-project name to edit it inline.
- Use the trash icon to delete. Deleting a project removes all its sub-projects, test runs, and uploaded files.

---

### 4. Managing Users and Access *(Admin)*

1. Click **Admin** (or **User Management**) in the sidebar.
2. Click **New User**.
3. Enter **Username**, **Password**, and select **Role** (Admin or User).
4. Select which **Projects** this user can access from the checkboxes.
5. Click **Create User**.

**Editing a user:**

- Click the edit icon to update password, role, or project assignments.
- Roles: `admin` has full access; `user` sees only allocated projects.

**Key safeguards:**

- You cannot delete your own account.
- You cannot delete or demote the last remaining admin.

---

### 5. Uploading Test Results

**From the Upload page:**

1. Click **Upload** in the sidebar.
2. Select the **Project** and **Sub-Project** from the dropdowns.
3. Drag and drop your result file (or click to browse). Supported: `.csv`, `.xlsx`, `.jtl`
4. Fill in optional metadata: **Test Run Name**, **Build / Version**, **User Load (VUs)**, **Test Tool**, **Status** (Good / Bad / Under Review), **Notes**.
5. Click **Upload**.

**From a Sub-Project Detail page:**

1. Navigate to the sub-project.
2. Click the **Upload New Test Run** button at the top of the page.
3. Follow steps 3–5 above.

> After upload, the parsed transaction count is shown. If no transactions are parsed, check that the file matches a supported format.

**Renaming a Test Run:**

- Click the pencil icon in the test run row on the Sub-Project Detail page.
- Type the new name and press Enter or click the save icon.

---

### 6. Viewing Test Run Details

1. Navigate to a sub-project (Projects → Project → Sub-Project).
2. Click on any **test run row** in the table to open the **Transactions popup**.

**Transactions Popup:**

- Displays every transaction from that test run with columns: **Transaction Name**, **Samples**, **Avg RT (s)**, **P90 RT (s)**, **P95 RT (s)**, **P99 RT (s)**, **Error %**, **Throughput (req/s)**, **Min (s)**, **Max (s)**.
- All response times are shown with 2 decimal places.

**Filtering Transactions in the Popup:**

- If a **Transaction Filter** has been configured for the sub-project, a checkbox **"Show configured transactions only"** appears at the top of the table.
- Check this box to limit the view to only the transactions in your configured filter set.
- The header count updates to show **"Transactions (N of Total)"** so you know how many are displayed vs total.
- If no filter is configured, a hint reads *"No transaction filters configured"*.

**Closing the popup:**

- Click the ✕ button or click outside the modal.

---

### 7. Comparing Test Runs

Comparison is the core feature of PerfInsight. It gives you a side-by-side analysis at every transaction level.

#### Selecting Runs to Compare

**From the Dashboard:**
1. Expand a sub-project's test run list.
2. Select a **Baseline** (the reference run) and a **Compare** (the new run) from the dropdowns.
3. Click **Compare**.

**From the Comparison page:**
1. Click **Comparison** in the sidebar.
2. Select a **Project** then a **Sub-Project**.
3. Select the **Baseline** run and the **Compare** run.
4. Click **Run Comparison**.

#### Reading the Comparison Result

The results page is divided into sections:

**Summary at a Glance (8 cards):**

| Card | Description |
|---|---|
| Compared | Total matched transactions |
| Improved | Transactions with significant improvement |
| Degraded | Transactions with regression |
| Stable | Transactions with no significant change |
| Above 5s | Transactions where avg RT > 5 seconds |
| Peak RT | Highest avg response time across all transactions |
| Max Regression | Worst regression percentage (P90) |
| Best Improvement | Best improvement percentage (P90) |

**Executive Summary:**

A narrative paragraph summarizing the overall result, peak response time, worst regression, best improvement, and a final verdict (Pass / Partial Pass / Fail).

**Test-Level Metrics Comparison:**

A 6-row table comparing the two test runs side-by-side at the aggregate level:

| Metric | Baseline | Compare | Change |
|---|---|---|---|
| Total Transactions | — | — | — |
| Avg Response Time | — | — | — |
| P90 Response Time | — | — | — |
| Error Count | — | — | — |
| Error Rate | — | — | — |
| Throughput (req/s) | — | — | — |

**Insights:**

Auto-generated categorized observations:
- 🔴 **Critical** — severe regressions (P90 > 25% worse)
- 🟠 **Warning** — moderate regressions or error rate increase
- 🟢 **Success** — significant improvements
- 🔵 **Info** — new or missing transactions

#### Transaction Comparison Tabs

The per-transaction comparison is organized into four tabs:

**Response Times tab:**

Columns: Transaction Name | Baseline Avg (s) | Compare Avg (s) | Avg Change | Baseline P90 (s) | Compare P90 (s) | P90 Change | Status

- Click any column header to sort ascending / descending.
- The **Status** column shows color-coded badges: `Improved`, `Degraded`, `Stable`, `New`, `Missing`.
- Degraded rows are highlighted in red, improved rows in green.

**Throughput tab:**

Columns: Transaction Name | Baseline TPS | Compare TPS | Change | Status

**Error Rate tab:**

Columns: Transaction Name | Baseline Err% | Compare Err% | Change | Status

**Charts tab:**

Four charts visualizing the comparison:

1. **Average Response Time Chart** — grouped bar chart (Baseline vs Compare Avg RT per transaction)
2. **P90 Response Time Chart** — grouped bar chart (Baseline vs Compare P90 RT per transaction)
3. **Throughput Chart** — grouped bar chart (Baseline vs Compare TPS per transaction)
4. **Error Rate Chart** — grouped bar chart sorted by highest error rate first, with a dashed 1% reference line; tooltip shows error rate % and computed error count

> **Note:** All chart legends and tooltips use the actual test run names (not generic "Baseline"/"Compare" labels).

Charts show up to 15 transactions. Hover over any bar for a tooltip with the full transaction name and values.

---

### 8. Trend Analysis

Trend Analysis shows how a specific transaction's performance has changed across multiple test runs over time.

1. Click **Trends** in the sidebar.
2. Select a **Project** from the first dropdown.
3. Select a **Sub-Project** from the second dropdown.
4. Once loaded, select a **Transaction** from the third dropdown. You can also click any of the quick-pick transaction buttons that appear below.
5. Optionally change the **Filter** to **Good Runs Only** to exclude runs marked as Bad or Under Review.

**Charts shown:**

| Chart | Metric | Y-Axis |
|---|---|---|
| Average Response Time Trend | `avg_response_time` | Seconds |
| P90 Response Time Trend | `p90_response_time` and `p99_response_time` | Seconds |
| Throughput Trend | `throughput` | req/s |
| Error Rate Trend | `error_rate` | % |
| User Load per Test Run | `user_load` | VUs |

Each chart X-axis shows the test run name and date. Hover for exact values.

**Filter badge:**

If a Transaction Filter is configured for the sub-project, a blue badge below the selectors shows how many configured transactions are available. The transaction dropdown will only show those filtered transactions.

---

### 9. Transaction Filter Configuration

The Transaction Filter lets you specify which transactions are relevant for a sub-project. Once set, the filter applies to:
- The **Transaction dropdown** in Trend Analysis (only filtered transactions shown)
- The **"Show configured transactions only"** checkbox in the test run popup

**Opening the filter configuration:**

1. Navigate to a sub-project detail page.
2. Click the **Configure Transactions** (or filter) button near the top of the page.

**Searching and selecting transactions manually:**

1. Use the **search box** to filter the transaction list by name.
2. Check/uncheck individual transactions.
3. Use **Select All** to select all visible (searched) transactions at once.
4. Use **Deselect All** to clear all selections from the visible list.
5. Click **Save** to apply the filter.

**Importing from Excel / CSV:**

If you have a spreadsheet with your transaction list:

1. Click **Import from Excel** in the filter configuration modal.
2. Select your `.xlsx` or `.csv` file.
3. The importer looks for a column named `Transaction`, `Name`, or `Label` (case-insensitive). If none match, it uses the first column.
4. All matching transaction names are automatically checked.
5. A confirmation banner shows how many transactions were imported/matched.
6. Review the selection and click **Save**.

> **Tip:** You can combine Excel import with manual selection — import a base list, then add or remove individual transactions.

---

### 10. Exporting PDF Reports

After running a comparison, you can export a full PDF report:

1. From the Comparison results page, click **Export PDF Report** (top-right area, next to the comparison title).
2. The PDF is generated in the browser and downloaded automatically — no server round-trip.

**The PDF includes:**

| Section | Content |
|---|---|
| Header | Test run names, export timestamp |
| Overview | Project, build, tool, execution date |
| Summary at a Glance | All 8 stat cards |
| Executive Summary | Full narrative |
| Test-Level Metrics | 6-row baseline vs compare table with change indicators |
| Insights | All categorized insights |
| Transaction Comparison | Full per-transaction table (page 2+) |
| Footer | Page numbers on every page |

> **Note:** All text in the PDF is ASCII-safe — special characters such as arrows and bullets are normalized to plain text equivalents for maximum compatibility.

---

## ⚙️ Comparison Engine

The comparison engine (`comparisonEngine.ts`) performs transaction-level analysis:

### Metric Comparison

For each matched transaction:

```
diff% = ((compare_value - baseline_value) / baseline_value) × 100
```

### Regression Detection Thresholds

| Metric | Regression | Improvement | Formula |
|---|---|---|---|
| Avg Response Time | diff > +10% | diff < -10% | Higher = worse |
| P90 Response Time | diff > +10% | diff < -10% | Higher = worse |
| Throughput | diff < -10% | diff > +10% | Lower = worse |
| Error Rate | absolute increase > 5% | absolute decrease > 5% | Higher = worse |

### Performance Score (0–100)

```
Score starts at 100

Each transaction regression deducts:
  - Critical  (P90 regression > 25%)  → −5 points
  - Warning   (P90 regression 10–25%) → −2 points
  - Error rate regression             → −3 points per occurrence

Minimum score: 0
Score >= 80 = GOOD  |  Score >= 60 = MODERATE  |  Score < 60 = POOR
```

### Insight Severity Levels

| Level | Trigger |
|---|---|
| 🔴 **Critical** | P90 regression > 25% |
| 🟠 **Warning** | P90 regression 10–25% or error rate increase |
| 🟢 **Success** | P90 improvement > 10% |
| 🔵 **Info** | New or missing transactions detected |

### Comparison Page Layout

When a comparison is run, the page is structured as:

1. **Summary at a Glance** — 8 stat cards: Compared, Improved, Degraded, Stable, Above 5s, Peak RT, Max Regression, Best Improvement
2. **Executive Summary** — Narrative paragraph(s) describing the overall outcome, peak response time, largest regression, best improvement, and a verdict
3. **Test-Level Metrics Comparison** — 6-row table comparing Baseline vs Compare for: Total Transactions, Avg Response Time, P90 RT, Error Count, Error Rate, Throughput
4. **Insights** — Auto-generated categorized observations
5. **Transaction Comparison Tabs** — Four tabs: Response Times, Throughput, Error Rate, Charts

### PDF Export

The **Export PDF Report** button (top-right of the comparison result) generates an A4 landscape PDF containing all sections above. The report includes:

- Page header with test run names
- Comparison overview table (project, build, tool, date)
- Summary at a Glance cards
- Executive Summary narrative
- Test-Level Metrics table with change indicators
- Insights table
- Full Transaction Comparison table (page 2+)
- Timestamped footer with page numbers

> **Note:** PDF generation runs entirely in the browser using `jspdf` + `jspdf-autotable` — no server round-trip required.

---

## 📡 API Reference

All endpoints (except `/api/auth/login` and `/api/health`) require:

```
Authorization: Bearer <jwt_token>
```

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }

# Response
{ "success": true, "data": { "token": "...", "username": "admin", "role": "admin" } }
```

```http
GET /api/auth/me
Authorization: Bearer <token>

# Response
{ "success": true, "data": { "id": 1, "username": "admin", "role": "admin" } }
```

### User Management (Admin Only)

```http
GET    /api/auth/users              # List all users with project assignments
POST   /api/auth/users              # Create user {username, password, role, project_ids[]}
PUT    /api/auth/users/:id          # Update {password?, role?, project_ids?[]}
DELETE /api/auth/users/:id          # Delete user
```

### Projects

```http
GET    /api/projects                # List (filtered by access for non-admins)
POST   /api/projects                # Create {name, customer_name, description?}  [Admin]
GET    /api/projects/:id            # Get single project with counts
PUT    /api/projects/:id            # Update project metadata  [Admin]
DELETE /api/projects/:id            # Delete project + all nested data  [Admin]
```

### Sub-Projects

```http
GET    /api/projects/:pid/subprojects           # List sub-projects
POST   /api/projects/:pid/subprojects           # Create {name, description?}  [Admin]
GET    /api/projects/:pid/subprojects/:id       # Get single sub-project
PUT    /api/projects/:pid/subprojects/:id       # Update  [Admin]
DELETE /api/projects/:pid/subprojects/:id       # Delete  [Admin]
GET    /api/projects/:pid/subprojects/:id/filters    # Get transaction filters []
PUT    /api/projects/:pid/subprojects/:id/filters    # Set filters {filters: string[]}
```

### Test Runs

```http
GET    /api/subprojects/:spid/testruns          # List test runs
POST   /api/subprojects/:spid/testruns          # Upload (multipart/form-data)
GET    /api/testruns/:id                        # Get single test run
PUT    /api/testruns/:id                        # Update {name?, status?, notes?, build?, user_load?}
DELETE /api/testruns/:id                        # Delete run + file
GET    /api/testruns/:id/transactions           # Get all transactions
```

### Comparison

```http
GET /api/comparison?baseline=:id&compare=:id

# Response includes:
{
  "baseline": { ...testRun },
  "compare":  { ...testRun },
  "transactionComparisons": [...],
  "insights": [...],
  "overallScore": 87,
  "summary": {
    "totalTransactions": 24,
    "regressions": 2,
    "improvements": 5,
    "neutral": 15,
    "newTransactions": 1,
    "missingTransactions": 1
  }
}
```

### Trends

```http
GET /api/trends/:subprojectId
# Returns: { transactionNames: [...], testRunSummary: [...] }

GET /api/trends/:subprojectId?transactionName=HomePage&filter=good
# Returns trend data points for a specific transaction
```

### Dashboard

```http
GET /api/dashboard/stats
# Returns: totalProjects, totalTestRuns, goodTests, badTests,
#          recentTestRuns (50, access-filtered), allTestRuns (for compare dropdowns)
```

---

## 🚢 Deployment Guide

---

### 1. Docker & Docker Compose

**The recommended approach for most teams.**

#### Step 1 — Create `Dockerfile` for the backend

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
```

#### Step 2 — Create `Dockerfile` for the frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Pass the backend API URL at build time
ARG VITE_API_BASE_URL=/api
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### Step 3 — Create `nginx.conf` for the frontend container

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing — serve index.html for all unknown paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api requests to the backend container
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Step 4 — Create `docker-compose.yml` at the project root

```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: perfinsight-backend
    restart: unless-stopped
    environment:
      PORT: 3001
      DB_PATH: /app/data/perf_comparison.db
      UPLOAD_DIR: /app/uploads
      AUTH_USERNAME: ${AUTH_USERNAME:-admin}
      AUTH_PASSWORD: ${AUTH_PASSWORD:-admin123}
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
    volumes:
      - perfinsight-db:/app/data
      - perfinsight-uploads:/app/uploads
    networks:
      - perfinsight-net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: perfinsight-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - perfinsight-net

volumes:
  perfinsight-db:
  perfinsight-uploads:

networks:
  perfinsight-net:
    driver: bridge
```

#### Step 5 — Create a production `.env` at the project root

```env
# .env  (project root — used by docker-compose)
AUTH_USERNAME=admin
AUTH_PASSWORD=SomeStr0ngP@ssword
JWT_SECRET=a-very-long-random-secret-string-change-this
```

#### Step 6 — Build and run

```bash
docker compose up --build -d
```

Access PerfInsight at **http://your-server-ip**

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Restart with fresh database
docker compose down -v && docker compose up --build -d
```

---

### 2. PM2 on a VPS / Bare Metal

Use this when you want to run directly on a Linux server without Docker.

#### Prerequisites

```bash
# Install Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20

# Install PM2 globally
npm install -g pm2

# Install Nginx
sudo apt update && sudo apt install -y nginx
```

#### Step 1 — Clone and build

```bash
cd /opt
git clone <your-repo-url> perfinsight
cd perfinsight

# Install dependencies
npm run install:all

# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

#### Step 2 — Configure backend environment

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

```env
PORT=3001
DB_PATH=/opt/perfinsight/backend/data/perf_comparison.db
UPLOAD_DIR=/opt/perfinsight/backend/uploads
AUTH_USERNAME=admin
AUTH_PASSWORD=YourSecurePassword
JWT_SECRET=your-random-64-char-secret
```

#### Step 3 — Start the backend with PM2

```bash
cd /opt/perfinsight/backend
pm2 start dist/index.js --name perfinsight-api

# Save PM2 process list (survives reboots)
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

#### Step 4 — Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/perfinsight
```

```nginx
server {
    listen 80;
    server_name your-domain.com;   # or your server IP

    root /opt/perfinsight/frontend/dist;
    index index.html;

    # Serve the React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the Node backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/perfinsight /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### Step 5 — Add SSL with Let's Encrypt (optional but recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### 3. AWS — EC2 + Nginx

#### Step 1 — Launch EC2 Instance

- **AMI:** Ubuntu 22.04 LTS
- **Instance type:** t3.small (minimum), t3.medium (recommended)
- **Storage:** 20 GB gp3
- **Security Group inbound rules:**

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| 22 | TCP | Your IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

#### Step 2 — Connect and provision

```bash
ssh -i your-key.pem ubuntu@<EC2-Public-IP>

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Install PM2
sudo npm install -g pm2
```

Follow the **PM2 on a VPS** steps above from Step 1 onwards.

#### Step 3 — Persist uploads with EBS or S3 (optional)

For durability, mount an EBS volume to `/opt/perfinsight/backend/uploads`:

```bash
# Find and format the volume
sudo mkfs.ext4 /dev/xvdb
sudo mkdir -p /opt/perfinsight/backend/uploads
echo "/dev/xvdb /opt/perfinsight/backend/uploads ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
sudo mount -a
```

#### Step 4 — Automated deploys with CodeDeploy (optional)

Create an `appspec.yml` at the project root for AWS CodeDeploy integration to enable CI/CD directly from GitHub Actions or CodePipeline.

---

### 4. AWS — ECS + Fargate (Containerized)

Best for teams already using AWS with auto-scaling requirements.

#### Step 1 — Push Docker images to ECR

```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name perfinsight-backend
aws ecr create-repository --repository-name perfinsight-frontend

# Build and push
docker build -t perfinsight-backend ./backend
docker tag perfinsight-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/perfinsight-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/perfinsight-backend:latest

docker build -t perfinsight-frontend ./frontend
docker tag perfinsight-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/perfinsight-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/perfinsight-frontend:latest
```

#### Step 2 — Create ECS Task Definition

```json
{
  "family": "perfinsight",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/perfinsight-backend:latest",
      "portMappings": [{ "containerPort": 3001 }],
      "environment": [
        { "name": "PORT", "value": "3001" },
        { "name": "DB_PATH", "value": "/mnt/data/perf_comparison.db" }
      ],
      "secrets": [
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:...:JWT_SECRET" },
        { "name": "AUTH_PASSWORD", "valueFrom": "arn:aws:secretsmanager:...:AUTH_PASSWORD" }
      ],
      "mountPoints": [{ "sourceVolume": "efs-data", "containerPath": "/mnt/data" }]
    },
    {
      "name": "frontend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/perfinsight-frontend:latest",
      "portMappings": [{ "containerPort": 80 }]
    }
  ]
}
```

#### Step 3 — Create EFS for SQLite persistence

```bash
# Create EFS file system
aws efs create-file-system --creation-token perfinsight-db

# Mount target in the same VPC/subnet as ECS
aws efs create-mount-target \
  --file-system-id <efs-id> \
  --subnet-id <subnet-id> \
  --security-groups <sg-id>
```

#### Step 4 — Deploy ECS Service

```bash
aws ecs create-service \
  --cluster perfinsight \
  --service-name perfinsight \
  --task-definition perfinsight:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<arn>,containerName=frontend,containerPort=80"
```

> **Note:** For production SQLite, use a single Fargate task with EFS to avoid concurrent writes. If you need multiple tasks, migrate to PostgreSQL.

---

### 5. Azure — App Service

#### Step 1 — Install Azure CLI and log in

```bash
brew install azure-cli   # macOS
az login
```

#### Step 2 — Create resources

```bash
RESOURCE_GROUP=perfinsight-rg
APP_NAME=perfinsight-app
LOCATION=eastus

az group create --name $RESOURCE_GROUP --location $LOCATION

az appservice plan create \
  --name perfinsight-plan \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan perfinsight-plan \
  --runtime "NODE:20-lts"
```

#### Step 3 — Configure App Settings

```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    PORT=8080 \
    JWT_SECRET="your-secret" \
    AUTH_PASSWORD="your-password" \
    DB_PATH="/home/data/perf_comparison.db" \
    UPLOAD_DIR="/home/uploads" \
    NODE_ENV="production"
```

#### Step 4 — Add persistent storage

```bash
az webapp config storage-account add \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --custom-id perfinsight-storage \
  --storage-type AzureFiles \
  --account-name <storage-account-name> \
  --share-name perfinsight-data \
  --mount-path /home/data
```

#### Step 5 — Deploy via ZIP

```bash
cd /opt/perfinsight
npm run build:backend && npm run build:frontend

# Copy frontend build to backend's static folder
mkdir -p backend/public
cp -r frontend/dist/* backend/public/

# Create deployment ZIP
zip -r deploy.zip backend/dist backend/node_modules backend/public backend/.env

az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path deploy.zip \
  --type zip
```

---

### 6. Google Cloud — Cloud Run

Fully managed, serverless container deployment.

#### Step 1 — Build and push to Artifact Registry

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1

# Create repositories
gcloud artifacts repositories create perfinsight \
  --repository-format=docker \
  --location=$REGION

# Build and push backend
gcloud builds submit ./backend \
  --tag $REGION-docker.pkg.dev/$PROJECT_ID/perfinsight/backend:latest

# Build and push frontend
gcloud builds submit ./frontend \
  --tag $REGION-docker.pkg.dev/$PROJECT_ID/perfinsight/frontend:latest
```

#### Step 2 — Create a Secret for JWT

```bash
echo -n "your-random-secret" | \
  gcloud secrets create jwt-secret --data-file=-
```

#### Step 3 — Deploy backend to Cloud Run

```bash
gcloud run deploy perfinsight-backend \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/perfinsight/backend:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars PORT=8080,DB_PATH=/mnt/data/perf.db \
  --set-secrets JWT_SECRET=jwt-secret:latest \
  --add-volume name=nfs-data,type=cloud-storage,bucket=perfinsight-data \
  --add-volume-mount volume=nfs-data,mount-path=/mnt/data \
  --min-instances 1
```

> Use `--min-instances 1` to avoid cold starts and prevent SQLite file locks.

#### Step 4 — Deploy frontend to Cloud Run

```bash
gcloud run deploy perfinsight-frontend \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/perfinsight/frontend:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars BACKEND_URL=https://perfinsight-backend-xxxx-uc.a.run.app
```

---

### 7. Kubernetes (Helm-ready)

For teams running Kubernetes (EKS, AKS, GKE, or self-managed).

#### Deployment manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: perfinsight-backend
spec:
  replicas: 1   # Keep at 1 for SQLite
  selector:
    matchLabels:
      app: perfinsight-backend
  template:
    metadata:
      labels:
        app: perfinsight-backend
    spec:
      containers:
        - name: backend
          image: your-registry/perfinsight-backend:latest
          ports:
            - containerPort: 3001
          env:
            - name: PORT
              value: "3001"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: perfinsight-secrets
                  key: jwt-secret
          volumeMounts:
            - name: data-volume
              mountPath: /app/data
            - name: uploads-volume
              mountPath: /app/uploads
      volumes:
        - name: data-volume
          persistentVolumeClaim:
            claimName: perfinsight-db-pvc
        - name: uploads-volume
          persistentVolumeClaim:
            claimName: perfinsight-uploads-pvc
```

#### Service and Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: perfinsight-backend
spec:
  selector:
    app: perfinsight-backend
  ports:
    - port: 3001
      targetPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: perfinsight-frontend
spec:
  selector:
    app: perfinsight-frontend
  ports:
    - port: 80
      targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: perfinsight-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: perfinsight.your-domain.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: perfinsight-backend
                port:
                  number: 3001
          - path: /
            pathType: Prefix
            backend:
              service:
                name: perfinsight-frontend
                port:
                  number: 80
```

```bash
# Apply
kubectl apply -f k8s/

# Create secret
kubectl create secret generic perfinsight-secrets \
  --from-literal=jwt-secret=your-secret \
  --from-literal=auth-password=your-password
```

---

## 🔐 Security Hardening for Production

| Action | Why |
|---|---|
| Change `JWT_SECRET` to a 64-char random string | Prevents token forgery |
| Change default admin password | Default is publicly known |
| Set `NODE_ENV=production` | Disables stack traces in error responses |
| Put backend behind Nginx with rate limiting | Prevents brute-force attacks |
| Enable HTTPS (TLS) | Encrypts auth tokens in transit |
| Restrict CORS to your frontend domain | Prevents cross-origin API abuse |
| Mount `uploads/` and `data/` on persistent storage | Survives container restarts |
| Rotate JWT secret periodically | Invalidates stolen tokens |

---

## 🛠 Troubleshooting

### "No transactions parsed" after upload

- Verify the file is CSV or XLSX and not empty.
- Open the file and check column headers — they must match the expected names (case-insensitive).
- JMeter raw JTL: ensure `label` and `elapsed` columns are present.
- Try saving as CSV from Excel before uploading.

### Login returns 401

- Confirm `AUTH_USERNAME` and `AUTH_PASSWORD` in `.env` match what you are entering.
- The database is seeded only on first start. If you changed the env after first start, delete `data/perf_comparison.db` and restart.

### Comparison shows 0 matched transactions

- Both test runs must belong to the same sub-project and have overlapping transaction names.
- Transaction names are case-sensitive.

### PDF looks garbled / missing characters

- This is expected for non-ASCII characters (arrows, em-dashes, bullets). The PDF generator normalizes them to ASCII equivalents automatically.

### Port conflict on startup

- Change `PORT` in `backend/.env` if port 3001/6001 is in use.
- Update `vite.config.ts` proxy target to match if you change the backend port.

### Uploads fail with "File too large"

- The default Multer limit is 50 MB.
- Increase `client_max_body_size` in Nginx and the Multer `limits.fileSize` option in `backend/src/middleware/upload.ts`.

### Sub-project shows no transactions in Trend Analysis

- At least one test run must be uploaded for the sub-project.
- If a transaction filter is active, the dropdown shows only filtered transactions. Clear the filter or add more transactions.
]]>
