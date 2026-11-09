# Auckland Roof Professionals performance audit

8 November 2026 NZDT

## Public site baseline from Google PageSpeed Insights

The repository identifies `https://aucklandroofprofessionals.nz/` as canonical. Google Public DNS returned NXDOMAIN for that domain during the audit. The documented Cloudflare Pages hostname responded with HTTP 200 and served a different build from the checkout, so its results are a separate production snapshot.

| Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 80 | 100 | 100 | 100 | 5.3 s | 0 | 90 ms |
| Desktop | 98 | 100 | 96 | 100 | 1.0 s | 0.004 | 30 ms |

Google reported insufficient real-user data in both profiles. Mobile lab LCP was poor and desktop lab LCP was within the good threshold. Both lab CLS values were within the good threshold. Field LCP, INP and CLS are unavailable, so a field Core Web Vitals pass cannot be determined. Lighthouse navigation reports TBT as a main-thread blocking diagnostic. INP requires actual interaction data. Google's good field thresholds are LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile. [Google Web Vitals](https://web.dev/articles/vitals)

[Mobile PageSpeed Insights report](https://pagespeed.web.dev/analysis/https-auckland-roof-professionals-pages-dev/a8rbhkybie?form_factor=mobile) · [Desktop PageSpeed Insights report](https://pagespeed.web.dev/analysis/https-auckland-roof-professionals-pages-dev/a8rbhkybie?form_factor=desktop)

The desktop best-practices report surfaced CSP, HSTS and Trusted Types diagnostics. The automated accessibility and SEO scores cover the tested homepage and checks only. In particular, the SEO score does not validate DNS for the canonical hostname.

## Live PageSpeed Insights comparison after deployment

The optimisations were deployed on 9 November 2026 NZDT. The fresh Google report uses Lighthouse 13.6.0 and tests the same public Cloudflare Pages homepage as the baseline.

| Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | FCP | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 80 → 89 | 100 → 100 | 100 → 100 | 100 → 100 | 5.3 s → 3.8 s | 0 → 0 | 90 ms → 50 ms | 0.9 s → 0.9 s | 1.8 s → 1.5 s |
| Desktop | 98 → 99 | 100 → 100 | 96 → 96 | 100 → 100 | 1.0 s → 1.0 s | 0.004 → 0.004 | 30 ms → 40 ms | 0.2 s → 0.2 s | 0.9 s → 0.7 s |

Mobile LCP improved by 1.5 s, about 28%, and remains above the 2.5 s good threshold. Google confirmed that mobile selected the smaller WebP and desktop selected the full-size poster. Its estimated mobile image-delivery savings fell from 458 KiB to 296 KiB. The new mobile run still flagged render-blocking requests, with estimated savings of 660 ms, along with 31 KiB of unused JavaScript and 12 KiB of unused CSS. These are lab measurements and estimates. Chrome UX Report still shows insufficient field data for LCP, INP and CLS on both profiles.

[Mobile before](https://pagespeed.web.dev/analysis/https-auckland-roof-professionals-pages-dev/a8rbhkybie?form_factor=mobile) · [Mobile after](https://pagespeed.web.dev/analysis/https-auckland-roof-professionals-pages-dev/4bzd7uyju2?form_factor=mobile) · [Desktop before](https://pagespeed.web.dev/analysis/https-auckland-roof-professionals-pages-dev/a8rbhkybie?form_factor=desktop) · [Desktop after](https://pagespeed.web.dev/analysis/https-auckland-roof-professionals-pages-dev/4bzd7uyju2?form_factor=desktop)

## Bottlenecks and follow-up opportunities

| Area | Evidence | Action |
| --- | --- | --- |
| Hero image delivery | The public mobile report estimated 458 KiB of image-delivery savings. The checkout requested the 306,958-byte desktop poster on phones despite already containing a smaller version of the same photograph. | Use the 61,172-byte variant on narrow viewports. Keep the original crop and desktop asset. |
| Unnecessary startup requests | The Commercial and Contact builds omitted the homepage preload but still loaded the shell stylesheet and downloaded the homepage image before React mounted. | Include the homepage shell, its preloads and the video origin hint only on the homepage. |
| Below-fold images | The local mobile baseline fetched `audience-home.webp` at about 314 KiB, `about.jpg` at about 278 KiB and both JPEG and WebP versions of the trust image during the initial load. | Reuse the trust WebP across sections after a visual comparison. Prioritise responsive variants and deferred loading for offscreen backgrounds. |
| Render-blocking CSS and fonts | Google estimated 300 ms of mobile render-blocking savings. The local mobile baseline fetched about 233 KiB in four font responses, plus the Google Fonts stylesheet. Shared CSS was roughly 128 kB before compression and 24 kB gzipped. | Profile the CSS that remains on the critical path. Test self-hosting the same font variants or serving route-specific CSS separately, with visual and layout-shift checks. |
| JavaScript and rendering | The checkout initially preloads about 421 kB of JavaScript across the app and vendor chunks, about 127 kB gzipped. The local mobile baseline attributed 32 KiB of unused code to the React vendor chunk. The public mobile report flagged forced reflow and measured 90 ms of TBT. | Profile the call stacks during load and actual interactions before splitting more code or changing animations. |
| Video and third-party requests | The deferred Cloudinary video accounted for about 4.3 to 7.6 MiB during the two desktop homepage captures. The lazy Google Maps iframe still triggered Google Maps and supporting requests during the desktop Contact audit. | Test a lower-bitrate video encode at equivalent visual quality. Measure the map on a slow connection and consider loading the embed when visitors ask for it. |
| Caching and resource delivery | Cloudflare serves the public HTML with revalidation and advertises HTTP/3. The local Node server compresses eligible resources and gives hashed build assets a long cache lifetime. Cloudflare's checkout rules apply immutable caching to all paths under `/assets/`. | Verify CDN cache headers on the actual release. Version any fixed-name image URLs before replacing their bytes under an immutable policy. |

## Changes and measured request savings

- The homepage preloads one poster based on viewport width. The initial shell, hero background and video use the same asset for that viewport, allowing the browser to reuse the request. Desktop and tablet retain the full-size image. Phones use the existing 800 × 450 WebP from the same source.
- Generated interior pages skip the homepage shell, its stylesheet, both poster preloads and the homepage-only Cloudinary connection hint. The rendered route components and their existing images remain in place.

| Cold navigation | Before | After | Difference |
| --- | ---: | ---: | ---: |
| Homepage at 390 px, poster body | 306,958 B | 61,172 B | 245,786 B fewer, 80.1% smaller |
| Homepage at 820 and 1440 px, poster body | 306,958 B | 306,958 B | 0 B |
| Commercial and Contact, homepage-only poster body per page | 306,958 B | 0 B | 306,958 B fewer |
| Commercial and Contact, homepage-only resource requests per page | 2 | 0 | 2 fewer |

Body sizes exclude HTTP headers. The request counts include the poster and its stylesheet. These savings come from cold local browser loads of the preserved checkout and the optimised production build.

## Local Lighthouse before and after

Lighthouse 13.5.0 audited production builds served locally by the same Node server on the same origin. A baseline copy of the checkout's initial production build preserved existing changes. The mobile and desktop profiles used the standard Lighthouse configurations with simulated throttling and cold navigations. Installed Chrome and Edge failed to capture valid navigation traces. The results below come from Google's standalone Chrome Headless Shell 150.0.7871.124.

| Page | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | FCP | Raw reports |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Homepage | mobile | 38 → 36 | 100 → 100 | 100 → 100 | 100 → 100 | 7.21 s → 6.41 s | 0.0004 → 0.0004 | 3393 ms → 9511 ms | 3.02 s → 3.08 s | [Before](artifacts/performance-audit/baseline-home-mobile.html) · [After](artifacts/performance-audit/final-home-mobile.html) |
| Homepage | desktop | 81 → 79 | 100 → 100 | 100 → 100 | 100 → 100 | 1.41 s → 1.44 s | 0.0016 → 0.0016 | 295 ms → 334 ms | 1.03 s → 0.94 s | [Before](artifacts/performance-audit/baseline-home-desktop.html) · [After](artifacts/performance-audit/final-home-desktop.html) |
| Commercial | mobile | 51 → 45 | 100 → 100 | 100 → 100 | 100 → 100 | 8.10 s → 6.35 s | 0.0072 → 0.0072 | 885 ms → 1447 ms | 2.66 s → 3.27 s | [Before](artifacts/performance-audit/baseline-commercial-mobile.html) · [After](artifacts/performance-audit/final-commercial-mobile.html) |
| Commercial | desktop | 85 → 92 | 100 → 100 | 100 → 100 | 100 → 100 | 1.96 s → 1.58 s | 0.0079 → 0.0079 | 151 ms → 42 ms | 1.10 s → 0.92 s | [Before](artifacts/performance-audit/baseline-commercial-desktop.html) · [After](artifacts/performance-audit/final-commercial-desktop.html) |
| Contact | mobile | 42 → 47 | 100 → 100 | 100 → 100 | 100 → 100 | 6.88 s → 5.36 s | 0.0000 → 0.0000 | 2610 ms → 2963 ms | 2.78 s → 2.10 s | [Before](artifacts/performance-audit/baseline-contact-mobile.html) · [After](artifacts/performance-audit/final-contact-mobile.html) |
| Contact | desktop | 86 → 79 | 100 → 100 | 100 → 100 | 100 → 100 | 1.42 s → 1.32 s | 0.0002 → 0.0002 | 207 ms → 351 ms | 0.97 s → 0.67 s | [Before](artifacts/performance-audit/baseline-contact-desktop.html) · [After](artifacts/performance-audit/final-contact-desktop.html) |

The scores are mixed. All three mobile LCP measurements improved in this pass, with the slowest final LCP still above six seconds. Commercial desktop had the largest score gain, up seven points. CLS was stable across the six pairs and all local accessibility, best-practices and SEO scores stayed at 100. Some TBT results rose substantially. The first mobile homepage run's browser benchmark fell from 433 to 129.5 between builds, indicating a large difference in the test environment's available CPU performance. Treat individual timing and score changes with that limitation.

A repeat mobile homepage pair recorded performance **43 → 48**, LCP **7.20 s → 4.44 s**, CLS **0.0004 → 0.0004** and TBT **2,752 ms → 3,491 ms**. Accessibility, best practices and SEO stayed at 100. Both homepage pairs showed an LCP improvement, while the score moved in opposite directions and measured TBT rose in both. [Repeat baseline](artifacts/performance-audit/repeat-baseline-home-mobile.html) · [Repeat optimised](artifacts/performance-audit/repeat-final-home-mobile.html)

The network evidence was consistent. Total transfer in the initial mobile Lighthouse pairs fell from 2,020 to 1,778 KiB on the homepage, 1,627 to 1,325 KiB on Commercial and 1,488 to 1,186 KiB on Contact. The desktop homepage downloaded variable portions of the same Cloudinary video, so total desktop transfer on that page is unsuitable for estimating savings from the patch.

### Scripted interaction latency

Lighthouse timespan captured opening the homepage quote dialog and dismissing it with Escape. These are short, unthrottled runs with emulated viewports. Each measures the slowest interaction in that flow, so timing can shift with the state of the page and the host. Field INP remains unavailable.

| Timing | Viewport | Baseline | Optimised |
| --- | --- | ---: | ---: |
| Once the quote button became visible | 390 px | 183 ms | 373 ms |
| Once the quote button became visible | 1440 px | 337 ms | 249 ms |
| After fonts were ready and a 1.2 s pause | 390 px | 214 ms | 160 ms |
| After fonts were ready and a 1.2 s pause | 1440 px | 423 ms | 316 ms |

Mobile latency moved in opposite directions in the two scenarios. Desktop improved in both samples. The early mobile result is worth monitoring after release, especially while the page is still doing startup work.

[Early mobile before](artifacts/performance-audit/timespan-baseline-mobile.json) · [Early mobile after](artifacts/performance-audit/timespan-final-mobile.json) · [Early desktop before](artifacts/performance-audit/timespan-baseline-desktop.json) · [Early desktop after](artifacts/performance-audit/timespan-final-desktop.json)

[Settled mobile before](artifacts/performance-audit/settled-timespan-baseline-mobile.json) · [Settled mobile after](artifacts/performance-audit/settled-timespan-final-mobile.json) · [Settled desktop before](artifacts/performance-audit/settled-timespan-baseline-desktop.json) · [Settled desktop after](artifacts/performance-audit/settled-timespan-final-desktop.json)

## Browser and build verification

- The production build generated all 35 HTML pages and 32 canonical sitemap URLs. Only the homepage HTML included the homepage shell.
- Installed Chrome 156 and Edge 156 covered the homepage, Commercial and Contact at 390, 820 and 1440 CSS pixels. Across 36 before-and-after cases, the checks found no horizontal overflow or page exceptions. The homepage quote dialog opened and dismissed with Escape in both browsers at all three widths. [Browser verification data](artifacts/performance-audit/browser-verification.json)
- Reviewed rendered homepage screenshots at phone and desktop widths. The video played on tablet and desktop. An initial Edge desktop check timed out, and a focused retry confirmed playback on both builds. The optimised homepage made zero video requests in the Edge mobile and desktop reduced-motion checks. [Video verification data](artifacts/performance-audit/video-verification.json)
- The full suite reported 167 of 170 checks passing. Its startup and oversized-request checks failed in that run. Rerunning the two affected test files in isolation passed all 36 checks on both builds. [Full test run](artifacts/performance-audit/test-results.txt) · [Baseline retest](artifacts/performance-audit/targeted-baseline-tests.txt) · [Optimised retest](artifacts/performance-audit/targeted-final-tests.txt)
- The browser checks used emulated viewports on Windows. Physical phones and Safari or Firefox remain outside the tested coverage.

## Release status

On 9 November 2026 NZDT, the homepage poster and route-shell optimisations went live on the existing Cloudflare Pages site from production commit `b04c898`. The release started from the previously deployed commit `25e074c` in a separate checkout. This kept the comparison scoped to the six-file performance patch. Cloudflare now serves generated HTML for Commercial, Residential, Contact and the query-string Service route in place of the earlier rewrites to the homepage. [Live website](https://auckland-roof-professionals.pages.dev/) · [Production deployment](https://github.com/kushalknz-ops/auckland-roof-professionals/actions/runs/42600953192)

The release passed all 159 local tests, and the production build, test and deployment steps succeeded. The live homepage returned HTTP 200 with responsive poster preloads and the new JavaScript bundle. The mobile poster returned HTTP 200 at 61,172 bytes. Commercial, Residential, Contact, Service, Blog and the tested project page returned HTTP 200 and omitted homepage-only markup. An unknown path returned HTTP 404.

Live Chrome checks requested only the mobile poster at 390 px and only the full-size poster at 1440 px. Commercial and Contact requested neither poster at both widths. The homepage quote dialog opened and dismissed with Escape in both profiles. [Live browser checks](artifacts/performance-audit/live-browser-verification.json)

The canonical `aucklandroofprofessionals.nz` domain still failed DNS resolution during the release. The live performance comparison uses the same Cloudflare Pages homepage as the original baseline.
