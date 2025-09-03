import { chromium, devices } from 'playwright';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

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
      // Chrome 131 (Latest)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      // Chrome 130
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      // Firefox 132 (Latest)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
      // Safari
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      // Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
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

    // Generate additional fingerprinting data
    const webGLVendor = ['Intel Inc.', 'NVIDIA Corporation', 'AMD', 'Google Inc.'][Math.floor(Math.random() * 4)];
    const webGLRenderer = [
      'Intel Iris OpenGL Engine',
      'NVIDIA GeForce GTX 1060',
      'AMD Radeon Pro 560X OpenGL Engine',
      'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)'
    ][Math.floor(Math.random() * 4)];

    return {
      userAgent,
      viewport,
      timezone,
      locale,
      webGLVendor,
      webGLRenderer
    };
  }

  async launchBrowser(deviceConfig, fingerprint, proxy, headless) {
    const launchOptions = {
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor,TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation=false',
        '--password-store=basic',
        '--use-mock-keychain',
        `--user-agent=${fingerprint.userAgent}`,
        `--lang=${fingerprint.locale}`,
        `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`
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
    
    // Add stealth scripts to avoid detection
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock chrome runtime
      window.chrome = {
        runtime: {},
      };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Mock WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter(parameter);
      };
    });
    
    // Block unnecessary resources for speed but allow some images for realism
    await context.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      const url = route.request().url();
      
      // Block most media but allow some for realism
      if (resourceType === 'image' && Math.random() > 0.3) {
        route.abort();
      } else if (['font', 'media'].includes(resourceType)) {
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
      
      // Add random delay before starting
      const initialDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
      console.log(`INFO: Initial delay: ${initialDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      
      // Navigate to Google with retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await page.goto('https://www.google.com', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });

          // Check if we're on a CAPTCHA page
          const currentUrl = page.url();
          if (currentUrl.includes('/sorry/') || currentUrl.includes('captcha')) {
            console.log(`WARN: CAPTCHA detected (attempt ${retryCount + 1}/${maxRetries})`);
            retryCount++;
            if (retryCount < maxRetries) {
              const retryDelay = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
              console.log(`INFO: Waiting ${retryDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            } else {
              throw new Error('CAPTCHA encountered after maximum retries. Try using a proxy or different user agent.');
            }
          }

          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          console.log(`WARN: Navigation failed (attempt ${retryCount}/${maxRetries}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Simulate human behavior - move mouse randomly
      await page.mouse.move(
        Math.floor(Math.random() * 800) + 100,
        Math.floor(Math.random() * 600) + 100
      );

      // Handle cookie consent if present
      try {
        const cookieButtons = [
          'button:has-text("Accept all")',
          'button:has-text("I agree")',
          'button:has-text("Accept")',
          '#L2AGLb', // Google's "I agree" button ID
          '[aria-label*="Accept"]'
        ];
        
        for (const selector of cookieButtons) {
          try {
            await page.click(selector, { timeout: 1000 });
            console.log(`INFO: Clicked cookie consent: ${selector}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          } catch (e) {
            // Try next selector
          }
        }
      } catch (e) {
        // Cookie consent not found or already handled
      }

      // Find search input and perform search with human-like typing
      const searchInput = await page.locator('input[name="q"], textarea[name="q"]').first();
      
      // Click on search input first
      await searchInput.click();
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 200));
      
      // Type with human-like delays
      for (let i = 0; i < keyword.length; i++) {
        await searchInput.type(keyword[i]);
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 150) + 50));
      }
      
      // Random delay before pressing Enter
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
      await searchInput.press('Enter');

      // Wait for search results with better error handling
      try {
        await page.waitForSelector('div#search', { timeout: 15000 });
      } catch (error) {
        // Check if we're on CAPTCHA page again
        const currentUrl = page.url();
        if (currentUrl.includes('/sorry/') || currentUrl.includes('captcha')) {
          throw new Error('CAPTCHA encountered during search. Please try again later or use a proxy.');
        }
        throw error;
      }
      
      console.log('INFO: Search results loaded, extracting URLs...');

      // Extract search results and find target domain
      console.log(`INFO: Looking for domain: "${targetDomain}"`);
      
      const targetLink = await page.evaluate((domain) => {
        const links = document.querySelectorAll('div#search a[href^="http"]:not([href*="google.com"])');
        
        for (const link of links) {
          const url = link.href;
          
          // Skip if URL contains common Google redirect patterns
          if (url.includes('/url?') || url.includes('webcache') || !url.startsWith('http')) {
            continue;
          }
          
          try {
            const linkDomain = new URL(url).hostname.toLowerCase();
            if (linkDomain.includes(domain.toLowerCase()) || 
                domain.toLowerCase().includes(linkDomain)) {
              return {
                url: url,
                title: link.textContent?.trim() || '',
                element: link
              };
            }
          } catch (error) {
            continue;
          }
        }
        return null;
      }, targetDomain);

      if (!targetLink) {
        console.log(`INFO: Target domain "${targetDomain}" not found on page 1, checking page 2...`);
        
        // Try to go to page 2
        const nextPageFound = await this.goToNextPage(page);
        
        if (nextPageFound) {
          // Search again on page 2
          const targetLinkPage2 = await page.evaluate((domain) => {
            const links = document.querySelectorAll('div#search a[href^="http"]:not([href*="google.com"])');
            
            for (const link of links) {
              const url = link.href;
              
              // Skip if URL contains common Google redirect patterns
              if (url.includes('/url?') || url.includes('webcache') || !url.startsWith('http')) {
                continue;
              }
              
              try {
                const linkDomain = new URL(url).hostname.toLowerCase();
                if (linkDomain.includes(domain.toLowerCase()) || 
                    domain.toLowerCase().includes(linkDomain)) {
                  return {
                    url: url,
                    title: link.textContent?.trim() || ''
                  };
                }
              } catch (error) {
                continue;
              }
            }
            return null;
          }, targetDomain);

          if (targetLinkPage2) {
            console.log(`INFO: Found target domain on page 2: ${targetLinkPage2.url}`);
            
            // Click on the target link on page 2
            console.log('INFO: Clicking on target link from page 2...');
            
            // Add human-like delay before clicking
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
            
            // Find and click the link
            const linkSelector = `a[href="${targetLinkPage2.url}"]`;
            try {
              await page.click(linkSelector);
              console.log('INFO: Successfully clicked on target link from page 2');
              
              // Wait for navigation
              await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
              
              const finalUrl = page.url();
              console.log(`INFO: Navigated to: ${finalUrl}`);
              
              return finalUrl;
              
            } catch (error) {
              console.log(`WARN: Could not click link from page 2, navigating directly: ${error.message}`);
              return targetLinkPage2.url;
            }
          }
        }
        
        // Fallback: get all results from current page and use first one
        const allResults = await page.evaluate(() => {
          const results = [];
          const links = document.querySelectorAll('div#search a[href^="http"]:not([href*="google.com"])');
          
          for (const link of links) {
            const url = link.href;
            if (!url.includes('/url?') && !url.includes('webcache') && url.startsWith('http')) {
              results.push({
                url: url,
                title: link.textContent?.trim() || ''
              });
              if (results.length >= 10) break;
            }
          }
          return results;
        });

        if (allResults.length === 0) {
          throw new Error('No search results found on either page');
        }

        console.log(`WARN: Target domain "${targetDomain}" not found on pages 1-2`);
        console.log(`INFO: Found ${allResults.length} search results, using first result: ${allResults[0].url}`);
        return allResults[0].url;
      }

      console.log(`INFO: Found target domain in search results: ${targetLink.url}`);
      
      // Click on the target link
      console.log('INFO: Clicking on target link...');
      
      // Add human-like delay before clicking
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
      
      // Find and click the link
      const linkSelector = `a[href="${targetLink.url}"]`;
      try {
        await page.click(linkSelector);
        console.log('INFO: Successfully clicked on target link');
        
        // Wait for navigation
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        
        const finalUrl = page.url();
        console.log(`INFO: Navigated to: ${finalUrl}`);
        
        return finalUrl;
        
      } catch (error) {
        console.log(`WARN: Could not click link, navigating directly: ${error.message}`);
        return targetLink.url;
      }

    } finally {
      await page.close();
    }
  }



  async goToNextPage(page) {
    try {
      console.log('INFO: Attempting to go to next page...');
      
      // Add human-like delay before clicking next
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
      
      // Try different selectors for the "Next" button
      const nextSelectors = [
        'a#pnnext',  // Google's standard next button ID
        'a[aria-label="Next"]',
        'a[aria-label="Sonraki"]', // Turkish
        'a[aria-label="Suivant"]', // French  
        'a:has-text("Next")',
        'a:has-text("Sonraki")',
        'a:has-text("Suivant")',
        'td.b:last-child a', // Table-based pagination
        '[role="navigation"] a:last-child'
      ];
      
      for (const selector of nextSelectors) {
        try {
          const nextButton = await page.locator(selector).first();
          if (await nextButton.isVisible({ timeout: 2000 })) {
            console.log(`INFO: Found next button with selector: ${selector}`);
            
            // Scroll to the button if needed
            await nextButton.scrollIntoViewIfNeeded();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Click the next button
            await nextButton.click();
            console.log('INFO: Successfully clicked next button');
            
            // Wait for the new page to load
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            
            // Verify we're on page 2 by checking URL or page indicators
            const currentUrl = page.url();
            if (currentUrl.includes('start=') || currentUrl.includes('page=2')) {
              console.log('INFO: Successfully navigated to page 2');
              return true;
            }
            
            // Alternative check: look for page 2 indicators
            const pageIndicator = await page.locator('td.cur:has-text("2")').first().isVisible({ timeout: 3000 });
            if (pageIndicator) {
              console.log('INFO: Successfully navigated to page 2 (verified by page indicator)');
              return true;
            }
            
            console.log('INFO: Clicked next but page verification unclear, proceeding...');
            return true;
            
          }
        } catch (error) {
          // Try next selector
          continue;
        }
      }
      
      console.log('WARN: Could not find next button');
      return false;
      
    } catch (error) {
      console.log(`WARN: Error navigating to next page: ${error.message}`);
      return false;
    }
  }

  async simulateUserBehavior(page, headless) {
    try {
      console.log('INFO: Simulating user behavior on current page...');
      
      // Wait a moment for page to fully load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Random mouse movements
      const mouseMovements = Math.floor(Math.random() * 3) + 2; // 2-4 movements
      for (let i = 0; i < mouseMovements; i++) {
        await page.mouse.move(
          Math.floor(Math.random() * 800) + 100,
          Math.floor(Math.random() * 600) + 100,
          { steps: 10 }
        );
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
      }
      
      // Random scrolling
      const scrollActions = Math.floor(Math.random() * 3) + 1; // 1-3 scrolls
      for (let i = 0; i < scrollActions; i++) {
        const scrollY = Math.floor(Math.random() * 500) + 200;
        await page.evaluate((y) => {
          window.scrollBy(0, y);
        }, scrollY);
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      }
      
      // Stay on page for a realistic amount of time
      const stayTime = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
      console.log(`INFO: Staying on page for ${stayTime}ms to simulate reading...`);
      await new Promise(resolve => setTimeout(resolve, stayTime));
      
      // If not headless, wait for additional observation
      if (!headless) {
        console.log('INFO: Browser running in visible mode, waiting 5 seconds for observation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.log(`WARN: Error during user behavior simulation: ${error.message}`);
    }
  }

  async visitPage(context, url, headless) {
    const page = await context.newPage();
    
    try {
      // Add random delay to mimic human behavior
      const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
      console.log(`INFO: Adding human-like delay: ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`INFO: Navigating to target page: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log(`INFO: Successfully loaded target page: ${url}`);
      
      // Simulate human behavior on the page
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Random mouse movements
      const mouseMovements = Math.floor(Math.random() * 3) + 2; // 2-4 movements
      for (let i = 0; i < mouseMovements; i++) {
        await page.mouse.move(
          Math.floor(Math.random() * 800) + 100,
          Math.floor(Math.random() * 600) + 100,
          { steps: 10 }
        );
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));
      }
      
      // Random scrolling
      const scrollActions = Math.floor(Math.random() * 3) + 1; // 1-3 scrolls
      for (let i = 0; i < scrollActions; i++) {
        const scrollY = Math.floor(Math.random() * 500) + 200;
        await page.evaluate((y) => {
          window.scrollBy(0, y);
        }, scrollY);
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      }
      
      // Stay on page for a realistic amount of time
      const stayTime = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
      console.log(`INFO: Staying on page for ${stayTime}ms to simulate reading...`);
      await new Promise(resolve => setTimeout(resolve, stayTime));
      
      // If not headless, wait for additional observation
      if (!headless) {
        console.log('INFO: Browser running in visible mode, waiting 5 seconds for observation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
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
        // Search Google and click on target domain
        const targetUrl = await this.searchGoogle(context, params.keyword, params.domain);
        
        // If searchGoogle returned a URL without clicking (fallback case), visit the page
        if (targetUrl && !targetUrl.includes('sorry')) {
          // Check if we're already on the target page
          const currentPage = context.pages()[context.pages().length - 1];
          const currentUrl = currentPage ? currentPage.url() : '';
          
          if (!currentUrl.includes(targetUrl.split('/')[2])) {
            console.log('INFO: Need to visit target page separately...');
            await this.visitPage(context, targetUrl, params.headless);
          } else {
            console.log('INFO: Already on target page, simulating user behavior...');
            await this.simulateUserBehavior(currentPage, params.headless);
          }
        }

        const duration = Date.now() - startTime;
        console.log(`\nDONE: Automation completed successfully in ${duration}ms`);
        console.log(`DONE: Final URL: ${targetUrl}`);
        
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