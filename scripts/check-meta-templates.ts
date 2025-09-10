#!/usr/bin/env tsx

/**
 * Check Meta WhatsApp Templates
 * 
 * This script checks if the required templates exist in your Meta WhatsApp Business account.
 */

import 'dotenv/config';
import axios from 'axios';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

async function checkTemplates() {
  console.log('🔍 Checking Meta WhatsApp Templates...');
  console.log('=====================================');
  
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('❌ Missing Meta credentials');
    console.error('META_ACCESS_TOKEN:', !!META_ACCESS_TOKEN);
    console.error('META_PHONE_NUMBER_ID:', !!META_PHONE_NUMBER_ID);
    return;
  }
  
  try {
    // Get all templates using the WhatsApp Business Account ID
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`
        },
        params: {
          fields: 'name,status,language,category,created_time'
        }
      }
    );
    
    const templates = response.data.data || [];
    console.log(`📊 Found ${templates.length} templates in your Meta account`);
    console.log('');
    
    // Check for required templates
    const requiredTemplates = [
      'update_location_cron_util',
      'inactive_vendors_support_prompt_util',
      'inactive_vendors_reply_to_yes_support_call_util'
    ];
    
    console.log('🔍 Checking required templates:');
    console.log('===============================');
    
    for (const requiredTemplate of requiredTemplates) {
      const template = templates.find((t: any) => t.name === requiredTemplate);
      
      if (template) {
        console.log(`✅ ${requiredTemplate}:`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Language: ${template.language}`);
        console.log(`   Category: ${template.category}`);
        console.log(`   Created: ${template.created_time}`);
        console.log('');
      } else {
        console.log(`❌ ${requiredTemplate}: NOT FOUND`);
        console.log('');
      }
    }
    
    // Show all available templates
    console.log('📋 All available templates:');
    console.log('===========================');
    templates.forEach((template: any) => {
      console.log(`- ${template.name} (${template.status}) - ${template.language}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking templates:', error.response?.data || error.message);
  }
}

checkTemplates();
