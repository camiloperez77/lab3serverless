const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const TABLE = process.env.MASCOTAS_TABLE;
const db = DynamoDBDocumentClient.from(new DynamoDBClient());

const respuesta = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const leerBody = (event) => {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
};

const validar = (data) => {
  if (!data) return "El cuerpo debe ser un JSON válido";
  if (typeof data.nombre !== "string" || !data.nombre.trim())
    return '"nombre" es obligatorio y debe ser texto';
  if (typeof data.especie !== "string" || !data.especie.trim())
    return '"especie" es obligatoria y debe ser texto';
  if (data.raza !== undefined && typeof data.raza !== "string")
    return '"raza" debe ser texto';
  if (
    data.edadMeses !== undefined &&
    (!Number.isInteger(data.edadMeses) || data.edadMeses < 0)
  )
    return '"edadMeses" debe ser un entero >= 0';
  if (
    data.pesoKg !== undefined &&
    (typeof data.pesoKg !== "number" || data.pesoKg < 0)
  )
    return '"pesoKg" debe ser un número >= 0';
  if (data.vacunada !== undefined && typeof data.vacunada !== "boolean")
    return '"vacunada" debe ser booleano';
  return null;
};

// CREATE - POST /mascotas
module.exports.crear = async (event) => {
  const data = leerBody(event);
  const error = validar(data);
  if (error) return respuesta(400, { error });

  const item = {
    id: randomUUID(),
    nombre: data.nombre.trim(),
    especie: data.especie.trim(),
    raza: data.raza ?? "Sin especificar",
    edadMeses: data.edadMeses ?? 0,
    pesoKg: data.pesoKg ?? 0,
    vacunada: data.vacunada ?? false,
    creadoEn: new Date().toISOString(),
  };

  try {
    await db.send(new PutCommand({ TableName: TABLE, Item: item }));
    return respuesta(201, item);
  } catch (err) {
    console.error(err);
    return respuesta(500, { error: "No fue posible crear la mascota" });
  }
};

// READ (todos) - GET /mascotas
module.exports.listar = async () => {
  try {
    const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
    return respuesta(200, Items);
  } catch (err) {
    console.error(err);
    return respuesta(500, { error: "No fue posible listar las mascotas" });
  }
};

// READ (uno) - GET /mascotas/{id}
module.exports.obtener = async (event) => {
  const { id } = event.pathParameters;
  try {
    const { Item } = await db.send(
      new GetCommand({ TableName: TABLE, Key: { id } })
    );
    if (!Item) return respuesta(404, { error: "Mascota no encontrada" });
    return respuesta(200, Item);
  } catch (err) {
    console.error(err);
    return respuesta(500, { error: "No fue posible consultar la mascota" });
  }
};

// UPDATE - PUT /mascotas/{id}
module.exports.actualizar = async (event) => {
  const { id } = event.pathParameters;
  const data = leerBody(event);
  const error = validar(data);
  if (error) return respuesta(400, { error });

  try {
    const { Attributes } = await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id },
        UpdateExpression:
          "SET nombre = :nombre, especie = :especie, raza = :raza, " +
          "edadMeses = :edadMeses, pesoKg = :pesoKg, vacunada = :vacunada, " +
          "actualizadoEn = :actualizadoEn",
        ExpressionAttributeValues: {
          ":nombre": data.nombre.trim(),
          ":especie": data.especie.trim(),
          ":raza": data.raza ?? "Sin especificar",
          ":edadMeses": data.edadMeses ?? 0,
          ":pesoKg": data.pesoKg ?? 0,
          ":vacunada": data.vacunada ?? false,
          ":actualizadoEn": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      })
    );
    return respuesta(200, Attributes);
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException")
      return respuesta(404, { error: "Mascota no encontrada" });
    console.error(err);
    return respuesta(500, { error: "No fue posible actualizar la mascota" });
  }
};

// DELETE - DELETE /mascotas/{id}
module.exports.eliminar = async (event) => {
  const { id } = event.pathParameters;
  try {
    await db.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    return respuesta(200, { mensaje: `Mascota ${id} eliminada`, id });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException")
      return respuesta(404, { error: "Mascota no encontrada" });
    console.error(err);
    return respuesta(500, { error: "No fue posible eliminar la mascota" });
  }
};
