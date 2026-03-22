const logger = require('../utils/logger');
exports.send = async ({ phone, message }) => {
  logger.info(`[SMS DEMO] To: ${phone}`);
  return { messageId: `demo-${Date.now()}`, status: 'sent', provider: 'demo' };
};
exports.sendBulk = async (recipients) => recipients.map(r => ({ phone: r.phone, success: true }));
