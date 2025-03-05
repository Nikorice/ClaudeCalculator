// Constants for material calculations
const POWDER_KG_PER_CM3 = 0.002; // 2g per cm³
const BINDER_ML_PER_CM3 = 0.27; // 270ml per liter
const SILICA_G_PER_CM3 = 0.55; // 0.55g per cm³

// Material pricing (default USD)
const MATERIAL_PRICES = {
    powder: { USD: 100.00, EUR: 92.86, JPY: 14285.71, SGD: 135.00 }, // per kg
    binder: { USD: 0.09, EUR: 0.085, JPY: 12.50, SGD: 0.12 }, // per ml
    silica: { USD: 0.072, EUR: 0.069, JPY: 11.00, SGD: 0.10 }, // per g
    glaze: { USD: 0.01, EUR: 0.0098, JPY: 1.56, SGD: 0.0137 } // per g
};

// Printer specifications
const PRINTERS = {
    '400': {
        dimensions: { x: 390, y: 290, z: 200 },
        layerTime: 45, // seconds per 0.1mm layer
        name: 'Printer 400'
    },
    '600': {
        dimensions: { x: 595, y: 600, z: 250 },
        layerTime: 35, // seconds per 0.1mm layer
        name: 'Printer 600'
    }
};

// Spacing settings
const WALL_MARGIN = 10; // mm
const OBJECT_SPACING = 15; // mm

// Current state
let currentState = {
    dimensions: { x: 0, y: 0, z: 0 },
    volume: 0,
    orientation: 'vertical', // 'flat' or 'vertical'
    applyGlaze: true,
    currency: 'USD',
    printer: '400',
    stlFile: null,
    meshObject: null,
    packingArrangement: {
        countX: 0,
        countY: 0,
        countZ: 0,
        totalCount: 0
    },
    currentView: 'top', // 'top' or 'side'
    currentLayer: 1,
    totalLayers: 1
};

// DOM elements
const uploadArea = document.getElementById('upload-area');
const stlFileInput = document.getElementById('stl-file-input');
const newStlBtn = document.querySelector('.new-stl-btn');
const flatBtn = document.getElementById('flat-btn');
const verticalBtn = document.getElementById('vertical-btn');
const glazeToggle = document.getElementById('glaze-toggle');
const printerModels = document.querySelectorAll('.printer-model');
const calculateBtn = document.querySelector('.calculate-btn');
const lengthInput = document.getElementById('length');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const resultsSection = document.getElementById('results');
const capacityWarning = document.getElementById('capacity-warning');
const printBedCanvas = document.getElementById('print-bed-canvas');
const topViewBtn = document.getElementById('top-view-btn');
const sideViewBtn = document.getElementById('side-view-btn');
const prevLayerBtn = document.getElementById('prev-layer-btn');
const nextLayerBtn = document.getElementById('next-layer-btn');
const currentLayerEl = document.getElementById('current-layer');
const totalLayersEl = document.getElementById('total-layers');

// 3D viewer variables
let scene, camera, renderer, controls, modelMesh;

