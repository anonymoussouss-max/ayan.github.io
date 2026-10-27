/* Pure, bounded observations. Missing logs are never treated as missed work. */
(function (root) {
  function patterns(days, today, stats) {
    const rows = Object.keys(days).filter(d => d <= today).sort().slice(-35);
    const observations = [];
    let previousMock = null;
    for (const date of rows) {
      const d = days[date], s = stats(date), c = d.completed || {};
      const closed = date < today || d.rested;
      if (closed && s.got > 0 && s.dow !== 0 && !(c.errors > 0)) observations.push({ date, pattern: 'Error notebook not logged on a study day' });
      if (closed && s.got > 0 && s.dow !== 0 && !(c.chem > 0)) observations.push({ date, pattern: 'Chemistry not logged on a study day' });
      if (Number.isFinite(d.mock)) {
        if (previousMock !== null && d.mock < previousMock && Number.isFinite(d.sleep) && d.sleep < 6)
          observations.push({ date, pattern: 'Under 6h sleep with a lower mock than the previous logged score (association, not cause)' });
        previousMock = d.mock;
      }
    }
    return observations.slice(-24);
  }
  function weekly(days, end, stats) {
    const cursor = new Date(end + 'T12:00:00'), dates = [];
    for (let i = 0; i < 7; i++) { dates.unshift(cursor.getFullYear() + '-' + String(cursor.getMonth()+1).padStart(2,'0') + '-' + String(cursor.getDate()).padStart(2,'0')); cursor.setDate(cursor.getDate()-1); }
    const subjects = { Maths: 0, Physics: 0, Chemistry: 0 }, sleep = [], logged = dates.filter(d => days[d]);
    let best = null;
    for (const date of logged) {
      const s = stats(date);
      for (const [subject, min] of Object.entries(s.subj)) { const key = subject === 'Mathematics' ? 'Maths' : subject; subjects[key] = (subjects[key] || 0) + min; }
      if (!best || s.got > best.minutes) best = { date, minutes: s.got };
      if (Number.isFinite(days[date].sleep)) sleep.push(days[date].sleep);
    }
    const focus = Object.keys(subjects).filter(s => s !== 'Mixed').sort((a,b) => subjects[a]-subjects[b])[0];
    return { start: dates[0], end, subjects, best, sleepAverage: sleep.length ? sleep.reduce((a,b)=>a+b,0)/sleep.length : null, sleepDays: sleep.length, loggedDays: logged.length, focus };
  }
  const api = { patterns, weekly };
  if (typeof module !== 'undefined') module.exports = api; else root.AmeInsights = api;
})(globalThis);
