FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install --production

# Copiar fontes
COPY . .

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["node", "server.js"]

# Labels para identificação
LABEL org.opencontainers.image.title="PureCareBrasil"
LABEL org.opencontainers.image.description="E-commerce da PureCareBrasil"
LABEL org.opencontainers.image.version="1.0.0"
