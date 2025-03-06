// Direct fix for the error in calculation-engine.js

// This script should be placed at the beginning of your JavaScript code
// It patches the problematic function causing the TypeError

(function() {
    // First, hide the viewer controls
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .viewer-controls { display: none !important; }
    `;
    document.head.appendChild(styleElement);
  
    // Create a simple version of the problematic function
    window.checkFitsInPrinter = function(dimensions, orientation, printer) {
      // Safety check - if dimensions is undefined, return false
      if (!dimensions) return false;
      
      // Extract width, depth, height safely
      const width = dimensions.width || 0;
      const depth = dimensions.depth || 0;
      const height = dimensions.height || 0;
      
      // Define fallback values for printer if it's undefined
      const printerWidth = printer?.width || 390;
      const printerDepth = printer?.depth || 290;
      const printerHeight = printer?.height || 200;
      const wallMargin = 10; // Default wall margin
      
      let objectWidth, objectDepth, objectHeight;
      
      if (orientation === 'vertical') {
        // Vertical orientation - longest dimension is height
        const dims = [width, depth, height].sort((a, b) => a - b);
        objectWidth = dims[0];
        objectDepth = dims[1];
        objectHeight = dims[2];
      } else {
        // Flat orientation - shortest dimension is height
        const dims = [width, depth, height].sort((a, b) => a - b);
        objectHeight = dims[0];
        objectWidth = dims[2];
        objectDepth = dims[1];
      }
      
      // Check if it fits in printer boundaries
      return objectWidth <= (printerWidth - 2 * wallMargin) && 
             objectDepth <= (printerDepth - 2 * wallMargin) &&
             objectHeight <= printerHeight;
    };
  
    // Create our own implementation of updatePrintTimeDisplay
    window.createPrintTimeDisplay = function() {
      // Wait for the page to fully load
      setTimeout(function() {
        // Find all STL rows
        const rows = document.querySelectorAll('.stl-row');
        
        rows.forEach(row => {
          const statsGrid = row.querySelector('.stats-grid');
          if (!statsGrid) return;
          
          // Get or create the third stat box
          let printTimeBox = statsGrid.children[2];
          if (!printTimeBox) {
            printTimeBox = document.createElement('div');
            printTimeBox.className = 'stat-box';
            statsGrid.appendChild(printTimeBox);
          }
          
          // Get dimensions from the displayed text
          const dimensionsBox = statsGrid.children[1];
          if (!dimensionsBox) return;
          
          const dimensionsText = dimensionsBox.querySelector('.stat-value')?.textContent || '';
          const dimensionsParts = dimensionsText.split('×').map(part => parseFloat(part.trim()));
          
          if (dimensionsParts.length === 3) {
            const width = dimensionsParts[0];
            const depth = dimensionsParts[1];
            const height = dimensionsParts[2];
            
            // Create dimensions object
            const dimensions = { width, depth, height };
            
            // Get current orientation
            const isVertical = row.querySelector('.orientation-btn[data-orientation="vertical"].active') !== null;
            const orientation = isVertical ? 'vertical' : 'flat';
            
            // Define printer models
            const printer400 = { width: 390, depth: 290, height: 200, layerTime: 45 };
            const printer600 = { width: 595, depth: 600, height: 250, layerTime: 35 };
            
            // Check if object fits in each printer
            const fits400 = window.checkFitsInPrinter(dimensions, orientation, printer400);
            const fits600 = window.checkFitsInPrinter(dimensions, orientation, printer600);
            
            // Calculate print times
            const time400 = fits400 ? calculatePrintTime(dimensions, orientation, printer400) : '--';
            const time600 = fits600 ? calculatePrintTime(dimensions, orientation, printer600) : '--';
            
            // Update the print time box
            printTimeBox.innerHTML = `
              <div class="stat-value">${time400} / ${time600}</div>
              <div class="stat-label">Print Time (400/600)</div>
            `;
          }
        });
      }, 1000); // Wait 1 second for page to be ready
    };
    
    // Calculate print time helper function
    function calculatePrintTime(dimensions, orientation, printer) {
      const layerHeight = 0.1; // mm
      
      let printHeight;
      if (orientation === 'vertical') {
        // Use longest dimension
        printHeight = Math.max(dimensions.width, dimensions.depth, dimensions.height);
      } else {
        // Use shortest dimension
        printHeight = Math.min(dimensions.width, dimensions.depth, dimensions.height);
      }
      
      const layers = Math.ceil(printHeight / layerHeight);
      const printTimeSeconds = layers * printer.layerTime;
      
      // Format time
      const hours = Math.floor(printTimeSeconds / 3600);
      const minutes = Math.floor((printTimeSeconds % 3600) / 60);
      
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    
    // Call our function when document is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.createPrintTimeDisplay);
    } else {
      window.createPrintTimeDisplay();
    }
    
    // Also call when orientation changes
    document.addEventListener('click', function(event) {
      if (event.target.closest('.orientation-btn')) {
        setTimeout(window.createPrintTimeDisplay, 200);
      }
    });
  })();