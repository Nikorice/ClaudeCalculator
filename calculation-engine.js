/* Calculation Engine for 3D Printer Calculator */

// Calculate cost and packing for a given object
function calculateCostAndPacking(dimensions, volume, applyGlaze = true, currency = 'USD') {
    perfMonitor.start('costCalculation');
    
    try {
      // Validate inputs
      if (!dimensions || !volume || isNaN(volume) || volume <= 0) {
        throw new Error('Invalid dimensions or volume');
      }
      
      const { width, depth, height } = dimensions;
      if (isNaN(width) || isNaN(depth) || isNaN(height) || 
          width <= 0 || depth <= 0 || height <= 0) {
        throw new Error('Invalid dimensions');
      }
      
      // Get pricing for selected currency
      const currencyPricing = pricing[currency] || pricing.USD;
      
      // Calculate material quantities
      const powderKg = volume * POWDER_KG_PER_CM3;
      const binderMl = volume * BINDER_ML_PER_CM3;
      const silicaG = volume * SILICA_G_PER_CM3;
      const glazeG = applyGlaze ? calculateGlazeUsage(volume) : 0;
      
      // Calculate component costs
      const costPowder = powderKg * currencyPricing.powder;
      const costBinder = binderMl * currencyPricing.binder;
      const costSilica = silicaG * currencyPricing.silica;
      const costGlaze = glazeG * currencyPricing.glaze;
      
      // Calculate total cost
      const totalCost = costPowder + costBinder + costSilica + costGlaze;
      
      // Calculate printer packing
      const printer400Packing = calculatePrinterPacking(
        width, depth, height, printer400
      );
      
      const printer600Packing = calculatePrinterPacking(
        width, depth, height, printer600
      );
      
      // Calculate print times
      let printTime400 = 'N/A';
      if (printer400Packing.fitsInPrinter) {
        const layers400 = Math.ceil(printer400Packing.height / 0.1); // 0.1mm layer height
        printTime400 = layers400 * printer400.layerTime;
      }
      
      let printTime600 = 'N/A';
      if (printer600Packing.fitsInPrinter) {
        const layers600 = Math.ceil(printer600Packing.height / 0.1);
        printTime600 = layers600 * printer600.layerTime;
      }
      
      // Calculate batch costs
      const batchCost400 = printer400Packing.fitsInPrinter 
        ? printer400Packing.totalObjects * totalCost 
        : 0;
      
      const batchCost600 = printer600Packing.fitsInPrinter 
        ? printer600Packing.totalObjects * totalCost 
        : 0;
      
      // Prepare result object
      const result = {
        dimensions: { width, depth, height },
        volume,
        materialUsage: {
          powder: powderKg,
          binder: binderMl,
          silica: silicaG,
          glaze: glazeG
        },
        costs: {
          powder: costPowder,
          binder: costBinder,
          silica: costSilica,
          glaze: costGlaze,
          total: totalCost
        },
        printer400: {
          ...printer400Packing,
          printTime: printTime400,
          batchCost: batchCost400
        },
        printer600: {
          ...printer600Packing,
          printTime: printTime600,
          batchCost: batchCost600
        }
      };
      
      perfMonitor.end('costCalculation');
      return result;
    } catch (error) {
      console.error('Error in cost calculation:', error);
      perfMonitor.end('costCalculation');
      return null;
    }
  }
  
  // Calculate how many objects fit in a printer with specified dimensions
  function calculatePrinterPacking(width, depth, height, printer) {
    perfMonitor.start('printerPacking');
    
    try {
      // Check if object fits in printer at all
      if (width > printer.width - (2 * WALL_MARGIN) || 
          depth > printer.depth - (2 * WALL_MARGIN) || 
          height > printer.height) {
        return {
          fitsInPrinter: false,
          countX: 0,
          countY: 0,
          countZ: 0,
          totalObjects: 0,
          arrangement: '0 × 0 × 0',
          positions: []
        };
      }
      
      // Calculate available space
      const availableWidth = printer.width - (2 * WALL_MARGIN);
      const availableDepth = printer.depth - (2 * WALL_MARGIN);
      
      // Calculate how many objects fit in XY plane with spacing
      const countX = Math.floor((availableWidth + OBJECT_SPACING) / (width + OBJECT_SPACING));
      const countY = Math.floor((availableDepth + OBJECT_SPACING) / (depth + OBJECT_SPACING));
      
      // Calculate Z stacking (no spacing on top - we can stack as many as will fit)
      const countZ = Math.floor(printer.height / height);
      
      // Total objects
      const totalObjects = countX * countY * countZ;
      
      // Generate positions
      const positions = generateObjectPositions(width, depth, height, countX, countY, countZ);
      
      // Total height
      const totalHeight = countZ * height;
      
      perfMonitor.end('printerPacking');
      
      return {
        fitsInPrinter: true,
        countX,
        countY,
        countZ,
        totalObjects,
        arrangement: `${countX} × ${countY} × ${countZ}`,
        positions,
        width: printer.width,
        depth: printer.depth,
        height: totalHeight
      };
    } catch (error) {
      console.error('Error in printer packing calculation:', error);
      perfMonitor.end('printerPacking');
      return {
        fitsInPrinter: false,
        countX: 0,
        countY: 0,
        countZ: 0,
        totalObjects: 0,
        arrangement: '0 × 0 × 0',
        positions: []
      };
    }
  }
  
  // Generate positions for objects in printer
  function generateObjectPositions(width, depth, height, countX, countY, countZ) {
    const positions = [];
    
    for (let z = 0; z < countZ; z++) {
      const zPos = z * height;
      
      for (let y = 0; y < countY; y++) {
        const yPos = y * (depth + OBJECT_SPACING);
        
        for (let x = 0; x < countX; x++) {
          const xPos = x * (width + OBJECT_SPACING);
          
          positions.push({
            x: xPos,
            y: yPos,
            z: zPos
          });
        }
      }
    }
    
    return positions;
  }
  
  // Check if a model fits in printer with given orientation
  function checkFitsInPrinter(width, depth, height, printer) {
    // Check if model fits with normal orientation
    if (width <= (printer.width - 2 * WALL_MARGIN) && 
        depth <= (printer.depth - 2 * WALL_MARGIN) && 
        height <= printer.height) {
      return true;
    }
    
    // Check if model fits with 90° rotation in XY plane
    if (depth <= (printer.width - 2 * WALL_MARGIN) && 
        width <= (printer.depth - 2 * WALL_MARGIN) && 
        height <= printer.height) {
      return true;
    }
    
    return false;
  }
  
  // Calculate costs for manual input
  function calculateManualResults() {
    perfMonitor.start('manualCalculation');
    
    try {
      // Get input values
      const volume = parseFloat(document.getElementById("volume").value);
      const width = parseFloat(document.getElementById("width").value);
      const depth = parseFloat(document.getElementById("depth").value);
      const height = parseFloat(document.getElementById("height").value);
      
      // Validate inputs
      if (isNaN(volume) || isNaN(width) || isNaN(depth) || isNaN(height) ||
          volume <= 0 || width <= 0 || depth <= 0 || height <= 0) {
        showValidationError(
          document.getElementById("manual-tab"),
          "Please enter valid positive numbers for all dimensions and volume."
        );
        perfMonitor.end('manualCalculation');
        return;
      }
      
      // Get glaze setting and currency
      const includeGlaze = document.getElementById("manual-glazeToggle").checked;
      const currency = document.getElementById("currency").value;
      
      // Calculate costs and packing
      const result = calculateCostAndPacking(
        { width, depth, height },
        volume,
        includeGlaze,
        currency
      );
      
      if (!result) {
        showValidationError(
          document.getElementById("manual-tab"),
          "Error calculating results. Please check your inputs."
        );
        perfMonitor.end('manualCalculation');
        return;
      }
      
      // Update UI with calculation results
      updateManualResultsUI(result, currency);
      
      perfMonitor.end('manualCalculation');
    } catch (error) {
      console.error('Error in manual calculation:', error);
      showValidationError(
        document.getElementById("manual-tab"),
        "An error occurred during calculation."
      );
      perfMonitor.end('manualCalculation');
    }
  }
  
  // Update manual results UI with calculation data
  function updateManualResultsUI(result, currency) {
    // Get result elements
    const manualResults = document.getElementById("manual-results");
    const totalCostEl = document.getElementById("manual-total-cost");
    const volumeDisplay = document.getElementById("volume-display");
    const dimensionsDisplay = document.getElementById("dimensions-display");
    const printTimeDisplay = document.getElementById("print-time-display");
    const materialWeightDisplay = document.getElementById("material-weight-display");
    const costBreakdown = document.getElementById("manual-costBreakdown");
    const printer400Stats = document.getElementById("manual-printer400-stats");
    const printer600Stats = document.getElementById("manual-printer600-stats");
    const packing400Vis = document.getElementById("manual-packing-400");
    const packing600Vis = document.getElementById("manual-packing-600");
    
    // Show results panel
    manualResults.style.display = "block";
    
    // Get currency symbol
    const currencySymbol = currencySymbols[currency] || '$';
    
    // Update basic stats
    totalCostEl.textContent = `${currencySymbol}${result.costs.total.toFixed(2)}`;
    volumeDisplay.textContent = result.volume.toFixed(2);
    dimensionsDisplay.textContent = `${result.dimensions.width.toFixed(1)} × ${result.dimensions.depth.toFixed(1)} × ${result.dimensions.height.toFixed(1)}`;
    
    // Calculate total material weight
    const totalWeight = result.materialUsage.powder * 1000 + 
                        result.materialUsage.silica + 
                        result.materialUsage.glaze;
    
    // Update additional stats
    materialWeightDisplay.textContent = `${totalWeight.toFixed(1)}g`;
    
    // Use the maximum print time from either printer as a reference
    const printTime = Math.max(
      (result.printer400.printTime !== 'N/A') ? result.printer400.printTime : 0,
      (result.printer600.printTime !== 'N/A') ? result.printer600.printTime : 0
    );
    
    printTimeDisplay.textContent = printTime ? formatPrintTime(printTime) : 'N/A';
    
    // Create cost breakdown
    createCostBreakdown(costBreakdown, result.costs, currency);
    
    // Update printer stats
    updatePrinterStats(printer400Stats, result.printer400, currencySymbol);
    updatePrinterStats(printer600Stats, result.printer600, currencySymbol);
    
    // Update packing visualizations
    if (packing400Vis) {
      visualizePacking(
        printer400,
        result.dimensions.width,
        result.dimensions.depth,
        result.dimensions.height,
        result.printer400.positions,
        packing400Vis
      );
    }
    
    if (packing600Vis) {
      visualizePacking(
        printer600,
        result.dimensions.width,
        result.dimensions.depth,
        result.dimensions.height,
        result.printer600.positions,
        packing600Vis
      );
    }
  }
  
  // Create cost breakdown progress bars
  function createCostBreakdown(container, costs, currency) {
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = "";
    
    // Get total cost
    const totalCost = costs.total;
    
    // Cost items data
    const costItems = [
      { name: "Powder", cost: costs.powder, color: "#3a86ff" },
      { name: "Binder", cost: costs.binder, color: "#ff006e" },
      { name: "Silica", cost: costs.silica, color: "#8338ec" },
      { name: "Glaze", cost: costs.glaze, color: "#ffbe0b" }
    ];
    
    // Create progress items
    costItems.forEach(item => {
      if (item.cost <= 0) return;
      
      const percentage = (item.cost / totalCost) * 100;
      
      const progressItem = document.createElement("div");
      progressItem.className = "progress-item";
      
      const progressHeader = document.createElement("div");
      progressHeader.className = "progress-header";
      
      const progressLabel = document.createElement("div");
      progressLabel.className = "progress-label";
      progressLabel.textContent = item.name;
      
      const progressValue = document.createElement("div");
      progressValue.className = "progress-value";
      progressValue.textContent = `${item.cost.toFixed(2)} ${currency} (${percentage.toFixed(1)}%)`;
      
      const progressBar = document.createElement("div");
      progressBar.className = "progress-bar";
      
      const progressFill = document.createElement("div");
      progressFill.className = "progress-fill";
      progressFill.style.width = `${percentage}%`;
      progressFill.style.backgroundColor = item.color;
      
      progressHeader.appendChild(progressLabel);
      progressHeader.appendChild(progressValue);
      progressBar.appendChild(progressFill);
      progressItem.appendChild(progressHeader);
      progressItem.appendChild(progressBar);
      container.appendChild(progressItem);
    });
  }
  
  // Update printer stats display
  function updatePrinterStats(statsContainer, printerData, currencySymbol) {
    if (!statsContainer) return;
    
    if (printerData.fitsInPrinter) {
      statsContainer.innerHTML = `
        <p><span class="printer-highlight">${printerData.totalObjects}</span> objects</p>
        <p>Arrangement: ${printerData.arrangement}</p>
        <p>Print Time: ${formatPrintTime(printerData.printTime)}</p>
        <p>Total Cost: ${currencySymbol}${printerData.batchCost.toFixed(2)}</p>
      `;
    } else {
      statsContainer.innerHTML = `
        <p style="color: var(--danger); font-weight: 600;">Object exceeds printer capacity</p>
        <p>Max dimensions: ${printerData.width}mm × ${printerData.depth}mm × ${printerData.height || 0}mm</p>
      `;
    }
  }
  
  // Update printer packing with orientation change
  function updatePackingWithOrientation(width, depth, height, orientation) {
    // Apply orientation to dimensions
    let orientedWidth, orientedDepth, orientedHeight;
    
    if (orientation === 'vertical') {
      // For vertical orientation, we put the smallest dimension in X or Y,
      // middle dimension in the other axis, and tallest dimension in Z
      const dimensions = [width, depth, height].sort((a, b) => a - b);
      orientedWidth = dimensions[0];
      orientedDepth = dimensions[1];
      orientedHeight = dimensions[2];
    } else {
      // For flat orientation, we put the tallest dimensions in X and Y,
      // and the smallest dimension in Z
      const dimensions = [width, depth, height].sort((a, b) => a - b);
      orientedWidth = dimensions[2];
      orientedDepth = dimensions[1];
      orientedHeight = dimensions[0];
    }
    
    return {
      width: orientedWidth,
      depth: orientedDepth,
      height: orientedHeight
    };
  }
  
  // Validate input and show errors
  function showValidationError(container, message) {
    if (!container) return;
    
    // Find validation message element
    let errorEl = container.querySelector('.error-message');
    
    if (!errorEl) {
      // Create error element if it doesn't exist
      errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      
      // Find a place to insert it
      const totalCost = container.querySelector('.total-cost');
      if (totalCost && totalCost.parentNode) {
        totalCost.parentNode.insertBefore(errorEl, totalCost);
      } else {
        container.appendChild(errorEl);
      }
    }
    
    // Set error message and show it
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }