/* ============================================================
   music.js: the song and lyric scene that opens when she redeems the voucher
   (black screen, scattered words, a neon ball with a tail).
   index.html loads this file. Keep it next to index.html and someday.mp3.
   Edit SONG and LYRICS below. Open index.html?sync to record exact word times.
   ============================================================ */

/* ✏️ EDIT HERE: the song that plays when she redeems the voucher (black screen, scattered words, a neon ball with a tail) */
const SONG = {
  enabled: true,        // ✏️ false = skip the song and just show the redeemed ticket
  src: "someday.mp3",   // ✏️ your audio file, saved next to index.html. If it's missing, the lyrics still run silently on a timer so you can test.
  volume: 1,
  minWords: 10,         // ✏️ every scattered group has at least this many words
  beat: { t0: 0.62, period: 0.78 }, // the song's pulse (measured from someday.mp3, about 77 bpm). The ball throbs on it. Delete this line for a different song.
  times: []             // ✏️ the exact second each word is sung. Open index.html?sync, tap along, and paste the result here. Empty = timing is estimated from the lines below.
};
// ✏️ One entry per lyric line. t = the second that line starts being sung. Optional d = how many seconds the singing lasts.
// These t values are rough. The ?sync helper gives you exact times for every word (see SONG.times above).
const LYRICS = [
  { t: 2,  text: "I wanna be the melting candle to your flame" },
  { t: 6,  text: "Your closest friend, your fiercest love, one and the same" },
  { t: 10, text: "Some things will never ever change" },
  { t: 13, text: "I wanna be there when the sunlight hits your face" },
  { t: 17, text: "I wanna be there for you every single day. All that to say. All that to say" }
];

/* ---------- Look and markup (added to the page from here, so this one file is all the music needs) ---------- */
document.head.insertAdjacentHTML("beforeend", `<style id="musicCss">
  /* Lyric scene: black screen, scattered words, neon line */
  #lyr { position:fixed; inset:0; z-index:70; background:#000; overflow:hidden; opacity:0; pointer-events:none; transition:opacity .9s ease; }
  #lyr.open { opacity:1; pointer-events:auto; }
  .scene { position:absolute; inset:0; z-index:1; transition:opacity .7s; } .scene.out { opacity:0; }
  #lyrFx { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .lw { position:absolute; white-space:nowrap; font-weight:600; letter-spacing:.01em; color:rgba(255,255,255,.26); opacity:0; transform:scale(.6) rotate(var(--r,0deg));
        transition:opacity .6s ease, transform .6s var(--spring), color .25s, text-shadow .25s; }
  .lw.in { opacity:1; transform:scale(1) rotate(var(--r,0deg)); }
  .lw.now { transform:scale(1.18) rotate(var(--r,0deg)); }
  .lw.in.done { opacity:0; transform:scale(.85) rotate(var(--r,0deg)) translateY(-10px); transition:opacity 1.1s ease, transform 1.1s ease, color .25s, text-shadow 1.1s; }
  .lw.on { color:#fff; text-shadow:0 0 6px #fff, 0 0 18px rgba(255,255,255,.9), 0 0 38px rgba(170,190,255,.8); }
  #lyrSkip { position:absolute; z-index:2; top:max(.8rem,env(safe-area-inset-top)); right:.9rem; padding:.5rem .9rem; border-radius:9999px; font-size:.85rem;
             color:rgba(255,255,255,.6); border:1px solid rgba(255,255,255,.25); opacity:0; pointer-events:none; transition:opacity .6s; }
  #lyrSkip.show { opacity:1; pointer-events:auto; }

  /* Sync helper (open index.html?sync) */
  #sync { position:fixed; inset:0; z-index:90; background:#000; color:#fff; display:none; flex-direction:column; align-items:center; justify-content:center; padding:1.2rem; text-align:center; -webkit-user-select:none; user-select:none; }
  #sync.open { display:flex; }
  #syPad { width:100%; max-width:28rem; min-height:34vh; display:grid; place-items:center; border:2px dashed rgba(255,255,255,.4); border-radius:28px; font-size:1.6rem; font-weight:800; letter-spacing:.2em; touch-action:manipulation; }
  #syPad:active { background:rgba(255,255,255,.18); }
</style>`);
document.body.insertAdjacentHTML("beforeend", `
<!-- Lyric scene: opens when she redeems the voucher -->
<div id="lyr" role="dialog" aria-modal="true" aria-label="A song for you">
  <canvas id="lyrFx"></canvas>
  <button id="lyrSkip">Skip</button>
</div>

<!-- Sync helper: open index.html?sync, play the song and tap each word as it's sung -->
<div id="sync">
  <p id="syInfo" class="text-sm text-white/60">Tap along</p>
  <div id="syLine" class="my-5 text-xl font-semibold leading-relaxed max-w-md">Press Start, then tap the big pad the moment each highlighted word is sung.</div>
  <div id="syPad">TAP</div>
  <div class="flex gap-3 mt-5"><button id="syGo" class="btn btn-pri">Start song</button><button id="syUndo" class="btn btn-glass">Undo</button><button id="syClose" class="btn btn-glass">Close</button></div>
  <textarea id="syOut" readonly class="field mt-4 hidden" rows="4"></textarea>
  <button id="syCopy" class="btn btn-glass mt-3 hidden">Copy</button>
</div>
`);

