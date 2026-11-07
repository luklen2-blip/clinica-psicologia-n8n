@echo off
title CLINICA SERENIDADE - HUB N8N 24/7
color 0A
chcp 65001 >nul

echo ===================================================================
echo   CLINICA SERENIDADE - HUB DE AUTOMACAO N8N E AGENDAMENTOS
echo   Padrao Luciano Standard 24/7 com Endpoint /api/health
echo ===================================================================
echo.

cd /d "c:\Users\luciano\OneDrive\Documentos\nova pasta\index.html\ClinicaPsicologia-n8n"

echo [1/3] Verificando integridade dos testes locais...
node tests/run_all.js
if %ERRORLEVEL% NEQ 0 (
  echo [ERRO] Falha na suite de testes!
  pause
  exit /b 1
)

echo.
echo [2/3] Abrindo painel de gestao e simulador n8n...
start "" http://localhost:3000

echo.
echo [3/3] Servidor online e monitoramento ativo!
echo Para encerrar o servico, feche esta janela.
echo ===================================================================
node server.js
