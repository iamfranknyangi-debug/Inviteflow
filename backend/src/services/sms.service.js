// ============================================================
//  SMS Service — Africa's Talking + Twilio fallback
//  src/services/sms.service.js
// ============================================================
const AfricasTalking = require('africas-talking');
const twilio         = require('twilio');
const logger         = require('../utils/logger');

let atClient = null;
let twilioClient = null;

function getATClient() {
  if (!atClient && process.env.AT_API_KEY && process.env.AT_USERNAME) {
    const at = AfricasTalking({
      apiKey:   process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });
    atClient = at.SMS;
  }
  return atClient;
}

function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Send a message to a phone number.
 * @param {Object} opts
 * @param {string} opts.phone    - E.164 phone number e.g. +255712345678
 * @param {string} opts.message  - Text message body
 * @param {string} opts.channel  - 'sms' | 'whatsapp'
 * @param {string} opts.provider - 'africas_talking' | 'twilio'
 */
exports.send = async ({ phone, message, channel = 'sms', provider = 'africas_talking' }) => {
  logger.info(`Sending ${channel} to ${phone} via ${provider}`);

  // In development/sandbox mode, just simulate
  if (process.env.NODE_ENV === 'development' && process.env.AT_ENVIRONMENT === 'sandbox') {
    logger.info(`[SANDBOX] Would send to ${phone}: ${message.substring(0,60)}...`);
    return { messageId: `mock-${Date.now()}`, status: 'sent', provider };
  }

  try {
    if (provider === 'africas_talking' && channel === 'sms') {
      return await sendViaAfricasTalking(phone, message);
    } else if (channel === 'whatsapp') {
      return await sendViaWhatsApp(phone, message);
    } else {
      return await sendViaTwilioSMS(phone, message);
    }
  } catch (err) {
    logger.error(`SMS send failed (${provider}): ${err.message}`);
    // Try fallback
    if (provider === 'africas_talking') {
      logger.info(`Falling back to Twilio for ${phone}`);
      return await sendViaTwilioSMS(phone, message);
    }
    throw err;
  }
};

async function sendViaAfricasTalking(phone, message) {
  const sms = getATClient();
  if (!sms) throw new Error('Africa\'s Talking not configured');

  const result = await sms.send({
    to: [phone],
    message,
    from: process.env.AT_SENDER_ID || 'InviteFlow',
  });

  const recipient = result.SMSMessageData?.Recipients?.[0];
  if (!recipient || recipient.status !== 'Success') {
    throw new Error(`AT send failed: ${recipient?.statusCode || 'Unknown error'}`);
  }
  return {
    messageId: recipient.messageId,
    status: 'sent',
    provider: 'africas_talking',
    cost: recipient.cost,
  };
}

async function sendViaTwilioSMS(phone, message) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio not configured');

  const msg = await client.messages.create({
    body:  message,
    from:  process.env.TWILIO_PHONE_NUMBER,
    to:    phone,
  });
  return { messageId: msg.sid, status: 'sent', provider: 'twilio' };
}

async function sendViaWhatsApp(phone, message) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio WhatsApp not configured');

  const waPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  const msg = await client.messages.create({
    body:  message,
    from:  process.env.TWILIO_WHATSAPP_FROM,
    to:    waPhone,
  });
  return { messageId: msg.sid, status: 'sent', provider: 'twilio_whatsapp' };
}

/**
 * Send bulk messages with concurrency control
 */
exports.sendBulk = async (recipients, concurrency = 5) => {
  const results = [];
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(r => exports.send(r)));
    results.push(...batchResults.map((r, idx) => ({
      phone:   batch[idx].phone,
      success: r.status === 'fulfilled',
      result:  r.status === 'fulfilled' ? r.value : { error: r.reason?.message },
    })));
    // Small delay between batches to avoid rate limits
    if (i + concurrency < recipients.length) await new Promise(r => setTimeout(r, 200));
  }
  return results;
};
