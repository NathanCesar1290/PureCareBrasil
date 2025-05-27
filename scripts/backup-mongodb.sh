#!/bin/bash

# Configurações
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE="minimal-shop"

# Cria diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Executa o backup
echo "Iniciando backup do MongoDB em $DATE..."
mongodump --uri="$MONGODB_URI" --db="$DATABASE" --out="$BACKUP_DIR/$DATE"

# Verifica se o backup foi bem sucedido
if [ $? -eq 0 ]; then
    echo "Backup concluído com sucesso em $BACKUP_DIR/$DATE"
    
    # Remove backups antigos (manter apenas os últimos 7 dias)
    find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
    echo "Backups antigos removidos"
else
    echo "Erro ao realizar backup" >&2
    exit 1
fi
