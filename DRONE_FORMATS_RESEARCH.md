# Drone Painting & Nozzle Control: File Format Requirements

**Research Date**: April 2026  
**Purpose**: Comprehensive analysis of file formats for color-to-drone-control pipelines

---

## Executive Summary

For a **2D color analysis dashboard → 3D drone paint control** pipeline, the optimal path requires:
1. **Image → Geospatial conversion** (GeoJSON or GeoTIFF)
2. **Mission planning layer** (QGC Plan or custom MAVLink)
3. **Nozzle control parameters** (custom extension or ArduPilot spray plugin)

---

## 1. Format Comparison Table

| **Format Name** | **Best For** | **Complexity** | **Drone Support** | **Extension** | **Key Structure** |
|---|---|---|---|---|---|
| **QGC Plan** | PX4 waypoint missions | Low-Medium | PX4, ArduPilot | `.plan` | JSON: waypoints array with lat/lon/alt |
| **WPL (Waypoint List)** | PX4 binary missions | Low | PX4 primarily | `.wpl` | Binary: command list with parameters |
| **ArduPilot MAVLink** | ArduPilot waypoints | Medium | ArduPilot, PX4 | mission data | Binary protocol: command/param tuples |
| **ArduPilot Spray Mission** | Precision agriculture | Medium-High | ArduPilot ServoX | `.mavdata` | Extended MAVLink: spray on/off commands |
| **GeoJSON** | Geospatial boundaries | Low | All via conversion | `.geojson` | JSON: Feature collection with polygons |
| **Shapefile** | GIS integration | High | GIS tools (conversion needed) | `.shp, .shx, .dbf` | Binary: geometry + attribute tables |
| **KML/KMZ** | Google Earth, mapping | Low-Medium | Web tools | `.kml, .kmz` | XML: placemarks, coordinates, properties |
| **GeoTIFF** | Raster imagery mapping | Medium | Ortho reference | `.tiff` | Binary GeoTIFF: pixel grid with georeference |
| **Custom Grid Format** | Regular spray patterns | Low | Application-specific | `.grid` | Text/JSON: origin, spacing, dimensions, pattern |
| **DJI Waypoint** | DJI drones | Medium | DJI Fleet API | `.kmz` | JSON inside KMZ: DJI-specific mission format |

---

## 2. Drone Paint/Nozzle Software Standards

### 2.1 **PX4 Autopilot**
- **Mission Format**: WPL (binary) or QGC Plan (JSON)
- **Nozzle Support**: Via MAV_CMD_DO_SET_SERVO (generic servo control)
- **Payload Integration**: Custom companion computer via MAVLink
- **Relevant Commands**:
  ```
  MAV_CMD_DO_SET_SERVO - Control servo position (0-2000µs)
  MAV_CMD_DO_REPEAT_SERVO - Pulsed nozzle control
  MAV_CMD_DO_SET_PARAMETER - Runtime parameter tuning
  ```
- **Best For**: Open-source, research drones, industrial applications

### 2.2 **ArduPilot Autopilot**
- **Mission Format**: Waypoint files (MAVLink protocol) with extensions
- **Spray Plugin**: SPRAYER_PUMP_X (channels dedicated to spray)
  - `SPRAY_ENABLE` parameter: Armed/disarmed spray
  - `SPRAY_PUMP_RATE`: Flow rate (L/min)
  - `SPRAY_SPEED_MIN`: Minimum flight speed to spray
- **Files Used**: `.waypoint` or MAVLink telemetry
- **Best For**: Precision agriculture, mapping, cost-effective solutions
- **Example Parameters**:
  ```
  WP 1: MAV_CMD_WAYPOINT (lat, lon, alt)
  WP 2: MAV_CMD_DO_SET_SERVO (channel, PWM)
  WP 3: MAV_CMD_DO_JUMP (repeat loop)
  ```

### 2.3 **DJI FlightController SDK**
- **Mission Format**: Waypoint Mission XML (KMZ wrapper)
- **Paint/Spray**: Via custom payload connector (industrial drones)
- **SDK Languages**: Java, C++, Python bindings
- **Workflow**:
  1. Define waypoints in DJI FlightController
  2. Attach payload actions (open nozzle, spray duration)
  3. Deploy via DJI FleetController API
