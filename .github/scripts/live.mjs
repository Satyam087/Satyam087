// Pulls production numbers from the portfolio's public ledger endpoint (which reads Notify's
// metrics API) and rewrites the LIVE block and the Notify badge in README.md. Runs daily.
import { readFileSync, writeFileSync } from 'node:fs';

const res = await fetch('https://satyamkumarsingh.com/api/ledger', { headers: { 'user-agent': 'Satyam087-profile-readme' } });
if (!res.ok) { console.error('ledger fetch failed', res.status); process.exit(0); }
const d = await res.json();
const t = d.metrics?.platform?.totals;
if (!t || !t.jobs) { console.error('no totals in ledger payload'); process.exit(0); }

const pct = (t.successRate * 100).toFixed(1);
const n = (x) => Number(x).toLocaleString('en-US');
const when = new Date(d.checkedAt ?? Date.now());
const stamp = when.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const since = new Date(t.firstEventAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const up = d.notify?.up ? `up, ${d.notify.ms} ms` : 'unreachable at check time';

const block = `<!-- LIVE:START -->
| Notify, live from production | |
|---|---|
| Delivery success | **${pct}%** of ${n(t.jobs)} jobs (${n(t.sent)} sent, ${n(t.failed)} failed, ${n(t.pending)} pending) |
| Events ingested | ${n(t.events)} since ${since}, across ${d.metrics.platform.tenants} tenants |
| Attempts | ${n(t.attempts)} (${n(t.attempts - t.jobs)} retries) · median ingest to delivered ${(t.medianDeliveryMs / 1000).toFixed(1)} s |
| Health at check | ${up} · checked ${stamp} |

<sub>Read by a GitHub Action from [satyamkumarsingh.com/api/ledger](https://satyamkumarsingh.com/api/ledger), which reads Notify's \`GET /api/v1/metrics\`. The same numbers drive the [public ledger](https://satyamkumarsingh.com/contact#ledger).</sub>
<!-- LIVE:END -->`;

let md = readFileSync('README.md', 'utf8');
md = md.replace(/<!-- LIVE:START -->[\s\S]*?<!-- LIVE:END -->/, block);
// Badge: Notify-98.1%25%20of%201%2C346%20jobs%20delivered
md = md.replace(/badge\/Notify-[^"]*?delivered-/, `badge/Notify-${encodeURIComponent(`${pct}% of ${n(t.jobs)} jobs delivered`).replace(/%20/g, '%20')}-`);
writeFileSync('README.md', md);
console.log(`live block updated: ${pct}% of ${t.jobs} jobs, ${stamp}`);
