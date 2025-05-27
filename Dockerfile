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

# Configurar firewall para permitir apenas IPs específicos
RUN apk add --no-cache iptables && \
    echo "*filter\n:INPUT DROP [0:0]\n:FORWARD DROP [0:0]\n:OUTPUT ACCEPT [0:0]\n-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT\n-A INPUT -p tcp -m tcp --dport 10000 -s 52.41.36.82 -j ACCEPT\n-A INPUT -p tcp -m tcp --dport 10000 -s 54.191.253.12 -j ACCEPT\n-A INPUT -p tcp -m tcp --dport 10000 -s 44.226.122.3 -j ACCEPT\n-A INPUT -i lo -j ACCEPT\nCOMMIT" > /etc/iptables/rules.v4 && \
    iptables-restore < /etc/iptables/rules.v4

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
