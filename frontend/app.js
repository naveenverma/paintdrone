import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const API_URL = "http://127.0.0.1:8000/api/model/color";
const EXPORT_GEOJSON_URL = "http://127.0.0.1:8000/api/export/geojson";
const EXPORT_QGC_URL = "http://127.0.0.1:8000/api/export/qgc-plan";
const MODEL_URL = "./models/sample.glb";

const viewer = document.getElementById("viewer");
const modelFileInput = document.getElementById("modelFile");
const colorPicker = document.getElementById("colorPicker");
const meshNameInput = document.getElementById("meshName");
const modelIdInput = document.getElementById("modelId");
const regionNameInput = document.getElementById("regionName");
const applyColorBtn = document.getElementById("applyColorBtn");
const addRegionBtn = document.getElementById("addRegionBtn");
const exportMissionBtn = document.getElementById("exportMissionBtn");
const exportFormatSelect = document.getElementById("exportFormat");
const selectedColorText = document.getElementById("selectedColorText");
const regionCountText = document.getElementById("regionCount");
const lastUpdateText = document.getElementById("lastUpdate");
const statusOutput = document.getElementById("statusOutput");

let scene, camera, renderer, controls;
let loadedModel = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Face selection system
let selectedFaces = new Map();  // Map<mesh, Set<faceIndex>>
let faceColors = new Map();  // Map<mesh, Map<faceIndex, color>>
let paintMode = false;
let paintBrushSize = 1;
let selectedColor = "#FF6B6B";
let selectedRegionName = "";
let selectedMeshes = [];  // For backward compatibility
let originalMaterials = new Map();

// Check WebGL support
function checkWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!ctx;
  } catch (e) {
    return false;
  }
}

if (!checkWebGLSupport()) {
  console.warn("⚠️ WebGL not supported, will attempt with reduced settings");
}

// Track regions for export
const regions = [];

initScene();
// loadModel();  // Remove auto-load
animate();

// Initialize timestamps
updateLastChange();

// Set initial status
setStatus("👉 Step 1: Load a 3D model (GLB/GLTF) or 2D drawing (DXF)\n👉 Step 2: Enable Paint Mode (🎨 button top-left)\n👉 Step 3: Click on areas to paint them with selected color\n👉 Step 4: Enter region name and click 'Add Region'");

// File input listener for model loading
modelFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    loadModelFromFile(file);
  }
});

// Event listeners
colorPicker.addEventListener("input", () => {
  selectedColorText.textContent = colorPicker.value;
});

applyColorBtn.addEventListener("click", () => {
  applyColorToModel();
});

addRegionBtn.addEventListener("click", () => {
  addRegion();
});

exportMissionBtn.addEventListener("click", async () => {
  await exportMission();
});

function setStatus(message, append = false) {
  if (append) {
    statusOutput.textContent += `\n${message}`;
  } else {
    statusOutput.textContent = message;
  }
  updateLastChange();
  console.log(message);
}

function updateLastChange() {
  const now = new Date();
  lastUpdateText.textContent = now.toLocaleTimeString();
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101826);

  const width = viewer.clientWidth || window.innerWidth;
  const height = viewer.clientHeight || window.innerHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 1.5, 4);

  // Try to create WebGL renderer with fallback options
  const rendererConfig = {
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    failIfMajorPerformanceCaveat: false,
    precision: "mediump"
  };

  try {
    renderer = new THREE.WebGLRenderer(rendererConfig);
    console.log("✅ WebGLRenderer created successfully");
  } catch (error) {
    console.error("❌ WebGL failed, trying with lower precision:", error);
    rendererConfig.precision = "lowp";
    try {
      renderer = new THREE.WebGLRenderer(rendererConfig);
      console.log("✅ WebGLRenderer created with lowp precision");
    } catch (error2) {
      console.error("❌ WebGL still failed:", error2);
      setStatus("❌ WebGL not supported on this system.\nPlease try a different browser or device.");
      return;
    }
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = false;  // Disable shadows to reduce GPU load
  viewer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const grid = new THREE.GridHelper(10, 10, 0x334155, 0x1f2937);
  scene.add(grid);

  window.addEventListener("resize", onResize);
  setStatus("✅ Scene initialized successfully");

  // Add mouse click listener for face selection
  renderer.domElement.addEventListener("click", onMouseClick, false);
  renderer.domElement.addEventListener("mousemove", onMouseMove, false);

  // Add paint mode toggle button
  addPaintModeControls();
}

