# Cross-browser compatibility report

Auckland Roof Professionals · 10 November 2026

## Coverage

The tests ran against the locally built production site and its Node API on Windows. The route inventory came from the generated sitemap and includes the homepage, both roofing categories, nine service pages, contact, both legal pages, the blog index and eleven articles, and five project case studies. The suite also exercised the legacy service redirect, invalid routes, both 404 presentations, and the standalone social preview. That makes 41 URLs per viewport.

The viewport matrix used 1440 × 900 desktop, 768 × 1024 tablet, 390 × 844 mobile, 320 × 568 small mobile, and 844 × 390 landscape. The mobile and tablet runs used emulated touch input. Firefox used resized desktop Gecko with touch input. WebKit used an iPhone profile for the phone sizes.

| Browser | Version and test environment | Route and viewport checks |
| --- | --- | ---: |
| Google Chrome | 156.0.8078.80, installed Windows browser | 205 |
| Microsoft Edge | 157.0.4341.42, installed Windows browser | 205 |
| Mozilla Firefox | 146.0.1, Playwright Firefox build on Windows | 205 |
| Safari engine coverage | WebKit 26.0, Playwright WebKit build on Windows | 205 |

The page scans covered 820 combinations. Chrome, Edge and Firefox passed the full page matrix. WebKit passed the page checks with a separate successful desktop homepage capture after its first screenshot timed out. The raw WebKit scan excluded that homepage from its link inventory after the timeout, so the reported missing destinations were all links back to the homepage or its sections. The core functional runs covered nine groups per viewport. Chrome's tablet anchor and Edge's desktop carousel passed on isolated retest. WebKit's desktop and tablet anchors and a landscape FAQ tap passed on retest. Its HTTP-only pass also confirmed that the formerly blank preview could load pages and complete the quote flow.

## Functional checks

- Used pointer, touch, and keyboard input for desktop and mobile navigation, service menus, links and browser history, section scrolling, FAQ controls, back-to-top, project and review carousels, case study timelines, blog search, and 404 recovery.
- Opened the quote dialog from page and menu controls. Checked keyboard containment, focus return, validation, upload rejection, photo removal, and a successful multipart POST to the local API.
- Tested contact validation, disabled controls and a spinner while a request was pending, recovery from an injected HTTP 503, a successful JSON POST to the local API, and form reset. Success checks required a receipt ID from the actual server. All form data was synthetic.
- Checked HTTP responses, heading visibility, document overflow, local image loading, reveal-on-scroll, map frame dimensions, computed typography, and runtime diagnostics. Captured representative desktop and phone screenshots for visual comparison.
- Exercised the real Cloudinary hero video and tested reduced-motion behavior and the compact poster. Checked Google Maps embed loading separately from the app's own JavaScript.

## Issues and fixes

| Finding | Change |
| --- | --- |
| WebKit pointer activation left focus on the page body after the quote dialog closed. The browser did not always focus the clicked button before the dialog opened. | The dialog now restores focus to the control passed by the caller. Quotes launched from a menu return to its visible toggle after the menu closes. The enquiry form continues to receive the selected service. |
| WebKit on the Node HTTP loopback preview upgraded same-origin asset requests to HTTPS and could render a blank page because the preview had no TLS listener. | The Node server omits the automatic upgrade directive only for plain HTTP requests from a verified loopback connection. |

## Test evidence

The raw browser reports, test runner and screenshots are local files under `artifacts/responsive/`. The links below work from the tested checkout.

- [Chrome page scan](artifacts/responsive/cross-browser/verified/chrome/report.json) · [Chrome functional run](artifacts/responsive/cross-browser/final/chrome/report.json) · [Chrome scroll retest](artifacts/responsive/cross-browser/recheck/chrome/report.json)
- [Edge page scan](artifacts/responsive/cross-browser/verified/edge/report.json) · [Edge functional run](artifacts/responsive/cross-browser/final/edge/report.json) · [Edge carousel retest](artifacts/responsive/cross-browser/recheck/edge/report.json)
- [Firefox page and functional results](artifacts/responsive/cross-browser/final/firefox/report.json)
- [WebKit HTTPS page and functional results](artifacts/responsive/cross-browser/final/webkit/report.json) · [WebKit HTTP loopback results](artifacts/responsive/cross-browser/loopback/webkit/report.json) · [WebKit navigation retest](artifacts/responsive/cross-browser/recheck/webkit/report.json) · [WebKit landscape interaction retest](artifacts/responsive/cross-browser/landscape-flows/webkit/report.json) · [WebKit homepage capture retest](artifacts/responsive/cross-browser/visual/webkit/report.json)
- [Browser test runner](artifacts/responsive/cross-browser.mjs) · [Homepage comparison](artifacts/responsive/cross-browser/comparison-home.png) · [Blog comparison](artifacts/responsive/cross-browser/comparison-blog.png) · [Contact comparison](artifacts/responsive/cross-browser/comparison-contact.png)

The production build succeeded. The repository test suite passed all 170 tests after the changes. Lint finished with warnings and no errors.

## Remaining coverage limits

- Apple Safari on macOS and iOS and native Android browser apps require a separate device or hosted session. The Windows WebKit run covers engine behavior and the iPhone viewport, with platform-specific rendering, system fonts, browser chrome, and codec policy still to verify on Apple devices. Playwright uses patched Firefox and WebKit builds. [Playwright browser documentation](https://playwright.dev/docs/browsers)
- The site has no sign-in or account flow. Form verification covered browser-to-server delivery and API receipts in the local build. The server code does not send email or forward leads to an external service.
- External maps, fonts, and video depend on their providers and browser settings. Evidence from this run applies to the services reachable in the test environment.
- Firefox logged intermittent Google Maps errors and a module-preload warning on prerendered pages. The blog and project interactions passed in Firefox. An isolated decode check passed for a JPEG that Firefox warned about during the scan.
- Windows WebKit rendered Montserrat visibly thinner in some desktop and mobile captures even though the page reported the intended font family and weight. An isolated heading capture at a different viewport rendered the expected weight. A continuous weight range and an explicit weight-axis value produced the same thin result at 1440 px. Native Safari verification is needed to determine whether this affects Apple devices. [Full-page capture](artifacts/responsive/cross-browser/webkit-painted-blog.png) · [Isolated heading capture](artifacts/responsive/cross-browser/webkit-font-existing.png)
- The WebKit screenshot runs logged stylesheet-policy messages during capture. The focused WebKit interaction retests ran without those capture messages. The live video played in each desktop engine, with slower starts and occasional timeouts during concurrent Firefox and WebKit runs.
- Some animated elements had yet to appear during a shortened scripted scroll in WebKit landscape. They appeared in the full scan. Native mobile scrolling remains outside this test environment.
