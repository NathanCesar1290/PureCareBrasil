FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install

# Copiar fontes
COPY . .

# Construir o frontend
RUN npm run build

# Criar imagem de produção
FROM node:18-alpine

WORKDIR /app

# Instalar dependências de produção
COPY package*.json ./
RUN npm install --production

# Copiar arquivos do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/.env.production ./

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["node", "server.js"]