// Initialize the application
function init() {
    // Check if required elements exist before proceeding
    if (!document.getElementById('model-viewer')) {
        console.error('Model viewer element not found. Results section may not be visible yet.');
        // Delay initialization until elements are available
        setTimeout(init, 100);
        return;
    }
    
    try {
        setupEventListeners();
        initializeThreeJs();
        
        // Check if element exists before setting property
        if (glazeToggle) {
            glazeToggle.checked = currentState.applyGlaze;
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Event listeners setup
function setupEventListeners() {
    // Check if elements exist before adding event listeners
    if (!tabBtns || !tabBtns.length) {
        console.error('Tab buttons not found');
        return;
    }
    
    // Tab switching
    tabBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) {
                    tabBtns.forEach(b => b && b.classList.remove('active'));
                    tabContents.forEach(content => content && content.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const tabElement = document.getElementById(`${tabId}-tab`);
                    if (tabElement) {
                        tabElement.classList.add('active');
                    }
                }
            });
        }
    });

    // STL file upload
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            if (stlFileInput) stlFileInput.click();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    } else {
        console.error('Upload area not found');
    }
    
    if (stlFileInput) {
        stlFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length) {
                handleFileUpload(e.target.files[0]);
            }
        });
    } else {
        console.error('STL file input not found');
    }
    
    // New STL button
    newStlBtn.addEventListener('click', () => stlFileInput.click());
    
    // Orientation buttons
    flatBtn.addEventListener('click', () => setOrientation('flat'));
    verticalBtn.addEventListener('click', () => setOrientation('vertical'));
    
    // Glaze toggle
    glazeToggle.addEventListener('change', () => {
        currentState.applyGlaze = glazeToggle.checked;
        updateCostAnalysis();
    });
    
    // Printer selection
    printerModels.forEach(model => {
        model.addEventListener('click', () => {
            const printerId = model.getAttribute('data-printer');
            printerModels.forEach(m => m.classList.remove('active'));
            model.classList.add('active');
            currentState.printer = printerId;
            updatePrinterCapacity();
            updatePrintBedVisualization();
        });
    });
    
    // View toggle buttons
    topViewBtn.addEventListener('click', () => {
        currentState.currentView = 'top';
        topViewBtn.classList.add('active');
        sideViewBtn.classList.remove('active');
        updatePrintBedVisualization();
    });
    
    sideViewBtn.addEventListener('click', () => {
        currentState.currentView = 'side';
        sideViewBtn.classList.add('active');
        topViewBtn.classList.remove('active');
        updatePrintBedVisualization();
    });
    
    // Layer navigation buttons
    prevLayerBtn.addEventListener('click', () => {
        if (currentState.currentLayer > 1) {
            currentState.currentLayer--;
            currentLayerEl.textContent = currentState.currentLayer;
            updatePrintBedVisualization();
        }
    });
    
    nextLayerBtn.addEventListener('click', () => {
        if (currentState.currentLayer < currentState.totalLayers) {
            currentState.currentLayer++;
            currentLayerEl.textContent = currentState.currentLayer;
            updatePrintBedVisualization();
        }
    });
    
    // Manual calculation
    calculateBtn.addEventListener('click', () => {
        const length = parseFloat(lengthInput.value);
        const width = parseFloat(widthInput.value);
        const height = parseFloat(heightInput.value);
        
        if (isNaN(length) || isNaN(width) || isNaN(height) || length <= 0 || width <= 0 || height <= 0) {
            alert('Please enter valid dimensions');
            return;
        }
        
        currentState.dimensions = { x: length, y: width, z: height };
        currentState.volume = (length * width * height) / 1000; // Convert to cm³
        
        // Create a box mesh for the 3D view
        if (modelMesh) {
            scene.remove(modelMesh);
        }
        
        const geometry = new THREE.BoxGeometry(length, height, width);
        const material = new THREE.MeshStandardMaterial({ color: 0x4285F4 });
        modelMesh = new THREE.Mesh(geometry, material);
        scene.add(modelMesh);
        
        // Center camera on the object
        fitCameraToObject(modelMesh);
        
        // Update UI
        updateAllDisplays();
        
        // Show results
        resultsSection.style.display = 'block';
    });
}

// Initialize Three.js scene
function initializeThreeJs() {
    try {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('THREE is not defined. Make sure Three.js is loaded properly.');
            return;
        }
        
        // Get the model viewer element
        const modelViewer = document.getElementById('model-viewer');
        if (!modelViewer) {
            console.error('Model viewer element not found');
            return;
        }
        
        // Setup scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1E2432);
        
        // Setup camera
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
        camera.position.z = 200;
        
        // Setup renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(modelViewer.clientWidth || 300, modelViewer.clientHeight || 200);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        modelViewer.appendChild(renderer.domElement);
        
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x555555, 0x333333);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);
    
    // Setup controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    // Start animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const container = document.getElementById('model-viewer');
        if (container && renderer && camera) {
            renderer.setSize(container.clientWidth, container.clientHeight);
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
        }
    });
    
    } catch (error) {
        console.error('Error initializing Three.js:', error);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    try {
        if (controls) controls.update();
        if (scene && camera && renderer) {
            renderer.render(scene, camera);
        }
    } catch (error) {
        console.error('Error in animation loop:', error);
    }
}