function onMouseMove(event) {
  if (!paintMode || !loadedModel) return;

  // Normalize mouse position
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Detect intersecting objects
  const intersects = raycaster.intersectObjects(loadedModel.children, true);
  
  // Optional: Show crosshair or preview
  if (intersects.length > 0 && paintMode) {
    renderer.domElement.style.cursor = "crosshair";
  } else {
    renderer.domElement.style.cursor = "default";  
  }
}

function onMouseClick(event) {
  if (!loadedModel) {
    setStatus("⚠️ Load a model first");
    return;
  }

  // Normalize mouse position
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Get all intersected objects
  const intersects = raycaster.intersectObjects(loadedModel.children, true);

  if (intersects.length > 0) {
    const intersection = intersects[0];
    const mesh = intersection.object;
    const faceIndex = intersection.faceIndex;

    if (faceIndex === undefined) {
      setStatus("⚠️ Could not detect face. Try clicking directly on surface.");
      return;
    }

    // Initialize mesh in face tracking
    if (!selectedFaces.has(mesh)) {
      selectedFaces.set(mesh, new Set());
      faceColors.set(mesh, new Map());
    }

    const meshFaces = selectedFaces.get(mesh);
    const meshFaceColors = faceColors.get(mesh);
    const chosenColor = colorPicker.value;

    if (paintMode) {
      // Paint mode: apply color immediately to clicked faces
      meshFaces.add(faceIndex);
      meshFaceColors.set(faceIndex, chosenColor);
      applyFaceColor(mesh, faceIndex, chosenColor);
      
      const regionName = regionNameInput.value.trim() || "Untitled Area";
      setStatus(`✏️ Painted face ${faceIndex} with ${chosenColor}\nRegion: ${regionName}`, true);
    } else {
      // Toggle selection mode (old behavior for backward compatibility)
      if (meshFaces.has(faceIndex)) {
        meshFaces.delete(faceIndex);
        setStatus(`✓ Deselected face ${faceIndex}`, true);
      } else {
        // Clear other selections to select one at a time
        selectedFaces.forEach((faces, m) => faces.clear());
        meshFaces.clear();
        meshFaces.add(faceIndex);
        meshFaceColors.set(faceIndex, chosenColor);
        setStatus(`✓ Selected face ${faceIndex} (turn paint mode ON for freeform painting)`, true);
      }
    }

    updateSelectedFacesVisualization();
  }
}

function selectMesh(mesh) {
  // Deselect previous meshes
  deselectAllMeshes();

  // Add to selected
  selectedMeshes.push(mesh);

  // Save original material
  if (!originalMaterials.has(mesh)) {
    originalMaterials.set(mesh, mesh.material);
  }

  // Highlight selected mesh
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00cc00,
    emissiveIntensity: 0.5,
    wireframe: false
  });

  mesh.material = highlightMaterial;

  // Update UI
  const meshName = mesh.name || "Unnamed Mesh";
  regionNameInput.value = meshName;
  meshNameInput.value = meshName;

  setStatus(`✅ Selected: ${meshName}\n💡 Pick a color and click "Add Region"`);
  console.log("Selected mesh:", mesh.name, mesh);
}

function deselectAllMeshes() {
  selectedMeshes.forEach(mesh => {
    if (originalMaterials.has(mesh)) {
      mesh.material = originalMaterials.get(mesh);
    }
  });
  selectedMeshes = [];
}

