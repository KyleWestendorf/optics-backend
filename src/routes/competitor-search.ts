import { Router, Request, Response } from 'express';
import { google } from 'googleapis';

const router = Router();

const OUR_DOMAINS = ['riflescopepreview.com', 'opticspreview.com'];

async function searchKeyword(apiKey: string, cx: string, keyword: string) {
  const customsearch = google.customsearch('v1');
  const response = await customsearch.cse.list({
    auth: apiKey,
    cx,
    q: keyword,
    num: 10,
  });

  const results = (response.data.items || []).map((item, index) => ({
    position: index + 1,
    title: item.title,
    link: item.link,
    snippet: item.snippet,
    isOurs: OUR_DOMAINS.some((d) => item.link?.includes(d)),
  }));

  return {
    keyword,
    totalResults: response.data.searchInformation?.totalResults,
    ourPosition: results.find((r) => r.isOurs)?.position || null,
    results,
    competitors: results.filter((r) => !r.isOurs),
  };
}

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array required' });
    }
    if (keywords.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 keywords per request' });
    }

    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
    if (!apiKey || !cx) {
      return res.status(503).json({ error: 'Google Custom Search not configured' });
    }

    const results = [];
    for (const keyword of keywords) {
      try {
        results.push(await searchKeyword(apiKey, cx, keyword));
      } catch (error: any) {
        results.push({ keyword, error: error.message });
      }
    }

    res.json({ generatedAt: new Date().toISOString(), results });
  } catch (error: any) {
    console.error('Competitor search error:', error.message);
    res.status(500).json({ error: 'Failed to run competitor search', details: error.message });
  }
});

export default router;