/* ---------- Song + lyrics: black screen, scattered words, a neon ball with a tail (starts when she redeems the voucher) ---------- */
const lyr = $("#lyr"), lfx = $("#lyrFx"), lcx = lfx.getContext("2d");
let LY = null; // the show that's running right now
const sizeFx = () => { const r = Math.min(2, devicePixelRatio || 1); lfx.width = innerWidth * r; lfx.height = innerHeight * r; lcx.setTransform(r, 0, 0, r, 0, 0); };
addEventListener("resize", () => LY && sizeFx());

// Turns LYRICS into scenes of at least SONG.minWords words, each word with its own start/end second.
function lyricScenes() {
  const lines = LYRICS.map((l, i) => ({ text:l.text, d:l.d, t: typeof l.t === "number" ? l.t : i * 4 }));
  const words = [];
  lines.forEach((l, i) => {
    const ws = l.text.split(/\s+/).filter(Boolean);
    const next = i + 1 < lines.length ? lines[i + 1].t : l.t + 5;
    const sung = Math.max(0.6, l.d ?? Math.min(next - l.t - 0.2, ws.length * 0.4));
    const wt = ws.reduce((a, w) => a + w.length + 2, 0); let acc = 0;
    ws.forEach(w => { const s = l.t + sung * acc / wt; acc += w.length + 2; words.push({ w, l:i, s, e: l.t + sung * acc / wt }); });
  });
  const T = SONG.times || [];
  if (T.length && T.length !== words.length) console.warn(`SONG.times has ${T.length} times but the lyrics have ${words.length} words, so it is ignored.`);
  if (T.length === words.length) { // exact times from the ?sync helper: the words follow the singing
    words.forEach((w, k) => { w.s = T[k]; w.e = Math.min(k + 1 < T.length ? T[k + 1] : w.s + 0.9, w.s + 0.9); });
  } else if (SONG.beat) { // no tapped times yet: nudge each word onto the song's groove
    const q = SONG.beat.period / 2; let prev = -1;
    words.forEach(w => {
      const c = SONG.beat.t0 + Math.round((w.s - SONG.beat.t0) / q) * q, s = Math.max(Math.abs(c - w.s) < 0.14 ? c : w.s, prev + 0.05);
      w.e = Math.max(w.e + (s - w.s), s + 0.15); w.s = prev = s;
    });
  }
  const scenes = []; let cur = [];
  words.forEach((w, k) => { cur.push(w); if ((k + 1 === words.length || words[k + 1].l !== w.l) && cur.length >= SONG.minWords) { scenes.push(cur); cur = []; } });
  if (cur.length) { if (scenes.length) scenes[scenes.length - 1] = scenes[scenes.length - 1].concat(cur); else scenes.push(cur); }
  return scenes.map((ws, k, all) => {
    const prevEnd = k ? all[k - 1][all[k - 1].length - 1].e : 0;
    return { words: ws, appear: Math.max(0, Math.min(ws[0].s - 0.25, Math.max(ws[0].s - 1.6, prevEnd + 0.15))) };
  });
}

// Scatters one scene's words over the black screen. The ball will hop between them in order.
function buildScene(sc) {
  const W = innerWidth, H = innerHeight;
  const el = document.createElement("div"); el.className = "scene"; lyr.appendChild(el);
  const base = Math.max(15, Math.min(26, W / 17)), placed = [], pts = [];
  sc.words.forEach((wd, i) => {
    const sp = document.createElement("span"); sp.className = "lw"; sp.textContent = wd.w;
    sp.style.fontSize = Math.round(base * (0.85 + Math.random() * 0.75)) + "px";
    sp.style.setProperty("--r", (Math.random() * 20 - 10).toFixed(1) + "deg");
    el.appendChild(sp);
    const w = sp.offsetWidth, h = sp.offsetHeight;
    let best = { x:18, y:70 }, bestGap = -1;
    for (let k = 0; k < 70 && bestGap < 14; k++) { // try random spots, keep the one furthest from the other words
      const x = 18 + Math.random() * Math.max(1, W - 36 - w), y = 70 + Math.random() * Math.max(1, H - 126 - h);
      let gap = 1e9;
      for (const r of placed) gap = Math.min(gap, Math.hypot(Math.max(r.x - x - w, x - r.x - r.w, 0), Math.max(r.y - y - h, y - r.y - r.h, 0)));
      if (gap > bestGap) { bestGap = gap; best = { x, y }; }
    }
    placed.push({ x:best.x, y:best.y, w, h }); pts.push([best.x + w / 2, best.y + h / 2]);
    sp.style.left = best.x + "px"; sp.style.top = best.y + "px";
    wd.el = sp; wd.on = wd.now = wd.done = false;
    setTimeout(() => sp.classList.add("in"), 60 + Math.min(i * 55, 900));
  });
  return { sc, el, pts };
}

