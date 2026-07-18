#!/bin/bash

echo "========================================"
echo "Configuração do Domínio Municipal"
echo "Prefeitura de Fronteira-MG"
echo "========================================"
echo

echo "Este script configura o domínio municipal fronteira.localhost"
echo "para desenvolvimento local do Sistema de Gestão Escolar."
echo

# Verificar se está executando como root
if [[ $EUID -eq 0 ]]; then
    echo "AVISO: Executando como root/sudo - continuando..."
    echo
elif ! sudo -n true 2>/dev/null; then
    echo "Este script precisa de permissões sudo para editar /etc/hosts"
    echo "Digite sua senha quando solicitado:"
    echo
fi

# Função para configurar hosts
configure_hosts() {
    local hosts_file="/etc/hosts"
    local entry="127.0.0.1    fronteira.localhost"

    echo "Configurando arquivo hosts..."

    # Fazer backup do arquivo hosts
    sudo cp "$hosts_file" "$hosts_file.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null

    # Verificar se a entrada já existe
    if grep -q "fronteira.localhost" "$hosts_file" 2>/dev/null; then
        echo "O domínio fronteira.localhost já está configurado!"
    else
        echo "Adicionando entrada do domínio municipal..."
        echo "$entry" | sudo tee -a "$hosts_file" > /dev/null
        echo "Domínio municipal configurado com sucesso!"
    fi
    echo
}

# Executar configuração
configure_hosts

echo "========================================"
echo "Configuração concluída!"
echo "========================================"
echo
echo "Agora você pode usar os comandos:"
echo "  npm run dev:fronteira"
echo "  npm run dev:municipal"
echo
echo "Acesse o sistema em:"
echo "  http://fronteira.localhost:3001"
echo "  http://fronteira.localhost:3000"
echo
echo "Para verificar a configuração:"
echo "  ping fronteira.localhost"
echo

# Testar configuração
echo "Testando configuração..."
if ping -c 1 fronteira.localhost >/dev/null 2>&1; then
    echo "✅ Domínio municipal configurado corretamente!"
else
    echo "❌ Erro na configuração. Verifique o arquivo /etc/hosts"
fi