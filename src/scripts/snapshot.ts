import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import db from '../db';

// GA4 Property IDs — same as in routes/analytics.ts
const PROPERTIES: Record<string, string> = {
  riflescopepreview: '508009193',
  opticspreview: '507991235',
};

// Search Console sites — same as in routes/search-console.ts
const SC_SITES: Record<string, string> = {
  riflescopepreview: 'sc-domain:riflescopepreview.com',
  opticspreview: 'sc-domain:opticspreview.com',
};

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getAnalyticsClient(): BetaAnalyticsDataClient {
  const keyJson = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
    'base64'
  ).toString('utf-8');
  const credentials = JSON.parse(keyJson);
  return new BetaAnalyticsDataClient({ credentials });
}

function getSearchConsoleAuth() {
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

async function snapshotGA4(client: BetaAnalyticsDataClient, site: string, propertyId: string, date: string) {
  // 1. Daily aggregate metrics
  const [dailyReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
  });

  const dailyRow = dailyReport.rows?.[0];
  if (dailyRow) {
    const upsertDaily = db.prepare(`
      INSERT OR REPLACE INTO daily_metrics (date, site, page_views, sessions, bounce_rate, avg_session_duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    upsertDaily.run(
      date,
      site,
      Number(dailyRow.metricValues?.[0]?.value || 0),
      Number(dailyRow.metricValues?.[1]?.value || 0),
      Number(dailyRow.metricValues?.[2]?.value || 0),
      Number(dailyRow.metricValues?.[3]?.value || 0),
    );
  }

  // 2. Per-page performance
  const [pageReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 50,
  });

  const upsertPage = db.prepare(`
    INSERT OR REPLACE INTO page_performance (date, site, path, views, sessions, bounce_rate, avg_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of pageReport.rows || []) {
    upsertPage.run(
      date,
      site,
      row.dimensionValues?.[0]?.value || '/',
      Number(row.metricValues?.[0]?.value || 0),
      Number(row.metricValues?.[1]?.value || 0),
      Number(row.metricValues?.[2]?.value || 0),
      Number(row.metricValues?.[3]?.value || 0),
    );
  }

  // 3. Affiliate clicks by page
  try {
    const [affiliateReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: date, endDate: date }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'affiliate_click' },
        },
      },
      limit: 50,
    });

    // Update affiliate_clicks on existing page_performance rows
    const updateAffClicks = db.prepare(`
      UPDATE page_performance SET affiliate_clicks = ?
      WHERE date = ? AND site = ? AND path = ?
    `);
    let totalClicks = 0;
    for (const row of affiliateReport.rows || []) {
      const clicks = Number(row.metricValues?.[0]?.value || 0);
      totalClicks += clicks;
      updateAffClicks.run(clicks, date, site, row.dimensionValues?.[0]?.value || '/');
    }

    // Also update daily_metrics with total affiliate clicks
    db.prepare(`UPDATE daily_metrics SET affiliate_clicks = ? WHERE date = ? AND site = ?`)
      .run(totalClicks, date, site);
  } catch (err) {
    console.warn(`[snapshot] Failed to fetch affiliate clicks for ${site}:`, err);
  }
}

async function snapshotSearchConsole(site: string, siteUrl: string) {
  const auth = getSearchConsoleAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // Search Console data has a 2-3 day lag, so query 3 days ago instead
  const scDate = new Date();
  scDate.setDate(scDate.getDate() - 3);
  const scDateStr = scDate.toISOString().split('T')[0];

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: scDateStr,
      endDate: scDateStr,
      dimensions: ['query'],
      rowLimit: 100,
      type: 'web',
    },
  });

  const upsertKeyword = db.prepare(`
    INSERT OR REPLACE INTO keyword_rankings (date, site, query, clicks, impressions, ctr, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of response.data.rows || []) {
    upsertKeyword.run(
      scDateStr,
      site,
      row.keys?.[0] || '',
      row.clicks || 0,
      row.impressions || 0,
      row.ctr || 0,
      row.position || 0,
    );
  }
}

export async function runSnapshot(): Promise<void> {
  const date = getYesterday();
  console.log(`[snapshot] Starting daily snapshot for ${date}...`);

  const client = getAnalyticsClient();

  for (const [site, propertyId] of Object.entries(PROPERTIES)) {
    // GA4 data
    try {
      await snapshotGA4(client, site, propertyId, date);
      console.log(`[snapshot] GA4 data saved for ${site}`);
    } catch (err) {
      console.error(`[snapshot] GA4 failed for ${site}:`, err);
    }

    // Search Console data
    const scSite = SC_SITES[site];
    if (scSite) {
      try {
        await snapshotSearchConsole(site, scSite);
        console.log(`[snapshot] Search Console data saved for ${site}`);
      } catch (err) {
        console.error(`[snapshot] Search Console failed for ${site}:`, err);
      }
    }
  }

  console.log(`[snapshot] Daily snapshot complete for ${date}`);
}
