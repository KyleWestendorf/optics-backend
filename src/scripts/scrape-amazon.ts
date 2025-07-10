import puppeteer from 'puppeteer';
import { Scope } from '../models/scope.model';

const AMAZON_SEARCH_URL = 'https://www.amazon.com/s?k=rifle+scope&rh=p_36%3A15000-&ref=sr_pg_1';

// Basic reticle types for Amazon scopes (simplified)
const BASIC_RETICLE_TYPES = {
  'Duplex': {
    type: 'Duplex',
    description: 'Classic crosshair design with thicker outer posts that taper to a fine center.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100'
  },
  'Mil-Dot': {
    type: 'Mil-Dot',
    description: 'Military standard reticle with dots spaced at 1 mil intervals for range estimation.',
    svgPath: 'M50,0 V100 M0,50 H100 M48,48 h4 v4 h-4 z M35,50 h4 v4 h-4 z M65,50 h4 v4 h-4 z'
  },
  'BDC': {
    type: 'BDC',
    description: 'Bullet Drop Compensation reticle for quick holdovers at known distances.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M50,70 h4 M50,80 h4 M50,90 h4'
  },
  'Illuminated': {
    type: 'Illuminated',
    description: 'Illuminated reticle for low-light conditions.',
    svgPath: 'M50,0 V40 M50,60 V100 M0,50 H40 M60,50 H100 M48,48 h4 v4 h-4 z'
  }
} as const;

// Fallback data for when scraping fails (only scopes $150+)
const fallbackAmazonScopes: { [key: string]: Scope } = {
  'vortex-diamondback-tactical-6-24x50': {
    minZoom: 6,
    maxZoom: 24,
    currentZoom: 6,
    model: 'Vortex Diamondback Tactical 6-24x50 FFP',
    description: 'First focal plane tactical riflescope with precision glass and reliable tracking',
    manufacturer: 'Vortex',
    price: '$349.99',
    url: 'https://www.amazon.com/dp/B07JBQZPX8',
    series: 'Diamondback Tactical',
    objectiveLens: 50,
    reticle: BASIC_RETICLE_TYPES['Duplex']
  },
  'leupold-vx-freedom-3-9x40': {
    minZoom: 3,
    maxZoom: 9,
    currentZoom: 3,
    model: 'Leupold VX-Freedom 3-9x40 Duplex',
    description: 'Reliable hunting riflescope with classic duplex reticle',
    manufacturer: 'Leupold',
    price: '$199.99',
    url: 'https://www.amazon.com/dp/B07L9QKZX5',
    series: 'VX-Freedom',
    objectiveLens: 40,
    reticle: BASIC_RETICLE_TYPES['Duplex']
  },
  'vortex-viper-pst-gen-ii-5-25x50': {
    minZoom: 5,
    maxZoom: 25,
    currentZoom: 5,
    model: 'Vortex Viper PST Gen II 5-25x50 FFP',
    description: 'High-performance tactical riflescope with first focal plane design',
    manufacturer: 'Vortex',
    price: '$599.99',
    url: 'https://www.amazon.com/dp/B01MXUZ8XY',
    series: 'Viper PST Gen II',
    objectiveLens: 50,
    reticle: BASIC_RETICLE_TYPES['Mil-Dot']
  },
  'leupold-vx-3i-3.5-10x40': {
    minZoom: 3.5,
    maxZoom: 10,
    currentZoom: 3.5,
    model: 'Leupold VX-3i 3.5-10x40 CDS',
    description: 'Premium hunting riflescope with Custom Dial System',
    manufacturer: 'Leupold',
    price: '$399.99',
    url: 'https://www.amazon.com/dp/B07K8QZXYZ',
    series: 'VX-3i',
    objectiveLens: 40,
    reticle: BASIC_RETICLE_TYPES['Duplex']
  }
};

