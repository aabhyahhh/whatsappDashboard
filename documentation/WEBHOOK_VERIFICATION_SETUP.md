# Meta Webhook Verification Setup

## Overview

This project serves as the main router for Meta WhatsApp webhooks. The webhook verification endpoint is available at:

**`https://whatsappdashboard-1.onrender.com/api/webhook`**

## GET Handler Implementation

The exact handler you requested is implemented at `/api/webhook`:

```javascript
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);   // plain text echo, nothing else
  }
  return res.sendStatus(403);
});
```

## Environment Variable Required

Make sure you have this environment variable set:

```bash
META_VERIFY_TOKEN=098765  # or whatever token you want to use
```

## Meta Configuration

In your Meta App settings, configure:

- **Webhook URL**: `https://whatsappdashboard-1.onrender.com/api/webhook`
- **Verify Token**: `098765` (must match your `META_VERIFY_TOKEN` environment variable)
- **Webhook Fields**: Select the fields you want to receive (messages, message_statuses, etc.)

## Testing the Webhook Verification

You can test the webhook verification using the provided test script:

```bash
npm run test:webhook-verification
```

Or test manually with curl:

```bash
# Test with correct token
curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=098765&hub.challenge=test123"

# Should return: test123

# Test with wrong token
curl "https://whatsappdashboard-1.onrender.com/api/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test123"

# Should return: 403 Forbidden
```

## What Happens After Verification

Once Meta verifies the webhook, it will start sending POST requests to the same URL (`/api/webhook`) with actual message data. The conversation router will:

1. Verify the Meta signature
2. ACK Meta immediately
3. Forward messages to the conversation engine
4. Handle all conversation flows (support, loans, verification, etc.)

## Troubleshooting

### Verification Fails
- Check that `META_VERIFY_TOKEN` environment variable is set correctly
- Ensure the token in Meta console matches your environment variable
- Verify the webhook URL is accessible from Meta's servers

### 403 Forbidden
- Token mismatch between Meta console and environment variable
- Missing or incorrect `hub.mode` parameter
- Missing `hub.verify_token` parameter

### Connection Issues
- Check that your server is running and accessible
- Verify the webhook URL is correct
- Check server logs for any errors

## Next Steps

After successful webhook verification:

1. Meta will start sending POST requests with message data
2. The conversation router will process and forward messages
3. The conversation engine will handle all conversation flows
4. You can monitor conversations in the admin interface at `/conversation-management`

## Support

If you encounter any issues:

1. Run the test script: `npm run test:webhook-verification`
2. Check server logs for error messages
3. Verify environment variables are set correctly
4. Test the webhook URL manually with curl

The webhook verification is now ready for Meta to connect to your WhatsApp dashboard!
