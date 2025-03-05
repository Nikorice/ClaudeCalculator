// This script fixes the variable declaration conflicts and adds a minimal STL loader

// ============== CORE CONSTANTS (Refactored) ==============
// Define variables without using const to allow redefinition if needed
window.POWDER_KG_PER_CM3 = 0.002; // 2g per cm³
window.BINDER_ML_PER_CM3 = 0.27; // 270ml per liter
window.SILICA_G_PER_CM3 = 0.55; // 0.55g per cm³
window.WALL_MARGIN = 10; // mm
window.OBJECT_SPACING = 15; // mm

// Material constants
window.POWDER_KG_PER_CM3 = 0.002; // 2g per cm³
window.BINDER_ML_PER_CM3 = 0.27; // 270ml per liter
window.SILICA_G_PER_CM3 = 0.55; // 0.55g per cm³

// Printer specifications
window.printer400 = {
  name: "Printer 400",
  width: 390,
  depth: 290,
  height: 200,
  layerTime: 45 // seconds per 0.1mm layer
};

window.printer600 = {
  name: "Printer 600",
  width: 595,
  depth: 600,
  height: 250,
  layerTime: 35 // seconds per 0.1mm layer
};

// Default pricing data for different currencies
window.pricing = {
  EUR: { powder: 92.857, binder: 0.085, silica: 0.069, glaze: 88/9000 },
  USD: { powder: 100, binder: 0.09, silica: 0.072, glaze: 91/9000 },
  JPY: { powder: 200000/14, binder: 250000/20000, silica: 11, glaze: 14000/9000 },
  SGD: { powder: 135, binder: 0.12, silica: 0.10, glaze: 0.01365 }
};

// Currency symbols for display
window.currencySymbols = {
  EUR: '€',
  USD: '$',
  JPY: '¥',
  SGD: 'S$'
};

// Simple notification function to replace the missing one
window.showNotification = function(title, message, type, duration) {
  console.log(`Notification (${type}): ${title} - ${message}`);
  // Create a simple notification div
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '9999';
  notification.style.maxWidth = '300px';
  
  // Set color based on type
  if (type === 'error') {
    notification.style.backgroundColor = '#ef4444';
  } else if (type === 'success') {
    notification.style.backgroundColor = '#10b981';
  } else {
    notification.style.backgroundColor = '#3b82f6';
  }
  
  notification.style.color = 'white';
  notification.innerHTML = `<strong>${title}</strong><br>${message}`;
  
  document.body.appendChild(notification);
  
  // Remove after duration
  setTimeout(() => {
    notification.remove();
  }, duration || 3000);
};

// Calculate glaze usage based on volume
window.calculateGlazeUsage = function(volumeCm3) {
  return 0.1615 * volumeCm3 + 31.76; // grams
};

// Format file size
window.formatFileSize = function(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Format time
window.formatPrintTime = function(seconds) {
  if (isNaN(seconds) || seconds === "N/A") return "N/A";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Generate unique ID
window.createUniqueId = function() {
  return 'row-' + Math.random().toString(36).substr(2, 9);
};

// ============== TAB NAVIGATION ==============
// Fix tab navigation
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Remove active class from all buttons and tabs
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to current button and tab
      btn.classList.add('active');
      const tabElement = document.getElementById(`${tabId}-tab`);
      if (tabElement) {
        tabElement.classList.add('active');
      }
    });
  });
}

// ============== STL UPLOAD FUNCTIONALITY ==============
// Basic STL file upload handling
function initSTLUpload() {
  // Add new STL button
  const addNewStlBtn = document.getElementById('addNewStl') || document.querySelector('.new-stl-btn');
  if (addNewStlBtn) {
    addNewStlBtn.addEventListener('click', () => {
      createSTLRow();
    });
  }
  
  // Create initial STL row if none exists
  const stlRows = document.getElementById('stlRows');
  if (stlRows && stlRows.children.length === 0) {
    createSTLRow();
  }
}

