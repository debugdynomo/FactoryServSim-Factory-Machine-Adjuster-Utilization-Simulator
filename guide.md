# 🏭 FactoryServSim — Full-Stack Team Development Guide

> **Factory Machine-Adjuster Utilization Simulator (Web Platform)**  
> A high-performance discrete-event simulation platform and interactive web application designed to evaluate machine/adjuster utilization and calculate the optimum number of factory adjusters.

- **Repository:** `https://github.com/debugdynomo/FactoryServSim-Factory-Machine-Adjuster-Utilization-Simulator.git`
- **Tech Stack:** Python 3.10+ (FastAPI Backend) + React 18 / Vite / Tailwind CSS / Recharts (Frontend)
- **Team Size:** 6 Members

---

## 📋 Table of Contents

1. [System Architecture & Full-Stack Tech Stack](#-system-architecture--full-stack-tech-stack)
2. [Repository Directory Structure](#-repository-directory-structure)
3. [Team Roles & 6-Way Equal Work Division](#-team-roles--6-way-equal-work-division)
4. [API & Data Exchange Contracts](#-api--data-exchange-contracts)
5. [Git Branching Strategy](#-git-branching-strategy)
6. [Git & GitHub Commands — Step-by-Step for Everyone](#-git--github-commands--step-by-step-for-everyone)
7. [Local Setup & Running Instructions](#-local-setup--running-instructions)
8. [Development Workflow & Integration Roadmap](#-development-workflow--integration-roadmap)
9. [Coding Standards & Best Practices](#-coding-standards--best-practices)
10. [Troubleshooting Common Git & Merge Issues](#-troubleshooting-common-git--merge-issues)

---

## 🛠 System Architecture & Full-Stack Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │             REACT FRONTEND (Vite + Tailwind)           │
   │  Configurator │ Live Floor & Queue │ Analytics / Recs │
   └───────────────────────────┬────────────────────────────┘
                               │ HTTP REST / WebSocket (SSE)
   ┌───────────────────────────▼────────────────────────────┐
   │               FASTAPI BACKEND (Python 3.10+)           │
   │  Endpoints / Validation │ DES Engine │ Optimization    │
   └────────────────────────────────────────────────────────┘
```

| Layer                  | Technologies & Libraries                                    | Responsibility                                                                          |
| ---------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Backend Framework**  | `FastAPI`, `Uvicorn`, `Pydantic v2`                         | High-speed asynchronous REST API, auto OpenAPI documentation, strict request validation |
| **Simulation & Math**  | Python stdlib (`heapq`, `dataclasses`, `random`), `numpy`   | Discrete Event Simulation (DES), MTTF uniform failure distributions, queue operations   |
| **Optimization Suite** | `numpy`, `scipy` (optional)                                 | Automated parameter sweep to determine the optimum number of adjusters                  |
| **Frontend Framework** | `React 18`, `Vite`, `TypeScript` / `JavaScript`             | Responsive Single Page Application (SPA)                                                |
| **Styling & Icons**    | `Tailwind CSS`, `Lucide React`                              | Modern industrial dashboard design                                                      |
| **Charts & Visuals**   | `Recharts` / `Chart.js`                                     | Interactive utilization curves, category breakdowns, wait time charts                   |
| **Testing & Tooling**  | `pytest`, `httpx` (Backend) / `vitest`, `ESLint` (Frontend) | Automated testing and linting                                                           |

---

## 📂 Repository Directory Structure

```
FactoryServSim-Factory-Machine-Adjuster-Utilization-Simulator/
│
├── README.md
├── guide.md                           # Team Development Guide (This file)
│
├── backend/                           # 🐍 PYTHON FASTAPI BACKEND
│   ├── requirements.txt
│   ├── main.py                        # FastAPI app entry point
│   ├── config/
│   │   └── default_factory.json       # Benchmark factory profiles
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/                       # 🟣 Purna - Person 3 (Routes & Controllers)
│   │   │   ├── __init__.py
│   │   │   ├── routes_simulation.py
│   │   │   ├── routes_optimizer.py
│   │   │   └── websocket_stream.py
│   │   │
│   │   ├── core/                      # 🟢 Akshara - Person 1 (Core DES Engine & Queue)
│   │   │   ├── __init__.py
│   │   │   ├── models.py              # Machine, Adjuster, Factory dataclasses
│   │   │   ├── event.py               # Event priority queue
│   │   │   ├── scheduler.py           # Min-heap event scheduler
│   │   │   ├── queue_manager.py       # Single-Queue & Service Manager
│   │   │   └── simulator.py           # DES execution loop
│   │   │
│   │   ├── services/                  # 🔵 Kiran - Person 2 (Math, Models & Optimizer)
│   │   │   ├── __init__.py
│   │   │   ├── failure_model.py       # Uniform MTTF failure generator
│   │   │   ├── repair_model.py        # Repair duration & transitions
│   │   │   ├── optimizer.py           # Parameter search for optimal adjusters
│   │   │   └── monte_carlo.py         # Multi-run aggregator
│   │   │
│   │   └── schemas/                   # 🟣 Purna - Person 3 / Shared
│   │       ├── __init__.py
│   │       └── payload.py             # Pydantic schemas (Config, Results)
│   │
│   └── tests/                         # Backend Unit & Integration Tests
│       ├── test_models_engine.py      # Akshara (Person 1) tests
│       ├── test_optimizer.py          # Kiran (Person 2) tests
│       └── test_api.py                # Purna (Person 3) tests
│
└── frontend/                          # ⚛️ REACT + VITE + TAILWIND FRONTEND
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── api/                       # Axios/Fetch API client functions
        │   └── simulationApi.js
        │
        ├── components/
        │   ├── configurator/          # 🟠 Prathik - Person 4 (Factory Setup & Presets)
        │   │   ├── CategoryForm.jsx
        │   │   ├── AdjusterForm.jsx
        │   │   ├── PresetSelector.jsx
        │   │   └── ConfigSummary.jsx
        │   │
        │   ├── floor_visualizer/      # 🟡 Sravan - Person 5 (Interactive Queue & Floor)
        │   │   ├── FactoryFloorGrid.jsx
        │   │   ├── MachineCard.jsx
        │   │   ├── SingleQueueBar.jsx # Visual invariant indicator
        │   │   └── PlaybackControls.jsx
        │   │
        │   └── analytics/             # 🔴 Vishnu - Person 6 (Charts, Dashboards & Report)
        │       ├── UtilizationCharts.jsx
        │       ├── CategoryBreakdown.jsx
        │       ├── OptimumRecommendation.jsx
        │       └── ExportPanel.jsx
        │
        └── types/ or utils/
```

---

## 👥 Team Roles & 6-Way Equal Work Division

The project is structured into **3 Backend Roles** and **3 Frontend Roles**, guaranteeing equal workload, distinct technical scope, and minimal merge conflicts.

---

### 🟢 Akshara — Core Simulation Engine & Single-Queue Architecture (Backend / Person 1)

- **Module:** `backend/app/core/`
- **Git Branch:** `feature/backend-engine`
- **Responsibilities:**
  1. **Data Models (`models.py`):** Define `MachineCategory`, `Machine` (states: `RUNNING`, `WAITING_FOR_REPAIR`, `UNDER_REPAIR`), `Adjuster` (states: `IDLE`, `BUSY`), and `Factory`.
  2. **Discrete Event Scheduler (`event.py`, `scheduler.py`):** Implement event priority queue using `heapq` sorted chronologically by timestamp.
  3. **Queue & Service Manager (`queue_manager.py`):**
     - Maintain the **Single-Queue Invariant**: at any point, either the machine repair queue is empty OR the idle adjuster queue is empty.
     - Match adjusters to machines according to expertise tags.
     - Handle FIFO queue transitions when new machines fail or repairs conclude.
  4. **Simulation Loop (`simulator.py`):** Execute event-step advancement, coordinate state shifts, and return raw execution metrics.
- **Your Tests:** `backend/tests/test_models_engine.py` (verify queue invariant, priority sorting, adjuster assignment).

---

### 🔵 Kiran — Stochastic Modeling, Failure Dynamics & Staffing Optimizer (Backend / Person 2)

- **Module:** `backend/app/services/`
- **Git Branch:** `feature/backend-optimizer`
- **Responsibilities:**
  1. **Stochastic Generators (`failure_model.py`, `repair_model.py`):**
     - Uniform distribution generator: continuous failure uniformly distributed around MTTF ($U(0, 2 \times \text{MTTF})$).
     - Repair time generator based on machine category parameters.
  2. **Monte Carlo Multi-Run Engine (`monte_carlo.py`):** Run multiple simulation seeds and compute statistical means and confidence intervals.
  3. **Staffing Optimizer Algorithm (`optimizer.py`):**
     - Automatically simulate across different adjuster counts (e.g., from 1 to $N$).
     - Calculate the "elbow point" or optimum staffing where machine downtime cost balances adjuster idle time.
     - Return recommended adjuster team size with comparative efficiency metrics.
- **Your Tests:** `backend/tests/test_optimizer.py` (verify stochastic distribution means, optimizer convergence).

---

### 🟣 Purna — FastAPI REST Services, Streaming & Data Validation (Backend / Person 3)

- **Module:** `backend/app/api/` & `backend/app/schemas/`
- **Git Branch:** `feature/backend-api`
- **Responsibilities:**
  1. **Data Contracts & Validation (`schemas/payload.py`):** Pydantic schemas for `FactoryConfigInput`, `SimulationResultOutput`, and `OptimizationResultOutput`.
  2. **REST Endpoints (`routes_simulation.py`, `routes_optimizer.py`):**
     - `POST /api/simulation/run`: synchronous full simulation execution.
     - `POST /api/simulation/optimize`: trigger multi-variable staffing optimization.
     - `GET /api/simulation/presets`: fetch pre-built industry benchmarks.
  3. **Real-time Streaming (`websocket_stream.py` or Server-Sent Events):** Stream step-by-step ticks/progress for live visualization on the frontend.
  4. **Server Initialization (`main.py`):** Setup CORS middleware for frontend communication, error handlers, and Swagger `/docs` documentation.
- **Your Tests:** `backend/tests/test_api.py` (endpoint HTTP status codes, schema validation errors, streaming endpoint).

---

### 🟠 Prathik — UI Shell, Factory Configurator & Preset Manager (Frontend / Person 4)

- **Module:** `frontend/src/components/configurator/`
- **Git Branch:** `feature/frontend-config`
- **Responsibilities:**
  1. **Vite + Tailwind CSS Project Setup:** Establish layout, navigation headers, color themes, and responsive design container.
  2. **Interactive Factory Configurator Form (`CategoryForm.jsx`, `AdjusterForm.jsx`):**
     - Add, modify, and delete machine categories (Name, Count, MTTF, Repair Time).
     - Add and manage adjusters with multi-select tags for category expertise.
     - Client-side validation (non-negative counts, positive MTTF).
  3. **Preset Management (`PresetSelector.jsx`):** Quick-load templates (e.g., "Automotive Plant: 200 Lathes, 50 Turning, 80 Drilling, 30 Soldering").
  4. **State Management & API Integration:** Sync form state and trigger simulation payloads to Purna's (Person 3) backend.
- **Your Tests:** Component rendering, input validation, and preset selection logic.

---

### 🟡 Sravan — Interactive Factory Floor & Single-Queue Visualizer (Frontend / Person 5)

- **Module:** `frontend/src/components/floor_visualizer/`
- **Git Branch:** `feature/frontend-visualizer`
- **Responsibilities:**
  1. **Factory Floor Grid (`FactoryFloorGrid.jsx`, `MachineCard.jsx`):**
     - Visual grid displaying machines color-coded by state:
       - 🟢 Running (Active)
       - 🟡 Waiting for Adjuster (In Queue)
       - 🔵 Under Repair (with active adjuster badge)
  2. **Single-Queue Dynamic Indicator (`SingleQueueBar.jsx`):**
     - Prominently visualize the key problem requirement: **at any time, only ONE queue is non-empty**.
     - Animate either the "Inoperative Machines Queue" or "Idle Adjusters Queue".
  3. **Playback & Simulation Controls (`PlaybackControls.jsx`):**
     - Play, Pause, Speed Slider ($1\times, 5\times, 20\times$), Step-by-Step button, and Reset.
     - Bind to WebSocket / SSE stream from Purna (Person 3) or play back recorded simulation frames.
- **Your Tests:** Queue animation state checks, playback control state handlers.

---

### 🔴 Vishnu — Analytics Dashboard & Staffing Recommendation Engine (Frontend / Person 6)

- **Module:** `frontend/src/components/analytics/`
- **Git Branch:** `feature/frontend-analytics`
- **Responsibilities:**
  1. **Key Performance Indicators (KPIs):** Metric cards displaying Overall Machine Utilization %, Overall Adjuster Utilization %, and Average Queue Wait Time.
  2. **Interactive Visualizations (`UtilizationCharts.jsx`, `CategoryBreakdown.jsx`):**
     - Line chart: Machine Utilization vs. Number of Adjusters.
     - Line chart: Adjuster Utilization vs. Number of Adjusters.
     - Category breakdown bar charts comparing uptime across Lathes, Turning, Drilling, Soldering, etc.
  3. **Optimization View (`OptimumRecommendation.jsx`):** Visual display highlighting the **recommended optimum number of adjusters**, balancing idle costs vs. machine downtime.
  4. **Data Export (`ExportPanel.jsx`):** Export results as CSV/JSON or formatted printable summary report.
- **Your Tests:** Chart data mapping checks, metric calculation display formatters.

---

## 📡 API & Data Exchange Contracts

To enable parallel development without waiting on each other, both backend and frontend will adhere to the following JSON schemas.

### 1. Factory Configuration Request (`POST /api/simulation/run`)

```json
{
  "simulation_time": 10000,
  "machine_categories": [
    { "name": "Lathe", "count": 200, "mttf": 100, "mean_repair_time": 10 },
    { "name": "Turning", "count": 50, "mttf": 150, "mean_repair_time": 12 },
    { "name": "Drilling", "count": 80, "mttf": 80, "mean_repair_time": 8 },
    { "name": "Soldering", "count": 30, "mttf": 200, "mean_repair_time": 15 }
  ],
  "adjusters": [
    { "id": 1, "name": "Adjuster 1", "expertise": ["Lathe", "Turning"] },
    { "id": 2, "name": "Adjuster 2", "expertise": ["Drilling", "Soldering"] },
    {
      "id": 3,
      "name": "Adjuster 3",
      "expertise": ["Lathe", "Drilling", "Turning"]
    }
  ]
}
```

### 2. Simulation Results Response

```json
{
  "summary": {
    "total_simulation_time": 10000,
    "overall_machine_utilization_pct": 88.42,
    "overall_adjuster_utilization_pct": 93.15,
    "avg_queue_wait_time": 3.84,
    "total_failures_handled": 12430
  },
  "category_metrics": [
    { "category": "Lathe", "utilization_pct": 87.1, "total_failures": 7200 },
    { "category": "Turning", "utilization_pct": 91.5, "total_failures": 1410 }
  ],
  "adjuster_metrics": [
    {
      "id": 1,
      "name": "Adjuster 1",
      "busy_time_pct": 94.2,
      "repairs_completed": 4210
    },
    {
      "id": 2,
      "name": "Adjuster 2",
      "busy_time_pct": 92.1,
      "repairs_completed": 3980
    }
  ]
}
```

### 3. Optimizer Request & Response (`POST /api/simulation/optimize`)

```json
// Response:
{
  "optimum_adjuster_count": 6,
  "tradeoff_curve": [
    {
      "adjuster_count": 2,
      "machine_utilization": 64.2,
      "adjuster_utilization": 99.8
    },
    {
      "adjuster_count": 4,
      "machine_utilization": 83.5,
      "adjuster_utilization": 94.2
    },
    {
      "adjuster_count": 6,
      "machine_utilization": 93.8,
      "adjuster_utilization": 82.1
    },
    {
      "adjuster_count": 8,
      "machine_utilization": 95.1,
      "adjuster_utilization": 64.0
    }
  ],
  "recommendation_reason": "6 adjusters provides 93.8% machine uptime. Adding 2 more adjusters yields only +1.3% uptime at 64% worker utilization."
}
```

---

## 🌿 Git Branching Strategy

We follow the standard Git Flow model with an integration branch (`dev`):

```
main (Production-ready releases only)
 └── dev (Integration branch — all features merge here via PR)
      │
      ├── feature/backend-engine       (Akshara - Person 1)
      ├── feature/backend-optimizer    (Kiran - Person 2)
      ├── feature/backend-api          (Purna - Person 3)
      ├── feature/frontend-config      (Prathik - Person 4)
      ├── feature/frontend-visualizer  (Sravan - Person 5)
      └── feature/frontend-analytics   (Vishnu - Person 6)
```

### Golden Rules:

1. **Never commit directly to `main` or `dev`.**
2. **Always branch off up-to-date `dev`.**
3. Create a GitHub **Pull Request (PR)** targeting `dev` when your feature is completed.
4. Each PR requires review and approval from the Team Lead or designated peer.

---

## 💻 Git & GitHub Commands — Step-by-Step for Everyone

### Step 1: Initial Clone and Branch Checkout (All Members)

```bash
# Clone the repository
git clone https://github.com/debugdynomo/FactoryServSim-Factory-Machine-Adjuster-Utilization-Simulator.git

# Enter repository root
cd FactoryServSim-Factory-Machine-Adjuster-Utilization-Simulator

# Configure your Git identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Fetch all remote branches and checkout dev
git fetch origin
git checkout dev
git pull origin dev
```

---

### Step 2: Create Your Dedicated Feature Branch

Execute only the command corresponding to your assigned role:

```bash
# Akshara (Person 1):
git checkout -b feature/backend-engine
git push -u origin feature/backend-engine

# Kiran (Person 2):
git checkout -b feature/backend-optimizer
git push -u origin feature/backend-optimizer

# Purna (Person 3):
git checkout -b feature/backend-api
git push -u origin feature/backend-api

# Prathik (Person 4):
git checkout -b feature/frontend-config
git push -u origin feature/frontend-config

# Sravan (Person 5):
git checkout -b feature/frontend-visualizer
git push -u origin feature/frontend-visualizer

# Vishnu (Person 6):
git checkout -b feature/frontend-analytics
git push -u origin feature/frontend-analytics
```

---

### Step 3: Daily Coding and Commit Routine

```bash
# 1. Switch to your feature branch
git checkout feature/<your-branch-name>

# 2. Sync with dev to ensure you have the latest team updates
git pull origin dev

# 3. Work on your assigned files...

# 4. Check modified files
git status

# 5. Stage your changes
git add backend/app/core/queue_manager.py  # (or specific files)

# 6. Commit with conventional commit messages
git commit -m "feat(core): implement single-queue invariant validation"

# 7. Push progress to GitHub
git push origin feature/<your-branch-name>
```

#### Commit Message Format

```
feat(<module>): description of new functionality
fix(<module>): description of bug fix
test(<module>): addition of unit tests
docs(<module>): updates to documentation or guides
style(<module>): formatting, linting, or UI styling
```

---

### Step 4: Submitting a Pull Request (PR)

1. Make sure your local branch is fully pushed to GitHub.
2. Open the repository on GitHub:  
   `https://github.com/debugdynomo/FactoryServSim-Factory-Machine-Adjuster-Utilization-Simulator`
3. Click on the **Pull requests** tab → **New pull request**.
4. Set **Base:** `dev` $\leftarrow$ **Compare:** `feature/<your-branch-name>` _(Never base into `main` directly!)_
5. Fill in the PR template:
   - Summary of changes implemented
   - Components/tests added
   - Screenshots (for Frontend roles)
6. Add Team Lead (`@debugdynomo`) as a reviewer.

---

### Step 5: Syncing When Teammates' Code Merges into `dev`

```bash
# Ensure you are on your working branch
git checkout feature/<your-branch-name>

# Pull latest changes from dev
git pull origin dev

# If merge conflicts occur:
# 1. Open conflicted files in VS Code / IDE.
# 2. Inspect <<<<<<< HEAD vs >>>>>>> origin/dev blocks.
# 3. Resolve conflict, save file.
# 4. Stage and commit:
git add <conflicted-file>
git commit -m "merge: resolve conflicts with dev"
git push origin feature/<your-branch-name>
```

---

## 🚀 Local Setup & Running Instructions

### Backend Setup (Python 3.10+)

```bash
# From repository root
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server with auto-reload
uvicorn main:app --reload --port 8000
```

- API Docs (Swagger UI): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

---

### Frontend Setup (Node.js 18+)

```bash
# In a separate terminal, from repository root
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```

- Web Application: `http://localhost:5173`

---

## 🗓 Development Workflow & Integration Roadmap

### Phase 1: Foundation & Contracts (Days 1–4)

- **Akshara (Person 1):** Build core dataclasses (`Machine`, `Adjuster`) and min-heap DES event loop.
- **Kiran (Person 2):** Implement uniform MTTF distribution logic and repair timing.
- **Purna (Person 3):** Scaffold FastAPI application, CORS setup, and Pydantic request/response schemas.
- **Prathik (Person 4):** Initialize Vite + Tailwind project; create layout shell and category input forms.
- **Sravan (Person 5):** Build machine card components and visual factory grid layout with mock data.
- **Vishnu (Person 6):** Build analytics dashboard skeleton with mock utilization line and bar charts.

### Phase 2: Core Logic & Wiring (Days 5–9)

- **Akshara (Person 1):** Implement `queue_manager.py` (enforce single-queue invariant and expertise matching).
- **Kiran (Person 2):** Build multi-run simulator and automated adjuster optimizer sweep.
- **Purna (Person 3):** Connect simulation engine to `POST /api/simulation/run` and `POST /api/simulation/optimize`.
- **Prathik (Person 4):** Hook Configurator form submission to backend API.
- **Sravan (Person 5):** Implement single-queue visualizer and connect playback controls.
- **Vishnu (Person 6):** Bind backend calculation outputs to interactive Recharts graphs.

### Phase 3: Live Integration & Optimization (Days 10–13)

- Wire WebSocket or polling stream for step-by-step factory floor animation.
- End-to-end testing with realistic factory sizes (e.g., 200 Lathes, 50 Turning machines).
- Validate staffing optimization curves and verify accuracy against mathematical expectations.

### Phase 4: Polish, Testing & Deployment (Days 14–16)

- Run `pytest` across all backend modules and verify 90%+ test coverage.
- UI styling refinement, tooltips, responsive mobile/tablet layout.
- Team Lead reviews final `dev` branch and merges into `main` for release.

---

## 📏 Coding Standards & Best Practices

1. **Strict Type Annotations (Python):** Use type hints in all backend signatures:
   ```python
   def calculate_uptime_ratio(running_time: float, total_time: float) -> float:
       return (running_time / total_time) * 100.0 if total_time > 0 else 0.0
   ```
2. **Pydantic Validation:** Never parse raw JSON manually; always validate through Pydantic models.
3. **Clean Component Architecture (React):** Keep components modular. Separate data fetching from UI presentation.
4. **No Direct DOM Manipulation:** Use React state hooks (`useState`, `useReducer`, `useMemo`) for animation and rendering.
5. **No Hardcoded Secrets or URLs:** Use `.env` or centralized API configuration files (`VITE_API_URL=http://localhost:8000`).

---

## 🚑 Troubleshooting Common Git & Merge Issues

| Scenario                                      | Recommended Fix                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Committed directly to `dev` by accident**   | `git reset --soft HEAD~1`<br>`git checkout -b feature/<your-branch>`<br>`git commit -m "feat: commit on correct branch"` |
| **Pushed wrong branch to remote**             | Switch to your proper branch and push: `git push -u origin feature/<branch>`                                             |
| **Local branch out of date with `dev`**       | `git checkout feature/<your-branch>`<br>`git pull origin dev`                                                            |
| **Need to discard local uncommitted changes** | `git stash` (to save temporarily) or `git checkout -- .` (to discard)                                                    |
| **Port 8000 or 5173 already in use**          | Kill existing process or specify custom port: `uvicorn main:app --port 8001` or `npm run dev -- --port 3000`             |

---

> **FactoryServSim Engineering Team**  
> Maintained by Vishnu Teja (`@debugdynomo`)
