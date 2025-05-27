#!/bin/bash

# Cores para mensagens
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagens de sucesso
success() {
  echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para exibir avisos
warning() {
  echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Função para exibir erros e sair
error() {
  echo -e "${RED}[ERRO]${NC} $1"
  exit 1
}

echo -e "\n${YELLOW}=== Iniciando processo de deploy ===${NC}\n"

# 1. Atualizar o código
success "1. Atualizando o código do repositório..."
git pull origin main || error "Falha ao atualizar o código"

# 2. Instalar dependências
success "2. Instalando dependências..."
npm install --production || error "Falha ao instalar as dependências"

# 3. Construir o frontend (se aplicável)
if [ -f "package-lock.json" ] && grep -q "build" package.json; then
  success "3. Construindo o frontend..."
  npm run build || warning "A construção do frontend falhou, mas continuando..."
else
  success "3. Nenhuma construção de frontend necessária, pulando..."
fi

# 4. Parar o PM2 se estiver rodando
if command -v pm2 &> /dev/null; then
  success "4. Parando instância PM2 existente..."
  pm2 delete all || warning "Nenhum processo PM2 em execução ou falha ao parar"
fi

# 5. Iniciar a aplicação com PM2
success "5. Iniciando a aplicação com PM2..."
if [ -f "ecosystem.config.js" ]; then
  pm2 start ecosystem.config.js --env production || error "Falha ao iniciar com PM2"
else
  NODE_ENV=production pm2 start server.js --name "minimal-shop" -i max || error "Falha ao iniciar com PM2"
fi

# 6. Configurar inicialização automática
success "6. Configurando inicialização automática..."
pm2 save
pm2 startup || warning "Falha ao configurar inicialização automática (pode exigir privilégios de root)"

# 7. Atualizar o Nginx (se configurado)
if [ -f "/etc/nginx/sites-available/minimal-shop" ]; then
  success "7. Recarregando configuração do Nginx..."
  sudo nginx -t && sudo systemctl reload nginx || warning "Falha ao recarregar o Nginx"
else
  success "7. Nenhuma configuração de Nginx encontrada, pulando..."
fi

# 8. Limpar cache
success "8. Limpando caches..."
npm cache clean --force || warning "Falha ao limpar o cache do npm"

# 9. Verificar status
success "9. Verificando status da aplicação..."
pm2 list

# 10. Mostrar logs
success "10. Últimas linhas do log de erros:"
tail -n 20 ~/.pm2/logs/minimal-shop-error-*.log 2>/dev/null || echo "Nenhum log de erro encontrado."

echo -e "\n${GREEN}=== Deploy concluído com sucesso! ===${NC}"
echo -e "${YELLOW}URL:${NC} https://seu-dominio.com"
echo -e "${YELLOW}Status:${NC} pm2 list"
echo -e "${YELLOW}Logs:${NC} pm2 logs minimal-shop"
echo -e "${YELLOW}Monitoramento:${NC} pm2 monit"

exit 0