// Handle STL file upload
function handleFileUpload(file) {
    // Check for valid file
    if (!file || !file.name || !file.name.toLowerCase().endsWith('.stl')) {
        alert('Please upload a valid STL file');
        return;
    }
    
    try {
        // Show loading indicator or message
        console.log('Loading STL file:', file.name);
        
        // Save file reference to current state
        currentState.stlFile = file;
        
        // Create and configure FileReader
        const reader = new FileReader();
        
        // Define onload handler
        reader.onload = function(e) {
            try {
                // Make sure THREE is available
                if (typeof THREE === 'undefined' || !THREE.STLLoader) {
                    console.error('THREE.STLLoader is not available');
                    alert('Error: 3D library not properly loaded. Please refresh the page and try again.');
                    return;
                }
                
                // Parse STL file
                const loader = new THREE.STLLoader();
                const geometry = loader.parse(e.target.result);
                
        // Calculate volume
        currentState.volume = calculateSTLVolume(geometry);
        
        // Determine dimensions from geometry bounding box
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const dimensions = {
            x: box.max.x - box.min.x,
            y: box.max.y - box.min.y,
            z: box.max.z - box.min.z
        };
        currentState.dimensions = dimensions;
        
        // Create mesh
        if (modelMesh) {
            scene.remove(modelMesh);
        }
        
        const material = new THREE.MeshStandardMaterial({ color: 0x4285F4 });
        modelMesh = new THREE.Mesh(geometry, material);
        scene.add(modelMesh);
        
        // Center the model
        geometry.center();
        modelMesh.position.set(0, 0, 0);
        
        // Center camera on the object
        fitCameraToObject(modelMesh);
        
        // Update UI
        updateAllDisplays();
        
                // Show results
                if (resultsSection) {
                    resultsSection.style.display = 'block';
                }
            } catch (error) {
                console.error('Error processing STL file:', error);
                alert('Error processing the STL file. Please try a different file.');
            }
        };
        
        // Define error handler
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            alert('Error reading the file. Please try again.');
        };
        
        // Start reading the file
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error in handleFileUpload:', error);
        alert('An error occurred when trying to process the file. Please try again.');
    }
}

// Calculate STL volume using the divergence theorem
function calculateSTLVolume(geometry) {
    let volume = 0;
    const positions = geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 9) {
        const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
        
        // Calculate volume of tetrahedron formed by triangle and origin
        volume += signedVolumeOfTriangle(v1, v2, v3);
    }
    
    // Convert to cm³ (assuming STL is in mm)
    return Math.abs(volume) / 1000;
}

// Calculate signed volume of a tetrahedron
function signedVolumeOfTriangle(p1, p2, p3) {
    return p1.dot(p2.cross(p3)) / 6.0;
}

// Fit camera to the 3D object
function fitCameraToObject(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Get the max side of the bounding box
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
    
    // Set camera position
    camera.position.z = center.z + cameraZ * 1.5;
    
    // Update the controls target
    controls.target = center;
    controls.update();
}

// Set orientation (flat or vertical)
function setOrientation(orientation) {
    currentState.orientation = orientation;
    
    // Update button UI
    if (orientation === 'flat') {
        flatBtn.classList.add('active');
        verticalBtn.classList.remove('active');
    } else {
        flatBtn.classList.remove('active');
        verticalBtn.classList.add('active');
    }
    
    // Rotate 3D model if it exists
    if (modelMesh) {
        modelMesh.rotation.set(0, 0, 0); // Reset rotation
        
        if (orientation === 'flat') {
            // No rotation needed for flat
        } else {
            // Rotate for vertical orientation
            modelMesh.rotation.x = -Math.PI / 2;
        }
    }
    
    // Reset to first layer when orientation changes
    currentState.currentLayer = 1;
    currentLayerEl.textContent = '1';
    
    updatePrinterCapacity();
    updatePrintBedVisualization();
}

// Update all UI displays
function updateAllDisplays() {
    updateDimensionsDisplay();
    updateVolumeDisplay();
    updateCostAnalysis();
    updatePrinterCapacity();
    updatePrintBedVisualization();
}

// Update dimensions display
function updateDimensionsDisplay() {
    const { x, y, z } = currentState.dimensions;
    document.getElementById('dimensions').textContent = `${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)}`;
}

// Update volume display
function updateVolumeDisplay() {
    document.getElementById('volume').textContent = currentState.volume.toFixed(2);
}

// Calculate glaze usage
function calculateGlazeUsage(volumeCm3) {
    return 0.1615 * volumeCm3 + 31.76; // grams
}