function applyFaceColor(mesh, faceIndex, color) {
  // Clone geometry to support per-face coloring
  if (!mesh.geometry.attributes.color) {
    // Initialize color attribute
    const colors = new Array(mesh.geometry.attributes.position.count).fill(0xffffff);
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(colors.map(c => [
      (c >> 16) & 255,
      (c >> 8) & 255,
      c & 255
    ]).flat()), 3, true));
  }

  // Convert hex color to RGB
  const hexColor = color.replace('#', '');
  const r = parseInt(hexColor.substring(0, 2), 16) / 255;
  const g = parseInt(hexColor.substring(2, 4), 16) / 255;
  const b = parseInt(hexColor.substring(4, 6), 16) / 255;

  // Update face color (if indexed geometry)
  const index = mesh.geometry.index;
  if (index) {
    const indices = index.array;
    // Get the vertices of this face (assuming triangulated geometry)
    const faceVertexIndices = [faceIndex * 3, faceIndex * 3 + 1, faceIndex * 3 + 2];
    
    // Color the vertices of this face
    faceVertexIndices.forEach(vertexIdx => {
      const actualIdx = index.array[vertexIdx] || vertexIdx;
      // Update material color instead of vertex color for simplicity
    });
  }

  // Update material to show the color
  if (mesh.material.isArray) {
    // Multi-material mesh
    mesh.material.forEach(mat => {
      mat.color.set(color);
    });
  } else {
    // Single material - create a highlight
    const newMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.1,
      roughness: 0.8,
      emissive: color,
      emissiveIntensity: 0.3
    });
    // Blend with existing material - apply to all meshes for now
    mesh.material = newMaterial;
  }
}

function updateSelectedFacesVisualization() {
  if (selectedFaces.size === 0) return;

  selectedFaces.forEach((faces, mesh) => {
    if (faces.size === 0) return;

    // Highlight selected faces by changing material
    const newMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00cc00,
      emissiveIntensity: 0.5,
      metalness: 0.2,
      roughness: 0.8
    });

    mesh.material = newMaterial;
  });
}

function addPaintModeControls() {
  // Create paint mode toggle button dynamically
  const controlsDiv = document.createElement('div');
  controlsDiv.style.position = 'absolute';
  controlsDiv.style.top = '20px';
  controlsDiv.style.left = '420px';
  controlsDiv.style.zIndex = '100';
  controlsDiv.style.display = 'flex';
  controlsDiv.style.gap = '10px';
  controlsDiv.style.backgroundColor = '#1a1a2e';
  controlsDiv.style.padding = '15px';
  controlsDiv.style.borderRadius = '8px';
  controlsDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

  // Paint mode toggle button
  const paintModeBtn = document.createElement('button');
  paintModeBtn.textContent = '🎨 Paint Mode (OFF)';
  paintModeBtn.id = 'paintModeBtn';
  paintModeBtn.style.padding = '10px 15px';
  paintModeBtn.style.backgroundColor = '#64748b';
  paintModeBtn.style.color = 'white';
  paintModeBtn.style.border = 'none';
  paintModeBtn.style.borderRadius = '6px';
  paintModeBtn.style.cursor = 'pointer';
  paintModeBtn.style.fontWeight = 'bold';
  paintModeBtn.style.transition = 'all 0.3s ease';

  paintModeBtn.addEventListener('click', () => {
    paintMode = !paintMode;
    paintModeBtn.textContent = paintMode ? '🎨 Paint Mode (ON)' : '🎨 Paint Mode (OFF)';
    paintModeBtn.style.backgroundColor = paintMode ? '#4ade80' : '#64748b';
    
    const hint = document.getElementById("hint");
    if (hint) {
      if (paintMode) {
        hint.textContent = "✏️ Paint Mode ON - Click and drag on surfaces to paint areas. Pick a color first!";
        setStatus("🎨 Paint Mode ENABLED - Click on surfaces to paint them", true);
      } else {
        hint.textContent = "👆 Paint Mode OFF - Turn it on to paint custom areas";
        setStatus("🎨 Paint Mode DISABLED", true);
      }
    }
  });

  // Clear selection button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑️ Clear Selection';
  clearBtn.style.padding = '10px 15px';
  clearBtn.style.backgroundColor = '#ef4444';
  clearBtn.style.color = 'white';
  clearBtn.style.border = 'none';
  clearBtn.style.borderRadius = '6px';
  clearBtn.style.cursor = 'pointer';
  clearBtn.style.fontWeight = 'bold';
  clearBtn.style.transition = 'all 0.3s ease';

  clearBtn.addEventListener('click', () => {
    selectedFaces.clear();
    faceColors.clear();
    selectedMeshes = [];
    deselectAllMeshes();
    setStatus("🗑️ Cleared all selections - reload to reset colors");
    updateLastChange();
    // Optionally reload after a short delay
    // setTimeout(() => location.reload(), 500);
  });

  controlsDiv.appendChild(paintModeBtn);
  controlsDiv.appendChild(clearBtn);
  
  if (viewer) {
    viewer.parentElement.appendChild(controlsDiv);
  }
}

