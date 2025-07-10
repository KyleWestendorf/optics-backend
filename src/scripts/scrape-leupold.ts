import puppeteer from 'puppeteer';
import { Scope } from '../models/scope.model';

const LEUPOLD_URL = 'https://www.leupold.com/shop/riflescopes';

// Add configuration for the scraper
const SCRAPER_CONFIG = {
  baseUrl: LEUPOLD_URL,
  queryParams: {
    'product_list_limit': '36',
    'product_list_order': 'name',
    'stock_status': 'all'  // Include out of stock items
  }
};

const RETICLE_TYPES = {
  'Duplex': {
    type: 'Duplex',
    description: 'Classic crosshair design with thicker outer posts that taper to a fine center, perfect for low-light hunting conditions.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100'
  },
  'FireDot Duplex': {
    type: 'FireDot Duplex',
    description: 'Illuminated center dot version of the Duplex reticle, ideal for low-light hunting situations.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M48,48 h4 v4 h-4 z'
  },
  'FireDot TMR': {
    type: 'FireDot TMR',
    description: 'Illuminated Tactical Milling Reticle with center dot, combining precision ranging with low-light performance.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M48,48 h4 v4 h-4 z M35,50 h2 M45,50 h2 M55,50 h2 M65,50 h2'
  },
  'TMR': {
    type: 'TMR',
    description: 'Tactical Milling Reticle designed for range estimation and holdover compensation.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M35,50 h2 M45,50 h2 M55,50 h2 M65,50 h2'
  },
  'Wind-Plex': {
    type: 'Wind-Plex',
    description: 'Features wind drift dots and hash marks for windage compensation without elevation marks, perfect for use with CDS.',
    svgPath: 'M50,0 V100 M0,50 H100 M35,50 h2 M45,50 h2 M55,50 h2 M65,50 h2'
  },
  'TMOA': {
    type: 'TMOA',
    description: 'Tactical MOA reticle with 0.5 MOA heavy lines, 0.1 MOA fine lines, and 0.2 MOA center for precise long-range shooting.',
    svgPath: 'M50,0 V100 M0,50 H100 M45,45 h10 v10 h-10 z M40,50 h2 M58,50 h2 M50,40 v2 M50,58 v2'
  },
  'PR1-MOA': {
    type: 'PR1-MOA',
    description: 'Precision Ranging MOA reticle with fine hashmarks for precise ranging and holdovers.',
    svgPath: 'M50,0 V100 M0,50 H100 M45,45 h10 v10 h-10 z M40,50 h1 M45,50 h1 M55,50 h1 M60,50 h1'
  },
  'HPR-1': {
    type: 'HPR-1',
    description: 'High Precision Ranging reticle optimized for competition shooting with fine crosshairs.',
    svgPath: 'M50,0 V100 M0,50 H100 M45,45 h10 v10 h-10 z'
  },
  'MilDot': {
    type: 'MilDot',
    description: 'Military standard reticle with dots spaced at 1 mil intervals for range estimation.',
    svgPath: 'M50,0 V100 M0,50 H100 M48,48 h4 v4 h-4 z M35,50 h4 v4 h-4 z M65,50 h4 v4 h-4 z'
  },
  'FireDot BDC': {
    type: 'FireDot BDC',
    description: 'Illuminated Bullet Drop Compensation reticle for quick holdovers at known distances.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M48,48 h4 v4 h-4 z M50,70 h4 M50,80 h4 M50,90 h4'
  },
  'Boone and Crockett': {
    type: 'Boone and Crockett',
    description: 'Specialized hunting reticle with bullet drop compensation out to 500 yards, ideal for big game hunting.',
    svgPath: 'M50,0 V100 M0,50 H100 M45,45 h10 v10 h-10 z M40,60 h20 M40,70 h20 M40,80 h20'
  },
  'MOA-Ring': {
    type: 'MOA-Ring',
    description: 'Features a circle reticle with MOA hash marks for precise ranging and holdovers, excellent for quick target acquisition.',
    svgPath: 'M50,0 V100 M0,50 H100 M50,20 m-30,30 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0'
  },
  'UltimateSlam': {
    type: 'UltimateSlam',
    description: 'Specialized for slug guns and muzzleloaders with ballistic circles for different ranges.',
    svgPath: 'M50,0 V100 M0,50 H100 M50,30 m-20,20 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0 M50,20 m-30,30 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0'
  },
  'AR-Ballistic': {
    type: 'AR-Ballistic',
    description: 'Specialized for 223Rem/5.56NATO with bullet drop compensation and wind drift holds at 300, 400, and 500 yards.',
    svgPath: 'M50,0 V100 M0,50 H100 M40,60 h20 M35,70 h30 M30,80 h40'
  },
  'Pig-Plex': {
    type: 'Pig-Plex',
    description: 'Specialized reticle designed for pig hunting with heavy posts and an illuminated center, optimized for quick target acquisition in brush.',
    svgPath: 'M50,0 V35 M50,65 V100 M0,50 H35 M65,50 H100 M50,35 L65,50 L50,65 L35,50 Z'
  },
  'Hunt-Plex': {
    type: 'Hunt-Plex',
    description: 'Modified duplex reticle optimized for hunting with additional reference points for improved accuracy at various ranges.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M45,45 h10 v10 h-10 z M40,55 h5 M55,55 h5'
  }
} as const;

