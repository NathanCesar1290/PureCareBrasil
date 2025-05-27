#!/bin/bash

# Configurações
LOG_FILE="/var/log/minimal-shop/monitor.log"
MEMORY_THRESHOLD=80  # % de uso de memória
CPU_THRESHOLD=90    # % de uso de CPU
DISK_THRESHOLD=90   # % de uso de disco

# Função para registrar logs
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Verifica uso de memória
check_memory() {
    memory=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
    if (( $(echo "$memory > $MEMORY_THRESHOLD" | bc -l) )); then
        log "AVISO: Uso de memória alto: $memory%"
    fi
}

# Verifica uso de CPU
check_cpu() {
    cpu=$(top -bn1 | grep "Cpu(s)" | sed "s/.*,\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    if (( $(echo "$cpu > $CPU_THRESHOLD" | bc -l) )); then
        log "AVISO: Uso de CPU alto: $cpu%"
    fi
}

# Verifica uso de disco
check_disk() {
    disk=$(df / | grep / | awk '{print $5}' | sed 's/%//')
    if [ "$disk" -gt "$DISK_THRESHOLD" ]; then
        log "AVISO: Uso de disco alto: $disk%"
    fi
}

# Verifica se o serviço está rodando
check_service() {
    if ! systemctl is-active --quiet minimal-shop; then
        log "CRÍTICO: Serviço minimal-shop não está rodando"
        systemctl restart minimal-shop
        log "Tentando reiniciar o serviço minimal-shop"
    fi
}

# Executa as verificações
check_memory
check_cpu
check_disk
check_service
