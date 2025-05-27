#!/bin/bash

# Verifica se é root
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor, execute como root"
    exit 1
fi

# Inicia o Docker
systemctl start docker

# Inicia o Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Inicia o PM2
pm2 start ecosystem.config.js --env production

# Inicia o Monitoramento
docker-compose -f docker-compose.prod.yml logs -f | while read line; do
    echo "[$(date)] $line" >> /var/log/minimal-shop/monitor.log
    if echo "$line" | grep -q "error\|fail\|critical"; then
        echo "ALERTA: Erro detectado no log" | mail -s "Alerta de Erro - Minimal Shop" admin@seu-dominio.com
    fi
done