- **Best For**: Enterprise drones (M300 RTK, M350 RTK), commercial scaling
- **Sample Payload Command**:
  ```json
  {
    "action": "custom_payload",
    "interval_ms": 100,
    "value": {"nozzle": "on", "rate_ml_s": 10}
  }
  ```

### 2.4 **Open-Source Drone Software (Painting-Capable)**

| **Software** | **Core** | **Spray Support** | **Best Use** |
|---|---|---|---|
| **QGroundControl** | PX4 + ArduPilot mission planner | Via survey grid + servo mapping | UI for mission design + nozzle control |
| **DroneKit-Python** | MAVLink abstraction | Custom scripts for spray sequences | Automation + programmatic control |
| **Mission Planner** | ArduPilot focus | Native spray mission creation | Windows GUI for precision agriculture |
| **Tower** | Android/iOS frontend | MAVLink pass-through | Mobile mission planning |
| **Ardupilot-Spray-Extension** | ArduPilot community | Full spray plugin support | Turnkey spray missions |

---

## 3. Geospatial Data Formats

### 3.1 **GeoJSON** (Recommended for Web Integration)
- **Structure**: JSON Feature Collection
- **Use Case**: Polygon-based paint regions, waypoint conversion
- **Advantages**: Web-native, easy to parse, human-readable
- **Example**:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "region_id": "roof_section_a",
        "color": "#FF5733",
        "paint_type": "exterior_acrylic",
        "coverage_required": true
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [[12.9, 47.5], [13.0, 47.5], [13.0, 47.6], [12.9, 47.6], [12.9, 47.5]]
        ]
      }
    }
  ]
}
```

### 3.2 **Shapefile** (GIS Standard)
- **Format**: Binary with 3-4 companion files (.shp, .shx, .dbf, .prj)
- **Complexity**: High (requires GDAL/Fiona libraries)
- **Best For**: GIS professional workflows, integration with ArcGIS
- **Limitations**: File size overhead, not web-friendly

### 3.3 **KML/KMZ** (Google Earth Compatible)
- **Structure**: XML inside optional ZIP
- **Best For**: Multi-tool compatibility, visual inspection in Google Earth
- **Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Paint Mission</name>
    <Placemark>
      <name>Building Roof Section</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              12.9,47.5,0 13.0,47.5,0 13.0,47.6,0 12.9,47.6,0 12.9,47.5,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
      <ExtendedData>
        <Data name="color"><value>#FF5733</value></Data>
        <Data name="nozzle_type"><value>spray</value></Data>
      </ExtendedData>
    </Placemark>
  </Document>
</kml>
```

### 3.4 **GeoTIFF** (Raster Mapping)
- **Use Case**: Orthorectified imagery with georeference data
- **Best For**: Pre-flight visual reference, CAD overlay
- **Sidecar File Format** (`.tfw`):
```
pixel_x_size: 0.05m
0.0
0.0
-pixel_y_size: 0.05m
top_left_utm_x: 700000.0
top_left_utm_y: 5250000.0
```

---

## 4. Task-Based Mission Formats

### 4.1 **QGC Plan Format** (JSON-based)
**Best For**: Universal PX4/ArduPilot mission design  
**File Extension**: `.plan`

```json
{
  "FileType": "Plan",
  "Version": 1,
  "QGroundControl": {
    "Version": 4,
    "MavlinkVersion": 2
  },
  "mission": {
    "plannedHomePosition": [47.5, 12.9, 500],
    "vehicles": [
      {
        "vehicleType": "ArduCopter",
        "cruiseSpeed": 10,
        "hoveredVehicle": true,
        "missionItems": [
          {
            "type": "SimpleItem",
            "version": 2,
            "sequenceNumber": 0,
            "command": 16,
            "isCurrentItem": false,
            "params": [0, 0, 0, 0, 47.5, 12.9, 500],
            "doJumpId": 1,
            "customData": {
              "nozzle_control": {"servo": 1, "pwm": 1900, "duration_ms": 200}
            }
          }
        ]
      }
    ]
  }
}
```

### 4.2 **Waypoint Format with Paint Parameters**
**Custom Extension Format** (recommended for paint drones)

