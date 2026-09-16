// Pulls production numbers from the portfolio's public ledger endpoint (which reads Notify's
// metrics API), renders them as an SVG card in dark and light, and updates the Notify badge.
// Runs daily. Fonts are system fonts so the SVG renders identically on GitHub.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const res = await fetch('https://satyamkumarsingh.com/api/ledger', { headers: { 'user-agent': 'Satyam087-profile-readme' } });
if (!res.ok) { console.error('ledger fetch failed', res.status); process.exit(0); }
const d = await res.json();
const t = d.metrics?.platform?.totals;
if (!t || !t.jobs) { console.error('no totals in ledger payload'); process.exit(0); }

const pct = (t.successRate * 100).toFixed(1);
const n = (x) => Number(x).toLocaleString('en-US');
const fmt = (iso, time = false) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'UTC' });
const stamp = fmt(d.checkedAt ?? new Date().toISOString(), true) + ' UTC';
const since = fmt(t.firstEventAt);
const up = d.notify?.up ? `up, ${d.notify.ms} ms` : 'unreachable at check';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const card = (dark) => {
  const c = dark
    ? { bg: '#161b22', rule: '#30363d', ink: '#f2f2f0', muted: '#a6a8ad', accent: '#e8865e', bar: '#30363d' }
    : { bg: '#fcfcfc', rule: '#e6e6e6', ink: '#232427', muted: '#6b6d73', accent: '#b04a27', bar: '#e6e6e6' };
  const W = 1200, H = 210;
  const barW = 520, sentW = Math.round(barW * t.sent / t.jobs);
  const mono = "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  const sans = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${c.bg}" stroke="${c.rule}"/>
  <text x="24" y="38" style="${mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase" fill="${c.muted}"><tspan fill="${c.accent}">LIVE</tspan>  /  NOTIFY, PRODUCTION  ·  CHECKED ${esc(stamp.toUpperCase())}</text>
  <text x="24" y="104" style="${sans};font-size:58px;font-weight:700;letter-spacing:-2px" fill="${c.accent}">${pct}%</text>
  <text x="24" y="134" style="${sans};font-size:16px;font-weight:600" fill="${c.ink}">Delivery success</text>
  <text x="24" y="156" style="${sans};font-size:13px" fill="${c.muted}">of ${n(t.jobs)} jobs since ${esc(since)} · ${n(t.sent)} sent · ${n(t.failed)} failed · ${n(t.pending)} pending</text>
  <rect x="24" y="172" width="${barW}" height="6" rx="3" fill="${c.bar}"/>
  <rect x="24" y="172" width="${sentW}" height="6" rx="3" fill="${c.accent}"/>
  <g style="${sans}" fill="${c.ink}">
    <text x="640" y="72" style="font-size:26px;font-weight:700;letter-spacing:-.5px">${n(t.events)}</text>
    <text x="640" y="92" style="font-size:12px" fill="${c.muted}">events ingested · ${d.metrics.platform.tenants} tenants</text>
    <text x="840" y="72" style="font-size:26px;font-weight:700;letter-spacing:-.5px">${n(t.attempts - t.jobs)}</text>
    <text x="840" y="92" style="font-size:12px" fill="${c.muted}">retries across ${n(t.attempts)} attempts</text>
    <text x="1040" y="72" style="font-size:26px;font-weight:700;letter-spacing:-.5px">${(t.medianDeliveryMs / 1000).toFixed(1)} s</text>
    <text x="1040" y="92" style="font-size:12px" fill="${c.muted}">median ingest to delivered</text>
    <text x="640" y="140" style="font-size:26px;font-weight:700;letter-spacing:-.5px">${esc(up)}</text>
    <text x="640" y="160" style="font-size:12px" fill="${c.muted}">service health at check time · ${d.metrics.platform.pushSubscriptions} push subscriptions</text>
  </g>
  <text x="24" y="${H - 16}" style="${mono};font-size:10.5px;letter-spacing:1px" fill="${c.muted}">SOURCE: SATYAMKUMARSINGH.COM/API/LEDGER  →  NOTIFY GET /API/V1/METRICS  ·  REFRESHED DAILY BY A GITHUB ACTION</text>
</svg>`;
};
mkdirSync('assets', { recursive: true });
writeFileSync('assets/live-dark.svg', card(true));
writeFileSync('assets/live-light.svg', card(false));

let md = readFileSync('README.md', 'utf8');
md = md.replace(/badge\/Notify-[^"]*?delivered-/, `badge/Notify-${encodeURIComponent(`${pct}% of ${n(t.jobs)} jobs delivered`)}-`);
writeFileSync('README.md', md);
console.log(`live card rendered: ${pct}% of ${t.jobs} jobs, ${stamp}`);
