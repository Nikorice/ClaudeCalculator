/* Advanced Material Estimation for 3D Printer Calculator */

// Calculate material usage with enhanced accuracy
function calculateMaterialUsage(volumeCm3, dimensions, settings = {}) {
    perfMonitor.start('materialEstimation');
    
    try {
      // Default settings
      const defaults = {
        powderDensity: POWDER_KG_PER_CM3,
        binderRatio: BINDER_ML_PER_CM3,
        silicaDensity: SILICA_G_PER_CM3,
        applyGlaze: true,
        glazeThickness: 0.2, // mm
        glazeFormula: 'standard', // 'standard' or 'economic'
        includeSupports: false,
        supportDensity: 0.3, // 30% density for supports
        supportVolume: 0 // cm³
      };
      
      // Merge with user settings
      const config = { ...defaults, ...settings };
      
      // Basic material calculations
      const powderAmount = volumeCm3 * config.powderDensity; // kg
      const binderAmount = volumeCm3 * config.binderRatio; // ml
      const silicaAmount = volumeCm3 * config.silicaDensity; // g
      
      // Calculate surface area approximately
      const { width, depth, height } = dimensions;
      const surfaceArea = calculateSurfaceArea(width, depth, height); // mm²
      
      // Convert surface area to cm²
      const surfaceAreaCm2 = surfaceArea / 100;
      
      // Calculate glaze amount based on surface area and thickness
      let glazeAmount = 0;
      if (config.applyGlaze) {
        if (config.glazeFormula === 'standard') {
          // Standard formula based on volume and surface area
          glazeAmount = calculateGlazeUsage(volumeCm3);
        } else {
          // Economic formula based primarily on surface area
          glazeAmount = surfaceAreaCm2 * config.glazeThickness * 0.9; // g
        }
      }
      
      // Calculate support material if enabled
      let supportPowder = 0;
      let supportBinder = 0;
      let supportSilica = 0;
      
      if (config.includeSupports && config.supportVolume > 0) {
        // Adjust support volume based on density
        const effectiveSupportVolume = config.supportVolume * config.supportDensity;
        
        // Calculate support materials
        supportPowder = effectiveSupportVolume * config.powderDensity;
        supportBinder = effectiveSupportVolume * config.binderRatio;
        supportSilica = effectiveSupportVolume * config.silicaDensity;
      }
      
      // Calculate total amounts including support material
      const totalPowder = powderAmount + supportPowder;
      const totalBinder = binderAmount + supportBinder;
      const totalSilica = silicaAmount + supportSilica;
      
      // Calculate waste based on empirical data
      const estimatedWaste = {
        powder: totalPowder * 0.05, // 5% powder waste
        binder: totalBinder * 0.08, // 8% binder waste
        silica: totalSilica * 0.03, // 3% silica waste
        glaze: glazeAmount * 0.1 // 10% glaze waste
      };
      
      // Calculate final amounts including waste
      const finalPowder = totalPowder + estimatedWaste.powder;
      const finalBinder = totalBinder + estimatedWaste.binder;
      const finalSilica = totalSilica + estimatedWaste.silica;
      const finalGlaze = glazeAmount + estimatedWaste.glaze;
      
      // Prepare result object
      const result = {
        material: {
          powder: {
            main: powderAmount,
            support: supportPowder,
            waste: estimatedWaste.powder,
            total: finalPowder
          },
          binder: {
            main: binderAmount,
            support: supportBinder,
            waste: estimatedWaste.binder,
            total: finalBinder
          },
          silica: {
            main: silicaAmount,
            support: supportSilica,
            waste: estimatedWaste.silica,
            total: finalSilica
          },
          glaze: {
            main: glazeAmount,
            waste: estimatedWaste.glaze,
            total: finalGlaze
          }
        },
        surfaceArea: surfaceAreaCm2,
        volume: volumeCm3,
        supportVolume: config.supportVolume,
        effectiveSupportVolume: config.includeSupports ? config.supportVolume * config.supportDensity : 0,
        totalWeight: (finalPowder * 1000) + finalSilica + finalGlaze // Convert kg to g and sum
      };
      
      perfMonitor.end('materialEstimation');
      return result;
    } catch (error) {
      console.error('Error calculating material usage:', error);
      perfMonitor.end('materialEstimation');
      return null;
    }
  }
  
  // Calculate approximate surface area of an object
  function calculateSurfaceArea(width, depth, height) {
    // For a rectangular prism: 2(wh + wd + dh)
    return 2 * ((width * height) + (width * depth) + (depth * height));
  }
  
  // Calculate triangle area
  function calculateTriangleArea(v1, v2, v3) {
    // Calculate sides of the triangle
    const a = v1.distanceTo(v2);
    const b = v2.distanceTo(v3);
    const c = v3.distanceTo(v1);
    
    // Calculate semi-perimeter
    const s = (a + b + c) / 2;
    
    // Heron's formula
    return Math.sqrt(s * (s - a) * (s - b) * (s - c));
  }
  
  // Calculate cost based on material usage
  function calculateMaterialCost(materialUsage, priceSettings) {
    if (!materialUsage || !priceSettings) return null;
    
    try {
      // Extract material amounts
      const { powder, binder, silica, glaze } = materialUsage.material;
      
      // Calculate individual costs
      const powderCost = powder.total * priceSettings.powder;
      const binderCost = binder.total * priceSettings.binder;
      const silicaCost = silica.total * priceSettings.silica;
      const glazeCost = glaze.total * priceSettings.glaze;
      
      // Calculate total cost
      const totalCost = powderCost + binderCost + silicaCost + glazeCost;
      
      // Create cost breakdown
      return {
        powder: powderCost,
        binder: binderCost,
        silica: silicaCost,
        glaze: glazeCost,
        total: totalCost
      };
    } catch (error) {
      console.error('Error calculating material cost:', error);
      return null;
    }
  }
  
  // Generate material report for printing
  function generateMaterialReport(materialUsage, costs, currency = 'USD') {
    if (!materialUsage || !costs) return '';
    
    try {
      const currencySymbol = currencySymbols[currency] || 
  
  // Calculate support volume based on object geometry and orientation
  function calculateSupportVolume(geometry, orientation) {
    perfMonitor.start('supportCalculation');
    
    try {
      // This is a simplified approximation
      // For real models, this would require analyzing the geometry for overhangs
      
      // Default to no support
      let supportVolume = 0;
      
      if (!geometry) {
        perfMonitor.end('supportCalculation');
        return 0;
      }
      
      // For STL geometry, we can estimate based on overhangs
      if (geometry.isBufferGeometry) {
        // Get the position attribute from the geometry
        const positions = geometry.getAttribute('position');
        
        if (!positions) {
          perfMonitor.end('supportCalculation');
          return 0;
        }
        
        // Count triangles with severe overhangs
        let overhangArea = 0;
        const threshold = Math.cos(Math.PI * 0.25); // 45 degrees threshold
        
        for (let i = 0; i < positions.count; i += 3) {
          // Calculate normal for this triangle
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
          
          // Calculate triangle normal
          const side1 = new THREE.Vector3().subVectors(v2, v1);
          const side2 = new THREE.Vector3().subVectors(v3, v1);
          const normal = new THREE.Vector3().crossVectors(side1, side2).normalize();
          
          // Check if this is an overhang (based on orientation)
          const buildDirection = orientation === 'vertical' ? 
            new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
          
          const dotProduct = normal.dot(buildDirection);
          
          if (dotProduct < -threshold) {
            // This is an overhang facing down
            // Calculate triangle area
            const triangleArea = calculateTriangleArea(v1, v2, v3);
            overhangArea += triangleArea;
          }
        }
        
        // Estimate support volume based on overhang area
        // We assume an average support height of 1/4 the object height
        const boundingBox = new THREE.Box3().setFromBufferAttribute(positions);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        
        const objectHeight = orientation === 'vertical' ? size.z : size.y;
        const avgSupportHeight = objectHeight * 0.25;
        
        supportVolume = (overhangArea * avgSupportHeight) / 1000; // Convert to cm³
      } else {
        // For simplified box geometry, estimate based on orientation
        const { width, depth, height } = geometry;
        
        if (orientation === 'vertical') {
          // Vertical orientation usually requires more support
          // Estimate 15% of volume as support for tall objects
          supportVolume = (width * depth * height * 0.15) / 1000; // Convert to cm³
        } else {
          // Flat orientation typically needs less support
          // Estimate 5% of volume as support
          supportVolume = (width * depth * height * 0.05) / 1000; // Convert to cm³
        }
      }
      
      perfMonitor.end('supportCalculation');
      return supportVolume;
    } catch (error) {
      console.error('Error calculating support volume:', error);
      perfMonitor.end('supportCalculation');
      return 0;
    }
  };
      
      // Format number with unit
      const formatNumber = (value, unit, decimals = 2) => {
        return `${value.toFixed(decimals)} ${unit}`;
      };
      
      // Format price
      const formatPrice = (value) => {
        return `${currencySymbol}${value.toFixed(2)}`;
      };
      
      // Generate report
      const report = `
      === MATERIAL ESTIMATION REPORT ===
      
      VOLUME & WEIGHT
      - Total volume: ${formatNumber(materialUsage.volume, 'cm³')}
      - Support volume: ${formatNumber(materialUsage.supportVolume, 'cm³')}
      - Surface area: ${formatNumber(materialUsage.surfaceArea, 'cm²')}
      - Total weight: ${formatNumber(materialUsage.totalWeight, 'g', 1)}
      
      MATERIAL BREAKDOWN
      - Powder: ${formatNumber(materialUsage.material.powder.total, 'kg')} (${formatPrice(costs.powder)})
        - Main object: ${formatNumber(materialUsage.material.powder.main, 'kg')}
        - Support: ${formatNumber(materialUsage.material.powder.support, 'kg')}
        - Estimated waste: ${formatNumber(materialUsage.material.powder.waste, 'kg')}
      
      - Binder: ${formatNumber(materialUsage.material.binder.total, 'ml')} (${formatPrice(costs.binder)})
        - Main object: ${formatNumber(materialUsage.material.binder.main, 'ml')}
        - Support: ${formatNumber(materialUsage.material.binder.support, 'ml')}
        - Estimated waste: ${formatNumber(materialUsage.material.binder.waste, 'ml')}
      
      - Silica: ${formatNumber(materialUsage.material.silica.total, 'g')} (${formatPrice(costs.silica)})
        - Main object: ${formatNumber(materialUsage.material.silica.main, 'g')}
        - Support: ${formatNumber(materialUsage.material.silica.support, 'g')}
        - Estimated waste: ${formatNumber(materialUsage.material.silica.waste, 'g')}
      
      - Glaze: ${formatNumber(materialUsage.material.glaze.total, 'g')} (${formatPrice(costs.glaze)})
        - Main coating: ${formatNumber(materialUsage.material.glaze.main, 'g')}
        - Estimated waste: ${formatNumber(materialUsage.material.glaze.waste, 'g')}
      
      TOTAL COST: ${formatPrice(costs.total)}
      `;
      
      return report;
    } catch (error) {
      console.error('Error generating material report:', error);
      return 'Error generating report';
    }
  }
  
  // Calculate support volume based on object geometry and orientation
  function calculateSupportVolume(geometry, orientation) {
    perfMonitor.start('supportCalculation');
    
    try {
      // This is a simplified approximation
      // For real models, this would require analyzing the geometry for overhangs
      
      // Default to no support
      let supportVolume = 0;
      
      if (!geometry) {
        perfMonitor.end('supportCalculation');
        return 0;
      }
      
      // For STL geometry, we can estimate based on overhangs
      if (geometry.isBufferGeometry) {
        // Get the position attribute from the geometry
        const positions = geometry.getAttribute('position');
        
        if (!positions) {
          perfMonitor.end('supportCalculation');
          return 0;
        }
        
        // Count triangles with severe overhangs
        let overhangArea = 0;
        const threshold = Math.cos(Math.PI * 0.25); // 45 degrees threshold
        
        for (let i = 0; i < positions.count; i += 3) {
          // Calculate normal for this triangle
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
          
          // Calculate triangle normal
          const side1 = new THREE.Vector3().subVectors(v2, v1);
          const side2 = new THREE.Vector3().subVectors(v3, v1);
          const normal = new THREE.Vector3().crossVectors(side1, side2).normalize();
          
          // Check if this is an overhang (based on orientation)
          const buildDirection = orientation === 'vertical' ? 
            new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
          
          const dotProduct = normal.dot(buildDirection);
          
          if (dotProduct < -threshold) {
            // This is an overhang facing down
            // Calculate triangle area
            const triangleArea = calculateTriangleArea(v1, v2, v3);
            overhangArea += triangleArea;
          }
        }
        
        // Estimate support volume based on overhang area
        // We assume an average support height of 1/4 the object height
        const boundingBox = new THREE.Box3().setFromBufferAttribute(positions);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        
        const objectHeight = orientation === 'vertical' ? size.z : size.y;
        const avgSupportHeight = objectHeight * 0.25;
        
        supportVolume = (overhangArea * avgSupportHeight) / 1000; // Convert to cm³
      } else {
        // For simplified box geometry, estimate based on orientation
        const { width, depth, height } = geometry;
        
        if (orientation === 'vertical') {
          // Vertical orientation usually requires more support
          // Estimate 15% of volume as support for tall objects
          supportVolume = (width * depth * height * 0.15) / 1000; // Convert to cm³
        } else {
          // Flat orientation typically needs less support
          // Estimate 5% of volume as support
          supportVolume = (width * depth * height * 0.05) / 1000; // Convert to cm³
        }
      }
      
      perfMonitor.end('supportCalculation');
      return supportVolume;
    } catch (error) {
      console.error('Error calculating support volume:', error);
      perfMonitor.end('supportCalculation');
      return 0;
    }
  }