```json
{
  "mission_id": "roof_paint_2026-03-29",
  "metadata": {
    "drone_type": "ArduPilot",
    "paint_system": "electric_spray",
    "total_paint_volume_ml": 5000,
    "estimated_coverage_m2": 200
  },
  "waypoints": [
    {
      "sequence": 1,
      "type": "takeoff",
      "latitude": 47.50000,
      "longitude": 12.90000,
      "altitude_m": 0,
      "speed_m_s": 5
    },
    {
      "sequence": 2,
      "type": "paint_polygon",
      "polygon_vertices": [
        {"lat": 47.50100, "lon": 12.90100},
        {"lat": 47.50200, "lon": 12.90100},
        {"lat": 47.50200, "lon": 12.90200},
        {"lat": 47.50100, "lon": 12.90200}
      ],
      "altitude_m": 50,
      "speed_m_s": 3,
      "paint_config": {
        "nozzle_count": 1,
        "flow_rate_ml_min": 200,
        "pass_overlap_percent": 10,
        "pattern": "parallel_stripes"
      }
    },
    {
      "sequence": 3,
      "type": "grid_spray",
      "origin": {"lat": 47.50300, "lon": 12.90300},
      "grid_spacing_m": 1.0,
      "grid_width_count": 10,
      "grid_length_count": 5,
      "altitude_m": 45,
      "speed_m_s": 3,
      "paint_config": {
        "nozzle_count": 2,
        "flow_rate_ml_min": 150,
        "pulse_width_ms": 100,
        "pulse_interval_ms": 500
      }
    },
    {
      "sequence": 4,
      "type": "RTH",
      "hold_alt_m": 0
    }
  ],
  "paint_colors": {
    "roof_primary": "#E74C3C",
    "roof_trim": "#2C3E50"
  }
}
```

### 4.3 **Grid-Based Spray Pattern** (Agriculture Standard)
```yaml
# YAML format for clarity, can convert to JSON
mission:
  name: "Agricultural Spray - Field A"
  drone: "ArduPilot"
  date: "2026-03-29"
  
grid:
  origin:
    latitude: 47.5000
    longitude: 12.9000
    altitude_m: 50
  
  pattern: "parallel_stripes"  # or "crosshatch", "spiral"
  
  # For rectangular field
  line_spacing_m: 2.5          # Distance between passes
  line_length_m: 100.0         # Length of each spray line
  speed_ms: 3.5
  
  # Spray parameters
  spray:
    enable_on_approach: true
    enable_on_retreat: true
    nozzles: 1
    flow_rate_lpm: 0.5
    pressure_bar: 3
    droplet_size_micron: 100

# Alternative: polygon-based (building paint)
target_polygon:
  vertices:
    - {lat: 47.5010, lon: 12.9010, alt: 50}
    - {lat: 47.5020, lon: 12.9010, alt: 50}
    - {lat: 47.5020, lon: 12.9020, alt: 50}
    - {lat: 47.5010, lon: 12.9020, alt: 50}
  
  coverage:
    stripe_width_m: 1.5
    overlap_percent: 15
```

---

## 5. Recommended Integration Path: Color Dashboard → Drone Control

### **Problem Definition**
You have:
- **Input**: 2D color analysis (Polycam RGB model or image)
- **Output Goal**: Drone spraying mission with per-region color/nozzle commands
- **Constraint**: Real-time conversion + GPS accuracy

### **Recommended 3-Step Pipeline**

---

## 6. TOP 3 RECOMMENDATIONS FOR PAINTDRONE

### **Recommendation #1: Hybrid GeoJSON + QGC Plan** ⭐⭐⭐ **BEST FOR WEB-NATIVE PIPELINE**

**Why This Works**:
- GeoJSON → Visual editor (Mapbox, Leaflet)
- QGC Plan → Direct drone deployment
- Lightweight, web-friendly, extensible

**Implementation Flow**:
```
1. Image Analysis Dashboard
   ↓
2. Extract color regions & polygon boundaries
   ↓
3. Generate GeoJSON with color metadata
   {
     "region_id": "roof_section_a",
     "color": "#FF5733",
     "paint_type": "acrylic",
     "estimated_area_m2": 25,
     "nozzle_type": "spray_atomizer"
   }
   ↓
4. Convert GeoJSON → Waypoints + Grid Pattern
   ↓
5. Generate QGC Plan JSON
   ↓
6. Deploy via QGroundControl → PX4/ArduPilot → Drone
```

