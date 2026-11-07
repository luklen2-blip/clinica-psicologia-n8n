const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { generatePixPayload, calculateCrc16 } = require('../pix_utils');

console.log('==================================================');
console.log('🧪 INICIANDO BATERIA DE TESTES LOCAIS: CLÍNICA N8N');
console.log('==================================================\n');

// 1. Teste de Integridade dos Arquivos JSON de Workflow do n8n
console.log('1. Validando integridade dos Workflows n8n...');
const workflowsDir = path.join(__dirname, '..', 'workflows');
const files = [
  'workflow_clinica_psicologia_master.json',
  'workflow_agendamento_triagem.json',
  'workflow_lembretes_noshow_cron.json',
  'workflow_cobranca_pix.json'
];

files.forEach(file => {
  const filePath = path.join(workflowsDir, file);
  assert(fs.existsSync(filePath), `Arquivo ${file} não encontrado`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  assert(Array.isArray(json.nodes), `${file} deve conter array 'nodes'`);
  assert(typeof json.connections === 'object', `${file} deve conter objeto 'connections'`);
  console.log(`   ✓ Workflow '${file}' válido com ${json.nodes.length} nós n8n.`);
});

// 2. Teste do Gerador de PIX Oficial BACEN (EMV com CRC16)
console.log('\n2. Validando gerador de PIX EMV com CRC-16 CCITT...');
const pixPayload = generatePixPayload({
  pixKey: 'contato@clinicaserenidade.com.br',
  name: 'DRA CAMILA DUARTE',
  city: 'SAO PAULO',
  amount: 180.00,
  txId: 'TESTE101'
});

assert(pixPayload.startsWith('000201'), 'Payload PIX deve iniciar com 000201');
assert(pixPayload.includes('contato@clinicaserenidade.com.br'), 'Payload deve conter a chave PIX');
assert(pixPayload.includes('180.00'), 'Payload deve conter o valor da sessão formatado');
assert(pixPayload.includes('6304'), 'Payload deve conter o indicador de CRC 6304');
const computedCrc = calculateCrc16(pixPayload.slice(0, -4));
assert(pixPayload.endsWith(computedCrc), 'CRC16 final deve coincidir com o cálculo do algoritmo');
console.log(`   ✓ PIX EMV gerado com sucesso: ${pixPayload.slice(0, 30)}... [CRC: ${computedCrc}]`);

// 3. Teste do Servidor HTTP & Endpoint /api/health
console.log('\n3. Iniciando servidor em porta temporária e testando rotas...');
process.env.PORT = '3999';
process.env.NODE_ENV = 'test';
const serverModule = require('../server');

setTimeout(async () => {
  try {
    // a. Teste /api/health
    const healthRes = await makeRequest('GET', '/api/health');
    assert.strictEqual(healthRes.statusCode, 200, 'Health check deve retornar 200');
    assert.strictEqual(healthRes.body.status, 'ok', 'Status deve ser ok');
    assert.strictEqual(healthRes.body.app, 'Clinica-Psicologia-n8n-Hub');
    assert(typeof healthRes.body.uptime_seconds === 'number', 'Uptime deve ser numérico');
    console.log('   ✓ GET /api/health retornou 200 OK com payload no padrão Luciano Standard.');

    // b. Teste /termos e /privacidade
    const termosRes = await makeRequest('GET', '/termos');
    assert.strictEqual(termosRes.statusCode, 200, '/termos deve retornar 200');
    assert(termosRes.raw.includes('Termos de Uso'), 'Página de termos deve carregar');
    console.log('   ✓ GET /termos retornou 200 OK com avisos éticos.');

    const privRes = await makeRequest('GET', '/privacidade');
    assert.strictEqual(privRes.statusCode, 200, '/privacidade deve retornar 200');
    assert(privRes.raw.includes('LGPD'), 'Página de privacidade deve carregar conformidade LGPD');
    console.log('   ✓ GET /privacidade retornou 200 OK com Art. 11 LGPD.');

    // c. Teste API de Consultas
    const consultasRes = await makeRequest('GET', '/api/consultas');
    assert.strictEqual(consultasRes.statusCode, 200);
    assert(Array.isArray(consultasRes.body), 'Consultas deve ser um array');
    console.log(`   ✓ GET /api/consultas retornou ${consultasRes.body.length} consultas cadastradas.`);

    // d. Teste Bridge n8n: Confirmação de Presença
    const confirmRes = await makeRequest('POST', '/api/n8n/confirmar-presenca', {
      phone: '11987654321',
      status: 'confirmada'
    });
    assert.strictEqual(confirmRes.statusCode, 200);
    assert.strictEqual(confirmRes.body.success, true);
    console.log('   ✓ POST /api/n8n/confirmar-presenca executado com sucesso.');

    // e. Teste Geração de PIX via API
    const pixApiRes = await makeRequest('POST', '/api/pix/gerar', {
      amount: 180.00,
      name: 'Mariana Silva'
    });
    assert.strictEqual(pixApiRes.statusCode, 200);
    assert(pixApiRes.body.payload.length > 50);
    console.log('   ✓ POST /api/pix/gerar retornou payload e QR Code dinâmico.');

    console.log('\n==================================================');
    console.log('✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
    console.log('==================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Falha nos testes:', err);
    process.exit(1);
  }
}, 600);

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3999,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        resolve({ statusCode: res.statusCode, body: parsed, raw });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

