// Coordinate validation utility for Laari Khojo platform
// Supports multiple regions: Ahmedabad/Gandhinagar and Gurgaon, Haryana

export interface Region {
  name: string;
  latitudeRange: { min: number; max: number };
  longitudeRange: { min: number; max: number };
}

// Define supported regions
export const SUPPORTED_REGIONS: Region[] = [
  {
    name: 'Ahmedabad/Gandhinagar',
    latitudeRange: { min: 22.5, max: 23.5 },
    longitudeRange: { min: 72, max: 73 }
  },
  {
    name: 'Gurgaon, Haryana',
    latitudeRange: { min: 28.0, max: 29.0 },
    longitudeRange: { min: 76.5, max: 77.5 }
  }
];

export interface CoordinateValidationResult {
  isValid: boolean;
  region?: string;
  error?: string;
}

/**
 * Validates if coordinates are within any supported region
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Validation result with region name if valid
 */
export function validateCoordinates(latitude: number, longitude: number): CoordinateValidationResult {
  // Check if coordinates are valid numbers
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
      isNaN(latitude) || isNaN(longitude)) {
    return {
      isValid: false,
      error: 'Invalid coordinate values'
    };
  }

  // Check each supported region
  for (const region of SUPPORTED_REGIONS) {
    const isInLatitudeRange = latitude >= region.latitudeRange.min && latitude <= region.latitudeRange.max;
    const isInLongitudeRange = longitude >= region.longitudeRange.min && longitude <= region.longitudeRange.max;
    
    if (isInLatitudeRange && isInLongitudeRange) {
      return {
        isValid: true,
        region: region.name
      };
    }
  }

  // If not in any supported region, return error with expected ranges
  const expectedRanges = SUPPORTED_REGIONS.map(region => 
    `${region.name}: Lat ${region.latitudeRange.min}-${region.latitudeRange.max}, Lng ${region.longitudeRange.min}-${region.longitudeRange.max}`
  ).join('; ');

  return {
    isValid: false,
    error: `Coordinates outside supported regions. Expected ranges: ${expectedRanges}`
  };
}

/**
 * Gets all supported regions
 * @returns Array of supported regions
 */
export function getSupportedRegions(): Region[] {
  return [...SUPPORTED_REGIONS];
}

/**
 * Checks if coordinates are in a specific region
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param regionName - Name of the region to check
 * @returns True if coordinates are in the specified region
 */
export function isInRegion(latitude: number, longitude: number, regionName: string): boolean {
  const region = SUPPORTED_REGIONS.find(r => r.name === regionName);
  if (!region) {
    return false;
  }

  const isInLatitudeRange = latitude >= region.latitudeRange.min && latitude <= region.latitudeRange.max;
  const isInLongitudeRange = longitude >= region.longitudeRange.min && longitude <= region.longitudeRange.max;
  
  return isInLatitudeRange && isInLongitudeRange;
}

/**
 * Gets the region name for given coordinates
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Region name if coordinates are valid, undefined otherwise
 */
export function getRegionForCoordinates(latitude: number, longitude: number): string | undefined {
  const validation = validateCoordinates(latitude, longitude);
  return validation.isValid ? validation.region : undefined;
}

/**
 * Formats coordinates for display
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Formatted coordinate string
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * Creates a Google Maps link for coordinates
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Google Maps URL
 */
export function createMapsLink(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}
