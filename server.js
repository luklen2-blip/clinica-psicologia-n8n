const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { readDb, writeDb } = require('./db');
const { generatePixPayload, getPixQrCodeUrl } = require('./pix_utils');

const PORT = process.env.PORT || 3050;
const APP_NAME = 'Clinica-Psicologia-n8n-Hub';
const VERSION = '2.0.0';

// Helper de parsing de JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Helper para servir arquivos com resolução universal
function serveStaticFile(res, relativePath, contentType = 'text/html; charset=utf-8') {
  const candidatePaths = [
    path.join(__dirname, 'public', relativePath),
    path.join(__dirname, relativePath),
    path.join(process.cwd(), 'public', relativePath),
    path.join(process.cwd(), relativePath)
  ];

  const foundPath = candidatePaths.find(p => fs.existsSync(p) && fs.statSync(p).isFile());

  if (foundPath) {
    const content = fs.readFileSync(foundPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. OBRIGATÓRIO: Rota de Monitoramento de Saúde 24/7 (/api/health)
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      app: APP_NAME,
      version: VERSION,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Rotas Legais e Conformidade Ética
  if (pathname === '/termos') {
    if (serveStaticFile(res, 'termos.html')) return;
  }
  if (pathname === '/privacidade') {
    if (serveStaticFile(res, 'privacidade.html')) return;
  }

  // 3. API: Configurações da Clínica
  if (pathname === '/api/config' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.config));
    return;
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDb();
    db.config = { ...db.config, ...body };
    writeDb(db);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, config: db.config }));
    return;
  }

  // 4. API: Consultas e Agendamentos
  if (pathname === '/api/consultas' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.consultas));
    return;
  }

  if (pathname === '/api/consultas' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDb();

    const newConsulta = {
      id: 'cons_' + Date.now(),
      patientName: body.patientName || 'Novo Paciente',
      patientPhone: String(body.patientPhone || '').replace(/\D/g, ''),
      patientEmail: body.patientEmail || '',
      modality: body.modality || 'Online',
      date: body.date || new Date().toISOString().split('T')[0],
      time: body.time || '15:00',
      status: body.status || 'pendente',
      pixStatus: body.pixStatus || 'pendente',
      meetLink: body.modality === 'Online' ? (body.meetLink || db.config.meetLinkDefault) : '',
      lembrete24hEnviado: false,
      lembrete2hEnviado: false,
      createdAt: new Date().toISOString()
    };

    db.consultas.push(newConsulta);
    writeDb(db);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, consulta: newConsulta }));
    return;
  }

  // Atualizar Status de Consulta
  if (pathname.startsWith('/api/consultas/') && req.method === 'PUT') {
    const id = pathname.replace('/api/consultas/', '');
    const body = await parseBody(req);
    const db = readDb();
    const idx = db.consultas.findIndex(c => c.id === id);

    if (idx !== -1) {
      db.consultas[idx] = { ...db.consultas[idx], ...body };
      writeDb(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, consulta: db.consultas[idx] }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Consulta não encontrada' }));
    }
    return;
  }

  // 5. API: Lembretes Pendentes (Consumido pelo CRON do n8n a cada hora)
  if (pathname === '/api/agendamentos/lembretes-pendentes' && req.method === 'GET') {
    const db = readDb();
    const now = new Date();
    const lembretes = [];

    db.consultas.forEach(c => {
      if (c.status === 'cancelada' || c.status === 'realizada') return;

      const [year, month, day] = c.date.split('-').map(Number);
      const [hours, minutes] = c.time.split(':').map(Number);
      const sessionDate = new Date(year, month - 1, day, hours, minutes);

      const diffMs = sessionDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Lembrete D-1 (aproximadamente 24h antes: entre 20h e 26h)
      if (diffHours >= 18 && diffHours <= 26 && !c.lembrete24hEnviado) {
        lembretes.push({
          ...c,
          tipoLembrete: '24h',
          descricao: `Lembrete de confirmação de presença (24h de antecedência)`
        });
      }
      // Lembrete H-2 (aproximadamente 2h antes: entre 1h e 3h)
      else if (diffHours >= 1 && diffHours <= 3 && !c.lembrete2hEnviado) {
        lembretes.push({
          ...c,
          tipoLembrete: '2h',
          descricao: `Lembrete imediato de sessão com link do Meet e orientações`
        });
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      total: lembretes.length,
      verificadoEm: now.toISOString(),
      lembretes
    }));
    return;
  }

  // 6. API: n8n Webhook Bridge - Confirmar Presença por Telefone
  if (pathname === '/api/n8n/confirmar-presenca' && req.method === 'POST') {
    const body = await parseBody(req);
    const phone = String(body.phone || '').replace(/\D/g, '');
    const status = body.status || 'confirmada';

    const db = readDb();
    let updated = false;
    let consultaAtualizada = null;

    db.consultas.forEach(c => {
      const cleanPatientPhone = c.patientPhone.replace(/\D/g, '');
      if (cleanPatientPhone.includes(phone) || phone.includes(cleanPatientPhone)) {
        c.status = status;
        updated = true;
        consultaAtualizada = c;
      }
    });

    if (updated) {
      writeDb(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, updated: true, consulta: consultaAtualizada }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, updated: false, message: 'Nenhuma consulta pendente para este telefone' }));
    }
    return;
  }

  // 7. API: n8n Disparo de Lembrete Anti-No-Show
  if (pathname === '/api/n8n/enviar-lembrete' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDb();

    const idx = db.consultas.findIndex(c => c.id === body.consultaId);
    if (idx !== -1) {
      if (body.tipoLembrete === '24h') db.consultas[idx].lembrete24hEnviado = true;
      if (body.tipoLembrete === '2h') db.consultas[idx].lembrete2hEnviado = true;
      writeDb(db);
    }

    // Registra no histórico de mensagens do simulador
    let msgText = '';
    if (body.tipoLembrete === '24h') {
      msgText = `🔔 *Lembrete da sua Sessão de Amanhã*\n\nOlá ${body.name}, sua consulta com o Dr. Sérgio está agendada para amanhã, ${body.date} às ${body.time}.\n\nPara mantermos seu horário reservado, por favor responda:\n*1* - Para CONFIRMAR presença\n*2* - Para SOLICITAR REMARCAÇÃO`;
    } else {
      msgText = `⏰ *Sua sessão começa em breve (às ${body.time})!*\n\nOlá ${body.name}! Prepare um ambiente tranquilo e com privacidade.\n${body.modality === 'Online' ? '🔗 Link da sessão segura: ' + (body.meetLink || db.config.meetLinkDefault) : '📍 Endereço da clínica: ' + db.config.clinicAddress}`;
    }

    db.historicoMensagens.push({
      id: 'msg_' + Date.now(),
      phone: body.phone,
      sender: 'n8n_bot',
      text: msgText,
      timestamp: new Date().toISOString()
    });
    writeDb(db);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, sent: true, message: msgText }));
    return;
  }

  // 8. API: Gerador de PIX Oficial (Bacen EMV com CRC16)
  if (pathname === '/api/pix/gerar' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDb();

    const amount = Number(body.amount) || db.config.sessionPrice || 180.00;
    const name = body.name || db.config.pixName || 'DR SERGIO PSICOLOGO';
    const pixKey = body.pixKey || db.config.pixKey;
    const city = db.config.pixCity || 'SAO PAULO';
    const txId = 'PSICO' + Math.floor(1000 + Math.random() * 9000);

    const payload = generatePixPayload({
      pixKey,
      name,
      city,
      amount,
      txId
    });

    const qrCodeUrl = getPixQrCodeUrl(payload);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      phone: body.phone || '',
      amount: amount.toFixed(2),
      txId,
      payload,
      qrCodeUrl,
      beneficiaria: name,
      chave: pixKey
    }));
    return;
  }

  // 9. API: Simulador de Disparo e Mensagens
  if (pathname === '/api/n8n/simulador-disparo' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDb();

    const newMsg = {
      id: 'msg_' + Date.now(),
      phone: body.phone || '5511999999999',
      sender: body.sender || 'n8n_bot',
      text: body.message || body.text || '',
      timestamp: new Date().toISOString()
    };

    db.historicoMensagens.push(newMsg);
    writeDb(db);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: newMsg }));
    return;
  }

  // 10. API: Buscar Histórico de Mensagens do Simulador
  if (pathname === '/api/mensagens' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.historicoMensagens));
    return;
  }

  // 11. API: Download de Workflows n8n em JSON
  if (pathname.startsWith('/api/workflows/download/')) {
    const filename = pathname.replace('/api/workflows/download/', '');
    const workflowPath = path.join(__dirname, 'workflows', filename);
    if (fs.existsSync(workflowPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      res.end(fs.readFileSync(workflowPath));
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Workflow não encontrado' }));
      return;
    }
  }

  // 12. Roteamento de Arquivos Estáticos e SPA Fallback
  let targetFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');

  // Content-Type mapping
  const ext = path.extname(targetFile).toLowerCase();
  let contentType = 'text/html; charset=utf-8';
  if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
  else if (ext === '.css') contentType = 'text/css; charset=utf-8';
  else if (ext === '.json') contentType = 'application/json; charset=utf-8';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.svg') contentType = 'image/svg+xml';

  if (serveStaticFile(res, targetFile, contentType)) {
    return;
  }

  // Fallback universal para SPA (index.html)
  if (serveStaticFile(res, 'index.html', 'text/html; charset=utf-8')) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Recurso não encontrado');
});

server.listen(PORT, () => {
  console.log(`[CLINICA-PSICOLOGIA-N8N] Servidor rodando na porta ${PORT}`);
  console.log(`[HEALTH] Endpoint ativo: http://localhost:${PORT}/api/health`);
  console.log(`[PAINEL] Painel da Clínica: http://localhost:${PORT}/`);

  // Se executado diretamente pelo usuário, abre o navegador automaticamente quando a porta estiver pronta
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { exec } = require('child_process');
      exec(`start http://localhost:${PORT}/`);
    } catch (e) {}
  }
});
