const { test } = require('node:test');
const assert = require('node:assert/strict');
const { patterns, weekly } = require('../ame-insights.js');
const days = {
 '2026-10-19': { mock: 100, sleep: 8, completed: { chem: 30, errors: 20 } },
 '2026-10-20': { mock: 90, sleep: 5, completed: { maths: 20 } },
 '2026-10-25': { rested: true, sleep: 7 },
 '2026-10-26': { completed: { maths: 20 } }
};
const stats = date => ({ got: Object.values(days[date]?.completed || {}).reduce((a,b)=>a+b,0), dow: new Date(date+'T12:00:00').getDay(), subj: date === '2026-10-19' ? { Chemistry: 30, Mixed: 20 } : date === '2026-10-20' ? { Mathematics: 20 } : {} });
test('patterns cite past logged days and do not call an open day skipped', () => {
 const p = patterns(days, '2026-10-26', stats);
 assert.equal(p.length,3); assert.ok(p.every(x=>x.date === '2026-10-20'));
 assert.match(p[2].pattern,/association, not cause/);
 assert.deepEqual(patterns({},'2026-10-26',stats),[]);
});
test('weekly includes Monday through Sunday, normalises Maths, excludes missing sleep', () => {
 const w = weekly(days,'2026-10-25', stats);
 assert.equal(w.start,'2026-10-19'); assert.equal(w.subjects.Maths,20);
 assert.equal(w.best.date,'2026-10-19'); assert.equal(w.sleepAverage,20/3);
 assert.equal(w.loggedDays,3); assert.equal(w.focus,'Physics');
 const empty = weekly({},'2026-10-25',stats); assert.equal(empty.sleepAverage,null); assert.equal(empty.best,null);
});
