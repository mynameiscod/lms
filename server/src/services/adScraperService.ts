/**
 * Ad Scraper Service
 * Uses Playwright to scrape competitor ads from Meta Ads Library.
 * Falls back gracefully if scraping fails (anti-bot measures, etc.)
 */

import { chromium, Browser, Page } from 'playwright';

export interface ScrapedAd {
  competitorName: string;
  headline: string;
  primaryText: string;
  cta: string;
  mediaUrl: string;
  landingPage: string;
  platform: string;
  startedRunning: string;
  estimatedReach: string;
}

/**
 * Fetch competitor ads from Meta Ads Library.
 * Opens the library, searches for the competitor, scrolls to load ads, and extracts data.
 */
export async function fetchCompetitorAds(competitorName: string): Promise<ScrapedAd[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
    });

    const page = await context.newPage();

    // Navigate to Meta Ads Library
    const searchUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&q=${encodeURIComponent(competitorName)}&search_type=keyword_unordered&media_type=all`;

    console.log(`[AdScraper] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 });

    // Wait longer for client-side rendering
    await page.waitForTimeout(6000);

    // Scroll aggressively to load more ads
    await autoScroll(page, 5);

    // Extract ad data using multiple strategies
    let ads = await extractAdsStructured(page, competitorName);
    console.log(`[AdScraper] Structured extraction found ${ads.length} ads`);

    // If structured extraction got few results, try fallback
    if (ads.length < 3) {
      const fallbackAds = await extractAdsFallback(page, competitorName);
      console.log(`[AdScraper] Fallback extraction found ${fallbackAds.length} ads`);

      // Merge, avoiding duplicates by headline similarity
      for (const fb of fallbackAds) {
        const isDupe = ads.some(a =>
          a.headline && fb.headline &&
          a.headline.substring(0, 60).toLowerCase() === fb.headline.substring(0, 60).toLowerCase()
        );
        if (!isDupe) ads.push(fb);
      }
    }

    console.log(`[AdScraper] Total extracted ${ads.length} ads for "${competitorName}"`);

    await browser.close();
    return ads;
  } catch (error: any) {
    console.error(`[AdScraper] Error scraping ads for "${competitorName}":`, error.message);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Auto-scroll the page to trigger lazy-loading of more ads.
 */
async function autoScroll(page: Page, rounds: number = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await page.evaluate('window.scrollBy(0, window.innerHeight * 2)');
    await page.waitForTimeout(2500);
  }
  // Scroll back to top
  await page.evaluate('window.scrollTo(0, 0)');
  await page.waitForTimeout(1000);
}

/**
 * Structured extraction: find ad card containers by their structural patterns.
 * Uses multiple strategies since Meta frequently changes DOM class names.
 */
async function extractAdsStructured(page: Page, competitorName: string): Promise<ScrapedAd[]> {
  const ads: ScrapedAd[] = [];

  try {
    // Strategy 1: Look for "See ad details" links — each one lives inside an ad card
    const detailLinks = await page.$$('a:has-text("See ad details"), a:has-text("Ad details")');
    if (detailLinks.length > 0) {
      console.log(`[AdScraper] Found ${detailLinks.length} "See ad details" links`);
      for (const link of detailLinks.slice(0, 25)) {
        try {
          // Walk up to find the ad card container
          const card = await link.evaluateHandle((el: any) => {
            let parent = el.parentElement;
            for (let i = 0; i < 8; i++) {
              if (!parent) break;
              const text = parent.textContent || '';
              if (text.length > 100 && parent.querySelector('img')) {
                return parent;
              }
              parent = parent.parentElement;
            }
            return parent || el.parentElement;
          });

          const ad = await extractDataFromContainer(card, competitorName);
          if (ad) ads.push(ad);
        } catch { /* skip */ }
      }
    }

    // Strategy 2: Look for ad containers by content pattern
    if (ads.length === 0) {
      const containers = await page.$$('div[role="article"], div:has(img):has(a[href*="facebook.com"])');
      console.log(`[AdScraper] Strategy 2: Found ${containers.length} potential containers`);

      for (const container of containers.slice(0, 25)) {
        try {
          const textLen = await container.evaluate((el: any) => (el.textContent || '').length);
          if (textLen > 50 && textLen < 5000) {
            const ad = await extractDataFromContainer(container, competitorName);
            if (ad) {
              const isDupe = ads.some(a =>
                a.headline.substring(0, 60).toLowerCase() === ad.headline.substring(0, 60).toLowerCase()
              );
              if (!isDupe) ads.push(ad);
            }
          }
        } catch { /* skip */ }
      }
    }

    // Strategy 3: Use "Started running on" date markers to identify ad boundaries
    if (ads.length === 0) {
      const dateMarkers = await page.$$('text=/Started running on/');
      console.log(`[AdScraper] Strategy 3: Found ${dateMarkers.length} date markers`);

      for (const marker of dateMarkers.slice(0, 25)) {
        try {
          const card = await marker.evaluateHandle((el: any) => {
            let parent = el.parentElement;
            for (let i = 0; i < 10; i++) {
              if (!parent) break;
              const text = parent.textContent || '';
              if (text.length > 200) {
                const childDivs = parent.querySelectorAll('div');
                if (childDivs.length < 50) return parent;
              }
              parent = parent.parentElement;
            }
            return parent;
          });

          const ad = await extractDataFromContainer(card, competitorName);
          if (ad) {
            const isDupe = ads.some(a =>
              a.headline.substring(0, 60).toLowerCase() === ad.headline.substring(0, 60).toLowerCase()
            );
            if (!isDupe) ads.push(ad);
          }
        } catch { /* skip */ }
      }
    }
  } catch (error: any) {
    console.warn(`[AdScraper] Structured extraction error: ${error.message}`);
  }

  return ads;
}

