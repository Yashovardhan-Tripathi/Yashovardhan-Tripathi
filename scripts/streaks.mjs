export function summarizeStreaks(days, today) {
  if (!days.length || days.at(-1).date !== today) throw new Error('Contribution history must end today.');
  let total = 0, run = 0, runStart = null, longest = {length:0,start:null,end:null};
  for (let i=0; i<days.length; i++) {
    const day=days[i];
    if (!Number.isInteger(day.contributionCount) || day.contributionCount<0) throw new Error('Invalid contribution count.');
    if (i && Date.parse(day.date)-Date.parse(days[i-1].date)!==86400000) throw new Error('Contribution history has missing or duplicate days.');
    total+=day.contributionCount;
    if (day.contributionCount>0) {
      if (!run) runStart=day.date;
      run++;
      if (run>longest.length) longest={length:run,start:runStart,end:day.date};
    } else { run=0; runStart=null; }
  }
  // A zero today does not break yesterday's streak until the UTC day ends.
  let end=days.length-1;
  if (days[end].contributionCount===0) end--;
  let start=end;
  while (start>=0 && days[start].contributionCount>0) start--;
  const length=end-start;
  const current=length>0?{length,start:days[start+1].date,end:days[end].date}:{length:0,start:null,end:null};
  return {total,current,longest};
}

export function renderStreaks(summary, since, updated) {
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const range=s=>s.length?`${s.start} to ${s.end}`:'No active streak';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="260" viewBox="0 0 1000 260" role="img" aria-labelledby="title desc">
<title id="title">GitHub contribution streaks</title><desc id="desc">${summary.current.length} day current streak; ${summary.longest.length} day longest streak; ${summary.total} visible contributions since ${escape(since)}. Updated ${escape(updated)}. UTC calendar; an unfinished day does not break yesterday's streak.</desc>
<rect x="1" y="1" width="998" height="258" rx="12" fill="#090d0a" stroke="#1e452c"/>
<g font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">
<text x="28" y="35" text-anchor="start" fill="#39ff88" font-size="20" font-weight="600">Contribution streaks</text>
<path d="M333 65V207M667 65V207" stroke="#1e452c"/>
<text x="167" y="126" fill="#d5e5da" font-size="44" font-weight="700">${summary.total}</text>
<text x="167" y="161" fill="#d5e5da" font-size="17">Total contributions</text>
<text x="167" y="188" fill="#8ba996" font-size="12">Since ${escape(since)}</text>
<text x="500" y="126" fill="#a3e635" font-size="48" font-weight="700">${summary.current.length}</text>
<text x="500" y="161" fill="#39ff88" font-size="17">Current streak · days</text>
<text x="500" y="188" fill="#8ba996" font-size="12">${range(summary.current)}</text>
<text x="833" y="126" fill="#39ff88" font-size="44" font-weight="700">${summary.longest.length}</text>
<text x="833" y="161" fill="#d5e5da" font-size="17">Longest streak · days</text>
<text x="833" y="188" fill="#8ba996" font-size="12">${summary.longest.length?range(summary.longest):'No contributions yet'}</text>
<text x="500" y="236" fill="#8ba996" font-size="12">GitHub calendar · UTC · Visible contributions since joining GitHub</text>
</g></svg>`;
}
