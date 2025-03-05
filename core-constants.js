/* Core Constants and Settings for 3D Printer Calculator */

// Performance monitoring utility
const perfMonitor = {
    timers: {},
    start: function(label) {
      this.timers[label] = performance.now();
    },
    end: function(label) {
      if (!this.timers || !this.timers[label]) return 0;
      const time = performance.now() - this.timers[label];
      if (time > 1000) {
        console.warn(`Performance warning: ${label} took ${(time/1000).toFixed(2)}s`);
      }
      delete this.timers[label];
      return time;
    }
  };
  
  // Default printer settings
  let WALL_MARGIN = 10; // mm
  let OBJECT_SPACING = 15; // mm
  
  // Material constants
  const POWDER_KG_PER_CM3 = 0.002; // 2g per cm³
  const BINDER_ML_PER_CM3 = 0.27; // 270ml per liter
  const SILICA_G_PER_CM3 = 0.55; // 0.55g per cm³
  
  // Calculate glaze usage based on volume
  function calculateGlazeUsage(volumeCm3) {
    return 0.1615 * volumeCm3 + 31.76; // grams
  }
  
  // Printer specifications
  const printer400 = {
    name: "Printer 400",
    width: 390,
    depth: 290,
    height: 200,
    layerTime: 45 // seconds per 0.1mm layer
  };
  
  const printer600 = {
    name: "Printer 600",
    width: 595,
    depth: 600,
    height: 250,
    layerTime: 35 // seconds per 0.1mm layer
  };
  
  // Default pricing data for different currencies
  const pricing = {
    EUR: { powder: 92.857, binder: 0.085, silica: 0.069, glaze: 88/9000 },
    USD: { powder: 100, binder: 0.09, silica: 0.072, glaze: 91/9000 },
    JPY: { powder: 200000/14, binder: 250000/20000, silica: 11, glaze: 14000/9000 },
    SGD: { powder: 135, binder: 0.12, silica: 0.10, glaze: 0.01365 }
  };
  
  // Currency symbols for display
  const currencySymbols = {
    EUR: '€',
    USD: '$',
    JPY: '¥',
    SGD: 'S$'
  };
  
  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  // Format time
  function formatPrintTime(seconds) {
    if (isNaN(seconds) || seconds === "N/A") return "N/A";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  // Generate unique ID
  function createUniqueId() {
    return 'row-' + Math.random().toString(36).substr(2, 9);
  }
  
  // Check if browser supports various features
  const browserFeatures = {
    webGl: (function() {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    })(),
    webWorkers: !!window.Worker,
    localStorage: (function() {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    fileReader: !!window.FileReader
  };
  
  // Low memory detection
  const isLowMemoryDevice = navigator.deviceMemory && navigator.deviceMemory < 4;
  
  // Show warning for large files if on a low memory device
  if (isLowMemoryDevice) {
    const memWarn = document.querySelector('.memory-warning');
    if (memWarn) memWarn.style.display = 'block';
  }
  
  // Check for device capabilities
  function checkDeviceCapabilities() {
    if (!browserFeatures.webGl) {
      showNotification(
        'Limited 3D Support',
        'Your browser has limited or no WebGL support. 3D visualization may not work correctly.',
        'warning',
        8000
      );
    }
    
    if (!browserFeatures.webWorkers) {
      console.warn('Web Workers not supported. Processing will happen on the main thread.');
    }
  }

  // In core-constants.js
// Only declare if not already defined
if (typeof POWDER_KG_PER_CM3 === 'undefined') {
    const POWDER_KG_PER_CM3 = 0.002; // 2g per cm³
  }
  
  if (typeof BINDER_ML_PER_CM3 === 'undefined') {
    const BINDER_ML_PER_CM3 = 0.27; // 270ml per liter
  }
  
  if (typeof SILICA_G_PER_CM3 === 'undefined') {
    const SILICA_G_PER_CM3 = 0.55; // 0.55g per cm³
  }
  