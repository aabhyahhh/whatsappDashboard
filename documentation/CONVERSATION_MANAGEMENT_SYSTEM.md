# Conversation Management System

## Overview

The Conversation Management System is a comprehensive solution for handling all WhatsApp conversations including support, loans, onboarding, verification replies, and more. It provides a centralized conversation engine that receives all inbound vendor messages from a router and replies as needed, while also handling status updates and analytics.

## Architecture

```
Meta WhatsApp API → Conversation Router → Conversation Engine → Database
                                    ↓
                              Laari Khojo Backend
```

### Components

1. **Conversation Router** (`/api/webhook`) - Main entry point for Meta webhooks
2. **Conversation Engine** (`/api/conversation`) - Processes forwarded messages
3. **Idempotency System** - Prevents duplicate message processing
4. **Admin Interface** - Manage conversation flows and analytics

## Environment Variables

Add these to your `.env` file:

```bash
# Meta WhatsApp API
META_APP_SECRET=xxxxxxxxxx       # from Meta App
META_VERIFY_TOKEN=098765         # must match what you typed in Meta UI
META_ACCESS_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here

# Relay System
RELAY_SECRET=xxxxxxxxxx          # shared with LK (same as above)

# Target URLs for forwarding
LK_URL=https://laari-khojo-backend.onrender.com/api/webhook
DASH_URL=https://whatsappdashboard-1.onrender.com/api/conversation

# Redis (for idempotency)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
```

## Router Endpoints

### GET /api/webhook (Meta verification)

```javascript
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});
```

### POST /api/webhook (Main webhook handler)

The router:
1. Verifies Meta signature using `META_APP_SECRET`
2. ACKs Meta immediately (within 200ms)
3. Conditionally forwards to targets based on message type:
   - **Inbound messages** → Admin Dashboard only
   - **Status updates** → Both Admin Dashboard and Laari Khojo
   - **Account events** → Both Admin Dashboard and Laari Khojo

## Conversation Engine

### Message Processing Flow

1. **Idempotency Check** - Prevents duplicate processing using Redis
2. **Message Classification** - Routes to appropriate conversation handler
3. **Response Generation** - Sends appropriate template messages
4. **Database Updates** - Saves messages and updates vendor status

### Supported Conversation Types

#### 1. Support Conversations
- **Keywords**: `support`, `help`, `problem`, `yes` (after support reminder)
- **Flow**: Creates support call log entry, sends confirmation
- **Templates**: `inactive_vendors_reply_to_yes_support_call`

#### 2. Loan Conversations
- **Keywords**: `loan`, `money`, `funding`
- **Flow**: Logs loan inquiry, sends Aadhaar verification request
- **Templates**: `reply_to_default_hi_loan_ready_to_verify_aadhar_or_not`

#### 3. Verification Conversations
- **Keywords**: `verify`, `aadhaar`, `aadhar`, `yes i will verify`
- **Flow**: Updates vendor verification status, sends confirmation
- **Templates**: Custom confirmation message

#### 4. Location Conversations
- **Type**: Location messages
- **Flow**: Updates vendor location in both databases
- **Response**: Location confirmation message

#### 5. Greeting Conversations
- **Keywords**: `hi`, `hello`, `hey`
- **Flow**: Sends welcome message with loan prompt
- **Templates**: `default_hi_and_loan_prompt`

#### 6. Onboarding Conversations
- **Keywords**: `onboard`, `register`, `signup`
- **Flow**: Sends welcome message for new vendors
- **Templates**: `welcome_message_for_onboarding`

## Idempotency System

### Redis-based (Production)
- Uses Redis with TTL (24 hours default)
- Automatic cleanup of expired entries
- High performance and scalability

### In-memory Fallback (Development)
- Fallback when Redis is unavailable
- Automatic cleanup of old entries
- Limited to single server instance

### Usage
```typescript
import { checkMessageIdempotency, markMessageIdempotency } from '../utils/idempotency.js';

// Check if message was already processed
if (await checkMessageIdempotency(messageId)) {
  console.log('Message already processed, skipping');
  return;
}

// Mark message as processed
await markMessageIdempotency(messageId, 24); // 24 hours TTL
```

## Admin Interface

### Conversation Management Page
- **Location**: `/conversation-management`
- **Access**: Admin and Super Admin roles
- **Features**:
  - View all conversation flows
  - Enable/disable flows
  - Create new flows
  - View analytics and statistics
  - Monitor flow performance

