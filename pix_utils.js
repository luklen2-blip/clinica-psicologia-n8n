/**
 * Gerador Oficial de PIX EMV Copia-e-Cola (Banco Central do Brasil)
 * Compatível com o padrão BR Code e cálculo de CRC16/CCITT-FALSE
 */

function formatField(id, value) {
  const strVal = String(value);
  const len = String(strVal.length).padStart(2, '0');
  return `${id}${len}${strVal}`;
}

function calculateCrc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload({ pixKey, name = 'Clinica Psicologia', city = 'SAO PAULO', amount = 150.00, txId = 'PSICO' }) {
  const cleanKey = String(pixKey).trim();
  const cleanName = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25);
  const cleanCity = String(city).normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15);
  const cleanTxId = String(txId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'CONSULTA';

  const merchantAccountInfo = [
    formatField('00', 'br.gov.bcb.pix'),
    formatField('01', cleanKey)
  ].join('');

  const additionalDataField = formatField('05', cleanTxId);

  const payloadWithoutCrc = [
    formatField('00', '01'),                                                    // Payload Format Indicator
    formatField('26', merchantAccountInfo),                                     // Merchant Account Info
    formatField('52', '0000'),                                                  // Merchant Category Code
    formatField('53', '986'),                                                   // Currency Code (BRL)
    amount ? formatField('54', Number(amount).toFixed(2)) : '',                 // Transaction Amount
    formatField('58', 'BR'),                                                    // Country Code
    formatField('59', cleanName),                                               // Merchant Name
    formatField('60', cleanCity),                                               // Merchant City
    formatField('62', additionalDataField),                                     // Additional Data Field
    '6304'                                                                      // CRC16 Indicator
  ].join('');

  const crcHex = calculateCrc16(payloadWithoutCrc);
  return payloadWithoutCrc + crcHex;
}

function getPixQrCodeUrl(payloadPix) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payloadPix)}`;
}

module.exports = {
  generatePixPayload,
  getPixQrCodeUrl,
  calculateCrc16
};

