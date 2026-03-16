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
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for ads container to appear
    await page.waitForTimeout(5000);

    // Scroll to load more ads
    await autoScroll(page, 3);

    // Extract ad data from the page
    const ads = await extractAds(page, competitorName);

    console.log(`[AdScraper] Extracted ${ads.length} ads for "${competitorName}"`);

    await browser.close();
    return ads;
  } catch (error: any) {
    console.error(`[AdScraper] Error scraping ads for "${competitorName}":`, error.message);
    if (browser) {
      await browser.close();
    }
    return [];
  }
}

/**
 * Auto-scroll the page to trigger lazy-loading of more ads.
 */
async function autoScroll(page: Page, rounds: number = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });
    await page.waitForTimeout(2000);
  }
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

/**
 * Extract ad data from the Meta Ads Library page.
 * Uses multiple selector strategies since Meta frequently changes their DOM.
 */
async function extractAds(page: Page, competitorName: string): Promise<ScrapedAd[]> {
  const ads: ScrapedAd[] = [];

  try {
    // Strategy: Look for ad card containers
    // Meta Ads Library typically renders ads in div containers with specific data attributes
    const adElements = await page.$$('[class*="ad"]');

    // Try to find ad containers with common patterns
    const adContainers = await page.$$('div[role="article"], div[class*="_7jvw"], div[class*="xrvj5dj"]');

    if (adContainers.length > 0) {
      for (const container of adContainers.slice(0, 20)) {
        try {
          const ad = await extractSingleAd(container, competitorName);
          if (ad && ad.headline) {
            ads.push(ad);
          }
        } catch {
          // Skip individual ad extraction errors
        }
      }
    }

    // Fallback: try generic text extraction if structured extraction fails
    if (ads.length === 0) {
      const fallbackAds = await extractAdsFallback(page, competitorName);
      ads.push(...fallbackAds);
    }
  } catch (error: any) {
    console.warn(`[AdScraper] Extraction error: ${error.message}`);
  }

  return ads;
}

/**
 * Extract data from a single ad container element.
 */
async function extractSingleAd(container: any, competitorName: string): Promise<ScrapedAd | null> {
  try {
    const textContent = await container.textContent();
    if (!textContent || textContent.trim().length < 10) return null;

    // Try to extract structured parts
    const headline = await safeText(container, 'span[class*="x8t9es0"], strong, h3, [role="heading"]');
    const primaryText = await safeText(container, 'div[class*="xdj266r"], span[class*="x1lliihq"], p');
    const cta = await safeText(container, 'a[class*="x1i10hfl"], button, [role="button"]');
    const landingPage = await safeAttribute(container, 'a[href*="http"]', 'href');
    const mediaUrl = await safeAttribute(container, 'img[src*="http"]', 'src');

    if (!headline && !primaryText) return null;

    return {
      competitorName,
      headline: cleanText(headline || primaryText?.substring(0, 100) || ''),
      primaryText: cleanText(primaryText || ''),
      cta: cleanText(cta || ''),
      mediaUrl: mediaUrl || '',
      landingPage: landingPage || '',
      platform: 'Meta Ads',
    };
  } catch {
    return null;
  }
}

/**
 * Fallback: extract ads by looking for text blocks on the page.
 */
async function extractAdsFallback(page: Page, competitorName: string): Promise<ScrapedAd[]> {
  const ads: ScrapedAd[] = [];

  try {
    // Get all visible text blocks that look like ads
    const textBlocks = await page.evaluate(() => {
      const blocks: { text: string; link: string; img: string }[] = [];
      const allDivs = document.querySelectorAll('div');

      for (const div of allDivs) {
        const text = div.textContent?.trim() || '';
        // Look for divs with substantial text that could be ad content
        if (text.length > 50 && text.length < 2000) {
          const link = div.querySelector('a[href*="http"]')?.getAttribute('href') || '';
          const img = div.querySelector('img[src*="http"]')?.getAttribute('src') || '';

          // Avoid duplicates and navigation elements  
          const isNav = div.closest('nav, header, footer');
          if (!isNav && (link || img)) {
            blocks.push({ text: text.substring(0, 500), link, img });
          }
        }
      }

      // Deduplicate by text similarity
      const unique: typeof blocks = [];
      for (const block of blocks) {
        const isDupe = unique.some(u => u.text.substring(0, 100) === block.text.substring(0, 100));
        if (!isDupe) unique.push(block);
      }

      return unique.slice(0, 15);
    });

    for (const block of textBlocks) {
      // Split text into potential headline and body
      const lines = block.text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      if (lines.length === 0) continue;

      ads.push({
        competitorName,
        headline: lines[0].substring(0, 150),
        primaryText: lines.slice(1, 4).join(' ').substring(0, 500),
        cta: extractCTA(block.text),
        mediaUrl: block.img,
        landingPage: block.link,
        platform: 'Meta Ads',
      });
    }
  } catch (error: any) {
    console.warn(`[AdScraper] Fallback extraction error: ${error.message}`);
  }

  return ads;
}

/**
 * Safely extract text from an element using a selector.
 */
async function safeText(parent: any, selector: string): Promise<string> {
  try {
    const el = await parent.$(selector);
    if (!el) return '';
    return (await el.textContent()) || '';
  } catch {
    return '';
  }
}

/**
 * Safely extract an attribute from an element using a selector.
 */
async function safeAttribute(parent: any, selector: string, attr: string): Promise<string> {
  try {
    const el = await parent.$(selector);
    if (!el) return '';
    return (await el.getAttribute(attr)) || '';
  } catch {
    return '';
  }
}

/**
 * Extract CTA text from ad content.
 */
function extractCTA(text: string): string {
  const ctaPatterns = [
    'Learn More', 'Sign Up', 'Apply Now', 'Book Now', 'Enroll Now',
    'Register Now', 'Download', 'Get Started', 'Shop Now', 'Contact Us',
    'Get Offer', 'Subscribe', 'Join Now', 'Start Free', 'Watch More',
    'Book Free', 'Talk to', 'Get Callback',
  ];

  const lower = text.toLowerCase();
  for (const cta of ctaPatterns) {
    if (lower.includes(cta.toLowerCase())) return cta;
  }
  return '';
}

/**
 * Clean extracted text — remove extra whitespace and newlines.
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().substring(0, 500);
}
