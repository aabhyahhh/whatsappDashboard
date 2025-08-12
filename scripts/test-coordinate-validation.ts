import { validateCoordinates, getSupportedRegions, isInRegion, getRegionForCoordinates } from '../src/utils/coordinateValidation';

// Test coordinate validation for multiple regions
function testCoordinateValidation() {
  console.log('🧪 Testing Coordinate Validation for Multiple Regions');
  console.log('===================================================');
  
  // Test coordinates
  const testCoordinates = [
    // Ahmedabad/Gandhinagar coordinates
    { lat: 23.0210, lng: 72.5714, name: 'Ahmedabad City Center' },
    { lat: 23.2156, lng: 72.6369, name: 'Gandhinagar City Center' },
    { lat: 22.5, lng: 72.0, name: 'Ahmedabad Region - Min Boundary' },
    { lat: 23.5, lng: 73.0, name: 'Ahmedabad Region - Max Boundary' },
    
    // Gurgaon, Haryana coordinates
    { lat: 28.4595, lng: 77.0266, name: 'Gurgaon City Center' },
    { lat: 28.498142242432, lng: 76.983039855957, name: 'Gurgaon Test Vendor Location' },
    { lat: 28.0, lng: 76.5, name: 'Gurgaon Region - Min Boundary' },
    { lat: 29.0, lng: 77.5, name: 'Gurgaon Region - Max Boundary' },
    
    // Invalid coordinates (outside both regions)
    { lat: 19.0760, lng: 72.8777, name: 'Mumbai (Outside Regions)' },
    { lat: 12.9716, lng: 77.5946, name: 'Bangalore (Outside Regions)' },
    { lat: 28.6139, lng: 77.2090, name: 'Delhi (Outside Gurgaon Range)' },
    { lat: 22.5726, lng: 88.3639, name: 'Kolkata (Outside Regions)' }
  ];

  console.log('\n📋 Supported Regions:');
  const regions = getSupportedRegions();
  regions.forEach(region => {
    console.log(`   ${region.name}:`);
    console.log(`     Latitude: ${region.latitudeRange.min} - ${region.latitudeRange.max}`);
    console.log(`     Longitude: ${region.longitudeRange.min} - ${region.longitudeRange.max}`);
  });

  console.log('\n🔍 Testing Coordinate Validation:');
  console.log('==================================');

  testCoordinates.forEach((coord, index) => {
    console.log(`\n${index + 1}. Testing: ${coord.name}`);
    console.log(`   Coordinates: ${coord.lat}, ${coord.lng}`);
    
    const validation = validateCoordinates(coord.lat, coord.lng);
    
    if (validation.isValid) {
      console.log(`   ✅ Valid coordinates in region: ${validation.region}`);
      
      // Test region-specific functions
      const regionName = getRegionForCoordinates(coord.lat, coord.lng);
      console.log(`   📍 Region detected: ${regionName}`);
      
      // Test if coordinates are in specific regions
      const isInAhmedabad = isInRegion(coord.lat, coord.lng, 'Ahmedabad/Gandhinagar');
      const isInGurgaon = isInRegion(coord.lat, coord.lng, 'Gurgaon, Haryana');
      console.log(`   🏙️  In Ahmedabad/Gandhinagar: ${isInAhmedabad}`);
      console.log(`   🏙️  In Gurgaon, Haryana: ${isInGurgaon}`);
    } else {
      console.log(`   ❌ Invalid coordinates: ${validation.error}`);
    }
  });

  // Test edge cases
  console.log('\n🧪 Testing Edge Cases:');
  console.log('======================');
  
  const edgeCases = [
    { lat: NaN, lng: 72.5714, name: 'Invalid Latitude (NaN)' },
    { lat: 23.0210, lng: NaN, name: 'Invalid Longitude (NaN)' },
    { lat: 'invalid' as any, lng: 72.5714, name: 'Invalid Latitude Type' },
    { lat: 23.0210, lng: 'invalid' as any, name: 'Invalid Longitude Type' },
    { lat: 22.4999, lng: 72.5714, name: 'Just Outside Ahmedabad (Lat)' },
    { lat: 23.0210, lng: 71.9999, name: 'Just Outside Ahmedabad (Lng)' },
    { lat: 27.9999, lng: 76.9830, name: 'Just Outside Gurgaon (Lat)' },
    { lat: 28.4981, lng: 76.4999, name: 'Just Outside Gurgaon (Lng)' }
  ];

  edgeCases.forEach((coord, index) => {
    console.log(`\n${index + 1}. Edge Case: ${coord.name}`);
    console.log(`   Coordinates: ${coord.lat}, ${coord.lng}`);
    
    const validation = validateCoordinates(coord.lat, coord.lng);
    
    if (validation.isValid) {
      console.log(`   ✅ Valid coordinates in region: ${validation.region}`);
    } else {
      console.log(`   ❌ Invalid coordinates: ${validation.error}`);
    }
  });

  console.log('\n✅ Coordinate validation test completed!');
  console.log('\n📊 Summary:');
  console.log('   - Ahmedabad/Gandhinagar region: Lat 22.5-23.5, Lng 72-73');
  console.log('   - Gurgaon, Haryana region: Lat 28.0-29.0, Lng 76.5-77.5');
  console.log('   - Both regions are now supported for Laari Khojo markers');
}

// Run the test
testCoordinateValidation();
