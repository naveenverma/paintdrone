# Paintdrone: Complete Setup & Demo Guide

A professional 3D color editor and drone paint mission generator combining **Three.js 3D visualization** with **FastAPI backend** to convert color-mapped regions into drone flight plans.

## 🎯 Project Overview

**What it does:**
1. Load 3D models (GLB/GLTF format from Polycam or similar)
2. Assign paint colors to specific regions/meshes
3. Export missions in standardized drone formats:
   - **GeoJSON** (web-standard, portable)
   - **QGC Plan** (for QGroundControl mission planner)
   - **ArduPilot** compatible formats

**Perfect for:** Building painting, drone spraying operations, architectural visualization with drone control.

---

## 📋 Quick Start (5 minutes)

### Prerequisites
- Python 3.10+
- Node.js (optional, for better local server)
- Modern web browser (Chrome, Firefox, Edge)

### Step 1: Install Backend Dependencies

```bash
cd /home/naveen/www/paintdrone/backend
python3 -m venv .venv
```

**Linux/macOS:**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows:**
```bash
.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Start FastAPI Backend

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Expected output:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Test the API:
```bash
curl http://127.0.0.1:8000/health
```

### Step 3: Start Frontend Server

**Option A: Python (Simple)**
```bash
cd /home/naveen/www/paintdrone/frontend
python3 -m http.server 5500
```

**Option B: Node.js (Better)**
```bash
# If you have http-server installed
npx http-server -p 5500
```

### Step 4: Open Dashboard

Navigate to:
```
http://127.0.0.1:5500
```

You should see the Paintdrone dashboard with:
- Left panel: Color assignment controls
- Right panel: 3D model viewer (initially empty until model loads)

---

## 🚀 Using the Dashboard

### 1. Load Your Model
The demo automatically attempts to load `frontend/models/sample.glb`. To use your own:

1. Export your Polycam model as `.glb` format
2. Place it in `frontend/models/sample.glb` (or update `MODEL_URL` in `app.js`)
3. Refresh the page

### 2. Assign Colors to Regions

**Step A:** Select a color
- Click the color picker to choose a paint color

**Step B:** Enter region details
- **Region Name:** Give it a descriptive name (e.g., "Main Roof", "West Wall")
- **Target Mesh Name (optional):** If your model has named meshes, target specific ones

**Step C:** Add the region
- Click **Add Region** button
- The region is added to the paint mission

**Step D:** View in 3D
- The color is automatically applied to the 3D model
- Rotate/zoom with mouse to inspect

### 3. Export Drone Mission

1. **Select Export Format**
   - GeoJSON: Universal, web-friendly
   - QGC Plan: Use with QGroundControl mission planner
   - ArduPilot: Direct ArduPilot compatibility

2. **Click Export Mission**
   - A JSON file is automatically downloaded
   - File contains all regions with coordinates and colors

3. **Upload to Drone**
   - Use QGroundControl, Mission Planner, or custom script
   - The mission includes GPS coordinates, paint color, and coverage area

---

## 📊 API Reference

### Backend Endpoints

#### 1. **Health Check**
```bash
GET /health
```
Response:
```json
{
  "success": true,
  "message": "Paintdrone API is healthy",
  "timestamp": "2026-04-10T15:30:00Z",
  "stored_assignments": 3
}
```

#### 2. **Store Color Update**
```bash
POST /api/model/color

{
  "modelId": "paintdrone_demo_01",
  "meshName": "roof_section_a",
  "color": "#FF6B6B",
  "updatedAt": "2026-04-10T15:30:00Z"
}
```

#### 3. **Export as GeoJSON**
```bash
POST /api/export/geojson

{
  "mission_id": "paintdrone_demo_01",
  "regions": [
    {
      "region_id": "region_1",
      "region_name": "Main Building Roof",
      "color": "#FF6B6B",
      "coordinates": [[47.5, 12.9], [47.51, 12.9], ...],
      "coverage_required": true,
      "paint_type": "standard"
    }
  ],
  "export_format": "geojson"
}
```

**Response:** GeoJSON Feature Collection
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "region_id": "region_1",
        "color": "#FF6B6B",
        "paint_type": "standard"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[loc1], [loc2], ...]]
      }
    }
  ]
}
```

#### 4. **Export as QGC Plan**
```bash
POST /api/export/qgc-plan
```

**Response:** QGroundControl mission format
```json
{
  "FileType": "Plan",
  "Ground Control Station": "QGroundControl",
  "Mission": {
    "Waypoints": [
      {
        "name": "Main Building Roof",
        "coordinate": [12.9, 47.5, 20],
        "customData": {"color": "#FF6B6B", "paint_type": "standard"}
      }
    ]
  }
}
```

#### 5. **Get Stored Assignments**
```bash
GET /api/assignments
```

---

## 🗂️ Project Structure

