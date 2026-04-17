"""
Generate a sample GLB model for the Paintdrone demo.
This creates a simple building structure with labeled paint regions.
"""

import json
import struct
import base64
from pathlib import Path


def create_sample_glb():
    """Create a minimal GLB file with mesh geometry."""
    
    # Simple box geometry (vertices for a building footprint)
    # 6 vertices for a simple building outline
    vertices = [
        [0, 0, 0],      # 0 - SW corner
        [10, 0, 0],     # 1 - SE corner
        [10, 5, 0],     # 2 - NE corner
        [0, 5, 0],      # 3 - NW corner
        [0, 0, 2],      # 4 - SW top (height 2m)
        [10, 0, 2],     # 5 - SE top
    ]
    
    # Faces (triangles) for a simple structure
    indices = [
        0, 1, 2,  # Floor triangle 1
        0, 2, 3,  # Floor triangle 2
        0, 4, 5,  # Wall 1
        0, 5, 1,  # Wall 1 triangle 2
    ]
    
    # Simple colors (RGBA)
    colors = [
        [1.0, 1.0, 1.0, 1.0],  # White
        [0.8, 0.8, 0.8, 1.0],  # Light gray
        [0.6, 0.6, 0.6, 1.0],  # Gray
        [0.4, 0.4, 0.4, 1.0],  # Dark gray
        [1.0, 0.8, 0.8, 1.0],  # Light red
        [0.8, 1.0, 0.8, 1.0],  # Light green
    ]
    
    # Write model to JSON (glTF format step 1)
    gltf_data = {
        "asset": {
            "version": "2.0",
            "generator": "paintdrone-demo-generator"
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "building_structure"}],
        "meshes": [
            {
                "name": "main_mesh",
                "primitives": [
                    {
                        "mode": 4,  # TRIANGLES
                        "indices": 0,
                        "attributes": {"POSITION": 1, "COLOR_0": 2}
                    }
                ]
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(indices) * 4,
                "target": 34963  # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(indices) * 4,
                "byteLength": len(vertices) * 3 * 4,
                "target": 34962  # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(indices) * 4 + len(vertices) * 3 * 4,
                "byteLength": len(colors) * 4 * 4,
                "target": 34962  # ARRAY_BUFFER
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5125,  # UNSIGNED_INT
                "count": len(indices),
                "type": "SCALAR"
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,  # FLOAT
                "count": len(vertices),
                "type": "VEC3",
                "max": [10, 5, 2],
                "min": [0, 0, 0]
            },
            {
                "bufferView": 2,
                "byteOffset": 0,
                "componentType": 5126,  # FLOAT
                "count": len(colors),
                "type": "VEC4"
            }
        ],
        "buffers": [{"byteLength": len(indices) * 4 + len(vertices) * 3 * 4 + len(colors) * 4 * 4}]
    }
    
    # Generate binary data
    binary_data = bytearray()
    
    # Add indices
    for idx in indices:
        binary_data.extend(struct.pack('<I', idx))
    
    # Add vertices
    for v in vertices:
        for coord in v:
            binary_data.extend(struct.pack('<f', coord))
    
    # Add colors
    for c in colors:
        for component in c:
            binary_data.extend(struct.pack('<f', component))
    
    # Write GLB (Binary glTF)
    output_path = Path(__file__).parent / "frontend" / "models" / "sample.glb"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # GLB signature and header
    glb_magic = b'glTF'
    glb_version = struct.pack('<I', 2)
    
    # JSON chunk
    json_bytes = json.dumps(gltf_data).encode('utf-8')
    json_length = len(json_bytes)
    json_chunk = struct.pack('<I', json_length) + b'JSON' + json_bytes
    
    # Binary chunk
    binary_length = len(binary_data)
    binary_chunk = struct.pack('<I', binary_length) + b'BIN\x00' + bytes(binary_data)
    
    # Total file length
    file_length = 12 + len(json_chunk &) + len(binary_chunk)
    glb_header = glb_magic + glb_version + struct.pack('<I', file_length)
    
    with open(output_path, 'wb') as f:
        f.write(glb_header)
        f.write(json_chunk)
        f.write(binary_chunk)
    
    print(f"✅ Created sample.glb at {output_path}")
    print(f"   Vertices: {len(vertices)}")
    print(f"   Triangles: {len(indices) // 3}")
    print(f"   File size: {file_length} bytes")


if __name__ == "__main__":
    create_sample_glb()
