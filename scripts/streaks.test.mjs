import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeStreaks} from './streaks.mjs';
const history=(counts,start='2025-12-29')=>counts.map((contributionCount,i)=>({date:new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10),contributionCount}));
test('current and longest streaks cross year boundaries',()=>{
  const d=history([0,1,2,1,3]);const s=summarizeStreaks(d,d.at(-1).date);
  assert.equal(s.current.length,4);assert.equal(s.longest.length,4);assert.equal(s.current.start,'2025-12-30');assert.equal(s.total,7);
});
test('today with zero preserves a streak ending yesterday',()=>{
  const d=history([1,2,3,0]);const s=summarizeStreaks(d,d.at(-1).date);
  assert.equal(s.current.length,3);assert.equal(s.current.end,'2025-12-31');
});
test('two empty days end current streak while preserving the record',()=>{
  const d=history([1,2,3,0,0]);const s=summarizeStreaks(d,d.at(-1).date);
  assert.equal(s.current.length,0);assert.equal(s.longest.length,3);
});
test('new activity starts a new streak without losing a longer past record',()=>{
  const d=history([1,1,1,0,1]);const s=summarizeStreaks(d,d.at(-1).date);
  assert.equal(s.current.length,1);assert.equal(s.longest.length,3);
});
test('no contributions yields zero streaks',()=>{
  const d=history([0]);assert.equal(summarizeStreaks(d,d[0].date).current.length,0);
});
test('rejects incomplete calendar history instead of inventing continuity',()=>{
  const d=history([1,1,1]);d.splice(1,1);assert.throws(()=>summarizeStreaks(d,d.at(-1).date),/missing/);
});
