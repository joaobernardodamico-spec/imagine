// Elementarios Arena — efeitos visuais: transições FLIP, partículas, voos de moeda/Éter, combate.

const FX = (() => {
  let layer = null;
  const REALM_HEX = { fogo: '#ff6a3d', agua: '#4aa8ff', ar: '#ffd257', terra: '#56e07a', eter: '#b69cff', gold: '#f1c35a', teal: '#43f0d0' };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function L() {
    if (!layer) { layer = document.createElement('div'); layer.id = 'fx-layer'; document.body.appendChild(layer); }
    return layer;
  }
  const center = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const rectOf = t => (typeof t === 'string' ? (document.querySelector(t) || {}).getBoundingClientRect?.call(document.querySelector(t)) : t.getBoundingClientRect ? t.getBoundingClientRect() : t);

  // ── estado antes de uma ação (para animar o depois)
  function snapshot() {
    const m = new Map();
    document.querySelectorAll('[data-key]').forEach(el => {
      m.set(el.dataset.key, { rect: el.getBoundingClientRect(), html: el.outerHTML, realm: el.dataset.realm, zone: el.dataset.zone });
    });
    return m;
  }

  function ghost(b) {
    const g = document.createElement('div');
    g.className = 'fx-ghost';
    g.style.cssText = `left:${b.rect.left}px;top:${b.rect.top}px;width:${b.rect.width}px;height:${b.rect.height}px`;
    g.innerHTML = b.html;
    const card = g.firstElementChild;
    if (card) { card.removeAttribute('data-key'); card.style.transform = 'none'; card.style.width = '100%'; card.style.height = '100%'; }
    L().appendChild(g);
    return g;
  }

  // ── partículas
  function particles(x, y, { color = REALM_HEX.teal, count = 14, spread = 70, size = 6, dur = 700, rise = 0, shape = 'dot', gravity = 0 } = {}) {
    if (reduce) count = Math.min(count, 4);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'fx-p ' + shape;
      const s = size * (0.5 + Math.random());
      p.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;--c:${color}`;
      L().appendChild(p);
      const a = Math.random() * Math.PI * 2, d = spread * (0.4 + Math.random() * 0.8);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - rise;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + gravity}px)) scale(.2)`, opacity: 0 },
      ], { duration: dur * (0.7 + Math.random() * 0.6), easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }

  // ── voo de moedas/gemas até um contador do HUD
  function flyTo(from, targetSel, { color = REALM_HEX.gold, count = 5, kind = 'coin', onArrive } = {}) {
    const target = document.querySelector(targetSel);
    if (!target) return;
    const a = center(from), tr = target.getBoundingClientRect(), b = center(tr);
    let arrived = 0;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'fx-fly ' + kind;
      p.style.cssText = `left:${a.x}px;top:${a.y}px;--c:${color}`;
      L().appendChild(p);
      const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 160, my = Math.min(a.y, b.y) - 60 - Math.random() * 80;
      const delay = i * 55;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 40}px), calc(-50% - 20px)) scale(1.1)`, opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${mx - a.x}px), calc(-50% + ${my - a.y}px)) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.6)`, opacity: 0.9 },
      ], { duration: 720, delay, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'backwards' }).onfinish = () => {
        p.remove();
        if (++arrived === 1) { pulse(target); onArrive && onArrive(); }
      };
    }
  }

  function pulse(el) {
    el.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.18)', filter: 'brightness(1.8)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 380, easing: 'ease-out' });
  }

  // ── ondulação na água do tabuleiro
  function ripple(el, color = REALM_HEX.teal) {
    const r = el.getBoundingClientRect(), c = center(r);
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('i');
      ring.className = 'fx-ring';
      ring.style.cssText = `left:${c.x}px;top:${r.bottom - 6}px;--c:${color}`;
      L().appendChild(ring);
      ring.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }],
        { duration: 900, delay: i * 140, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }).onfinish = () => ring.remove();
    }
    particles(c.x, r.bottom - 8, { color, count: 10, spread: 50, size: 4, rise: 30, dur: 600 });
  }

  function burst(el, color = REALM_HEX.teal, big = false) {
    const r = el.getBoundingClientRect(), c = center(r);
    const flash = document.createElement('i');
    flash.className = 'fx-flash';
    flash.style.cssText = `left:${c.x}px;top:${c.y}px;--c:${color}`;
    L().appendChild(flash);
    flash.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${big ? 4 : 2.4})`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => flash.remove();
    particles(c.x, c.y, { color, count: big ? 34 : 18, spread: big ? 150 : 80, size: big ? 7 : 5, shape: 'shard' });
  }

  function shatter(rect, color) {
    const c = center(rect);
    particles(c.x, c.y, { color, count: 22, spread: 110, size: 9, shape: 'shard', dur: 900, gravity: 40 });
    particles(c.x, c.y, { color: '#d9fff7', count: 10, spread: 60, size: 3, dur: 600 });
  }

  function floatText(x, y, text, cls = '') {
    const t = document.createElement('div');
    t.className = 'fx-text ' + cls;
    t.textContent = text;
    t.style.cssText = `left:${x}px;top:${y}px`;
    L().appendChild(t);
    t.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-70%) scale(1.2)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }],
      { duration: 1000, easing: 'ease-out' }).onfinish = () => t.remove();
  }

  function shake(el, amt = 6) {
    el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(-${amt}px) rotate(-1deg)` }, { transform: `translateX(${amt}px) rotate(1deg)` }, { transform: `translateX(-${amt / 2}px)` }, { transform: 'translateX(0)' }], { duration: 320 });
  }

  // ── ataque: o atacante avança até o alvo e volta
  function lunge(att, def, speed = 1, onImpact) {
    const a = att.getBoundingClientRect(), d = def.getBoundingClientRect();
    const dx = (d.left - a.left) * 0.78, dy = (d.top - a.top) * 0.72;
    const dur = 560 / speed;
    att.style.zIndex = 20;
    const anim = att.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: `translate(${-dx * 0.08}px, ${-dy * 0.08}px) scale(1.08)`, offset: 0.25 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.1)`, offset: 0.5 },
      { transform: 'translate(0,0) scale(1)' },
    ], { duration: dur, easing: 'cubic-bezier(.5,0,.3,1)' });
    setTimeout(() => { onImpact && onImpact(); shake(def, 8); const c = center(d); particles(c.x, c.y, { color: '#ffe3a1', count: 14, spread: 70, size: 5, shape: 'shard' }); }, dur * 0.5);
    anim.onfinish = () => { att.style.zIndex = ''; };
  }

  // ── ataques com assinatura por tribo (cada carta ataca do seu jeito)
  const ATTACK_STYLE = {
    bobo: 'confete', goblin: 'moeda', ladino: 'adaga', golem: 'esmagar', guerreira: 'corte',
    bruxa: 'orbe', necromante: 'caveira', orc: 'esmagar', druida: 'espinhos', dragao: 'sopro',
    paladino: 'corte', rainha: 'raio', rei: 'raio',
  };

  function projectile(a, b, { cls = 'orb', color, dur = 420, trail = true, spin = false }, onHit) {
    const p = document.createElement('i');
    p.className = 'fx-proj ' + cls;
    p.style.cssText = `left:${a.x}px;top:${a.y}px;--c:${color}`;
    L().appendChild(p);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const arc = (b.x - a.x) * 0.1;
    p.animate([
      { transform: `translate(-50%,-50%) rotate(${ang}deg) scale(.4)` },
      { transform: `translate(calc(-50% + ${(b.x - a.x) / 2 + arc}px), calc(-50% + ${(b.y - a.y) / 2 - 40}px)) rotate(${spin ? ang + 360 : ang}deg) scale(1.15)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) rotate(${spin ? ang + 720 : ang}deg) scale(1)` },
    ], { duration: dur, easing: 'cubic-bezier(.5,0,.6,1)' }).onfinish = () => { p.remove(); onHit(); };
    if (trail) {
      let n = 0;
      const iv = setInterval(() => {
        const r = p.getBoundingClientRect();
        if (!r.width || n++ > 20) return clearInterval(iv);
        particles(r.left + r.width / 2, r.top + r.height / 2, { color, count: 2, spread: 10, size: 5, dur: 380 });
      }, 30);
    }
  }

  function slash(rect, color) {
    const s = document.createElement('i');
    s.className = 'fx-slash';
    s.style.cssText = `left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;--c:${color}`;
    L().appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%) rotate(-50deg) scaleX(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-30deg) scaleX(1.2)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%) rotate(-20deg) scaleX(1.4)', opacity: 0 }],
      { duration: 360, easing: 'ease-out' }).onfinish = () => s.remove();
  }

  function shockwave(rect, color) {
    const c = center(rect);
    const ring = document.createElement('i');
    ring.className = 'fx-ring';
    ring.style.cssText = `left:${c.x}px;top:${rect.bottom - 10}px;--c:${color};width:140px;height:40px`;
    L().appendChild(ring);
    ring.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => ring.remove();
    particles(c.x, rect.bottom - 10, { color: '#c9b49a', count: 16, spread: 90, size: 7, shape: 'shard', rise: 30, gravity: 30 });
  }

  function breath(a, b, color, dur) {
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        const t = document.createElement('i');
        t.className = 'fx-p ember';
        const s = 10 + Math.random() * 12;
        t.style.cssText = `left:${a.x}px;top:${a.y}px;width:${s}px;height:${s}px;--c:${color}`;
        L().appendChild(t);
        const jx = (Math.random() - 0.5) * 50, jy = (Math.random() - 0.5) * 50;
        t.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 }, { transform: `translate(calc(-50% + ${b.x - a.x + jx}px), calc(-50% + ${b.y - a.y + jy}px)) scale(1.6)`, opacity: 0 }],
          { duration: dur, easing: 'ease-in' }).onfinish = () => t.remove();
      }, i * (dur / steps / 1.5));
    }
  }

  // ── cinemática em vídeo do personagem (antes do golpe)
  const seenVideo = new Set();
  let pendingMs = 0;
  function cinematic(card, realm, onDone) {
    const vid = card.video;
    const first = !seenVideo.has(card.id);
    seenVideo.add(card.id);
    const [a, b] = first ? vid.first : vid.attack;
    const wrap = document.createElement('div');
    wrap.className = 'fx-cine';
    wrap.style.setProperty('--c', REALM_HEX[realm] || REALM_HEX.teal);
    wrap.innerHTML = `<div class="frame"><video playsinline preload="auto" src="${vid.src}#t=${a},${b}"></video>
      <div class="cap"><b>${card.name}</b><span>${TRIBES[card.tribe].name} de ${REALMS[card.realm].name}</span></div><div class="skip">clique para pular</div></div>`;
    document.body.appendChild(wrap);
    const v = wrap.querySelector('video');
    v.muted = typeof SFX !== 'undefined' && SFX.muted;
    v.volume = 0.8;
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      clearInterval(iv);
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 320);
      onDone();
    };
    v.currentTime = a;
    v.play().catch(() => { v.muted = true; v.play().catch(end); });
    const iv = setInterval(() => { if (v.currentTime >= b - 0.05) end(); }, 50);
    setTimeout(end, (b - a) * 1000 + 1500); // segurança se o vídeo travar
    wrap.addEventListener('click', end);
    return (b - a) * 1000 + 350;
  }

  function attack(att, def, speed = 1, onImpact) {
    const cardData = typeof CARD_BY_ID !== 'undefined' && CARD_BY_ID[att.dataset.card];
    if (cardData && cardData.video) {
      pendingMs = cinematic(cardData, att.dataset.realm, () => attackNow(att, def, speed, onImpact));
      return;
    }
    attackNow(att, def, speed, onImpact);
  }

  function attackNow(att, def, speed = 1, onImpact) {
    if (!document.body.contains(att) || !document.body.contains(def)) return;
    const tribe = att.dataset.tribe, realm = att.dataset.realm;
    const style = ATTACK_STYLE[tribe] || 'corte';
    const color = REALM_HEX[realm] || REALM_HEX.teal;
    const ar = att.getBoundingClientRect(), dr = def.getBoundingClientRect();
    const a = center(ar), b = center(dr);
    const ranged = ['adaga', 'orbe', 'caveira', 'espinhos', 'sopro', 'raio', 'moeda', 'confete'].includes(style);
    const hit = () => { onImpact && onImpact(); shake(def, 8); impact(style, dr, color); };
    if (!ranged) {
      lunge(att, def, speed, () => { hit(); });
      return;
    }
    // ataque à distância: a carta se ergue, conjura e dispara
    att.animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.08)', filter: 'brightness(1.5)', offset: 0.4 }, { transform: 'none' }], { duration: 700 / speed, easing: 'ease-out' });
    const fire = () => {
      if (style === 'sopro') { breath(a, b, color, 420 / speed); setTimeout(hit, 380 / speed); }
      else if (style === 'raio') { beam(a, b, tribe === 'rei' ? REALM_HEX.gold : color); setTimeout(hit, 160 / speed); }
      else {
        const cfg = {
          adaga: { cls: 'dagger', spin: true, trail: false },
          orbe: { cls: 'orb' }, caveira: { cls: 'skull' }, espinhos: { cls: 'thorn' },
          moeda: { cls: 'coinp', spin: true, trail: false }, confete: { cls: 'orb' },
        }[style];
        projectile(a, b, { ...cfg, color, dur: 420 / speed }, hit);
      }
    };
    setTimeout(fire, 220 / speed);
  }

  function beam(a, b, color) {
    const len = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const r = document.createElement('i');
    r.className = 'fx-beam';
    r.style.cssText = `left:${a.x}px;top:${a.y}px;width:${len}px;--c:${color};transform:rotate(${ang}deg)`;
    L().appendChild(r);
    r.animate([{ opacity: 0, filter: 'brightness(3)' }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 520 }).onfinish = () => r.remove();
  }

  function impact(style, rect, color) {
    const c = center(rect);
    if (style === 'corte' || style === 'adaga') slash(rect, style === 'adaga' ? '#e8f6ff' : color);
    else if (style === 'esmagar') shockwave(rect, color);
    else if (style === 'caveira') particles(c.x, c.y, { color: '#9dffb0', count: 22, spread: 90, size: 6, rise: 50 });
    else if (style === 'espinhos') particles(c.x, c.y, { color: '#56e07a', count: 18, spread: 80, size: 8, shape: 'shard' });
    else if (style === 'moeda') particles(c.x, c.y, { color: REALM_HEX.gold, count: 14, spread: 70, size: 6 });
    else if (style === 'confete') ['#ff6a3d', '#4aa8ff', '#ffd257', '#56e07a', '#b69cff'].forEach(col => particles(c.x, c.y, { color: col, count: 6, spread: 100, size: 6, shape: 'shard', gravity: 40 }));
    else burst({ getBoundingClientRect: () => rect }, color);
  }

  // ── relíquias dos Feiticeiros
  function relicFx(relic, relicEl, target) {
    if (!relicEl) return;
    relicEl.classList.remove('use'); void relicEl.offsetWidth; relicEl.classList.add('use');
    const r = relicEl.getBoundingClientRect(), a = center(r);
    if (relic === 'adaga' && target) {
      const b = center(target);
      projectile(a, b, { cls: 'dagger', spin: true, trail: false, color: '#ff6a3d', dur: 380 }, () => slash(target, '#ffb35a'));
    } else if (relic === 'relogio') {
      particles(a.x, a.y, { color: '#ffd257', count: 24, spread: 120, size: 5 });
      const ring = document.createElement('i');
      ring.className = 'fx-ring'; ring.style.cssText = `left:${a.x}px;top:${a.y}px;--c:#ffd257;width:80px;height:80px`;
      L().appendChild(ring);
      ring.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(4) rotate(-360deg)', opacity: 0 }], { duration: 800 }).onfinish = () => ring.remove();
    } else if (relic === 'anel') {
      particles(a.x, a.y, { color: '#4aa8ff', count: 18, spread: 70, size: 5 });
    } else if (relic === 'amuleto') {
      burst(relicEl, '#56e07a', true);
    }
  }

  // ── transição genérica entre dois renders
  function transition(before, fx = {}) {
    if (reduce) return;
    const after = new Map();
    document.querySelectorAll('[data-key]').forEach(el => after.set(el.dataset.key, el));
    let newIdx = 0;
    const golden = fx.kind === 'fuse' ? [...after.values()].find(el => el.dataset.golden === '1' && !before.has(el.dataset.key)) : null;

    after.forEach((el, key) => {
      const b = before.get(key);
      const r = el.getBoundingClientRect();
      if (b) {
        const dx = b.rect.left - r.left, dy = b.rect.top - r.top;
        if (Math.abs(dx) + Math.abs(dy) > 2) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
        if (fx.kind === 'play' && key === fx.key) setTimeout(() => ripple(el, REALM_HEX[el.dataset.realm] || REALM_HEX.teal), 380);
        return;
      }
      // elemento novo
      if (fx.kind === 'buy' && fx.fromRect && el.dataset.zone === 'hand') {
        const dx = fx.fromRect.left - r.left, dy = fx.fromRect.top - r.top;
        el.animate([
          { transform: `translate(${dx}px,${dy}px) scale(1)`, filter: 'brightness(1.6)' },
          { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 50}px) scale(1.12) rotate(-4deg)`, offset: 0.45 },
          { transform: 'none', filter: 'brightness(1)' },
        ], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
        setTimeout(() => particles(r.left + r.width / 2, r.top + r.height / 2, { color: REALM_HEX.teal, count: 10, spread: 50, size: 4 }), 500);
      } else if (fx.kind === 'reroll' && el.dataset.zone === 'shop') {
        el.animate([{ transform: 'rotateY(90deg) translateY(-10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 120 + newIdx++ * 70, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      } else if (el === golden) {
        el.animate([{ transform: 'scale(.3)', opacity: 0, filter: 'brightness(4)' }, { transform: 'scale(1.25)', opacity: 1, filter: 'brightness(2)', offset: 0.6 }, { transform: 'none', filter: 'brightness(1)' }], { duration: 900, delay: 450, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
        setTimeout(() => burst(el, REALM_HEX.gold, true), 750);
      } else {
        el.animate([{ transform: 'scale(.7) translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, delay: newIdx++ * 40, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      }
    });

    before.forEach((b, key) => {
      if (after.has(key)) return;
      if (fx.kind === 'buy' && key === fx.fromKey) return; // virou carta na mão
      const g = ghost(b);
      const c = center(b.rect);
      const color = REALM_HEX[b.realm] || REALM_HEX.teal;
      if (fx.kind === 'sell') {
        g.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px) scale(.92)', opacity: 1, offset: 0.3 }, { transform: 'translateY(10px) scale(.4) rotate(8deg)', opacity: 0 }], { duration: 520, easing: 'ease-in' }).onfinish = () => g.remove();
        flyTo(b.rect, '#hud-gold', { count: 5, kind: 'coin', color: REALM_HEX.gold });
      } else if (fx.kind === 'burn') {
        g.classList.add('burning');
        g.animate([
          { filter: 'brightness(1)', transform: 'none', opacity: 1 },
          { filter: 'brightness(1.8) saturate(1.6) sepia(.4)', transform: 'translateY(-4px)', opacity: 1, offset: 0.3 },
          { filter: 'brightness(3) blur(3px)', transform: 'translateY(-26px) scale(.86)', opacity: 0 },
        ], { duration: 820, easing: 'ease-in' }).onfinish = () => g.remove();
        particles(c.x, c.y + b.rect.height * 0.3, { color: '#ffb35a', count: 26, spread: 60, size: 6, rise: 90, dur: 900, shape: 'ember' });
        particles(c.x, c.y, { color, count: 12, spread: 70, size: 5, rise: 40 });
        setTimeout(() => flyTo(b.rect, `#hud-ether-${b.realm}`, { count: 3, kind: 'gem', color, onArrive: () => SFX.ether() }), 300);
      } else if (fx.kind === 'reroll') {
        g.animate([{ transform: 'none', opacity: 1 }, { transform: 'rotateY(90deg) translateY(-10px)', opacity: 0 }], { duration: 260, easing: 'ease-in' }).onfinish = () => g.remove();
      } else if (fx.kind === 'fuse' && golden) {
        const gr = golden.getBoundingClientRect();
        g.animate([{ transform: 'none', filter: 'brightness(1)' }, { transform: `translate(${gr.left - b.rect.left}px, ${gr.top - b.rect.top}px) scale(.8)`, filter: 'brightness(3)', opacity: 0.2 }],
          { duration: 600, easing: 'cubic-bezier(.6,0,.4,1)' }).onfinish = () => g.remove();
      } else {
        g.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.9)' }], { duration: 250 }).onfinish = () => g.remove();
      }
    });
  }

  return { snapshot, transition, particles, flyTo, pulse, ripple, burst, shatter, floatText, shake, lunge, attack, relicFx, REALM_HEX, rectOf, center,
    resetVideos() { seenVideo.clear(); },
    takePending() { const ms = pendingMs; pendingMs = 0; return ms; } };
})();