**Sample Conversion Code** (pseudocode):
```python
import json
from shapely.geometry import shape, polygon

def geojson_to_qgc_plan(geojson_file, drone_type="ArduCopter"):
    with open(geojson_file) as f:
        geojson_data = json.load(f)
    
    mission_items = []
    alt = 50  # meters
    speed = 3  # m/s
    
    for feature in geojson_data["features"]:
        color = feature["properties"]["color"]
        geom = shape(feature["geometry"])
        
        if geom.geom_type == "Polygon":
            # Convert to grid spray pattern
            bounds = geom.bounds
            grid_waypoints = generate_grid_pattern(
                bounds, 
                spacing=1.5,
                altitude=alt
            )
            
            for wp in grid_waypoints:
                mission_items.append({
                    "type": "SimpleItem",
                    "command": 16,  # MAV_CMD_NAV_WAYPOINT
                    "params": [0, 0, 0, 0, wp["lat"], wp["lon"], alt],
                    "customData": {
                        "color": color,
                        "nozzle_pwm": 1800  # 90% flow
                    }
                })
    
    # Generate QGC Plan
    qgc_plan = {
        "FileType": "Plan",
        "mission": {
            "plannedHomePosition": [47.5, 12.9, 100],
            "vehicles": [{
                "vehicleType": drone_type,
                "missionItems": mission_items
            }]
        }
    }
    
    return qgc_plan
```

**Pros**:
- ✅ Web-standard format (GeoJSON)
- ✅ Works with all major autopilots (PX4/ArduPilot)
- ✅ Visual editing via mapping tools
- ✅ Easy color metadata preservation
- ✅ Simple conversion pipeline

**Cons**:
- ⚠️ QGC Plan doesn't natively support continuous nozzle control (needs MAVLink extension)

**File Extensions**: `.geojson` + `.plan`

---

### **Recommendation #2: Custom Paint Mission Format + ArduPilot MAVLink** ⭐⭐⭐ **BEST FOR PRECISION AGRICULTURE**

**Why This Works**:
- ArduPilot has native spray plugin (SPRAYER_PUMP_X)
- Custom format handles paint-specific parameters
- Grid patterns built-in for repetitive work

**Implementation Flow**:
```
1. Dashboard generates custom paint mission JSON
   ↓
2. Serializes to binary MAVLink protocol
   ↓
3. Sends via UDP to ArduPilot flight controller
   ↓
4. Autopilot executes spray grid with nozzle PWM control
```

**Custom Paint Mission Format**:
```json
{
  "version": "paint-mission-v1.0",
  "metadata": {
    "created": "2026-03-29T10:30:00Z",
    "drone_id": "ArduCopter_001",
    "paint_system": "electric_spray_dual_nozzle"
  },
  "mission": {
    "home": [47.5000, 12.9000, 100],
    "tasks": [
      {
        "id": "roof_paint_grid",
        "type": "grid_spray",
        "target": {
          "origin": [47.5010, 12.9010],
          "size_m": [50, 30],
          "altitude_m": 45
        },
        "pattern": {
          "type": "parallel_stripes",
          "line_spacing_m": 2.0,
          "heading_deg": 0
        },
        "flight_params": {
          "speed_m_s": 3.5,
          "corner_radius_m": 5
        },
        "spray_params": {
          "nozzle_channels": [5, 6],
          "pump_rate_percent": [85, 85],
          "pre_spray_delay_ms": 500,
          "post_spray_delay_ms": 500,
          "flow_mode": "pwm_pulse",
          "pulse_frequency_hz": 50
        }
      }
    ]
  }
}
```

**MAVLink Conversion** (via DroneKit):
```python
from dronekit import connect, Vehicle
import json

def execute_paint_mission(mission_json, connection_string):
    vehicle = connect(connection_string, wait_ready=True)
    
    with open(mission_json) as f:
        mission = json.load(f)
    
    task = mission["mission"]["tasks"][0]
    
    # Configure spray parameters
    vehicle.parameters["SPRAY_ENABLE"] = 1
    vehicle.parameters["SPRAY_PUMP_RATE"] = task["spray_params"]["pump_rate_percent"][0]
    vehicle.parameters["SPRAY_SPEED_MIN"] = 1.0
    
    # Upload waypoints + servo commands
    # ...code to generate MAVLink command sequence...
    vehicle.upload_mission(mavlink_commands)
    vehicle.arm_and_takeoff(100)
    vehicle.mode = VehicleMode("AUTO")
```

