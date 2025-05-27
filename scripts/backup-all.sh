#!/bin/bash

# Configurações
BACKUP_DIR="/home/backup/minimal-shop"
DATE=$(date +%Y%m%d_%H%M%S)

# Cria diretório de backup
mkdir -p $BACKUP_DIR

# Backup do código
mkdir -p $BACKUP_DIR/code
tar -czf $BACKUP_DIR/code/minimal-shop-$DATE.tar.gz .

# Backup do MongoDB
docker exec minimal-shop-mongo mongodump --out /var/lib/mongodb/backup/minimal-shop-$DATE

# Backup dos logs
docker exec minimal-shop-nginx tar -czf /var/log/nginx/backup-$DATE.tar.gz /var/log/nginx/

# Limpa backups antigos (manter apenas os últimos 7 dias)
find $BACKUP_DIR -type f -mtime +7 -name "*.tar.gz" -exec rm -f {} \;

# Envia backup para armazenamento remoto (exemplo com AWS S3)
aws s3 cp $BACKUP_DIR/ s3://seu-bucket-backup/minimal-shop/$DATE/ --recursive

# Verifica se tudo foi feito com sucesso
if [ $? -eq 0 ]; then
    echo "Backup completo realizado com sucesso em $DATE"
else
    echo "Erro ao realizar backup" | mail -s "Erro de Backup - Minimal Shop" admin@seu-dominio.com
    exit 1
fi
