import re
import json
from datetime import datetime, timezone
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

app = FastAPI(title="Paintdrone Color Sync API")

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")

# Store color assignments in memory (cleared on restart)
color_assignments = {}


class ColorUpdate(BaseModel):
    modelId: str
    meshName: Optional[str] = ""
    color: str
    updatedAt: str

    @field_validator("modelId")
    @classmethod
    def validate_model_id(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("modelId is required")
        return value.strip()

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        value = value.strip()
        if not HEX_COLOR_RE.match(value):
            raise ValueError("color must be a valid hex color like #3366ff")
        return value

    @field_validator("updatedAt")
    @classmethod
    def validate_updated_at(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("updatedAt is required")
        return value.strip()


class PaintRegion(BaseModel):
    region_id: str
    region_name: str
    color: str
    coordinates: List[List[float]]  # lat, lon pairs for polygon
    coverage_required: bool = True
    paint_type: Optional[str] = "standard"


class MissionExport(BaseModel):
    mission_id: str
    regions: List[PaintRegion]
    export_format: str = "qgc_plan"  # qgc_plan, geojson, ardupilot


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "Paintdrone API is healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stored_assignments": len(color_assignments)
    }


@app.post("/api/model/color")
def receive_color_update(payload: ColorUpdate):
    """Store color update for a mesh"""
    try:
        key = f"{payload.modelId}:{payload.meshName or 'all'}"
        color_assignments[key] = {
            "meshName": payload.meshName or "all",
            "color": payload.color,
            "updatedAt": payload.updatedAt
        }
        
        print(f"✅ Stored color assignment: {key} -> {payload.color}")
        
        return {
            "success": True,
            "message": "Color update stored",
            "data": payload.model_dump(),
            "total_assignments": len(color_assignments)
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/export/geojson")
def export_geojson(mission: MissionExport):
    """Export paint regions as GeoJSON for drone mission planning"""
    try:
        features = []
        
        for region in mission.regions:
            feature = {
                "type": "Feature",
                "properties": {
                    "region_id": region.region_id,
                    "region_name": region.region_name,
                    "color": region.color,
                    "paint_type": region.paint_type,
                    "coverage_required": region.coverage_required
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[region.coordinates]]  # GeoJSON wraps coords in arrays
                }
            }
            features.append(feature)
        
        geojson_output = {
            "type": "FeatureCollection",
            "name": f"paintdrone_mission_{mission.mission_id}",
            "crs": {
                "type": "name",
                "properties": {"name": "EPSG:4326"}
            },
            "features": features
        }
        
        print(f"✅ Generated GeoJSON with {len(features)} regions")
        
        return JSONResponse(
            content=geojson_output,
            media_type="application/geo+json"
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/export/qgc-plan")
def export_qgc_plan(mission: MissionExport):
    """Export paint regions as QGroundControl mission plan"""
    try:
        waypoints = []
        wp_index = 0
        
        for region in mission.regions:
            # Create a waypoint at the center of the region
            coords = region.coordinates
            center_lat = sum(c[0] for c in coords) / len(coords)
            center_lon = sum(c[1] for c in coords) / len(coords)
            
            # Add waypoint
            waypoint = {
                "type": "SimpleWaypoint",
                "coordinate": [center_lon, center_lat, 20],  # 20m altitude
                "autoContinue": True,
                "isCurrentItem": wp_index == 0,
                "name": region.region_name,
                "description": f"Paint {region.region_name} with color {region.color}",
                "customData": {
                    "region_id": region.region_id,
                    "color": region.color,
                    "paint_type": region.paint_type
                }
            }
            waypoints.append(waypoint)
            wp_index += 1
        
        qgc_plan = {
            "FileType": "Plan",
            "Version": 1,
            "Ground Control Station": "QGroundControl",
            "Mission": {
                "Altitude": 20,
                "Cruising speed": 15,
                "Firmware": "ArduCopter",
                "Groundspeed": 15,
                "TakeoffAlt": 0,
                "Waypoints": waypoints
            }
        }
        
        print(f"✅ Generated QGC Plan with {len(waypoints)} waypoints")
        
        return JSONResponse(
            content=qgc_plan,
            media_type="application/json"
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/assignments")
def get_assignments():
    """Retrieve all stored color assignments"""
    return {
        "success": True,
        "count": len(color_assignments),
        "assignments": color_assignments,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
