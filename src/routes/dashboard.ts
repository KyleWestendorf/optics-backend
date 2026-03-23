import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

function getKeywordStatus(position: number): string {
  if (position <= 4) return 'winning';
  if (position <= 20) return 'striking_distance';
  return 'opportunity';
}

router.get('/trends', (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 365);
    const site = (req.query.site as string) || 'riflescopepreview';

    // Calculate date ranges
    const now = new Date();
    const currentEnd = new Date(now);
    currentEnd.setDate(currentEnd.getDate() - 1); // yesterday
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - days + 1);

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - days + 1);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // Summary: current vs previous period
    const currentMetrics = db.prepare(`
      SELECT
        COALESCE(SUM(page_views), 0) as pageViews,
        COALESCE(SUM(sessions), 0) as sessions,
        COALESCE(SUM(affiliate_clicks), 0) as affiliateClicks,
        COALESCE(AVG(bounce_rate), 0) as bounceRate
      FROM daily_metrics
      WHERE site = ? AND date BETWEEN ? AND ?
    `).get(site, fmt(currentStart), fmt(currentEnd)) as any;

    const previousMetrics = db.prepare(`
      SELECT
        COALESCE(SUM(page_views), 0) as pageViews,
        COALESCE(SUM(sessions), 0) as sessions,
        COALESCE(SUM(affiliate_clicks), 0) as affiliateClicks,
        COALESCE(AVG(bounce_rate), 0) as bounceRate
      FROM daily_metrics
      WHERE site = ? AND date BETWEEN ? AND ?
    `).get(site, fmt(previousStart), fmt(previousEnd)) as any;

    // Impressions and avg position from keyword_rankings
    const currentKwAgg = db.prepare(`
      SELECT
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(AVG(position), 0) as avgPosition
      FROM keyword_rankings
      WHERE site = ? AND date BETWEEN ? AND ?
    `).get(site, fmt(currentStart), fmt(currentEnd)) as any;

    const previousKwAgg = db.prepare(`
      SELECT
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(AVG(position), 0) as avgPosition
      FROM keyword_rankings
      WHERE site = ? AND date BETWEEN ? AND ?
    `).get(site, fmt(previousStart), fmt(previousEnd)) as any;

    const delta = (current: number, previous: number) =>
      previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;

    const summary = {
      pageViews: {
        current: currentMetrics.pageViews,
        previous: previousMetrics.pageViews,
        delta: delta(currentMetrics.pageViews, previousMetrics.pageViews),
      },
      affiliateClicks: {
        current: currentMetrics.affiliateClicks,
        previous: previousMetrics.affiliateClicks,
        delta: delta(currentMetrics.affiliateClicks, previousMetrics.affiliateClicks),
      },
      impressions: {
        current: currentKwAgg.impressions,
        previous: previousKwAgg.impressions,
        delta: delta(currentKwAgg.impressions, previousKwAgg.impressions),
      },
      avgPosition: {
        current: Math.round(currentKwAgg.avgPosition * 10) / 10,
        previous: Math.round(previousKwAgg.avgPosition * 10) / 10,
        delta: delta(currentKwAgg.avgPosition, previousKwAgg.avgPosition),
      },
    };

    // Daily time series
    const daily = db.prepare(`
      SELECT date, page_views as pageViews, sessions, affiliate_clicks as affiliateClicks, bounce_rate as bounceRate
      FROM daily_metrics
      WHERE site = ? AND date BETWEEN ? AND ?
      ORDER BY date ASC
    `).all(site, fmt(currentStart), fmt(currentEnd));

    // Keywords: most recent date's data with previous position
    const latestKwDate = db.prepare(`
      SELECT MAX(date) as d FROM keyword_rankings WHERE site = ? AND date BETWEEN ? AND ?
    `).get(site, fmt(currentStart), fmt(currentEnd)) as any;

    let keywords: any[] = [];
    if (latestKwDate?.d) {
      const prevKwDate = db.prepare(`
        SELECT MAX(date) as d FROM keyword_rankings WHERE site = ? AND date < ?
      `).get(site, latestKwDate.d) as any;

      keywords = db.prepare(`
        SELECT query, clicks, impressions, ctr, position
        FROM keyword_rankings
        WHERE site = ? AND date = ?
        ORDER BY impressions DESC
      `).all(site, latestKwDate.d).map((row: any) => {
        let prevPosition = null;
        if (prevKwDate?.d) {
          const prev = db.prepare(`
            SELECT position FROM keyword_rankings WHERE site = ? AND date = ? AND query = ?
          `).get(site, prevKwDate.d, row.query) as any;
          prevPosition = prev?.position ?? null;
        }
        return {
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: Math.round(row.ctr * 1000) / 10,
          position: Math.round(row.position * 10) / 10,
          prevPosition: prevPosition ? Math.round(prevPosition * 10) / 10 : null,
          status: getKeywordStatus(row.position),
        };
      });
    }

    // Pages: most recent date's data
    const latestPageDate = db.prepare(`
      SELECT MAX(date) as d FROM page_performance WHERE site = ? AND date BETWEEN ? AND ?
    `).get(site, fmt(currentStart), fmt(currentEnd)) as any;

    let pages: any[] = [];
    if (latestPageDate?.d) {
      pages = db.prepare(`
        SELECT path, views, sessions, affiliate_clicks as affiliateClicks,
               bounce_rate as bounceRate, avg_duration as avgDuration
        FROM page_performance
        WHERE site = ? AND date = ?
        ORDER BY affiliate_clicks DESC, views DESC
      `).all(site, latestPageDate.d);
    }

    res.json({
      generatedAt: new Date().toISOString(),
      site,
      days,
      summary,
      daily,
      keywords,
      pages,
    });
  } catch (error: any) {
    console.error('Dashboard trends error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard trends', details: error.message });
  }
});

export default router;
