const swaggerUi = require('swagger-ui-express');
const crypto = require('node:crypto');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Ecosistema Karen - API Documentation',
    version: '1.0.0',
    description: 'Documentación oficial e interactiva de la API REST & SSE para el **Supermercado Karen** (Fase 1: Inventario Maestro, FEFO, Anti-Overbooking, Alertas en Tiempo Real, Promociones con Gemini AI).\n\nBase URL: `/api/v1`',
    contact: {
      name: 'Equipo de Desarrollo Software - UTA',
      email: 'carrera.sistemas@uta.edu.ec'
    }
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Servidor Local de Desarrollo'
    }
  ],
  tags: [
    { name: 'Productos', description: 'Catálogo de productos y lectura de código de barras' },
    { name: 'Lotes e Inventario', description: 'Control de lotes, fechas de caducidad, ubicaciones y merma' },
    { name: 'Reservaciones', description: 'Reservas Anti-Overbooking con temporizador TTL (30 min) y algoritmo FEFO' },
    { name: 'Alertas y SSE', description: 'Monitoreo de caducidad (VENCIDO/ROJO/AMARILLO) y stream en vivo SSE' },
    { name: 'Promociones e IA', description: 'Sugerencias promocionales dinámicas generadas con Google Gemini AI' },
    { name: 'Categorías', description: 'Gestión de categorías de catálogo' },
    { name: 'Catálogo', description: 'Estado de la copia del catálogo que mantiene el portal' },
    { name: 'Autenticación', description: 'Registro e inicio de sesión de usuarios y roles' },
    { name: 'Heartbeat', description: 'Señal de latido de red física de tienda anti-overbooking' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT obtenido mediante POST /auth/login'
      }
    }
  },
  paths: {
    '/categories': {
      get: {
        tags: ['Categorías'],
        summary: 'Obtener todas las categorías',
        responses: {
          '200': {
            description: 'Lista de categorías obtenida con éxito'
          }
        }
      },
      post: {
        tags: ['Categorías'],
        summary: 'Crear una nueva categoría',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string', example: 'Lácteos y Derivados' },
                  descripcion: { type: 'string', example: 'Productos lácteos frescos' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Categoría creada' }
        }
      }
    },
    '/products': {
      get: {
        tags: ['Productos'],
        summary: 'Consultar el catálogo paginado de productos',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Nombre o código de barras' },
          { name: 'categoriaId', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 30, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 } }
        ],
        responses: {
          '200': { description: 'Lista de productos' }
        }
      },
      post: {
        tags: ['Productos'],
        summary: 'Crear un nuevo producto en catálogo',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoriaId', 'codigoBarras', 'nombre', 'precioVenta'],
                properties: {
                  categoriaId: { type: 'string', example: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
                  codigoBarras: { type: 'string', example: '786999900018' },
                  nombre: { type: 'string', example: 'Queso Crema Toni 200g' },
                  descripcion: { type: 'string', example: 'Queso untable' },
                  precioVenta: { type: 'number', example: 1.95 },
                  impuestoPorcentaje: { type: 'number', minimum: 0, maximum: 100, example: 15 },
                  minStockAlerta: { type: 'integer', example: 10 }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Producto creado' }
        }
      }
    },
    '/products/barcode/{barcode}': {
      get: {
        tags: ['Productos'],
        summary: 'Buscar producto por código de barras',
        parameters: [
          {
            name: 'barcode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: '7861000100014'
          }
        ],
        responses: {
          '200': { description: 'Producto encontrado' },
          '404': { description: 'Producto no encontrado' }
        }
      }
    },
    '/availability': {
      get: {
        tags: ['Lotes e Inventario'],
        summary: 'Consultar disponibilidad pública de lotes vigentes',
        description: 'Respuesta cacheable 5 s (`Cache-Control: public, max-age=5`, con ETag). Con `productoId` devuelve solo los lotes de ese producto; un parámetro desconocido se ignora.',
        parameters: [
          { name: 'productoId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Filtra por producto. Vacío equivale a no filtrar.' }
        ],
        responses: {
          '200': { description: 'Disponibilidad sanitizada, sin lotes vencidos ni agotados' },
          '304': { description: 'Sin cambios respecto al ETag enviado en If-None-Match' },
          '400': { description: 'productoId no es un UUID válido' }
        }
      }
    },
    '/lots': {
      get: {
        tags: ['Lotes e Inventario'],
        summary: 'Listar todos los lotes de producción activos',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de lotes activos' }
        }
      },
      post: {
        tags: ['Lotes e Inventario'],
        summary: 'Registrar un nuevo lote recibido en bodega',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productoId', 'numeroLote', 'fechaElaboracion', 'fechaCaducidad', 'costoUnitario', 'cantidadIngresada'],
                properties: {
                  productoId: { type: 'string', example: 'c8a4d2e1-1111-2222-3333-444455556666' },
                  numeroLote: { type: 'string', example: 'LOT-QC-2026-99' },
                  fechaElaboracion: { type: 'string', format: 'date', example: '2026-09-01' },
                  fechaCaducidad: { type: 'string', format: 'date', example: '2026-09-25' },
                  costoUnitario: { type: 'number', example: 1.25, description: 'Costo real de adquisición por unidad' },
                  cantidadIngresada: { type: 'integer', example: 50 },
                  ubicacion: { type: 'string', enum: ['BODEGA', 'PERCHA'], example: 'BODEGA' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Lote registrado con éxito' }
        }
      }
    },
    '/lots/{id}/location': {
      patch: {
        tags: ['Lotes e Inventario'],
        summary: 'Actualizar la ubicación física del lote (BODEGA -> PERCHA)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ubicacion'],
                properties: {
                  ubicacion: { type: 'string', enum: ['BODEGA', 'PERCHA'], example: 'PERCHA' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Ubicación actualizada' }
        }
      }
    },
    '/lots/{id}/merma': {
      post: {
        tags: ['Lotes e Inventario'],
        summary: 'Registrar baja de unidades por merma/caducidad',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cantidad', 'razon'],
                properties: {
                  cantidad: { type: 'integer', example: 5 },
                  razon: { type: 'string', example: 'Producto caducado en percha' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Merma, movimiento y saldo actualizado registrados atómicamente' }
        }
      }
    },
    '/inventory/movements': {
      get: {
        tags: ['Lotes e Inventario'],
        summary: 'Consultar el libro auditable de movimientos de inventario',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'loteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['INGRESO', 'TRASLADO', 'MERMA', 'RESERVA', 'LIBERACION', 'VENTA', 'VENCIMIENTO', 'AJUSTE'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 } }
        ],
        responses: { '200': { description: 'Movimientos con actor y saldos anterior/posterior' } }
      }
    },
    '/inventory/wastes': {
      get: {
        tags: ['Lotes e Inventario'],
        summary: 'Consultar mermas auditables y su impacto económico',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'loteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 } }
        ],
        responses: { '200': { description: 'Mermas con razón, responsable y costo total' } }
      }
    },
    '/reservations': {
      post: {
        tags: ['Reservaciones'],
        summary: 'Crear reserva de stock temporal Anti-Overbooking (FEFO + TTL 30 min)',
        description: 'La identidad del cliente se obtiene del JWT. Requiere un heartbeat vigente de la tienda; si no existe responde 503 sin modificar stock. La reserva usa una transacción con bloqueo de filas.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['productoId', 'cantidad'],
                      properties: {
                        productoId: { type: 'string', example: 'c8a4d2e1-1111-2222-3333-444455556666' },
                        cantidad: { type: 'integer', example: 2 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Reserva generada exitosamente con código PIN KR-XXXXXX' },
          '202': { description: 'Solo con portal y tienda separados: la tienda aún confirma la reserva (estado PENDIENTE_SYNC, sin código). Consultar GET /reservations/user/{userId}.' },
          '400': { description: 'Datos inválidos, oferta no disponible o reserva vencida antes de que la tienda la atendiera' },
          '404': { description: 'Producto inexistente' },
          '409': { description: 'Stock insuficiente (Overbooking)' },
          '503': { description: 'Heartbeat ausente o vencido; reservas bloqueadas, o la tienda no pudo procesar la reserva' }
        }
      }
    },
    '/reservations/user/{userId}': {
      get: {
        tags: ['Reservaciones'],
        summary: 'Reservas de un cliente',
        description: 'Solo el propietario o el personal. Con portal y tienda separados puede incluir los estados PENDIENTE_SYNC (la tienda aún confirma) y RECHAZADA (con motivoRechazo y mensajeRechazo).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } }
        ],
        responses: {
          '200': { description: 'Reservas del cliente, de la más reciente a la más antigua' },
          '403': { description: 'El usuario no es el propietario' }
        }
      }
    },
    '/catalog/status': {
      get: {
        tags: ['Catálogo'],
        summary: 'Estado de la copia del catálogo que mantiene el portal',
        description: 'Indica si el catálogo y la disponibilidad pueden estar desactualizados porque la tienda no ha sincronizado recientemente. En el monolito de transición siempre responde stale=false.',
        responses: {
          '200': { description: 'mode (mirror o direct), stale, lastSyncAt y estado de cada sección' }
        }
      }
    },
    '/reservations/code/{code}': {
      get: {
        tags: ['Reservaciones'],
        summary: 'Buscar reserva por código de retiro PIN KR-XXXXXX',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'KR-X7Y9Z2' }
        ],
        responses: {
          '200': { description: 'Detalle de la reserva' }
        }
      }
    },
    '/reservations/{id}/confirm': {
      post: {
        tags: ['Reservaciones'],
        summary: 'Confirmar retiro y cobro de la reserva en caja SIACI',
        description: 'Operación atómica con bloqueo de la reserva y sus lotes. Roles BODEGUERO o ADMIN.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Reserva confirmada y stock deducido' }
        }
      }
    },
    '/reservations/{id}/cancel': {
      post: {
        tags: ['Reservaciones'],
        summary: 'Cancelar una reserva pendiente y liberar su stock',
        description: 'En portal-api, el cliente propietario o un ADMIN; en store-api, solo un ADMIN (la tienda libera el stock y avisa al portal). La liberación usa una transacción con bloqueo de filas.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Reserva cancelada y stock liberado' },
          '403': { description: 'El usuario no es propietario ni administrador' }
        }
      }
    },
    '/alerts': {
      get: {
        tags: ['Alertas y SSE'],
        summary: 'Obtener alertas: VENCIDO ≤0d, ROJO 1–6d y AMARILLO 7–14d',
        parameters: [
          { name: 'atendida', in: 'query', schema: { type: 'boolean' }, description: 'Filtrar por estado atendida (true/false)' },
          { name: 'nivel', in: 'query', schema: { type: 'string', enum: ['AMARILLO', 'ROJO', 'VENCIDO'] }, description: 'Filtrar por nivel de alerta' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de alertas de vencimiento' }
        }
      }
    },
    '/alerts/{id}/atender': {
      patch: {
        tags: ['Alertas y SSE'],
        summary: 'Marcar alerta de caducidad como atendida',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'UUID o ID de la alerta' }
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Alerta marcada como atendida exitosamente' },
          '404': { description: 'Alerta no encontrada' }
        }
      }
    },
    '/alerts/stream': {
      get: {
        tags: ['Alertas y SSE'],
        summary: 'Conexión de stream Server-Sent Events (SSE) en tiempo real (text/event-stream)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Stream de eventos en tiempo real' }
        }
      }
    },
    '/promotions/generate': {
      post: {
        tags: ['Promociones e IA'],
        summary: 'Generar borrador de oferta comercial inteligente con Google Gemini AI',
        description: 'Genera una promoción para lotes próximos a caducar (ROJO o AMARILLO). Queda en estado PENDIENTE_APROBACION e inactiva hasta que un ADMIN la apruebe. Utiliza timeout de 10s, salida estructurada y caché anti-stampede.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['loteId'],
                properties: {
                  loteId: { type: 'string', example: 'b9a8f7e6-1111-2222-3333-444455556666' }
                }
              }
            }
          }
        },
        responses: {
          '202': { description: 'Borrador generado en estado PENDIENTE_APROBACION' },
          '400': { description: 'Lote inválido, vencido o sin unidades disponibles' },
          '429': { description: 'Límite de solicitudes de IA excedido (GeminiRateLimit)' },
          '502': { description: 'Respuesta inválida o error externo de IA (GeminiInvalidResponse)' },
          '503': { description: 'API de Gemini no configurada (GeminiNotConfigured)' },
          '504': { description: 'Timeout en la llamada a Gemini excedido (GeminiTimeout)' }
        }
      }
    },
    '/promotions': {
      get: {
        tags: ['Promociones e IA'],
        summary: 'Obtener promociones comerciales aprobadas y activas (Público)',
        description: 'Retorna exclusivamente las promociones que han sido aprobadas por un Administrador y se encuentran activas en el catálogo.',
        responses: {
          '200': { description: 'Lista de promociones aprobadas' }
        }
      }
    },
    '/promotions/pending': {
      get: {
        tags: ['Promociones e IA'],
        summary: 'Listar borradores de promociones pendientes de aprobación (Solo ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de promociones pendientes de aprobación' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Requiere rol ADMIN' }
        }
      }
    },
    '/promotions/{id}/approve': {
      post: {
        tags: ['Promociones e IA'],
        summary: 'Aprobar y publicar una promoción generada por IA (Solo ADMIN)',
        description: 'Transición atómica de PENDIENTE_APROBACION a APROBADA y activa=true. Registra el usuario administrador y la fecha de aprobación.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Promoción aprobada y publicada' },
          '400': { description: 'La promoción ya fue aprobada/rechazada o ID inválido' },
          '403': { description: 'Requiere rol ADMIN' },
          '404': { description: 'Promoción no encontrada' }
        }
      }
    },
    '/promotions/{id}/reject': {
      post: {
        tags: ['Promociones e IA'],
        summary: 'Rechazar un borrador de promoción generada por IA (Solo ADMIN)',
        description: 'Transición atómica de PENDIENTE_APROBACION a RECHAZADA y activa=false. Requiere motivo de rechazo y registra auditoría.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['motivoRechazo'],
                properties: {
                  motivoRechazo: { type: 'string', example: 'Descuento excesivo para rotación de fin de semana' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Promoción rechazada' },
          '400': { description: 'Falta motivo de rechazo o promoción no está en PENDIENTE_APROBACION' },
          '403': { description: 'Requiere rol ADMIN' },
          '404': { description: 'Promoción no encontrada' }
        }
      }
    },
    '/metrics/ai': {
      get: {
        tags: ['Promociones e IA'],
        summary: 'Obtener métricas y observabilidad de la IA Gemini (Solo ADMIN)',
        description: 'Devuelve contadores de peticiones, aciertos/fallos de caché, errores clasificados, latencias de Gemini y del caso de uso.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Métricas de Gemini y del flujo de promociones' },
          '403': { description: 'Requiere rol ADMIN' }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar un nuevo usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'email', 'password'],
                properties: {
                  nombre: { type: 'string', example: 'Juan Pérez' },
                  email: { type: 'string', example: 'juan@karen.com' },
                  password: { type: 'string', minLength: 8, example: 'Karen2026' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Usuario registrado exitosamente' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión y obtener token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'cliente@karen.com' },
                  password: { type: 'string', example: 'demo123' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Token de acceso JWT' }
        }
      }
    },
    '/heartbeat': {
      get: {
        tags: ['Heartbeat'],
        summary: 'Consultar estado de conectividad con tienda y si las reservas están bloqueadas. El latido lo envía store-api por el canal interno.',
        responses: {
          '200': { description: 'Estado ONLINE u OFFLINE' }
        }
      }
    }
  }
};

