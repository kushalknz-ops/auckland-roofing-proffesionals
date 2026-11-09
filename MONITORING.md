# Production monitoring

The production release runs on Cloudflare Pages. Its API Function and the standalone Worker send Sentry envelopes from the server. The Node server uses the same transport and emits JSON to stdout and stderr. React and the two form clients send a small, same-origin event to `POST /api/telemetry`. The site can serve requests independently of Sentry.

## Activate the production release

1. Create a JavaScript project in Sentry and assign it to the team responsible for this site. Enable data scrubbing and **Prevent Storing of IP Addresses** in the project. Use a separate project for testing the alert workflow.
2. In **Workers & Pages → auckland-roof-professionals → Settings → Variables and Secrets**, set the encrypted `SENTRY_DSN` and set `MONITORING_ENV=production` in Production. Leave the DSN unset in Preview unless testing with a separate project. For a standalone Worker, use a Worker secret and the same environment setting. For Node, inject the DSN into the service environment and set `NODE_ENV=production`. Optionally set `MONITORING_RELEASE` to the deployed Git commit and `MONITORING_RSS_LIMIT_MB` to the process memory budget. Pages provides its commit when the system binding is available.
3. On the Cloudflare zone, rate-limit `POST /api/telemetry` by source IP to 10 requests per 10 seconds. Leave `/api/health` and the form endpoints outside this rule. Review the rule after observing normal traffic from shared networks. The application also limits accepted event size and volume independently of this rule.
4. Release the changes from the separate Pages checkout. Its existing workflow builds, tests, deploys, and checks the public API health response. Confirm that the homepage and a representative static page still load and that `GET /api/health` returns `200` with `{"status":"ok"}`.

[Pages secrets](https://developers.cloudflare.com/pages/functions/bindings/) · [Sentry project privacy settings](https://docs.sentry.io/api/projects/update-a-project/) · [Cloudflare rate limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)

## Configure notification rules in Sentry

Use the production project and scope error and performance rules to `environment:production`. Route the notifications to the team's staffed channel. Start with these thresholds and review them against production traffic.

| Rule | Trigger |
| --- | --- |
| Critical application failure | A new or regressed issue for `level:fatal`, `category:request_exception`, or `category:react_uncaught`. Notify immediately. |
| Repeated browser failure | A `category:browser_exception`, `category:browser_rejection`, or `category:react_caught` issue reaches 3 events in 5 minutes. |
| Repeated API failure | A `category:http_server_error` or `category:api_network_error` issue reaches 3 events in 5 minutes. Include the route in triage and use the request ID to correlate browser and server records. |
| Sustained API degradation | A `category:slow_api_request` issue reaches 3 events in 5 minutes. Each event represents an API request taking at least 1.5 seconds. Chart p95 transaction duration for `category:http.server` to investigate. |
| Slow browser loads | The p75 duration for `category:pageload` exceeds 4 seconds over a 30-minute window. Use the sampled navigation timing and TTFB to distinguish origin latency from browser load time. |
| Node resource pressure | A new or regressed `category:server_resource_pressure` issue. It requires three consecutive one-minute samples above the configured RSS threshold, 85% of the V8 heap limit, 90% event-loop utilization, or 100 ms p95 event-loop delay. |
| Public downtime | Create separate external Uptime Monitors for `https://aucklandroofprofessionals.nz/` and `https://aucklandroofprofessionals.nz/api/health`. Probe each every minute with a 5-second timeout and notify on downtime and recovery. |

The Pages and Worker submission handlers currently return HTTP 503 by design. Their health route verifies runtime reachability. Use the API failure rule to track actual attempts and establish a separate submission readiness probe when a delivery backend is configured. The application currently has no database connection.

Use **Functions Metrics** in Cloudflare for Pages CPU time, execution duration, and platform failures, including exceeded resource limits. Cloudflare can serve static files without running the Function, so the external homepage check covers failures that application code cannot observe. Node writes `server_resources` each minute with process uptime, CPU, RSS, heap usage, and event-loop measurements.

[Sentry monitors and alerts](https://docs.sentry.io/api/monitors/) · [Cloudflare Pages Functions metrics](https://developers.cloudflare.com/pages/functions/metrics/)

## Retention, cost, and privacy

- Pages provides live function logs. Sentry provides searchable error and performance history under the selected plan's managed retention. Choose the shortest available retention that meets the team's incident review needs, enable spike protection, and set the on-demand budget to zero unless a larger budget has been approved. Keep Pages log exports off unless the destination strips request metadata and applies its own retention. Standalone Workers use managed log retention with invocation logs and automatic traces disabled.
- Node writes to the service manager instead of application log files. For a Linux systemd service, use `LogNamespace=roofing` in the service's `[Service]` section and set the following in `/etc/systemd/journald@roofing.conf`. For another host, apply equivalent settings to its log collector.

  ```ini
  [Journal]
  Storage=persistent
  SystemMaxUse=100M
  SystemMaxFileSize=10M
  MaxRetentionSec=7day
  ```

- Records include UTC timestamps, severity, event category, runtime, normalized routes, and status or duration when available. API responses include a generated `X-Request-ID`. Exception locations use known source or bundle names and numeric positions. Raw URLs, query strings, headers, IPs, exception messages, and submission fields are omitted. Keep production source maps private.
- Production samples 10% of API timings, 10% of server-side 4xx logs, and 5% of browser page loads. Intake accepts at most 2 KiB per event, with 8 error reports per page and per-runtime minute budgets. Sentry delivery uses bounded concurrency, a 1.5-second timeout, and a pause on failure. It runs outside the response path. Development uses local structured output. Static-only deployment targets need the same-origin monitoring handler to ingest browser events.

[Cloudflare Workers log retention](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) · [Sentry spike protection and budgets](https://blog.sentry.io/multiple-projects-on-sentry-new-spend-allocation-spike-protection/)

## Verify delivery before enabling paging

1. Run `npm run build` and `npm test` in both checkouts. The monitoring tests simulate a thrown request, 503, browser exception, page timing, invalid and oversized intake, a provider throttle, and a fatal startup error. They check that private test strings are absent from responses, logs, and envelopes.
2. On a staging deployment with the test DSN, load the page and run this in the browser console.

   ```js
   setTimeout(() => { throw new Error('Synthetic monitoring verification') }, 0)
   ```

   Confirm a 204 response from `/api/telemetry`, a `browser_exception` JSON record, a Sentry issue, and delivery to the test notification channel. Configure a staging rule to notify on the first `browser_exception` event for this test.
3. Exercise the known Pages 503 on the staging `/api/contact` route using an empty request. Confirm `http_server_error`, status 503, the request ID, and the API alert after three attempts. For a Node deployment, use the automated injected exception test and a dedicated staging process with an invalid `PORT` to verify fatal delivery. A staging-only endpoint or test proxy delayed by at least 1.5 seconds can exercise the API performance rule.
4. Point a temporary uptime monitor at a staging endpoint you control. Make it return an error, confirm the downtime notification, restore it, then confirm recovery. Record the issue IDs and notification timestamps before directing production alerts to the on-call team.
