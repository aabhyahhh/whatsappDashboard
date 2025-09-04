# Webhook Router Implementation

## Overview

The webhook router is a centralized service that receives Meta WhatsApp webhooks, verifies signatures, ACKs immediately, and forwards payloads to multiple target services with idempotency protection.

## Architecture

```
Meta WhatsApp API
       ↓
Webhook Router (/api/webhook)
       ↓
[Signature Verification + ACK <10s]
       ↓
[Idempotency Check]
       ↓
[Fan-out to Target Services]
       ↓
┌─────────────────────┬─────────────────────┐
│  Laari Khojo        │  WhatsApp Dashboard │
│  Backend            │  Service            │
│  /api/webhook       │  /api/webhook       │
└─────────────────────┴─────────────────────┘
```

## Key Features

### 1. **Webhook Verification (GET)**
- Handles Meta's webhook verification challenge
- Validates `hub.verify_token` against `META_VERIFY_TOKEN`
- Returns challenge string for successful verification

### 2. **Signature Verification (POST)**
- Validates `X-Hub-Signature-256` header using `META_APP_SECRET`
- Uses `crypto.timingSafeEqual()` for secure comparison
- Rejects requests with invalid signatures (403)

### 3. **Immediate ACK Response**
- Responds with 200 OK within 10 seconds
- Prevents Meta webhook timeouts
- Processes forwarding asynchronously

### 4. **Idempotency Protection**
- Uses `messages[0].id` as deduplication key
- Maintains in-memory set of processed message IDs
- Prevents duplicate processing of same message
- Auto-cleans old message IDs (keeps last 1000)

### 5. **Secure Forwarding**
- Adds `X-Relay-Secret` header to all forwarded requests
- Target services validate this header for security
- Includes additional headers for tracking:
  - `X-Forwarded-From: webhook-router`
  - `X-Message-Id: <message-id>`

### 6. **Fire-and-Forget Forwarding**
- Forwards to multiple target services in parallel
- Uses 10-second timeout per target
- Logs success/failure but doesn't block on errors
- Continues processing even if some targets fail

## Environment Variables

```bash
# Meta WhatsApp Configuration
META_APP_SECRET=your_meta_app_secret
META_VERIFY_TOKEN=your_verify_token

# Webhook Router Security
RELAY_SECRET=your_shared_secret

# Target Services (configured in code)
TARGET_1=https://laari-khojo-backend.onrender.com/api/webhook
TARGET_2=https://whatsappdashboard-1.onrender.com/api/webhook
```

## Target Service Updates

Both target services have been updated to validate the `X-Relay-Secret` header:

### Meta Webhook Service (`/api/meta-webhook`)
```typescript
// Validate X-Relay-Secret header for security
const relaySecret = req.header('X-Relay-Secret');
const expectedSecret = process.env.RELAY_SECRET;

if (expectedSecret && relaySecret !== expectedSecret) {
  console.log('❌ Invalid X-Relay-Secret header');
  return res.status(403).json({ error: 'Unauthorized' });
}
```

### Twilio Webhook Service (`/api/webhook-legacy`)
```javascript
// Validate X-Relay-Secret header for security
const relaySecret = req.header('X-Relay-Secret');
const expectedSecret = process.env.RELAY_SECRET;

if (expectedSecret && relaySecret !== expectedSecret) {
    console.log('❌ Invalid X-Relay-Secret header');
    return res.status(403).json({ error: 'Unauthorized' });
}
```

## Route Configuration

The main server (`auth.ts`) has been updated with the following routes:

```typescript
// Main webhook entry point (Meta webhooks)
app.use('/api/webhook', webhookRouterRoutes);

// Legacy Twilio webhooks
app.use('/api/webhook-legacy', webhookRoutes);

// Direct Meta webhooks (bypass router)
app.use('/api/meta-webhook', metaWebhookRoutes);
```

## Testing

A comprehensive test script is available at `scripts/test-webhook-router.ts`:

```bash
# Run tests
npx ts-node scripts/test-webhook-router.ts
```

Tests include:
- Webhook verification (GET)
- Signature validation (POST)
- Duplicate message handling
- Invalid signature rejection

## Deployment Considerations

### 1. **Environment Variables**
Ensure all required environment variables are set:
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `RELAY_SECRET`

### 2. **Meta Webhook Configuration**
Update Meta webhook URL to point to the router:
```
https://your-domain.com/api/webhook
```

### 3. **Target Service URLs**
Update target URLs in `webhookRouter.ts` if needed:
```typescript
const TARGETS = [
  "https://laari-khojo-backend.onrender.com/api/webhook",
  "https://whatsappdashboard-1.onrender.com/api/webhook",
];
```

### 4. **Monitoring**
Monitor logs for:
- Signature verification failures
- Forwarding errors
- Duplicate message detection
- Response times

## Security Benefits

1. **Centralized Security**: Single point for signature verification
2. **Header Validation**: All target services validate `X-Relay-Secret`
3. **Idempotency**: Prevents duplicate processing
4. **Fast ACK**: Prevents Meta timeouts
5. **Error Isolation**: Target service failures don't affect others

## Performance Benefits

1. **Parallel Forwarding**: Multiple targets processed simultaneously
2. **Non-blocking**: ACK sent before forwarding completes
3. **Timeout Protection**: 10-second timeout per target
4. **Memory Management**: Auto-cleanup of old message IDs

## Error Handling

- **Invalid Signature**: Returns 403 immediately
- **Missing Headers**: Returns 403 for security
- **Target Failures**: Logged but don't affect other targets
- **Duplicate Messages**: Detected and skipped
- **Network Timeouts**: Handled gracefully with 10s timeout

## Future Enhancements

1. **Redis Integration**: Replace in-memory idempotency with Redis
2. **Retry Logic**: Add exponential backoff for failed forwards
3. **Metrics**: Add Prometheus metrics for monitoring
4. **Circuit Breaker**: Implement circuit breaker for failing targets
5. **Load Balancing**: Add load balancing for multiple instances
