# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps --production && \
    npm cache clean --force

# Copiar fontes
COPY . .

# Build
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Copiar arquivos do builder
COPY --from=builder /app .

# Garantir que o diretório de uploads existe
RUN mkdir -p uploads && \
    chown -R node:node uploads && \
    chmod -R 755 uploads

# Instalar dependências de produção
RUN npm install --production --legacy-peer-deps && \
    npm cache clean --force

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0
ENV RENDER=true
ENV TZ=America/Sao_Paulo

# Definir usuário não-root
USER node

# Expor a porta que o app vai rodar
EXPOSE ${PORT}

# Configuração de saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Iniciar aplicação
CMD ["node", "server.js"]

# Labels para identificação
LABEL org.opencontainers.image.title="PureCareBrasil"
LABEL org.opencontainers.image.description="E-commerce da PureCareBrasil"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="NathanCesar1290"
LABEL org.opencontainers.image.url="https://github.com/NathanCesar1290/PureCareBrasil"
LABEL org.opencontainers.image.source="https://github.com/NathanCesar1290/PureCareBrasil"
LABEL org.opencontainers.image.documentation="https://github.com/NathanCesar1290/PureCareBrasil/README.md"

# Configuração de segurança
RUN apk add --no-cache \
    su-exec \
    && rm -rf /var/cache/apk/*

# Configuração de logs
VOLUME /app/logs
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json
ENV LOG_ROTATE=true
ENV LOG_MAX_SIZE=100M
ENV LOG_MAX_FILES=5

# Configuração de monitoramento
ENV METRICS_ENABLED=true
ENV METRICS_PORT=9090
ENV METRICS_PATH=/metrics

# Configuração de backup
ENV BACKUP_ENABLED=true
ENV BACKUP_INTERVAL=24h
ENV BACKUP_RETENTION=7d
ENV BACKUP_PATH=/backup

# Configuração de rate limiting
ENV RATE_LIMIT_ENABLED=true
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX=100

# Configuração de CORS
ENV CORS_ENABLED=true
ENV CORS_ORIGINS="*"
ENV CORS_METHODS="GET,HEAD,PUT,PATCH,POST,DELETE"
ENV CORS_HEADERS="Content-Type,Authorization"

# Configuração de segurança
ENV SECURITY_ENABLED=true
ENV SECURITY_XSS=true
ENV SECURITY_NO_SQL_INJECTION=true
ENV SECURITY_RATE_LIMIT=true
ENV SECURITY_CSP=true

# Configuração de sessões
ENV SESSION_SECRET=${SESSION_SECRET}
ENV SESSION_TTL=24h
ENV SESSION_SECURE=true
ENV SESSION_HTTP_ONLY=true

# Configuração de email
ENV EMAIL_ENABLED=true
ENV EMAIL_PROVIDER=sendgrid
ENV EMAIL_FROM="no-reply@purecarebrasil.com"
ENV EMAIL_TEMPLATES_PATH=/app/templates/email

# Configuração de armazenamento
ENV STORAGE_PROVIDER=aws
ENV STORAGE_BUCKET=purecarebrasil
ENV STORAGE_REGION=sa-east-1

# Configuração de logs estruturados
ENV STRUCTURED_LOGS=true
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json
ENV LOG_ROTATE=true
ENV LOG_MAX_SIZE=100M
ENV LOG_MAX_FILES=5

# Configuração de monitoramento de performance
ENV PERFORMANCE_MONITORING=true
ENV PERFORMANCE_METRICS_INTERVAL=5s
ENV PERFORMANCE_METRICS_PATH=/metrics
ENV PERFORMANCE_METRICS_PORT=9090

# Configuração de cache de API
ENV API_CACHE_ENABLED=true
ENV API_CACHE_PROVIDER=redis
ENV API_CACHE_TTL=3600
ENV API_CACHE_MAX_ITEMS=10000

# Instruções para o Render
# A aplicação deve escutar em 0.0.0.0 e na porta especificada na variável de ambiente PORT

# Labels para identificação
LABEL org.opencontainers.image.title="PureCareBrasil"
LABEL org.opencontainers.image.description="E-commerce da PureCareBrasil"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="NathanCesar1290"
LABEL org.opencontainers.image.url="https://github.com/NathanCesar1290/PureCareBrasil"
LABEL org.opencontainers.image.source="https://github.com/NathanCesar1290/PureCareBrasil"
LABEL org.opencontainers.image.documentation="https://github.com/NathanCesar1290/PureCareBrasil/README.md"

# Adicionar instruções para o Render
# Render precisa que a aplicação escute em 0.0.0.0 e na porta especificada na variável de ambiente PORT
