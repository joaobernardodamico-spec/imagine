// Elementarios Arena — sons sintetizados na hora (Web Audio). Zero arquivos, zero licença.
// Para trocar por sons gravados no futuro, basta substituir cada função por um <audio>.

const SFX = (() => {
  let ctx = null, master = null, ambGain = null, ambOn = false;
  let muted = false;
  try { muted = localStorage.getItem('arena-mute') === '1'; } catch (e) {}

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ f = 440, f2 = null, type = 'sine', dur = 0.2, vol = 0.25, attack = 0.005, delay = 0, q = null, cutoff = null }) {
    if (muted) return;
    const c = ac(), t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (cutoff) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; if (q) fl.Q.value = q; o.connect(fl); node = fl; }
    node.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise({ dur = 0.3, vol = 0.2, type = 'bandpass', freq = 1200, freq2 = null, q = 1, delay = 0, attack = 0.005 }) {
    if (muted) return;
    const c = ac(), t = c.currentTime + delay;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
    if (freq2) fl.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  const chime = (notes, step = 0.07, vol = 0.12, dur = 0.9) =>
    notes.forEach((f, i) => { tone({ f, type: 'sine', dur, vol, delay: i * step }); tone({ f: f * 2.01, type: 'sine', dur: dur * 0.6, vol: vol * 0.35, delay: i * step }); });

  const S = {
    click()   { tone({ f: 900, f2: 600, type: 'triangle', dur: 0.06, vol: 0.08 }); },
    error()   { tone({ f: 220, f2: 160, type: 'square', dur: 0.14, vol: 0.06, cutoff: 900 }); },
    coin()    { tone({ f: 1760, type: 'square', dur: 0.08, vol: 0.05, cutoff: 5000 }); tone({ f: 2637, type: 'square', dur: 0.22, vol: 0.05, delay: 0.06, cutoff: 6000 }); },
    buy()     { noise({ dur: 0.22, vol: 0.18, freq: 800, freq2: 3000, q: 0.8 }); tone({ f: 520, f2: 780, type: 'triangle', dur: 0.18, vol: 0.12, delay: 0.05 }); },
    play()    { tone({ f: 140, f2: 60, type: 'sine', dur: 0.25, vol: 0.35 }); tone({ f: 1200, f2: 420, type: 'sine', dur: 0.18, vol: 0.12, delay: 0.04 }); noise({ dur: 0.35, vol: 0.06, type: 'lowpass', freq: 900, delay: 0.05 }); },
    sell()    { [0, 0.07, 0.14].forEach(d => { tone({ f: 1975 + Math.random() * 300, type: 'square', dur: 0.12, vol: 0.04, delay: d, cutoff: 6000 }); }); },
    burn()    { noise({ dur: 0.7, vol: 0.22, type: 'lowpass', freq: 600, freq2: 3500, attack: 0.08 }); for (let i = 0; i < 8; i++) noise({ dur: 0.03, vol: 0.12, freq: 2500 + Math.random() * 3000, q: 4, delay: 0.1 + Math.random() * 0.5 }); },
    ether()   { chime([1318.5, 1975.5], 0.05, 0.08, 1.1); },
    reroll()  { for (let i = 0; i < 6; i++) noise({ dur: 0.05, vol: 0.12, freq: 1800 + i * 200, q: 2, delay: i * 0.045 }); },
    upgrade() { chime([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.09, 0.13, 1.4); noise({ dur: 1, vol: 0.05, type: 'highpass', freq: 5000, attack: 0.3 }); },
    triple()  { chime([783.99, 987.77, 1174.66, 1567.98, 1975.53, 2349.32], 0.06, 0.12, 1.6); noise({ dur: 1.4, vol: 0.06, type: 'highpass', freq: 6000, attack: 0.2 }); },
    pin()     { tone({ f: 2400, type: 'triangle', dur: 0.05, vol: 0.08 }); tone({ f: 3200, type: 'triangle', dur: 0.08, vol: 0.06, delay: 0.04 }); },
    spell()   { chime([660, 880, 1320], 0.05, 0.1, 1); noise({ dur: 0.6, vol: 0.08, freq: 3000, freq2: 800, q: 3 }); },
    hit()     { noise({ dur: 0.18, vol: 0.32, type: 'lowpass', freq: 1400, freq2: 300 }); tone({ f: 110, f2: 55, type: 'sine', dur: 0.2, vol: 0.4 }); },
    swing()   { noise({ dur: 0.18, vol: 0.12, freq: 600, freq2: 2400, q: 1.5 }); },
    death()   { noise({ dur: 0.5, vol: 0.18, type: 'highpass', freq: 3000 }); for (let i = 0; i < 6; i++) tone({ f: 2000 + Math.random() * 3000, type: 'sine', dur: 0.25, vol: 0.05, delay: Math.random() * 0.2 }); },
    shield()  { tone({ f: 1567, f2: 3135, type: 'sine', dur: 0.3, vol: 0.12 }); noise({ dur: 0.3, vol: 0.1, type: 'highpass', freq: 4000 }); },
    summon()  { tone({ f: 300, f2: 900, type: 'triangle', dur: 0.3, vol: 0.1 }); },
    reaction(){ chime([440, 660, 990], 0.04, 0.1, 0.8); noise({ dur: 0.5, vol: 0.1, freq: 900, freq2: 4000, q: 1 }); },
    win()     { chime([523.25, 659.25, 783.99, 1046.5], 0.12, 0.14, 1.8); },
    lose()    { chime([392, 349.23, 311.13, 261.63], 0.16, 0.12, 1.6); },
    tick()    { tone({ f: 1200, type: 'square', dur: 0.03, vol: 0.03, cutoff: 3000 }); },
    round()   { tone({ f: 196, type: 'sine', dur: 1.6, vol: 0.18 }); tone({ f: 293.66, type: 'sine', dur: 1.6, vol: 0.1, delay: 0.05 }); chime([1174.66, 1567.98], 0.12, 0.06, 1.5); },
  };

  // ambiente: água correndo numa caverna de cristal (ruído marrom filtrado + gotas)
  let ambNodes = null, dropTimer = null;
  function ambient(on) {
    ambOn = on;
    if (muted && on) return;
    const c = ac();
    if (on && !ambNodes) {
      const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500;
      ambGain = c.createGain(); ambGain.gain.value = 0.0001; ambGain.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 2);
      src.connect(fl); fl.connect(ambGain); ambGain.connect(master); src.start();
      ambNodes = { src };
      dropTimer = setInterval(() => { if (!muted && Math.random() < 0.5) tone({ f: 1400 + Math.random() * 1400, f2: 500, type: 'sine', dur: 0.12, vol: 0.025 }); }, 900);
    } else if (!on && ambNodes) {
      ambGain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      const n = ambNodes; ambNodes = null; clearInterval(dropTimer);
      setTimeout(() => { try { n.src.stop(); } catch (e) {} }, 600);
    }
  }

  return Object.assign(S, {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('arena-mute', muted ? '1' : '0'); } catch (e) {}
      if (muted) { const was = ambOn; ambient(false); ambOn = was; } else if (ambOn) ambient(true);
      return muted;
    },
    ambient,
    unlock() { ac(); },
  });
})();