**Pros**:
- ✅ Works directly with ArduPilot spray plugin
- ✅ Binary efficiency over wire
- ✅ Precise flow rate + PWM control
- ✅ Built for repetitive patterns (agriculture/construction)

**Cons**:
- ⚠️ Requires custom parser on drone side
- ⚠️ Less portable than QGC Plan (ArduPilot-focused)

**File Extensions**: Custom `.paint` or `.mission`

---

### **Recommendation #3: Shapefile + GIS Toolchain + Cloud Mission Generation** ⭐⭐ **BEST FOR ENTERPRISE/CAD INTEGRATION**

**Why This Works**:
- Integrates with professional CAD/GIS (AutoCAD, ArcGIS)
- Cloud-based mission generation (scalable)
- Audit trail for construction projects

**Implementation Flow**:
```
1. CAD/GIS exports Shapefile (building footprint + color zones)
   ↓
2. Upload to cloud mission planner (AWS/Azure Function)
   ↓
3. Shapefile → GeoJSON → Optimized flight path
   ↓
4. Generate QGC Plan with drone resource constraints
   ↓
5. Download + deploy to fleet
```

**Cloud Function Logic** (pseudocode):
```python
import geopandas as gpd
from shapely.ops import unary_union
from route_optimizer import tsp_optimize

def shapefile_to_mission(shapefile_path, drone_fleet_capacity):
    # Read Shapefile
    gdf = gpd.read_file(shapefile_path)
    
    # Group by color/paint type
    paint_groups = gdf.groupby("paint_color")
    
    missions = {}
    for color, group in paint_groups:
        # Merge nearby regions
        merged = unary_union(group.geometry)
        
        # Generate grid pattern
        waypoints = generate_coverage_pattern(merged)
        
        # Optimize route (TSP)
        optimized = tsp_optimize(waypoints)
        
        # Generate QGC Plan
        missions[color] = generate_qgc_plan(optimized, color)
    
    return missions
```

**Pros**:
- ✅ Professional GIS integration
- ✅ Scalable (cloud-based)
- ✅ Suitable for large building projects
- ✅ Audit + compliance tracking
- ✅ Supports multiple drones/fleet management

**Cons**:
- ⚠️ Complex toolchain (requires GDAL, spatial libraries)
- ⚠️ Higher latency (cloud round-trip)
- ⚠️ Cost for cloud infrastructure

**File Extensions**: `.shp`, `.shx`, `.dbf` → `.plan` or `.geojson`

---

## 7. Real-World Examples

### **Example 1: Precision Agriculture (ArduPilot Spray)**
- **Use Case**: 50-hectare farm field spraying
- **Format Used**: Custom grid mission + ArduPilot SPRAYER parameters
- **Drone**: DJI Agras T30 (or ArduPilot-based)
- **Output**: 2-3 mission files per field, each 100KB
- **Tools**: AgXML (DJI proprietary) or Mission Planner (ArduPilot)

### **Example 2: Building Façade Painting (Drone + Paint System)**
- **Use Case**: 5-story warehouse exterior painting
- **Format Used**: GeoJSON polygons + QGC Plan
- **Drone**: Freeflyer or PX4-compatible
- **Color Extraction**: Photogrammetry (Polycam) → RGB zones
- **Nozzle Control**: Servo-based spray atomizer (PWM 1000-2000µs)
- **Tools**: Mapbox GL (visual editor) + QGroundControl (deployment)

### **Example 3: Construction Site Markup (Grid-based)**
- **Use Case**: Spray-paint 10-meter grid lines on construction site
- **Format Used**: Custom YAML grid mission
- **Drone**: Tarot X6 (ArduPilot-based)
- **Automation**: Python script → ArduPilot MAVLink
- **Nozzle**: Paint marker spray (low-pressure), 1-2 second bursts per grid crossing

---

## 8. Comparison: Which Format to Choose?

