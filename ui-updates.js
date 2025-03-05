/* UI Updates and Integration for 3D Printer Calculator */

// Add batch processing tab and functionality
function addBatchProcessingFeatures() {
    // Check if batch tab already exists first
    if (document.querySelector('[data-tab="batch"]')) {
      console.log('Batch processing tab already exists, skipping creation');
      return;
    }
    
    // Create batch tab in tab-nav
    const tabNav = document.querySelector('.tab-nav');
    if (tabNav) {
      const batchTabBtn = document.createElement('button');
      batchTabBtn.className = 'tab-btn';
      batchTabBtn.setAttribute('data-tab', 'batch');
      batchTabBtn.textContent = 'Batch Processing';
      tabNav.appendChild(batchTabBtn);
      
      // Add click handler
      batchTabBtn.addEventListener('click', () => {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to batch tab
        batchTabBtn.classList.add('active');
        
        // Show batch tab content
        const batchTab = document.getElementById('batch-tab');
        if (batchTab) {
          batchTab.classList.add('active');
        }
      });
    }
    
    // Check if batch content already exists
    if (document.getElementById('batch-tab')) {
      console.log('Batch tab content already exists, skipping creation');
      return;
    }
    
    // Create batch tab content
    const container = document.querySelector('.container');
    if (container) {
      const batchTab = document.createElement('div');
      batchTab.id = 'batch-tab';
      batchTab.className = 'tab-content';
      
      batchTab.innerHTML = `
        <div class="card">
          <h3>
            <span class="material-icon">view_in_ar</span>
            Batch Configuration
          </h3>
          <div class="form-group">
            <label>Printer Model</label>
            <div class="printer-selection">
              <button class="printer-model active" data-printer="400">Printer 400</button>
              <button class="printer-model" data-printer="600">Printer 600</button>
            </div>
          </div>
          <div class="form-group">
            <label for="batch-strategy">Packing Strategy</label>
            <select id="batch-strategy" class="form-control">
              <option value="compact">Compact (Maximize density)</option>
              <option value="layers">Layer-based (Minimize height)</option>
              <option value="speed">Speed-optimized (Minimize print time)</option>
            </select>
          </div>
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox" id="batch-auto-orientation" checked>
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">Optimize orientation automatically</span>
          </div>
          <button id="calculate-batch" class="btn btn-primary">
            <span class="material-icon">play_arrow</span> Calculate Batch
          </button>
        </div>
        
        <div class="batch-results" style="display: none;">
          <div class="card">
            <h3>
              <span class="material-icon">analytics</span>
              Batch Analysis
            </h3>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value" id="batch-total-items">0</div>
                <div class="stat-label">Total Items</div>
              </div>
              <div class="stat-box">
                <div class="stat-value" id="batch-packed-items">0</div>
                <div class="stat-label">Packed Items</div>
              </div>
              <div class="stat-box">
                <div class="stat-value" id="batch-batches">0</div>
                <div class="stat-label">Batches</div>
              </div>
              <div class="stat-box">
                <div class="stat-value" id="batch-print-time">0h 0m</div>
                <div class="stat-label">Total Print Time</div>
              </div>
            </div>
            
            <div class="batch-efficiency">
              <div class="batch-efficiency-label">
                <span>Packing Efficiency</span>
                <span id="batch-efficiency-percentage">0%</span>
              </div>
              <div class="batch-efficiency-bar">
                <div class="batch-efficiency-fill" style="width: 0%"></div>
              </div>
            </div>
            
            <div class="total-cost" id="batch-total-cost">$0.00</div>
          </div>
          
          <div class="card">
            <h3>
              <span class="material-icon">dashboard</span>
              Batch Visualization
            </h3>
            <div id="batch-visualization-container"></div>
          </div>
        </div>
      `;
      
      container.appendChild(batchTab);
      
      // Set up event handlers
      setupBatchEventHandlers();
    }
  }
  
  // Add advanced material estimation tab
  function addAdvancedMaterialFeatures() {
    // Check if material tab already exists first
    if (document.querySelector('[data-tab="material"]')) {
      console.log('Material analysis tab already exists, skipping creation');
      return;
    }
    
    // Create advanced material tab in tab-nav
    const tabNav = document.querySelector('.tab-nav');
    if (tabNav) {
      const materialTabBtn = document.createElement('button');
      materialTabBtn.className = 'tab-btn';
      materialTabBtn.setAttribute('data-tab', 'material');
      materialTabBtn.textContent = 'Material Analysis';
      tabNav.appendChild(materialTabBtn);
      
      // Add click handler
      materialTabBtn.addEventListener('click', () => {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to material tab
        materialTabBtn.classList.add('active');
        
        // Show material tab content
        const materialTab = document.getElementById('material-tab');
        if (materialTab) {
          materialTab.classList.add('active');
        }
      });
    }
    
    // Check if material content already exists
    if (document.getElementById('material-tab')) {
      console.log('Material tab content already exists, skipping creation');
      return;
    }
    
    // Create material tab content
    const container = document.querySelector('.container');
    if (container) {
      const materialTab = document.createElement('div');
      materialTab.id = 'material-tab';
      materialTab.className = 'tab-content';
      
      materialTab.innerHTML = `
        <!-- Material tab content remains the same -->
        <div class="card">
          <h3>
            <span class="material-icon">science</span>
            Advanced Material Settings
          </h3>
          <div class="material-settings">
            <div class="form-group">
              <label for="powder-density">Powder Density (g/cm³)</label>
              <input type="number" id="powder-density" min="0.1" step="0.1" value="2.0">
            </div>
            <div class="form-group">
              <label for="binder-ratio">Binder Ratio (ml/cm³)</label>
              <input type="number" id="binder-ratio" min="0.01" step="0.01" value="0.27">
            </div>
            <div class="form-group">
              <label for="silica-density">Silica Density (g/cm³)</label>
              <input type="number" id="silica-density" min="0.1" step="0.1" value="0.55">
            </div>
            <div class="form-group">
              <label for="glaze-formula">Glaze Formula</label>
              <select id="glaze-formula" class="form-control">
                <option value="standard">Standard</option>
                <option value="economic">Economic</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div class="form-group custom-glaze-settings" style="display: none;">
              <label for="glaze-thickness">Glaze Thickness (mm)</label>
              <input type="number" id="glaze-thickness" min="0.05" step="0.05" value="0.2">
            </div>
            <div class="toggle-container">
              <label class="toggle-switch">
                <input type="checkbox" id="include-supports">
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">Include support material in calculations</span>
            </div>
            <div class="form-group support-settings" style="display: none;">
              <label for="support-density">Support Density (%)</label>
              <input type="number" id="support-density" min="10" max="100" step="5" value="30">
            </div>
          </div>
          <button id="calculate-materials" class="btn btn-primary">
            <span class="material-icon">calculate</span> Calculate Materials
          </button>
        </div>
        
        <div class="card material-results" style="display: none;">
          <h3>
            <span class="material-icon">analytics</span>
            Material Analysis
          </h3>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-value" id="total-volume">0.00</div>
              <div class="stat-label">Volume (cm³)</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" id="surface-area">0.00</div>
              <div class="stat-label">Surface Area (cm²)</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" id="total-weight">0</div>
              <div class="stat-label">Weight (g)</div>
            </div>
            <div class="stat-box">
              <div class="stat-value" id="support-volume">0.00</div>
              <div class="stat-label">Support Volume (cm³)</div>
            </div>
          </div>
          
          <h4>Material Breakdown</h4>
          <div class="material-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Main</th>
                  <th>Support</th>
                  <th>Waste</th>
                  <th>Total</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr id="powder-row">
                  <td>Powder</td>
                  <td>0.00 kg</td>
                  <td>0.00 kg</td>
                  <td>0.00 kg</td>
                  <td>0.00 kg</td>
                  <td>$0.00</td>
                </tr>
                <tr id="binder-row">
                  <td>Binder</td>
                  <td>0.00 ml</td>
                  <td>0.00 ml</td>
                  <td>0.00 ml</td>
                  <td>0.00 ml</td>
                  <td>$0.00</td>
                </tr>
                <tr id="silica-row">
                  <td>Silica</td>
                  <td>0.00 g</td>
                  <td>0.00 g</td>
                  <td>0.00 g</td>
                  <td>0.00 g</td>
                  <td>$0.00</td>
                </tr>
                <tr id="glaze-row">
                  <td>Glaze</td>
                  <td>0.00 g</td>
                  <td>-</td>
                  <td>0.00 g</td>
                  <td>0.00 g</td>
                  <td>$0.00</td>
                </tr>
              </tbody>
              <tfoot>
                <tr id="total-row">
                  <td colspan="4">Total</td>
                  <td>-</td>
                  <td>$0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div class="material-chart-container">
            <canvas id="material-chart"></canvas>
          </div>
          
          <div class="material-actions">
            <button id="export-material-report" class="btn btn-primary">
              <span class="material-icon">download</span> Export Report
            </button>
          </div>
        </div>
      `;
      
      container.appendChild(materialTab);
      
      // Set up event handlers
      setupMaterialEventHandlers();
    }
  }
  
  // Fix the tab navigation to ensure only unique tabs exist
  function fixTabNavigation() {
    // Get all tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabIds = new Set();
    
    // Remove duplicates
    tabBtns.forEach(btn => {
      const tabId = btn.getAttribute('data-tab');
      if (tabIds.has(tabId)) {
        // This is a duplicate, remove it
        btn.remove();
      } else {
        tabIds.add(tabId);
      }
    });
    
    // Get all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
      const tabId = tab.id.replace('-tab', '');
      // If no corresponding button, remove this tab content
      if (!document.querySelector(`[data-tab="${tabId}"]`)) {
        tab.remove();
      }
    });
  }
  
  // Initialize UI enhancements
  function initUIEnhancements() {
    // Fix any duplicate tabs first
    fixTabNavigation();
    
    // Add batch processing features
    addBatchProcessingFeatures();
    
    // Add advanced material features
    addAdvancedMaterialFeatures();
    
    // Enhance STL upload with improved visualization
    enhanceSTLUpload();
  }
  
  // Enhance STL upload with improved visualization
  function enhanceSTLUpload() {
    // Rest of the function remains the same...
  }
  
  // Rest of your functions remain the same...
  
  // Modify your initialization to ensure it runs only once
  let uiEnhancementsInitialized = false;
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for main app initialization
    setTimeout(() => {
      if (!uiEnhancementsInitialized) {
        initUIEnhancements();
        uiEnhancementsInitialized = true;
        console.log('UI enhancements initialized');
      }
    }, 500);
  });