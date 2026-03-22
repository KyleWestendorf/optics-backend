import { Router, Request, Response } from 'express';
import { google } from 'googleapis';

const router = Router();

const SITES = [
  'sc-domain:riflescopepreview.com',
  'sc-domain:opticspreview.com',
];

function getAuth() {
  const keyJson = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
    'base64'
  ).toString('utf-8');
  const credentials = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

async function getSiteSummary(auth: any, siteUrl: string) {
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // Top queries — last 7 days
  const queriesResponse = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: getDateString(-7),
      endDate: getDateString(-1),
      dimensions: ['query'],
      rowLimit: 25,
      type: 'web',
    },
  });

  // Top pages — last 7 days
  const pagesResponse = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: getDateString(-7),
      endDate: getDateString(-1),
      dimensions: ['page'],
      rowLimit: 25,
      type: 'web',
    },
  });

  return {
    topQueries: (queriesResponse.data.rows || []).map((row) => ({
      query: row.keys?.[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),
    topPages: (pagesResponse.data.rows || []).map((row) => ({
      page: row.keys?.[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),
    strikingDistance: (queriesResponse.data.rows || [])
      .filter((row) => (row.position || 0) >= 5 && (row.position || 0) <= 20)
      .map((row) => ({
        query: row.keys?.[0],
        position: row.position,
        impressions: row.impressions,
        ctr: row.ctr,
      })),
  };
}

function getDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const auth = getAuth();
    const results: Record<string, any> = { generatedAt: new Date().toISOString() };

    for (const siteUrl of SITES) {
      const key = siteUrl.includes('riflescope') ? 'riflescopepreview' : 'opticspreview';
      try {
        results[key] = await getSiteSummary(auth, siteUrl);
      } catch (error: any) {
        results[key] = { error: error.message };
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error('Search Console API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Search Console data', details: error.message });
  }
});

export default router;
