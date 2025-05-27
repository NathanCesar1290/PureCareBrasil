#!/bin/bash

# Configurações
PROJECT_DIR="/home/deploy/minimal-shop"
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Função para mostrar uso
usage() {
    echo "Uso: $0 [opção]"
    echo "Opções:"
    echo "  -h  Mostra esta ajuda"
    echo "  -f  Força deploy sem confirmação"
    exit 1
}

# Verifica se o usuário é root
if [ "$EUID" -eq 0 ]; then 
    echo "Por favor, não execute como root" 
    exit 1
fi

# Verifica se o projeto está no git
if [ ! -d ".git" ]; then
    echo "Este diretório não é um repositório git"
    exit 1
fi

# Verifica se há alterações não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "Erro: Há alterações não commitadas"
    exit 1
fi

# Verifica se há alterações não pushadas
if [ -n "$(git log @{u}..)" ]; then
    echo "Erro: Há commits não pushados"
    exit 1
fi

# Faz backup do código atual
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/minimal-shop-$DATE.tar.gz $PROJECT_DIR

# Atualiza o código
npm install --production
npm run build

# Reinicia o serviço
pm2 restart minimal-shop

# Verifica se o serviço está rodando
if ! pm2 show minimal-shop | grep -q "status: online"; then
    echo "Erro: Serviço não está online após o deploy"
    exit 1
fi

# Limpa cache do PM2
pm2 flush

# Verifica logs
pm2 logs minimal-shop --lines 10

# Remove backups antigos (manter apenas os últimos 7 dias)
find $BACKUP_DIR -type f -mtime +7 -name "minimal-shop-*.tar.gz" -exec rm -f {} \;

# Mensagem de sucesso
echo "Deploy concluído com sucesso!"
