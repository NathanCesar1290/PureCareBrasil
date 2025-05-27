FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps --production && \
    npm cache clean --force

# Copiar fontes
COPY . .

FROM node:18-alpine AS production

WORKDIR /app

# Copiar arquivos do builder
COPY --from=builder /app .

# Expor porta
EXPOSE 10000

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=10000
ENV RENDER_SERVICE_NAME=purecarebrasil
ENV RENDER_LOG_LEVEL=info

# Configurar logs para RFC5424
RUN apk add --no-cache syslog-ng
RUN syslog-ng --version

# Iniciar aplicação
CMD ["sh", "-c", "syslog-ng -F && node server.js"]

# Labels para identificação
LABEL org.opencontainers.image.title="PureCareBrasil"
LABEL org.opencontainers.image.description="E-commerce da PureCareBrasil"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="NathanCesar1290"
LABEL org.opencontainers.image.url="https://github.com/NathanCesar1290/PureCareBrasil"
LABEL org.opencontainers.image.source="https://github.com/NathanCesar1290/PureCareBrasil"
LABEL org.opencontainers.image.documentation="https://github.com/NathanCesar1290/PureCareBrasil/README.md"
