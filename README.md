# Optics Simulator Backend

This is the backend service for the Optics Simulator application. It provides an API for scope data and automatically scrapes Leupold's website daily to keep the scope data up to date.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a data directory:
```bash
mkdir data
```

3. Build the TypeScript code:
```bash
npm run build
```

## Running the Service

Start the development server:
```bash
npm run dev
```

The server will run on port 3000 by default.

## Features

- Daily automatic scraping of Leupold's riflescope data (runs at midnight)
- REST API endpoints:
  - GET `/api/scopes` - Get all scope data
  - POST `/api/scopes/refresh` - Manually trigger a data refresh

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm start` - Run the built code
- `npm run scrape` - Manually run the scraper script

## Data Storage

Scope data is stored in `data/scopes.json` and is automatically updated daily. The file is created on the first successful scrape if it doesn't exist.

## Integration with Frontend

The frontend Angular application communicates with this backend through the ScopeDataService. Make sure the backend is running before starting the frontend application. 