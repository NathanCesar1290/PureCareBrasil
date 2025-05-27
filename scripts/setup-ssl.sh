#!/bin/bash

# Verifica se é root
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor, execute como root"
    exit 1
fi

# Instala certbot e nginx plugin
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Gera certificado
DOMAIN="seu-dominio.com"
certbot --nginx -d $DOMAIN -d www.$DOMAIN

# Configura auto-renovação
chmod 755 /etc/cron.daily/certbot

# Verifica se o certificado foi gerado
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Certificado SSL gerado com sucesso!"
    echo "Certificado será renovado automaticamente"
else
    echo "Erro ao gerar certificado SSL"
    exit 1
fi