// A curved hop from word a to word b (e runs 0 to 1).
function arc(a, b, e, j) {
  const bend = (j % 2 ? 1 : -1) * 0.22, cx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * bend, cy = (a[1] + b[1]) / 2 + (b[0] - a[0]) * bend, u = 1 - e;
  return [u * u * a[0] + 2 * u * e * cx + e * e * b[0], u * u * a[1] + 2 * u * e * cy + e * e * b[1]];
}

function lyricFrame() {
  if (!LY) return;
  const t = LY.time(), now = performance.now(), TAIL = 750;
  let si = -1; LY.scenes.forEach((s, k) => { if (t >= s.appear) si = k; });
  if (si !== LY.cur) { // next group of words: old ones fade out, new ones scatter in
    if (LY.live) { const old = LY.live.el; old.classList.add("out"); setTimeout(() => old.remove(), 800); }
    LY.live = si >= 0 ? buildScene(LY.scenes[si]) : null; LY.cur = si; LY.trail = [];
  }
  lcx.clearRect(0, 0, innerWidth, innerHeight);
  const L = LY.live;
  if (L) {
    const ws = L.sc.words, n = ws.length;
    ws.forEach(w => { // a word lights up as it's sung, then fades away
      const on = t >= w.s, cur = on && t < w.e + 0.15, done = t > Math.max(w.e, w.s + 0.35) + 0.5;
      if (on !== w.on) w.el.classList.toggle("on", w.on = on);
      if (cur !== w.now) w.el.classList.toggle("now", w.now = cur);
      if (done !== w.done) w.el.classList.toggle("done", w.done = done);
    });
    let pos = L.pts[0]; // the ball reaches each word the moment it starts being sung
    if (t >= ws[0].s) {
      let j = n - 1; while (j > 0 && t < ws[j].s) j--;
      if (j < n - 1) {
        const a = Math.max(ws[j].s, ws[j + 1].s - 0.7), f = Math.min(1, Math.max(0, (t - a) / (ws[j + 1].s - a || 1)));
        pos = arc(L.pts[j], L.pts[j + 1], f * f * (3 - 2 * f), j);
      } else pos = L.pts[n - 1];
    }
    LY.trail.push({ x:pos[0], y:pos[1], n:now });
    while (LY.trail.length && now - LY.trail[0].n > TAIL) LY.trail.shift();
    const vis = Math.max(0, Math.min(1, 1 - (t - (ws[n - 1].s + 1.4)) / 0.8)); // ball and tail fade out after the last word
    lcx.globalAlpha = vis; lcx.lineCap = "round"; lcx.lineJoin = "round";
    const tr = LY.trail;
    for (let i = 1; i < tr.length; i++) { // the tail: fades the longer ago the ball was there
      const k = Math.max(0, 1 - (now - tr[i].n) / TAIL), a = tr[i - 1], b = tr[i];
      [[11, .10], [5, .30], [2, 1]].forEach(([lw, al]) => {
        lcx.strokeStyle = `rgba(255,255,255,${(al * k * k).toFixed(3)})`; lcx.lineWidth = lw * (0.3 + 0.7 * k);
        lcx.beginPath(); lcx.moveTo(a.x, a.y); lcx.lineTo(b.x, b.y); lcx.stroke();
      });
    }
    const bt = SONG.beat, u = bt ? (((t - bt.t0) / bt.period) % 1 + 1) % 1 : 0;
    const pulse = bt ? Math.exp(-u * 5) + 0.5 * Math.exp(-((u + 0.5) % 1) * 5) : 0, r = 4 + 3 * pulse; // the ball throbs on the beat
    const g = lcx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], r * 5);
    g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(0.3, "rgba(190,205,255,.30)"); g.addColorStop(1, "rgba(190,205,255,0)");
    lcx.fillStyle = g; lcx.beginPath(); lcx.arc(pos[0], pos[1], r * 5, 0, 7); lcx.fill();
    lcx.fillStyle = "#fff"; lcx.beginPath(); lcx.arc(pos[0], pos[1], r, 0, 7); lcx.fill();
    lcx.globalAlpha = 1;
  }
  const last = LY.scenes[LY.scenes.length - 1].words.at(-1).e;
  if (t > last + (LY.mode === "audio" ? 8 : 3)) return endLyrics();
  LY.raf = requestAnimationFrame(lyricFrame);
}