/**
 * Extract headline, body, CTA, links, and media from a container element.
 */
async function extractDataFromContainer(container: any, competitorName: string): Promise<ScrapedAd | null> {
  try {
    const data = await container.evaluate((el: any) => {
      const text = el.textContent || '';
      if (text.length < 30) return null;

      const allText = text.trim();

      // Find images (skip tiny icons/avatars)
      const imgs = el.querySelectorAll('img[src*="http"]');
      let mediaUrl = '';
      for (const img of imgs) {
        const src = img.getAttribute('src') || '';
        const width = img.getAttribute('width');
        if (width && parseInt(width) < 50) continue;
        if (src.includes('emoji') || src.includes('icon')) continue;
        if (src) { mediaUrl = src; break; }
      }

      // Find external links (not facebook.com)
      const links = el.querySelectorAll('a[href*="http"]');
      let landingPage = '';
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href && !href.includes('facebook.com') && !href.includes('fb.com')) {
          landingPage = href;
          break;
        }
      }

      // Find CTA buttons
      const buttons = el.querySelectorAll('a[role="button"], button, [role="link"]');
      let cta = '';
      for (const btn of buttons) {
        const btnText = (btn.textContent || '').trim();
        if (btnText.length > 2 && btnText.length < 30 && !btnText.includes('See ad details')) {
          cta = btnText;
          break;
        }
      }

      // Extract "Started running on" date
      const dateMatch = allText.match(/Started running on\s+([A-Za-z0-9, ]+)/i);
      const startedRunning = dateMatch ? dateMatch[1].trim() : '';

      // Extract reach/impressions info
      const reachMatch = allText.match(/(\d[\d,.KMkm]+)\s*(impressions|people reached|reach)/i)
        || allText.match(/reach[:\s]*(\d[\d,.KMkm]*)/i);
      const estimatedReach = reachMatch ? reachMatch[1].trim() : '';

      // Split text into lines for headline/body identification
      const lines = allText
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 3 && !l.match(/^(Started running|Ad Library|See ad details)/i));

      return { allText: allText.substring(0, 1000), lines, mediaUrl, landingPage, cta, startedRunning, estimatedReach };
    });

    if (!data || !data.lines || data.lines.length === 0) return null;

    // Filter out non-ad lines
    const adLines = data.lines.filter((l: string) =>
      !l.match(/^(Sponsored|Active|Inactive|All|About|See|Report|Ad Library|Library|Page|Disclaimer)/i) &&
      l.length > 5
    );

    let headline = '';
    let primaryText = '';

    if (adLines.length >= 2) {
      headline = adLines[0].substring(0, 150);
      primaryText = adLines.slice(1, 5).join(' ').substring(0, 500);
    } else if (adLines.length === 1) {
      headline = adLines[0].substring(0, 150);
    } else {
      headline = data.allText.substring(0, 150);
    }

    if (!headline || headline.length < 5) return null;

    return {
      competitorName,
      headline: cleanText(headline),
      primaryText: cleanText(primaryText),
      cta: data.cta || extractCTA(data.allText),
      mediaUrl: data.mediaUrl || '',
      landingPage: data.landingPage || '',
      platform: 'Meta Ads',
      startedRunning: data.startedRunning || '',
      estimatedReach: data.estimatedReach || '',
    };
  } catch {
    return null;
  }
}

