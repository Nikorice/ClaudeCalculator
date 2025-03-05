/* Project Management Module for 3D Printer Calculator */

// Project state and management
const projectManager = (function() {
    // Private variables
    let currentProject = {
      name: 'New Project',
      description: '',
      created: new Date(),
      modified: new Date(),
      models: [],
      settings: {
        currency: 'USD',
        printerType: '400',
        wallMargin: 10,
        objectSpacing: 15,
        materials: {
          powderDensity: POWDER_KG_PER_CM3,
          binderRatio: BINDER_ML_PER_CM3,
          silicaDensity: SILICA_G_PER_CM3,
          prices: {...pricing}
        }
      }
    };
    
    // Prefix for localStorage keys
    const STORAGE_PREFIX = 'powder3d_';
    
    // Private methods
    function generateId() {
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    }
    
    function saveToLocalStorage(key, data) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
      }
    }
    
    function loadFromLocalStorage(key) {
      try {
        const data = localStorage.getItem(STORAGE_PREFIX + key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
      }
    }
    
    function getAvailableProjects() {
      try {
        const projectList = loadFromLocalStorage('project_list') || [];
        return projectList;
      } catch (error) {
        console.error('Error getting project list:', error);
        return [];
      }
    }
    
    function updateProjectList(projectId, projectName, action = 'add') {
      try {
        let projectList = loadFromLocalStorage('project_list') || [];
        
        if (action === 'add') {
          // Check if project already exists in list
          const existingIndex = projectList.findIndex(p => p.id === projectId);
          
          if (existingIndex >= 0) {
            // Update existing entry
            projectList[existingIndex] = {
              id: projectId,
              name: projectName,
              modified: new Date().toISOString()
            };
          } else {
            // Add new entry
            projectList.push({
              id: projectId,
              name: projectName,
              created: new Date().toISOString(),
              modified: new Date().toISOString()
            });
          }
        } else if (action === 'remove') {
          // Remove from list
          projectList = projectList.filter(p => p.id !== projectId);
        }
        
        // Save updated list
        saveToLocalStorage('project_list', projectList);
        return true;
      } catch (error) {
        console.error('Error updating project list:', error);
        return false;
      }
    }
    
    // Public API
    return {
      /**
       * Create a new project
       * @param {string} name - Project name
       * @param {string} description - Project description
       * @returns {object} New project object
       */
      createProject: function(name = 'New Project', description = '') {
        // Generate project ID
        const projectId = generateId();
        
        // Create new project
        const newProject = {
          id: projectId,
          name: name,
          description: description,
          created: new Date(),
          modified: new Date(),
          models: [],
          settings: {
            currency: document.getElementById('currency')?.value || 'USD',
            printerType: document.querySelector('.printer-model.active')?.getAttribute('data-printer') || '400',
            wallMargin: parseInt(document.getElementById('wallMargin')?.value) || 10,
            objectSpacing: parseInt(document.getElementById('objectSpacing')?.value) || 15,
            materials: {
              powderDensity: POWDER_KG_PER_CM3,
              binderRatio: BINDER_ML_PER_CM3,
              silicaDensity: SILICA_G_PER_CM3, 
              prices: {...pricing}
            }
          }
        };
        
        // Set as current project
        currentProject = newProject;
        
        // Save to localStorage
        saveToLocalStorage('project_' + projectId, newProject);
        
        // Update project list
        updateProjectList(projectId, name);
        
        // Return new project
        return newProject;
      },
      
      /**
       * Save current project
       * @returns {boolean} Success status
       */
      saveProject: function() {
        try {
          // Update modified date
          currentProject.modified = new Date();
          
          // Update settings from UI
          currentProject.settings.currency = document.getElementById('currency')?.value || 'USD';
          currentProject.settings.printerType = document.querySelector('.printer-model.active')?.getAttribute('data-printer') || '400';
          currentProject.settings.wallMargin = parseInt(document.getElementById('wallMargin')?.value) || 10;
          currentProject.settings.objectSpacing = parseInt(document.getElementById('objectSpacing')?.value) || 15;
          
          // Save current models from UI
          this.updateModelsFromUI();
          
          // Save to localStorage
          saveToLocalStorage('project_' + currentProject.id, currentProject);
          
          // Update project list
          updateProjectList(currentProject.id, currentProject.name);
          
          return true;
        } catch (error) {
          console.error('Error saving project:', error);
          return false;
        }
      },
      
      /**
       * Load project by ID
       * @param {string} projectId - Project ID to load
       * @returns {object|null} Loaded project or null if failed
       */
      loadProject: function(projectId) {
        try {
          // Load from localStorage
          const project = loadFromLocalStorage('project_' + projectId);
          
          if (!project) {
            console.error('Project not found:', projectId);
            return null;
          }
          
          // Set as current project
          currentProject = project;
          
          // Apply project settings to UI
          this.applyProjectSettings();
          
          // Apply models to UI
          this.applyModelsToUI();
          
          return project;
        } catch (error) {
          console.error('Error loading project:', error);
          return null;
        }
      },
      
      /**
       * Delete project by ID
       * @param {string} projectId - Project ID to delete
       * @returns {boolean} Success status
       */
      deleteProject: function(projectId) {
        try {
          // Remove from localStorage
          localStorage.removeItem(STORAGE_PREFIX + 'project_' + projectId);
          
          // Update project list
          updateProjectList(projectId, '', 'remove');
          
          // If deleting current project, create a new one
          if (currentProject.id === projectId) {
            this.createProject();
          }
          
          return true;
        } catch (error) {
          console.error('Error deleting project:', error);
          return false;
        }
      },
      
      /**
       * Get list of available projects
       * @returns {Array} List of projects
       */
      getProjectList: function() {
        return getAvailableProjects();
      },
      
      /**
       * Get current project
       * @returns {object} Current project
       */
      getCurrentProject: function() {
        return currentProject;
      },
      
      /**
       * Update current project name
       * @param {string} name - New project name
       * @returns {boolean} Success status
       */
      updateProjectName: function(name) {
        try {
          currentProject.name = name;
          currentProject.modified = new Date();
          
          // Save to localStorage
          saveToLocalStorage('project_' + currentProject.id, currentProject);
          
          // Update project list
          updateProjectList(currentProject.id, name);
          
          return true;
        } catch (error) {
          console.error('Error updating project name:', error);
          return false;
        }
      },
      
      /**
       * Update current project description
       * @param {string} description - New project description
       * @returns {boolean} Success status
       */
      updateProjectDescription: function(description) {
        try {
          currentProject.description = description;
          currentProject.modified = new Date();
          
          // Save to localStorage
          saveToLocalStorage('project_' + currentProject.id, currentProject);
          
          return true;
        } catch (error) {
          console.error('Error updating project description:', error);
          return false;
        }
      },
      
      /**
       * Export project as JSON file
       * @returns {boolean} Success status
       */
      exportProject: function() {
        try {
          // Create JSON string
          const jsonString = JSON.stringify(currentProject, null, 2);
          
          // Create blob
          const blob = new Blob([jsonString], { type: 'application/json' });
          
          // Create download link
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${currentProject.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
          link.style.display = 'none';
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          return true;
        } catch (error) {
          console.error('Error exporting project:', error);
          return false;
        }
      },
      
      /**
       * Import project from JSON file
       * @param {File} file - JSON file to import
       * @returns {Promise<boolean>} Promise resolving to success status
       */
      importProject: function(file) {
        return new Promise((resolve, reject) => {
          try {
            // Validate file
            if (!file || file.type !== 'application/json') {
              reject(new Error('Invalid file format. Please select a JSON file.'));
              return;
            }
            
            // Read file
            const reader = new FileReader();
            
            reader.onload = function(event) {
              try {
                // Parse JSON
                const projectData = JSON.parse(event.target.result);
                
                // Validate project data
                if (!projectData.id || !projectData.name || !projectData.settings) {
                  reject(new Error('Invalid project file format.'));
                  return;
                }
                
                // Generate new ID to avoid conflicts
                projectData.id = generateId();
                
                // Update timestamps
                projectData.imported = new Date();
                projectData.modified = new Date();
                
                // Save to localStorage
                saveToLocalStorage('project_' + projectData.id, projectData);
                
                // Update project list
                updateProjectList(projectData.id, projectData.name);
                
                // Set as current project
                currentProject = projectData;
                
                // Apply project settings to UI
                this.applyProjectSettings();
                
                // Apply models to UI
                this.applyModelsToUI();
                
                resolve(true);
              } catch (error) {
                reject(new Error('Error parsing project file: ' + error.message));
              }
            }.bind(this);
            
            reader.onerror = function() {
              reject(new Error('Error reading file.'));
            };
            
            reader.readAsText(file);
          } catch (error) {
            reject(error);
          }
        });
      },
      
      /**
       * Update models list from UI
       * @returns {boolean} Success status
       */
      updateModelsFromUI: function() {
        try {
          // Get all STL rows
          const stlRows = document.querySelectorAll('.stl-row');
          
          // Clear current models
          currentProject.models = [];
          
          // Process each row
          stlRows.forEach(row => {
            const rowId = row.id;
            
            // Skip if no valid ID
            if (!rowId) return;
            
            // Get model data
            const model = {
              id: rowId,
              name: row.querySelector('.item-name')?.value || 'Unnamed Model',
              quantity: parseInt(row.querySelector('.item-quantity')?.value) || 1,
              orientation: row.querySelector('.orientation-btn.active')?.getAttribute('data-orientation') || 'flat',
              applyGlaze: row.querySelector('.glaze-toggle')?.checked ?? true
            };
            
            // Add to models list
            currentProject.models.push(model);
          });
          
          return true;
        } catch (error) {
          console.error('Error updating models from UI:', error);
          return false;
        }
      },
      
      /**
       * Apply project settings to UI
       * @returns {boolean} Success status
       */
      applyProjectSettings: function() {
        try {
          // Apply settings to UI
          if (currentProject.settings) {
            // Set currency
            const currencySelect = document.getElementById('currency');
            if (currencySelect) {
              currencySelect.value = currentProject.settings.currency || 'USD';
              // Trigger change event to update display
              const event = new Event('change');
              currencySelect.dispatchEvent(event);
            }
            
            // Set printer type
            const printerType = currentProject.settings.printerType || '400';
            document.querySelectorAll('.printer-model').forEach(btn => {
              if (btn.getAttribute('data-printer') === printerType) {
                btn.click(); // Use click to trigger event handlers
              }
            });
            
            // Set wall margin
            const wallMarginInput = document.getElementById('wallMargin');
            if (wallMarginInput) {
              wallMarginInput.value = currentProject.settings.wallMargin || 10;
            }
            
            // Set object spacing
            const objectSpacingInput = document.getElementById('objectSpacing');
            if (objectSpacingInput) {
              objectSpacingInput.value = currentProject.settings.objectSpacing || 15;
            }
            
            // Apply material settings if available
            if (currentProject.settings.materials) {
              // Update global constants from project settings
              if (typeof currentProject.settings.materials.powderDensity === 'number') {
                POWDER_KG_PER_CM3 = currentProject.settings.materials.powderDensity;
              }
              
              if (typeof currentProject.settings.materials.binderRatio === 'number') {
                BINDER_ML_PER_CM3 = currentProject.settings.materials.binderRatio;
              }
              
              if (typeof currentProject.settings.materials.silicaDensity === 'number') {
                SILICA_G_PER_CM3 = currentProject.settings.materials.silicaDensity;
              }
              
              // Update pricing if available
              if (currentProject.settings.materials.prices) {
                // Deep copy prices to avoid reference issues
                pricing = JSON.parse(JSON.stringify(currentProject.settings.materials.prices));
                
                // Update price inputs in advanced settings
                updateAdvancedSettingsDisplay();
              }
            }
            
            // Apply settings by updating UI
            if (typeof updateSettings === 'function') {
              updateSettings();
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error applying project settings:', error);
          return false;
        }
      },
      
      /**
       * Apply models to UI
       * @returns {boolean} Success status
       */
      applyModelsToUI: function() {
        try {
          // Clear existing STL rows
          const stlRows = document.querySelectorAll('.stl-row');
          stlRows.forEach(row => {
            if (typeof removeSTLRow === 'function') {
              removeSTLRow(row.id);
            } else {
              row.remove();
            }
          });
          
          // Create new rows for models
          if (currentProject.models && currentProject.models.length > 0) {
            // models in project don't have the actual STL files,
            // so we'll just create empty rows with the saved settings
            currentProject.models.forEach(model => {
              // Create a new STL row
              const rowId = typeof createSTLRow === 'function' ? 
                createSTLRow() : 
                createUniqueId();
              
              if (!rowId) return;
              
              // Get the created row
              const row = document.getElementById(rowId);
              if (!row) return;
              
              // Apply model settings
              // Set name if item-name input exists
              const nameInput = row.querySelector('.item-name');
              if (nameInput) {
                nameInput.value = model.name || 'Unnamed Model';
              }
              
              // Set quantity if item-quantity input exists
              const quantityInput = row.querySelector('.item-quantity');
              if (quantityInput) {
                quantityInput.value = model.quantity || 1;
              }
              
              // Set orientation
              const orientation = model.orientation || 'flat';
              const orientationBtns = row.querySelectorAll('.orientation-btn');
              orientationBtns.forEach(btn => {
                if (btn.getAttribute('data-orientation') === orientation) {
                  btn.click(); // Use click to trigger event handlers
                }
              });
              
              // Set glaze toggle
              const glazeToggle = row.querySelector('.glaze-toggle');
              if (glazeToggle) {
                glazeToggle.checked = model.applyGlaze !== undefined ? model.applyGlaze : true;
                // Trigger change event to update calculations
                const event = new Event('change');
                glazeToggle.dispatchEvent(event);
              }
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error applying models to UI:', error);
          return false;
        }
      },
      
      /**
       * Initialize project management
       * @returns {boolean} Success status
       */
      initialize: function() {
        try {
          // Check if there's a default project
          const defaultProject = loadFromLocalStorage('default_project');
          
          if (defaultProject) {
            // Load the default project
            this.loadProject(defaultProject);
          } else {
            // Create a new project
            this.createProject();
          }
          
          // Add UI for project management
          this.addProjectManagementUI();
          
          return true;
        } catch (error) {
          console.error('Error initializing project management:', error);
          return false;
        }
      },
      
      /**
       * Add project management UI
       * @returns {boolean} Success status
       */
      addProjectManagementUI: function() {
        try {
          // Create project management UI
          const header = document.querySelector('header');
          if (!header) return false;
          
          // Create project header
          const projectHeader = document.createElement('div');
          projectHeader.className = 'project-header';
          projectHeader.innerHTML = `
            <div class="project-info">
              <input type="text" id="project-name" value="${currentProject.name}" placeholder="Project Name">
              <span class="project-modified">Last modified: ${this.formatDate(currentProject.modified)}</span>
            </div>
            <div class="project-actions">
              <button id="new-project-btn" class="btn btn-outline btn-sm">
                <span class="material-icon">add</span> New
              </button>
              <button id="save-project-btn" class="btn btn-outline btn-sm">
                <span class="material-icon">save</span> Save
              </button>
              <button id="load-project-btn" class="btn btn-outline btn-sm">
                <span class="material-icon">folder_open</span> Load
              </button>
              <button id="export-project-btn" class="btn btn-outline btn-sm">
                <span class="material-icon">download</span> Export
              </button>
              <button id="import-project-btn" class="btn btn-outline btn-sm">
                <span class="material-icon">upload</span> Import
              </button>
            </div>
          `;
          
          // Insert after the title
          header.appendChild(projectHeader);
          
          // Add styles
          const style = document.createElement('style');
          style.textContent = `
            .project-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: var(--space-4);
              padding: var(--space-3) var(--space-4);
              background-color: var(--gray-50);
              border-radius: var(--radius);
              border: 1px solid var(--gray-200);
            }
            
            [data-theme="dark"] .project-header {
              background-color: var(--gray-800);
              border-color: var(--gray-700);
            }
            
            .project-info {
              display: flex;
              flex-direction: column;
              gap: var(--space-1);
            }
            
            #project-name {
              font-size: 1.1rem;
              font-weight: 600;
              border: none;
              background: transparent;
              color: var(--gray-900);
              width: 100%;
              padding: var(--space-1);
              border-radius: var(--radius-sm);
            }
            
            [data-theme="dark"] #project-name {
              color: var(--gray-100);
            }
            
            #project-name:focus {
              outline: none;
              background-color: var(--gray-100);
            }
            
            [data-theme="dark"] #project-name:focus {
              background-color: var(--gray-700);
            }
            
            .project-modified {
              font-size: 0.8rem;
              color: var(--gray-500);
            }
            
            [data-theme="dark"] .project-modified {
              color: var(--gray-400);
            }
            
            .project-actions {
              display: flex;
              gap: var(--space-2);
              flex-wrap: wrap;
            }
            
            @media (max-width: 768px) {
              .project-header {
                flex-direction: column;
                gap: var(--space-3);
                align-items: flex-start;
              }
              
              .project-actions {
                width: 100%;
                justify-content: flex-start;
              }
            }
            
            /* Project list modal */
            .project-list-modal {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
              opacity: 0;
              visibility: hidden;
              transition: opacity 0.2s ease, visibility 0.2s ease;
            }
            
            .project-list-modal.show {
              opacity: 1;
              visibility: visible;
            }
            
            .project-list-content {
              background-color: white;
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-lg);
              width: 90%;
              max-width: 600px;
              max-height: 80vh;
              overflow-y: auto;
              padding: var(--space-5);
              transform: translateY(20px);
              transition: transform 0.3s ease;
            }
            
            [data-theme="dark"] .project-list-content {
              background-color: var(--gray-800);
            }
            
            .project-list-modal.show .project-list-content {
              transform: translateY(0);
            }
            
            .project-list-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: var(--space-4);
            }
            
            .project-list-title {
              font-size: 1.2rem;
              font-weight: 600;
              margin: 0;
            }
            
            .project-list-close {
              background: transparent;
              border: none;
              cursor: pointer;
              color: var(--gray-500);
              font-size: 1.5rem;
              padding: 0;
            }
            
            .project-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            
            .project-list-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: var(--space-3);
              border-bottom: 1px solid var(--gray-200);
              transition: background-color 0.2s ease;
            }
            
            [data-theme="dark"] .project-list-item {
              border-color: var(--gray-700);
            }
            
            .project-list-item:hover {
              background-color: var(--gray-100);
            }
            
            [data-theme="dark"] .project-list-item:hover {
              background-color: var(--gray-700);
            }
            
            .project-list-item-info {
              display: flex;
              flex-direction: column;
              gap: var(--space-1);
            }
            
            .project-list-item-name {
              font-weight: 500;
            }
            
            .project-list-item-date {
              font-size: 0.8rem;
              color: var(--gray-500);
            }
            
            [data-theme="dark"] .project-list-item-date {
              color: var(--gray-400);
            }
            
            .project-list-item-actions {
              display: flex;
              gap: var(--space-2);
            }
            
            .project-list-empty {
              text-align: center;
              padding: var(--space-4);
              color: var(--gray-500);
            }
            
            [data-theme="dark"] .project-list-empty {
              color: var(--gray-400);
            }
            
            /* Import file input */
            #import-project-file {
              display: none;
            }
          `;
          
          document.head.appendChild(style);
          
          // Add event listeners
          document.getElementById('project-name').addEventListener('change', (e) => {
            this.updateProjectName(e.target.value);
          });
          
          document.getElementById('new-project-btn').addEventListener('click', () => {
            if (confirm('Create a new project? Any unsaved changes will be lost.')) {
              this.createProject();
              document.getElementById('project-name').value = currentProject.name;
              document.querySelector('.project-modified').textContent = `Last modified: ${this.formatDate(currentProject.modified)}`;
            }
          });
          
          document.getElementById('save-project-btn').addEventListener('click', () => {
            if (this.saveProject()) {
              document.querySelector('.project-modified').textContent = `Last modified: ${this.formatDate(currentProject.modified)}`;
              showNotification('Project Saved', 'Project has been saved successfully.', 'success', 3000);
            } else {
              showNotification('Save Failed', 'Failed to save project.', 'error', 3000);
            }
          });
          
          document.getElementById('load-project-btn').addEventListener('click', () => {
            this.showProjectListModal();
          });
          
          document.getElementById('export-project-btn').addEventListener('click', () => {
            if (this.exportProject()) {
              showNotification('Project Exported', 'Project has been exported successfully.', 'success', 3000);
            } else {
              showNotification('Export Failed', 'Failed to export project.', 'error', 3000);
            }
          });
          
          // Create hidden file input for import
          const importFileInput = document.createElement('input');
          importFileInput.type = 'file';
          importFileInput.id = 'import-project-file';
          importFileInput.accept = '.json';
          document.body.appendChild(importFileInput);
          
          document.getElementById('import-project-btn').addEventListener('click', () => {
            importFileInput.click();
          });
          
          importFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              
              this.importProject(file)
                .then(() => {
                  document.getElementById('project-name').value = currentProject.name;
                  document.querySelector('.project-modified').textContent = `Last modified: ${this.formatDate(currentProject.modified)}`;
                  showNotification('Project Imported', 'Project has been imported successfully.', 'success', 3000);
                })
                .catch(error => {
                  showNotification('Import Failed', error.message, 'error', 3000);
                })
                .finally(() => {
                  // Reset file input
                  importFileInput.value = '';
                });
            }
          });
          
          return true;
        } catch (error) {
          console.error('Error adding project management UI:', error);
          return false;
        }
      },
      
      /**
       * Show project list modal
       * @returns {boolean} Success status
       */
      showProjectListModal: function() {
        try {
          // Create modal if it doesn't exist
          let modal = document.querySelector('.project-list-modal');
          
          if (!modal) {
            modal = document.createElement('div');
            modal.className = 'project-list-modal';
            
            modal.innerHTML = `
              <div class="project-list-content">
                <div class="project-list-header">
                  <h3 class="project-list-title">Load Project</h3>
                  <button class="project-list-close">&times;</button>
                </div>
                <div class="project-list-container">
                  <ul class="project-list">
                    <!-- Projects will be added here -->
                  </ul>
                </div>
              </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add close button handler
            modal.querySelector('.project-list-close').addEventListener('click', () => {
              modal.classList.remove('show');
            });
            
            // Close when clicking outside
            modal.addEventListener('click', (e) => {
              if (e.target === modal) {
                modal.classList.remove('show');
              }
            });
          }
          
          // Get project list
          const projectList = this.getProjectList();
          
          // Populate project list
          const projectListElement = modal.querySelector('.project-list');
          projectListElement.innerHTML = '';
          
          if (projectList.length === 0) {
            projectListElement.innerHTML = `
              <div class="project-list-empty">
                <span class="material-icon">folder_off</span>
                <p>No saved projects found.</p>
              </div>
            `;
          } else {
            projectList.forEach(project => {
              const listItem = document.createElement('li');
              listItem.className = 'project-list-item';
              
              // Format dates
              const created = new Date(project.created);
              const modified = new Date(project.modified);
              
              listItem.innerHTML = `
                <div class="project-list-item-info">
                  <div class="project-list-item-name">${project.name}</div>
                  <div class="project-list-item-date">
                    Modified: ${this.formatDate(modified)}
                  </div>
                </div>
                <div class="project-list-item-actions">
                  <button class="btn btn-sm btn-primary load-project-item" data-id="${project.id}">
                    <span class="material-icon">folder_open</span> Load
                  </button>
                  <button class="btn btn-sm btn-danger delete-project-item" data-id="${project.id}">
                    <span class="material-icon">delete</span>
                  </button>
                </div>
              `;
              
              projectListElement.appendChild(listItem);
            });
            
            // Add event listeners for load and delete buttons
            projectListElement.querySelectorAll('.load-project-item').forEach(btn => {
              btn.addEventListener('click', () => {
                const projectId = btn.getAttribute('data-id');
                
                if (this.loadProject(projectId)) {
                  document.getElementById('project-name').value = currentProject.name;
                  document.querySelector('.project-modified').textContent = `Last modified: ${this.formatDate(currentProject.modified)}`;
                  showNotification('Project Loaded', 'Project has been loaded successfully.', 'success', 3000);
                  modal.classList.remove('show');
                } else {
                  showNotification('Load Failed', 'Failed to load project.', 'error', 3000);
                }
              });
            });
            
            projectListElement.querySelectorAll('.delete-project-item').forEach(btn => {
              btn.addEventListener('click', () => {
                const projectId = btn.getAttribute('data-id');
                
                if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                  if (this.deleteProject(projectId)) {
                    // Remove from list
                    btn.closest('.project-list-item').remove();
                    
                    // Show empty message if no projects left
                    if (projectListElement.children.length === 0) {
                      projectListElement.innerHTML = `
                        <div class="project-list-empty">
                          <span class="material-icon">folder_off</span>
                          <p>No saved projects found.</p>
                        </div>
                      `;
                    }
                    
                    showNotification('Project Deleted', 'Project has been deleted successfully.', 'success', 3000);
                  } else {
                    showNotification('Delete Failed', 'Failed to delete project.', 'error', 3000);
                  }
                }
              });
            });
          }
          
          // Show modal
          modal.classList.add('show');
          
          return true;
        } catch (error) {
          console.error('Error showing project list modal:', error);
          return false;
        }
      },
      
      /**
       * Format date for display
       * @param {Date|string} date - Date to format
       * @returns {string} Formatted date
       */
      formatDate: function(date) {
        try {
          // Convert to Date object if string
          if (typeof date === 'string') {
            date = new Date(date);
          }
          
          // Format date
          return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Unknown';
        }
      }
    };
  })();
  
  // Initialize project management when document is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for main app initialization
    setTimeout(() => {
      projectManager.initialize();
    }, 1000);
  });