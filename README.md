# Hub de Automação n8n para Clínicas de Psicologia (Luciano Standard 24/7)

Sistema completo de recepção virtual, triagem ética de saúde mental, agendamento de consultas, régua de confirmação anti-no-show e cobrança oficial PIX via n8n.

---

## 🏛️ Arquitetura dos Workflows n8n

O projeto contém 4 fluxos estruturados na pasta `workflows/` prontos para importação direta no n8n (via **CTRL+V** ou upload de arquivo JSON):

### 1. `workflow_clinica_psicologia_master.json` (Fluxo Mestre 24/7)
- **Webhook de Entrada:** Conecta-se à Evolution API, Z-API ou Webhook oficial do WhatsApp.
- **Normalização de Dados:** Extrai nome do paciente, telefone higienizado e mensagem.
- **Filtro Ético de Crise (Resolução CFP 011/2018):** Detecta palavras-chave de risco e ideação suicida (*suicídio, desespero, me matar, etc.*), acionando imediatamente o protocolo ético de emergência com indicação do **CVV 188** (24h gratuito) e SAMU 192, alertando a equipe clínica.
- **Roteador Inteligente (Switch):** Encaminha a conversa para:
  1. *Novo Agendamento / Triagem Inicial*
  2. *Confirmação de Presença (Lembretes D-1 e H-2)*
  3. *Solicitação de Remarcação de Horário*
  4. *Informações de Valores e Emissão de PIX*
  5. *Atendimento Humano Prioritário*
- **Gerador de PIX EMV (Bacen):** Gera payload oficial com cálculo de CRC-16 e QR Code.
- **Régua Anti-No-Show (Cron a cada 1h):** Varre consultas em D-1 (24h) e H-2 (2h) e dispara lembretes interativos com botões de confirmação.

### 2. `workflow_agendamento_triagem.json`
- Subfluxo focado na recepção e acolhimento ético do paciente, seleção de modalidade (Online ou Presencial) e consulta de horários disponíveis.

### 3. `workflow_lembretes_noshow_cron.json`
- Subfluxo automatizado por Cron para envio de lembretes pontuais com link do Google Meet e endereço da clínica.

### 4. `workflow_cobranca_pix.json`
- Subfluxo para recebimento da taxa de reserva ou pagamento integral da sessão de psicoterapia.

---

## 🚀 Como Importar e Usar no n8n

1. **Abra seu n8n** (n8n Cloud, Docker ou Desktop).
2. Abra o arquivo JSON de qualquer um dos fluxos na pasta `workflows/` (ou use o botão **"Copiar JSON"** no painel web).
3. No editor do n8n, dê **CTRL + V** em qualquer área em branco.
4. Conecte sua credencial da Evolution API / Z-API ou HTTP Request para envio de WhatsApp.
5. Clique em **"Save"** e ative o botão **"Active"**.

---

## 💻 Painel Web de Gestão e Simulador Interativo

O projeto acompanha um servidor Node.js com interface web completa:
- **Painel de Gestão:** Agenda de pacientes, confirmações em tempo real e faturamento PIX.
- **Simulador de WhatsApp:** Permite testar as respostas do bot, menus interativos e filtro de acolhimento do CVV 188 diretamente no navegador.
- **Central de Workflows:** Visualização e download de todos os arquivos JSON.
- **Configurações:** Edição do nome da clínica, CRP, chave PIX e valor da consulta.

### Execução Local:
```bash
# Iniciar o servidor
node server.js

# Executar bateria de testes automatizados
node tests/run_all.js
```
Ou dê um duplo clique no atalho **`INICIAR_CLINICA_PSICOLOGIA_N8N.bat`** na sua Área de Trabalho!

---

## ☁️ Deploy Contínuo 24/7 na Nuvem

- **Endpoint de Saúde:** `GET /api/health` retornando status HTTP 200 e métricas de uptime.
- **Render:** Blueprint declarativo `render.yaml` pronto para deploy em 1 clique.
- **Docker:** `Dockerfile` universal `node:20-alpine` validando testes de integridade antes do boot.
- **Pacote ZIP:** Arquivo `CLINICA_PSICOLOGIA_N8N_DEPLOY.zip` gerado na Área de Trabalho pronto para upload imediato.

---

## ⚖️ Conformidade Legal, Ética e Regulatória Brasileira

- **Conselho Federal de Psicologia (CFP):** Em conformidade com o Código de Ética Profissional e a Resolução CFP nº 011/2018 sobre atendimento e suporte tecnológico.
- **LGPD (Lei 13.709/2018 - Art. 11):** Prontuários clínicos e relatos íntimos de pacientes são blindados e nunca transitam ou ficam armazenados em robôs de WhatsApp.
- **Aviso Ético:** Ferramentas de automação e inteligência artificial não substituem psicoterapia, diagnósticos ou tratamentos médicos.

