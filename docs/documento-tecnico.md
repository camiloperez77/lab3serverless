# Documento técnico — CRUD Serverless de Mascotas

## 1. Descripción de la entidad y diseño de la tabla

La entidad elegida es **mascota**, un recurso de negocio con al menos 4
atributos además del identificador.

| Atributo        | Tipo              | Obligatorio | Descripción                          |
| --------------- | ----------------- | ----------- | ------------------------------------ |
| `id`            | String (PK, HASH) | Sí (auto)   | UUID v4 generado con `crypto.randomUUID()` |
| `nombre`        | String            | Sí          | Nombre de la mascota                 |
| `especie`       | String            | Sí          | perro, gato, ave, etc.               |
| `raza`          | String            | No          | Default `Sin especificar`            |
| `edadMeses`     | Number (entero)   | No          | Default `0`                          |
| `pesoKg`        | Number            | No          | Default `0`                          |
| `vacunada`      | Boolean           | No          | Default `false`                      |
| `creadoEn`      | String (ISO 8601) | Sí (auto)   | Fecha de creación                    |
| `actualizadoEn` | String (ISO 8601) | No (auto)   | Fecha de última actualización        |

**Diseño de la tabla DynamoDB**

- **Partition key (HASH):** `id`, de tipo String. Permite localizar cada
  mascota por su identificador único (modelo clave-valor).
- **Modo de capacidad:** `PAY_PER_REQUEST` (bajo demanda), sin capacidad
  reservada, ideal para el laboratorio.
- La tabla se nombra con el patrón `crud-mascotas-mascotas-${sls:stage}`, de
  modo que cada ambiente (`dev`, `prod`) tiene su propia tabla y no se mezclan
  los datos.

## 2. Diagrama de la arquitectura

```
                    +-----------------------------+
                    |  Cliente                    |
                    |  (Postman / Insomnia)       |
                    +--------------+--------------+
                                   |
                                   | HTTPS
                                   v
                    +-----------------------------+
                    |  API Gateway (HTTP API)     |
                    |  POST   /mascotas           |
                    |  GET    /mascotas           |
                    |  GET    /mascotas/{id}      |
                    |  PUT    /mascotas/{id}      |
                    |  DELETE /mascotas/{id}      |
                    +--------------+--------------+
                                   |
              +--------------------+--------------------+
              |          |         |         |          |
              v          v         v         v          v
          +-------+  +-------+ +-------+ +---------+ +--------+
          | crear |  |listar | |obtener| |actualizar| |eliminar|
          |Lambda |  |Lambda | |Lambda | | Lambda  | | Lambda |
          +---+---+  +---+---+ +---+---+ +----+----+ +---+----+
              |          |         |          |          |
              +----------+---------+----------+----------+
                                   |
                                   v
                    +-----------------------------+
                    |  Amazon DynamoDB            |
                    |  Tabla: MascotasTable       |
                    |  PK: id (String)            |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |  Amazon CloudWatch Logs     |
                    +-----------------------------+
```

## 3. Reflexión técnica

### ¿Por qué `Scan` puede ser costoso en tablas grandes y cuándo usar `Query`?

`Scan` recorre **toda** la tabla (y todos los índices si se pide) para luego
aplicar el filtro, por lo que el costo y la latencia crecen de forma lineal con
el tamaño de la tabla. `Query`, en cambio, accede directamente a los elementos
que comparten una misma partition key (y opcionalmente un rango de sort key),
leyendo solo lo necesario. Por eso `Query` es más eficiente y económico.

Se debe usar `Query` cuando se filtra por la partition key o por un **Global
Secondary Index (GSI)**. `Scan` queda reservado para tablas pequeñas, procesos
batch o cuando no existe un índice adecuado.

### ¿Qué ventajas tiene una función Lambda por operación frente a una sola Lambda con todas las rutas?

- **Separación de responsabilidades:** cada función hace una sola cosa.
- **Mínimo privilegio:** cada Lambda recibe solo los permisos IAM que necesita.
- **Escalado y configuración independientes:** memoria, timeout y concurrencia
  ajustables por operación.
- **Observabilidad aislada:** logs y métricas por función en CloudWatch.
- **Mantenibilidad y pruebas:** código y casos de prueba más simples.

Con una sola Lambda habría que enrutar manualmente según el método/ruta y
otorgarle permisos para todas las operaciones, aumentando la superficie de error.

### ¿Qué pasaría si las funciones tuvieran permiso `dynamodb:*` sobre `*`?

Se violaría el principio de mínimo privilegio: cualquier función (o un bug, o
una inyección exitosa) podría leer, modificar o borrar **cualquier** tabla de la
cuenta, incluyendo datos de otros ambientes o de otros servicios. El impacto de
un compromiso sería de alcance total sobre la base de datos. Por eso el rol se
limita a las acciones necesarias (`PutItem`, `GetItem`, `Scan`, `UpdateItem`,
`DeleteItem`) sobre el ARN de la tabla propia mediante
`Fn::GetAtt: [MascotasTable, Arn]`.
