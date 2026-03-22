const logger = require('../utils/logger');

exports.send = async ({ phone, message, channel = 'sms', provider = 'africas_talking' }) => {
  logger.info(`[DEMO] Sending ${channel} to ${phone}`);
  // Demo mode — no real SMS sent until you add API keys
  return { messageId: `demo-${Date.now()}`, status: 'sent', provider: 'demo' };
};

exports.sendBulk = async (recipients) => {
  return recipients.map(r => ({ phone: r.phone, success: true, result: { status: 'sent' } }));
};
