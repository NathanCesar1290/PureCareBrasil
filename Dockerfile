# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps --production && \
    npm cache clean --force

# Copiar fontes
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos do builder
COPY --from=builder /app .

# Garantir que o diretório de uploads existe
RUN mkdir -p uploads

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0
ENV RENDER=true

# Expor a porta que o app vai rodar
EXPOSE ${PORT}

# Configuração de saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Iniciar aplicação
CMD ["node", "server.js"]

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
