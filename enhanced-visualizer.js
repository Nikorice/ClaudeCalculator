/* Enhanced 3D Model Visualizer with Layer View */

// Initialize advanced 3D model visualizer
function initEnhancedVisualizer(container, options = {}) {
    perfMonitor.start('initEnhancedVisualizer');
    
    try {
      if (!container) {
        console.error('Container element not found');
        return null;
      }
      
      // Default options
      const defaults = {
        backgroundColor: null, // Auto-detect based on theme
        showGrid: true,
        showAxis: true,
        showShadows: true,
        autoRotate: false,
        layerView: false,
        layerHeight: 0.1, // mm
        controlsType: 'orbit', // 'orbit' or 'trackball'
        renderQuality: 'medium' // 'low', 'medium', 'high'
      };
      
      // Merge with user options
      const config = { ...defaults, ...options };
      
      // Clear container first
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      // Set container style
      container.style.position = 'relative';
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
      
      // Detect dark mode
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      const bgColor = config.backgroundColor || (isDarkMode ? 0x1e293b : 0xf8fafc);
      
      // Initialize Three.js renderer with enhanced settings
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: config.renderQuality !== 'low',
        powerPreference: 'high-performance',
        alpha: true
      });
      
      // Set renderer properties based on quality setting
      renderer.setPixelRatio(window.devicePixelRatio * getQualityMultiplier(config.renderQuality));
      renderer.setSize(container.clientWidth || 300, container.clientHeight || 200);
      
      // Enable shadows if requested
      if (config.showShadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(bgColor);
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        45,
        (container.clientWidth || 300) / (container.clientHeight || 200),
        0.1,
        2000
      );
      camera.position.set(50, 50, 50);
      
      // Create lighting
      const lights = createLightingSetup(scene, config);
      
      // Create grid if requested
      let grid = null;
      if (config.showGrid) {
        grid = createGrid(scene, isDarkMode);
      }
      
      // Create axes if requested
      let axes = null;
      if (config.showAxis) {
        axes = createAxes(scene);
      }
      
      // Create controls based on type
      const controls = createControls(camera, renderer.domElement, config);
      
      // Create controls UI
      const controlsUI = createControlsUI(container, scene, camera, controls, config);
      
      // Create animation loop
      let animationFrameId = null;
      let active = true;
      
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        
        if (!active) return;
        
        // Update controls
        controls.update();
        
        // Render scene
        renderer.render(scene, camera);
      };
      
      // Start animation
      animate();
      
      // Create intersection observer to pause when not visible
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          active = entry.isIntersecting;
        });
      }, { threshold: 0.1 });
      
      observer.observe(container);
      
      // Create resize observer for responsive resizing
      const resizeObserver = new ResizeObserver(() => {
        if (container.clientWidth && container.clientHeight) {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        }
      });
      
      resizeObserver.observe(container);
      
      // Listen for theme changes
      document.addEventListener('themeChanged', (e) => {
        const isDarkMode = e.detail && e.detail.theme === 'dark';
        scene.background = new THREE.Color(isDarkMode ? 0x1e293b : 0xf8fafc);
        
        // Update grid if it exists
        if (grid) {
          scene.remove(grid);
          grid = createGrid(scene, isDarkMode);
        }
      });
      
      // Setup layer view mode if requested
      let currentLayer = 0;
      let maxLayer = 0;
      let layerClipPlane = null;
      
      if (config.layerView) {
        setupLayerViewMode(scene, camera, config);
      }
      
      // Prepare public API for visualizer
      const visualizer = {
        scene,
        camera,
        renderer,
        controls,
        
        // Load STL method
        loadSTL: (file, materialOptions = {}) => {
          return loadSTLFile(file, scene, camera, controls, materialOptions);
        },
        
        // Load geometry method
        loadGeometry: (geometry, materialOptions = {}) => {
          return loadGeometry(geometry, scene, camera, controls, materialOptions);
        },
        
        // Toggle layer view mode
        toggleLayerView: (enabled) => {
          if (enabled) {
            setupLayerViewMode(scene, camera, config);
          } else {
            disableLayerViewMode(scene);
          }
        },
        
        // Set current layer in layer view mode
        setLayer: (layer) => {
          if (!layerClipPlane) return;
          
          currentLayer = Math.max(0, Math.min(layer, maxLayer));
          const layerHeight = config.layerHeight || 0.1;
          
          layerClipPlane.constant = -(currentLayer * layerHeight);
          
          // Trigger layer change event
          const event = new CustomEvent('layerChanged', {
            detail: { layer: currentLayer, maxLayer }
          });
          container.dispatchEvent(event);
        },
        
        // Get current layer information
        getLayerInfo: () => {
          return {
            currentLayer,
            maxLayer,
            layerHeight: config.layerHeight
          };
        },
        
        // Take screenshot method
        takeScreenshot: (width, height) => {
          return takeScreenshot(renderer, scene, camera, width, height);
        },
        
        // Toggle grid visibility
        toggleGrid: (visible) => {
          if (grid) {
            grid.visible = visible;
          } else if (visible) {
            grid = createGrid(scene, isDarkMode);
          }
        },
        
        // Toggle axes visibility
        toggleAxes: (visible) => {
          if (axes) {
            axes.visible = visible;
          } else if (visible) {
            axes = createAxes(scene);
          }
        },
        
        // Toggle auto-rotation
        toggleAutoRotate: (enabled) => {
          if (controls.autoRotate !== undefined) {
            controls.autoRotate = enabled;
          }
        },
        
        // Clean up resources
        dispose: () => {
          // Stop animation
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          
          // Remove observers
          observer.disconnect();
          resizeObserver.disconnect();
          
          // Dispose geometries and materials
          scene.traverse(object => {
            if (object.geometry) {
              object.geometry.dispose();
            }
            
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
          
          // Remove event listeners from controls UI
          if (controlsUI && controlsUI.removeEventListeners) {
            controlsUI.removeEventListeners();
          }
          
          // Dispose renderer
          renderer.dispose();
          
          // Clear container
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        }
      };
      
      // Setup layer view mode helper function
      function setupLayerViewMode(scene, camera, config) {
        // Create clipping plane for layer view
        const layerHeight = config.layerHeight || 0.1;
        
        // Get object bounding box to determine max layers
        let maxHeight = 0;
        
        scene.traverse(object => {
          if (object.isMesh) {
            object.geometry.computeBoundingBox();
            const height = object.geometry.boundingBox.max.y - object.geometry.boundingBox.min.y;
            maxHeight = Math.max(maxHeight, height);
          }
        });
        
        maxLayer = Math.ceil(maxHeight / layerHeight);
        currentLayer = 0;
        
        // Create clipping plane
        layerClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        // Enable clipping on renderer
        renderer.localClippingEnabled = true;
        
        // Apply clipping plane to all materials
        scene.traverse(object => {
          if (object.isMesh) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                material.clippingPlanes = [layerClipPlane];
                material.clipShadows = true;
                material.needsUpdate = true;
              });
            } else {
              object.material.clippingPlanes = [layerClipPlane];
              object.material.clipShadows = true;
              object.material.needsUpdate = true;
            }
          }
        });
        
        // Create layer controls in UI if they don't exist
        createLayerControls(container, visualizer);
      }
      
      // Disable layer view mode
      function disableLayerViewMode(scene) {
        // Remove clipping plane from all materials
        scene.traverse(object => {
          if (object.isMesh) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                material.clippingPlanes = [];
                material.clipShadows = false;
                material.needsUpdate = true;
              });
            } else {
              object.material.clippingPlanes = [];
              object.material.clipShadows = false;
              object.material.needsUpdate = true;
            }
          }
        });
        
        // Disable clipping on renderer
        renderer.localClippingEnabled = false;
        
        // Remove layer controls from UI
        const layerControls = container.querySelector('.layer-controls');
        if (layerControls) {
          layerControls.remove();
        }
        
        // Reset layer variables
        layerClipPlane = null;
        currentLayer = 0;
        maxLayer = 0;
      }
      
      perfMonitor.end('initEnhancedVisualizer');
      return visualizer;
    } catch (error) {
      console.error('Error initializing enhanced visualizer:', error);
      perfMonitor.end('initEnhancedVisualizer');
      return null;
    }
  }
  
  // Create lighting setup
  function createLightingSetup(scene, config) {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = config.showShadows;
    
    // Enhance shadow quality
    if (config.showShadows) {
      directionalLight.shadow.mapSize.width = 1024 * getQualityMultiplier(config.renderQuality);
      directionalLight.shadow.mapSize.height = 1024 * getQualityMultiplier(config.renderQuality);
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.bias = -0.0005;
    }
    
    scene.add(directionalLight);
    
    // Add a secondary directional light from below
    const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.3);
    secondaryLight.position.set(-30, -30, -30);
    scene.add(secondaryLight);
    
    // Add hemisphere light for better ambient illumination
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x303030, 0.3);
    scene.add(hemisphereLight);
    
    return {
      ambient: ambientLight,
      directional: directionalLight,
      secondary: secondaryLight,
      hemisphere: hemisphereLight
    };
  }
  
  // Create grid
  function createGrid(scene, isDarkMode) {
    // Create grid helper with appropriate colors
    const gridSize = 100;
    const gridDivisions = 20;
    
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      isDarkMode ? 0x4a4aff : 0x3a86ff, // Main lines
      isDarkMode ? 0x334155 : 0xd1d5db   // Secondary lines
    );
    
    // Position grid at origin
    gridHelper.position.y = 0;
    
    scene.add(gridHelper);
    return gridHelper;
  }
  
  // Create axes
  function createAxes(scene) {
    // Create axes helper
    const axesHelper = new THREE.AxesHelper(50);
    
    // Add to scene
    scene.add(axesHelper);
    return axesHelper;
  }
  
  // Create controls based on configuration
  function createControls(camera, domElement, config) {
    let controls;
    
    if (config.controlsType === 'trackball') {
      controls = new THREE.TrackballControls(camera, domElement);
      controls.rotateSpeed = 1.5;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.8;
    } else {
      // Default to Orbit controls
      controls = new THREE.OrbitControls(camera, domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.screenSpacePanning = true;
      controls.maxPolarAngle = Math.PI;
      controls.minDistance = 10;
      controls.maxDistance = 500;
      controls.autoRotate = config.autoRotate;
      controls.autoRotateSpeed = 1.0;
    }
    
    return controls;
  }
  
  // Reset camera to default position
  function resetCamera(camera, controls) {
    // Reset camera position
    camera.position.set(50, 50, 50);
    
    // Reset controls target
    if (controls.target) {
      controls.target.set(0, 0, 0);
    }
    
    // Update camera
    camera.updateProjectionMatrix();
    
    // Update controls
    controls.update();
  }
  
  // Get quality multiplier based on render quality setting
  function getQualityMultiplier(quality) {
    switch (quality) {
      case 'low': return 0.5;
      case 'high': return 1.5;
      default: return 1.0; // medium
    }
  }
  
  // Take screenshot of current view
  function takeScreenshot(renderer, scene, camera, width, height) {
    try {
      // Get original size
      const originalSize = {
        width: renderer.domElement.width,
        height: renderer.domElement.height
      };
      
      // Set to requested size or default to current size x2
      const targetWidth = width || originalSize.width * 2;
      const targetHeight = height || originalSize.height * 2;
      
      // Resize renderer temporarily
      renderer.setSize(targetWidth, targetHeight);
      
      // Update camera aspect ratio
      camera.aspect = targetWidth / targetHeight;
      camera.updateProjectionMatrix();
      
      // Render to canvas
      renderer.render(scene, camera);
      
      // Get image data
      const dataURL = renderer.domElement.toDataURL('image/png');
      
      // Reset to original size
      renderer.setSize(originalSize.width, originalSize.height);
      camera.aspect = originalSize.width / originalSize.height;
      camera.updateProjectionMatrix();
      
      // Render once more at original size
      renderer.render(scene, camera);
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `3d-model-${Date.now()}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('Error taking screenshot:', error);
      return false;
    }
  }
  
  // Load STL file 
  function loadSTLFile(file, scene, camera, controls, materialOptions = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Validate file
        if (!file || !file.name || !file.name.toLowerCase().endsWith('.stl')) {
          reject(new Error('Invalid STL file'));
          return;
        }
        
        // Create file reader
        const reader = new FileReader();
        
        // Set onload handler
        reader.onload = function(event) {
          try {
            // Use STL loader to parse file
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(event.target.result);
            
            // Load geometry
            const model = loadGeometry(geometry, scene, camera, controls, materialOptions);
            resolve(model);
          } catch (error) {
            reject(error);
          }
        };
        
        // Set error handler
        reader.onerror = function(error) {
          reject(error);
        };
        
        // Read file as array buffer
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Load geometry
  function loadGeometry(geometry, scene, camera, controls, materialOptions = {}) {
    try {
      // Clear existing models
      scene.traverse(object => {
        if (object.isMesh && object.userData.isModel) {
          scene.remove(object);
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      
      // Default material options
      const defaultMaterialOptions = {
        color: 0x3a86ff,
        metalness: 0.2,
        roughness: 0.5,
        flatShading: true,
        transparent: false,
        opacity: 1.0,
        wireframe: false
      };
      
      // Merge with user options
      const materialConfig = { ...defaultMaterialOptions, ...materialOptions };
      
      // Create material
      const material = new THREE.MeshPhysicalMaterial(materialConfig);
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isModel = true;
      
      // Enable shadows
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Center geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.center();
      
      // Position mesh at origin
      mesh.position.set(0, 0, 0);
      
      // Add to scene
      scene.add(mesh);
      
      // Center camera on object
      focusCameraOnObject(mesh, camera, controls);
      
      // Return model info
      return {
        mesh,
        dimensions: getGeometryDimensions(geometry),
        volume: calculateGeometryVolume(geometry)
      };
    } catch (error) {
      console.error('Error loading geometry:', error);
      throw error;
    }
  }
  
  // Focus camera on object
  function focusCameraOnObject(object, camera, controls) {
    // Calculate bounding box
    object.geometry.computeBoundingBox();
    const boundingBox = object.geometry.boundingBox.clone();
    
    // Calculate size of bounding box
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Calculate center of bounding box
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    // Set position based on object size
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let distance = Math.abs(maxDim / Math.sin(fov / 2));
    
    // Set minimum distance
    distance = Math.max(distance, 50);
    
    // Position camera
    camera.position.set(distance, distance, distance);
    
    // Set controls target to center of object
    if (controls.target) {
      controls.target.copy(center);
    }
    
    // Update camera
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    
    // Update controls
    controls.update();
  }
  
  // Get geometry dimensions
  function getGeometryDimensions(geometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    
    return {
      width: box.max.x - box.min.x,
      height: box.max.y - box.min.y,
      depth: box.max.z - box.min.z
    };
  }
  
  // Calculate geometry volume
  function calculateGeometryVolume(geometry) {
    let volume = 0;
    
    // Get position attribute
    const positions = geometry.getAttribute('position');
    
    // Process triangles
    for (let i = 0; i < positions.count; i += 3) {
      const v1 = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      
      const v2 = new THREE.Vector3(
        positions.getX(i + 1),
        positions.getY(i + 1),
        positions.getZ(i + 1)
      );
      
      const v3 = new THREE.Vector3(
        positions.getX(i + 2),
        positions.getY(i + 2),
        positions.getZ(i + 2)
      );
      
      // Calculate tetrahedron volume
      volume += calculateTetrahedronVolume(v1, v2, v3);
    }
    
    // Convert to positive value and to cm³
    return Math.abs(volume) / 1000;
  }
  
  // Calculate volume of tetrahedron formed by a triangle and the origin
  function calculateTetrahedronVolume(v1, v2, v3) {
    // Calculate cross product
    const cross = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(v2, v1),
        new THREE.Vector3().subVectors(v3, v1)
      );
    
    // Calculate volume
    return v1.dot(cross) / 6.0;
  }
  
  // Create controls UI
  function createControlsUI(container, scene, camera, controls, config) {
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'visualizer-controls';
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.bottom = '10px';
    controlsContainer.style.right = '10px';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.flexDirection = 'column';
    controlsContainer.style.gap = '5px';
    controlsContainer.style.zIndex = '10';
    
    container.appendChild(controlsContainer);
    
    // Helper function to create control button
    const createControlButton = (iconName, title, onClick) => {
      const button = document.createElement('button');
      button.className = 'visualizer-control-btn';
      button.setAttribute('title', title);
      button.innerHTML = `<span class="material-icon">${iconName}</span>`;
      button.style.width = '36px';
      button.style.height = '36px';
      button.style.borderRadius = '4px';
      button.style.border = '1px solid var(--gray-300)';
      button.style.backgroundColor = 'var(--gray-50)';
      button.style.cursor = 'pointer';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      
      button.addEventListener('click', onClick);
      
      return button;
    };
    
    // Create control buttons
    const resetViewButton = createControlButton('center_focus_strong', 'Reset View', () => {
      resetCamera(camera, controls);
    });
    
    const toggleGridButton = createControlButton('grid_on', 'Toggle Grid', () => {
      const grid = scene.children.find(child => child.isGridHelper);
      if (grid) {
        grid.visible = !grid.visible;
      }
    });
    
    const toggleAxesButton = createControlButton('timeline', 'Toggle Axes', () => {
      const axes = scene.children.find(child => child.isAxesHelper);
      if (axes) {
        axes.visible = !axes.visible;
      }
    });
    
    const toggleShadowsButton = createControlButton('opacity', 'Toggle Shadows', () => {
      const directionalLight = scene.children.find(child => 
        child.isDirectionalLight && child.castShadow !== undefined
      );
      
      if (directionalLight) {
        directionalLight.castShadow = !directionalLight.castShadow;
      }
      
      // Toggle shadow casting on models
      scene.traverse(object => {
        if (object.isMesh) {
          object.castShadow = directionalLight.castShadow;
          object.receiveShadow = directionalLight.castShadow;
        }
      });
    });
    
    const toggleRotationButton = createControlButton('rotate_right', 'Toggle Auto Rotation', () => {
      if (controls.autoRotate !== undefined) {
        controls.autoRotate = !controls.autoRotate;
      }
    });
    
    const toggleLayerViewButton = createControlButton('layers', 'Toggle Layer View', () => {
      const layerControls = container.querySelector('.layer-controls');
      
      if (layerControls) {
        // Disable layer view
        toggleLayerViewButton.classList.remove('active');
        disableLayerViewMode(scene);
      } else {
        // Enable layer view
        toggleLayerViewButton.classList.add('active');
        setupLayerViewMode(scene, camera, config);
      }
    });
    
    const screenshotButton = createControlButton('photo_camera', 'Take Screenshot', () => {
      takeScreenshot(renderer, scene, camera);
    });
    
    // Add buttons to container
    controlsContainer.appendChild(resetViewButton);
    controlsContainer.appendChild(toggleGridButton);
    controlsContainer.appendChild(toggleAxesButton);
    controlsContainer.appendChild(toggleShadowsButton);
    controlsContainer.appendChild(toggleRotationButton);
    controlsContainer.appendChild(toggleLayerViewButton);
    controlsContainer.appendChild(screenshotButton);
    
    // Return object with event cleanup function
    return {
      removeEventListeners: () => {
        resetViewButton.removeEventListener('click', () => {});
        toggleGridButton.removeEventListener('click', () => {});
        toggleAxesButton.removeEventListener('click', () => {});
        toggleShadowsButton.removeEventListener('click', () => {});
        toggleRotationButton.removeEventListener('click', () => {});
        toggleLayerViewButton.removeEventListener('click', () => {});
        screenshotButton.removeEventListener('click', () => {});
      }
    };
  }
  
  // Create layer controls UI
  function createLayerControls(container, visualizer) {
    // Remove existing layer controls if any
    const existingControls = container.querySelector('.layer-controls');
    if (existingControls) {
      existingControls.remove();
    }
    
    // Get layer info
    const { currentLayer, maxLayer, layerHeight } = visualizer.getLayerInfo();
    
    // Create controls container
    const layerControls = document.createElement('div');
    layerControls.className = 'layer-controls';
    layerControls.style.position = 'absolute';
    layerControls.style.bottom = '10px';
    layerControls.style.left = '10px';
    layerControls.style.padding = '5px 10px';
    layerControls.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    layerControls.style.borderRadius = '4px';
    layerControls.style.display = 'flex';
    layerControls.style.flexDirection = 'column';
    layerControls.style.zIndex = '10';
    layerControls.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    
    // Create layer info
    const layerInfo = document.createElement('div');
    layerInfo.style.marginBottom = '5px';
    layerInfo.style.fontSize = '12px';
    layerInfo.textContent = `Layer: ${currentLayer}/${maxLayer} (${(currentLayer * layerHeight).toFixed(2)}mm)`;
    
    // Create controls row
    const controlsRow = document.createElement('div');
    controlsRow.style.display = 'flex';
    controlsRow.style.alignItems = 'center';
    controlsRow.style.gap = '5px';
    
    // Create previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'layer-btn';
    prevButton.innerHTML = '<span class="material-icon">chevron_left</span>';
    prevButton.style.width = '30px';
    prevButton.style.height = '30px';
    prevButton.style.borderRadius = '4px';
    prevButton.style.border = '1px solid var(--gray-300)';
    prevButton.style.backgroundColor = 'var(--gray-50)';
    prevButton.style.cursor = 'pointer';
    prevButton.disabled = currentLayer <= 0;
    
    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = maxLayer.toString();
    slider.value = currentLayer.toString();
    slider.style.width = '150px';
    
    // Create next button
    const nextButton = document.createElement('button');
    nextButton.className = 'layer-btn';
    nextButton.innerHTML = '<span class="material-icon">chevron_right</span>';
    nextButton.style.width = '30px';
    nextButton.style.height = '30px';
    nextButton.style.borderRadius = '4px';
    nextButton.style.border = '1px solid var(--gray-300)';
    nextButton.style.backgroundColor = 'var(--gray-50)';
    nextButton.style.cursor = 'pointer';
    nextButton.disabled = currentLayer >= maxLayer;
    
    // Add event listeners
    prevButton.addEventListener('click', () => {
      if (currentLayer > 0) {
        visualizer.setLayer(currentLayer - 1);
        updateLayerInfo();
      }
    });
    
    nextButton.addEventListener('click', () => {
      if (currentLayer < maxLayer) {
        visualizer.setLayer(currentLayer + 1);
        updateLayerInfo();
      }
    });
    
    slider.addEventListener('input', () => {
      const layer = parseInt(slider.value);
      visualizer.setLayer(layer);
      updateLayerInfo();
    });
    
    // Update layer info helper function
    function updateLayerInfo() {
      const { currentLayer, maxLayer, layerHeight } = visualizer.getLayerInfo();
      layerInfo.textContent = `Layer: ${currentLayer}/${maxLayer} (${(currentLayer * layerHeight).toFixed(2)}mm)`;
      prevButton.disabled = currentLayer <= 0;
      nextButton.disabled = currentLayer >= maxLayer;
      slider.value = currentLayer.toString();
    }
    
    // Assemble controls
    controlsRow.appendChild(prevButton);
    controlsRow.appendChild(slider);
    controlsRow.appendChild(nextButton);
    
    layerControls.appendChild(layerInfo);
    layerControls.appendChild(controlsRow);
    
    // Add layer controls to container
    container.appendChild(layerControls);
    
    // Listen for layer changed events
    container.addEventListener('layerChanged', () => {
      updateLayerInfo();
    })}