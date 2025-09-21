@echo off
echo ========================================
echo Configuracao do Dominio Municipal
echo Prefeitura de Fronteira-MG
echo ========================================
echo.

echo Este script configura o dominio municipal fronteira.localhost
echo para desenvolvimento local do Sistema de Gestao Escolar.
echo.

echo IMPORTANTE: Este script precisa ser executado como Administrador
echo.

REM Verificar se está executando como administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Execute este script como Administrador!
    echo Clique com botao direito e selecione "Executar como administrador"
    pause
    exit /b 1
)

echo Configurando hosts file...
echo.

REM Backup do arquivo hosts
copy "%SystemRoot%\System32\drivers\etc\hosts" "%SystemRoot%\System32\drivers\etc\hosts.backup" >nul 2>&1

REM Verificar se a entrada já existe
findstr /c:"fronteira.localhost" "%SystemRoot%\System32\drivers\etc\hosts" >nul 2>&1
if %errorlevel% equ 0 (
    echo O dominio fronteira.localhost ja esta configurado!
    echo.
) else (
    echo Adicionando entrada do dominio municipal...
    echo 127.0.0.1    fronteira.localhost >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo Dominio municipal configurado com sucesso!
    echo.
)

echo ========================================
echo Configuracao concluida!
echo ========================================
echo.
echo Agora voce pode usar os comandos:
echo   npm run dev:fronteira
echo   npm run dev:municipal
echo.
echo Acesse o sistema em:
echo   http://fronteira.localhost:3001
echo   http://fronteira.localhost:3000
echo.
echo Pressione qualquer tecla para continuar...
pause >nul