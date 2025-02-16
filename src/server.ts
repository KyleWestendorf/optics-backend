import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { scrapeLeupoldScopes } from './scripts/scrape-leupold';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS for production and development
const allowedOrigins = [
  'http://localhost:4200',  // Angular dev server
  'https://optics-simulator.onrender.com', // Production frontend URL
  'https://kylewestendorf.github.io',  // GitHub Pages URL
  'https://optics-c9pb.vercel.app',    // Vercel frontend URL
  'https://optics-frj6kqm88-kyle-westendorfs-projects.vercel.app' // Vercel backend URL
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Path to our scopes data file and directory
const dataDir = path.join(__dirname, '../data');
const scopesFilePath = path.join(dataDir, 'scopes.json');

// Initialize scopes data
let scopesData: any = {};

async function initializeData() {
  try {
    // Create data directory if it doesn't exist
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Try to read existing data
    if (existsSync(scopesFilePath)) {
      scopesData = JSON.parse(readFileSync(scopesFilePath, 'utf-8'));
    }

    // If no data exists or the data is empty, trigger initial scrape
    if (!existsSync(scopesFilePath) || Object.keys(scopesData).length === 0) {
      console.log('No scope data found. Initiating first scrape...');
      const newScopes = await scrapeLeupoldScopes();
      scopesData = newScopes;
      writeFileSync(scopesFilePath, JSON.stringify(scopesData, null, 2));
      console.log('Initial scope data created successfully');
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
    console.log('Scope data updated successfully');
  } catch (error) {
    console.error('Error updating scope data:', error);
  }
});

// API Endpoints
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

// Manual trigger for scraping (for testing)
app.post('/api/scopes/refresh', async (req, res) => {
  try {
    const newScopes = await scrapeLeupoldScopes();
    scopesData = {
      ...scopesData,
      ...newScopes
    };
    writeFileSync(scopesFilePath, JSON.stringify(scopesData, null, 2));
    res.json({ message: 'Scope data updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scope data' });
  }
});

// Initialize data when server starts
initializeData().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}); 