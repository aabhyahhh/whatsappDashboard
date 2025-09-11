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
console.log('Access Token length:', META_ACCESS_TOKEN?.length || 0);
console.log('Phone Number ID value:', META_PHONE_NUMBER_ID || 'NOT_SET');
console.log('Verify Token value:', META_VERIFY_TOKEN || 'NOT_SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Meta WhatsApp API base URL
const META_API_BASE_URL = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}`;

// Function to check if Meta credentials are available at runtime
export function areMetaCredentialsAvailable(): boolean {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  console.log('🔍 Runtime Meta credentials check:');
  console.log('- META_ACCESS_TOKEN:', !!accessToken, accessToken?.length || 0);
  console.log('- META_PHONE_NUMBER_ID:', !!phoneNumberId, phoneNumberId || 'NOT_SET');
  console.log('- META_APP_SECRET:', !!appSecret, appSecret?.length || 0);
  
  return !!(accessToken && phoneNumberId && appSecret);
}

// Message templates configuration
export const MESSAGE_TEMPLATES = {
  // Location update message (sent 15 mins before openTime and at openTime)
  update_location_cron_util: {
    name: 'update_location_cron_util',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Inactive vendors support prompt (sent to vendors inactive for 5+ days)
  inactive_vendors_support_prompt_util: {
    name: 'inactive_vendors_support_prompt_util',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Reply to yes for support call
  inactive_vendors_reply_to_yes_support_call_util: {
    name: 'inactive_vendors_reply_to_yes_support_call_util',
    language: 'en',
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
  reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util: {
    name: 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util',
    language: 'en', // Changed from 'hi' to 'en' to match Meta configuration
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
  
  // Reply to Aadhaar verification confirmation
  reply_to_yes_to_aadhar_verification_util: {
    name: 'reply_to_yes_to_aadhar_verification_util',
    language: 'en', // Changed from 'hi' to 'en' to match Meta configuration
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Welcome message for onboarding
  welcome_message_for_onboarding_util: {
    name: 'welcome_message_for_onboarding_util',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: []
      }
    ]
  },
  
  // Post support call message for vendors
  post_support_call_message_for_vendors_util: {
    name: 'post_support_call_message_for_vendors_util',
    language: 'en', // Changed from 'hi' to 'en' to match Meta configuration
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
  console.log(`🔍 sendTemplateMessage called with:`, { to, templateName, parameters });
  
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    console.error('🔍 Credentials check:', {
      hasAccessToken: !!META_ACCESS_TOKEN,
      hasPhoneNumberId: !!META_PHONE_NUMBER_ID,
      accessTokenLength: META_ACCESS_TOKEN?.length || 0,
      phoneNumberId: META_PHONE_NUMBER_ID || 'NOT_SET'
    });
    return null;
  }

  try {
    const template = MESSAGE_TEMPLATES[templateName];
    if (!template) {
      console.error(`❌ Template ${templateName} not found`);
      console.error('🔍 Available templates:', Object.keys(MESSAGE_TEMPLATES));
      return null;
    }

    // Ensure template language is correct - force English for location update template
    const correctedTemplate = { ...template };
    if (templateName === 'update_location_cron_util' && template.language === 'hi') {
      console.log('⚠️ Correcting template language from hi to en for update_location_cron_util');
      correctedTemplate.language = 'en';
    }

    console.log(`🔍 Using template:`, correctedTemplate);

    // Normalize phone number - remove + and ensure it's just digits
    const normalizedTo = to.replace(/^\+/, '').replace(/\D/g, '');
    console.log(`🔍 Normalized phone number: ${to} -> ${normalizedTo}`);

    const messageData = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'template',
      template: {
        name: correctedTemplate.name,
        language: {
          code: correctedTemplate.language
        },
        components: correctedTemplate.components.map(component => {
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

    console.log(`🔍 Sending message data:`, JSON.stringify(messageData, null, 2));
    console.log(`🔍 API URL: ${META_API_BASE_URL}/messages`);

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

    console.log(`✅ Sent template message ${templateName} to ${normalizedTo}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send template message ${templateName} to ${to}:`, error.response?.data || error.message);
    console.error('🔍 Full error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    return null;
  }
}

// Helper function to send a text message with fallback to template
export async function sendTextMessage(to: string, text: string) {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta WhatsApp credentials');
    return null;
  }

  // Proper phone number normalization for Meta API
  // Remove + prefix and any spaces, but keep all digits
  const normalizedTo = to.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`🔍 Normalized phone number: ${to} -> ${normalizedTo}`);

  // First, try to send as free-form text message
  try {
    const messageData = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: {
        body: text
      }
    };

    console.log(`🔍 Attempting to send free-form text message:`, JSON.stringify(messageData, null, 2));

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

    console.log(`✅ Sent free-form text message to ${normalizedTo}:`, response.data);
    
    // Check if the response indicates success
    if (response.data && response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      console.log(`📱 Message ID: ${messageId}`);
      return {
        ...response.data,
        messageId: messageId,
        success: true
      };
    } else {
      console.error(`❌ Meta API returned unexpected response structure:`, response.data);
      return {
        success: false,
        error: 'Unexpected response structure from Meta API',
        data: response.data
      };
    }
  } catch (error) {
    console.error(`❌ Free-form text message failed for ${to}:`, error.response?.data || error.message);
    
    // Check if it's a 24-hour window restriction
    const errorData = error.response?.data;
    if (errorData && (
      errorData.error?.message?.includes('24 hour') ||
      errorData.error?.message?.includes('outside the allowed') ||
      errorData.error?.message?.includes('template') ||
      error.status === 400
    )) {
      console.log(`🔄 Free-form message blocked, trying template message fallback...`);
      
      // Fallback to template message
      try {
        const templateData = {
          messaging_product: 'whatsapp',
          to: normalizedTo,
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US'
            }
          }
        };

        console.log(`🔍 Sending template message as fallback:`, JSON.stringify(templateData, null, 2));

        const templateResponse = await axios.post(
          `${META_API_BASE_URL}/messages`,
          templateData,
          {
            headers: {
              'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Sent template message fallback to ${normalizedTo}:`, templateResponse.data);
        
        if (templateResponse.data && templateResponse.data.messages && templateResponse.data.messages.length > 0) {
          const messageId = templateResponse.data.messages[0].id;
          console.log(`📱 Template Message ID: ${messageId}`);
          return {
            ...templateResponse.data,
            messageId: messageId,
            success: true,
            isTemplate: true
          };
        } else {
          console.error(`❌ Template response has unexpected structure:`, templateResponse.data);
          return {
            success: false,
            error: 'Unexpected template response structure',
            data: templateResponse.data
          };
        }
      } catch (templateError) {
        console.error(`❌ Template message fallback also failed for ${to}:`, templateError.response?.data || templateError.message);
        return {
          success: false,
          error: 'Both free-form and template messages failed',
          details: templateError.response?.data || templateError.message
        };
      }
    }
    
    console.error('🔍 Full error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
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

