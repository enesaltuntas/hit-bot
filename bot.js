import { chromium, devices } from 'playwright';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class PlaywrightBot {
  constructor() {
    this.deviceProfiles = {
      'Pc': 'Desktop Chrome',
      'iPhone': 'iPhone 13 Pro',
      'iPhone 13': 'iPhone 13 Pro',
      'iPhone 13 Pro': 'iPhone 13 Pro',
      'iPad': 'iPad Pro 11',
      'iPad Pro': 'iPad Pro 11',
      'Android': 'Pixel 7'
    };

    this.timezones = [
      'UTC',
      'Europe/London',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney',
      'America/Chicago',
      'Europe/Berlin',
      'Asia/Shanghai'
    ];

    this.locales = [
      'en-US',
      'en-GB',
      'en-CA',
      'en-AU',
      'fr-FR',
      'de-DE',
      'es-ES',
      'it-IT',
      'pt-BR',
      'tr-TR'
    ];

    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  parseArguments() {
    const args = process.argv.slice(2);
    const params = {};
    
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace('--', '');
      const value = args[i + 1];
      if (key && value !== undefined) {
        params[key] = value;
      } else if (key === 'headless' && value === undefined) {
        // Handle --headless flag without value
        params[key] = 'true';
      }
    }

    // Validate required parameters
    if (!params.device || !params.keyword || !params.domain) {
      console.error('ERROR: Missing required parameters');
      console.log('Usage: node bot.js --device <device> --keyword <keyword> --domain <domain> [--proxy <proxy>] [--headless <true|false>]');
      console.log('Examples:');
      console.log('  node bot.js --device "Pc" --keyword "best restaurants" --domain "yelp.com"');
      console.log('  node bot.js --device "iPhone 13 Pro" --keyword "weather" --domain "weather.com" --headless false');
      process.exit(1);
    }

    // Set defaults
    params.headless = params.headless !== 'false';

    return params;
  }

  getDeviceProfile(deviceName) {
    const mappedDevice = this.deviceProfiles[deviceName] || deviceName;
    
    if (devices[mappedDevice]) {
      return { name: mappedDevice, config: devices[mappedDevice] };
    }
    
    // Fallback to Desktop Chrome if device not found
    console.log(`WARN: Device "${deviceName}" not found, falling back to Desktop Chrome`);
    return { name: 'Desktop Chrome', config: devices['Desktop Chrome'] };
  }

  generateRandomFingerprint(deviceConfig) {
    const timezone = this.timezones[Math.floor(Math.random() * this.timezones.length)];
    const locale = this.locales[Math.floor(Math.random() * this.locales.length)];
    
    // Use device-specific user agent if available, otherwise random
    const userAgent = deviceConfig.userAgent || 
                     this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    
    // Generate random viewport with some variance from device defaults
    const baseViewport = deviceConfig.viewport || { width: 1920, height: 1080 };
    const viewport = {
      width: baseViewport.width + Math.floor(Math.random() * 100) - 50,
      height: baseViewport.height + Math.floor(Math.random() * 100) - 50
    };

    return {
      userAgent,
      viewport,
      timezone,
      locale
    };
  }

  async launchBrowser(deviceConfig, fingerprint, proxy, headless) {
    const launchOptions = {
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        `--user-agent=${fingerprint.userAgent}`,
        `--lang=${fingerprint.locale}`
      ]
    };

    if (proxy) {
      launchOptions.proxy = { server: proxy };
      console.log(`INFO: Using proxy: ${proxy}`);
    }

    const browser = await chromium.launch(launchOptions);
    
    const contextOptions = {
      ...deviceConfig,
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezone,
      permissions: [],
      ignoreHTTPSErrors: true
    };

    const context = await browser.newContext(contextOptions);
    
    // Block unnecessary resources for speed
    await context.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    return { browser, context };
  }

  async searchGoogle(context, keyword, targetDomain) {
    const page = await context.newPage();
    
    try {
      console.log(`INFO: Searching Google for keyword: "${keyword}"`);
      
      // Navigate to Google
      await page.goto('https://www.google.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Handle cookie consent if present
      try {
        await page.click('button:has-text("Accept all")', { timeout: 2000 });
      } catch (e) {
        // Cookie consent not found or already handled
      }

      // Find search input and perform search
      const searchInput = await page.locator('input[name="q"], textarea[name="q"]').first();
      await searchInput.fill(keyword);
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForSelector('div#search', { timeout: 15000 });
      
      console.log('INFO: Search results loaded, extracting URLs...');

      // Extract search result URLs
      const searchResults = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('div#search a[href^="http"]:not([href*="google.com])');
        
        for (const link of links) {
          const url = link.href;
          const title = link.textContent?.trim() || '';
          
          // Skip if URL contains common Google redirect patterns
          if (!url.includes('/url?') && !url.includes('webcache') && url.startsWith('http')) {
            results.push({ url, title });
          }
          
          // Limit to first 10 results
          if (results.length >= 10) break;
        }
        
        return results;
      });

      if (searchResults.length === 0) {
        throw new Error('No search results found');
      }

      console.log(`INFO: Found ${searchResults.length} search results`);

      // Find target URL
      const targetUrl = this.findTargetUrl(searchResults, targetDomain);
      
      return targetUrl;

    } finally {
      await page.close();
    }
  }

  findTargetUrl(searchResults, targetDomain) {
    console.log(`INFO: Looking for domain: "${targetDomain}"`);
    
    // First, try to find a result matching the target domain
    for (const result of searchResults) {
      try {
        const resultDomain = new URL(result.url).hostname.toLowerCase();
        if (resultDomain.includes(targetDomain.toLowerCase()) || 
            targetDomain.toLowerCase().includes(resultDomain)) {
          console.log(`INFO: Found matching domain: ${result.url}`);
          return result.url;
        }
      } catch (error) {
        console.log(`WARN: Invalid URL in search result: ${result.url}`);
      }
    }

    // Fallback to first result
    const firstUrl = searchResults[0].url;
    console.log(`INFO: No domain match found, using first result: ${firstUrl}`);
    return firstUrl;
  }

  async visitPage(context, url, headless) {
    const page = await context.newPage();
    
    // Add random delay to mimic human behavior
    const delay = Math.floor(Math.random() * 300) + 200; // 200-500ms
    console.log(`INFO: Adding human-like delay: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`INFO: Navigating to target page: ${url}`);
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log(`INFO: Successfully loaded target page: ${url}`);
      
      // If not headless, wait for observation
      if (!headless) {
        console.log('INFO: Browser running in visible mode, waiting 3 seconds for observation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      throw new Error(`Failed to load target page: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async run() {
    const startTime = Date.now();
    console.log('INFO: Starting Playwright automation bot...\n');

    try {
      // Parse command line arguments
      const params = this.parseArguments();
      console.log(`INFO: Parsed arguments:`, params);

      // Get device profile
      const deviceProfile = this.getDeviceProfile(params.device);
      console.log(`INFO: Selected device profile: ${deviceProfile.name}`);

      // Generate random fingerprint
      const fingerprint = this.generateRandomFingerprint(deviceProfile.config);
      console.log(`INFO: Generated fingerprint:`);
      console.log(`  - User-Agent: ${fingerprint.userAgent}`);
      console.log(`  - Viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
      console.log(`  - Timezone: ${fingerprint.timezone}`);
      console.log(`  - Locale: ${fingerprint.locale}\n`);

      // Launch browser
      console.log('INFO: Launching browser...');
      const { browser, context } = await this.launchBrowser(
        deviceProfile.config,
        fingerprint,
        params.proxy,
        params.headless
      );

      try {
        // Search Google and get target URL
        const targetUrl = await this.searchGoogle(context, params.keyword, params.domain);
        
        // Visit target page
        await this.visitPage(context, targetUrl, params.headless);

        const duration = Date.now() - startTime;
        console.log(`\nDONE: Automation completed successfully in ${duration}ms`);
        console.log(`DONE: Visited URL: ${targetUrl}`);
        
      } finally {
        await context.close();
        await browser.close();
      }
      
    } catch (error) {
      console.error(`ERROR: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the bot
const bot = new PlaywrightBot();
bot.run().catch(error => {
  console.error(`FATAL ERROR: ${error.message}`);
  process.exit(1);
});