/**
 * Fallback: extract ads by finding leaf-level containers with ad-like content.
 */
async function extractAdsFallback(page: Page, competitorName: string): Promise<ScrapedAd[]> {
  const ads: ScrapedAd[] = [];

  try {
    const textBlocks = await page.evaluate(() => {
      const blocks: { text: string; link: string; img: string; startedRunning: string; estimatedReach: string }[] = [];
      const allDivs = (globalThis as any).document.querySelectorAll('div');

      for (const div of (Array.from(allDivs) as any[])) {
        const text = (div as any).textContent?.trim() || '';
        if (text.length < 80 || text.length > 3000) continue;

        // Skip overly broad containers (too many child divs)
        const childDivs = (div as any).querySelectorAll('div');
        if (childDivs.length > 30) continue;

        const link = (div as any).querySelector('a[href*="http"]')?.getAttribute('href') || '';
        const img = (div as any).querySelector('img[src*="http"]')?.getAttribute('src') || '';
        const isNav = (div as any).closest('nav, header, footer');
        if (isNav) continue;
        if (!link && !img) continue;

        // Must contain ad-like markers
        const hasAdMarker = text.includes('Started running') ||
          text.includes('Sponsored') ||
          /Learn More|Sign Up|Apply Now|Book Now|Enroll|Download|Get Started|Shop Now/i.test(text);

        if (hasAdMarker) {
          // Extract date and reach from block text
          const dm = text.match(/Started running on\s+([A-Za-z0-9, ]+)/i);
          const rm = text.match(/(\d[\d,.KMkm]+)\s*(impressions|people reached|reach)/i)
            || text.match(/reach[:\s]*(\d[\d,.KMkm]*)/i);
          blocks.push({
            text: text.substring(0, 800),
            link,
            img,
            startedRunning: dm ? dm[1].trim() : '',
            estimatedReach: rm ? rm[1].trim() : '',
          });
        }
      }

      // Deduplicate: if one block's text contains another's start, keep the shorter (more specific) one
      const sorted = blocks.sort((a, b) => a.text.length - b.text.length);
      const unique: typeof blocks = [];
      for (const block of sorted) {
        const isSubset = unique.some(u =>
          u.text.includes(block.text.substring(0, 80)) ||
          block.text.includes(u.text.substring(0, 80))
        );
        if (!isSubset) unique.push(block);
      }

      return unique.slice(0, 20);
    });

    for (const block of textBlocks) {
      const lines = block.text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 5 && !l.match(/^(Started running|Ad Library|See ad details|Sponsored)/i));

      if (lines.length === 0) continue;

      ads.push({
        competitorName,
        headline: cleanText(lines[0].substring(0, 150)),
        primaryText: cleanText(lines.slice(1, 5).join(' ').substring(0, 500)),
        cta: extractCTA(block.text),
        mediaUrl: block.img,
        landingPage: block.link,
        platform: 'Meta Ads',
        startedRunning: block.startedRunning || '',
        estimatedReach: block.estimatedReach || '',
      });
    }
  } catch (error: any) {
    console.warn(`[AdScraper] Fallback extraction error: ${error.message}`);
  }

  return ads;
}

/**
 * Extract CTA text from ad content.
 */
function extractCTA(text: string): string {
  const ctaPatterns = [
    'Learn More', 'Sign Up', 'Apply Now', 'Book Now', 'Enroll Now',
    'Register Now', 'Download', 'Get Started', 'Shop Now', 'Contact Us',
    'Get Offer', 'Subscribe', 'Join Now', 'Start Free', 'Watch More',
    'Book Free', 'Talk to', 'Get Callback', 'Install Now', 'Play Now',
    'Order Now', 'Try Free', 'Start Now', 'See More',
  ];

  const lower = text.toLowerCase();
  for (const cta of ctaPatterns) {
    if (lower.includes(cta.toLowerCase())) return cta;
  }
  return '';
}

/**
 * Clean extracted text.
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ===================== GOOGLE ADS TRANSPARENCY CENTER =====================

/**
 * Fetch competitor ads from Google Ads Transparency Center.
 * URL: https://adstransparency.google.com
 */
