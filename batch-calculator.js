/* Batch Processing Calculator for Multiple STL Files */

// Calculate optimal batch arrangement for multiple STL files
function calculateBatchArrangement(stlRows, selectedPrinter = '400') {
    perfMonitor.start('calculateBatch');
    
    try {
      // Validate input
      if (!stlRows || !stlRows.length) {
        console.error('No STL rows provided for batch calculation');
        perfMonitor.end('calculateBatch');
        return null;
      }
      
      // Get printer dimensions
      const printer = PRINTERS[selectedPrinter];
      if (!printer) {
        console.error(`Invalid printer selection: ${selectedPrinter}`);
        perfMonitor.end('calculateBatch');
        return null;
      }
      
      // Get available printer space (accounting for wall margins)
      const availableWidth = printer.dimensions.x - (2 * WALL_MARGIN);
      const availableDepth = printer.dimensions.y - (2 * WALL_MARGIN);
      const availableHeight = printer.dimensions.z;
      
      // Collect items to pack
      const items = [];
      let totalVolume = 0;
      let totalCost = 0;
      
      stlRows.forEach(rowId => {
        const row = document.getElementById(rowId);
        if (!row || !row.volumeCm3 || !row.orientationData) {
          return; // Skip invalid rows
        }
        
        // Get orientation data based on selected orientation
        const orientationBtns = row.querySelectorAll('.orientation-btn');
        let selectedOrientation = 'flat'; // Default
        
        orientationBtns.forEach(btn => {
          if (btn.classList.contains('active')) {
            selectedOrientation = btn.getAttribute('data-orientation');
          }
        });
        
        // Get dimensions based on orientation
        const { width, depth, height } = selectedOrientation === 'flat' 
          ? row.orientationData.flat
          : row.orientationData.vertical;
        
        // Skip items that are too large for printer
        if (width > availableWidth || depth > availableDepth || height > availableHeight) {
          return;
        }
        
        // Get quantity from quantity input if it exists
        const quantityInput = row.querySelector('.item-quantity');
        const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
        
        // Get single item cost
        const costElement = row.querySelector('.total-cost');
        const costText = costElement ? costElement.textContent : '';
        const cost = parseFloat(costText.replace(/[^0-9.-]+/g, '')) || 0;
        
        // Add item to list multiple times based on quantity
        for (let i = 0; i < quantity; i++) {
          items.push({
            id: `${rowId}-${i}`,
            width,
            depth,
            height,
            volume: row.volumeCm3,
            cost
          });
          
          totalVolume += row.volumeCm3;
          totalCost += cost;
        }
      });
      
      // If no valid items, return empty result
      if (items.length === 0) {
        perfMonitor.end('calculateBatch');
        return {
          items: [],
          packed: [],
          unpacked: [],
          totalItems: 0,
          packedItems: 0,
          totalVolume,
          packedVolume: 0,
          totalCost,
          packedCost: 0,
          batchCount: 0,
          batches: [],
          printTime: 0
        };
      }
      
      // Sort items by height (descending) for better packing
      items.sort((a, b) => b.height - a.height);
      
      // Initialize packing variables
      const batches = [];
      let currentBatch = [];
      let currentHeight = 0;
      const positions = []; // Track positions for visualization
      let packedItems = 0;
      let packedVolume = 0;
      let packedCost = 0;
      let totalPrintTime = 0;
      
      // Place items using shelf algorithm with rotation
      const placeItem = (item) => {
        // Try to fit item on current level with both orientations
        let placed = false;
        let bestX = WALL_MARGIN;
        let bestY = WALL_MARGIN;
        let rotated = false;
        
        // Try regular orientation first
        const regularFit = findPositionForItem(
          currentBatch, item.width, item.depth, 
          availableWidth, availableDepth, OBJECT_SPACING
        );
        
        // Try rotated orientation
        const rotatedFit = findPositionForItem(
          currentBatch, item.depth, item.width,
          availableWidth, availableDepth, OBJECT_SPACING
        );
        
        // Use the best fit
        if (regularFit && rotatedFit) {
          // Choose the position that minimizes wasted space
          if (regularFit.wastedSpace <= rotatedFit.wastedSpace) {
            bestX = regularFit.x;
            bestY = regularFit.y;
            rotated = false;
          } else {
            bestX = rotatedFit.x;
            bestY = rotatedFit.y;
            rotated = true;
          }
          placed = true;
        } else if (regularFit) {
          bestX = regularFit.x;
          bestY = regularFit.y;
          placed = true;
        } else if (rotatedFit) {
          bestX = rotatedFit.x;
          bestY = rotatedFit.y;
          rotated = true;
          placed = true;
        }
        
        if (placed) {
          // Add item to current batch with calculated position
          const actualWidth = rotated ? item.depth : item.width;
          const actualDepth = rotated ? item.width : item.depth;
          
          currentBatch.push({
            id: item.id,
            x: bestX,
            y: bestY,
            z: currentHeight,
            width: actualWidth,
            depth: actualDepth,
            height: item.height,
            volume: item.volume,
            cost: item.cost,
            rotated
          });
          
          packedItems++;
          packedVolume += item.volume;
          packedCost += item.cost;
          
          return true;
        }
        
        return false;
      };
      
      // Process all items
      const packed = [];
      const unpacked = [];
      
      items.forEach(item => {
        // Check if item can fit in current batch
        if (!placeItem(item)) {
          // If current batch has items, finalize it and start a new batch
          if (currentBatch.length > 0) {
            // Calculate print time for this batch
            const maxHeight = Math.max(...currentBatch.map(i => i.z + i.height));
            const layerCount = Math.ceil(maxHeight / 0.1); // 0.1mm layer height
            const batchPrintTime = layerCount * printer.layerTime;
            
            batches.push({
              items: [...currentBatch],
              itemCount: currentBatch.length,
              maxHeight,
              printTime: batchPrintTime
            });
            
            totalPrintTime += batchPrintTime;
            
            // Start a new batch
            currentBatch = [];
            currentHeight = 0;
            
            // Try to place item in new batch
            if (placeItem(item)) {
              packed.push(item);
            } else {
              unpacked.push(item);
            }
          } else {
            // Item too large to fit even in empty batch
            unpacked.push(item);
          }
        } else {
          packed.push(item);
        }
      });
      
      // Add final batch if items remain
      if (currentBatch.length > 0) {
        const maxHeight = Math.max(...currentBatch.map(i => i.z + i.height));
        const layerCount = Math.ceil(maxHeight / 0.1);
        const batchPrintTime = layerCount * printer.layerTime;
        
        batches.push({
          items: [...currentBatch],
          itemCount: currentBatch.length,
          maxHeight,
          printTime: batchPrintTime
        });
        
        totalPrintTime += batchPrintTime;
      }
      
      // Format print time
      const formattedPrintTime = formatPrintTime(totalPrintTime);
      
      perfMonitor.end('calculateBatch');
      
      // Return result
      return {
        items,
        packed,
        unpacked,
        totalItems: items.length,
        packedItems,
        totalVolume,
        packedVolume,
        totalCost,
        packedCost,
        batchCount: batches.length,
        batches,
        printTime: formattedPrintTime,
        rawPrintTime: totalPrintTime
      };
    } catch (error) {
      console.error('Error calculating batch arrangement:', error);
      perfMonitor.end('calculateBatch');
      return null;
    }
  }
  
  // Find position for an item in the current batch
  function findPositionForItem(currentBatch, width, depth, maxWidth, maxDepth, spacing) {
    // Start from the minimum position (WALL_MARGIN, WALL_MARGIN)
    let bestFit = null;
    let minWastedSpace = Infinity;
    
    // Try all possible positions on the XY plane
    for (let x = WALL_MARGIN; x <= maxWidth - width; x += 1) {
      for (let y = WALL_MARGIN; y <= maxDepth - depth; y += 1) {
        // Check if position is valid (no overlaps)
        let valid = true;
        
        for (const placedItem of currentBatch) {
          // Check for overlap with existing items
          if (!(x + width + spacing <= placedItem.x || 
                placedItem.x + placedItem.width + spacing <= x ||
                y + depth + spacing <= placedItem.y || 
                placedItem.y + placedItem.depth + spacing <= y)) {
            valid = false;
            break;
          }
        }
        
        if (valid) {
          // Calculate wasted space as distance from origin (prefer placement near origin)
          const wastedSpace = x + y;
          
          if (wastedSpace < minWastedSpace) {
            minWastedSpace = wastedSpace;
            bestFit = { x, y, wastedSpace };
          }
          
          // If we found a position at the minimum coordinates, use it immediately
          if (x === WALL_MARGIN && y === WALL_MARGIN) {
            return bestFit;
          }
        }
      }
    }
    
    return bestFit;
  }
  
  // Visualize batch arrangement
  function visualizeBatchArrangement(batchData, containerId, batchIndex = 0) {
    perfMonitor.start('visualizeBatch');
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container not found: ${containerId}`);
      perfMonitor.end('visualizeBatch');
      return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    try {
      // Check if batch data is valid
      if (!batchData || !batchData.batches || batchData.batches.length === 0) {
        const message = document.createElement('div');
        message.className = 'batch-empty-message';
        message.innerHTML = `
          <div class="icon"><span class="material-icon">info</span></div>
          <div class="text">No batches to display. Add STL files and calculate batch arrangement.</div>
        `;
        container.appendChild(message);
        perfMonitor.end('visualizeBatch');
        return;
      }
      
      // Get selected batch
      const selectedBatch = batchData.batches[batchIndex];
      if (!selectedBatch) {
        console.error(`Batch index out of range: ${batchIndex}`);
        perfMonitor.end('visualizeBatch');
        return;
      }
      
      // Create container for visualization
      const visualizationContainer = document.createElement('div');
      visualizationContainer.className = 'batch-visualization';
      
      // Create canvas for top view
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      visualizationContainer.appendChild(canvas);
      
      // Create batch info container
      const infoContainer = document.createElement('div');
      infoContainer.className = 'batch-info';
      
      // Get current printer info
      const printerType = document.querySelector('.printer-model.active')?.getAttribute('data-printer') || '400';
      const printer = PRINTERS[printerType];
      
      // Batch navigation
      const batchNav = document.createElement('div');
      batchNav.className = 'batch-navigation';
      
      const prevButton = document.createElement('button');
      prevButton.className = 'btn btn-sm';
      prevButton.innerHTML = '<span class="material-icon">chevron_left</span>';
      prevButton.disabled = batchIndex === 0;
      prevButton.addEventListener('click', () => {
        if (batchIndex > 0) {
          visualizeBatchArrangement(batchData, containerId, batchIndex - 1);
        }
      });
      
      const batchLabel = document.createElement('div');
      batchLabel.className = 'batch-label';
      batchLabel.textContent = `Batch ${batchIndex + 1} of ${batchData.batches.length}`;
      
      const nextButton = document.createElement('button');
      nextButton.className = 'btn btn-sm';
      nextButton.innerHTML = '<span class="material-icon">chevron_right</span>';
      nextButton.disabled = batchIndex === batchData.batches.length - 1;
      nextButton.addEventListener('click', () => {
        if (batchIndex < batchData.batches.length - 1) {
          visualizeBatchArrangement(batchData, containerId, batchIndex + 1);
        }
      });
      
      batchNav.appendChild(prevButton);
      batchNav.appendChild(batchLabel);
      batchNav.appendChild(nextButton);
      
      // Batch info list
      const infoList = document.createElement('ul');
      infoList.className = 'batch-info-list';
      
      // Add info items
      const infoItems = [
        { label: 'Items in batch', value: selectedBatch.itemCount },
        { label: 'Maximum height', value: `${selectedBatch.maxHeight.toFixed(1)}mm` },
        { label: 'Print time', value: formatPrintTime(selectedBatch.printTime) },
        { label: 'Printer', value: printer.name }
      ];
      
      infoItems.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="label">${item.label}:</span> <span class="value">${item.value}</span>`;
        infoList.appendChild(li);
      });
      
      infoContainer.appendChild(batchNav);
      infoContainer.appendChild(infoList);
      
      // Add export/print buttons
      const actionButtons = document.createElement('div');
      actionButtons.className = 'batch-actions';
      
      const exportButton = document.createElement('button');
      exportButton.className = 'btn btn-primary';
      exportButton.innerHTML = '<span class="material-icon">download</span> Export Layout';
      exportButton.addEventListener('click', () => {
        exportBatchLayout(batchData, batchIndex);
      });
      
      actionButtons.appendChild(exportButton);
      infoContainer.appendChild(actionButtons);
      
      // Add containers to main container
      container.appendChild(visualizationContainer);
      container.appendChild(infoContainer);
      
      // Render the batch visualization
      renderBatchCanvas(canvas, selectedBatch, printer);
      
      // Add item list
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'batch-items-container';
      itemsContainer.innerHTML = '<h4>Items in this batch</h4>';
      
      const itemsList = document.createElement('div');
      itemsList.className = 'batch-items-list';
      
      selectedBatch.items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'batch-item';
        
        // Find original item details from ID
        const itemId = item.id.split('-')[0];
        const originalRow = document.getElementById(itemId);
        const itemName = originalRow?.querySelector('.item-name')?.value || `Item ${index + 1}`;
        
        itemElement.innerHTML = `
          <div class="item-color" style="background-color: getItemColor(${index})"></div>
          <div class="item-details">
            <div class="item-name">${itemName}</div>
            <div class="item-dimensions">${item.width.toFixed(1)} × ${item.depth.toFixed(1)} × ${item.height.toFixed(1)} mm</div>
            <div class="item-position">Position: ${item.x.toFixed(1)}, ${item.y.toFixed(1)}, ${item.z.toFixed(1)}</div>
          </div>
        `;
        
        itemsList.appendChild(itemElement);
      });
      
      itemsContainer.appendChild(itemsList);
      container.appendChild(itemsContainer);
      
      perfMonitor.end('visualizeBatch');
    } catch (error) {
      console.error('Error visualizing batch arrangement:', error);
      perfMonitor.end('visualizeBatch');
    }
  }
  
  // Render batch canvas
  function renderBatchCanvas(canvas, batch, printer) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate scale to fit printer bed in canvas
    const margin = 20;
    const availableWidth = width - 2 * margin;
    const availableHeight = height - 2 * margin;
    
    const scaleX = availableWidth / printer.dimensions.x;
    const scaleY = availableHeight / printer.dimensions.y;
    const scale = Math.min(scaleX, scaleY);
    
    // Transform to center the visualization
    ctx.translate(margin, margin);
    
    // Draw printer bed outline
    ctx.strokeStyle = isDarkMode ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, printer.dimensions.x * scale, printer.dimensions.y * scale);
    
    // Draw grid
    ctx.strokeStyle = isDarkMode ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridSize = 20; // Grid cell size in mm
    
    for (let x = gridSize; x < printer.dimensions.x; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, printer.dimensions.y * scale);
      ctx.stroke();
    }
    
    for (let y = gridSize; y < printer.dimensions.y; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(printer.dimensions.x * scale, y * scale);
      ctx.stroke();
    }
    
    // Draw items with different colors
    const colors = [
      '#4ade80', '#f472b6', '#60a5fa', '#fb923c', 
      '#a78bfa', '#fbbf24', '#2dd4bf', '#f87171'
    ];
    
    batch.items.forEach((item, index) => {
      // Select color based on index
      const colorIndex = index % colors.length;
      ctx.fillStyle = colors[colorIndex];
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      
      // Draw object rectangle
      ctx.fillRect(
        item.x * scale, 
        item.y * scale, 
        item.width * scale, 
        item.depth * scale
      );
      ctx.strokeRect(
        item.x * scale, 
        item.y * scale, 
        item.width * scale, 
        item.depth * scale
      );
      
      // Add item number in center if space allows
      const minDimension = Math.min(item.width, item.depth) * scale;
      if (minDimension >= 15) {
        ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${index + 1}`, 
          (item.x + item.width / 2) * scale, 
          (item.y + item.depth / 2) * scale
        );
      }
    });
    
    // Add printer dimensions text
    ctx.resetTransform();
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${printer.dimensions.x}mm × ${printer.dimensions.y}mm`, margin, 5);
  }
  
  // Export batch layout as image
  function exportBatchLayout(batchData, batchIndex) {
    const selectedBatch = batchData.batches[batchIndex];
    if (!selectedBatch) return;
    
    try {
      // Create a temporary canvas for the export
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      
      // Get current printer info
      const printerType = document.querySelector('.printer-model.active')?.getAttribute('data-printer') || '400';
      const printer = PRINTERS[printerType];
      
      // Render the batch to the canvas
      renderBatchCanvas(canvas, selectedBatch, printer);
      
      // Add additional info to the canvas
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 500, 800, 100);
      
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.fillText(`Batch ${batchIndex + 1} of ${batchData.batches.length} - ${printer.name}`, 20, 520);
      
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(`Items: ${selectedBatch.itemCount} | Max height: ${selectedBatch.maxHeight.toFixed(1)}mm | Print time: ${formatPrintTime(selectedBatch.printTime)}`, 20, 550);
      
      // Export as image
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `batch-${batchIndex + 1}-layout.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success notification
      if (typeof showNotification === 'function') {
        showNotification(
          'Export Complete',
          'Batch layout has been saved as an image.',
          'success',
          3000
        );
      }
    } catch (error) {
      console.error('Error exporting batch layout:', error);
      
      // Show error notification
      if (typeof showNotification === 'function') {
        showNotification(
          'Export Failed',
          'Could not export batch layout.',
          'error',
          5000
        );
      }
    }
  }
  
  // Get a color for an item based on its index
  function getItemColor(index) {
    const colors = [
      '#4ade80', '#f472b6', '#60a5fa', '#fb923c', 
      '#a78bfa', '#fbbf24', '#2dd4bf', '#f87171'
    ];
    return colors[index % colors.length];
  }