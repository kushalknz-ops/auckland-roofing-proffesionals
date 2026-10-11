import http from 'node:http';
import { spawn } from 'node:child_process';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3457;
const BASE_URL = `http://localhost:${PORT}`;

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Commercial', path: '/commercial' },
  { name: 'Residential', path: '/residential' },
  { name: 'Service', path: '/service?id=metal-roofs-cladding' },
  { name: 'Contact', path: '/contact' }
];

async function runLighthouse(url, formFactor) {
  const chrome = await chromeLauncher.launch({
    chromePath: CHROME_PATH,
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });

  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  const config = formFactor === 'desktop' ? {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      }
    }
  } : {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false
      },
    }
  };

  const runnerResult = await lighthouse(url, options, config);
  await chrome.kill();

  const lhr = runnerResult.lhr;
  return {
    performance: Math.round((lhr.categories.performance?.score || 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
    seo: Math.round((lhr.categories.seo?.score || 0) * 100),
    fcp: lhr.audits['first-contentful-paint']?.displayValue,
    lcp: lhr.audits['largest-contentful-paint']?.displayValue,
    tbt: lhr.audits['total-blocking-time']?.displayValue,
    cls: lhr.audits['cumulative-layout-shift']?.displayValue,
    speedIndex: lhr.audits['speed-index']?.displayValue,
    diagnostics: {
      renderBlocking: lhr.audits['render-blocking-resources']?.details?.items?.map(i => ({ url: i.url, wastedMs: i.wastedMs })),
      unusedCss: lhr.audits['unused-css-rules']?.details?.items?.map(i => ({ url: i.url, wastedBytes: i.wastedBytes })),
      unusedJs: lhr.audits['unused-javascript']?.details?.items?.map(i => ({ url: i.url, wastedBytes: i.wastedBytes })),
      unoptimizedImages: lhr.audits['modern-image-formats']?.details?.items?.map(i => ({ url: i.url, wastedBytes: i.wastedBytes })),
      oversizedImages: lhr.audits['uses-responsive-images']?.details?.items?.map(i => ({ url: i.url, wastedBytes: i.wastedBytes })),
    }
  };
}

async function main() {
  console.log(`Starting server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit'
  });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const results = {};
    for (const page of pages) {
      const url = `${BASE_URL}${page.path}`;
      console.log(`\nAuditing ${page.name} (${url})...`);
      
      console.log(`  Running Mobile audit...`);
      const mobileResult = await runLighthouse(url, 'mobile');
      console.log(`  Mobile Score: Perf=${mobileResult.performance}, FCP=${mobileResult.fcp}, LCP=${mobileResult.lcp}, TBT=${mobileResult.tbt}, CLS=${mobileResult.cls}`);
      
      console.log(`  Running Desktop audit...`);
      const desktopResult = await runLighthouse(url, 'desktop');
      console.log(`  Desktop Score: Perf=${desktopResult.performance}, FCP=${desktopResult.fcp}, LCP=${desktopResult.lcp}, TBT=${desktopResult.tbt}, CLS=${desktopResult.cls}`);

      results[page.name] = { mobile: mobileResult, desktop: desktopResult };
    }

    const fs = await import('node:fs');
    fs.writeFileSync('lighthouse-optimized.json', JSON.stringify(results, null, 2));
    console.log('\nSaved optimized results to lighthouse-optimized.json');

  } finally {
    serverProcess.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