export async function fetchGoogleAds(competitorName: string): Promise<ScrapedAd[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
    });

    const page = await context.newPage();
    const searchUrl = `https://adstransparency.google.com/?search_text=${encodeURIComponent(competitorName)}&region=IN`;

    console.log(`[GoogleAdScraper] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Click on the first advertiser result if present
    try {
      const advertiserLink = await page.$('a[href*="advertiser"], creative-preview, .advertiser-name, [data-advertiser-id]');
      if (advertiserLink) {
        await advertiserLink.click();
        await page.waitForTimeout(4000);
      }
    } catch { /* continue */ }

    // Scroll to load more ads
    await autoScroll(page, 4);

    // Extract ads from Google Transparency Center
    const ads: ScrapedAd[] = [];
    const adData = await page.evaluate(() => {
      const results: { text: string; link: string; img: string; format: string }[] = [];
      // Google Transparency shows ad creatives in card-like containers
      const cards = (globalThis as any).document.querySelectorAll(
        'creative-preview, [class*="creative"], [class*="ad-card"], [class*="ad-preview"], [role="listitem"]'
      );

      for (const card of Array.from(cards).slice(0, 25) as any[]) {
        const text = (card.textContent || '').trim();
        if (text.length < 20) continue;

        const img = card.querySelector('img[src*="http"]')?.getAttribute('src') || '';
        const link = card.querySelector('a[href*="http"]')?.getAttribute('href') || '';
        const format = card.querySelector('video') ? 'video' : 'image';

        results.push({ text: text.substring(0, 800), link, img, format });
      }

      // Also try general text blocks as fallback
      if (results.length === 0) {
        const containers = (globalThis as any).document.querySelectorAll('div');
        for (const div of Array.from(containers) as any[]) {
          const text = (div.textContent || '').trim();
          if (text.length < 50 || text.length > 2000) continue;
          const childDivs = div.querySelectorAll('div');
          if (childDivs.length > 20) continue;

          const img = div.querySelector('img[src*="http"]')?.getAttribute('src') || '';
          const link = div.querySelector('a[href*="http"]')?.getAttribute('href') || '';
          if (!img && !link) continue;

          // Ad-like markers for Google
          const hasMarker = /ad|creative|sponsored|promoted/i.test(div.className || '') ||
            text.length > 80;
          if (hasMarker) {
            results.push({ text: text.substring(0, 800), link, img, format: 'text' });
          }
        }
      }

      // Deduplicate
      const unique: typeof results = [];
      for (const r of results) {
        const isDupe = unique.some(u => u.text.substring(0, 60) === r.text.substring(0, 60));
        if (!isDupe) unique.push(r);
      }
      return unique.slice(0, 20);
    });

    for (const item of adData) {
      const lines = item.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5);
      if (lines.length === 0) continue;

      ads.push({
        competitorName,
        headline: cleanText(lines[0].substring(0, 150)),
        primaryText: cleanText(lines.slice(1, 5).join(' ').substring(0, 500)),
        cta: extractCTA(item.text),
        mediaUrl: item.img,
        landingPage: item.link,
        platform: 'Google Ads',
        startedRunning: '',
        estimatedReach: '',
      });
    }

    console.log(`[GoogleAdScraper] Extracted ${ads.length} ads for "${competitorName}"`);
    await browser.close();
    return ads;
  } catch (error: any) {
    console.error(`[GoogleAdScraper] Error: ${error.message}`);
    if (browser) await browser.close();
    throw error;
  }
}

// ===================== LINKEDIN AD LIBRARY =====================

/**
 * Fetch competitor ads from LinkedIn Ad Library.
 * URL: https://www.linkedin.com/ad-library/
 */
export async function fetchLinkedInAds(competitorName: string): Promise<ScrapedAd[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
    });

    const page = await context.newPage();
    const searchUrl = `https://www.linkedin.com/ad-library/?q=${encodeURIComponent(competitorName)}`;

    console.log(`[LinkedInAdScraper] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(5000);

    // LinkedIn may show a search box — type and search
    try {
      const searchInput = await page.$('input[type="text"], input[placeholder*="Search"], input[aria-label*="Search"]');
      if (searchInput) {
        await searchInput.fill(competitorName);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
      }
    } catch { /* continue */ }

    // Click on advertiser if results show
    try {
      const firstResult = await page.$('a[href*="ad-library"], button:has-text("View ads"), [data-test-id*="advertiser"]');
      if (firstResult) {
        await firstResult.click();
        await page.waitForTimeout(4000);
      }
    } catch { /* continue */ }

    await autoScroll(page, 4);

    // Extract ads
    const ads: ScrapedAd[] = [];
    const adData = await page.evaluate(() => {
      const results: { text: string; link: string; img: string }[] = [];

      // LinkedIn ad library shows ads in card/list format
      const cards = (globalThis as any).document.querySelectorAll(
        '[class*="ad-card"], [class*="ad-library"], [class*="feed-item"], article, [data-test-id*="ad"]'
      );

      for (const card of Array.from(cards).slice(0, 25) as any[]) {
        const text = (card.textContent || '').trim();
        if (text.length < 30) continue;

        const img = card.querySelector('img[src*="http"]')?.getAttribute('src') || '';
        const link = card.querySelector('a[href*="http"]')?.getAttribute('href') || '';

        results.push({ text: text.substring(0, 800), link, img });
      }

      // Fallback: general containers
      if (results.length === 0) {
        const divs = (globalThis as any).document.querySelectorAll('div');
        for (const div of Array.from(divs) as any[]) {
          const text = (div.textContent || '').trim();
          if (text.length < 50 || text.length > 2000) continue;
          const childDivs = div.querySelectorAll('div');
          if (childDivs.length > 25) continue;

          const img = div.querySelector('img[src*="http"]')?.getAttribute('src') || '';
          const link = div.querySelector('a[href*="http"]')?.getAttribute('href') || '';
          if (!img && !link) continue;

          const hasAdContent = /sponsored|promoted|ad library|advertiser/i.test(text) ||
            /Learn More|Sign Up|Apply|Download|Get Started/i.test(text);
          if (hasAdContent) {
            results.push({ text: text.substring(0, 800), link, img });
          }
        }
      }

      const unique: typeof results = [];
      for (const r of results) {
        const isDupe = unique.some(u => u.text.substring(0, 60) === r.text.substring(0, 60));
        if (!isDupe) unique.push(r);
      }
      return unique.slice(0, 20);
    });

    for (const item of adData) {
      const lines = item.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5);
      if (lines.length === 0) continue;

      ads.push({
        competitorName,
        headline: cleanText(lines[0].substring(0, 150)),
        primaryText: cleanText(lines.slice(1, 5).join(' ').substring(0, 500)),
        cta: extractCTA(item.text),
        mediaUrl: item.img,
        landingPage: item.link,
        platform: 'LinkedIn',
        startedRunning: '',
        estimatedReach: '',
      });
    }

    console.log(`[LinkedInAdScraper] Extracted ${ads.length} ads for "${competitorName}"`);
    await browser.close();
    return ads;
  } catch (error: any) {
    console.error(`[LinkedInAdScraper] Error: ${error.message}`);
    if (browser) await browser.close();
    throw error;
  }
}

// ===================== MULTI-PLATFORM DISPATCHER =====================

export type ScrapePlatform = 'meta' | 'google' | 'linkedin' | 'all';

export interface ScrapeResult {
  ads: ScrapedAd[];
  errors: string[];
}

/**
 * Fetch competitor ads from one or more platforms.
 */
export async function fetchAdsFromPlatforms(
  competitorName: string,
  platforms: ScrapePlatform[] = ['meta']
): Promise<ScrapeResult> {
  const allAds: ScrapedAd[] = [];
  const errors: string[] = [];

  // If 'all', expand to all platforms
  const targets = platforms.includes('all') ? ['meta', 'google', 'linkedin'] as ScrapePlatform[] : platforms;

  for (const platform of targets) {
    try {
      let ads: ScrapedAd[] = [];
      switch (platform) {
        case 'meta':
          ads = await fetchCompetitorAds(competitorName);
          break;
        case 'google':
          ads = await fetchGoogleAds(competitorName);
          break;
        case 'linkedin':
          ads = await fetchLinkedInAds(competitorName);
          break;
      }
      allAds.push(...ads);
      console.log(`[MultiScraper] ${platform}: ${ads.length} ads`);
    } catch (error: any) {
      const msg = `${platform}: ${error.message}`;
      console.error(`[MultiScraper] ${msg}`);
      errors.push(msg);
    }
  }

  return { ads: allAds, errors };
}
