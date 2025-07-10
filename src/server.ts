import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { scrapeLeupoldScopes } from './scripts/scrape-leupold';
import { scrapeAmazonScopes } from './scripts/scrape-amazon';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { setupSwagger } from './swagger';

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS for production and development
const allowedOrigins = [
  'http://localhost:4200',  // Angular dev server
  'https://optics-simulator.onrender.com', // Production frontend URL
  'https://kylewestendorf.github.io',  // GitHub Pages URL
  'https://optics-c9pb.vercel.app',    // Vercel frontend URL
  'https://optics-frj6kqm88-kyle-westendorfs-projects.vercel.app',
  'https://riflescopepreview.com',
  'https://riflescopepreview.com',
  'https://opticpreview.com',
  'https://huntingscopepreview.com',
  'https://binocularpreview.com',
  'https://www.riflescopepreview.com/',
  'https://www.opticpreview.com/',
  'https://www.huntingscopepreview.com/',
  'https://www.binocularpreview.com/',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel domains and localhost during development
    if (origin.includes('vercel.app') || origin.includes('localhost') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));

app.use(express.json());

// Setup Swagger documentation
setupSwagger(app);

// Path to our scopes data file and directory
const dataDir = path.join(__dirname, '../data');
const scopesFilePath = path.join(dataDir, 'scopes.json');
const amazonScopesFilePath = path.join(dataDir, 'amazon-scopes.json');

// Initialize scopes data
let scopesData: any = {};
let amazonScopesData: any = {};

async function initializeData() {
  try {
    // Create data directory if it doesn't exist
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Try to read existing Leupold data
    if (existsSync(scopesFilePath)) {
      scopesData = JSON.parse(readFileSync(scopesFilePath, 'utf-8'));
    }

    // Try to read existing Amazon data
    if (existsSync(amazonScopesFilePath)) {
      amazonScopesData = JSON.parse(readFileSync(amazonScopesFilePath, 'utf-8'));
    }

    // If no Leupold data exists or the data is empty, trigger initial scrape
    if (!existsSync(scopesFilePath) || Object.keys(scopesData).length === 0) {
      console.log('No Leupold scope data found. Initiating first scrape...');
      const newScopes = await scrapeLeupoldScopes();
      scopesData = newScopes;
      writeFileSync(scopesFilePath, JSON.stringify(scopesData, null, 2));
      console.log('Initial Leupold scope data created successfully');
    }

    // If no Amazon data exists or the data is empty, trigger initial scrape
    if (!existsSync(amazonScopesFilePath) || Object.keys(amazonScopesData).length === 0) {
      console.log('No Amazon scope data found. Initiating first scrape...');
      const newAmazonScopes = await scrapeAmazonScopes();
      amazonScopesData = newAmazonScopes;
      writeFileSync(amazonScopesFilePath, JSON.stringify(amazonScopesData, null, 2));
      console.log('Initial Amazon scope data created successfully');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Schedule daily scraping at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Starting daily Leupold scope data update...');
    const newScopes = await scrapeLeupoldScopes();
    
    // Merge new data with existing data
    scopesData = {
      ...scopesData,
      ...newScopes
    };

    // Save updated data
    writeFileSync(scopesFilePath, JSON.stringify(scopesData, null, 2));
    console.log('Leupold scope data updated successfully');
  } catch (error) {
    console.error('Error updating Leupold scope data:', error);
  }
});

// Schedule daily Amazon scraping at 1 AM
cron.schedule('0 1 * * *', async () => {
  try {
    console.log('Starting daily Amazon scope data update...');
    const newAmazonScopes = await scrapeAmazonScopes();
    
    // Merge new data with existing data
    amazonScopesData = {
      ...amazonScopesData,
      ...newAmazonScopes
    };

    // Save updated data
    writeFileSync(amazonScopesFilePath, JSON.stringify(amazonScopesData, null, 2));
    console.log('Amazon scope data updated successfully');
  } catch (error) {
    console.error('Error updating Amazon scope data:', error);
  }
});

// API Endpoints

/**
 * @swagger
 * /api/scopes:
 *   get:
 *     summary: Get all Leupold scopes
 *     description: Returns a collection of all scraped Leupold rifle scopes
 *     tags: [Leupold Scopes]
 *     responses:
 *       200:
 *         description: Successfully retrieved scopes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScopeCollection'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/scopes', async (req, res) => {
  // If no data exists, try to scrape it first
  if (Object.keys(scopesData).length === 0) {
    try {
      await initializeData();
    } catch (error) {
      console.error('Error initializing data on request:', error);
    }
  }
  res.json(scopesData);
});

/**
 * @swagger
 * /api/scopes/refresh:
 *   post:
 *     summary: Refresh Leupold scope data
 *     description: Manually trigger scraping of Leupold scopes to update the database
 *     tags: [Leupold Scopes]
 *     responses:
 *       200:
 *         description: Successfully refreshed scope data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       500:
 *         description: Failed to refresh scope data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/scopes/refresh', async (req, res) => {
  try {
    const newScopes = await scrapeLeupoldScopes();
    scopesData = {
      ...scopesData,
      ...newScopes
    };
    writeFileSync(scopesFilePath, JSON.stringify(scopesData, null, 2));
    res.json({ message: 'Leupold scope data updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Leupold scope data' });
  }
});

/**
 * @swagger
 * /api/amazon-scopes:
 *   get:
 *     summary: Get all Amazon scopes
 *     description: Returns a collection of all scraped Amazon rifle scopes
 *     tags: [Amazon Scopes]
 *     responses:
 *       200:
 *         description: Successfully retrieved Amazon scopes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScopeCollection'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/amazon-scopes', async (req, res) => {
  // If no data exists, try to scrape it first
  if (Object.keys(amazonScopesData).length === 0) {
    try {
      console.log('No Amazon data found, attempting to scrape...');
      const newAmazonScopes = await scrapeAmazonScopes();
      amazonScopesData = newAmazonScopes;
      writeFileSync(amazonScopesFilePath, JSON.stringify(amazonScopesData, null, 2));
    } catch (error) {
      console.error('Error initializing Amazon data on request:', error);
    }
  }
  res.json(amazonScopesData);
});

/**
 * @swagger
 * /api/amazon-scopes/refresh:
 *   post:
 *     summary: Refresh Amazon scope data
 *     description: Manually trigger scraping of Amazon scopes to update the database
 *     tags: [Amazon Scopes]
 *     responses:
 *       200:
 *         description: Successfully refreshed Amazon scope data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       500:
 *         description: Failed to refresh Amazon scope data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/amazon-scopes/refresh', async (req, res) => {
  try {
    const newAmazonScopes = await scrapeAmazonScopes();
    amazonScopesData = {
      ...amazonScopesData,
      ...newAmazonScopes
    };
    writeFileSync(amazonScopesFilePath, JSON.stringify(amazonScopesData, null, 2));
    res.json({ message: 'Amazon scope data updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Amazon scope data' });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server status
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-01-01T00:00:00.000Z"
 */
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    swagger: '/api-docs'
  });
});

// Initialize data when server starts
initializeData().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
  });
}); 