/* Main Initialization Script for 3D Printer Calculator */

// DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing 3D Printer Calculator...');
    
    try {
      // Initialize core app
      if (typeof init === 'function') {
        init();
        console.log('Core app initialized');
      } else {
        console.warn('Core app initialization function not found');
      }
      
      // Initialize UI enhancements
      if (typeof initUIEnhancements === 'function') {
        setTimeout(() => {
          initUIEnhancements();
          console.log('UI enhancements initialized');
        }, 500);
      }
      
      // Initialize project management
      if (typeof projectManager !== 'undefined' && typeof projectManager.initialize === 'function') {
        setTimeout(() => {
          projectManager.initialize();
          console.log('Project management initialized');
        }, 1000);
      }
      
      // Add event listeners for global functionality
      addGlobalEventListeners();
      
      // Check device capabilities
      if (typeof checkDeviceCapabilities === 'function') {
        checkDeviceCapabilities();
      }
      
      // Enable dark mode toggle
      setupDarkModeToggle();
      
      console.log('Initialization complete');
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  });
  
  // Add global event listeners
  function addGlobalEventListeners() {
    // Add theme toggle button if it doesn't exist
    if (!document.querySelector('.theme-toggle')) {
      const header = document.querySelector('header');
      if (header) {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.setAttribute('title', 'Toggle Dark Mode');
        themeToggle.innerHTML = '<span class="material-icon">dark_mode</span>';
        header.appendChild(themeToggle);
      }
    }
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Ctrl+S or Cmd+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        
        // Save project if project manager is available
        if (typeof projectManager !== 'undefined' && typeof projectManager.saveProject === 'function') {
          projectManager.saveProject();
        }
      }
      
      // Ctrl+N or Cmd+N for new project
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        
        // Create new project if project manager is available
        if (typeof projectManager !== 'undefined' && typeof projectManager.createProject === 'function') {
          if (confirm('Create a new project? Any unsaved changes will be lost.')) {
            projectManager.createProject();
          }
        }
      }
      
      // Ctrl+O or Cmd+O for open project
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        
        // Show project list if project manager is available
        if (typeof projectManager !== 'undefined' && typeof projectManager.showProjectListModal === 'function') {
          projectManager.showProjectListModal();
        }
      }
    });
    
    // Apply settings button event listener
    const updateSettingsBtn = document.getElementById('updateSettings');
    if (updateSettingsBtn) {
      updateSettingsBtn.addEventListener('click', function() {
        if (typeof updateSettings === 'function') {
          updateSettings();
          
          // Show notification
          if (typeof showNotification === 'function') {
            showNotification('Settings Updated', 'Printer settings have been updated.', 'success', 3000);
          }
        }
      });
    }
    
    // Update pricing button event listener
    const updatePricingBtn = document.getElementById('updatePricing');
    if (updatePricingBtn) {
      updatePricingBtn.addEventListener('click', function() {
        if (typeof updatePricing === 'function') {
          updatePricing();
          
          // Show notification
          if (typeof showNotification === 'function') {
            showNotification('Pricing Updated', 'Material pricing has been updated.', 'success', 3000);
          }
        }
      });
    }
    
    // Save settings button event listener
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', function() {
        if (typeof saveMaterialSettings === 'function') {
          saveMaterialSettings();
          
          // Show notification
          if (typeof showNotification === 'function') {
            showNotification('Settings Saved', 'Material settings have been saved.', 'success', 3000);
          }
        }
      });
    }
    
    // Currency select event listener
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
      currencySelect.addEventListener('change', function() {
        if (typeof updateAdvancedSettingsDisplay === 'function') {
          updateAdvancedSettingsDisplay();
        }
        
        if (typeof updateAllResults === 'function') {
          updateAllResults();
        }
      });
    }
    
    // Advanced toggle event listener
    const advancedToggle = document.querySelector('.advanced-toggle');
    if (advancedToggle) {
      advancedToggle.addEventListener('click', function() {
        this.classList.toggle('open');
        const advancedSettings = document.querySelector('.advanced-settings');
        if (advancedSettings) {
          advancedSettings.classList.toggle('open');
        }
      });
    }
    
    // Check for local storage access
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (error) {
      console.warn('Local storage is not available. Project management features will be limited.');
      
      // Show notification
      if (typeof showNotification === 'function') {
        showNotification(
          'Storage Access Limited',
          'Local storage is not available. Project saving will not work.',
          'warning',
          6000
        );
      }
    }
  }
  
  // Setup dark mode toggle
  function setupDarkModeToggle() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('powder3d_theme');
    
    // Apply saved theme or detect system preference
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Check for system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
    
    // Update theme toggle icon
    updateThemeToggleIcon();
    
    // Add event listener to theme toggle button
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Set theme
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Save preference
        localStorage.setItem('powder3d_theme', newTheme);
        
        // Update icon
        updateThemeToggleIcon();
        
        // Dispatch theme change event
        const event = new CustomEvent('themeChanged', { 
          detail: { theme: newTheme }
        });
        document.dispatchEvent(event);
      });
    }
    
    // Add listener for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        // Only apply if user hasn't set a preference
        if (!localStorage.getItem('powder3d_theme')) {
          const newTheme = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', newTheme);
          updateThemeToggleIcon();
          
          // Dispatch theme change event
          const event = new CustomEvent('themeChanged', { 
            detail: { theme: newTheme }
          });
          document.dispatchEvent(event);
        }
      });
    }
  }
  
  // Update theme toggle icon based on current theme
  function updateThemeToggleIcon() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      
      if (currentTheme === 'dark') {
        themeToggle.innerHTML = '<span class="material-icon">light_mode</span>';
        themeToggle.title = 'Switch to Light Mode';
      } else {
        themeToggle.innerHTML = '<span class="material-icon">dark_mode</span>';
        themeToggle.title = 'Switch to Dark Mode';
      }
    }
  }
  
  // Update global settings
  function updateSettings() {
    // Get values from inputs
    const wallMargin = parseInt(document.getElementById('wallMargin')?.value) || 10;
    const objectSpacing = parseInt(document.getElementById('objectSpacing')?.value) || 15;
    
    // Update global constants
    WALL_MARGIN = wallMargin;
    OBJECT_SPACING = objectSpacing;
    
    // Update all results
    if (typeof updateAllResults === 'function') {
      updateAllResults();
    }
    
    // Update printer capacity visualizations
    document.querySelectorAll('.stl-row').forEach(row => {
      if (row.id && typeof updatePrinterCapacity === 'function') {
        updatePrinterCapacity(row.id);
      }
    });
    
    console.log('Settings updated:', { wallMargin, objectSpacing });
  }
  
  // Update pricing values
  function updatePricing() {
    // Get current currency
    const currency = document.getElementById('currency')?.value || 'USD';
    
    // Get pricing values from inputs
    const powderPrice = parseFloat(document.getElementById('pricePowder')?.value) || 100;
    const binderPrice = parseFloat(document.getElementById('priceBinder')?.value) || 0.09;
    const silicaPrice = parseFloat(document.getElementById('priceSilica')?.value) || 0.072;
    const glazePrice = parseFloat(document.getElementById('priceGlaze')?.value) || 0.01;
    
    // Update pricing data
    pricing[currency] = {
      powder: powderPrice,
      binder: binderPrice,
      silica: silicaPrice,
      glaze: glazePrice
    };
    
    // Update all results
    if (typeof updateAllResults === 'function') {
      updateAllResults();
    }
    
    console.log('Pricing updated for', currency, pricing[currency]);
  }
  
  // Save material settings to local storage
  function saveMaterialSettings() {
    try {
      // Get current material settings
      const settings = {
        pricing: {...pricing},
        powderDensity: POWDER_KG_PER_CM3,
        binderRatio: BINDER_ML_PER_CM3,
        silicaDensity: SILICA_G_PER_CM3,
        wallMargin: WALL_MARGIN,
        objectSpacing: OBJECT_SPACING
      };
      
      // Save to local storage
      localStorage.setItem('powder3d_material_settings', JSON.stringify(settings));
      
      return true;
    } catch (error) {
      console.error('Error saving material settings:', error);
      return false;
    }
  }
  
  // Load material settings from local storage
  function loadMaterialSettings() {
    try {
      // Get saved settings
      const savedSettings = localStorage.getItem('powder3d_material_settings');
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Apply settings
        if (settings.pricing) {
          pricing = {...settings.pricing};
        }
        
        if (typeof settings.powderDensity === 'number') {
          POWDER_KG_PER_CM3 = settings.powderDensity;
        }
        
        if (typeof settings.binderRatio === 'number') {
          BINDER_ML_PER_CM3 = settings.binderRatio;
        }
        
        if (typeof settings.silicaDensity === 'number') {
          SILICA_G_PER_CM3 = settings.silicaDensity;
        }
        
        if (typeof settings.wallMargin === 'number') {
          WALL_MARGIN = settings.wallMargin;
        }
        
        if (typeof settings.objectSpacing === 'number') {
          OBJECT_SPACING = settings.objectSpacing;
        }
        
        // Update display
        updateAdvancedSettingsDisplay();
        
        // Update UI values
        const wallMarginInput = document.getElementById('wallMargin');
        if (wallMarginInput) {
          wallMarginInput.value = WALL_MARGIN;
        }
        
        const objectSpacingInput = document.getElementById('objectSpacing');
        if (objectSpacingInput) {
          objectSpacingInput.value = OBJECT_SPACING;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading material settings:', error);
      return false;
    }
  }
  
  // Load material settings on initialization
  setTimeout(loadMaterialSettings, 1500);