```
paintdrone/
├── backend/
│   ├── main.py                  # FastAPI server with all endpoints
│   ├── requirements.txt          # Python dependencies
│   └── .venv/                    # Virtual environment (created on setup)
│
├── frontend/
│   ├── index.html               # Dashboard UI
│   ├── app.js                   # Three.js viewer + interaction logic
│   ├── style.css                # Modern styling
│   └── models/
│       └── sample.glb           # Your 3D model goes here
│
├── DRONE_FORMATS_RESEARCH.md    # Comprehensive formats research
├── README.md                     # Original documentation
└── .gitignore                    # Ignore venv, models, uploads
```

---

## 🔧 Advanced Configuration

### Custom Model URL
Edit `frontend/app.js`:
```javascript
const MODEL_URL = "./models/my-custom-model.glb";
```

### Change API Port
Edit `backend/main.py` and `frontend/app.js`:
```bash
# Backend
uvicorn main:app --port 8001

# Frontend
const API_URL = "http://127.0.0.1:8001/api/model/color";
```

### Add CORS for Remote Deployment
In `backend/main.py`:
```python
origins = [
    "http://your-domain.com",
    "https://your-domain.com",
]
```

### Store Data Persistently
Add this to `backend/main.py`:
```python
import json
from pathlib import Path

def save_assignments():
    Path("data").mkdir(exist_ok=True)
    with open("data/assignments.json", "w") as f:
        json.dump(color_assignments, f)

def load_assignments():
    global color_assignments
    if Path("data/assignments.json").exists():
        with open("data/assignments.json") as f:
            color_assignments = json.load(f)
```

---

## 📡 Integration with Real Drones

### QGroundControl + PX4

1. **Export mission** as QGC Plan format
2. Open **QGroundControl** mission planner
3. File → Load → select exported `.plan` file
4. Review waypoints and colors
5. Upload to drone
6. Drone executes paint spray at each waypoint

### ArduPilot + Mission Planner

1. Export as ArduPilot format
2. Open **Mission Planner**
3. Flight Plan → Load Waypoints
4. Use custom scripts to convert colors to PWM nozzle commands:

```python
# Example: ArduPilot spray command
mavlink_commands.do_set_servo(channel=5, pwm=1500)  # Nozzle on
# Fly to waypoint
mavlink_commands.do_set_servo(channel=5, pwm=1000)  # Nozzle off
```

### Custom Drone Controller

For proprietary systems:

1. **Export GeoJSON**
2. **Parse in your system:**
```python
import json
import geojson

with open("paintdrone_mission_01.geojson") as f:
    mission = geojson.load(f)

for feature in mission["features"]:
    region_name = feature["properties"]["region_name"]
    color = feature["properties"]["color"]
    coords = feature["geometry"]["coordinates"][0]
    
    # Send to your drone controller
    drone.paint_region(coords, color)
```

---

## 🐛 Troubleshooting

### "Model does not load"
- Check `frontend/models/sample.glb` exists
- Ensure frontend is served via HTTP (not `file://`)
- Check browser console (F12) for CORS errors

### "API request fails"
- Verify FastAPI is running: `curl http://127.0.0.1:8000/health`
- Check CORS origins in `backend/main.py`
- Verify frontend and backend ports match

### "No regions appear"
- Make sure to click **Add Region** (not just Apply Color)
- Check status output for warnings
- Inspect browser console (F12) for JavaScript errors

### "Export generates empty file"
- Add at least one region before exporting
- Verify backend is responding to export endpoint
- Check network tab in browser dev tools

---

## 📚 Resources & Formats

**Detailed Format Research:**  
See `DRONE_FORMATS_RESEARCH.md` for:
- PX4/ArduPilot MAVLink specification
- GeoJSON schema for paint regions
- KML/Shapefile alternatives
- Real-world agriculture examples

**Three.js Documentation:**
- https://threejs.org/docs/
- GLTFLoader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- OrbitControls: https://threejs.org/docs/#examples/en/controls/OrbitControls

**Drone Resources:**
- QGroundControl: http://community.px4.io/c/ground-control-software
- Mission Planner: https://ardupilot.org/planner/
- MAVLink Protocol: https://mavlink.io/

---

## 🎓 Next Steps

1. **Test with real model:** Export your Polycam aerial photo as GLB
2. **Refine regions:** Use canvas drawing tools for precise region selection
3. **Drone integration:** Deploy generated mission to your drone platform
4. **Scaling:** Add database for mission history and multi-user support
5. **Analytics:** Track paint coverage and drone telemetry

---

## 📝 License & Attribution

This project combines:
- **Polycam**: 3D model capture
- **Three.js**: 3D visualization
- **FastAPI**: Modern Python backend
- **QGroundControl/Mission Planner**: Drone mission planning

Created for architectural and precision agriculture applications.

---

**Last Updated:** April 10, 2026  
**Version:** 1.0.0
