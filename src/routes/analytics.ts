import { Router, Request, Response } from 'express';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const router = Router();

// GA4 Property IDs
const PROPERTIES = {
  riflescopepreview: '508009193',
  opticspreview: '507991235',
};

function getAnalyticsClient(): BetaAnalyticsDataClient {
  const keyJson = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
    'base64'
  ).toString('utf-8');
  const credentials = JSON.parse(keyJson);
  return new BetaAnalyticsDataClient({ credentials });
}

async function getPropertySummary(client: BetaAnalyticsDataClient, propertyId: string) {
  // Page views, sessions, bounce rate — last 7 days
  const [trafficReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  });

  // Affiliate click events — last 7 days
  const [affiliateReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'eventName' },
      { name: 'customEvent:product_name' },
      { name: 'customEvent:page_source' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'affiliate_click' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 50,
  });

  return {
    topPages: (trafficReport.rows || []).map((row) => ({
      path: row.dimensionValues?.[0]?.value,
      pageViews: Number(row.metricValues?.[0]?.value || 0),
      sessions: Number(row.metricValues?.[1]?.value || 0),
      bounceRate: Number(row.metricValues?.[2]?.value || 0),
      avgSessionDuration: Number(row.metricValues?.[3]?.value || 0),
    })),
    affiliateClicks: (affiliateReport.rows || []).map((row) => ({
      productName: row.dimensionValues?.[1]?.value,
      pageSource: row.dimensionValues?.[2]?.value,
      clicks: Number(row.metricValues?.[0]?.value || 0),
    })),
  };
}

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const client = getAnalyticsClient();
    const [riflescopeData, opticsData] = await Promise.all([
      getPropertySummary(client, PROPERTIES.riflescopepreview),
      getPropertySummary(client, PROPERTIES.opticspreview),
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      riflescopepreview: riflescopeData,
      opticspreview: opticsData,
    });
  } catch (error: any) {
    console.error('Analytics API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics data', details: error.message });
  }
});

export default router;
