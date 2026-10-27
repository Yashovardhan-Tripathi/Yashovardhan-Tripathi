import fs from 'node:fs/promises';
import {summarizeStreaks, renderStreaks} from './streaks.mjs';

const username = process.env.PROFILE_USERNAME;
const token = process.env.GITHUB_TOKEN;
if (!username || !token) throw new Error('PROFILE_USERNAME and GITHUB_TOKEN are required.');

const now = new Date();
const start = new Date(now);
start.setUTCDate(start.getUTCDate() - 30);
start.setUTCHours(0, 0, 0, 0);
const query = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    createdAt
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;
async function fetchCalendar(from, to) {
const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-activity-graph'},
  body: JSON.stringify({query, variables: {login: username, from: from.toISOString(), to: to.toISOString()}}),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`GitHub contribution query failed: HTTP ${response.status}`);
const result = await response.json();
if (result.errors?.length) throw new Error('GitHub returned a contribution query error.');
const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar?.weeks) throw new Error('GitHub returned no contribution calendar.');
return {calendar, createdAt:result.data.user.createdAt};
}
const initial = await fetchCalendar(start, now);
const calendar = initial.calendar;

const firstDay = start.toISOString().slice(0, 10);
const lastDay = now.toISOString().slice(0, 10);
const days = calendar.weeks.flatMap(w => w.contributionDays)
  .filter(d => d.date >= firstDay && d.date <= lastDay)
  .sort((a, b) => a.date.localeCompare(b.date));
if (days.length !== 31 || days.some(d => !Number.isInteger(d.contributionCount) || d.contributionCount < 0)) {
  throw new Error('Expected 31 days of valid GitHub contribution counts.');
}

const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const width = 1000, height = 300;
const left = 58, top = 75, plotWidth = 906, plotHeight = 165;
const maximum = Math.max(4, Math.ceil(Math.max(...days.map(d => d.contributionCount)) / 4) * 4);
const x = i => left + i * plotWidth / (days.length - 1);
const y = count => top + plotHeight - count / maximum * plotHeight;
const points = days.map((d, i) => `${x(i).toFixed(1)},${y(d.contributionCount).toFixed(1)}`).join(' ');
const baseline = top + plotHeight;
const lines = Array.from({length:5}, (_, i) => {
  const value = i * maximum / 4, cy = y(value);
  return `<path d="M${left} ${cy}H${left+plotWidth}" stroke="#1e3526" stroke-dasharray="3 5"/><text x="${left-12}" y="${cy+4}" text-anchor="end" fill="#8ba996" font-size="12">${value}</text>`;
}).join('');
const labels = [0, 7, 14, 21, 30].map(i => {
  const label = new Date(`${days[i].date}T00:00:00Z`).toLocaleDateString('en-US', {month:'short', day:'numeric', timeZone:'UTC'});
  return `<text x="${x(i)}" y="266" text-anchor="middle" fill="#8ba996" font-size="12">${escape(label)}</text>`;
}).join('');
const dots = days.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.contributionCount)}" r="3" fill="#a3e635"><title>${escape(d.date)}: ${d.contributionCount} contributions</title></circle>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escape(username)}: contribution activity</title><desc id="desc">GitHub contribution calendar counts from ${firstDay} to ${lastDay}, in UTC. Generated ${escape(now.toISOString())}.</desc>
<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#39ff88" stop-opacity=".22"/><stop offset="1" stop-color="#39ff88" stop-opacity=".02"/></linearGradient></defs>
<rect x="1" y="1" width="998" height="298" rx="12" fill="#090d0a" stroke="#1e452c"/>
<g font-family="Segoe UI, Arial, sans-serif"><text x="28" y="37" fill="#39ff88" font-size="20" font-weight="600">Contribution activity</text><text x="972" y="37" text-anchor="end" fill="#8ba996" font-size="13">Last 31 days · GitHub calendar</text>
${lines}<polygon points="${left},${baseline} ${points} ${left+plotWidth},${baseline}" fill="url(#area)"/><polyline points="${points}" fill="none" stroke="#39ff88" stroke-width="2.5" stroke-linejoin="round"/>${dots}${labels}</g></svg>`;
await fs.mkdir('assets', {recursive:true});
await fs.writeFile('assets/contribution-activity.svg', svg);
console.log(`Wrote activity graph for ${username}: ${firstDay} through ${lastDay}.`);

// Read every account year so longest streak is not limited to the 31-day graph.
const joined = new Date(initial.createdAt);
if (!Number.isFinite(joined.getTime())) throw new Error('Missing account creation date.');
const since = joined.toISOString().slice(0,10);
const history = new Map();
for (let year=joined.getUTCFullYear(); year<=now.getUTCFullYear(); year++) {
  const from = new Date(Math.max(Date.UTC(year,0,1), Date.parse(since)));
  const to = new Date(Math.min(Date.UTC(year+1,0,1)-1, now.getTime()));
  const {calendar:yearCalendar} = await fetchCalendar(from,to);
  for (const day of yearCalendar.weeks.flatMap(w=>w.contributionDays)) {
    if (day.date>=from.toISOString().slice(0,10) && day.date<=to.toISOString().slice(0,10)) history.set(day.date,day);
  }
}
const allDays=[...history.values()].sort((a,b)=>a.date.localeCompare(b.date));
if (allDays[0]?.date!==since) throw new Error('Contribution history does not cover the account start date.');
const streaks=summarizeStreaks(allDays,lastDay);
await fs.writeFile('assets/contribution-streaks.svg',renderStreaks(streaks,since,now.toISOString()));
console.log(`Generated contribution streaks: current ${streaks.current.length} days, longest ${streaks.longest.length} days.`);