// Update cost analysis
function updateCostAnalysis() {
    const volume = currentState.volume;
    const currency = currentState.currency;
    
    // Calculate material usage
    const powderAmount = volume * POWDER_KG_PER_CM3; // kg
    const binderAmount = volume * BINDER_ML_PER_CM3; // ml
    const silicaAmount = volume * SILICA_G_PER_CM3; // g
    const glazeAmount = currentState.applyGlaze ? calculateGlazeUsage(volume) : 0; // g
    
    // Calculate costs
    const powderCost = powderAmount * MATERIAL_PRICES.powder[currency];
    const binderCost = binderAmount * MATERIAL_PRICES.binder[currency];
    const silicaCost = silicaAmount * MATERIAL_PRICES.silica[currency];
    const glazeCost = glazeAmount * MATERIAL_PRICES.glaze[currency];
    
    const totalCost = powderCost + binderCost + silicaCost + glazeCost;
    
    // Calculate percentages
    const powderPercentage = (powderCost / totalCost) * 100;
    const binderPercentage = (binderCost / totalCost) * 100;
    const silicaPercentage = (silicaCost / totalCost) * 100;
    const glazePercentage = (glazeCost / totalCost) * 100;
    
    // Update UI
    document.getElementById('total-cost').textContent = totalCost.toFixed(2);
    
    document.getElementById('powder-cost').textContent = `${powderCost.toFixed(2)} ${currency} (${powderPercentage.toFixed(1)}%)`;
    document.getElementById('binder-cost').textContent = `${binderCost.toFixed(2)} ${currency} (${binderPercentage.toFixed(1)}%)`;
    document.getElementById('silica-cost').textContent = `${silicaCost.toFixed(2)} ${currency} (${silicaPercentage.toFixed(1)}%)`;
    document.getElementById('glaze-cost').textContent = `${glazeCost.toFixed(2)} ${currency} (${glazePercentage.toFixed(1)}%)`;
    
    // Update bar widths
    document.getElementById('powder-bar').style.width = `${powderPercentage}%`;
    document.getElementById('binder-bar').style.width = `${binderPercentage}%`;
    document.getElementById('silica-bar').style.width = `${silicaPercentage}%`;
    document.getElementById('glaze-bar').style.width = `${glazePercentage}%`;
}

// Update printer capacity information
function updatePrinterCapacity() {
    const printer = PRINTERS[currentState.printer];
    const { x, y, z } = currentState.dimensions;
    
    // Get dimensions based on orientation
    let objectX, objectY, objectZ;
    
    if (currentState.orientation === 'flat') {
        objectX = x;
        objectY = y;
        objectZ = z;
    } else {
        // Vertical orientation
        objectX = x;
        objectY = z;
        objectZ = y;
    }
    
    // Check if the object fits in the printer
    const fitsX = objectX <= printer.dimensions.x;
    const fitsY = objectY <= printer.dimensions.y;
    const fitsZ = objectZ <= printer.dimensions.z;
    
    if (!fitsX || !fitsY || !fitsZ) {
        // Object doesn't fit
        document.getElementById('object-count').textContent = '0';
        document.getElementById('arrangement').textContent = '0 × 0 × 0';
        document.getElementById('print-time').textContent = '0m';
        document.getElementById('batch-cost').textContent = '0.00';
        capacityWarning.style.display = 'flex';
        
        // Reset packing arrangement
        currentState.packingArrangement = {
            countX: 0,
            countY: 0,
            countZ: 0,
            totalCount: 0
        };
        
        return;
    }
    
    // Calculate how many objects fit in each dimension
    const availableX = printer.dimensions.x - (2 * WALL_MARGIN);
    const availableY = printer.dimensions.y - (2 * WALL_MARGIN);
    const availableZ = printer.dimensions.z;
    
    const countX = Math.floor((availableX + OBJECT_SPACING) / (objectX + OBJECT_SPACING));
    const countY = Math.floor((availableY + OBJECT_SPACING) / (objectY + OBJECT_SPACING));
    const countZ = Math.floor(availableZ / objectZ);
    
    const totalCount = countX * countY * countZ;
    
    // Update packing arrangement in state
    currentState.packingArrangement = {
        countX,
        countY,
        countZ,
        totalCount
    };
    
    // Calculate print time
    const layerCount = Math.ceil(objectZ / 0.1); // 0.1mm layer height
    const printTimeSeconds = layerCount * printer.layerTime;
    const printTimeMinutes = Math.ceil(printTimeSeconds / 60);
    
    // Update total layers
    currentState.totalLayers = countZ;
    totalLayersEl.textContent = countZ > 0 ? countZ : 1;
    
    // If current layer is now out of bounds, reset it
    if (currentState.currentLayer > currentState.totalLayers) {
        currentState.currentLayer = 1;
        currentLayerEl.textContent = '1';
    }
    
    // Calculate batch cost
    const singleCost = parseFloat(document.getElementById('total-cost').textContent);
    const batchCost = singleCost * totalCount;
    
    // Update UI
    document.getElementById('object-count').textContent = totalCount;
    document.getElementById('arrangement').textContent = `${countX} × ${countY} × ${countZ}`;
    document.getElementById('print-time').textContent = `${printTimeMinutes}m`;
    document.getElementById('batch-cost').textContent = batchCost.toFixed(2);
    capacityWarning.style.display = 'none';
}

