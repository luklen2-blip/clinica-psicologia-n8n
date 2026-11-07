/**
 * Suíte de Homologação Ao Vivo na Nuvem (Live Cloud E2E)
 * Validação remota de Produção (Render, Railway, Fly.io, etc.)
 * Uso: node tests/test_cloud_live.js <URL_DA_NUVEM>
 */

const https = require('https');
const http = require('http');
const url = require('url');

const targetUrl = process.argv[2] || process.env.CLOUD_URL || 'https://clinica-psicologia.onrender.com';

console.log('==================================================');
console.log(`🌐 TESTE AO VIVO EM NUVEM: ${targetUrl}`);
console.log('==================================================\n');

async function checkEndpoint(pathName, expectedCode = 200) {
  const fullUrl = url.resolve(targetUrl, pathName);
  const parsed = url.parse(fullUrl);
  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = client.get(fullUrl, {
      rejectUnauthorized: false, // Previne falhas com certificados intermediários no Windows
      headers: { 'User-Agent': 'Cloud-Live-Tester/2.0' }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        const ok = res.statusCode === expectedCode;
        console.log(`[${ok ? '✓' : '✗'}] ${pathName} -> Status HTTP ${res.statusCode} (esperado ${expectedCode})`);
        resolve({ ok, statusCode: res.statusCode, body: raw });
      });
    });

    req.on('error', (err) => {
      console.log(`[✗] ${pathName} -> Erro de Conexão: ${err.message}`);
      resolve({ ok: false, error: err.message });
    });
  });
}

async function runLiveTests() {
  console.log('1. Testando monitoramento de saúde (/api/health)...');
  const health = await checkEndpoint('/api/health');

  console.log('2. Testando carregamento da interface web da clínica (/)...');
  const home = await checkEndpoint('/');

  console.log('3. Testando páginas legais (/termos e /privacidade)...');
  await checkEndpoint('/termos');
  await checkEndpoint('/privacidade');

  console.log('4. Testando rota de consultas (/api/consultas)...');
  await checkEndpoint('/api/consultas');

  console.log('\n--------------------------------------------------');
  if (health.ok && home.ok) {
    console.log('🎉 HOMOLOGAÇÃO EM NUVEM CONCLUÍDA COM SUCESSO!');
  } else {
    console.log('⚠️ ALERTA: Verifique os logs e certifique-se de que o deploy está ativo.');
  }
  console.log('--------------------------------------------------\n');
}

runLiveTests();