function startLyrics() { // must run straight from her tap so the browser lets the song play
  endLyrics(true); sizeFx();
  const audio = new Audio(SONG.src); audio.volume = SONG.volume; audio.preload = "auto";
  LY = { audio, scenes: lyricScenes(), cur: -2, live: null, trail: [], mode: "wait", t0: 0, raf: 0 };
  LY.time = () => LY.mode === "audio" ? audio.currentTime : LY.mode === "timer" ? (performance.now() - LY.t0) / 1000 : 0;
  const toTimer = () => { if (LY && LY.mode === "wait") { LY.mode = "timer"; LY.t0 = performance.now(); } }; // no song file? run silently
  audio.addEventListener("playing", () => { if (LY) LY.mode = "audio"; });
  audio.addEventListener("error", toTimer);
  audio.addEventListener("ended", () => endLyrics());
  const pr = audio.play(); if (pr && pr.catch) pr.catch(toTimer);
  setTimeout(toTimer, 3000);
  lyr.classList.add("open");
  $("#lyrSkip").classList.remove("show"); setTimeout(() => $("#lyrSkip").classList.add("show"), 4000);
  LY.raf = requestAnimationFrame(lyricFrame);
}

function endLyrics(quiet) {
  if (!LY) return;
  const L = LY; LY = null; cancelAnimationFrame(L.raf);
  const a = L.audio; let v = a.volume;
  const fade = setInterval(() => { v = Math.max(0, v - 0.1); a.volume = v; if (v <= 0) { clearInterval(fade); a.pause(); } }, 80);
  setTimeout(() => { clearInterval(fade); a.pause(); }, 1000);
  lyr.classList.remove("open");
  setTimeout(() => { lyr.querySelectorAll(".scene").forEach(x => x.remove()); lcx.clearRect(0, 0, innerWidth, innerHeight); }, 1000);
  if (!quiet) setTimeout(splash, 700);
}
$("#lyrSkip").onclick = () => endLyrics();
addEventListener("keydown", e => { if (e.key === "Escape") endLyrics(); });

/* ---------- Sync helper: open index.html?sync, press Start, tap the pad as each highlighted word is sung ---------- */
function openSync() {
  const words = [], lineOf = [];
  LYRICS.forEach((l, i) => l.text.split(/\s+/).filter(Boolean).forEach(w => { words.push(w); lineOf.push(i); }));
  const info = $("#syInfo"), line = $("#syLine"), out = $("#syOut"), copy = $("#syCopy");
  let k = 0, times = [], audio = null;
  const draw = () => {
    const done = k >= words.length;
    out.classList.toggle("hidden", !done); copy.classList.toggle("hidden", !done);
    if (done) { info.textContent = "Done! Copy this into SONG in index.html"; line.textContent = "✓"; out.value = "times: [" + times.map(x => x.toFixed(2)).join(", ") + "]"; return; }
    info.textContent = `Word ${k + 1} of ${words.length}`;
    line.innerHTML = words.map((w, i) => lineOf[i] !== lineOf[k] ? "" : `<span style="${i === k ? "color:#fff;font-size:1.8em;text-shadow:0 0 14px #fff" : i < k ? "opacity:.3" : "opacity:.65"}">${esc(w)}</span>`).join(" ");
  };
  $("#sync").classList.add("open");
  $("#syGo").onclick = () => { if (audio) audio.pause(); audio = new Audio(SONG.src); audio.play(); k = 0; times = []; draw(); };
  $("#syPad").addEventListener("pointerdown", () => { if (!audio || audio.paused || k >= words.length) return; times.push(Math.max(0, audio.currentTime - 0.09)); k++; draw(); }); // 0.09s = typical tap delay
  $("#syUndo").onclick = () => { if (k) { k--; times.pop(); draw(); } };
  $("#syClose").onclick = () => { if (audio) audio.pause(); $("#sync").classList.remove("open"); };
  copy.onclick = async () => { try { await navigator.clipboard.writeText(out.value); copy.textContent = "Copied ✓"; } catch { out.select(); } };
}
if (/[?&]sync\b/.test(location.search)) openSync();