// Fallback data for when scraping fails
const fallbackScopes: { [key: string]: Scope } = {
  'vx-freedom-1-5-4x20-moa-ring': {
    minZoom: 1.5,
    maxZoom: 4,
    currentZoom: 1.5,
    model: 'VX-Freedom 1.5-4x20 MOA-Ring',
    description: 'Compact scope perfect for close-range hunting and quick target acquisition',
    manufacturer: 'Leupold',
    price: '$299.99',
    url: 'https://www.leupold.com/vx-freedom-1-5-4x20-moa-ring-riflescope',
    series: 'VX-Freedom',
    objectiveLens: 20,
    reticle: RETICLE_TYPES['MOA-Ring']
  },
  'vx-freedom-1-5-4x20-pig-plex': {
    minZoom: 1.5,
    maxZoom: 4,
    currentZoom: 1.5,
    model: 'VX-Freedom 1.5-4x20 Pig-Plex',
    description: 'Compact scope with specialized reticle for pig hunting',
    manufacturer: 'Leupold',
    price: '$299.99',
    url: 'https://www.leupold.com/vx-freedom-1-5-4x20-pig-plex-riflescope',
    series: 'VX-Freedom',
    objectiveLens: 20,
    reticle: RETICLE_TYPES['Pig-Plex']
  },
  'mark-3hd-4-12x40-tmoa': {
    minZoom: 4,
    maxZoom: 12,
    currentZoom: 4,
    model: 'Mark 3HD 4-12x40 TMOA',
    description: 'Professional-grade tactical scope with precise MOA reticle',
    manufacturer: 'Leupold',
    price: '$499.99',
    url: 'https://www.leupold.com/mark-3hd-4-12x40-tmoa-riflescope',
    series: 'Mark 3HD',
    objectiveLens: 40,
    reticle: RETICLE_TYPES['TMOA']
  }
};

