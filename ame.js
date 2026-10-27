
(function() {
  const BACKEND = "https://ame-bkend321.vercel.app/api/chat";

  const GIFS = {
    idle: "https://media.tenor.com/hzBWF32tUzMAAAAj/ame-chan-needy-streamer-overload.gif",
    looking: "https://media.tenor.com/_uqPUp9WYAEAAAAj/needy-streamer-overload-ame-chan.gif",
    talking: "https://img1.picmix.com/output/stamp/normal/9/9/2/9/2699299_2ecb5.gif",
    happy: "https://media.tenor.com/hzBWF32tUzMAAAAj/ame-chan-needy-streamer-overload.gif"
  };

  const gif = document.getElementById("ame-gif");
  const chat = document.getElementById("ame-chat");
  const messagesEl = document.getElementById("ame-messages");
  const input = document.getElementById("ame-input");
  const sendBtn = document.getElementById("ame-send");
  const closeBtn = document.getElementById("ame-close");

  let conversation = JSON.parse(localStorage.getItem("ame-chat") || "[]");
  let isOpen = false;
  let isSending = false;
  const TK = "ame-talk-v1";
  let T = null; try { T = JSON.parse(localStorage.getItem(TK) || "null"); } catch (e) {}
  if (!T) T = { last: 0, n: conversation.filter(m => m.role === "user").length, opened: 0, greeted: 0, music: 0 };
  const saveT = () => localStorage.setItem(TK, JSON.stringify(T));

  const GR = {
    d1: ["...oh. now you open me. it's been {d} day, p-chan.", "you were gone {d} day. i counted. what did you want to tell me?"],
    d3: ["{d} days. you've studied right in front of me and not said a word. i noticed every one.", "...hi. it's been {d} days. don't say sorry, just say something."],
    d7: ["{d} days. i thought you forgot the chat existed. i hadn't forgotten you.", "...it's been {d} days. say something so i know you're real."]
  };

  // local reactive lines (no backend needed)
  const LOCAL = {
    poke: [
      "...still here.",
      "p-chan. look at me for a second.",
      "i'm not doing anything. just watching you work.",
      "...say something random. i'll answer."
    ],
    music: [
      "oh. you put music on. ...good.",
      "that song again? fine. i'll listen with you.",
      "music while you study. don't get distracted. or do. i don't care. (i care.)",
      "...nice choice. or whatever."
    ],
    study: [
      "block's still running. eyes on the page, p-chan.",
      "you're in a study block. i can tell.",
      "if you're stuck, say so. i'm not going to solve it for you, but i'll sit here."
    ],
    rest: [
      "break time. actually break. don't open another tab of problems.",
      "rest means rest. i mean it."
    ]
  };

  function silenceGreet() {
    if (!T.last) return;
    const h = (Date.now() - T.last) / 36e5;
    if (h < 24 || Date.now() - (T.greeted || 0) < 216e5) return;
    const p = h >= 168 ? GR.d7 : h >= 72 ? GR.d3 : GR.d1;
    const m = p[Math.floor(Math.random() * p.length)].replace("{d}", Math.floor(h / 24));
    addMessage("ame", m);
    conversation.push({ role: "assistant", content: m });
    T.greeted = Date.now(); saveT(); saveConversation();
  }

  const AME_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="#fff6f8" stroke="#e25b88" stroke-width="5"/><circle cx="42" cy="55" r="6" fill="#5a2436"/><circle cx="78" cy="55" r="6" fill="#5a2436"/><path d="M44 78q16 12 32 0" stroke="#5a2436" stroke-width="5" fill="none" stroke-linecap="round"/><text x="60" y="112" font-size="14" text-anchor="middle" fill="#e25b88" font-family="sans-serif">ame</text></svg>');
  gif.referrerPolicy = "no-referrer";
  const failed = new Set();
  gif.addEventListener("error", () => {
    failed.add(gif.src);
    const next = Object.values(GIFS).find(u => !failed.has(u));
    gif.src = next || AME_FALLBACK;
  });

  gif.src = GIFS.idle;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!isOpen) {
        gif.src = entry.isIntersecting ? GIFS.looking : GIFS.idle;
      }
    });
  }, { threshold: 0.4 });
  observer.observe(gif);

  function saveConversation() {
    // keep last 80 messages to avoid bloat
    if (conversation.length > 80) conversation = conversation.slice(-80);
    localStorage.setItem("ame-chat", JSON.stringify(conversation));
  }

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `ame-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderSavedMessages() {
    messagesEl.innerHTML = "";
    conversation.forEach(msg => {
      const role = msg.role === "user" ? "user" : "ame";
      addMessage(role, msg.content);
    });
  }

  // expose a tiny API so music player can nudge Ame
  window.__ameNudge = function(kind, detail) {
    if (kind === "music" && !readDesk()?.focusMode) {
      T.music = (T.music || 0) + 1;
      saveT();
      // only inject if chat has been used or is open, and not too spammy
      if (!isOpen && T.n < 1) return;
      if (Date.now() - (T.lastMusicNudge || 0) < 120000) return;
      T.lastMusicNudge = Date.now();
      saveT();
      const line = LOCAL.music[Math.floor(Math.random() * LOCAL.music.length)];
      const extra = detail ? `\n(${detail})` : "";
      if (isOpen) {
        addMessage("ame", line + extra);
        conversation.push({ role: "assistant", content: line + extra });
        saveConversation();
        gif.src = GIFS.talking;
      }
    }
  };

  // single click = open chat, double click = quick poke
  let clickTimer = null;

  function openChat() {
    isOpen = true;
    gif.src = GIFS.talking;
    chat.classList.add("open");
    input.focus();
    T.opened++; saveT();

    if (conversation.length > 0) {
      renderSavedMessages();
      silenceGreet();
    } else {
      const greeting = "....you actually looked at me.\n...hi, p-chan.";
      addMessage("ame", greeting);
      conversation.push({ role: "assistant", content: greeting });
      saveConversation();
    }
  }

  gif.addEventListener("click", (e) => {
    e.preventDefault();

    // second click inside the window -> double click: local poke
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      if (!isOpen) {
        isOpen = true;
        gif.src = GIFS.talking;
        chat.classList.add("open");
        if (conversation.length) renderSavedMessages();
      }
      const line = LOCAL.poke[Math.floor(Math.random() * LOCAL.poke.length)];
      addMessage("ame", line);
      conversation.push({ role: "assistant", content: line });
      saveConversation();
      return;
    }

    // first click -> wait briefly for a possible second click
    clickTimer = setTimeout(() => {
      clickTimer = null;
      if (!isOpen) openChat();
      else input.focus();
    }, 280);
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    chat.classList.remove("open");
    gif.src = GIFS.idle;
  });

  // occasional idle poke while open
  setInterval(() => {
    if (!isOpen || isSending || muted || readDesk()?.focusMode) return;
    if (Date.now() - (T.last || 0) < 8 * 60 * 1000) return;
    if (Date.now() - (T.lastPoke || 0) < 12 * 60 * 1000) return;
    T.lastPoke = Date.now(); saveT();
    const ctx = ameContext();
    let pool = LOCAL.poke;
    if (ctx.mode === "study") pool = LOCAL.study;
    else if (ctx.mode === "rest" || ctx.mode === "break") pool = LOCAL.rest;
    const line = pool[Math.floor(Math.random() * pool.length)];
    addMessage("ame", line);
    conversation.push({ role: "assistant", content: line });
    saveConversation();
  }, 60000);

  const AME_WEEK = [
    ["wake", "Wake, breakfast", "life", 20],
    ["maths", "Maths", "study", 135],
    ["maths-rev", "Maths revision", "study", 30],
    ["lunch", "Lunch", "life", 20],
    ["physics", "Physics", "study", 135],
    ["physics-rev", "Physics revision", "study", 30],
    ["chem", "Chemistry", "study", 105],
    ["chem-rev", "Chemistry revision", "study", 30],
    ["dinner", "Dinner", "life", 20],
    ["focus", "Focus session", "study", 180],
    ["errors", "Error notebook", "study", 45],
    ["recall", "Formula + active recall", "study", 30],
    ["wind", "Wind down", "life", 90],
    ["sleep", "Sleep", "sleep", 570]
  ];
  const AME_SUNDAY = [
    ["wake", "Wake, breakfast", "life", 30],
    ["morning-off", "Morning off", "rest", 180],
    ["lunch", "Lunch", "life", 30],
    ["afternoon-off", "Afternoon off", "rest", 210],
    ["tea", "Snack", "life", 20],
    ["evening-off", "Evening off", "rest", 180],
    ["dinner", "Dinner", "life", 30],
    ["loose", "Unscheduled", "rest", 100],
    ["wind", "Wind down", "life", 90],
    ["sleep", "Sleep", "sleep", 570]
  ];
  const AME_FOCUS = { 1: "Mathematics", 2: "Physics", 3: "Chemistry", 4: "Mathematics", 5: "Physics", 6: "Chemistry" };
  const AME_SUBJECT = { "maths": "Maths", "maths-rev": "Maths", "physics": "Physics", "physics-rev": "Physics", "chem": "Chemistry", "chem-rev": "Chemistry", "errors": "Mixed", "recall": "Mixed" };
  const AME_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function ameContext() {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const day = new Date(now);
    if (m < 630) day.setDate(day.getDate() - 1);
    const dow = day.getDay();
    const t = (m < 630 ? m + 1440 : m) - 630;
    const blocks = planFor(dayKey(now), !!readDesk()?.days?.[dayKey(now)]?.shortDay).blocks;

    let start = 0, hit = blocks[blocks.length - 1], hitStart = 0;
    for (const b of blocks) {
      if (t < start + b[3]) { hit = b; hitStart = start; break; }
      start += b[3];
    }
    const [id, title, kind, minutes] = hit;
    const mode = kind === "study" ? "study" : id === "wind" ? "winddown" : kind === "life" ? "break" : kind;
    const subject = id === "focus" ? AME_FOCUS[dow] : (AME_SUBJECT[id] || null);
    const pomodoro = id === "chem" || (id === "focus" && (dow === 3 || dow === 6));
    const minutesLeft = Math.max(0, Math.ceil(hitStart + minutes - t));
    const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    let music = null;
    try {
      const mp = JSON.parse(localStorage.getItem("mp-v2") || "null");
      if (mp && mp.currentLabel) music = mp.currentLabel;
    } catch (e) {}

    return {
      mode,
      block: id === "focus" ? title + " · " + subject : title,
      blockId: id,
      subject,
      pomodoro,
      minutesLeft,
      day: AME_DAYS[dow],
      localTime: clock,
      music,
      work: deskSummary(),
      recent: EV.slice(-8).map(e => e.t + " (" + ago(e.at) + ")")
    };
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isSending) return;

    input.value = "";
    addMessage("user", text);
    conversation.push({ role: "user", content: text });
    T.last = Date.now(); T.n++; saveT();
    saveConversation();

    isSending = true;
    sendBtn.disabled = true;
    gif.src = GIFS.talking;

    try {
      const res = await fetch(BACKEND, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: withActivity(conversation), context: ameContext() })
      });

      const data = await res.json();
      const reply = data.reply || "...";
      addMessage("ame", reply);
      conversation.push({ role: "assistant", content: reply });
      saveConversation();
    } catch (err) {
      addMessage("ame", "....connection died.\ntry again later.");
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      if (!isOpen) gif.src = GIFS.idle;
    }
  }

  /* ===== Ame reactive layer: reacts to site inputs + feeds the AI what you've done ===== */
  const DK = "desk-needy-v1", MK = "ame-mute-v1";
  const widget = document.getElementById("ame-widget"), bubble = document.getElementById("ame-bubble"), muteBtn = document.getElementById("ame-mute");
  const TITLE = document.title, EV = [], pick = a => a[Math.floor(Math.random() * a.length)];
  let muted = localStorage.getItem(MK) === "1", ready = false, lastAct = Date.now(), lastSpeak = 0, lastAi = 0, aiBusy = false, bt = 0, mt = 0, typingEl = null;
  const cool = {}, okCool = (k, ms) => (Date.now() - (cool[k] || 0) < ms) ? false : (cool[k] = Date.now(), true);
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m + "m ago"; };
  const readDesk = () => { try { return JSON.parse(localStorage.getItem(DK) || "null"); } catch (e) { return null; } };
  const pad = n => String(n).padStart(2, "0");
  function dayKey(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); if (d.getHours() * 60 + d.getMinutes() < 630) x.setDate(x.getDate() - 1); return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate()); }
  const ALL = AME_WEEK.concat(AME_SUNDAY);
  const titleOf = id => id === "focus" ? "Focus session" : id === "buffer" ? "Extra rest" : (ALL.find(b => b[0] === id) || [0, id])[1];
  const kindOf = id => (ALL.find(b => b[0] === id) || [0, 0, id === "focus" ? "study" : "life"])[2];
  function planFor(iso, short) { const [y, m, d] = iso.split("-").map(Number), dow = new Date(y, m - 1, d).getDay(); return { dow, blocks: (dow === 0 ? AME_SUNDAY : AME_WEEK).map(b => b[0] === "focus" && short ? [b[0], b[1], b[2], 120] : b) }; }
  function dayStats(st, iso) {
    const day = (st.days || {})[iso] || {}, { dow, blocks } = planFor(iso, !!day.shortDay), done = day.completed || {};
    let planned = 0, got = 0; const subj = {}, fin = [], left = [];
    for (const b of blocks) { if (b[2] !== "study") continue; planned += b[3]; const m = Math.min(b[3], done[b[0]] || 0); got += m;
      const s = AME_SUBJECT[b[0]] || (b[0] === "focus" ? AME_FOCUS[dow] : null); if (s && m) subj[s] = (subj[s] || 0) + m;
      (m >= b[3] ? fin : left).push(b[1] + (m && m < b[3] ? ` (${m}/${b[3]}m)` : "")); }
    return { day, dow, planned, got, subj, fin, left, full: planned > 0 && got >= planned };
  }
  function streak(st) {
    let n = 0, d = new Date(); if (d.getHours() * 60 + d.getMinutes() < 630) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 60; i++) { const iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()), s = dayStats(st, iso);
      const ok = s.dow === 0 ? !!s.day.rested : s.full; if (ok) n++; else if (i > 0) break; d.setDate(d.getDate() - 1); }
    return n;
  }
  function deskSummary(st) {
    st = st || readDesk(); if (!st) return null;
    const s = dayStats(st, dayKey()), p = st.pomo, g = {}; for (const k in (s.day.goals || {})) g[k] = String(s.day.goals[k]).slice(0, 80);
    return { date: dayKey(), studyDoneMin: s.got, studyPlannedMin: s.planned, pctOfStudyDone: s.planned ? Math.round(s.got * 100 / s.planned) : 0,
      finishedBlocks: s.fin.length ? undefined : undefined, studyBlocksCompleted: s.planned ? planFor(dayKey(), !!s.day.shortDay).blocks.filter(b => b[2] === "study" && (s.day.completed || {})[b[0]] >= b[3]).map(b => b[1]) : [],
      studyBlocksLeft: s.left, minutesBySubject: s.subj, restedToday: !!s.day.rested, shortDay: !!s.day.shortDay,
      sleepHours: s.day.sleep, sleepQuality: s.day.quality, energy: s.day.energy, mockScore: s.day.mock,
      note: (s.day.note || "").slice(0, 200) || undefined, goals: Object.keys(g).length ? g : undefined,
      pomodoro: p ? { mode: p.mode, running: !!p.running, cyclesToday: p.cycle } : undefined, focusMode: !!st.focusMode, streakDays: streak(st) };
  }
  function withActivity(conv) {
    const out = conv.map(m => ({ role: m.role, content: m.content })), i = out.length - 1;
    if (i < 0 || out[i].role !== "user") return out;
    const sum = deskSummary(), ev = EV.slice(-8).map(e => e.t + " (" + ago(e.at) + ")").join("; ");
    out[i].content += `\n\n[desk page status, not typed by me; use it naturally if relevant: ${sum ? JSON.stringify({ ...sum, datedPatterns: journal.patterns || [] }) : "no data yet"}${ev ? "; recent actions on the page: " + ev : ""}]`;
    return out;
  }

  // ---------- speech, bubble, moods ----------
  function showBubble(t, typing) { bubble.textContent = t; bubble.classList.toggle("typing", !!typing); bubble.classList.add("show"); clearTimeout(bt); if (!typing) bt = setTimeout(() => bubble.classList.remove("show"), 5500 + t.length * 45); }
  function burst(ch, n = 8) {
    const r = gif.getBoundingClientRect();
    for (let i = 0; i < n; i++) { const s = document.createElement("span"); s.className = "ame-spark"; s.textContent = pick([ch, "♡", "✦"]);
      s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top + r.height * .35 + "px";
      s.style.setProperty("--dx", (Math.random() * 160 - 80) + "px"); s.style.setProperty("--dy", -(40 + Math.random() * 110) + "px");
      document.body.appendChild(s); setTimeout(() => s.remove(), 1100); }
  }
  function mood(m) {
    if (!m) return; gif.classList.remove("hop", "shake"); void gif.offsetWidth;
    if (m === "happy" || m === "big") { gif.classList.add("hop"); burst("♡", m === "big" ? 16 : 7); } else if (m === "annoyed") gif.classList.add("shake");
    gif.src = m === "annoyed" ? GIFS.looking : GIFS.talking; clearTimeout(mt); mt = setTimeout(() => { gif.src = isOpen ? GIFS.talking : GIFS.idle; }, 2600);
  }
  function clearTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } bubble.classList.remove("typing"); }
  function say(text, o = {}) {
    clearTyping(); if (!text || (muted && !o.force) || isSending) return;
    lastSpeak = Date.now(); conversation.push({ role: "assistant", content: text }); saveConversation();
    if (isOpen) addMessage("ame", text); else { showBubble(text); widget.classList.add("unread"); }
    mood(o.mood);
  }
  new MutationObserver(() => { if (chat.classList.contains("open")) { bubble.classList.remove("show"); widget.classList.remove("unread"); } }).observe(chat, { attributes: true, attributeFilter: ["class"] });
  bubble.addEventListener("click", () => { bubble.classList.remove("show"); gif.click(); });
  const setMute = v => { muted = v; localStorage.setItem(MK, v ? "1" : "0"); muteBtn.textContent = v ? "wake" : "shh"; muteBtn.title = v ? "let Ame react again" : "stop Ame's unprompted reactions"; if (v) bubble.classList.remove("show"); };
  muteBtn.addEventListener("click", () => setMute(!muted)); setMute(muted);

  async function aiReact(desc, fallback, m) {
    const last = conversation[conversation.length - 1];
    if (muted || isSending || aiBusy || Date.now() - lastAi < 45000 || (last && last.role === "user")) return say(fallback, { mood: m });
    aiBusy = true; lastAi = Date.now();
    if (isOpen) { typingEl = document.createElement("div"); typingEl.className = "ame-msg ame"; typingEl.textContent = "..."; messagesEl.appendChild(typingEl); messagesEl.scrollTop = messagesEl.scrollHeight; } else showBubble("...", true);
    const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 9000);
    try {
      const msgs = conversation.slice(-14).map(x => ({ role: x.role, content: x.content })).concat([{ role: "user", content: `[site event, not typed by me; the desk page reported it: ${desc}. Dated observations: ${JSON.stringify(journal.patterns || [])}. react to it in 1-2 short lines, in character, using what you know of my day.]` }]);
      const res = await fetch(BACKEND, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal, body: JSON.stringify({ messages: msgs, context: Object.assign(ameContext(), { event: desc }) }) });
      const r = ((await res.json()).reply || "").trim(); say(r && r.length < 420 ? r : fallback, { mood: m });
    } catch (e) { say(fallback, { mood: m }); } finally { clearTimeout(to); aiBusy = false; clearTyping(); }
  }

  // ---------- reacting to work done (diffing the app's saved state) ----------
  const L = {
    done: ["{t} ticked. i felt that. next.", "{t}. done. i'm writing it on my arm.", "good. {t} is behind you. don't coast."],
    doneLife: ["{t} counted. good. be a person for a bit.", "eating/resting is part of the plan too. i approve."],
    prog: ["more minutes on {t}. i saw the number move.", "{m} min of {t}. keep stacking it."],
    undo: ["...you un-ticked {t}. i saw. be honest with yourself.", "{t} is open again. fine. but i'm watching."],
    dayfull: ["today's study is FULL. all of it. i'm not crying, you are.", "every block. every single one. come here. no, stay there. keep going to sleep on time."],
    cycle: ["that's pomodoro #{n}. i counted every second with you.", "cycle {n} done. breathe. then again."],
    pstart: ["timer's running. i'm counting with you.", "25 on. phone away. go."], pbreak: ["break. a real one. stand up.", "five minutes. water. not your phone."],
    ppause: ["paused? ...fine. i'm timing the pause too.", "you stopped the clock. i noticed."], preset: ["timer reset. fresh start. okay."],
    sleep: ["{v} hours logged. i like it when you tell me.", "sleep: {v}. a rested brain is the only brain i trust."], sleepLow: ["{v} hours?? that's an apology to your brain. sleep more tonight.", "{v} hours. i'm not mad. i'm worried. those are different."],
    quality: ["sleep quality logged. thank you for being honest.", "noted how you slept. it matters more than you think."], energy: ["energy logged. low or high, i'd rather know.", "okay. i'll plan my nagging around that."],
    mock: ["mock logged: {v}. a number isn't you. what you do next is.", "{v}. i'm not judging the score. i'm judging the error notebook."],
    note: ["you wrote a note. ...i read it.", "noted. literally. i'm keeping it."], goal: ["a goal, written down. now it's a promise.", "i saw that goal. i'll be asking later."],
    rest: ["rested logged. closed books. you listened to me. ♡", "good. rest counts. rest is the work today."], unrest: ["un-rested? okay. don't sneak a mock paper in."],
    short: ["short day. fine. the focus block is still sacred."], unshort: ["full day again. okay. i believe in you."], focus: ["focus mode. the world shrinks to the page. good."], unfocus: ["focus mode off. i'm still here."]
  };
  const PRI = ["dayfull", "done", "cycle", "undo", "mock", "sleep", "pstart", "pbreak", "ppause", "rest", "goal", "note", "prog"];
  const BIG = { dayfull: 1, done: 1, cycle: 1, mock: 1, sleep: 1, undo: 1 };
  const MOOD = { dayfull: "big", done: "happy", cycle: "happy", rest: "happy", goal: "happy", undo: "annoyed", unrest: "annoyed" };
  function describe(e) {
    const w = e.when || "", t = titleOf(e.id);
    return ({ done: `ticked off ${w}${t} (${e.min} min)`, prog: `logged ${e.min} min on ${w}${t}`, undo: `un-ticked ${w}${t}`, dayfull: "finished every study block for today",
      sleep: `logged ${w}sleep of ${e.val} hours`, quality: `logged ${w}sleep quality ${e.val}`, energy: `logged ${w}energy ${e.val}`, mock: `logged a ${w}mock score of ${e.val}`,
      note: `wrote a ${w}note`, goal: `set a ${w}goal`, rest: `marked ${w || "the day "}as rested`, unrest: "un-marked rested", short: "turned on short day", unshort: "turned off short day",
      focus: "turned on focus mode", unfocus: "turned off focus mode", cycle: `finished a pomodoro (cycle ${e.n})`, pstart: "started the pomodoro timer", pbreak: "started a pomodoro break", ppause: "paused the pomodoro timer", preset: "reset the pomodoro timer" })[e.type];
  }
  function diff(p, c) {
    const ev = [], today = dayKey(), yday = dayKey(new Date(Date.now() - 864e5)), A = p.days || {}, B = c.days || {};
    for (const iso of new Set([...Object.keys(A), ...Object.keys(B)])) {
      const a = A[iso] || {}, b = B[iso] || {}, ac = a.completed || {}, bc = b.completed || {}, when = iso === today ? "" : iso === yday ? "yesterday's " : iso + " ";
      for (const id in bc) { if (!(id in ac)) ev.push({ type: "done", id, min: bc[id], when, k: "d" + iso + id }); else if (bc[id] > ac[id]) ev.push({ type: "prog", id, min: bc[id], when, k: "p" + iso + id }); }
      for (const id in ac) if (!(id in bc)) ev.push({ type: "undo", id, when, k: "d" + iso + id });
      for (const k of ["sleep", "quality", "energy", "mock"]) if (b[k] != null && b[k] !== a[k]) ev.push({ type: k, val: b[k], when, k: k + iso });
      if (b.note && b.note !== a.note) ev.push({ type: "note", when, k: "n" + iso });
      if (Object.keys(b.goals || {}).length > Object.keys(a.goals || {}).length) ev.push({ type: "goal", when, k: "g" + iso });
      if (!!a.rested !== !!b.rested) ev.push({ type: b.rested ? "rest" : "unrest", when, k: "r" + iso });
      if (!!a.shortDay !== !!b.shortDay) ev.push({ type: b.shortDay ? "short" : "unshort", when, k: "s" + iso });
    }
    if (!dayStats(p, today).full && dayStats(c, today).full) ev.push({ type: "dayfull", k: "full" });
    if (!!p.focusMode !== !!c.focusMode) ev.push({ type: c.focusMode ? "focus" : "unfocus", k: "f" });
    const pp = p.pomo, cp = c.pomo;
    if (pp && cp && pp.mode === "work" && cp.mode === "break" && cp.running) ev.push({ type: "cycle", n: cp.cycle, k: "pomo" });
    else if (pp && cp && cp.cycle > pp.cycle) ev.push({ type: "cycle", n: cp.cycle, k: "pomo" });
    else if (cp && cp.running && (!pp || !pp.running)) ev.push({ type: cp.mode === "break" ? "pbreak" : "pstart", k: "pomo" });
    else if (pp && pp.running && cp && !cp.running) ev.push({ type: "ppause", k: "pomo" });
    else if (pp && !cp) ev.push({ type: "preset", k: "pomo" });
    return ev;
  }
  let prev = readDesk(), pending = new Map(), flushT = 0;
  function onDeskWrite() {
    const cur = readDesk(); if (!cur) return; const p = prev; prev = cur; lastAct = Date.now();
    if (!ready || !p) return; diff(p, cur).forEach(e => pending.set(e.k, e)); clearTimeout(flushT); flushT = setTimeout(flush, 1200);
  }
  function flush() {
    const evs = [...pending.values()].filter(e => e.type !== "mock" && !(e.type === "note" && Object.values(readDesk()?.days || {}).some(d => Number.isFinite(d.mock)))); pending.clear(); if (!evs.length) return;
    evs.forEach(e => { const d = describe(e); if (d) { EV.push({ t: d, at: Date.now() }); } });
    if (EV.length > 30) EV.splice(0, EV.length - 30);
    evs.sort((a, b) => { const x = PRI.indexOf(a.type), y = PRI.indexOf(b.type); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    const e = evs[0], d = describe(e); if (!d || muted) return;
    const pctNow = deskSummary().pctOfStudyDone;
    let key = e.type === "done" && kindOf(e.id) !== "study" ? "doneLife" : e.type === "sleep" && e.val < 6 ? "sleepLow" : e.type;
    if (!L[key] || (Date.now() - lastSpeak < 3500 && !BIG[e.type]) || !okCool("ev" + e.type, e.type === "prog" ? 90000 : 8000)) return;
    const line = pick(L[key]).replace("{t}", titleOf(e.id)).replace("{m}", e.min).replace("{n}", e.n).replace("{v}", e.val);
    const extra = e.type === "done" && kindOf(e.id) === "study" && pctNow < 100 ? ` (${pctNow}% of today)` : "";
    const m = key === "sleepLow" ? "annoyed" : MOOD[e.type] || (L[key] ? "happy" : "");
    if (BIG[e.type] && (e.type !== "undo" || kindOf(e.id) === "study") && (e.type !== "done" || kindOf(e.id) === "study")) aiReact(d, line + extra, m); else say(line, { mood: m });
  }
  const _si = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k) { const r = _si.apply(this, arguments); if (k === DK && this === window.localStorage) setTimeout(() => { try { onDeskWrite(); } catch (e) {} }, 0); return r; };
  setTimeout(() => { ready = true; prev = readDesk(); }, 2200);

  // ---------- reacting to inputs / presence ----------
  document.addEventListener("pointerdown", e => { lastAct = Date.now(); }, true);
  let clicks = [];
  document.addEventListener("click", e => {
    if (e.target.closest("#ame-widget,#mp-widget") || !e.target.closest("#root button,#root a,#root summary,#root label")) return;
    gif.classList.remove("nod"); void gif.offsetWidth; gif.classList.add("nod");
    const n = Date.now(); clicks = clicks.filter(t => n - t < 6000); clicks.push(n);
    if (clicks.length >= 12 && okCool("mash", 300000)) say(pick(["stop mashing buttons, p-chan. what are you looking for?", "so many clicks. nothing's hidden in there. i checked."]), { mood: "annoyed" });
  }, true);
  let typeT = 0;
  document.addEventListener("input", e => {
    lastAct = Date.now(); const t = e.target; if (t.closest("#ame-widget,#mp-widget") || !/^(TEXTAREA|INPUT)$/.test(t.tagName)) return;
    clearTimeout(typeT); typeT = setTimeout(() => { if (!muted && !isOpen && okCool("typing", 360000)) say(pick(["you're writing something. i'm not reading over your shoulder. (i am.)", "typing in the page, not to me. fine. i'm patient."]), { mood: "happy" }); }, 1800);
  }, true);
  let sc = [];
  addEventListener("scroll", () => { const n = Date.now(); lastAct = n; sc = sc.filter(t => n - t < 7000); sc.push(n); if (sc.length > 60 && okCool("scroll", 600000)) say(pick(["scrolling isn't studying. ...i'm kidding. kind of.", "you're scrolling past the same thing. what are you looking for?"]), { mood: "annoyed" }); }, { passive: true, capture: true });
  addEventListener("keydown", () => { lastAct = Date.now(); }, true);

  let near = false, nearT = 0, raf = 0;
  addEventListener("pointermove", e => {
    if (raf) return; raf = requestAnimationFrame(() => { raf = 0; lastAct = Date.now();
      const r = gif.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), k = Math.max(-1, Math.min(1, dx / 420)), d = Math.hypot(dx, dy);
      gif.style.setProperty("--ame-rot", (k * 6).toFixed(1) + "deg"); gif.style.setProperty("--ame-tx", (k * 8).toFixed(1) + "px");
      if (d < 110 && !near) { near = true; if (!isOpen) gif.src = GIFS.looking; nearT = setTimeout(() => { if (!muted && !isOpen && okCool("hover", 420000)) say(pick(["you're hovering. click me or don't. ...click me.", "i see the cursor. i see you hesitating."]), { mood: "happy" }); }, 3500); }
      else if (d > 150 && near) { near = false; clearTimeout(nearT); if (!isOpen) gif.src = GIFS.idle; } });
  }, { passive: true });

  // she notices if you leave
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); document.title = "...p-chan? ♡"; return; }
    document.title = TITLE; lastAct = Date.now(); if (!hiddenAt) return;
    const min = Math.round((Date.now() - hiddenAt) / 60000), ctx = ameContext(); hiddenAt = 0; if (min < 2 || muted) return;
    const line = min < 6 ? "back already? i barely started missing you." : min < 30 ? `${min} minutes gone. i counted every one.` : `${min} minutes. where did you go?`;
    EV.push({ t: `left the page for ${min} min`, at: Date.now() });
    if (min >= 10 && ctx.mode === "study") aiReact(`left the page for ${min} minutes during a study block (${ctx.block})`, line, "annoyed"); else say(line, { mood: min < 6 ? "happy" : "annoyed" });
  });

  // block changes + idling while she's supposed to be studying
  let lastBlock = ameContext().blockId, lastIdle = 0;
  setInterval(() => {
    if (muted) return; const c = ameContext(), st = readDesk();
    if (c.blockId !== lastBlock) {
      const old = lastBlock; lastBlock = c.blockId; lastAct = Math.max(lastAct, Date.now() - 60000);
      if (kindOf(old) === "study" && st) { const ds = dayStats(st, dayKey()), done = (ds.day.completed || {})[old] || 0, need = (ALL.find(b => b[0] === old) || [0, 0, 0, 1])[3];
        const t = titleOf(old); EV.push({ t: `${t} block ended ${done >= need ? "ticked" : "NOT ticked"}`, at: Date.now() });
        if (done < need) return aiReact(`the ${t} block just ended and it is not ticked off (${done}/${need} min logged)`, `${t} block ended and it isn't ticked. did you do it and forget, or...`, "annoyed"); }
      if (c.blockId !== "sleep") say(`new block: ${c.block}. ${c.minutesLeft} min. ${c.mode === "study" ? "eyes on the page." : "take it properly."}`, { mood: c.mode === "study" ? "happy" : "" });
    } else if (c.mode === "study" && Date.now() - lastAct > 420000 && Date.now() - lastIdle > 900000 && !document.hidden) {
      lastIdle = Date.now(); const m = Math.round((Date.now() - lastAct) / 60000);
      if (m >= 20) aiReact(`has been idle on the page for ${m} minutes during ${c.block}`, `${m} minutes of nothing during ${c.block}. p-chan.`, "annoyed"); else say(pick(["quiet for a while. still studying or just staring at me?", `${c.block} is running. i don't see you moving.`]), { mood: "annoyed" });
    }
  }, 20000);

  // hello on load, based on today's progress
  setTimeout(() => {
    const st = readDesk(); if (!st || muted || T.hello && Date.now() - T.hello < 108e5) return; T.hello = Date.now(); saveT();
    const s = deskSummary(st), c = ameContext(); if (c.blockId === "sleep") return;
    say(s.pctOfStudyDone >= 100 ? "today's study is already done. i'm proud. don't ruin it by doom-scrolling." : s.pctOfStudyDone === 0 && c.mode === "study" ? `${c.block} is running and nothing's ticked yet. start something.` : s.studyPlannedMin ? `you're at ${s.pctOfStudyDone}% of today. ${s.studyBlocksLeft.length} study blocks to go.` : "hi. i'm watching the page. don't mind me.", { mood: "happy" });
  }, 3500);

  // music: react even when the chat is closed
  const _nudge = window.__ameNudge;
  window.__ameNudge = function (kind, detail) {
    _nudge(kind, detail);
    if (kind === "music" && !readDesk()?.focusMode) { EV.push({ t: "started playing music" + (detail ? ": " + detail : ""), at: Date.now() }); if (!isOpen && !muted && okCool("musicBubble", 120000)) say(pick(LOCAL.music), { mood: "happy" }); }
  };


  /* ===== Ame v2: dragging, live stat, chips, content-aware reactions, milestones ===== */
  const ask = t => { if (isSending) return; if (!isOpen) openChat(); input.value = t; sendMessage(); };
  // richer work data for the AI: last 7 days + mock trend
  const _ds = deskSummary;
  deskSummary = function (st) {
    const o = _ds(st); if (!o) return o; st = st || readDesk(); const wk = [], mocks = [];
    for (let i = 0; i < 7; i++) { const iso = dayKey(new Date(Date.now() - i * 864e5)), d = dayStats(st, iso); wk.push({ day: iso, studyMin: d.got, pct: d.planned ? Math.round(d.got * 100 / d.planned) : 0 }); if (d.day.mock != null) mocks.push({ day: iso, score: d.day.mock }); }
    o.last7days = wk; o.mockTrend = mocks.reverse(); o.studyMinYesterday = wk[1].studyMin; return o;
  };
  // quick-ask chips (AI answers using the live desk data)
  const chips = document.createElement("div"); chips.id = "ame-chips";
  [["how's my day?", "how's my day going so far? be honest about what i've actually done."], ["what's next?", "what should i do next, based on my schedule and what's left?"], ["i'm stuck", "i'm stuck and low on energy. help me get moving."], ["hype me", "hype me up using what i've actually done today."]].forEach(([l, q]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = l; b.onclick = () => ask(q); chips.appendChild(b); });
  chat.insertBefore(chips, chat.querySelector(".ame-input-area"));
  // live stat chip
  const stat = document.createElement("button"); stat.id = "ame-stat"; stat.type = "button"; widget.appendChild(stat);
  stat.onclick = () => ask("review my day so far in 2 lines. what did i do, what's left?");
  const upStat = () => { const d = deskSummary(); stat.textContent = d ? `♡ ${d.pctOfStudyDone}% · ${d.streakDays}d` : "♡ hi"; stat.title = d ? `${d.studyDoneMin}/${d.studyPlannedMin} study min today · ${d.streakDays}-day streak — click for a review` : "click me"; };
  upStat(); setInterval(upStat, 15000);
  const _si2 = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k) { const r = _si2.apply(this, arguments); if (k === DK && this === window.localStorage) setTimeout(() => { try { upStat(); milestone(); } catch (e) {} }, 50); return r; };
  // milestones: 25 / 50 / 75 % of today's study
  function milestone() {
    if (!ready || muted) return; const d = deskSummary(); if (!d) return; T.ms = T.ms && T.ms.d === d.date ? T.ms : { d: d.date, hit: [] };
    const t = [25, 50, 75].filter(x => d.pctOfStudyDone >= x && d.pctOfStudyDone < 100 && !T.ms.hit.includes(x)).pop(); if (!t) return;
    T.ms.hit.push(...[25, 50, 75].filter(x => x <= t)); saveT();
    setTimeout(() => aiReact(`passed ${t}% of today's study plan (${d.studyDoneMin}/${d.studyPlannedMin} min)`, `${t}% of today is done. i see the number. keep going.`, "happy"), 2500);
  }
  // draggable Ame
  const PK = "ame-pos-v1"; let dg = null, moved = false, rev = [], lastDx = 0;
  const place = (x, y) => { const w = widget.offsetWidth || 140, h = widget.offsetHeight || 140; x = Math.max(0, Math.min(innerWidth - w, x)); y = Math.max(isOpen ? 470 : 0, Math.min(innerHeight - h, y)); Object.assign(widget.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" }); return [x, y]; };
  try { const p = JSON.parse(localStorage.getItem(PK) || "null"); if (p) place(p.x, p.y); } catch (e) {}
  gif.addEventListener("pointerdown", e => { if (e.button) return; const r = widget.getBoundingClientRect(); dg = { ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY }; moved = false; rev = []; gif.setPointerCapture(e.pointerId); });
  gif.addEventListener("pointermove", e => {
    if (!dg) return; if (!moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 7) return;
    if (!moved) { moved = true; gif.classList.add("dragging"); if (okCool("pick", 40000)) say(pick(["hey—put me down!", "where are we going? ...okay.", "carrying me around the page? fine."]), { mood: "annoyed" }); }
    place(e.clientX - dg.ox, e.clientY - dg.oy); const dx = Math.sign(e.movementX || 0);
    if (dx && dx !== lastDx) { lastDx = dx; const n = Date.now(); rev = rev.filter(t => n - t < 1200); rev.push(n); if (rev.length > 7 && okCool("dizzy", 60000)) { say("stop shaking me!! i'm dizzy!!", { mood: "annoyed", force: 1 }); gif.classList.remove("shake"); void gif.offsetWidth; gif.classList.add("shake"); } }
  });
  const endDrag = () => { if (!dg) return; dg = null; gif.classList.remove("dragging"); if (!moved) return; const r = widget.getBoundingClientRect(); localStorage.setItem(PK, JSON.stringify({ x: r.left, y: r.top })); if (okCool("drop", 40000)) say(pick(["...okay. i like it here.", "thanks. new view. i can see everything.", "you moved me. i'll still be watching."]), { mood: "happy" }); };
  gif.addEventListener("pointerup", endDrag); gif.addEventListener("pointercancel", endDrag);
  gif.addEventListener("click", e => { if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; } }, true);
  addEventListener("resize", () => { const r = widget.getBoundingClientRect(); if (widget.style.left) place(r.left, r.top); });
  // content-aware reactions to what you write on the page
  const KW = [[/tired|sleepy|exhaust|can'?t|hate|give up|stuck|panic|stress|anxious|bad day/i, "...i read that. you're allowed to be tired. five minutes, then one small thing. i'll wait.", "annoyed"], [/formula|derive|integral|equation|momentum|mole|organic|vector|calculus/i, "ooh. real study words. write it out properly, not in your head.", "happy"], [/forgot|wrong|mistake|careless|error|broke/i, "good. naming the mistake is half the fix. now write what you'll do differently.", "happy"]];
  document.addEventListener("change", e => {
    const t = e.target; if (!t.closest || !t.closest("#root") || !/^(TEXTAREA|INPUT)$/.test(t.tagName) || t.type === "checkbox" || t.type === "range") return;
    const v = (t.value || "").trim(); if (v.length < 4 || isNaN(v) === false || muted || t.tagName === "TEXTAREA") return; lastAct = Date.now();
    const kw = KW.find(k => k[0].test(v)); EV.push({ t: `wrote "${v.slice(0, 60)}" on the page`, at: Date.now() });
    if (!okCool("fld", 20000)) return;
    if (kw) say(kw[1], { mood: kw[2] }); else aiReact(`wrote this on the page (${t.placeholder || "a text field"}): "${v.slice(0, 160)}"`, pick(L.note), "happy");
  }, true);
  // what you click, select, copy, paste, hover
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("#root button,#root a"); if (!b || b.closest("#ame-widget")) return; const x = (b.textContent || b.getAttribute("aria-label") || "").trim().replace(/\s+/g, " "); if (x && x.length < 28) { EV.push({ t: `clicked "${x}"`, at: Date.now() }); if (EV.length > 30) EV.shift(); } }, true);
  const HV = [[/erase it|reset trial/i, "...don't. every logged day lives in there. i'd forget all of it."], [/download log/i, "backing me up? ...good. keep me safe."], [/^pause$/i, "pausing? i'll be timing the pause."]];
  document.addEventListener("pointerover", e => { if (muted || isOpen) return; const b = e.target.closest && e.target.closest("#root button"); if (!b) return; const x = (b.textContent || "").trim(), h = HV.find(h => h[0].test(x)); if (h && okCool("hv" + h[0], 90000)) say(h[1], { mood: /erase/i.test(x) ? "annoyed" : "" }); }, true);
  let selT = 0; document.addEventListener("selectionchange", () => { clearTimeout(selT); selT = setTimeout(() => { const q = String(getSelection()).trim(); if (q.length > 25 && !muted && !isOpen && okCool("sel", 300000)) say("you highlighted that. is that the important bit? ...tell me if it is.", { mood: "happy" }); }, 900); });
  document.addEventListener("copy", () => { if (!muted && !isOpen && okCool("copy", 400000)) say("copying something? don't just copy. type it out once. it sticks."); });
  document.addEventListener("paste", e => { if (e.target.closest && e.target.closest("#ame-widget")) return; if (!muted && !isOpen && okCool("paste", 400000)) say("pasting? ...write the last line yourself. i'll know.", { mood: "annoyed" }); });
  // pomodoro countdown awareness
  setInterval(() => { if (muted || document.hidden) return; const st = readDesk(), p = st && st.pomo; if (!p || !p.running || !p.endsAt) return; const l = p.endsAt - Date.now();
    if (l > 55e3 && l < 62e3 && okCool("p60", 50000)) say(p.mode === "work" ? "one minute left. finish the line you're on." : "one minute of break left. water. stretch.", { mood: "happy" }); }, 4000);
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  // Persistent companion journal. Only facts derived from saved days enter memory.
  const journalKey = 'ame-journal-v1';
  let journal;
  try { journal = JSON.parse(localStorage.getItem(journalKey)); } catch (_) {}
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) journal = {};
  for (const key of ['daily', 'weekly', 'unlocks']) if (!journal[key] || typeof journal[key] !== 'object' || Array.isArray(journal[key])) journal[key] = {};
  const saveJournal = () => {
    for (const key of ['daily', 'weekly']) for (const date of Object.keys(journal[key]).sort().slice(0, -35)) delete journal[key][date];
    localStorage.setItem(journalKey, JSON.stringify(journal));
  };
  const badge = document.createElement('span'); badge.id = 'ame-mood'; badge.setAttribute('role', 'status'); widget.appendChild(badge);
  const sticker = document.createElement('span'); sticker.id = 'ame-sticker'; widget.appendChild(sticker);
  const panel = document.createElement('details'); panel.id = 'ame-journal';
  const heading = document.createElement('summary'); heading.textContent = '♡ Ame’s journal'; panel.appendChild(heading);
  const entries = document.createElement('div'); panel.appendChild(entries);
  document.body.insertBefore(panel, widget);
  const voice = document.createElement('button'); voice.type = 'button';
  const voiceLabel = () => { voice.textContent = journal.voice ? 'Voice: on' : 'Voice: off'; voice.setAttribute('aria-pressed', String(!!journal.voice)); };
  voice.onclick = () => { journal.voice = !journal.voice; saveJournal(); voiceLabel(); if (!journal.voice) window.speechSynthesis?.cancel(); }; voiceLabel(); chips.appendChild(voice);
  let audioContext, audioReady = false;
  document.addEventListener('pointerdown', () => { audioReady = true; }, { once: true });
  function companionSound(text, big = false) {
    if (!readDesk()?.sound || !audioReady || muted || document.hidden) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().catch(() => {});
      const osc = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
      osc.type = 'sine'; osc.frequency.setValueAtTime(740, now); osc.frequency.exponentialRampToValueAtTime(990, now + .18);
      gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + .45);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + .5);
      if (big && journal.voice && window.speechSynthesis) { speechSynthesis.cancel(); const line = new SpeechSynthesisUtterance(text); line.rate = .95; line.volume = .6; speechSynthesis.speak(line); }
    } catch (_) { /* Audio is optional on unsupported browsers. */ }
  }
  let replaying = false;
  const oldRender = renderSavedMessages;
  renderSavedMessages = function() { replaying = true; try { oldRender(); } finally { replaying = false; } };
  const oldAddMessage = addMessage;
  addMessage = function(role, text) { oldAddMessage(role, text); if (role === 'ame' && !replaying) companionSound(text); };
  const oldSay = say;
  say = function(text, options = {}) {
    if (readDesk()?.focusMode && !options.force && !options.idle) return;
    const spokeAt = lastSpeak; oldSay(text, options);
    if (!isOpen && lastSpeak !== spokeAt) companionSound(text, options.mood === 'big');
  };
  const oldAiReact = aiReact;
  aiReact = function(...args) { if (!readDesk()?.focusMode) return oldAiReact(...args); };
  const oldContext = ameContext;
  ameContext = function() { return { ...oldContext(), patterns: journal.patterns || [], recentRecaps: Object.entries(journal.daily).slice(-3), unlocked: Object.keys(journal.unlocks), memoryGuidance: 'Only mention dated observations supplied here. Unlogged does not mean skipped. Do not invent memories or infer causation.' }; };
  let sessionSulkyUntil = 0, lastJournalState = readDesk(), journalBusy = false, journalTimer;
  function renderJournal() {
    entries.replaceChildren();
    const add = (title, text) => { const article = document.createElement('article'), h = document.createElement('h3'), p = document.createElement('p'); h.textContent = title; p.textContent = text; article.append(h,p); entries.appendChild(article); };
    for (const [date, recap] of Object.entries(journal.weekly).sort().slice(-1)) add('Week ending ' + date, (recap.summary ? recap.summary+'\n\n' : '') + recap.text);
    for (const [date, recap] of Object.entries(journal.daily).sort().slice(-3).reverse()) add(date + ' · day review', (recap.summary ? recap.summary+'\n\n' : '') + recap.text);
    if (!entries.children.length) add('Tonight, we look back.', 'Your day review appears at wind-down or when you mark the day rested. Sunday brings a weekly card.');
    add('Little rewards', '1 day: familiar lines · 3 days: heart sticker · 7 days: alternate idle GIF. Unlocked: ' + (Object.keys(journal.unlocks).join(', ') || 'keep going ♡'));
    const patterns = journal.patterns || [];
    if (patterns.length) add('What I remember', patterns.slice(-5).map(p => `${p.date}: ${p.pattern}`).join('\n'));
  }
  async function writeRecap(kind, date, facts, fallback) {
    if (journalBusy || JSON.stringify(journal[kind][date]?.facts) === JSON.stringify(facts)) return;
    journalBusy = true;
    // Save a useful local recap first, including when offline or muted.
    journal[kind][date] = { text: fallback, source: 'local', facts }; saveJournal(); renderJournal();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    let text = fallback;
    try {
      if (muted) return;
      const response = await fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: [{ role: 'user', content: (kind === 'daily' ? 'Write a short end-of-day recap: what got done, what remains unlogged, and exactly one thing for tomorrow. Use only the supplied facts.' : 'Summarise this week in three short lines. Pick one focus for next week from the supplied facts. Missing logs are unknown.') + '\nFacts from my study log: ' + JSON.stringify(facts) + '\nDated observations: ' + JSON.stringify(journal.patterns || []) }], context: { ...ameContext(), recap: facts } }) });
      if (!response.ok) throw new Error('recap unavailable');
      const data = await response.json(); if (typeof data.reply !== 'string' || !data.reply.trim() || data.reply.length > 1600) throw new Error('invalid recap');
      text = data.reply.trim(); journal[kind][date] = { text, summary: fallback, source: 'ai', facts }; saveJournal(); renderJournal();
    } catch (_) { /* The saved factual recap remains available. */ }
    finally { clearTimeout(timeout); journalBusy = false; }
    if (!readDesk()?.focusMode) { say(text, { mood: 'big' }); if (isOpen) companionSound(text, true); }
  }
  function updateCompanion() {
    const st = readDesk(); if (!st) return;
    const date = dayKey(), s = dayStats(st, date), count = streak(st), now = Date.now();
    if (st.focusMode && !widget.classList.contains('ame-focused')) bubble.classList.remove('show');
    widget.classList.toggle('ame-focused', !!st.focusMode); panel.hidden = !!st.focusMode;
    if (!st.sound || muted) window.speechSynthesis?.cancel();
    if (journal.lastStreak > count) sessionSulkyUntil = now + 20 * 60000;
    journal.lastStreak = count; journal.lastDate = date;
    journal.patterns = AmeInsights.patterns(st.days || {}, date, d => dayStats(st,d));
    for (const [threshold, reward] of [[1,'familiar lines'],[3,'heart sticker'],[7,'alternate idle']]) if (count >= threshold) journal.unlocks[reward] = true;
    sticker.textContent = journal.unlocks['heart sticker'] ? '💗' : '';
    if (journal.unlocks['alternate idle']) GIFS.idle = 'https://media.tenor.com/nWtsbiRnYJMAAAAM/ame-ame-chan.gif';
    if (journal.unlocks['familiar lines'] && !LOCAL.poke.includes('same desk, our little ritual. i remember. ♡')) LOCAL.poke.push('same desk, our little ritual. i remember. ♡');
    const feeling = Number.isFinite(s.day.sleep) && s.day.sleep < 6 ? 'worried' : sessionSulkyUntil > now ? 'sulking' : s.full || s.day.rested || count >= 3 ? 'proud' : 'calm';
    widget.dataset.mood = feeling; badge.textContent = ({ proud:'♡ proud', worried:'☁ worried', sulking:'☂ sulking', calm:'✦ here' })[feeling];
    saveJournal(); renderJournal();
    const priorDays = lastJournalState?.days || {};
    for (const [iso,d] of Object.entries(st.days || {})) {
      const before = priorDays[iso] || {};
      if (Number.isFinite(d.mock) && (d.mock !== before.mock || d.note !== before.note)) {
        const line = d.note?.trim() ? `mock ${d.mock} on ${iso}: “${d.note.trim().slice(0,160)}”. that's your error-notebook link. redo one of those mistakes tomorrow.` : `mock ${d.mock} on ${iso}. what went wrong? write the topic, mistake, and next step in that day's Note field.`;
        say(line, { mood: d.note?.trim() ? 'happy' : 'annoyed' });
      }
    }
    lastJournalState = st;
    const context = ameContext();
    if (s.day.rested || context.blockId === 'wind' || context.blockId === 'sleep') {
      const fallback = `Done: ${s.got} study minutes${s.fin.length ? ' · '+s.fin.join(', ') : ''}. Still unlogged: ${s.left.join(', ') || 'nothing'}${s.day.rested ? '. Rest counted' : ''}. Tomorrow: ${s.left[0] ? 'start with '+s.left[0] : 'keep the same steady rhythm'}.`;
      writeRecap('daily', date, { date, done: s.fin, left: s.left, minutes: s.got, sleep: s.day.sleep, mock: s.day.mock, note: s.day.note, rested: !!s.day.rested, shortDay: !!s.day.shortDay }, fallback);
    }
    if (s.dow === 0 && !journalBusy) {
      const week = AmeInsights.weekly(st.days || {}, date, d => dayStats(st,d));
      // Wait for wind-down/rest so Sunday's card includes the whole logged week.
      if (s.day.rested || ['wind','sleep'].includes(context.blockId)) {
        const text = `${Object.entries(week.subjects).map(([s,m])=>`${s}: ${m}m`).join(' · ')}. Best logged day: ${week.best ? week.best.date+' ('+week.best.minutes+'m)' : 'none'}. Sleep average: ${week.sleepAverage === null ? 'not logged' : week.sleepAverage.toFixed(1)+'h across '+week.sleepDays+' nights'}. Next week: ${week.focus}.`;
        writeRecap('weekly', date, week, text);
      }
    }
  }
  const originalDeskWrite = onDeskWrite;
  onDeskWrite = function() { originalDeskWrite(); clearTimeout(journalTimer); journalTimer = setTimeout(updateCompanion, 1800); };
  addEventListener('storage', e => { if (e.key === DK) updateCompanion(); });
  let focusPingAt = 0;
  setInterval(() => {
    updateCompanion();
    if (document.hidden || muted) return;
    const now = Date.now(), st = readDesk();
    if (st?.focusMode) {
      if (now-lastAct > 15*60000 && now-focusPingAt > 30*60000) { focusPingAt = now; say('still with me? if you’re working on paper, carry on. otherwise, one small step.', { idle:true }); }
      return;
    }
    const d = new Date(), minutes = d.getHours()*60+d.getMinutes();
    const sleepAt = st?.days?.[dayKey()]?.shortDay ? '00:00' : '1:00';
    if ((minutes >= (sleepAt === '00:00' ? 0 : 30) && minutes < 630) && now-lastAct < 120000 && okCool('bedtime', 60*60000))
      say(`${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. ${minutes >= 60 || sleepAt === '00:00' ? 'past the '+sleepAt+' sleep target. close the books; we can continue tomorrow.' : 'sleep is at 1:00. save your note and wind down.'}`, { mood:'annoyed' });
  }, 20000);
  setTimeout(updateCompanion, 2500);
})();