// ── cenário: partículas de Éter subindo, sobre a arte da caixa
const Scene = (() => {
  let cv, ctx, parts = [], w = 0, h = 0, raf = 0, last = 0;
  function resize() { w = cv.width = innerWidth * devicePixelRatio; h = cv.height = innerHeight * devicePixelRatio; }
  function spawn(init) {
    return { x: Math.random() * w, y: init ? Math.random() * h : h + 20, r: (0.6 + Math.random() * 2.2) * devicePixelRatio,
      vy: (0.15 + Math.random() * 0.5) * devicePixelRatio, sway: Math.random() * Math.PI * 2, sp: 0.004 + Math.random() * 0.01,
      a: 0.25 + Math.random() * 0.6, hue: Math.random() < 0.85 ? 168 : 255 };
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return; // ~30fps basta
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y -= p.vy; p.sway += p.sp; p.x += Math.sin(p.sway) * 0.4 * devicePixelRatio;
      if (p.y < -20) Object.assign(p, spawn(false));
      const tw = 0.6 + 0.4 * Math.sin(p.sway * 3);
      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.hue},90%,75%,${p.a * tw})`);
      g.addColorStop(1, `hsla(${p.hue},90%,60%,0)`);
      ctx.fillStyle = g;
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function init() {
    // a mesa da taverna: uma camada por reino, troca com o Vira (crossfade)
    const mesa = document.createElement('div'); mesa.id = 'mesa';
    mesa.innerHTML = ['neutra', 'fogo', 'agua', 'ar', 'terra'].map(r => `<div class="m-${r}" style="background-image:url('assets/ui/mesa-${r}.webp')"></div>`).join('');
    document.body.prepend(mesa);
    cv = document.createElement('canvas'); cv.id = 'motes';
    document.body.prepend(cv);
    ctx = cv.getContext('2d');
    resize(); addEventListener('resize', resize);
    const n = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 15 : 70;
    parts = Array.from({ length: n }, () => spawn(true));
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame); });
  }
  return { init };
})();
