import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import { Express } from 'express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Optics Backend API',
      version: '1.0.0',
      description: 'Backend API for optics simulator with scope data scraping',
      contact: {
        name: 'Optics Backend Team',
        email: 'support@optics.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://optics-backend.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Scope: {
          type: 'object',
          properties: {
            minZoom: {
              type: 'number',
              description: 'Minimum magnification power',
              example: 3
            },
            maxZoom: {
              type: 'number',
              description: 'Maximum magnification power',
              example: 9
            },
            currentZoom: {
              type: 'number',
              description: 'Current magnification setting',
              example: 3
            },
            model: {
              type: 'string',
              description: 'Scope model name',
              example: 'VX-Freedom 3-9x40 Duplex'
            },
            description: {
              type: 'string',
              description: 'Scope description',
              example: 'Reliable hunting riflescope with classic duplex reticle'
            },
            manufacturer: {
              type: 'string',
              description: 'Scope manufacturer',
              example: 'Leupold'
            },
            price: {
              type: 'string',
              description: 'Scope price',
              example: '$299.99'
            },
            url: {
              type: 'string',
              description: 'Product URL',
              example: 'https://www.leupold.com/vx-freedom-3-9x40-duplex-riflescope'
            },
            series: {
              type: 'string',
              description: 'Product series',
              example: 'VX-Freedom'
            },
            objectiveLens: {
              type: 'number',
              description: 'Objective lens diameter in mm',
              example: 40
            },
            reticle: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Reticle type',
                  example: 'Duplex'
                },
                description: {
                  type: 'string',
                  description: 'Reticle description',
                  example: 'Classic crosshair design with thicker outer posts'
                },
                svgPath: {
                  type: 'string',
                  description: 'SVG path for reticle visualization',
                  example: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100'
                }
              }
            }
          }
        },
        ScopeCollection: {
          type: 'object',
          additionalProperties: {
            $ref: '#/components/schemas/Scope'
          },
          description: 'Collection of scopes indexed by unique keys'
        },
        RefreshResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Scope data updated successfully'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Failed to update scope data'
            }
          }
        },
        Binocular: {
          type: 'object',
          properties: {
            magnification: {
              type: 'number',
              description: 'Magnification power',
              example: 8
            },
            objectiveLens: {
              type: 'number',
              description: 'Objective lens diameter in mm',
              example: 42
            },
            fieldOfView: {
              type: 'number',
              description: 'Field of view in degrees at 1000 yards',
              example: 8.0
            },
            exitPupil: {
              type: 'number',
              description: 'Exit pupil diameter in mm',
              example: 5.25
            },
            eyeRelief: {
              type: 'number',
              description: 'Eye relief in mm',
              example: 17
            },
            closeFocus: {
              type: 'number',
              description: 'Minimum focus distance in feet',
              example: 5
            },
            weight: {
              type: 'number',
              description: 'Weight in ounces',
              example: 21.8
            },
            prismType: {
              type: 'string',
              enum: ['Roof', 'Porro'],
              description: 'Type of prism system',
              example: 'Roof'
            },
            model: {
              type: 'string',
              description: 'Binocular model name',
              example: 'Diamondback HD 8x42'
            },
            manufacturer: {
              type: 'string',
              description: 'Manufacturer name',
              example: 'Vortex'
            },
            series: {
              type: 'string',
              description: 'Product series',
              example: 'Diamondback HD'
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'Premium HD optical system delivers exceptional resolution'
            },
            price: {
              type: 'string',
              description: 'Price',
              example: '$229.99'
            },
            url: {
              type: 'string',
              description: 'Product URL',
              example: 'https://vortexoptics.com/vortex-diamondback-hd-8x42-binoculars.html'
            },
            features: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Key features list',
              example: ['HD Glass', 'Fully Multi-Coated', 'Dielectric Coating']
            },
            useCase: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Recommended use cases',
              example: ['Birdwatching', 'Wildlife Viewing', 'Hunting']
            },
            waterproof: {
              type: 'boolean',
              description: 'Waterproof construction',
              example: true
            },
            fogproof: {
              type: 'boolean',
              description: 'Fogproof construction',
              example: true
            },
            coatings: {
              type: 'string',
              description: 'Lens coating type',
              example: 'Fully Multi-Coated'
            }
          }
        },
        BinocularCollection: {
          type: 'object',
          additionalProperties: {
            $ref: '#/components/schemas/Binocular'
          },
          description: 'Collection of binoculars indexed by unique keys'
        }
      }
    }
  },
  apis: ['./src/server.ts'] // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Optics Backend API Documentation'
  }));
  
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export { swaggerSpec };