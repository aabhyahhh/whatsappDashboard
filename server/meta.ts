// meta.ts - Meta WhatsApp API integration
import axios from 'axios';

// Meta WhatsApp API configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const META_WEBHOOK_URL = process.env.META_WEBHOOK_URL;

console.log('🔍 Meta WhatsApp credentials check:');
console.log('Access Token exists:', !!META_ACCESS_TOKEN);
console.log('Phone Number ID exists:', !!META_PHONE_NUMBER_ID);
console.log('Verify Token exists:', !!META_VERIFY_TOKEN);
console.log('Webhook URL exists:', !!META_WEBHOOK_URL);

// Meta WhatsApp API base URL
const META_API_BASE_URL = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`;

// Message templates configuration
export const MESSAGE_TEMPLATES = {
  // Location update message (sent 15 mins before openTime and at openTime)
  update_location_cron: {
    name: 'update_location_cron',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Inactive vendors support prompt (sent to vendors inactive for 3+ days)
  inactive_vendors_support_prompt: {
    name: 'inactive_vendors_support_prompt',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Reply to yes for support call
  inactive_vendors_reply_to_yes_support_call: {
    name: 'inactive_vendors_reply_to_yes_support_call',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Default hi and loan prompt
  default_hi_and_loan_prompt: {
    name: 'default_hi_and_loan_prompt',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Reply to loan with Aadhaar verification button
  reply_to_default_hi_loan_ready_to_verify_aadhar_or_not: {
    name: 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: 0,
        parameters: [
          {
            type: 'payload',
            payload: 'yes_verify_aadhar'
          }
        ]
      }
    ]
  },
  
  // Welcome message for onboarding
  welcome_message_for_onboarding: {
    name: 'welcome_message_for_onboarding',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Post support call message for vendors
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
};

// Helper function to send a template message
export async function sendTemplateMessage(to: string, templateName: string, parameters: any[] = []) {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return null;
  }

  try {
    const template = MESSAGE_TEMPLATES[templateName];
    if (!template) {
      console.error(`❌ Template ${templateName} not found`);
      return null;
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: template.name,
        language: {
          code: template.language
        },
        components: template.components.map(component => {
          if (component.type === 'body' && parameters.length > 0) {
            return {
              ...component,
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            };
          }
          return component;
        })
      }
    };

    const response = await axios.post(
      `${META_API_BASE_URL}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Sent template message ${templateName} to ${to}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send template message ${templateName} to ${to}:`, error.response?.data || error.message);
    return null;
  }
}

// Helper function to send a text message
export async function sendTextMessage(to: string, text: string) {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return null;
  }

  try {
    const messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: text
      }
    };

    const response = await axios.post(
      `${META_API_BASE_URL}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Sent text message to ${to}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send text message to ${to}:`, error.response?.data || error.message);
    return null;
  }
}

// Helper function to send an interactive message with buttons
export async function sendInteractiveMessage(to: string, text: string, buttons: Array<{id: string, title: string}>) {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return null;
  }

  try {
    const messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: text
        },
        action: {
          buttons: buttons.map(button => ({
            type: 'reply',
            reply: {
              id: button.id,
              title: button.title
            }
          }))
        }
      }
    };

    const response = await axios.post(
      `${META_API_BASE_URL}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Sent interactive message to ${to}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send interactive message to ${to}:`, error.response?.data || error.message);
    return null;
  }
}

// Helper function to verify webhook
export function verifyWebhook(mode: string, token: string, challenge: string) {
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    return challenge;
  } else {
    console.error('❌ Webhook verification failed');
    return null;
  }
}

// Helper function to process incoming webhook
export function processWebhook(body: any) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value) {
      console.log('No value in webhook payload');
      return null;
    }

    const messages = value.messages || [];
    const statuses = value.statuses || [];

    return {
      messages: messages.map((message: any) => ({
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text?.body,
        interactive: message.interactive,
        button: message.interactive?.button_reply,
        context: message.context
      })),
      statuses: statuses.map((status: any) => ({
        id: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipient_id: status.recipient_id
      }))
    };
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return null;
  }
}

export default {
  sendTemplateMessage,
  sendTextMessage,
  sendInteractiveMessage,
  verifyWebhook,
  processWebhook,
  MESSAGE_TEMPLATES
};

