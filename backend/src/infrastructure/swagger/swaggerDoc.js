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
    { name: 'Alertas y SSE', description: 'Monitoreo de caducidad por semáforo (ROJO/AMARILLO) y stream en vivo SSE' },
    { name: 'Promociones e IA', description: 'Sugerencias promocionales dinámicas generadas con Google Gemini AI' },
    { name: 'Categorías', description: 'Gestión de categorías de catálogo' },
    { name: 'Autenticación', description: 'Registro e inicio de sesión de usuarios y roles' },
    { name: 'Heartbeat', description: 'Señal de latido de red física de tienda anti-overbooking' }
  ],
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
    '/lots': {
      get: {
        tags: ['Lotes e Inventario'],
        summary: 'Listar todos los lotes de producción activos',
        responses: {
          '200': { description: 'Lista de lotes activos' }
        }
      },
      post: {
        tags: ['Lotes e Inventario'],
        summary: 'Registrar un nuevo lote recibido en bodega',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productoId', 'numeroLote', 'fechaCaducidad', 'cantidadIngresada'],
                properties: {
                  productoId: { type: 'string', example: 'c8a4d2e1-1111-2222-3333-444455556666' },
                  numeroLote: { type: 'string', example: 'LOT-QC-2026-99' },
                  fechaCaducidad: { type: 'string', format: 'date', example: '2026-09-25' },
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
          '200': { description: 'Merma registrada' }
        }
      }
    },
    '/reservations': {
      post: {
        tags: ['Reservaciones'],
        summary: 'Crear reserva de stock temporal Anti-Overbooking (FEFO + TTL 10 min)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['usuarioId', 'items'],
                properties: {
                  usuarioId: { type: 'string', example: 'u8a7b6c5-1111-2222-3333-444455556666' },
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
          '409': { description: 'Stock insuficiente (Overbooking)' }
        }
      }
    },
    '/reservations/code/{code}': {
      get: {
        tags: ['Reservaciones'],
        summary: 'Buscar reserva por código de retiro PIN KR-XXXXXX',
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Reserva confirmada y stock deducido' }
        }
      }
    },
    '/alerts': {
      get: {
        tags: ['Alertas y SSE'],
        summary: 'Obtener las alertas estáticas calculadas por semáforo (<7d ROJO, <15d AMARILLO)',
        responses: {
          '200': { description: 'Lista de alertas de vencimiento' }
        }
      }
    },
    '/alerts/stream': {
      get: {
        tags: ['Alertas y SSE'],
        summary: 'Conexión de stream Server-Sent Events (SSE) en tiempo real (text/event-stream)',
        responses: {
          '200': { description: 'Stream de eventos en tiempo real' }
        }
      }
    },
    '/promotions/generate': {
      post: {
        tags: ['Promociones e IA'],
        summary: 'Generar oferta comercial inteligente con Google Gemini AI',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['loteId'],
                properties: {
                  loteId: { type: 'string', example: 'l9k8j7h6-1111-2222-3333-444455556666' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Promoción generada con IA' }
        }
      }
    },
    '/promotions': {
      get: {
        tags: ['Promociones e IA'],
        summary: 'Obtener promociones comerciales activas',
        responses: {
          '200': { description: 'Lista de promociones activas' }
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
                  password: { type: 'string', example: '123456' },
                  rol: { type: 'string', enum: ['CLIENTE', 'BODEGUERO', 'PERCHERO', 'ADMIN'], example: 'CLIENTE' }
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
