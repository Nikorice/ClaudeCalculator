/* Web Worker for STL Processing */

// Message handler
self.onmessage = function(e) {
    const arrayBuffer = e.data;
    
    try {
      const startTime = performance.now();
      const triangles = parseBinarySTL(arrayBuffer);
      const volumeCm3 = computeVolumeCm3(triangles);
      const dimensions = calculateDimensions(triangles);
      
      const processingTime = performance.now() - startTime;
      
      // Send back the result
      self.postMessage({
        success: true,
        volumeCm3,
        dimensions,
        triangleCount: triangles.length,
        processingTime
      });
    } catch (error) {
      self.postMessage({
        success: false,
        error: error.message || 'Unknown error processing STL file'
      });
    }
  };
  
  // Parse binary STL file and return array of triangles
  function parseBinarySTL(arrayBuffer) {
    const data = new DataView(arrayBuffer);
    const numTriangles = data.getUint32(80, true);
    
    // Safety check for very large files
    if (numTriangles > 5000000) {
      throw new Error("STL file too large (over 5 million triangles). Please use a decimated model.");
    }
    
    const triangles = [];
    let offset = 84;
    
    for (let i = 0; i < numTriangles; i++) {
      // Read normal (not used for volume calculation)
      const nx = data.getFloat32(offset, true);
      const ny = data.getFloat32(offset + 4, true);
      const nz = data.getFloat32(offset + 8, true);
      offset += 12;
      
      // Read vertices
      const v1 = [
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      ];
      offset += 12;
      
      const v2 = [
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      ];
      offset += 12;
      
      const v3 = [
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      ];
      offset += 12;
      
      // Skip attribute byte count
      offset += 2;
      
      triangles.push({
        normal: [nx, ny, nz],
        vertices: [v1, v2, v3]
      });
    }
    
    return triangles;
  }
  
  // Compute volume in cm³ using the divergence theorem
  function computeVolumeCm3(triangles) {
    let totalVolMm3 = 0;
    
    for (let i = 0; i < triangles.length; i++) {
      const [v1, v2, v3] = triangles[i].vertices;
      
      // Calculate cross product directly
      const crossX = (v2[1] - v1[1]) * (v3[2] - v1[2]) - (v2[2] - v1[2]) * (v3[1] - v1[1]);
      const crossY = (v2[2] - v1[2]) * (v3[0] - v1[0]) - (v2[0] - v1[0]) * (v3[2] - v1[2]);
      const crossZ = (v2[0] - v1[0]) * (v3[1] - v1[1]) - (v2[1] - v1[1]) * (v3[0] - v1[0]);
      
      // Calculate tetrahedron volume (signed)
      const vol = (v1[0] * crossX + v1[1] * crossY + v1[2] * crossZ) / 6.0;
      totalVolMm3 += vol;
    }
    
    // Convert from mm³ to cm³ (divide by 1000) and ensure positive volume
    return Math.abs(totalVolMm3) / 1000.0;
  }
  
  // Calculate model dimensions (min/max along each axis)
  function calculateDimensions(triangles) {
    if (triangles.length === 0) {
      return { width: 0, depth: 0, height: 0 };
    }
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    // Find min/max for each dimension
    for (let i = 0; i < triangles.length; i++) {
      const vertices = triangles[i].vertices;
      
      for (let j = 0; j < 3; j++) {
        const [x, y, z] = vertices[j];
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }
    }
    
    // Return dimensions
    return {
      width: maxX - minX,
      depth: maxY - minY,
      height: maxZ - minZ,
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    };
  }