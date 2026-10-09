const swaggerUi = require('swagger-ui-express');

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
    { name: 'Reservaciones', description: 'Reservas Anti-Overbooking con temporizador TTL (10 min) y algoritmo FEFO' },
    { name: 'Alertas y SSE', description: 'Monitoreo de caducidad (VENCIDO/ROJO/AMARILLO) y stream en vivo SSE' },
    { name: 'Promociones e IA', description: 'Sugerencias promocionales dinámicas generadas con Google Gemini AI' },
    { name: 'Categorías', description: 'Gestión de categorías de catálogo' },
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
        summary: 'Obtener el catálogo completo de productos',
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
                  codigoBarras: { type: 'string', example: '786999900011' },
                  nombre: { type: 'string', example: 'Queso Crema Toni 200g' },
                  descripcion: { type: 'string', example: 'Queso untable' },
                  precioVenta: { type: 'number', example: 1.95 },
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
            example: '7861000100011'
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
        responses: {
          '200': { description: 'Disponibilidad sanitizada, sin lotes vencidos ni agotados' }
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
        summary: 'Crear reserva de stock temporal Anti-Overbooking (FEFO + TTL 10 min)',
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
          '409': { description: 'Stock insuficiente (Overbooking)' },
          '503': { description: 'Heartbeat ausente o vencido; reservas bloqueadas' }
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
        description: 'Solo el cliente propietario o un ADMIN. La liberación usa una transacción con bloqueo de filas.',
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
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de alertas de vencimiento' }
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
      post: {
        tags: ['Heartbeat'],
        summary: 'Enviar latido de red física desde tienda a nube (ping)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Señal registrada' }
        }
      },
      get: {
        tags: ['Heartbeat'],
        summary: 'Consultar estado de conectividad con tienda y si las reservas están bloqueadas',
        responses: {
          '200': { description: 'Estado ONLINE u OFFLINE' }
        }
      }
    }
  }
};

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📖 Documentación Swagger UI disponible en: http://localhost:4000/api-docs');
}

module.exports = setupSwagger;