// Update print bed visualization
function updatePrintBedVisualization() {
    if (!printBedCanvas || !printBedCanvas.getContext) {
        return; // Canvas not supported or not found
    }
    
    const ctx = printBedCanvas.getContext('2d');
    const canvas = printBedCanvas;
    const printer = PRINTERS[currentState.printer];
    const { packingArrangement, dimensions, orientation, currentView, currentLayer } = currentState;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get object dimensions based on orientation
    let objectX, objectY, objectZ;
    if (orientation === 'flat') {
        objectX = dimensions.x;
        objectY = dimensions.y;
        objectZ = dimensions.z;
    } else {
        // Vertical orientation
        objectX = dimensions.x;
        objectY = dimensions.z;
        objectZ = dimensions.y;
    }
    
    // Calculate scale to fit the printer bed in the canvas
    const margin = 40;
    const maxWidth = canvas.width - (2 * margin);
    const maxHeight = canvas.height - (2 * margin);
    
    let scaleX, scaleY;
    if (currentView === 'top') {
        scaleX = maxWidth / printer.dimensions.x;
        scaleY = maxHeight / printer.dimensions.y;
    } else { // side view
        scaleX = maxWidth / printer.dimensions.x;
        scaleY = maxHeight / printer.dimensions.z;
    }
    
    const scale = Math.min(scaleX, scaleY);
    
    // Draw printer bed outline
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (currentView === 'top') {
        // Top view - draw the XY plane
        const bedWidth = printer.dimensions.x * scale;
        const bedHeight = printer.dimensions.y * scale;
        ctx.rect(margin, margin, bedWidth, bedHeight);
    } else {
        // Side view - draw the XZ plane
        const bedWidth = printer.dimensions.x * scale;
        const bedHeight = printer.dimensions.z * scale;
        ctx.rect(margin, margin, bedWidth, bedHeight);
    }
    
    ctx.stroke();
    
    // Add label for printer dimensions
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    if (currentView === 'top') {
        ctx.fillText(`${printer.dimensions.x}mm × ${printer.dimensions.y}mm`, margin, margin - 5);
    } else {
        ctx.fillText(`${printer.dimensions.x}mm × ${printer.dimensions.z}mm`, margin, margin - 5);
    }
    
    // Draw objects based on packing arrangement
    if (packingArrangement.totalCount > 0) {
        const { countX, countY, countZ } = packingArrangement;
        
        // Calculate object dimensions in canvas pixels
        const objWidth = objectX * scale;
        const objHeight = currentView === 'top' ? objectY * scale : objectZ * scale;
        
        // Calculate spacing in canvas pixels
        const spacingX = OBJECT_SPACING * scale;
        const spacingY = OBJECT_SPACING * scale;
        
        // Draw objects
        ctx.fillStyle = '#4285F4';
        ctx.strokeStyle = '#2264d1';
        ctx.lineWidth = 1;
        
        if (currentView === 'top') {
            // In top view, we only show the current layer
            const startX = margin + WALL_MARGIN * scale;
            const startY = margin + WALL_MARGIN * scale;
            
            // Only draw objects on the current layer
            if (currentLayer <= countZ) {
                for (let i = 0; i < countX; i++) {
                    for (let j = 0; j < countY; j++) {
                        const x = startX + i * (objWidth + spacingX);
                        const y = startY + j * (objHeight + spacingY);
                        
                        ctx.fillRect(x, y, objWidth, objHeight);
                        ctx.strokeRect(x, y, objWidth, objHeight);
                    }
                }
            }
        } else {
            // In side view, we show a cross-section
            const startX = margin + WALL_MARGIN * scale;
            const startY = margin;
            
            // Draw objects in the XZ plane (for a specific Y row)
            const row = Math.min(Math.floor(countY / 2), countY - 1); // Middle row or last row if only one
            for (let i = 0; i < countX; i++) {
                for (let k = 0; k < countZ; k++) {
                    const x = startX + i * (objWidth + spacingX);
                    const y = startY + k * objHeight; // No spacing in Z direction
                    
                    ctx.fillRect(x, y, objWidth, objHeight);
                    ctx.strokeRect(x, y, objWidth, objHeight);
                }
            }
            
            // Add label for current row
            ctx.fillStyle = '#333';
            ctx.fillText(`Showing row ${row + 1} of ${countY}`, margin, canvas.height - 10);
        }
        
        // Show layer information
        if (currentView === 'top' && countZ > 1) {
            ctx.fillStyle = '#333';
            ctx.fillText(`Showing layer ${currentLayer} of ${countZ}`, margin, canvas.height - 10);
        }
    } else {
        // No objects fit or dimensions not set
        ctx.fillStyle = '#777';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No objects fit in the printer or dimensions not set', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);