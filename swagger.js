const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory System API',
      version: '1.0.0',
      description: 'API documentation for the Inventory Management System',
      contact: {
        name: 'API Support',
        email: 'support@inventorysystem.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie for authentication',
        },
      },
      schemas: {
        Vendor: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated ID of the vendor',
            },
            fullName: {
              type: 'string',
              required: true,
              description: 'Vendor full name',
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive'],
              default: 'Active',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            phoneMobile: {
              type: 'string',
              required: true,
            },
            phone2: {
              type: 'string',
            },
            address: {
              type: 'string',
              required: true,
            },
            address2: {
              type: 'string',
            },
            city: {
              type: 'string',
            },
            district: {
              type: 'string',
            },
            createdBy: {
              type: 'string',
              description: 'User ID who created the vendor',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: [
    path.join(__dirname, './routes/*.js'), // All route files in routes directory
    path.join(__dirname, './models/*.js'), // If you want to include model schemas
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;