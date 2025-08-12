# Location Update System

This document explains how the WhatsApp location pin system works to update vendor locations for both the WhatsApp Dashboard and the Laari Khojo platform.

## Overview

When a vendor sends a location pin via WhatsApp, the system automatically:
1. Extracts location coordinates from the WhatsApp message
2. Updates the vendor's location in the `users` collection (for the dashboard)
3. Updates/creates a record in the `vendorlocations` collection (for the Laari Khojo platform)

## Data Flow

```
WhatsApp Location Pin → Twilio Webhook → Location Extraction → Database Updates
```

### 1. WhatsApp Location Pin
Vendors can send location data in multiple formats:
- **Native WhatsApp Location**: Coordinates sent directly via WhatsApp's location feature
- **Google Maps Link**: URL containing coordinates (e.g., `https://maps.google.com/?q=23.0210,72.5714`)
- **Text with Coordinates**: Message containing coordinate information

### 2. Twilio Webhook Processing
The webhook (`/api/webhook`) receives the location data and:
- Extracts coordinates using multiple parsing methods
- Identifies the vendor by phone number
- Updates both database collections

### 3. Database Updates

#### User Collection (Dashboard)
```javascript
{
  _id: ObjectId,
  name: "OM Chinese Fast Food",
  contactNumber: "+919265466535",
  location: {
    type: "Point",
    coordinates: [72.5714, 23.0210] // [longitude, latitude]
  },
  mapsLink: "https://maps.google.com/?q=23.0210,72.5714",
  // ... other fields
}
```

#### VendorLocation Collection (Laari Khojo Platform)
```javascript
{
  _id: ObjectId,
  phone: "+919265466535",
  location: {
    lat: 23.0210,
    lng: 72.5714
  },
  updatedAt: ISODate("2024-01-01T12:00:00.000Z")
}
```

## Implementation Details

### Location Extraction Methods

The system uses multiple methods to extract coordinates:

1. **Twilio Native Fields**: `Latitude` and `Longitude` from webhook payload
2. **Google Maps URL Parsing**: Extracts coordinates from various Google Maps URL formats
3. **Text Pattern Matching**: Searches for coordinate patterns in message body

### Phone Number Matching

The system handles various phone number formats:
- `+919265466535` (with country code)
- `919265466535` (without +)
- `9265466535` (without country code)
- `265466535` (last 10 digits)

### Error Handling

- Graceful handling of malformed coordinates
- Separate error handling for User and VendorLocation updates
- Detailed logging for debugging

## Testing

### Manual Testing
```bash
# Test location update functionality
npm run test:location-update

# Test webhook with location data
npm run test:location-webhook
```

### Test Scripts
- `scripts/test-location-update.ts`: Tests database updates directly
- `scripts/test-whatsapp-location-webhook.ts`: Tests webhook with simulated location data

## Usage Examples

### 1. Vendor Sends WhatsApp Location
When a vendor shares their location via WhatsApp:
1. Twilio receives the location data
2. Webhook extracts coordinates: `23.0210, 72.5714`
3. System finds vendor by phone number
4. Updates both collections with new coordinates
5. Vendor's location is now available on both platforms

### 2. Vendor Sends Google Maps Link
When a vendor sends a Google Maps link:
1. Webhook parses the URL to extract coordinates
2. Same update process as native location sharing
3. Coordinates are saved in both collections

## Configuration

### Environment Variables
- `MONGODB_URI`: Database connection string
- `TWILIO_PHONE_NUMBER`: Twilio WhatsApp number
- `WEBHOOK_URL`: Webhook endpoint URL (for testing)

### Database Indexes
The system creates indexes for efficient queries:
- `users` collection: `contactNumber`, `location` (2dsphere)
- `vendorlocations` collection: `phone`, `updatedAt`

## Monitoring

### Logs to Monitor
- Location extraction success/failure
- Database update operations
- Phone number matching results
- Error messages for debugging

### Key Metrics
- Number of location updates per day
- Success rate of coordinate extraction
- Database update performance

## Troubleshooting

### Common Issues

1. **Coordinates Not Extracted**
   - Check webhook payload format
   - Verify location extraction methods
   - Review log messages

2. **Vendor Not Found**
   - Verify phone number format
   - Check if vendor exists in database
   - Review phone number matching logic

3. **Database Update Failures**
   - Check MongoDB connection
   - Verify schema compatibility
   - Review error logs

### Debug Commands
```bash
# Check recent location updates
db.users.find({"location.coordinates": {$exists: true}}).sort({updatedAt: -1}).limit(5)

# Check VendorLocation records
db.vendorlocations.find().sort({updatedAt: -1}).limit(5)

# Verify phone number matching
db.users.find({contactNumber: /9265466535/})
```

## Future Enhancements

1. **Location Validation**: Add coordinate range validation
2. **Address Geocoding**: Reverse geocode coordinates to addresses
3. **Location History**: Track location change history
4. **Bulk Updates**: Support for bulk location updates
5. **API Endpoints**: REST API for manual location updates