export async function scrapeAmazonScopes(): Promise<{ [key: string]: Scope }> {
  let browser;
  try {
    console.log('Launching browser for Amazon scraping...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log('Starting to scrape Amazon rifle scopes...');
    await page.goto(AMAZON_SEARCH_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for search results to load
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 });

    // Extract scope data from first page
    const scopes = await page.evaluate((BASIC_RETICLE_TYPES: any) => {
      const scopeData: { [key: string]: any } = {};
      
      const searchResults = document.querySelectorAll('[data-component-type="s-search-result"]');
      console.log(`Found ${searchResults.length} search results`);
      
      searchResults.forEach((result, index) => {
        try {
          // Updated selectors based on Amazon's current structure
          const titleElement = result.querySelector('h2 span') || result.querySelector('[data-cy="title-recipe"] span') || result.querySelector('.s-line-clamp-4 span');
          const priceElement = result.querySelector('.a-price-whole') || result.querySelector('.a-price .a-offscreen') || result.querySelector('.a-price-symbol');
          const linkElement = result.querySelector('h2 a') || result.querySelector('[data-cy="title-recipe"] a') as HTMLAnchorElement;
          
          if (!titleElement || !linkElement) {
            console.log('Missing title or link element for result', index);
            return;
          }
          
          const title = titleElement.textContent?.trim() || '';
          const priceText = priceElement?.textContent?.trim() || '';
          const url = (linkElement as HTMLAnchorElement).href;
          
          console.log(`Processing item ${index}: ${title}`);
          
          // Skip if not a rifle scope
          if (!title.toLowerCase().includes('scope') && !title.toLowerCase().includes('optic')) {
            return;
          }
          
          // Extract magnification and objective lens
          const magMatch = title.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?x(\d+)/i);
          if (!magMatch) return;
          
          const minZoom = parseFloat(magMatch[1]);
          const maxZoom = magMatch[2] ? parseFloat(magMatch[2]) : minZoom;
          const objectiveLens = parseInt(magMatch[3]);
          
          // Extract manufacturer
          let manufacturer = 'Unknown';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('vortex')) manufacturer = 'Vortex';
          else if (titleLower.includes('leupold')) manufacturer = 'Leupold';
          else if (titleLower.includes('nikon')) manufacturer = 'Nikon';
          else if (titleLower.includes('bushnell')) manufacturer = 'Bushnell';
          else if (titleLower.includes('athlon')) manufacturer = 'Athlon';
          else if (titleLower.includes('primary arms')) manufacturer = 'Primary Arms';
          else if (titleLower.includes('sig sauer')) manufacturer = 'Sig Sauer';
          else if (titleLower.includes('burris')) manufacturer = 'Burris';
          else if (titleLower.includes('trijicon')) manufacturer = 'Trijicon';
          else if (titleLower.includes('nightforce')) manufacturer = 'Nightforce';
          else if (titleLower.includes('monstrum')) manufacturer = 'Monstrum';
          else if (titleLower.includes('cvlife')) manufacturer = 'CVLIFE';
          else if (titleLower.includes('barska')) manufacturer = 'Barska';
          else if (titleLower.includes('simmons')) manufacturer = 'Simmons';
          else if (titleLower.includes('hawke')) manufacturer = 'Hawke';
          else if (titleLower.includes('konus')) manufacturer = 'Konus';
          else {
            // Try to extract manufacturer from start of title
            const words = title.split(' ');
            if (words.length > 0) {
              manufacturer = words[0];
            }
          }
          
          // Extract series/model line
          let series = 'Standard';
          if (titleLower.includes('diamondback')) series = 'Diamondback';
          else if (titleLower.includes('viper')) series = 'Viper';
          else if (titleLower.includes('razor')) series = 'Razor';
          else if (titleLower.includes('vx-freedom')) series = 'VX-Freedom';
          else if (titleLower.includes('mark')) series = 'Mark';
          else if (titleLower.includes('tactical')) series = 'Tactical';
          
          // Detect reticle type
          let reticle: any = BASIC_RETICLE_TYPES['Duplex']; // Default
          if (titleLower.includes('mil-dot') || titleLower.includes('mildot')) {
            reticle = BASIC_RETICLE_TYPES['Mil-Dot'];
          } else if (titleLower.includes('bdc')) {
            reticle = BASIC_RETICLE_TYPES['BDC'];
          } else if (titleLower.includes('illuminated')) {
            reticle = BASIC_RETICLE_TYPES['Illuminated'];
          }
          
          // Clean price - Amazon has complex price structure
          let formattedPrice = 'Price not available';
          let priceValue = 0;
          if (priceText) {
            // Extract price from various Amazon price formats
            const priceMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)/);
            if (priceMatch) {
              priceValue = parseFloat(priceMatch[1]);
              formattedPrice = `$${priceMatch[1]}`;
            }
          }
          
          // Skip items with unrealistic low prices (likely parsing errors)
          // Amazon URL filter handles main $150+ filtering
          if (priceValue > 0 && priceValue < 20) {
            console.log(`Skipping ${title} - Unrealistic price $${priceValue} (likely parsing error)`);
            return;
          }
          
          console.log(`Price extracted: ${formattedPrice}`);
          
          // Generate unique key
          const key = `amazon-${title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}-${index}`;
          
          // Clean and format URL
          let cleanUrl = url;
          if (url && !url.startsWith('javascript:')) {
            if (url.startsWith('/')) {
              cleanUrl = `https://www.amazon.com${url}`;
            }
            cleanUrl = cleanUrl.split('?')[0]; // Remove query parameters
          } else {
            cleanUrl = 'https://www.amazon.com/s?k=rifle+scope'; // Fallback URL
          }
          
          scopeData[key] = {
            minZoom,
            maxZoom,
            currentZoom: minZoom,
            model: title,
            description: `${manufacturer} ${series} ${minZoom}${maxZoom !== minZoom ? `-${maxZoom}` : ''}x${objectiveLens} riflescope`,
            manufacturer,
            price: formattedPrice,
            url: cleanUrl,
            series,
            objectiveLens,
            reticle
          };
        } catch (error) {
          console.error('Error processing search result:', error);
        }
      });
      
      console.log(`Processed ${Object.keys(scopeData).length} scopes from ${searchResults.length} results`);
      return scopeData;
    }, BASIC_RETICLE_TYPES);

    console.log('Amazon scopes found:', Object.keys(scopes).length);

    if (Object.keys(scopes).length === 0) {
      console.log('No Amazon scopes found, using fallback data');
      return fallbackAmazonScopes;
    }

    return scopes;
  } catch (error) {
    console.error('Error scraping Amazon:', error);
    console.log('Using fallback data due to error');
    return fallbackAmazonScopes;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}