// Direct fix for the print time display
// This approach bypasses existing code and directly manipulates the DOM
// Add this as the FIRST script that loads

// Self-executing function to avoid global namespace pollution
(function() {
    // Function to run when the page is fully loaded
    function initializeFix() {
      console.log('Print time fix initializing...');
      
      // 1. Hide the viewer controls
      addStyleToHead('.viewer-controls { display: none !important; }');
      
      // 2. Create patch for the problematic function
      patchCheckFitsInPrinter();
      
      // 3. Wait for the application to fully initialize (2 seconds)
      setTimeout(function() {
        console.log('Adding print time box...');
        addPrintTimeBox();
        
        // 4. Set up listeners for orientation changes
        setupOrientationListeners();
      }, 2000);
    }
    
    // Add CSS style directly to head
    function addStyleToHead(cssText) {
      const style = document.createElement('style');
      style.textContent = cssText;
      document.head.appendChild(style);
    }
    
    // Patch the problematic function
    function patchCheckFitsInPrinter() {
      // Monitor for script errors
      window.addEventListener('error', function(event) {
        if (event.error && event.error.toString().includes("Cannot read properties of undefined")) {
          console.log('Caught error in checkFitsInPrinter, applying fix');
          injectSafeFunctions();
        }
      });
      
      // Also try to inject the fix proactively
      injectSafeFunctions();
    }
    
    // Inject safe versions of functions
    function injectSafeFunctions() {
      // Safe version of the checkFitsInPrinter function
      window.checkFitsInPrinter = function(dimensions, orientation, printer) {
        // Safety check
        if (!dimensions || !printer) return false;
        
        try {
          // Default orientation to 'flat' if undefined
          orientation = orientation || 'flat';
          
          // Extract dimensions with fallbacks to avoid errors
          const width = dimensions.width || 0;
          const depth = dimensions.depth || 0;
          const height = dimensions.height || 0;
          
          // Extract printer dimensions with fallbacks
          const printerWidth = printer.width || 390;
          const printerDepth = printer.depth || 290;
          const printerHeight = printer.height || 200;
          const wallMargin = window.WALL_MARGIN || 10;
          
          // Determine object dimensions based on orientation
          let objectWidth, objectDepth, objectHeight;
          
          if (orientation === 'vertical') {
            // Vertical: tallest dimension is height
            const dims = [width, depth, height].sort((a, b) => a - b);
            objectWidth = dims[0];  // Smallest dimension
            objectDepth = dims[1];  // Middle dimension
            objectHeight = dims[2]; // Largest dimension
          } else {
            // Flat: shortest dimension is height
            const dims = [width, depth, height].sort((a, b) => a - b);
            objectHeight = dims[0]; // Smallest dimension
            objectDepth = dims[1];  // Middle dimension
            objectWidth = dims[2];  // Largest dimension
          }
          
          // Check if it fits within printer boundaries
          return objectWidth <= (printerWidth - 2 * wallMargin) && 
                 objectDepth <= (printerDepth - 2 * wallMargin) && 
                 objectHeight <= printerHeight;
        } catch (err) {
          console.error('Error in patched checkFitsInPrinter:', err);
          return false;
        }
      };
    }
    
    // Add print time box by directly manipulating the DOM
    function addPrintTimeBox() {
      // Find all STL rows
      document.querySelectorAll('.stl-row').forEach(function(row) {
        // Find the stats grid (container for stat boxes)
        const statsGrid = row.querySelector('.stats-grid');
        if (!statsGrid) return;
        
        // Check if there are already at least two stat boxes
        if (statsGrid.children.length < 2) return;
        
        // Get or create the third stat box for print time
        let printTimeBox = statsGrid.children[2];
        if (!printTimeBox) {
          printTimeBox = document.createElement('div');
          printTimeBox.className = 'stat-box';
          statsGrid.appendChild(printTimeBox);
        }
        
        // Update the print time box content
        updatePrintTimeContent(row, printTimeBox);
      });
    }
    
    // Update print time content
    function updatePrintTimeContent(row, printTimeBox) {
      // Read dimensions from the displayed text
      const dimensionsBox = row.querySelector('.stats-grid').children[1];
      if (!dimensionsBox) return;
      
      const dimensionsText = dimensionsBox.querySelector('.stat-value')?.textContent || '';
      const dimensionsParts = dimensionsText.split('×').map(part => parseFloat(part.trim()));
      
      if (dimensionsParts.length === 3) {
        // Extract dimensions
        const width = dimensionsParts[0];
        const depth = dimensionsParts[1];
        const height = dimensionsParts[2];
        
        // Get current orientation
        const isVertical = row.querySelector('.orientation-btn[data-orientation="vertical"].active') !== null;
        const orientation = isVertical ? 'vertical' : 'flat';
        
        // Define printer models
        const printer400 = { width: 390, depth: 290, height: 200, layerTime: 45 };
        const printer600 = { width: 595, depth: 600, height: 250, layerTime: 35 };
        
        // Create dimensions object
        const dimensions = { width, depth, height };
        
        // Calculate print times
        const fits400 = checkFitsInPrinter(dimensions, orientation, printer400);
        const fits600 = checkFitsInPrinter(dimensions, orientation, printer600);
        
        const time400 = fits400 ? calculatePrintTime(dimensions, orientation, printer400) : '--';
        const time600 = fits600 ? calculatePrintTime(dimensions, orientation, printer600) : '--';
        
        // Update box content
        printTimeBox.innerHTML = `
          <div class="stat-value">${time400} / ${time600}</div>
          <div class="stat-label">Print Time (400/600)</div>
        `;
      } else {
        // Default content if dimensions not found
        printTimeBox.innerHTML = `
          <div class="stat-value">-- / --</div>
          <div class="stat-label">Print Time (400/600)</div>
        `;
      }
    }
    
    // Calculate print time based on dimensions and printer
    function calculatePrintTime(dimensions, orientation, printer) {
      try {
        const layerHeight = 0.1; // mm
        
        // Determine print height based on orientation
        let printHeight;
        if (orientation === 'vertical') {
          // Vertical: use tallest dimension
          printHeight = Math.max(dimensions.width, dimensions.depth, dimensions.height);
        } else {
          // Flat: use shortest dimension
          printHeight = Math.min(dimensions.width, dimensions.depth, dimensions.height);
        }
        
        // Calculate number of layers
        const layers = Math.ceil(printHeight / layerHeight);
        
        // Calculate print time in seconds
        const timeSeconds = layers * printer.layerTime;
        
        // Format time
        const hours = Math.floor(timeSeconds / 3600);
        const minutes = Math.floor((timeSeconds % 3600) / 60);
        
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      } catch (err) {
        console.error('Error calculating print time:', err);
        return '--';
      }
    }
    
    // Set up listeners for orientation changes
    function setupOrientationListeners() {
      document.addEventListener('click', function(event) {
        // Check if an orientation button was clicked
        const orientationBtn = event.target.closest('.orientation-btn');
        if (orientationBtn) {
          // Allow some time for the application to update
          setTimeout(function() {
            // Find the parent STL row
            const row = orientationBtn.closest('.stl-row');
            if (row) {
              // Find the print time box
              const printTimeBox = row.querySelector('.stats-grid')?.children[2];
              if (printTimeBox) {
                // Update the print time content
                updatePrintTimeContent(row, printTimeBox);
              }
            }
          }, 100);
        }
      });
    }
    
    // Run the fix on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeFix);
    } else {
      initializeFix();
    }
  })();