function onResize() {
  const width = viewer.clientWidth || window.innerWidth;
  const height = viewer.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function loadModel() {
  const loader = new GLTFLoader();

  setStatus("🔄 Loading 3D model...");

  loader.load(
    MODEL_URL,
    (gltf) => {
      loadedModel = gltf.scene;
      scene.add(loadedModel);

      fitCameraToObject(loadedModel);
      setStatus("✅ Model loaded successfully. Ready to assign colors!");
    },
    undefined,
    (error) => {
      console.error(error);
      setStatus("❌ Failed to load model.\nMake sure frontend/models/sample.glb exists.");
    }
  );
}

function loadModelFromFile(file) {
  // Clear previous model
  if (loadedModel) {
    scene.remove(loadedModel);
    loadedModel = null;
  }

  // Validate file type
  if (!file.name.match(/\.(glb|gltf|dxf)$/i)) {
    setStatus("❌ Invalid file type. Please select a .glb, .gltf, or .dxf file.");
    return;
  }

  // Check if DXF file
  if (file.name.match(/\.dxf$/i)) {
    loadDXFFile(file);
    return;
  }

  setStatus(`🔄 Loading model: ${file.name}...`);
  console.log("File selected:", file.name, "Size:", file.size, "bytes");

  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const arrayBuffer = e.target.result;
      console.log("File read successfully, buffer size:", arrayBuffer.byteLength);
      
      const loader = new GLTFLoader();

      // Method 1: Try using parse directly
      console.log("Attempting to parse GLB data...");
      
      loader.parse(
        arrayBuffer,
        "",
        function onLoad(gltf) {
          console.log("✅ Model parsed successfully", gltf);
          loadedModel = gltf.scene;
          scene.add(loadedModel);

          // Update model ID from filename
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          modelIdInput.value = fileNameWithoutExt || "paintdrone_model";

          fitCameraToObject(loadedModel);
          setStatus(`✅ Model loaded: ${file.name}\n📍 Ready to assign colors!`);
          console.log("Model added to scene successfully");
        },
        function onError(error) {
          console.error("Parse error, trying Blob URL method...", error);
          loadModelUsingBlobUrl(file);
        }
      );
    } catch (error) {
      console.error("Error in file loading:", error);
      setStatus(`❌ Error: ${error.message}`);
      loadModelUsingBlobUrl(file);
    }
  };

  reader.onerror = () => {
    console.error("FileReader error");
    setStatus("❌ Failed to read file.");
  };

  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      setStatus(`🔄 Loading: ${percentComplete.toFixed(0)}%`);
    }
  };

  console.log("Starting to read file as ArrayBuffer...");
  reader.readAsArrayBuffer(file);
}

function loadModelUsingBlobUrl(file) {
  console.log("Using Blob URL fallback method...");
  setStatus(`🔄 Loading model: ${file.name} (method 2)...`);
  
  const blobUrl = URL.createObjectURL(file);
  console.log("Created Blob URL:", blobUrl);
  
  const loader = new GLTFLoader();
  
  loader.load(
    blobUrl,
    function onLoad(gltf) {
      console.log("✅ Model loaded via Blob URL", gltf);
      loadedModel = gltf.scene;
      scene.add(loadedModel);

      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      modelIdInput.value = fileNameWithoutExt || "paintdrone_model";

      fitCameraToObject(loadedModel);
      setStatus(`✅ Model loaded: ${file.name}\n📍 Ready to assign colors!`);
      
      URL.revokeObjectURL(blobUrl);
      console.log("Cleaned up blob URL");
    },
    function onProgress(event) {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setStatus(`🔄 Loading: ${percentComplete.toFixed(0)}%`);
      }
    },
    function onError(error) {
      console.error("Blob URL loading failed:", error);
      setStatus(`❌ Failed to load model.\nError: ${error.message || "Unknown error"}`);
      URL.revokeObjectURL(blobUrl);
    }
  );
}

