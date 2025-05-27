# Guia de Implantação em Produção

Este guia fornece instruções passo a passo para implantar o Minimal Shop em um ambiente de produção.

## Pré-requisitos

- Servidor Linux (Ubuntu 20.04/22.04 recomendado)
- Node.js 14.x ou superior
- NPM 6.x ou superior
- MongoDB 4.4 ou superior
- Nginx (como proxy reverso)
- PM2 (para gerenciamento de processos)
- Domínio configurado e apontando para o IP do servidor
- Certificado SSL (recomendado Let's Encrypt)

## 1. Configuração do Servidor

### Atualize o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instale as dependências necessárias
```bash
sudo apt install -y git nginx python3-certbot-nginx
```

### Instale o Node.js (caso ainda não tenha)
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instale o PM2 globalmente
```bash
sudo npm install -g pm2
```

## 2. Configuração do Banco de Dados

### Instale o MongoDB
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Crie um banco de dados e usuário
```bash
mongo
> use minimal-shop
> db.createUser({user: "minimaluser", pwd: "uma_senha_forte_aqui", roles: ["readWrite"]})
> exit
```

## 3. Implantação da Aplicação

### Clone o repositório
```bash
cd /var/www
sudo git clone https://github.com/seu-usuario/minimal-shop.git
sudo chown -R $USER:$USER minimal-shop/
cd minimal-shop
```

### Instale as dependências
```bash
npm install --production
```

### Configure as variáveis de ambiente
```bash
cp .env.example .env.production
nano .env.production
```

Atualize as seguintes variáveis:
```env
NODE_ENV=production
MONGODB_URI=mongodb://minimaluser:uma_senha_forte_aqui@localhost:27017/minimal-shop?authSource=admin
JWT_SECRET=uma_string_segura_aleatoria
# Outras variáveis conforme necessário
```

## 4. Configuração do Nginx

### Crie um novo arquivo de configuração
```bash
sudo nano /etc/nginx/sites-available/minimal-shop
```

Cole a configuração do arquivo `nginx.conf` que está no repositório, atualizando os domínios e caminhos.

### Ative o site
```bash
sudo ln -s /etc/nginx/sites-available/minimal-shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. Configuração do SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

## 6. Iniciando a Aplicação

### Dê permissão de execução ao script de deploy
```bash
chmod +x deploy.sh
```

### Execute o deploy
```bash
./deploy.sh
```

## 7. Monitoramento e Manutenção

### Comandos úteis do PM2
- `pm2 list` - Lista todos os processos
- `pm2 logs` - Mostra os logs em tempo real
- `pm2 monit` - Monitora recursos do sistema
- `pm2 restart all` - Reinicia todos os processos

### Atualizando a aplicação
```bash
git pull
./deploy.sh
```

## 8. Backup

### Crie um script de backup (opcional)
```bash
nano /usr/local/bin/backup-minimal-shop.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/minimal-shop"

mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://minimaluser:uma_senha_forte_aqui@localhost:27017/minimal-shop?authSource=admin" --out=$BACKUP_DIR/$DATE

# Manter apenas os últimos 7 backups
ls -t $BACKUP_DIR | tail -n +8 | xargs -I {} rm -rf {}
```

### Torne o script executável
```bash
chmod +x /usr/local/bin/backup-minimal-shop.sh
```

### Adicione ao crontab para backup diário
```bash
crontab -e
```

Adicione a linha:
```
0 2 * * * /usr/local/bin/backup-minimal-shop.sh
```

## Solução de Problemas

### Verifique os logs da aplicação
```bash
pm2 logs
```

### Verifique os logs do Nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

### Verifique o status do MongoDB
```bash
sudo systemctl status mongod
```

## Segurança Adicional

1. Configure o firewall
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

2. Atualize regularmente o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

3. Monitore o uso de recursos
```bash
top
htop
```

## Suporte

Em caso de problemas, consulte a documentação ou abra uma issue no repositório do projeto.
