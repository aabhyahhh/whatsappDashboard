# Support Call Button Feature

## Overview

The Support Call Button feature allows administrators to manually send support call messages to vendors directly from the vendor dialog interface. This provides a quick way to initiate support conversations with specific vendors.

## Features

### Frontend Implementation
- **Location**: Vendor dialog header in User Management page
- **Button Design**: Orange "Support Call" button with phone icon
- **Position**: Right side of the modal header, next to food type and entry type indicators
- **Accessibility**: Includes tooltip and proper ARIA labels

### Backend Implementation
- **API Endpoint**: `POST /api/messages/send-support-call`
- **Authentication**: Requires JWT token
- **Template**: Uses `post_support_call_message_for_vendors` template
- **Logging**: Saves message to database with metadata

## User Interface

### Button Appearance
```html
<button
  onClick={() => handleSendSupportCall(selectedVendor)}
  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
  title="Send support call message to vendor"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
  Support Call
</button>
```

### Button Location
The button appears in the vendor dialog header, positioned between the vendor information and the food type/entry type indicators.

## API Endpoint

### Request
```http
POST /api/messages/send-support-call
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "to": "+919876543210",
  "vendorName": "OM Chinese Fast Food",
  "template": "post_support_call_message_for_vendors"
}
```

### Response
```json
{
  "success": true,
  "message": "Support call message sent to OM Chinese Fast Food",
  "vendorName": "OM Chinese Fast Food",
  "contactNumber": "+919876543210",
  "template": "post_support_call_message_for_vendors"
}
```

### Error Response
```json
{
  "error": "Failed to send support call message",
  "details": "Template not found"
}
```

## Template Configuration

### Meta Template
The feature uses the `post_support_call_message_for_vendors` template configured in `server/meta.ts`:

```javascript
post_support_call_message_for_vendors: {
  name: 'post_support_call_message_for_vendors',
  language: 'hi',
  components: [
    {
      type: 'body',
      parameters: []
    }
  ]
}
```

### Template Requirements
- **Name**: Must match the template name in Meta Business Manager
- **Language**: Set to 'hi' for Hindi/English support
- **Status**: Must be approved in Meta Business Manager
- **Parameters**: Currently no dynamic parameters, but can be extended

## Database Logging

### Message Record
When a support call message is sent, it's logged in the `messages` collection:

```javascript
{
  from: process.env.META_PHONE_NUMBER_ID,
  to: "+919876543210",
  body: "Support call message sent to OM Chinese Fast Food",
  direction: 'outbound',
  timestamp: new Date(),
  meta: {
    type: 'support_call_message',
    template: 'post_support_call_message_for_vendors',
    vendorName: 'OM Chinese Fast Food',
    contactNumber: '+919876543210'
  }
}
```

## Usage Flow

1. **Admin opens vendor dialog** by clicking on a vendor row in User Management
2. **Support Call button is visible** in the dialog header
3. **Admin clicks Support Call button** to initiate support conversation
4. **System sends template message** via Meta WhatsApp API
5. **Message is logged** in database with metadata
6. **Success/error feedback** is shown to admin
7. **Vendor receives support call message** on WhatsApp

## Error Handling

### Frontend Errors
- **Authentication**: Shows alert if user is not logged in
- **Network**: Shows error message if API call fails
- **Validation**: Handles missing vendor information gracefully

### Backend Errors
- **Missing fields**: Returns 400 error for missing required fields
- **Template errors**: Returns 500 error if template sending fails
- **Database errors**: Logs errors but doesn't fail the request
- **Authentication**: Returns 401/403 for invalid tokens

## Testing

### Manual Testing
1. Open User Management page
2. Click on any vendor row to open dialog
3. Click "Support Call" button in header
4. Verify success message appears
5. Check that vendor receives WhatsApp message

### Automated Testing
```bash
npm run test:support-call-button
```

### Test Coverage
- ✅ Successful message sending
- ✅ Missing required fields validation
- ✅ Authentication requirements
- ✅ Error handling
- ✅ Database logging

## Security

### Authentication
- Requires valid JWT token
- Token must be included in Authorization header
- Token is validated by middleware

### Authorization
- Only authenticated users can send support call messages
- No additional role-based restrictions (can be added if needed)

### Input Validation
- Validates required fields (to, vendorName)
- Sanitizes input data
- Prevents injection attacks

## Configuration

### Environment Variables
```bash
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
MONGODB_URI=your_mongodb_connection_string
```

### Template Setup
1. Create template in Meta Business Manager
2. Name: `post_support_call_message_for_vendors`
3. Language: Hindi/English
4. Get approval from Meta
5. Update template configuration in code

## Monitoring

### Logs to Watch
```
📞 Sending support call message to [vendor_name] ([phone])
✅ Support call message sent successfully to [vendor_name] ([phone])
💾 Support call message saved to MongoDB
❌ Error sending support call message: [error]
```

### Metrics to Track
- Number of support call messages sent per day
- Success rate of message delivery
- Response time for API calls
- Error rates and types

## Future Enhancements

### Planned Features
1. **Bulk Support Calls**: Send to multiple vendors at once
2. **Custom Messages**: Allow custom message content
3. **Scheduling**: Schedule support calls for later
4. **Analytics**: Track response rates and engagement
5. **Templates**: Support for multiple template types

### Technical Improvements
1. **Rate Limiting**: Prevent spam sending
2. **Queue System**: Handle high volume requests
3. **Retry Logic**: Automatic retry for failed sends
4. **Caching**: Cache template configurations
5. **Webhooks**: Real-time delivery status updates

## Troubleshooting

### Common Issues

#### Button Not Visible
- Check if vendor dialog is properly opened
- Verify user has proper permissions
- Check browser console for JavaScript errors

#### Message Not Sent
- Verify Meta credentials are configured
- Check template is approved in Meta Business Manager
- Verify vendor phone number format
- Check server logs for error details

#### Template Errors
- Ensure template name matches exactly
- Verify template is approved and active
- Check template language configuration
- Verify Meta API permissions

### Debug Commands
```bash
# Test the API endpoint
curl -X POST http://localhost:5001/api/messages/send-support-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"to":"+919876543210","vendorName":"Test Vendor"}'

# Check message logs
db.messages.find({"meta.type": "support_call_message"}).sort({timestamp: -1}).limit(10)
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Test with the provided test script
4. Verify Meta template configuration
5. Contact the development team

The Support Call Button feature is now fully implemented and ready for use! 🚀
