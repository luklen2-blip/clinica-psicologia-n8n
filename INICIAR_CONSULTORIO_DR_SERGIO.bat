@echo off
title CONSULTORIO DE PSICOLOGIA DR. SERGIO - 24/7
color 0B
cls

echo ===================================================================
echo   CONSULTORIO DE PSICOLOGIA DR. SERGIO - AUTOMACAO N8N
echo   Secretaria Virtual Sofia - Atendimento e Agenda 24/7
echo ===================================================================
echo.

if exist "C:\Users\luciano\OneDrive\Desktop\Clinica-Dr-Sergio" (
    cd /d "C:\Users\luciano\OneDrive\Desktop\Clinica-Dr-Sergio"
) else if exist "C:\Users\luciano\Desktop\Clinica-Dr-Sergio" (
    cd /d "C:\Users\luciano\Desktop\Clinica-Dr-Sergio"
) else (
    cd /d "%~dp0"
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao esta instalado ou nao foi encontrado no PATH.
    echo Por favor, instale o Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)

set PORT=3050
echo [1/2] Iniciando servidor do Dr. Sergio na porta %PORT%...
echo [2/2] O navegador sera aberto automaticamente em: http://localhost:%PORT%
echo.
echo ===================================================================
echo  Servidor ativo! Para fechar o consultorio, feche esta janela.
echo ===================================================================
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] O servidor foi encerrado com codigo %errorlevel%.
    pause
)
