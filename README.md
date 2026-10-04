# 🏭 FactoryServSim — Factory Machine-Adjuster Utilization Simulator

> A high-performance discrete-event simulation platform and interactive web application designed to evaluate machine/adjuster utilization and calculate the optimum number of factory adjusters.

---

## 👥 Team Members & Role Division

The project workload is equally divided across 6 dedicated roles (3 Backend & 3 Frontend):

| Member | Role | Module / Area | Dedicated Branch | Core Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Akshara** | **Person 1** | `backend/app/core/` | `feature/backend-engine` | Core DES engine, event min-heap scheduler, Single-Queue invariant management, machine & adjuster state machines. |
| **Kiran** | **Person 2** | `backend/app/services/` | `feature/backend-optimizer` | Stochastic failure generators (uniform MTTF), repair models, Monte Carlo multi-run simulations, staffing optimization algorithm. |
| **Purna** | **Person 3** | `backend/app/api/` & `backend/app/schemas/` | `feature/backend-api` | FastAPI REST endpoints, Pydantic v2 schemas/validation, WebSocket real-time progress streaming, CORS middleware & OpenAPI docs. |
| **Prathik** | **Person 4** | `frontend/src/components/configurator/` | `feature/frontend-config` | UI shell & design system, interactive factory configurator form, machine category & adjuster management, preset templates. |
| **Sravan** | **Person 5** | `frontend/src/components/floor_visualizer/` | `feature/frontend-visualizer` | Interactive factory floor grid, color-coded machine cards, Single-Queue dynamic invariant visualizer, playback controls. |
| **Vishnu** | **Person 6** | `frontend/src/components/analytics/` | `feature/frontend-analytics` | Real-time KPI metric cards, utilization trade-off charts, category breakdown graphs, staffing recommendations, CSV/JSON export panel. |

---

## 🛠️ System Architecture

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

| Layer | Technologies | Responsibilities |
| :--- | :--- | :--- |
| **Backend Framework** | `FastAPI`, `Uvicorn`, `Pydantic v2` | High-speed asynchronous REST API, OpenAPI docs, validation |
| **Simulation & Math** | Python stdlib (`heapq`, `dataclasses`, `random`), `numpy` | Discrete Event Simulation (DES), MTTF failure distributions, queue operations |
| **Optimization Suite** | `numpy`, `scipy` | Automated parameter sweep to determine optimum number of adjusters |
| **Frontend Framework** | `React 18`, `Vite`, `JavaScript` | Single Page Application (SPA), state management |
| **Styling & UI** | `Tailwind CSS`, `Lucide React` | Industrial dashboard design, responsive layout |
| **Charts & Visuals** | `Recharts` | Interactive utilization curves, category breakdowns, wait time charts |
| **Testing** | `pytest`, `httpx` (Backend) / `vitest` (Frontend) | Automated testing and verification |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

- **Swagger API Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

---

### Frontend Setup

```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- **Web Application:** `http://localhost:5173`

---

## 📖 Detailed Team Guide & Workflows

For detailed branch management, daily git commands, coding standards, and integration roadmaps, please refer to:
👉 [**guide.md**](guide.md)