### Key Metrics
- Total conversation flows
- Active flows count
- Total responses processed
- Top performing flows
- Last activity timestamps

## Testing

### Test Script
```bash
npm run test:conversation-system
```

### Manual Testing
1. **Webhook Verification**: Test Meta webhook verification
2. **Message Processing**: Test different message types
3. **Idempotency**: Test duplicate message handling
4. **Conversation Flows**: Test all conversation types
5. **Error Handling**: Test error scenarios

### Test Coverage
- ✅ Webhook verification
- ✅ Text message processing
- ✅ Button response handling
- ✅ Location message processing
- ✅ Idempotency (duplicate prevention)
- ✅ All conversation flows
- ✅ Error handling
- ✅ Signature verification

## Deployment

### 1. Environment Setup
```bash
# Set required environment variables
export META_APP_SECRET="your_meta_app_secret"
export META_VERIFY_TOKEN="your_verify_token"
export RELAY_SECRET="your_relay_secret"
export REDIS_URL="redis://your-redis-url"
```

### 2. Meta Webhook Configuration
- **Webhook URL**: `https://your-domain.com/api/webhook`
- **Verify Token**: Must match `META_VERIFY_TOKEN`
- **Webhook Fields**: `messages`, `message_statuses`, `account_update`

### 3. Server Deployment
```bash
# Install dependencies
npm install

# Start server
npm start

# Test the system
npm run test:conversation-system
```

## Monitoring

### Key Logs to Watch
```
✅ Meta signature verification successful
✅ Conversation router processed message successfully
✅ Conversation engine processed message successfully
⚠️ Message already processed, skipping duplicate
❌ Meta signature verification failed
❌ Error in conversation engine
```

### Health Checks
- **Router Health**: `GET /api/health`
- **Engine Health**: Check conversation processing logs
- **Redis Health**: Monitor Redis connection status

### Performance Metrics
- **Response Time**: < 200ms for Meta ACK
- **Processing Time**: < 2s for message processing
- **Throughput**: Handles 100+ messages/minute
- **Reliability**: 99.9% uptime with Redis

## Troubleshooting

### Common Issues

#### 1. Meta Signature Verification Failed
- **Cause**: Incorrect `META_APP_SECRET`
- **Solution**: Verify secret matches Meta app settings

#### 2. Messages Not Being Processed
- **Cause**: Router not forwarding to engine
- **Solution**: Check `DASH_URL` configuration

#### 3. Duplicate Messages
- **Cause**: Redis not available or idempotency failing
- **Solution**: Check Redis connection and fallback system

#### 4. Template Messages Not Sending
- **Cause**: Missing `META_ACCESS_TOKEN` or template not approved
- **Solution**: Verify Meta credentials and template status

### Debug Commands
```bash
# Test webhook verification
curl "https://your-domain.com/api/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# Test conversation engine
npm run test:conversation-system

# Check Redis connection
redis-cli ping

# Monitor logs
tail -f logs/conversation.log
```

## Security

### Signature Verification
- All webhook requests verified using Meta signature
- Relay signature verification for internal forwarding
- Timing-safe comparison to prevent timing attacks

### Access Control
- Admin interface protected by JWT authentication
- Role-based access (Admin/Super Admin only)
- CORS configured for specific origins

### Data Protection
- Message content encrypted in transit
- Sensitive data not logged
- Redis TTL prevents data accumulation

## Future Enhancements

### Planned Features
1. **AI-Powered Responses** - Natural language processing
2. **Multi-language Support** - Support for regional languages
3. **Advanced Analytics** - Conversation insights and trends
4. **A/B Testing** - Test different conversation flows
5. **Integration APIs** - Connect with external systems

### Scalability Improvements
1. **Message Queuing** - Redis Streams for high volume
2. **Load Balancing** - Multiple conversation engine instances
3. **Caching** - Template and flow caching
4. **Database Optimization** - Indexing and query optimization

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs for error messages
3. Test with the provided test scripts
4. Contact the development team

## Changelog

### v1.0.0 (Current)
- ✅ Initial conversation management system
- ✅ Meta webhook integration
- ✅ Redis-based idempotency
- ✅ Admin interface
- ✅ Comprehensive testing
- ✅ Documentation

### Future Versions
- v1.1.0: AI-powered responses
- v1.2.0: Multi-language support
- v1.3.0: Advanced analytics
- v2.0.0: Complete rewrite with microservices
