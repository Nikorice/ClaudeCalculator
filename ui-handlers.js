/* UI Event Handlers for 3D Printer Calculator */

// Create a new STL row
function createSTLRow() {
    perfMonitor.start('createSTLRow');
    
    // Create row ID
    const rowId = createUniqueId();
    
    // Get STL rows container
    const stlRows = document.getElementById("stlRows");
    if (!stlRows) {
      console.error('STL rows container not found');
      perfMonitor.end('createSTLRow');
      return null;
    }
    
    try {
      // Clone row template
      const template = document.getElementById("stl-row-template");
      if (!template) {
        console.error('STL row template not found');
        perfMonitor.end('createSTLRow');
        return null;
      }
      
      // Create the new row from template
      const rowContent = template.content.cloneNode(true);
      const row = rowContent.querySelector('.stl-row');
      
      // Set ID for the row
      row.id = rowId;
      
      // Fix any ID references in the new row by adding row ID prefix
      const elementsWithId = row.querySelectorAll('[id]');
      elementsWithId.forEach(el => {
        if (el.id.startsWith('__')) {
          el.id = rowId + '-' + el.id.substring(2);
        }
      });
      
      // Add row to container
      stlRows.appendChild(row);
      
      // Set up event listeners
      setupSTLRowEventListeners(rowId);
      
      perfMonitor.end('createSTLRow');
      return rowId;
    } catch (error) {
      console.error('Error creating STL row:', error);
      perfMonitor.end('createSTLRow');
      return null;
    }
  }
  
  // Set up event listeners for STL row
  function setupSTLRowEventListeners(rowId) {
    // Get row element
    const row = document.getElementById(rowId);
    if (!row) {
      console.error(`Row not found: ${rowId}`);
      return;
    }
    
    try {
      // Get relevant elements
      const uploadArea = row.querySelector('.upload-area');
      const fileInput = row.querySelector('input[type="file"]');
      const modelViewer = row.querySelector('.model-viewer');
      const modelViewerLoading = row.querySelector('.model-viewer-loading');
      const resultsPanel = row.querySelector('.results-panel');
      const orientationToggle = row.querySelector('.orientation-toggle');
      const orientationBtns = row.querySelectorAll('.orientation-btn');
      const glazeToggle = row.querySelector('.glaze-toggle');
      const removeBtn = row.querySelector('.remove-stl-btn');
      
      // File upload events
      if (uploadArea && fileInput) {
        // Click on upload area opens file dialog
        uploadArea.addEventListener('click', () => {
          fileInput.click();
        });
        
        // Drag & drop handling
        uploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
          
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            handleSTLFileUpload(rowId, e.dataTransfer.files[0]);
          }
        });
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length) {
            handleSTLFileUpload(rowId, e.target.files[0]);
          }
        });
      }
      
      // Orientation toggle
      if (orientationBtns) {
        orientationBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const orientation = btn.getAttribute('data-orientation');
            
            // Update active button
            orientationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Change 3D model orientation
            changeSTLOrientation(rowId, orientation);
          });
        });
      }
      
      // Glaze toggle
      if (glazeToggle) {
        glazeToggle.addEventListener('change', () => {
          updateSTLResults(rowId);
        });
      }
      
      // Remove button
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          removeSTLRow(rowId);
        });
      }
    } catch (error) {
      console.error(`Error setting up event listeners for row ${rowId}:`, error);
    }
  }
  
  // Handle STL file upload
  function handleSTLFileUpload(rowId, file) {
    perfMonitor.start('handleSTLUpload');
    
    // Get row element
    const row = document.getElementById(rowId);
    if (!row) {
      console.error(`Row not found: ${rowId}`);
      perfMonitor.end('handleSTLUpload');
      return;
    }
    
    try {
      // Get row elements
      const uploadArea = row.querySelector('.upload-area');
      const modelViewer = row.querySelector('.model-viewer');
      const modelViewerLoading = row.querySelector('.model-viewer-loading');
      const resultsPanel = row.querySelector('.results-panel');
      const errorMessage = resultsPanel.querySelector('.error-message');
      const loadingMessage = resultsPanel.querySelector('.loading-message');
      const orientationToggle = row.querySelector('.orientation-toggle');
      
      // Validate file
      if (!file || !file.name || !file.name.toLowerCase().endsWith('.stl')) {
        if (errorMessage) {
          errorMessage.textContent = 'Please upload a valid STL file';
          errorMessage.style.display = 'block';
        }
        perfMonitor.end('handleSTLUpload');
        return;
      }
      
      // Show loading state
      if (uploadArea) uploadArea.style.display = 'none';
      if (modelViewer) modelViewer.style.display = 'block';
      if (modelViewerLoading) modelViewerLoading.style.display = 'flex';
      if (resultsPanel) resultsPanel.style.display = 'block';
      if (loadingMessage) loadingMessage.style.display = 'flex';
      if (errorMessage) errorMessage.style.display = 'none';
      
      // Initialize Three.js viewer if not already done
      if (!row.threeJsObjects) {
        const viewerContainer = row.querySelector('.model-viewer');
        if (viewerContainer) {
          row.threeJsObjects = initThreeJSViewer(viewerContainer);
        }
      }
      
      // Process the file
      processSTLFile(rowId, file)
        .then(result => {
          if (result.success) {
            // Show orientation toggle
            if (orientationToggle) orientationToggle.style.display = 'flex';
            
            // Hide loading indicators
            if (modelViewerLoading) modelViewerLoading.style.display = 'none';
            if (loadingMessage) loadingMessage.style.display = 'none';
            
            // Update results
            updateSTLResults(rowId);
          } else {
            // Show error
            if (errorMessage) {
              errorMessage.textContent = result.error || 'Failed to process STL file';
              errorMessage.style.display = 'block';
            }
            
            if (modelViewerLoading) modelViewerLoading.style.display = 'none';
            if (loadingMessage) loadingMessage.style.display = 'none';
          }
        })
        .catch(error => {
          console.error(`Error processing STL file for row ${rowId}:`, error);
          
          // Show error
          if (errorMessage) {
            errorMessage.textContent = error.message || 'Error processing STL file';
            errorMessage.style.display = 'block';
          }
          
          if (modelViewerLoading) modelViewerLoading.style.display = 'none';
          if (loadingMessage) loadingMessage.style.display = 'none';
        })
        .finally(() => {
          perfMonitor.end('handleSTLUpload');
        });
    } catch (error) {
      console.error(`Error handling STL upload for row ${rowId}:`, error);
      perfMonitor.end('handleSTLUpload');
    }
  }
  
  // Process STL file
  async function processSTLFile(rowId, file) {
    perfMonitor.start('processSTL');
    
    try {
      // Get row data
      const row = document.getElementById(rowId);
      if (!row) {
        throw new Error('Row not found');
      }
      
      // Read file as array buffer
      const arrayBuffer = await readFileAsArrayBuffer(file);
      
      // Store file reference
      row.stlFile = file;
      row.stlArrayBuffer = arrayBuffer;
      
      // Calculate volume and dimensions (use Web Worker if available)
      let geometryData;
      
      if (window.Worker) {
        try {
          // Use Web Worker for processing
          geometryData = await processSTLInWorker(arrayBuffer);
        } catch (workerError) {
          console.warn('Web Worker failed, falling back to main thread:', workerError);
          geometryData = await processSTLInMainThread(arrayBuffer);
        }
      } else {
        // Fallback to main thread
        geometryData = await processSTLInMainThread(arrayBuffer);
      }
      
      if (!geometryData) {
        throw new Error('Failed to process STL geometry');
      }
      
      // Store geometry data
      row.volumeCm3 = geometryData.volumeCm3;
      row.dimensions = geometryData.dimensions;
      
      // Display 3D model if Three.js is available
      if (row.threeJsObjects && typeof THREE !== 'undefined') {
        const { scene, camera, controls } = row.threeJsObjects;
        
        if (scene && camera && controls) {
          // Load STL
          const loader = new THREE.STLLoader();
          const geometry = loader.parse(arrayBuffer);
          
          // Display in viewer
          const orientationData = displaySTLGeometry(geometry, scene, camera, controls);
          
          // Store orientation data
          row.orientationData = orientationData;
        }
      }
      
      perfMonitor.end('processSTL');
      return { success: true };
    } catch (error) {
      console.error('Error processing STL:', error);
      perfMonitor.end('processSTL');
      return { success: false, error: error.message || 'Failed to process STL file' };
    }
  }
  
  // Process STL in Web Worker
  async function processSTLInWorker(arrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker('js/stl-worker.js');
        
        worker.onmessage = (e) => {
          if (e.data.success) {
            resolve({
              volumeCm3: e.data.volumeCm3,
              dimensions: e.data.dimensions
            });
          } else {
            reject(new Error(e.data.error || 'Worker processing failed'));
          }
          worker.terminate();
        };
        
        worker.onerror = (error) => {
          reject(error);
          worker.terminate();
        };
        
        worker.postMessage(arrayBuffer);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Process STL in main thread
  async function processSTLInMainThread(arrayBuffer) {
    // We need to implement a subset of the worker functionality here
    try {
      // Parse binary STL
      const view = new DataView(arrayBuffer);
      const triangleCount = view.getUint32(80, true);
      
      if (triangleCount > 5000000) {
        throw new Error('STL file has too many triangles');
      }
      
      // Process geometry (simplified for main thread)
      let volumeCm3 = 0;
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      
      // Process in small batches to avoid blocking UI
      const CHUNK_SIZE = 5000;
      let offset = 84; // Skip header and triangle count
      
      for (let i = 0; i < triangleCount; i++) {
        // Skip normal vector (12 bytes)
        offset += 12;
        
        // Read vertices
        const v1x = view.getFloat32(offset, true);
        const v1y = view.getFloat32(offset + 4, true);
        const v1z = view.getFloat32(offset + 8, true);
        offset += 12;
        
        const v2x = view.getFloat32(offset, true);
        const v2y = view.getFloat32(offset + 4, true);
        const v2z = view.getFloat32(offset + 8, true);
        offset += 12;
        
        const v3x = view.getFloat32(offset, true);
        const v3y = view.getFloat32(offset + 4, true);
        const v3z = view.getFloat32(offset + 8, true);
        offset += 12;
        
        // Skip attribute byte count (2 bytes)
        offset += 2;
        
        // Update min/max coordinates
        minX = Math.min(minX, v1x, v2x, v3x);
        minY = Math.min(minY, v1y, v2y, v3y);
        minZ = Math.min(minZ, v1z, v2z, v3z);
        
        maxX = Math.max(maxX, v1x, v2x, v3x);
        maxY = Math.max(maxY, v1y, v2y, v3y);
        maxZ = Math.max(maxZ, v1z, v2z, v3z);
        
        // Calculate tetrahedron volume using the divergence theorem
        const crossX = (v2y - v1y) * (v3z - v1z) - (v2z - v1z) * (v3y - v1y);
        const crossY = (v2z - v1z) * (v3x - v1x) - (v2x - v1x) * (v3z - v1z);
        const crossZ = (v2x - v1x) * (v3y - v1y) - (v2y - v1y) * (v3x - v1x);
        
        const vol = (v1x * crossX + v1y * crossY + v1z * crossZ) / 6.0;
        volumeCm3 += vol;
        
        // Yield to UI thread occasionally for large models
        if (i % CHUNK_SIZE === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Convert to cm³ and ensure positive volume
      volumeCm3 = Math.abs(volumeCm3) / 1000;
      
      // Calculate dimensions
      const dimensions = {
        width: maxX - minX,
        depth: maxY - minY,
        height: maxZ - minZ,
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ]
      };
      
      return { volumeCm3, dimensions };
    } catch (error) {
      console.error('Error processing STL in main thread:', error);
      throw error;
    }
  }
  
  // Read file as array buffer
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  // Change STL orientation
  function changeSTLOrientation(rowId, orientation) {
    // Get row element
    const row = document.getElementById(rowId);
    if (!row || !row.threeJsObjects) {
      console.error(`Row not found or Three.js not initialized: ${rowId}`);
      return;
    }
    
    try {
      // Change 3D model orientation
      const { scene, camera, controls } = row.threeJsObjects;
      if (scene && camera && controls) {
        const newOrientation = changeOrientation(scene, camera, controls, orientation);
        if (newOrientation) {
          row.orientationData = newOrientation;
        }
      }
      
      // Update results with new orientation
      updateSTLResults(rowId);
    } catch (error) {
      console.error(`Error changing orientation for row ${rowId}:`, error);
    }
    updatePrintTimeDisplay();
  }
  
  // Update STL results based on current data
  function updateSTLResults(rowId) {
    // Get row element
    const row = document.getElementById(rowId);
    if (!row) {
      console.error(`Row not found: ${rowId}`);
      return;
    }
    
    try {
      // Get row data
      const volume = row.volumeCm3;
      const orientationData = row.orientationData;
      
      if (!volume || !orientationData) {
        console.error(`Missing volume or orientation data for row ${rowId}`);
        return;
      }
      
      // Get glaze toggle and currency
      const glazeToggle = row.querySelector('.glaze-toggle');
      const includeGlaze = glazeToggle ? glazeToggle.checked : true;
      const currency = document.getElementById('currency').value || 'USD';
      
      // Get dimensions
      const dimensions = {
        width: orientationData.width,
        depth: orientationData.depth,
        height: orientationData.height
      };
      
      // Calculate costs and packing
      const results = calculateCostAndPacking(
        dimensions,
        volume,
        includeGlaze,
        currency
      );
      
      if (!results) {
        console.error(`Calculation failed for row ${rowId}`);
        return;
      }
      
      // Update UI
      updateSTLResultsUI(rowId, results, currency);
    } catch (error) {
      console.error(`Error updating results for row ${rowId}:`, error);
    }
  }
  
  // Update STL results UI
  function updateSTLResultsUI(rowId, results, currency) {
    // Get row element
    const row = document.getElementById(rowId);
    if (!row) {
      console.error(`Row not found: ${rowId}`);
      return;
    }
    
    try {
      // Get UI elements
      const resultsPanel = row.querySelector('.results-panel');
      const totalCostEl = resultsPanel.querySelector('.total-cost');
      const statsGridEl = resultsPanel.querySelector('.stats-grid');
      const progressContainerEl = resultsPanel.querySelector('.progress-container');
      const printer400StatsEl = row.querySelector(`#${rowId}-printer-400-stats`);
      const printer600StatsEl = row.querySelector(`#${rowId}-printer-600-stats`);
      const packing400El = row.querySelector('#packing-400');
      const packing600El = row.querySelector('#packing-600');
      
      // Get currency symbol
      const currencySymbol = currencySymbols[currency] || '$';
      
      // Update total cost
      if (totalCostEl) {
        totalCostEl.textContent = `${currencySymbol}${results.costs.total.toFixed(2)}`;
      }
      
      // Update stats
      if (statsGridEl) {
        const statBoxes = statsGridEl.querySelectorAll('.stat-box');
        if (statBoxes.length >= 2) {
          const volumeValue = statBoxes[0].querySelector('.stat-value');
          const dimensionsValue = statBoxes[1].querySelector('.stat-value');
          
          if (volumeValue) {
            volumeValue.textContent = results.volume.toFixed(2);
          }
          
          if (dimensionsValue) {
            dimensionsValue.textContent = 
              `${results.dimensions.width.toFixed(1)} × ${results.dimensions.depth.toFixed(1)} × ${results.dimensions.height.toFixed(1)}`;
          }
        }
      }
      
      // Update cost breakdown
      if (progressContainerEl) {
        createCostBreakdown(progressContainerEl, results.costs, currency);
      }
      
      // Update printer stats
      if (printer400StatsEl) {
        updatePrinterStats(printer400StatsEl, results.printer400, currencySymbol);
      }
      
      if (printer600StatsEl) {
        updatePrinterStats(printer600StatsEl, results.printer600, currencySymbol);
      }
      
      // Update packing visualizations
      if (packing400El) {
        visualizePacking(
          printer400,
          results.dimensions.width,
          results.dimensions.depth,
          results.dimensions.height,
          results.printer400.positions,
          packing400El
        );
      }
      
      if (packing600El) {
        visualizePacking(
          printer600,
          results.dimensions.width,
          results.dimensions.depth,
          results.dimensions.height,
          results.printer600.positions,
          packing600El
        );
      }
    } catch (error) {
      console.error(`Error updating UI for row ${rowId}:`, error);
    }
  }
  
  // Remove STL row
  function removeSTLRow(rowId) {
    // Get row element
    const row = document.getElementById(rowId);
    if (!row) {
      console.error(`Row not found: ${rowId}`);
      return;
    }
    
    try {
      // Cleanup Three.js if initialized
      if (row.threeJsObjects && row.threeJsObjects.cleanup) {
        row.threeJsObjects.cleanup();
      }
      
      // Remove any visualizer cleanups
      const visualizers = row.querySelectorAll('.packing-visualizer');
      visualizers.forEach(vis => {
        if (vis.cleanup) vis.cleanup();
      });
      
      // Remove row
      row.remove();
    } catch (error) {
      console.error(`Error removing row ${rowId}:`, error);
    }
  }
  
  // Update advanced settings display
  function updateAdvancedSettingsDisplay() {
    // Get current currency
    const currency = document.getElementById('currency').value || 'USD';
    
    // Get pricing data for current currency
    const currencyPricing = pricing[currency] || pricing.USD;
    
    // Update input fields
    const pricePowderInput = document.getElementById('pricePowder');
    const priceBinderInput = document.getElementById('priceBinder');
    const priceSilicaInput = document.getElementById('priceSilica');
    const priceGlazeInput = document.getElementById('priceGlaze');
    
    // Update values (limited to 4 decimal places for display)
    if (pricePowderInput) pricePowderInput.value = currencyPricing.powder.toFixed(4);
    if (priceBinderInput) priceBinderInput.value = currencyPricing.binder.toFixed(4);
    if (priceSilicaInput) priceSilicaInput.value = currencyPricing.silica.toFixed(4);
    if (priceGlazeInput) priceGlazeInput.value = currencyPricing.glaze.toFixed(4);
    
    // Update currency labels
    const currencyLabels = document.querySelectorAll('.input-group-append');
    currencyLabels.forEach(label => {
      label.textContent = currency;
    });
  }
  
  // Update all results after settings change
  function updateAllResults() {
    // Update manual results if visible
    const manualResults = document.getElementById('manual-results');
    if (manualResults && manualResults.style.display !== 'none') {
      calculateManualResults();
    }
    
    // Update all STL rows
    const stlRows = document.querySelectorAll('.stl-row');
    stlRows.forEach(row => {
      if (row.id) {
        updateSTLResults(row.id);
      }
    });
  }
  
  // Initialize manual input handlers
  function initManualInputHandlers() {
    // Calculate button
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', calculateManualResults);
    }
    
    // Glaze toggle
    const glazeToggle = document.getElementById('manual-glazeToggle');
    if (glazeToggle) {
      glazeToggle.addEventListener('change', calculateManualResults);
    }
    
    // Recalculate button
    const recalculateBtn = document.getElementById('recalculateManual');
    if (recalculateBtn) {
      recalculateBtn.addEventListener('click', calculateManualResults);
    }
    
    // Dimension inputs validation
    const volumeInput = document.getElementById('volume');
    const widthInput = document.getElementById('width');
    const depthInput = document.getElementById('depth');
    const heightInput = document.getElementById('height');
    
    [volumeInput, widthInput, depthInput, heightInput].forEach(input => {
      if (input) {
        input.addEventListener('input', validatePositiveNumber);
      }
    });
  }
  
  // Validate positive number input
  function validatePositiveNumber(e) {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value <= 0) {
      e.target.classList.add('invalid');
    } else {
      e.target.classList.remove('invalid');
    }
  }

// Add this to ui-handlers.js or another appropriate file
function setupBatchEventHandlers() {
    const calculateBatchBtn = document.getElementById('calculate-batch');
    if (calculateBatchBtn) {
      calculateBatchBtn.addEventListener('click', function() {
        // Your batch calculation logic
        console.log('Calculate batch clicked');
      });
    }
  }
  
  function setupMaterialEventHandlers() {
    const calculateMaterialsBtn = document.getElementById('calculate-materials');
    if (calculateMaterialsBtn) {
      calculateMaterialsBtn.addEventListener('click', function() {
        // Your material calculation logic
        console.log('Calculate materials clicked');
      });
    }
  }

  // Add or modify in ui-handlers.js
document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', calculateManualResults);
      console.log('Added event listener for manual calculation');
    }
  });