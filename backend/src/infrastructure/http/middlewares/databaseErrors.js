// Traduce los errores de PostgreSQL que provoca el dato de un cliente (y no un fallo del servidor)
// a respuestas 4xx. Nunca se devuelve el texto original del error: puede incluir nombres de tablas,
// columnas o valores. Los códigos son SQLSTATE.

// Mensajes por restricción única conocida; el resto usa el mensaje genérico.
const UNIQUE_MESSAGES = {
  usuarios_email_key: 'El correo electrónico ya está registrado.',
  productos_codigo_barras_key: 'Ya existe un producto con ese código de barras.',
  categorias_nombre_key: 'Ya existe una categoría con ese nombre.'
};

const DATABASE_ERRORS = {
  '23505': { status: 409, error: 'Conflict', message: 'El registro ya existe.' },
  '23503': { status: 409, error: 'Conflict', message: 'La operación hace referencia a un registro que no existe o que está en uso.' },
  '23502': { status: 400, error: 'InvalidValue', message: 'Falta un dato obligatorio.' },
  '23514': { status: 400, error: 'InvalidValue', message: 'Uno de los valores enviados no cumple las reglas del negocio.' },
  '22P02': { status: 400, error: 'InvalidValue', message: 'Uno de los identificadores o valores enviados no tiene un formato válido.' },
  '22001': { status: 400, error: 'InvalidValue', message: 'Uno de los valores enviados supera la longitud permitida.' },
  '22003': { status: 400, error: 'InvalidValue', message: 'Un valor numérico está fuera del rango permitido.' },
  '22007': { status: 400, error: 'InvalidValue', message: 'Una fecha enviada no es válida.' },
  '22008': { status: 400, error: 'InvalidValue', message: 'Una fecha enviada no es válida.' }
};

/** true si el error es de PostgreSQL y lo causó el dato recibido (clases 22 y 23 de SQLSTATE). */
function isDatabaseDataError(err) {
  return typeof err?.code === 'string' && /^(22|23)[0-9A-Z]{3}$/.test(err.code);
}

/** Respuesta 4xx para un error de datos de PostgreSQL, o null si no lo es. */
function mapDatabaseError(err) {
  if (!isDatabaseDataError(err)) return null;
  const mapped = DATABASE_ERRORS[err.code];
  if (!mapped) {
    return { status: 400, error: 'InvalidValue', message: 'Uno de los valores enviados no es válido.' };
  }
  if (err.code === '23505' && UNIQUE_MESSAGES[err.constraint]) {
    return { ...mapped, message: UNIQUE_MESSAGES[err.constraint] };
  }
  return mapped;
}

module.exports = { mapDatabaseError, isDatabaseDataError };