// Create a new STL row
function createSTLRow() {
  // Create row ID
  const rowId = createUniqueId();
  
  // Get STL rows container
  const stlRows = document.getElementById("stlRows");
  if (!stlRows) {
    console.error('STL rows container not found');
    return null;
  }
  
  try {
    // Create the new row
    const newRow = document.createElement('div');
    newRow.className = 'stl-row card';
    newRow.id = rowId;
    
    newRow.innerHTML = `
      <div class="stl-col">
        <div class="upload-area">
          <div class="upload-icon">
            <span class="material-icon">cloud_upload</span>
          </div>
          <p><strong>Click or drag to upload STL</strong></p>
          <p>Supports binary STL files</p>
          <p class="upload-limits">Maximum file size: 100MB</p>
        </div>
        <input type="file" accept=".stl" style="display: none;">
        
        <div class="model-viewer" style="display: none;">
          <div class="model-viewer-loading">
            <div class="spinner"></div>
            <div>Loading model...</div>
            <div class="model-viewer-loading-progress">
              <div class="model-viewer-loading-bar" style="width: 0%"></div>
            </div>
          </div>
        </div>
        
        <div class="orientation-toggle" style="display: none;">
          <button type="button" class="orientation-btn active" data-orientation="flat">
            <span class="material-icon">crop_landscape</span> Flat
          </button>
          <button type="button" class="orientation-btn" data-orientation="vertical">
            <span class="material-icon">crop_portrait</span> Vertical
          </button>
        </div>
      </div>
      
      <div class="stl-col">
        <div class="results-panel" style="display: none;">
          <h3>
            <span class="material-icon">analytics</span>
            Cost Analysis
          </h3>
          <div class="error-message" style="display: none;"></div>
          <div class="loading-message">
            <div class="spinner"></div>
            Processing STL file...
          </div>
          <div class="total-cost">--</div>
          
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-value">--</div>
              <div class="stat-label">Volume (cm³)</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">--</div>
              <div class="stat-label">Dimensions (mm)</div>
            </div>
          </div>
          
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox" class="glaze-toggle" checked>
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">Apply Glaze</span>
          </div>
          
          <div class="progress-container"></div>
          
          <h3>
            <span class="material-icon">view_in_ar</span>
            Printer Capacity
          </h3>
          <div class="printer-cards">
            <div class="printer-card">
              <div class="printer-title">Printer 400</div>
              <div class="printer-stats" id="${rowId}-printer-400-stats">
                <p>Calculating...</p>
              </div>
            </div>
            <div class="printer-card">
              <div class="printer-title">Printer 600</div>
              <div class="printer-stats" id="${rowId}-printer-600-stats">
                <p>Calculating...</p>
              </div>
            </div>
          </div>
          
          <div class="row-actions">
            <button class="btn btn-danger remove-stl-btn">
              <span class="material-icon">delete</span> Remove
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add row to container
    stlRows.appendChild(newRow);
    
    // Set up event listeners
    setupSTLRowEventListeners(rowId);
    
    return rowId;
  } catch (error) {
    console.error('Error creating STL row:', error);
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
    const resultsPanel = row.querySelector('.results-panel');
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
    
    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        row.remove();
      });
    }
  } catch (error) {
    console.error(`Error setting up event listeners for row ${rowId}:`, error);
  }
}

// Handle STL file upload (simplified version)
function handleSTLFileUpload(rowId, file) {
  // Get row element
  const row = document.getElementById(rowId);
  if (!row) {
    console.error(`Row not found: ${rowId}`);
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
      showNotification('Error', 'Please upload a valid STL file', 'error', 3000);
      return;
    }
    
    // Show loading state
    if (uploadArea) uploadArea.style.display = 'none';
    if (modelViewer) modelViewer.style.display = 'block';
    if (modelViewerLoading) modelViewerLoading.style.display = 'flex';
    if (resultsPanel) resultsPanel.style.display = 'block';
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    
    // For now, just read the file and show a success message
    // In a real implementation, we would process the STL file here
    const reader = new FileReader();
    reader.onload = function(e) {
      // Show success message
      if (loadingMessage) loadingMessage.style.display = 'none';
      if (orientationToggle) orientationToggle.style.display = 'flex';
      
      // Set some dummy values
      row.querySelector('.total-cost').textContent = '$25.50';
      row.querySelectorAll('.stat-value')[0].textContent = '100.00';
      row.querySelectorAll('.stat-value')[1].textContent = '50.0 × 50.0 × 50.0';
      
      showNotification('Success', 'STL file loaded successfully', 'success', 3000);
    };
    
    reader.onerror = function(e) {
      // Show error message
      if (errorMessage) {
        errorMessage.textContent = 'Error reading STL file';
        errorMessage.style.display = 'block';
      }
      if (loadingMessage) loadingMessage.style.display = 'none';
      
      showNotification('Error', 'Failed to read STL file', 'error', 3000);
    };
    
    // Start reading the file
    reader.readAsArrayBuffer(file);
    
  } catch (error) {
    console.error(`Error handling STL upload for row ${rowId}:`, error);
    showNotification('Error', 'An unexpected error occurred', 'error', 3000);
  }
}

// ============== MANUAL INPUT FUNCTIONALITY ==============
function initManualInput() {
  const calculateBtn = document.getElementById('calculateBtn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateManualResults);
  }
  
  const glazeToggle = document.getElementById('manual-glazeToggle');
  if (glazeToggle) {
    glazeToggle.addEventListener('change', calculateManualResults);
  }
}

// Calculate manual results
function calculateManualResults() {
  try {
    // Get input values
    const volume = parseFloat(document.getElementById("volume").value);
    const width = parseFloat(document.getElementById("width").value);
    const depth = parseFloat(document.getElementById("depth").value);
    const height = parseFloat(document.getElementById("height").value);
    
    // Validate inputs
    if (isNaN(volume) || isNaN(width) || isNaN(depth) || isNaN(height) ||
        volume <= 0 || width <= 0 || depth <= 0 || height <= 0) {
      showNotification('Error', 'Please enter valid positive numbers for all dimensions and volume.', 'error', 3000);
      return;
    }
    
    // Get glaze setting and currency
    const includeGlaze = document.getElementById("manual-glazeToggle").checked;
    const currency = document.getElementById("currency").value;
    
    // Show results
    const manualResults = document.getElementById('manual-results');
    if (manualResults) manualResults.style.display = 'block';
    
    // Update display (simple implementation)
    document.getElementById("manual-total-cost").textContent = `${currencySymbols[currency]}${(volume * 0.255).toFixed(2)}`;
    document.getElementById("volume-display").textContent = volume.toFixed(2);
    document.getElementById("dimensions-display").textContent = `${width.toFixed(1)} × ${depth.toFixed(1)} × ${height.toFixed(1)}`;
    document.getElementById("material-weight-display").textContent = `${(volume * 2.55).toFixed(1)}g`;
    document.getElementById("print-time-display").textContent = formatPrintTime(Math.ceil(height / 0.1) * 45);
    
    showNotification('Success', 'Calculation complete', 'success', 3000);
  } catch (error) {
    console.error('Error in manual calculation:', error);
    showNotification('Error', 'An unexpected error occurred during calculation.', 'error', 3000);
  }
}

// ============== SETTINGS FUNCTIONALITY ==============
function initSettings() {
  // Apply settings button
  const applySettingsBtn = document.getElementById('updateSettings');
  if (applySettingsBtn) {
    applySettingsBtn.addEventListener('click', () => {
      // Get values from inputs
      const wallMargin = parseInt(document.getElementById('wallMargin')?.value) || 10;
      const objectSpacing = parseInt(document.getElementById('objectSpacing')?.value) || 15;
      
      // Update global variables
      window.WALL_MARGIN = wallMargin;
      window.OBJECT_SPACING = objectSpacing;
      
      showNotification('Settings Updated', 'Printer settings have been updated.', 'success', 3000);
    });
  }
  
  // Currency selector
  const currencySelect = document.getElementById('currency');
  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      const currency = currencySelect.value;
      // Update any visible costs
      updateCurrencyDisplay(currency);
    });
  }
}

// Update currency display
function updateCurrencyDisplay(currency) {
  // Update any currency displays
  const symbol = currencySymbols[currency] || '$';
  
  // Just a simple implementation for demonstration
  console.log(`Currency changed to ${currency} (${symbol})`);
}

// ============== INITIALIZATION ==============
// Main initialization function
function initApp() {
  console.log('Initializing 3D Printer Calculator...');
  
  // Initialize tab navigation
  initTabNavigation();
  
  // Initialize STL upload
  initSTLUpload();
  
  // Initialize manual input
  initManualInput();
  
  // Initialize settings
  initSettings();
  
  console.log('Initialization complete');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);