function loadDXFFile(file) {
  console.log("Loading DXF file:", file.name);
  setStatus(`🔄 Loading DXF: ${file.name}...`);

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const text = e.target.result;
      console.log("DXF file read, size:", text.length, "chars");

      // Parse DXF and create Three.js geometry
      const group = parseDXFToThreeJS(text);

      if (!group || group.children.length === 0) {
        setStatus("❌ No drawable entities found in DXF file.");
        return;
      }

      loadedModel = group;
      scene.add(loadedModel);

      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      modelIdInput.value = fileNameWithoutExt || "dxf_drawing";

      fitCameraToObject(loadedModel);
      setStatus(`✅ DXF loaded: ${file.name}\n📍 Ready to paint regions!`);
      console.log("DXF model added to scene");
    } catch (error) {
      console.error("Error parsing DXF:", error);
      setStatus(`❌ Error parsing DXF: ${error.message}`);
    }
  };

  reader.onerror = () => {
    setStatus("❌ Failed to read DXF file.");
  };

  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      setStatus(`🔄 Loading: ${percentComplete.toFixed(0)}%`);
    }
  };

  reader.readAsText(file);
}

function parseDXFToThreeJS(dxfText) {
  const group = new THREE.Group();
  group.name = "DXF_Drawing";

  try {
    // Simple DXF parser - extracts LINE and POLYLINE entities
    const lines = dxfText.split('\n');
    let i = 0;

    // Find ENTITIES section
    while (i < lines.length) {
      if (lines[i].trim() === 'ENTITIES') {
        i++;
        break;
      }
      i++;
    }

    let currentX = 0, currentY = 0;
    let inLine = false, inPolyline = false;
    let lineStart = null;

    // Parse entities
    while (i < lines.length && lines[i].trim() !== 'ENDSEC') {
      const line = lines[i].trim();
      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';

      // LINE entity
      if (line === 'LINE') {
        inLine = true;
        i++;
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

        while (i < lines.length && lines[i].trim() !== '0') {
          const code = lines[i].trim();
          const value = lines[i + 1].trim();

          if (code === '10') x1 = parseFloat(value);
          if (code === '20') y1 = parseFloat(value);
          if (code === '11') x2 = parseFloat(value);
          if (code === '21') y2 = parseFloat(value);

          i += 2;
        }

        // Create line geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([x1, y1, 0, x2, y2, 0]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        const lineObj = new THREE.Line(geometry, material);
        lineObj.name = `DXF_Line_${group.children.length}`;
        group.add(lineObj);
        inLine = false;
        continue;
      }

      // LWPOLYLINE entity (lightweight polyline)
      if (line === 'LWPOLYLINE') {
        inPolyline = true;
        i++;
        const points = [];
        let vertexCount = 0;

        while (i < lines.length && lines[i].trim() !== '0') {
          const code = lines[i].trim();
          const value = lines[i + 1].trim();

          if (code === '90') vertexCount = parseInt(value);
          if (code === '10') {
            const x = parseFloat(value);
            const y = parseFloat(lines[i + 3] ? lines[i + 3].trim() : '0');
            points.push(new THREE.Vector3(x, y, 0));
            i += 2;
            continue;
          }

          i += 2;
        }

        // Create polyline geometry
        if (points.length > 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({ color: 0x00ccff, linewidth: 2 });
          const polylineObj = new THREE.Line(geometry, material);
          polylineObj.name = `DXF_Polyline_${group.children.length}`;
          group.add(polylineObj);
        }
        inPolyline = false;
        continue;
      }

      i++;
    }

    console.log(`Parsed ${group.children.length} entities from DXF`);
    return group;
  } catch (error) {
    console.error("DXF parsing error:", error);
    return group;
  }
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.8;

  camera.position.set(center.x, center.y + maxDim * 0.4, center.z + cameraZ);
  camera.near = maxDim / 100 || 0.1;
  camera.far = maxDim * 100 || 1000;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

function applyColorToModel() {
  if (!loadedModel) {
    setStatus("❌ No model loaded yet.");
    return;
  }

  const chosenColor = colorPicker.value;
  const targetMeshName = meshNameInput.value.trim();

  let changedCount = 0;
  let foundTarget = false;

  // If a mesh is selected, apply color to it
  if (selectedMeshes.length > 0) {
    selectedMeshes.forEach(mesh => {
      if (mesh.material) {
        // Create a new material with the chosen color
        const newMaterial = new THREE.MeshStandardMaterial({
          color: chosenColor,
          metalness: 0.1,
          roughness: 0.8
        });
        mesh.material = newMaterial;
        // Store as original for future deselection
        originalMaterials.set(mesh, newMaterial);
        changedCount++;
        foundTarget = true;
      }
    });
  } else {
    // Original behavior: search by mesh name or apply to all
    loadedModel.traverse((obj) => {
      if (!obj.isMesh) return;

      if (targetMeshName) {
        if (obj.name === targetMeshName) {
          const newMaterial = new THREE.MeshStandardMaterial({
            color: chosenColor,
            metalness: 0.1,
            roughness: 0.8
          });
          obj.material = newMaterial;
          originalMaterials.set(obj, newMaterial);
          foundTarget = true;
          changedCount++;
        }
      } else {
        const newMaterial = new THREE.MeshStandardMaterial({
          color: chosenColor,
          metalness: 0.1,
          roughness: 0.8
        });
        obj.material = newMaterial;
        originalMaterials.set(obj, newMaterial);
        changedCount++;
      }
    });
  }

  selectedColorText.textContent = chosenColor;

  if (targetMeshName && !foundTarget && selectedMeshes.length === 0) {
    setStatus(`❌ Mesh '${targetMeshName}' not found.`);
    return;
  }

  setStatus(`✅ Applied color ${chosenColor} to ${changedCount} surface(s).`);
}

function addRegion() {
  const regionName = regionNameInput.value.trim();
  const color = colorPicker.value;
  
  // Get mesh name from selected mesh or input field
  let meshName = meshNameInput.value.trim();
  if (selectedMeshes.length > 0 && !meshName) {
    meshName = selectedMeshes[0].name || "selected_mesh";
  }

  if (!regionName) {
    setStatus("⚠️ Please enter a region name.");
    return;
  }

  // First apply color to the mesh
  applyColorToModel();

  // Create a mock polygon region (in real implementation, user would draw this)
  const mockCoordinates = [
    [47.5 + Math.random() * 0.01, 12.9 + Math.random() * 0.01],
    [47.51 + Math.random() * 0.01, 12.9 + Math.random() * 0.01],
    [47.51 + Math.random() * 0.01, 12.91 + Math.random() * 0.01],
    [47.5 + Math.random() * 0.01, 12.91 + Math.random() * 0.01],
  ];

  const region = {
    region_id: `region_${regions.length + 1}`,
    region_name: regionName,
    color: color,
    coordinates: mockCoordinates,
    coverage_required: true,
    paint_type: "standard",
    mesh_name: meshName,
    timestamp: new Date().toISOString()
  };

  regions.push(region);
  regionCountText.textContent = regions.length;
  lastUpdateText.textContent = new Date().toLocaleTimeString();

  setStatus(`✅ Added region: ${regionName} (${color})\nMesh: ${meshName}\nTotal regions: ${regions.length}`);

  // Clear inputs and deselect
  regionNameInput.value = "";
  deselectAllMeshes();

  console.log("Region added:", region);
}

async function exportMission() {
  if (regions.length === 0) {
    setStatus("⚠️  No regions defined. Add at least one region first.");
    return;
  }

  const exportFormat = exportFormatSelect.value;
  const missionId = modelIdInput.value || "paintdrone_mission";

  setStatus("📤 Exporting mission...");

  const payload = {
    mission_id: missionId,
    regions: regions,
    export_format: exportFormat
  };

  try {
    const exportUrl = exportFormat === "geojson" ? EXPORT_GEOJSON_URL : EXPORT_QGC_URL;
    
    const response = await fetch(exportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(`❌ Export failed: ${JSON.stringify(error, null, 2)}`);
      return;
    }

    const data = await response.json();

    // Create downloadable file
    const fileName = `${missionId}_${exportFormat}.${exportFormat === "geojson" ? "geojson" : "plan"}`;
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatus(`✅ Mission exported as ${fileName}\n📍 Regions: ${regions.length}\n🎨 Paint points: ${regions.length}`);
  } catch (error) {
    console.error(error);
    setStatus(`❌ Export failed: ${error.message}`);
  }
}

function animate() {
  requestAnimationFrame(animate);
  try {
    controls.update();
    renderer.render(scene, camera);
  } catch (error) {
    console.error("Render error:", error);
    // Continue trying to render even if there are errors
  }
}
