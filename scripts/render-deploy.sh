#!/bin/bash

# Configurações do Render
RENDER_SERVICE_NAME="purecarebrasil"
RENDER_API_TOKEN="seu_token_render"
RENDER_REGION="ams"  # Amsterdam

# Variáveis de ambiente
ENV_VARS="{
  \"NODE_ENV\":\"production\",
  \"PORT\":\"10000\",
  \"HOST\":\"0.0.0.0\",
  \"RENDER\":\"true\",
  \"FRONTEND_URL\":\"https://purecarebrasil.com\",
  \"MONGODB_URI\":\"mongodb+srv://Nathan1290:<db_password>@cluster0.geczi10.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0\",
  \"JWT_SECRET\":\"lKT+v2YohUSB4lRW5P6eQ+tY/9x84wRjaNk22Uizf6c=\",
  \"RATE_LIMIT_WINDOW_MS\":\"900000\",
  \"RATE_LIMIT_MAX\":\"100\",
  \"CORS_ENABLED\":\"true\",
  \"CORS_ORIGINS\":\"https://purecarebrasil.com,https://www.purecarebrasil.com\",
  \"CORS_METHODS\":\"GET,HEAD,PUT,PATCH,POST,DELETE\",
  \"CORS_HEADERS\":\"Content-Type,Authorization\",
  \"XSS_PROTECTION\":\"true\",
  \"SQL_INJECTION_PROTECTION\":\"true\",
  \"CSP_ENABLED\":\"true\",
  \"TZ\":\"America/Sao_Paulo\"
}"

# Configurações de recursos
RESOURCES="{
  \"cpu\":2,
  \"memoryGb\":4
}"

# Configurações de auto-scaling
SCALE="{
  \"minReplicas\":1,
  \"maxReplicas\":3,
  \"cpu\":{
    \"targetUtilization\":70
  },
  \"memory\":{
    \"targetUtilization\":70
  },
  \"rules\":[
    {
      \"metric\":\"http_requests\",
      \"threshold\":100,
      \"period\":\"1m\"
    },
    {
      \"metric\":\"response_time\",
      \"threshold\":500,
      \"period\":\"1m\"
    }
  ]
}"

# Criar Web Service no Render
render create web-service \
  --name $RENDER_SERVICE_NAME \
  --region $RENDER_REGION \
  --repo-url https://github.com/NathanCesar1290/PureCareBrasil \
  --branch main \
  --env-vars "$ENV_VARS" \
  --resources "$RESOURCES" \
  --scale "$SCALE" \
  --start-command "npm run prod" \
  --build-command "npm run build" \
  --health-check-path "/health"

# Configurar domínios
render domains add purecarebrasil.com
render domains add www.purecarebrasil.com

# Configurar SSL/TLS
render ssl enable purecarebrasil.com
render ssl enable www.purecarebrasil.com

# Configurar Redis (opcional)
# render create redis \
#   --name purecarebrasil-redis \
#   --region $RENDER_REGION \
#   --password "seu_redis_password"

success "Deploy concluído com sucesso!"