export async function scrapeLeupoldScopes(): Promise<{ [key: string]: Scope }> {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const queryString = Object.entries(SCRAPER_CONFIG.queryParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const baseUrl = `${SCRAPER_CONFIG.baseUrl}?${queryString}`;

    console.log('Starting to scrape Leupold website');
    const allScopes: { [key: string]: any } = {};
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const pageUrl = `${baseUrl}&p=${currentPage}`;
      console.log(`Navigating to page ${currentPage}:`, pageUrl);
      
      await page.goto(pageUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for product items to load
      await page.waitForSelector('.product-items', { timeout: 10000 });

      // Extract scopes from current page
      const pageScopes = await page.evaluate((RETICLE_TYPES: any) => {
        const scopeData: { [key: string]: any } = {};
        
        document.querySelectorAll('.product-item').forEach((item) => {
          const titleEl = item.querySelector('.product-item-name');
          const priceEl = item.querySelector('.price');
          const linkEl = item.querySelector('.product-item-link') as HTMLAnchorElement;
          const descriptionEl = item.querySelector('.description');

          if (titleEl && priceEl) {
            const title = titleEl.textContent?.trim() || '';
            const priceStr = priceEl.textContent?.trim() || '';
            const url = linkEl?.href || '';
            const description = descriptionEl?.textContent?.trim() || '';

            // Extract magnification and objective lens size
            const magMatch = title.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?x(\d+)/);
            if (!magMatch) return;

            const minZoom = parseFloat(magMatch[1]);
            const maxZoom = magMatch[2] ? parseFloat(magMatch[2]) : minZoom;
            const objectiveLens = parseInt(magMatch[3]);

            // Extract series info (VX-Freedom, VX-3HD, etc.)
            const seriesMatch = title.match(/(VX-\w+|Mark \d+HD)/i);
            const series = seriesMatch ? seriesMatch[1] : 'Unknown Series';

            // Detect reticle type with improved matching
            let detectedReticle = null;
            const titleLower = title.toLowerCase();
            const descriptionLower = description.toLowerCase();

            // First check for specific reticle indicators in the title
            if (titleLower.includes('firedot')) {
              if (titleLower.includes('tmr')) {
                detectedReticle = RETICLE_TYPES['FireDot TMR'];
              } else if (titleLower.includes('bdc')) {
                detectedReticle = RETICLE_TYPES['FireDot BDC'];
              } else {
                detectedReticle = RETICLE_TYPES['FireDot Duplex'];
              }
            } else if (titleLower.includes('tmr')) {
              detectedReticle = RETICLE_TYPES['TMR'];
            } else if (titleLower.includes('pr1-moa') || titleLower.includes('pr1 moa')) {
              detectedReticle = RETICLE_TYPES['PR1-MOA'];
            } else if (titleLower.includes('hpr-1') || titleLower.includes('hpr1')) {
              detectedReticle = RETICLE_TYPES['HPR-1'];
            } else if (titleLower.includes('mildot') || titleLower.includes('mil dot')) {
              detectedReticle = RETICLE_TYPES['MilDot'];
            } else if (titleLower.includes('boone') || titleLower.includes('b&c')) {
              detectedReticle = RETICLE_TYPES['Boone and Crockett'];
            } else if (titleLower.includes('pig-plex')) {
              detectedReticle = RETICLE_TYPES['Pig-Plex'];
            } else if (titleLower.includes('wind-plex')) {
              detectedReticle = RETICLE_TYPES['Wind-Plex'];
            } else if (titleLower.includes('ultimateslam')) {
              detectedReticle = RETICLE_TYPES['UltimateSlam'];
            } else if (titleLower.includes('tmoa') || (titleLower.includes('tactical') && titleLower.includes('moa'))) {
              detectedReticle = RETICLE_TYPES['TMOA'];
            } else if (titleLower.includes('moa-ring') || (titleLower.includes('moa') && titleLower.includes('ring'))) {
              detectedReticle = RETICLE_TYPES['MOA-Ring'];
            } else if (titleLower.includes('hunt-plex')) {
              detectedReticle = RETICLE_TYPES['Hunt-Plex'];
            } else if (titleLower.includes('ar-ballistic')) {
              detectedReticle = RETICLE_TYPES['AR-Ballistic'];
            }

            // If no match found in title, check description
            if (!detectedReticle) {
              if (descriptionLower.includes('firedot')) {
                if (descriptionLower.includes('tmr')) {
                  detectedReticle = RETICLE_TYPES['FireDot TMR'];
                } else if (descriptionLower.includes('bdc')) {
                  detectedReticle = RETICLE_TYPES['FireDot BDC'];
                } else {
                  detectedReticle = RETICLE_TYPES['FireDot Duplex'];
                }
              } else if (descriptionLower.includes('tmr')) {
                detectedReticle = RETICLE_TYPES['TMR'];
              } else if (descriptionLower.includes('pr1-moa') || descriptionLower.includes('pr1 moa')) {
                detectedReticle = RETICLE_TYPES['PR1-MOA'];
              } else if (descriptionLower.includes('hpr-1') || descriptionLower.includes('hpr1')) {
                detectedReticle = RETICLE_TYPES['HPR-1'];
              } else if (descriptionLower.includes('mildot') || descriptionLower.includes('mil dot')) {
                detectedReticle = RETICLE_TYPES['MilDot'];
              }
            }

            // Only default to Duplex if explicitly mentioned or as last resort
            if (!detectedReticle) {
              if (titleLower.includes('duplex') || descriptionLower.includes('duplex')) {
                detectedReticle = RETICLE_TYPES['Duplex'];
              } else {
                // Log scopes where we're defaulting to Duplex for debugging
                console.log(`Defaulting to Duplex reticle for scope: ${title}`);
                detectedReticle = RETICLE_TYPES['Duplex'];
              }
            }

            // Use the full title as the key to ensure uniqueness
            const key = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
            
            scopeData[key] = {
              minZoom,
              maxZoom,
              currentZoom: minZoom,
              model: title,
              description: description || `${series} ${minZoom}-${maxZoom}x${objectiveLens} riflescope`,
              manufacturer: 'Leupold',
              price: priceStr,
              url: url,
              reticle: detectedReticle,
              series: series,
              objectiveLens
            };
          }
        });

        return scopeData;
      }, RETICLE_TYPES);

      // Merge scopes from this page into all scopes
      Object.assign(allScopes, pageScopes);

      // Check if there's a next page
      hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('.pages-item-next');
        return nextButton !== null && !nextButton.classList.contains('disabled');
      });

      console.log(`Found ${Object.keys(pageScopes).length} scopes on page ${currentPage}`);
      currentPage++;

      // Add a small delay between pages to be nice to the server
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Total scopes found:', Object.keys(allScopes).length);

    if (Object.keys(allScopes).length === 0) {
      console.log('No scopes found, using fallback data');
      return fallbackScopes;
    }

    return allScopes;
  } catch (error) {
    console.error('Error scraping Leupold website:', error);
    console.log('Using fallback data due to error');
    return fallbackScopes;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
} 