function safeEqual(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(actual).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

function swaggerBasicAuth(username, password) {
  return (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const [scheme, encoded] = authorization.split(' ');
    let suppliedUser = '';
    let suppliedPassword = '';
    if (scheme === 'Basic' && encoded) {
      try {
        [suppliedUser, suppliedPassword] = Buffer.from(encoded, 'base64').toString('utf8').split(':', 2);
      } catch { /* credencial inválida */ }
    }
    if (safeEqual(suppliedUser || '', username) && safeEqual(suppliedPassword || '', password)) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="Ecosistema Karen API"');
    return res.status(401).json({ success: false, message: 'Autenticación requerida para consultar la documentación.', requestId: req.id });
  };
}

// Qué servicio expone cada operación (ADR-003). Lo que no figura aquí lo sirven ambos: lectura del
// catálogo, autenticación y estado del heartbeat. El monolito de transición muestra todo.
const OPERATION_OWNERS = [
  ['/categories', ['post'], 'store'],
  ['/products', ['post'], 'store'],
  ['/lots', null, 'store'],
  ['/lots/{id}/location', null, 'store'],
  ['/lots/{id}/merma', null, 'store'],
  ['/inventory/movements', null, 'store'],
  ['/inventory/wastes', null, 'store'],
  ['/reservations/{id}/confirm', null, 'store'],
  ['/alerts', null, 'store'],
  ['/alerts/{id}/atender', null, 'store'],
  ['/alerts/stream', null, 'store'],
  ['/promotions/generate', null, 'store'],
  ['/promotions/pending', null, 'store'],
  ['/promotions/{id}/approve', null, 'store'],
  ['/promotions/{id}/reject', null, 'store'],
  ['/metrics/ai', null, 'store'],
  ['/auth/register', ['post'], 'portal'],
  ['/reservations', ['post'], 'portal'],
  ['/reservations/user/{userId}', null, 'portal'],
  ['/catalog/status', null, 'portal']
];

const SERVICE_INFO = {
  store: {
    title: 'Ecosistema Karen - store-api',
    description: 'API del servicio local de la tienda (**store-api**): inventario y lotes, caja SIACI, alertas de caducidad, promociones con Gemini AI y administración. Atiende al personal de la tienda; las reservas de los clientes llegan desde portal-api por un canal interno que no forma parte de esta API.\n\nBase URL: `/api/v1`',
    port: 4000
  },
  portal: {
    title: 'Ecosistema Karen - portal-api',
    description: 'API del servicio en la nube (**portal-api**) para los clientes: catálogo y disponibilidad (copia que publica la tienda), promociones vigentes, cuentas y reservas, que el portal encarga a la tienda. El canal interno `/internal/v1` con store-api no forma parte de esta API pública.\n\nBase URL: `/api/v1`',
    port: 4001
  }
};

/**
 * Documento OpenAPI de un servicio: solo las operaciones que expone. Con ambos servicios
 * activos (monolito) devuelve el documento completo.
 */
function documentFor({ store = true, portal = true } = {}) {
  const active = new Set([...(store ? ['store'] : []), ...(portal ? ['portal'] : [])]);
  const paths = {};
  for (const [path, operations] of Object.entries(swaggerDocument.paths)) {
    const kept = {};
    for (const [method, operation] of Object.entries(operations)) {
      const rule = OPERATION_OWNERS.find(([rulePath, methods]) =>
        rulePath === path && (methods === null || methods.includes(method)));
      if (!rule || active.has(rule[2])) kept[method] = operation;
    }
    if (Object.keys(kept).length > 0) paths[path] = kept;
  }

  const usedTags = new Set(Object.values(paths).flatMap(operations =>
    Object.values(operations).flatMap(operation => operation.tags || [])));
  const single = active.size === 1 ? SERVICE_INFO[[...active][0]] : null;
  return {
    ...swaggerDocument,
    info: single ? { ...swaggerDocument.info, title: single.title, description: single.description } : swaggerDocument.info,
    tags: swaggerDocument.tags.filter(tag => usedTags.has(tag.name)),
    paths
  };
}

function setupSwagger(app, env = process.env, services = { store: true, portal: true }) {
  const production = env.NODE_ENV === 'production';
  const enabled = production ? env.SWAGGER_ENABLED === 'true' : env.SWAGGER_ENABLED !== 'false';
  if (!enabled) return false;

  const document = documentFor(services);
  const portInfo = services.portal && !services.store ? SERVICE_INFO.portal : SERVICE_INFO.store;
  document.servers = [{
    url: env.SWAGGER_API_URL || `http://localhost:${portInfo.port}/api/v1`,
    description: production ? 'API desplegada' : 'Servidor local de desarrollo'
  }];

  const middleware = [];
  if (production) {
    if (!env.SWAGGER_USERNAME || !env.SWAGGER_PASSWORD) {
      throw new Error('SWAGGER_USERNAME y SWAGGER_PASSWORD son obligatorios al habilitar Swagger en producción.');
    }
    middleware.push(swaggerBasicAuth(env.SWAGGER_USERNAME, env.SWAGGER_PASSWORD));
  }
  app.use('/api-docs', ...middleware, swaggerUi.serve, swaggerUi.setup(document));
  return true;
}

module.exports = setupSwagger;
module.exports.swaggerBasicAuth = swaggerBasicAuth;
module.exports.documentFor = documentFor;
