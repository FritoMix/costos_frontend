# HTTPS on-premise con Caddy

El overlay `docker-compose.tls.yml` agrega Caddy como borde y deja el
frontend accesible solo en loopback. Caddy redirige HTTP (80) a HTTPS (443)
y agrega HSTS.

## Opcion A: red interna sin dominio publico (recomendada en planta)

```bash
# En .env
DATACONTROL_DOMAIN=datacontrol.local
APP_ENV=production
CADDYFILE=./frontdata/deploy/Caddyfile.internal

docker compose -f docker-compose.yml -f frontdata/deploy/docker-compose.tls.yml \
  --profile tls up -d --build
```

Caddy crea una CA local. Para que los navegadores confien sin advertencia,
copiar el certificado raiz a los equipos de la planta:

```bash
docker exec datacontrol-caddy cat /data/caddy/pki/authorities/local/root.crt \
  > datacontrol-ca.crt
```

Instalarlo en el almacen de autoridades de Windows/Linux/macOS. Tambien se
puede usar un certificado de la empresa montando los archivos y cambiando
`tls internal` por `tls /certificados/fullchain.pem /certificados/privkey.pem`.

## Opcion B: dominio publico con Let's Encrypt

```bash
# En .env
DATACONTROL_DOMAIN=datacontrol.ejemplo.com
ACME_EMAIL=operaciones@ejemplo.com
APP_ENV=production
CADDYFILE=./frontdata/deploy/Caddyfile
```

El dominio debe resolver al servidor y los puertos 80/443 deben estar
abiertos. Caddy renueva el certificado automaticamente.

## Verificar

```bash
curl -I http://datacontrol.local          # 308 -> https
curl -kI https://datacontrol.local        # 200 + Strict-Transport-Security
curl -k -c cookies.txt -X POST https://datacontrol.local/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"nombre_usuario":"admin","password":"..."}'
grep -i secure cookies.txt
```

La cookie de sesion debe llevar `Secure`; eso lo activa `APP_ENV=production`
en la API. El frontend en `127.0.0.1:4200` queda solo para diagnostico local.
