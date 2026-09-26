# Laboratorio 3 — CRUD Serverless (Mascotas)

API REST completamente **serverless** para administrar una entidad de negocio
(**mascotas**), construida con **AWS Lambda**, **API Gateway (HTTP API)**,
**Amazon DynamoDB** y **Serverless Framework v4** como infraestructura como
código.

## Arquitectura

```
Cliente (Postman / Insomnia)
        |
        v
API Gateway (HTTP API)
        |
        v
AWS Lambda (5 funciones)
        |
        v
Amazon DynamoDB (1 tabla)
        |
        v
CloudWatch Logs
```

Todo se crea con un solo `serverless deploy`, que por debajo genera una pila de
AWS CloudFormation.

## Entidad y modelo de datos

Entidad: **mascota**.

| Atributo      | Tipo              | Obligatorio | Descripción                          |
| ------------- | ----------------- | ----------- | ------------------------------------ |
| `id`          | String (PK, HASH) | Sí (auto)   | UUID v4 generado por la Lambda       |
| `nombre`      | String            | Sí          | Nombre de la mascota                 |
| `especie`     | String            | Sí          | perro, gato, ave, etc.               |
| `raza`        | String            | No          | Default `Sin especificar`            |
| `edadMeses`   | Number (entero)   | No          | Default `0`                          |
| `pesoKg`      | Number            | No          | Default `0`                          |
| `vacunada`    | Boolean           | No          | Default `false`                      |
| `creadoEn`    | String ISO        | Sí (auto)   | Fecha de creación                    |
| `actualizadoEn` | String ISO      | No (auto)   | Fecha de actualización               |

Partition key: `id` (String). Tabla en modo `PAY_PER_REQUEST` (bajo demanda).

## Endpoints

| Método | Ruta             | Función      | Respuesta esperada                          |
| ------ | ---------------- | ------------ | ------------------------------------------- |
| POST   | `/mascotas`      | `crear`      | `201` con el registro · `400` datos inválidos |
| GET    | `/mascotas`      | `listar`     | `200` con la lista                          |
| GET    | `/mascotas/{id}` | `obtener`    | `200` con el registro · `404` si no existe  |
| PUT    | `/mascotas/{id}` | `actualizar` | `200` registro actualizado · `400` · `404`  |
| DELETE | `/mascotas/{id}` | `eliminar`   | `200` mensaje de confirmación · `404`       |

## Requisitos

- Node.js 20 o superior
- Serverless Framework v4 (`npm install -g serverless`)
- Cuenta en [app.serverless.com](https://app.serverless.com) y cuenta activa de AWS
- Credenciales AWS configuradas (`aws configure`) con permisos sobre Lambda,
  API Gateway, DynamoDB, IAM, CloudFormation, S3 y CloudWatch Logs
- Postman o Insomnia para las pruebas

## Instalación

```bash
npm install
```

## Despliegue

1. Edita `org` en `serverless.yml` por tu organización de `app.serverless.com`.
2. Despliega:

```bash
serverless deploy
```

Copia la URL base que imprime la terminal, por ejemplo:

```
https://abcd1234.execute-api.us-east-1.amazonaws.com
```

## Pruebas locales (`serverless-offline`)

El código local necesita una tabla real de DynamoDB, por lo que **primero se
despliega** (paso anterior) y luego se ejecuta el modo offline:

```bash
serverless offline
# Base local: http://localhost:3000
```

## Pruebas con curl

### Crear (201)

```bash
curl -i -X POST https://TU-URL/mascotas \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Firulais","especie":"perro","raza":"Labrador","edadMeses":24,"pesoKg":28.5,"vacunada":true}'
```

### Listar (200)

```bash
curl -i https://TU-URL/mascotas
```

### Obtener (200 / 404)

```bash
curl -i https://TU-URL/mascotas/{id}
curl -i https://TU-URL/mascotas/no-existe   # 404
```

### Actualizar (200 / 400 / 404)

```bash
curl -i -X PUT https://TU-URL/mascotas/{id} \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Firulais","especie":"perro","raza":"Labrador","edadMeses":25,"pesoKg":29,"vacunada":true}'
```

### Eliminar (200 / 404)

```bash
curl -i -X DELETE https://TU-URL/mascotas/{id}
```

## Casos de prueba obligatorios

| Caso                    | Request                                       | Esperado |
| ----------------------- | --------------------------------------------- | -------- |
| Crear válido            | `POST /mascotas` body completo                 | 201      |
| Crear inválido          | `POST /mascotas` `{"nombre":""}`               | 400      |
| Listar                  | `GET /mascotas`                                | 200      |
| Obtener existente       | `GET /mascotas/{id}`                           | 200      |
| Obtener inexistente     | `GET /mascotas/no-existe`                      | 404      |
| Actualizar existente    | `PUT /mascotas/{id}` válido                    | 200      |
| Actualizar inexistente  | `PUT /mascotas/no-existe`                      | 404      |
| Eliminar existente      | `DELETE /mascotas/{id}`                        | 200      |
| Eliminar inexistente    | `DELETE /mascotas/no-existe`                   | 404      |

También puedes usar la colección exportada en
[`postman/crud-mascotas.postman_collection.json`](postman/crud-mascotas.postman_collection.json).

## Verificación en la consola AWS

- **Lambda**: 5 funciones `crud-mascotas-dev-crear/listar/obtener/actualizar/eliminar`
  y su variable de entorno `MASCOTAS_TABLE`.
- **API Gateway**: HTTP API con las 5 rutas.
- **DynamoDB**: tabla `crud-mascotas-mascotas-dev` con `id` como partition key.
- **CloudFormation**: pila `crud-mascotas-dev`.
- **CloudWatch Logs**: grupo `/aws/lambda/crud-mascotas-dev-*`.

## Limpieza de recursos

```bash
serverless remove
```

## Documentación

El diseño de la entidad, el diagrama de arquitectura y la reflexión técnica
están en [`docs/documento-tecnico.md`](docs/documento-tecnico.md).

## Estructura del proyecto

```
.
├── handler.js                 # Lógica CRUD de las 5 funciones Lambda
├── serverless.yml             # Infraestructura como código
├── package.json
├── docs/
│   └── documento-tecnico.md   # Documento breve + reflexión
├── postman/
│   └── crud-mascotas.postman_collection.json
└── README.md
```
