# Location Update System for Laari Khojo Platform

## Overview

This system automatically updates vendor location coordinates from WhatsApp location pins and stores them in both the User model and a dedicated VendorLocation model for optimal map display on the Laari Khojo platform.

## Architecture

### Models

#### 1. User Model (Existing)
```typescript
interface IUser {
  name: string;
  contactNumber: string;
  mapsLink?: string;
  location?: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  // ... other fields
}
```

#### 2. VendorLocation Model (New)
```typescript
interface IVendorLocation {
  phone: string;
  location: {
    lat: number;
    lng: number;
  };
  updatedAt: Date;
}
```

### Data Flow

1. **WhatsApp Location Received**: Vendor sends location via WhatsApp
2. **Webhook Processing**: Twilio webhook receives location data
3. **Coordinate Extraction**: System extracts coordinates from various formats
4. **Database Updates**: Updates both User and VendorLocation collections
5. **Map Display**: Frontend retrieves locations for map markers

## Implementation Details

### Webhook Location Processing

The webhook (`server/routes/webhook.ts`) handles location updates in the following order:

1. **Native Twilio Location Fields** (Preferred)
   - `Latitude` and `Longitude` from Twilio payload
   - Most accurate and reliable

2. **Message Body Extraction** (Fallback)
   - Google Maps URLs
   - WhatsApp location sharing formats
   - Various coordinate patterns

### Coordinate Extraction Functions

#### Google Maps URL Extraction
```typescript
function extractCoordinatesFromGoogleMaps(url: string): { latitude: number; longitude: number } | null
```
Supports multiple Google Maps URL formats:
- `?q=lat,lng`
- `@lat,lng`
- `/@lat,lng`

#### WhatsApp Location Extraction
```typescript
function extractCoordinatesFromWhatsAppLocation(body: string): { latitude: number; longitude: number } | null
```
Supports various coordinate formats:
- `Location: lat, lng`
- `lat: x, lng: y`
- `coordinates: lat, lng`
- Raw coordinate pairs

### Database Updates

When location coordinates are received:

1. **User Model Update**:
   ```typescript
   user.location = {
     type: 'Point',
     coordinates: [longitude, latitude]
   };
   user.mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
   ```

2. **VendorLocation Model Update**:
   ```typescript
   await VendorLocation.findOneAndUpdate(
     { phone: phone },
     {
       phone: phone,
       location: { lat: latitude, lng: longitude },
       updatedAt: new Date()
     },
     { upsert: true, new: true }
   );
   ```

### Phone Number Handling

The system handles multiple phone number formats for vendor lookup:
- Original format: `+919876543210`
- Without country code: `919876543210`
- Without plus: `919876543210`
- Last 10 digits: `9876543210`

## API Endpoints

### Get All Vendor Locations
```
GET /api/vendor/locations
```
Returns all vendor locations for map display.

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "phone": "+919876543210",
      "location": {
        "lat": 28.6139,
        "lng": 77.2090
      },
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Specific Vendor Location
```
GET /api/vendor/location/:phone
```
Returns location for a specific vendor.

**Response:**
```json
{
  "success": true,
  "location": {
    "phone": "+919876543210",
    "location": {
      "lat": 28.6139,
      "lng": 77.2090
    },
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Update Vendor Location
```
POST /api/vendor/update-location
```
Manually update vendor location.

**Request Body:**
```json
{
  "contactNumber": "+919876543210",
  "mapsLink": "https://maps.google.com/?q=28.6139,77.2090",
  "lat": 28.6139,
  "lng": 77.2090
}
```

## Testing

### Test Script
Run the test script to verify location update functionality:
```bash
npm run test:location
# or
npx tsx scripts/test-location-update.ts
```

### Test Coverage
- User model location updates
- VendorLocation model updates
- Phone number format variations
- Coordinate extraction from various formats
- Database persistence verification

## Frontend Integration

### Map Display
The frontend can fetch vendor locations using:
```typescript
const response = await fetch('/api/vendor/locations');
const { locations } = await response.json();

// Use locations for map markers
locations.forEach(location => {
  const marker = new google.maps.Marker({
    position: { lat: location.location.lat, lng: location.location.lng },
    title: `Vendor: ${location.phone}`
  });
});
```

### Real-time Updates
For real-time location updates, consider implementing:
- WebSocket connections
- Server-sent events
- Periodic polling of `/api/vendor/locations`

## Error Handling

### Webhook Errors
- Invalid coordinate formats are logged and ignored
- Database connection errors are caught and logged
- Phone number lookup failures are handled gracefully

### API Errors
- 400: Missing required fields
- 404: Vendor not found
- 500: Server errors with detailed logging

## Monitoring

### Logs to Monitor
- Location extraction success/failure
- Database update operations
- Phone number lookup results
- Coordinate validation

### Key Metrics
- Location update success rate
- Response times for location APIs
- Number of vendors with valid locations
- Location update frequency

## Security Considerations

1. **Input Validation**: All coordinates are validated before storage
2. **Phone Number Sanitization**: Numbers are cleaned and normalized
3. **Rate Limiting**: Consider implementing rate limits on location updates
4. **Authentication**: Ensure API endpoints are properly secured

## Future Enhancements

1. **Location History**: Track location changes over time
2. **Geofencing**: Alert when vendors move outside expected areas
3. **Location Accuracy**: Store and use location accuracy metrics
4. **Batch Updates**: Support bulk location updates
5. **Location Analytics**: Analyze vendor movement patterns

## Troubleshooting

### Common Issues

1. **Coordinates Not Updating**
   - Check webhook logs for extraction errors
   - Verify phone number format matching
   - Ensure database connection is working

2. **Incorrect Coordinates**
   - Validate coordinate extraction patterns
   - Check for coordinate format confusion (lat/lng vs lng/lat)
   - Verify Google Maps URL parsing

3. **Missing Vendors**
   - Check phone number variations
   - Verify vendor exists in User collection
   - Review database indexes

### Debug Commands
```bash
# Check recent location updates
npx tsx scripts/test-location-update.ts

# Monitor webhook logs
tail -f logs/webhook.log

# Verify database indexes
npx tsx scripts/create-indexes.js
```