| **Scenario** | **Recommended Format** | **Reasoning** |
|---|---|---|
| **Web dashboard + quick deployment** | GeoJSON + QGC Plan | Native web support, universal autopilot compatibility |
| **Precision agricultural spraying** | Custom paint mission + ArduPilot | Native spray plugin, optimized for repetitive patterns |
| **CAD integration + large projects** | Shapefile + cloud processing | Professional GIS tools, scalability, audit trail |
| **Rapid prototyping (Polycam → Drone)** | GeoJSON (intermediate) + Custom conversion script | Lightweight, flexible transformation |
| **Multi-drone fleet management** | DJI Waypoint KMZ + FleetController API | Enterprise scaling, centralized control |

---

## 9. Implementation Checklist for Paintdrone

If building color-to-drone pipeline for **Polycam model**:

- [ ] **Phase 1: Color Extraction**
  - [ ] Parse GLB/GLTF model for mesh colors
  - [ ] Extract RGB values per named mesh
  - [ ] Map colors to geographic polygons (georeferencing)
  
- [ ] **Phase 2: Geospatial Conversion**
  - [ ] Generate GeoJSON Feature Collection
  - [ ] Include metadata (nozzle type, paint volume, color code)
  - [ ] Validate polygon geometries (QGIS or geojson.io)
  
- [ ] **Phase 3: Mission Generation**
  - [ ] GeoJSON → Waypoint grid (2.5m spacing recommended)
  - [ ] Generate QGC Plan JSON
  - [ ] Add nozzle control PWM values (1000-2000µs range)
  
- [ ] **Phase 4: Autopilot Integration**
  - [ ] Test with QGroundControl simulator
  - [ ] Verify MAVLink servo commands
  - [ ] Validate flight path + coverage area
  
- [ ] **Phase 5: Hardware Deployment**
  - [ ] Map drone servo channel to nozzle controller
  - [ ] Calibrate spray/paint flow rate
  - [ ] Test on small building section first

---

## 10. Code Examples & Libraries

### **Python Libraries**
```bash
# GeoJSON parsing
pip install geojson shapely

# Drone automation
pip install dronekit dronekit-sitl

# GIS operations
pip install geopandas gdal

# Mission planning
pip install pymavlink

# Web mapping (optional)
pip install folium streamlit
```

### **Quick Conversion Example**
```python
import json
import geojson

# Load color data from dashboard
colors_by_region = {
    "roof_a": {"rgb": [255, 87, 51], "area_m2": 25},
    "roof_b": {"rgb": [44, 62, 80], "area_m2": 30}
}

# Create GeoJSON
features = []
for region, data in colors_by_region.items():
    feature = geojson.Feature(
        geometry=geojson.Polygon([... vertices ...]),
        properties={
            "region_id": region,
            "color_hex": "#{:02x}{:02x}{:02x}".format(*data["rgb"]),
            "area_m2": data["area_m2"],
            "nozzle_pwm": 1800  # Proportional to area
        }
    )
    features.append(feature)

collection = geojson.FeatureCollection(features)
with open("paint_mission.geojson", "w") as f:
    json.dump(collection, f)
```

---

## 11. Summary Table: File Formats at a Glance

| **Category** | **Format** | **When to Use** | **Complexity** |
|---|---|---|---|
| **Drone Missions** | PX4 WPL | Maximum compatibility | Low |
| **Drone Missions** | QGC Plan | Universal, web-friendly | Low-Med |
| **Drone Missions** | ArduPilot MAVLink | Spray-specific features | Medium |
| **Geospatial** | GeoJSON | Web integration | Low |
| **Geospatial** | Shapefile | GIS professional tools | High |
| **Geospatial** | KML/KMZ | Visual inspection | Low-Med |
| **Task-Specific** | Custom Paint Mission | Precision agriculture | Medium |
| **Task-Specific** | Grid YAML | Simple patterns | Low |

---

## Final Recommendation for Paintdrone

**For a Polycam color editor → drone painting pipeline:**

1. **Export from dashboard**: GeoJSON with color metadata + polygon bounds
2. **Convert locally**: GeoJSON → QGC Plan (simple Python script)
3. **Deploy**: QGC Plan to QGroundControl → Autopilot → Drone
4. **Advanced**: Integrate ArduPilot spray parameters for flow rate control

**This approach gives you:**
- ✅ Web-native workflow (GeoJSON)
- ✅ Professional autopilot compatibility (QGC Plan)
- ✅ Visual editing & validation
- ✅ Extensible for field-specific features
- ✅ Open-source, no vendor lock-in

---

**End of Research Document**
