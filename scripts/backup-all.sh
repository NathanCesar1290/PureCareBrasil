#!/bin/bash

# Configurações
BACKUP_DIR="/home/backup/purecarebrasil"
DATE=$(date +%Y%m%d_%H%M%S)

# Cria diretório de backup
mkdir -p $BACKUP_DIR

# Backup do código
mkdir -p $BACKUP_DIR/code
tar -czf $BACKUP_DIR/code/purecarebrasil-$DATE.tar.gz .

# Backup do MongoDB
docker exec purecarebrasil-mongo mongodump --out /var/lib/mongodb/backup/purecarebrasil-$DATE

# Backup dos logs
docker exec purecarebrasil-nginx tar -czf /var/log/nginx/backup-$DATE.tar.gz /var/log/nginx/

# Limpa backups antigos (manter apenas os últimos 7 dias)
find $BACKUP_DIR -type f -mtime +7 -name "*.tar.gz" -exec rm -f {} \;

# Envia backup para armazenamento remoto (exemplo com AWS S3)
aws s3 cp $BACKUP_DIR/ s3://seu-bucket-backup/purecarebrasil/$DATE/ --recursive

# Verifica se tudo foi feito com sucesso
if [ $? -eq 0 ]; then
    echo "Backup completo realizado com sucesso em $DATE"
else
    echo "Erro ao realizar backup" | mail -s "Erro de Backup - PureCareBrasil" admin@seu-dominio.com
    exit 1
fi
