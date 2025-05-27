FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps --production && \
    npm cache clean --force

# Copiar fontes
COPY . .

# Construir a aplicação
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

# Copiar arquivos do builder
COPY --from=builder /app .

# Expor porta
EXPOSE 10000

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=10000

# Iniciar aplicação
CMD ["node", "server.js"]

# Labels para identificação
LABEL org.opencontainers.image.title="PureCareBrasil"
LABEL org.opencontainers.image.description="E-commerce da PureCareBrasil"
LABEL org.opencontainers.image.version="1.0.0"
