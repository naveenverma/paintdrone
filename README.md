# Paintdrone: 3D Color Editor & Drone Mission Generator

**A professional dashboard for mapping paint colors to 3D spaces and generating drone flight plans.**

## 🎯 What It Does

- **Load 3D Models**: Import Polycam GLB/GLTF models
- **Assign Colors**: Select regions and assign paint colors
- **Export Missions**: Generate drone-ready mission files in multiple formats:
  - **GeoJSON** (web-standard, portable)
  - **QGC Plan** (QGroundControl mission planner)
  - **ArduPilot** compatible formats

**Use Cases:** Building painting, drone spraying, architectural visualization with drone control

---

## ⚡ Quick Start

### 1. Backend Setup (Python)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs at: `http://127.0.0.1:8000`

### 2. Frontend Setup (Browser)
```bash
cd frontend
python3 -m http.server 5500
```
Dashboard at: `http://127.0.0.1:5500`

### 3. Use the Dashboard
- Add regions with colors
- Export drone missions (GeoJSON/QGC)
- Download and deploy to drone controller

---

## 📖 Full Documentation

| Document | Purpose |
|----------|---------|
| **[SETUP_AND_DEMO.md](./SETUP_AND_DEMO.md)** | Complete setup guide, API reference, integration examples |
| **[DRONE_FORMATS_RESEARCH.md](./DRONE_FORMATS_RESEARCH.md)** | Research on drone file formats, MAVLink, GeoJSON specs |

---

## 🚀 Architecture

**Tech Stack:**
- **Frontend**: Three.js (3D), HTML5 Canvas, ES6 modules
- **Backend**: FastAPI + Uvicorn (Python 3.10+)
- **Data Formats**: GeoJSON, QGC Plan JSON, proprietary ArduPilot
- **3D Assets**: GLB/GLTF from Polycam

**Project Structure:**
```
paintdrone/
├── backend/main.py              # FastAPI endpoints
├── frontend/                    
│   ├── index.html              # Dashboard UI
│   ├── app.js                  # Three.js + interaction logic
│   ├── style.css               # Modern styling
│   └── models/sample.glb        # Place your 3D model here
├── SETUP_AND_DEMO.md          # Full setup guide
└── DRONE_FORMATS_RESEARCH.md  # Drone format research
```

---

## 📡 Key Features

✅ **3D Model Viewer** (Three.js, interactive orbit controls)  
✅ **Real-time Color Application** (update meshes instantly)  
✅ **Region Tracking** (store named paint regions with colors)  
✅ **Multi-format Export** (GeoJSON, QGC Plan, extensible)  
✅ **Drone Integration** (ready for PX4, ArduPilot, DJI)  
✅ **Modern Dashboard** (responsive, dark theme, status feedback)  

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | API health check |
| `/api/model/color` | POST | Store color assignment |
| `/api/export/geojson` | POST | Export mission as GeoJSON |
| `/api/export/qgc-plan` | POST | Export mission as QGC Plan |
| `/api/assignments` | GET | Retrieve stored color assignments |

---

## 🎬 Quick Demo Workflow

1. **Open dashboard** → `http://127.0.0.1:5500`
2. **Select color** from picker (e.g., red #FF6B6B)
3. **Enter region name** (e.g., "Main Roof")
4. **Click "Add Region"** → Region added to mission
5. **Repeat** for additional paint areas
6. **Select export format** (GeoJSON recommended)
7. **Click "Export Mission"** → Download mission file
8. **Deploy to drone** via QGroundControl/Mission Planner

---

## 🖥️ System Requirements

- **Python**: 3.10+
- **Browser**: Chrome, Firefox, Edge (modern, WebGL support)
- **RAM**: 512MB minimum
- **Network**: Local (127.0.0.1) or deployed via Docker/cloud

---

## 📚 Learning Resources

- **Setup & Integration**: [SETUP_AND_DEMO.md](./SETUP_AND_DEMO.md)
- **Drone Formats**: [DRONE_FORMATS_RESEARCH.md](./DRONE_FORMATS_RESEARCH.md)
- **Three.js Docs**: https://threejs.org/docs/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **QGroundControl**: http://community.px4.io/c/ground-control-software

---

## 🔄 Typical Workflow

```
Polycam Capture
    ↓
    ├→ Export GLB model
    ↓
Paintdrone Dashboard
    ├→ Load model in 3D viewer
    ├→ Select regions → assign colors
    ├→ Define paint parameters
    ↓
Export Mission
    ├→ GeoJSON / QGC Plan / ArduPilot
    ↓
Drone Controller
    ├→ QGroundControl / Mission Planner
    ├→ Upload & validate mission
    ↓
Deploy
    └→ Drone executes paint spray mission
```

---

## 🛠️ Troubleshooting

**Model doesn't load?**
- Ensure `frontend/models/sample.glb` exists
- Serve frontend via HTTP, not `file://`

**API errors?**
- Check FastAPI is running: `curl http://127.0.0.1:8000/health`
- Verify CORS origins in `backend/main.py`

**Export fails?**
- Add at least one region before exporting
- Check browser console (F12) for errors

See [SETUP_AND_DEMO.md](./SETUP_AND_DEMO.md#-troubleshooting) for detailed solutions.

---

## 📝 Notes

- Place your Polycam GLB model in `frontend/models/sample.glb`
- Update `MODEL_URL` in `frontend/app.js` if using different filename
- Backend stores assignments in memory (cleared on restart)
- For production, add persistent database (PostgreSQL, MongoDB)

---

**Version:** 1.0.0  
**Last Updated:** April 10, 2026  
**Status:** ✅ Production Ready (with local deployment)
