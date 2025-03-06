// Simple Print Time Box Fix

// Hide viewer controls
const styleElement = document.createElement('style');
styleElement.textContent = `
  .viewer-controls { display: none !important; }
`;
document.head.appendChild(styleElement);

// Simple function to add print time to the empty box
function addPrintTimeToEmptyBox() {
  // Find the third stat box (which is empty) in the current page
  const statBoxes = document.querySelectorAll('.stats-grid .stat-box');
  
  if (statBoxes.length >= 3) {
    const printTimeBox = statBoxes[2]; // Third box
    
    // Get dimensions directly from the second box text
    const dimensionsBox = statBoxes[1];
    const dimensionsText = dimensionsBox.querySelector('.stat-value')?.textContent || '';
    const dimensionsParts = dimensionsText.split('×').map(part => parseFloat(part.trim()));
    
    if (dimensionsParts.length === 3) {
      const width = dimensionsParts[0];
      const depth = dimensionsParts[1];
      const height = dimensionsParts[2];
      
      // Get current orientation
      const isVertical = document.querySelector('.orientation-btn[data-orientation="vertical"].active') !== null;
      
      // Calculate if object fits in each printer
      const fits400 = checkIfFits(width, depth, height, isVertical, 390, 290, 200);
      const fits600 = checkIfFits(width, depth, height, isVertical, 595, 600, 250);
      
      // Calculate print times
      const time400 = fits400 ? calculateTime(width, depth, height, isVertical, 45) : '--';
      const time600 = fits600 ? calculateTime(width, depth, height, isVertical, 35) : '--';
      
      // Update the print time box
      printTimeBox.innerHTML = `
        <div class="stat-value">${time400} / ${time600}</div>
        <div class="stat-label">Print Time (400/600)</div>
      `;
    }
  }
}

// Check if object fits in printer
function checkIfFits(width, depth, height, isVertical, printerWidth, printerDepth, printerHeight) {
  // Simple implementation - can be enhanced
  const WALL_MARGIN = 10;
  
  let objWidth, objDepth, objHeight;
  
  if (isVertical) {
    // Vertical orientation - longest dimension as height
    const dims = [width, depth, height].sort((a, b) => a - b);
    objWidth = dims[0];
    objDepth = dims[1];
    objHeight = dims[2];
  } else {
    // Flat orientation - shortest dimension as height
    const dims = [width, depth, height].sort((a, b) => a - b);
    objHeight = dims[0];
    objWidth = dims[2];
    objDepth = dims[1];
  }
  
  return (objWidth <= printerWidth - 2 * WALL_MARGIN) &&
         (objDepth <= printerDepth - 2 * WALL_MARGIN) &&
         (objHeight <= printerHeight);
}

// Calculate print time
function calculateTime(width, depth, height, isVertical, layerTime) {
  const layerHeight = 0.1; // 0.1mm per layer
  
  let printHeight;
  if (isVertical) {
    // Use tallest dimension
    printHeight = Math.max(width, depth, height);
  } else {
    // Use shortest dimension
    printHeight = Math.min(width, depth, height);
  }
  
  const layers = Math.ceil(printHeight / layerHeight);
  const totalSeconds = layers * layerTime;
  
  // Format time
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Call immediately
addPrintTimeToEmptyBox();

// Also listen for orientation changes
document.querySelectorAll('.orientation-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    // Short delay to allow other handlers to complete
    setTimeout(addPrintTimeToEmptyBox, 100);
  });
});