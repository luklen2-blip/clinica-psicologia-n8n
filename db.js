const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'banco_clinica.json');

const INITIAL_DATA = {
  config: {
    clinicName: 'Clínica Serenidade - Psicologia & Acolhimento',
    psychologistName: 'Dra. Camila Duarte',
    crp: 'CRP 06/148920',
    pixKey: 'contato@clinicaserenidade.com.br',
    pixName: 'DRA CAMILA DUARTE',
    pixCity: 'SAO PAULO',
    sessionPrice: 180.00,
    sessionDurationMinutes: 50,
    meetLinkDefault: 'https://meet.google.com/psi-serena-app',
    clinicAddress: 'Av. Paulista, 1842 - Conjunto 74, Bela Vista, São Paulo - SP',
    workingHours: {
      start: '08:00',
      end: '19:00',
      days: [1, 2, 3, 4, 5] // Seg a Sex
    },
    emergencyNotice: 'IMPORTANTE: Este canal automático não realiza pronto-socorro psicológico. Se você estiver em situação de crise emocional intensa ou risco imediato, ligue para o CVV (Centro de Valorização da Vida) pelo número 188 (gratuito 24h) ou procure o pronto-atendimento mais próximo.'
  },
  consultas: [
    {
      id: 'cons_101',
      patientName: 'Mariana Silva',
      patientPhone: '11987654321',
      modality: 'Online',
      date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0], // Amanhã (D-1)
      time: '14:00',
      status: 'pendente', // pendente, confirmada, cancelada, realizada
      pixStatus: 'pago',
      meetLink: 'https://meet.google.com/psi-mariana-101',
      lembrete24hEnviado: false,
      lembrete2hEnviado: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cons_102',
      patientName: 'Lucas Ferreira',
      patientPhone: '11976543210',
      modality: 'Presencial',
      date: new Date(Date.now() + 2 * 3600 * 1000).toISOString().split('T')[0], // Hoje daqui a pouco
      time: '16:00',
      status: 'confirmada',
      pixStatus: 'pago',
      meetLink: '',
      lembrete24hEnviado: true,
      lembrete2hEnviado: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cons_103',
      patientName: 'Beatriz Almeida',
      patientPhone: '11965432109',
      modality: 'Online',
      date: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
      time: '10:00',
      status: 'pendente',
      pixStatus: 'pendente',
      meetLink: 'https://meet.google.com/psi-beatriz-103',
      lembrete24hEnviado: false,
      lembrete2hEnviado: false,
      createdAt: new Date().toISOString()
    }
  ],
  historicoMensagens: [
    {
      id: 'msg_001',
      phone: '11987654321',
      sender: 'paciente',
      text: 'Olá, gostaria de saber como funciona a terapia online.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'msg_002',
      phone: '11987654321',
      sender: 'n8n_bot',
      text: 'Olá Mariana! Seja bem-vinda à Clínica Serenidade. Sou a assistente virtual da Dra. Camila Duarte...',
      timestamp: new Date(Date.now() - 3500000).toISOString()
    }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler DB:', err);
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Erro ao escrever DB:', err);
    return false;
  }
}

module.exports = {
  readDb,
  writeDb
};

