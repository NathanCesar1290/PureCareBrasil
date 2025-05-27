#!/bin/bash

# Configurações
MEMORY_THRESHOLD=80
CPU_THRESHOLD=80
DISK_THRESHOLD=80
LOG_DIR="/var/log/purecarebrasil"

# Verifica uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
    echo "ALERTA: Uso de memória alto ($MEMORY_USAGE%)" | mail -s "Alerta de Memória - PureCareBrasil" admin@seu-dominio.com
fi

# Verifica uso de CPU
CPU_USAGE=$(mpstat 1 1 | tail -n 3 | head -n 1 | awk '{print 100 - $12}')
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    echo "ALERTA: Uso de CPU alto ($CPU_USAGE%)" | mail -s "Alerta de CPU - PureCareBrasil" admin@seu-dominio.com
fi

# Verifica uso de disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "ALERTA: Uso de disco alto ($DISK_USAGE%)" | mail -s "Alerta de Disco - PureCareBrasil" admin@seu-dominio.com
fi

# Verifica logs de erro
if grep -q "error\|fail\|critical" $LOG_DIR/*.log; then
    echo "ALERTA: Erros encontrados nos logs" | mail -s "Alerta de Logs - PureCareBrasil" admin@seu-dominio.com
fi

# Verifica status dos serviços
SERVICES=("docker" "docker-compose" "pm2" "nginx" "mongodb")
for SERVICE in ${SERVICES[@]}; do
    if ! systemctl is-active --quiet $SERVICE; then
        echo "ALERTA: Serviço $SERVICE não está rodando" | mail -s "Alerta de Serviço - PureCareBrasil" admin@seu-dominio.com
    fi
done

# Verifica conexões ativas
CONNECTIONS=$(netstat -an | grep ESTABLISHED | wc -l)
if [ "$CONNECTIONS" -gt 100 ]; then
    echo "ALERTA: Número elevado de conexões ativas ($CONNECTIONS)" | mail -s "Alerta de Conexões - PureCareBrasil" admin@seu-dominio.com
fi
