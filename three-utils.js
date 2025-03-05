/* Three.js Utilities for 3D Visualization */

// Initialize Three.js viewer with optimized settings
function initThreeJSViewer(container) {
    perfMonitor.start('initViewer');
    
    // Check if container exists
    if (!container) {
      console.error('Container element not found');
      return null;
    }
    
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
      console.error('THREE is not defined. Make sure Three.js is loaded properly.');
      return null;
    }
    
    try {
      // Create renderer with enhanced settings
      const renderer = new THREE.WebGLRenderer({ 
        antialias: window.devicePixelRatio < 1.5, // Use antialiasing only for lower-res displays
        powerPreference: 'high-performance',
        precision: 'mediump',
        alpha: true
      });
      
      renderer.setSize(container.clientWidth || 300, container.clientHeight || 200);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // Limit pixel ratio for performance
      
      // Check for dark mode and set background accordingly
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      renderer.setClearColor(isDarkMode ? 0x1e293b : 0xf0f2f5);
      container.appendChild(renderer.domElement);
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(isDarkMode ? 0x1e293b : 0xf0f2f5);
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        45,
        (container.clientWidth || 300) / (container.clientHeight || 200),
        0.1,
        1000
      );
      camera.position.set(50, 50, 50);
      
      // Enhanced lighting setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
      dirLight.position.set(50, 50, 50);
      dirLight.castShadow = true;
      scene.add(dirLight);
      
      // Add a gentle hemisphere light for more pleasing visuals
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
      scene.add(hemiLight);
      
      // Enhanced orbit controls
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.screenSpacePanning = true;
      controls.maxPolarAngle = Math.PI;
      controls.enableZoom = true;
      controls.zoomSpeed = 0.8;
      controls.rotateSpeed = 0.6;
      controls.autoRotate = false; // Start without auto-rotation
      controls.autoRotateSpeed = 1.0;
      
      // Add viewer controls
      setupViewerControls(container, scene, camera, controls, renderer);
      
      // Throttled resize handler
      let resizeTimeout;
      const onWindowResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (container.clientWidth && container.clientHeight) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
          }
        }, 200);
      };
      
      const resizeObserver = new ResizeObserver(onWindowResize);
      resizeObserver.observe(container);
      
      // Enhanced animation loop with throttling and visibility detection
      let active = true;
      let animationFrameId;
      let lastRenderTime = 0;
      const FRAME_INTERVAL = 33; // Limit to 30fps
      
      function animate(time) {
        animationFrameId = requestAnimationFrame(animate);
        
        // Only render when needed
        if (!active) return;
        
        // Throttle rendering to save power
        if (time - lastRenderTime >= FRAME_INTERVAL) {
          controls.update();
          renderer.render(scene, camera);
          lastRenderTime = time;
        }
      }
      
      // Use Intersection Observer to only animate when in viewport
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          active = entry.isIntersecting;
        });
      }, { threshold: 0.1 });
      
      observer.observe(container);
      
      // Start animation
      animate(0);
      
      // Listen for theme changes
      document.addEventListener('themeChanged', (e) => {
        const isDarkMode = e.detail && e.detail.theme === 'dark';
        scene.background = new THREE.Color(isDarkMode ? 0x1e293b : 0xf0f2f5);
        renderer.setClearColor(isDarkMode ? 0x1e293b : 0xf0f2f5);
      });
      
      // Enhanced cleanup
      const cleanup = () => {
        observer.disconnect();
        if (resizeObserver) resizeObserver.disconnect();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        // Clean up scene objects
        scene.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        
        // Remove renderer DOM element
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        
        // Remove viewer controls
        const controlButtons = container.querySelectorAll('.viewer-control-btn');
        controlButtons.forEach(btn => btn.remove());
        
        renderer.dispose();
      };
      
      perfMonitor.end('initViewer');
      return { renderer, scene, camera, controls, cleanup };
    } catch (error) {
      console.error('Failed to initialize Three.js viewer:', error);
      return null;
    }
  }
  
  // Setup viewer controls (camera reset, wireframe toggle, screenshot)
  function setupViewerControls(container, scene, camera, controls, renderer) {
    // Get control buttons from container or create them
    let viewerControls = container.querySelector('.viewer-controls');
    
    if (!viewerControls) {
      viewerControls = document.createElement('div');
      viewerControls.className = 'viewer-controls';
      container.appendChild(viewerControls);
    }
    
    // Reset camera button
    const resetCameraBtn = container.querySelector('.reset-camera-btn') || 
      createButton('center_focus_strong', 'Reset Camera', 'reset-camera-btn');
    
    // Wireframe toggle button
    const toggleWireframeBtn = container.querySelector('.toggle-wireframe-btn') || 
      createButton('grid_3x3', 'Toggle Wireframe', 'toggle-wireframe-btn');
    
    // Screenshot button
    const takeScreenshotBtn = container.querySelector('.take-screenshot-btn') || 
      createButton('photo_camera', 'Take Screenshot', 'take-screenshot-btn');
    
    // Auto-rotate toggle
    const autoRotateBtn = container.querySelector('.auto-rotate-btn') || 
      createButton('rotate_right', 'Toggle Auto-Rotate', 'auto-rotate-btn');
    
    // Add buttons to controls if they don't already exist
    if (!container.querySelector('.reset-camera-btn')) viewerControls.appendChild(resetCameraBtn);
    if (!container.querySelector('.toggle-wireframe-btn')) viewerControls.appendChild(toggleWireframeBtn);
    if (!container.querySelector('.take-screenshot-btn')) viewerControls.appendChild(takeScreenshotBtn);
    if (!container.querySelector('.auto-rotate-btn')) viewerControls.appendChild(autoRotateBtn);
    
    // Reset camera functionality
    resetCameraBtn.addEventListener('click', () => {
      if (typeof gsap !== 'undefined') {
        gsap.to(camera.position, {
          x: 50, y: 50, z: 50,
          duration: 1,
          ease: "power2.inOut"
        });
        
        gsap.to(controls.target, {
          x: 0, y: 0, z: 0,
          duration: 1,
          ease: "power2.inOut",
          onUpdate: () => controls.update()
        });
      } else {
        // Fallback if GSAP is not available
        camera.position.set(50, 50, 50);
        controls.target.set(0, 0, 0);
        controls.update();
      }
      
      if (typeof showNotification === 'function') {
        showNotification('Camera Reset', 'View has been reset to default position.', 'info', 2000);
      }
    });
    
    // Wireframe toggle functionality
    let wireframeEnabled = false;
    toggleWireframeBtn.addEventListener('click', () => {
      wireframeEnabled = !wireframeEnabled;
      
      // Update all materials in the scene
      scene.traverse(obj => {
        if (obj.isMesh && obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(material => {
              material.wireframe = wireframeEnabled;
            });
          } else {
            obj.material.wireframe = wireframeEnabled;
          }
        }
      });
      
      // Toggle button appearance
      toggleWireframeBtn.classList.toggle('active', wireframeEnabled);
      
      if (typeof showNotification === 'function') {
        showNotification(
          wireframeEnabled ? 'Wireframe Enabled' : 'Wireframe Disabled', 
          wireframeEnabled ? 'Model is now displayed in wireframe mode.' : 'Model is now displayed in solid mode.',
          'info',
          2000
        );
      }
    });
    
    // Screenshot functionality
    takeScreenshotBtn.addEventListener('click', () => {
      try {
        // Temporarily render at high resolution
        const originalPixelRatio = renderer.getPixelRatio();
        renderer.setPixelRatio(Math.max(window.devicePixelRatio || 1, 2));
        renderer.render(scene, camera);
        
        // Get image data and initiate download
        const dataURL = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `3d-model-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reset pixel ratio
        renderer.setPixelRatio(originalPixelRatio);
        renderer.render(scene, camera);
        
        if (typeof showNotification === 'function') {
          showNotification(
            'Screenshot Taken', 
            'Your screenshot has been downloaded.',
            'success',
            3000
          );
        }
      } catch (error) {
        console.error('Error taking screenshot:', error);
        
        if (typeof showNotification === 'function') {
          showNotification(
            'Screenshot Failed', 
            'Could not capture screenshot. Check browser permissions.',
            'error',
            5000
          );
        }
      }
    });
    
    // Auto-rotate toggle functionality
    autoRotateBtn.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      autoRotateBtn.classList.toggle('active', controls.autoRotate);
    });
    
    // Helper function to create a button
    function createButton(iconName, title, className) {
      const button = document.createElement('button');
      button.className = `viewer-control-btn ${className}`;
      button.title = title;
      button.innerHTML = `<span class="material-icon">${iconName}</span>`;
      return button;
    }
  }
  
  // Display STL geometry in the viewer
  function displaySTLGeometry(geometry, scene, camera, controls) {
    perfMonitor.start('displayModel');
    
    if (!geometry || !scene) {
      console.error('Invalid geometry or scene provided');
      perfMonitor.end('displayModel');
      return null;
    }
    
    try {
      // Clone geometry to avoid modifying original
      const originalGeometry = geometry.clone();
      
      // Clear existing meshes from the scene
      scene.traverse(obj => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
          scene.remove(obj);
        }
      });
      
      // Create enhanced material
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      const material = new THREE.MeshPhysicalMaterial({
        color: isDarkMode ? 0x3b82f6 : 0x3a86ff,
        metalness: 0.1,
        roughness: 0.5,
        reflectivity: 0.2,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        flatShading: true
      });
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      
      // Compute original bounding box for dimensions
      originalGeometry.computeBoundingBox();
      const originalSize = new THREE.Vector3();
      originalGeometry.boundingBox.getSize(originalSize);
      
      // Store original data for future reference
      mesh.userData.originalGeometry = originalGeometry;
      mesh.userData.originalSize = originalSize.clone();
      
      // Determine optimal orientation data
      const orientationData = determineOptimalOrientation(
        originalSize.x, originalSize.y, originalSize.z
      );
      
      // Apply default "flat" orientation
      applyOrientation(mesh, originalSize, "flat");
      
      // Add mesh to scene
      scene.add(mesh);
      
      // Adjust camera position and target
      mesh.geometry.computeBoundingBox();
      const bbox = mesh.geometry.boundingBox;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = Math.max(maxDim * 1.5, 50);
      
      // Use GSAP for smooth camera animation if available
      if (typeof gsap !== 'undefined') {
        gsap.to(camera.position, {
          x: distance, y: distance, z: distance,
          duration: 1.2,
          ease: "power2.inOut"
        });
        
        gsap.to(controls.target, {
          x: 0, y: size.y / 2, z: 0,
          duration: 1.2,
          ease: "power2.inOut",
          onUpdate: () => controls.update()
        });
      } else {
        // Fallback without animation
        camera.position.set(distance, distance, distance);
        controls.target.set(0, size.y / 2, 0);
        controls.update();
      }
      
      // Add helper grid
      addGrid(scene, Math.max(maxDim * 2, 50));
      
      // Store data in scene for later use
      scene.userData = {
        originalGeometry,
        originalSize,
        mesh,
        orientationData
      };
      
      perfMonitor.end('displayModel');
      return orientationData;
    } catch (error) {
      console.error('Error displaying STL geometry:', error);
      perfMonitor.end('displayModel');
      return null;
    }
  }
  
  // Determine optimal orientation for an object
  function determineOptimalOrientation(width, depth, height) {
    // Sort dimensions
    const dimensions = [
      { value: width, name: 'width' },
      { value: depth, name: 'depth' },
      { value: height, name: 'height' }
    ].sort((a, b) => b.value - a.value); // Sort in descending order
    
    const maxDim = dimensions[0];
    const midDim = dimensions[1];
    const minDim = dimensions[2];
    
    // Create orientation data
    const orientation = {
      width: 0,
      depth: 0,
      height: 0,
      type: "",
      printTime: 0,
      vertical: {
        width: 0,
        depth: 0, 
        height: 0,
        printTime: 0
      },
      flat: {
        width: 0,
        depth: 0,
        height: 0,
        printTime: 0
      }
    };
    
    // Vertical: longest dimension on Z
    if (maxDim.value <= printer600.height) {
      orientation.vertical.width = minDim.value;
      orientation.vertical.depth = midDim.value;
      orientation.vertical.height = maxDim.value;
      orientation.vertical.printTime = Math.ceil(maxDim.value / 0.1) * printer600.layerTime;
    } else {
      // Scale if too tall
      const scale = printer600.height / maxDim.value;
      orientation.vertical.width = minDim.value * scale;
      orientation.vertical.depth = midDim.value * scale;
      orientation.vertical.height = printer600.height;
      orientation.vertical.printTime = Math.ceil(printer600.height / 0.1) * printer600.layerTime;
    }
    
    // Flat: shortest dimension on Z
    orientation.flat.width = maxDim.value;
    orientation.flat.depth = midDim.value;
    orientation.flat.height = minDim.value;
    orientation.flat.printTime = Math.ceil(minDim.value / 0.1) * printer600.layerTime;
    
    // Default to flat orientation
    orientation.width = orientation.flat.width;
    orientation.depth = orientation.flat.depth;
    orientation.height = orientation.flat.height;
    orientation.printTime = orientation.flat.printTime;
    orientation.type = "flat";
    
    return orientation;
  }
  
  // Apply orientation to a mesh
  function applyOrientation(mesh, originalSize, orientationType) {
    if (!mesh || !originalSize) return null;
    
    // Reset mesh transforms
    mesh.rotation.set(0, 0, 0);
    mesh.position.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrix();
    
    // Get a fresh copy of the original geometry
    const baseGeometry = mesh.userData.originalGeometry 
      ? mesh.userData.originalGeometry.clone() 
      : mesh.geometry.clone();
    
    // Determine dimensions
    const dimensions = [
      { axis: 'x', value: originalSize.x },
      { axis: 'y', value: originalSize.y },
      { axis: 'z', value: originalSize.z }
    ].sort((a, b) => b.value - a.value); // Sort by size (largest first)
    
    const longestAxis = dimensions[0].axis;
    const shortestAxis = dimensions[2].axis;
    
    // Create rotation matrix
    const rotMatrix = new THREE.Matrix4();
    
    if (orientationType === "vertical") {
      // Vertical: align longest dimension with Z-axis
      if (longestAxis === 'x') {
        rotMatrix.makeRotationY(-Math.PI / 2); // Rotate X to Z
      } else if (longestAxis === 'y') {
        rotMatrix.makeRotationX(Math.PI / 2); // Rotate Y to Z
      } else {
        rotMatrix.identity(); // Already aligned with Z
      }
    } else {
      // Flat: align shortest dimension with Z-axis
      if (shortestAxis === 'x') {
        rotMatrix.makeRotationY(Math.PI / 2); // Rotate X to Z
      } else if (shortestAxis === 'y') {
        rotMatrix.makeRotationX(-Math.PI / 2); // Rotate Y to Z
      } else {
        rotMatrix.identity(); // Already aligned with Z
      }
    }
    
    // Apply rotation to geometry
    baseGeometry.applyMatrix4(rotMatrix);
    
    // Replace mesh geometry
    mesh.geometry.dispose();
    mesh.geometry = baseGeometry;
    
    // Center mesh on XY plane and place bottom at Z=0
    baseGeometry.computeBoundingBox();
    const bbox = baseGeometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    mesh.position.set(-center.x, -center.y, -bbox.min.z);
    
    return baseGeometry;
  }
  
  // Change orientation of mesh in scene
  function changeOrientation(scene, camera, controls, orientationType) {
    if (!scene || !scene.userData || !scene.userData.mesh) {
      console.error('Invalid scene or missing mesh for orientation change');
      return null;
    }
    
    try {
      const mesh = scene.userData.mesh;
      const originalSize = scene.userData.originalSize;
      const orientationData = scene.userData.orientationData;
      
      // Store initial states for animation
      const startRotation = new THREE.Euler().copy(mesh.rotation);
      const startPosition = new THREE.Vector3().copy(mesh.position);
      
      // Apply new orientation
      const newGeometry = applyOrientation(mesh, originalSize, orientationType);
      
      // Use GSAP for smooth animation if available
      if (typeof gsap !== 'undefined') {
        // Animate from previous rotation/position
        gsap.from(mesh.rotation, {
          x: startRotation.x,
          y: startRotation.y,
          z: startRotation.z,
          duration: 0.8,
          ease: "power1.inOut"
        });
        
        gsap.from(mesh.position, {
          x: startPosition.x,
          y: startPosition.y,
          z: startPosition.z,
          duration: 0.8,
          ease: "power1.inOut"
        });
        
        // Adjust camera for new view
        newGeometry.computeBoundingBox();
        const bbox = newGeometry.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = Math.max(maxDim * 1.5, 50);
        
        // Position camera based on new orientation
        gsap.to(camera.position, {
          x: distance,
          y: distance,
          z: distance,
          duration: 0.8,
          ease: "power2.inOut"
        });
        
        // Update controls target to center of object
        gsap.to(controls.target, {
          x: 0,
          y: 0,
          z: size.z / 2,
          duration: 0.8,
          ease: "power2.inOut",
          onUpdate: () => controls.update()
        });
      } else {
        // Fallback without animation
        newGeometry.computeBoundingBox();
        const bbox = newGeometry.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = Math.max(maxDim * 1.5, 50);
        
        camera.position.set(distance, distance, distance);
        controls.target.set(0, 0, size.z / 2);
        controls.update();
      }
      
      // Update orientation data in state
      orientationData.type = orientationType;
      if (orientationType === "vertical") {
        orientationData.width = orientationData.vertical.width;
        orientationData.depth = orientationData.vertical.depth;
        orientationData.height = orientationData.vertical.height;
        orientationData.printTime = orientationData.vertical.printTime;
      } else {
        orientationData.width = orientationData.flat.width;
        orientationData.depth = orientationData.flat.depth;
        orientationData.height = orientationData.flat.height;
        orientationData.printTime = orientationData.flat.printTime;
      }
      
      return orientationData;
    } catch (error) {
      console.error('Error changing orientation:', error);
      return null;
    }
  }
  
  // Add grid to scene
  function addGrid(scene, size) {
    // Remove existing grids
    scene.traverse(child => {
      if (child.isGridHelper) {
        scene.remove(child);
      }
    });
    
    // Create grid helper
    const gridSize = Math.ceil(size / 10) * 10; // Round up to nearest 10
    const gridDivisions = 20;
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const gridHelper = new THREE.GridHelper(
      gridSize, 
      gridDivisions,
      isDarkMode ? 0x4a4aff : 0x3a86ff, // Main lines
      isDarkMode ? 0x334155 : 0xd1d5db  // Secondary lines
    );
    
    // Position grid at y=0
    gridHelper.position.y = 0;
    
    scene.add(gridHelper);
  }
  
  // Visualize packing arrangement
  function visualizePacking(printer, objWidth, objDepth, objHeight, positions, container, stlGeometry, orientation) {
    if (!container) return;
    
    perfMonitor.start('visualizePacking');
    
    // Clear previous content
    while (container.firstChild) {
      if (typeof container.cleanup === 'function') {
        container.cleanup();
      }
      container.removeChild(container.firstChild);
    }
    
    // Show "exceeds capacity" if no positions
    if (!positions || positions.length === 0) {
      const message = document.createElement("div");
      message.style.height = "100%";
      message.style.display = "flex";
      message.style.flexDirection = "column";
      message.style.alignItems = "center";
      message.style.justifyContent = "center";
      message.style.fontSize = "14px";
      message.style.color = "var(--danger)";
      message.innerHTML = `
        <span class="material-icon" style="font-size: 36px; margin-bottom: 8px;">error_outline</span>
        <span>Object exceeds printer capacity</span>
      `;
      container.appendChild(message);
      perfMonitor.end('visualizePacking');
      return;
    }
    
    try {
      // Create canvas element
      const canvas = document.createElement('canvas');
      canvas.width = container.clientWidth || 280;
      canvas.height = container.clientHeight || 200;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
      
      // Get drawing context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }
      
      // Check if dark mode is enabled
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      
      // Set colors based on theme
      const colors = {
        background: isDarkMode ? '#1e293b' : '#ffffff',
        grid: isDarkMode ? '#334155' : '#e2e8f0',
        gridLines: isDarkMode ? '#475569' : '#cbd5e1',
        printerOutline: isDarkMode ? '#94a3b8' : '#64748b',
        object: '#4ade80',
        objectStroke: '#10b981',
        text: isDarkMode ? '#f8fafc' : '#1e293b'
      };
      
      // Clear canvas
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set scale to fit printer in canvas
      const padding = 20;
      const availableWidth = canvas.width - 2 * padding;
      const availableHeight = canvas.height - 2 * padding;
      
      const scaleX = availableWidth / printer.width;
      const scaleY = availableHeight / printer.depth;
      const scale = Math.min(scaleX, scaleY);
      
      // Set transform to center the visualization
      ctx.translate(padding, padding);
      
      // Draw printer outline
      ctx.strokeStyle = colors.printerOutline;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, printer.width * scale, printer.depth * scale);
      
      // Draw grid
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 0.5;
      const gridSize = 20; // Grid cell size in mm
      
      for (let x = gridSize; x < printer.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, printer.depth * scale);
        ctx.stroke();
      }
      
      for (let y = gridSize; y < printer.depth; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(printer.width * scale, y * scale);
        ctx.stroke();
      }
      
      // Draw objects
      ctx.fillStyle = colors.object;
      ctx.strokeStyle = colors.objectStroke;
      ctx.lineWidth = 1;
      
      for (const pos of positions) {
        const x = (pos.x + WALL_MARGIN) * scale;
        const y = (pos.y + WALL_MARGIN) * scale;
        
        // Draw object rectangle
        ctx.fillRect(x, y, objWidth * scale, objDepth * scale);
        ctx.strokeRect(x, y, objWidth * scale, objDepth * scale);
      }
      
      // Add printer dimensions text
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.fillText(`${printer.width}mm × ${printer.depth}mm`, 5, -5);
      
      // Add object count
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(`${positions.length} objects`, 5, canvas.height - padding - 5);
      
      // Add printer name
      ctx.textAlign = 'right';
      ctx.fillText(printer.name, canvas.width - padding - 5, canvas.height - padding - 5);
      
      // Function to cleanup when container is emptied
      container.cleanup = () => {
        // Nothing special to clean up for canvas
      };
      
      perfMonitor.end('visualizePacking');
    } catch (error) {
      console.error('Error visualizing packing:', error);
      perfMonitor.end('visualizePacking');
    }
  }