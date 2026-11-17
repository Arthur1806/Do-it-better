// =============================================================
// ui.js — componentes de interface reutilizáveis:
// folhas inferiores (sheets), alertas, toasts, "+XP" flutuante,
// confete, celebração, vibração, seletor de dias e arrastar para ordenar.
// =============================================================

import { esc, ORDEM_SEMANA, DIAS_CURTOS } from './utils.js';

// ---------- Última posição tocada (para o "+XP" sair do dedo) ----------
const ultimoToque = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
document.addEventListener(
  'pointerdown',
  (e) => {
    ultimoToque.x = e.clientX;
    ultimoToque.y = e.clientY;
  },
  { capture: true, passive: true }
);

// ---------- Vibração ----------
// O Safari do iPhone não tem navigator.vibrate. A partir do iOS 18, alternar um
// <input type="checkbox" switch> dispara a vibração leve do sistema — usamos isso
// como alternativa. Se nada for suportado, simplesmente não vibra.
let chaveHaptica = null;
export function vibrar(padrao = 12) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(padrao);
      return;
    }
    if (!chaveHaptica) {
      const label = document.createElement('label');
      label.className = 'haptico';
      label.setAttribute('aria-hidden', 'true');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.body.appendChild(label);
      chaveHaptica = label;
    }
    chaveHaptica.click();
  } catch (_) {
    /* sem vibração */
  }
}

// ---------- Bipe curto (fim do descanso) ----------
let audioCtx = null;
/** Precisa ser chamado uma vez a partir de um toque para o iOS liberar o áudio. */
export function prepararAudio() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) {}
}
export function bipe(vezes = 2) {
  try {
    if (!audioCtx) return;
    for (let i = 0; i < vezes; i++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      const t = audioCtx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.2);
    }
  } catch (_) {}
}

// ---------- Teclado do iPhone ----------
// Mantém as folhas inferiores acima do teclado virtual.
if (window.visualViewport) {
  const ajustar = () => {
    const vv = window.visualViewport;
    const teclado = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--teclado', `${teclado}px`);
  };
  window.visualViewport.addEventListener('resize', ajustar);
  window.visualViewport.addEventListener('scroll', ajustar);
}

// ---------- Folha inferior (bottom sheet) ----------
/**
 * Abre uma folha inferior estilo iOS.
 * @param {object} o
 * @param {string} o.titulo
 * @param {string} o.html        conteúdo (HTML)
 * @param {(corpo:HTMLElement, fechar:Function, raiz:HTMLElement)=>void} [o.aoMontar]
 * @param {Function} [o.aoFechar]
 * @param {string} [o.classe]
 */
export function abrirSheet({ titulo, html, aoMontar, aoFechar, classe = '' }) {
  const raiz = document.createElement('div');
  raiz.className = 'sheet-raiz';
  raiz.innerHTML = `
    <div class="sheet-fundo"></div>
    <div class="sheet ${classe}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="sheet-pegador" aria-hidden="true"></div>
      <header class="sheet-topo">
        <h2>${esc(titulo)}</h2>
        <button class="btn-icone" data-fechar aria-label="Fechar">${ICONE_FECHAR}</button>
      </header>
      <div class="sheet-corpo">${html}</div>
    </div>`;
  document.body.appendChild(raiz);
  document.body.classList.add('com-sheet');
  requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('aberta')));

  let fechada = false;
  const fechar = () => {
    if (fechada) return;
    fechada = true;
    if (document.activeElement && raiz.contains(document.activeElement)) document.activeElement.blur();
    raiz.classList.remove('aberta');
    setTimeout(() => {
      raiz.remove();
      if (!document.querySelector('.sheet-raiz')) document.body.classList.remove('com-sheet');
    }, 280);
    aoFechar && aoFechar();
  };
  raiz.querySelector('.sheet-fundo').addEventListener('click', fechar);
  raiz.querySelector('[data-fechar]').addEventListener('click', fechar);

  // Arrastar para baixo (pelo pegador/título) fecha a folha
  const sheet = raiz.querySelector('.sheet');
  const topo = raiz.querySelector('.sheet-topo');
  let inicioY = null;
  const alvoArraste = [raiz.querySelector('.sheet-pegador'), topo];
  alvoArraste.forEach((alvo) => {
    alvo.addEventListener('touchstart', (e) => (inicioY = e.touches[0].clientY), { passive: true });
    alvo.addEventListener(
      'touchmove',
      (e) => {
        if (inicioY === null) return;
        const dy = Math.max(0, e.touches[0].clientY - inicioY);
        sheet.style.transform = `translateY(${dy}px)`;
      },
      { passive: true }
    );
    alvo.addEventListener('touchend', (e) => {
      if (inicioY === null) return;
      const dy = e.changedTouches[0].clientY - inicioY;
      inicioY = null;
      sheet.style.transform = '';
      if (dy > 90) fechar();
    });
  });

  const corpo = raiz.querySelector('.sheet-corpo');
  if (aoMontar) aoMontar(corpo, fechar, raiz);
  return { raiz, corpo, fechar };
}

// ---------- Alerta de confirmação ----------
/**
 * Mostra uma caixa de confirmação. Retorna Promise<boolean>.
 */
export function confirmar(texto, { titulo = 'Confirmar', ok = 'Confirmar', cancelar = 'Cancelar', perigo = false } = {}) {
  return new Promise((resolve) => {
    const raiz = document.createElement('div');
    raiz.className = 'alerta-raiz';
    raiz.innerHTML = `
      <div class="alerta" role="alertdialog" aria-modal="true">
        <h3>${esc(titulo)}</h3>
        <p>${esc(texto)}</p>
        <div class="alerta-botoes">
          <button class="btn secundario" data-r="0">${esc(cancelar)}</button>
          <button class="btn ${perigo ? 'perigo' : 'primario'}" data-r="1">${esc(ok)}</button>
        </div>
      </div>`;
    document.body.appendChild(raiz);
    requestAnimationFrame(() => raiz.classList.add('aberta'));
    raiz.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b && e.target !== raiz) return;
      const r = b ? b.dataset.r === '1' : false;
      raiz.classList.remove('aberta');
      setTimeout(() => raiz.remove(), 200);
      resolve(r);
    });
  });
}

/** Pede um texto ao usuário (usado na confirmação dupla). Retorna Promise<string|null>. */
export function pedirTexto({ titulo, texto, placeholder = '', ok = 'OK', perigo = false }) {
  return new Promise((resolve) => {
    const raiz = document.createElement('div');
    raiz.className = 'alerta-raiz';
    raiz.innerHTML = `
      <div class="alerta" role="alertdialog" aria-modal="true">
        <h3>${esc(titulo)}</h3>
        <p>${esc(texto)}</p>
        <input class="entrada" type="text" autocomplete="off" autocapitalize="characters" placeholder="${esc(placeholder)}">
        <div class="alerta-botoes">
          <button class="btn secundario" data-r="0">Cancelar</button>
          <button class="btn ${perigo ? 'perigo' : 'primario'}" data-r="1">${esc(ok)}</button>
        </div>
      </div>`;
    document.body.appendChild(raiz);
    requestAnimationFrame(() => raiz.classList.add('aberta'));
    const input = raiz.querySelector('input');
    setTimeout(() => input.focus(), 250);
    raiz.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      const valor = b.dataset.r === '1' ? input.value : null;
      input.blur();
      raiz.classList.remove('aberta');
      setTimeout(() => raiz.remove(), 200);
      resolve(valor);
    });
  });
}

// ---------- Toast (aviso na parte de baixo) ----------
let toastAtual = null;
/**
 * @param {string} msg
 * @param {{acao?:{rotulo:string, fn:Function}, duracao?:number, tipo?:string}} o duracao 0 = fica até tocar
 */
export function toast(msg, { acao = null, duracao = 3200, tipo = '' } = {}) {
  if (toastAtual) toastAtual.remover();
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${acao ? `<button class="toast-acao">${esc(acao.rotulo)}</button>` : ''}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visivel'));
  let timer = null;
  const remover = () => {
    clearTimeout(timer);
    el.classList.remove('visivel');
    setTimeout(() => el.remove(), 250);
    if (toastAtual && toastAtual.el === el) toastAtual = null;
  };
  if (acao) {
    el.querySelector('.toast-acao').addEventListener('click', () => {
      remover();
      acao.fn();
    });
  }
  if (duracao > 0) timer = setTimeout(remover, duracao);
  toastAtual = { el, remover };
  return remover;
}

// ---------- "+20 XP" flutuante ----------
let ultimoFloat = 0;
let empilhar = 0;
export function flutuarXP(valor, { x, y, negativo = false } = {}) {
  const agora = Date.now();
  // vários XP ao mesmo tempo (ex.: item + bônus) saem um acima do outro
  empilhar = agora - ultimoFloat < 600 ? empilhar + 1 : 0;
  ultimoFloat = agora;
  const el = document.createElement('div');
  el.className = `xp-float ${negativo ? 'negativo' : ''}`;
  el.textContent = `${negativo ? '−' : '+'}${Math.abs(valor)} XP`;
  const px = Math.min(window.innerWidth - 60, Math.max(60, x ?? ultimoToque.x));
  const py = Math.max(80, (y ?? ultimoToque.y) - 20 - empilhar * 34);
  el.style.left = `${px}px`;
  el.style.top = `${py}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ---------- Confete ----------
export function confete({ quantidade = 140, duracao = 2600 } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confete';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cores = ['#7C3AED', '#06B6D4', '#A78BFA', '#22D3EE', '#F0ABFC', '#FDE68A', '#FFFFFF'];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const pecas = Array.from({ length: quantidade }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 80,
    y: H * 0.38,
    vx: (Math.random() - 0.5) * 13,
    vy: -Math.random() * 13 - 5,
    g: 0.28 + Math.random() * 0.12,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.35,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 6,
    cor: cores[Math.floor(Math.random() * cores.length)],
  }));
  const inicio = performance.now();
  function quadro(t) {
    const passado = t - inicio;
    ctx.clearRect(0, 0, W, H);
    const alpha = Math.max(0, 1 - Math.max(0, passado - duracao * 0.6) / (duracao * 0.4));
    for (const p of pecas) {
      p.vy += p.g;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      ctx.restore();
    }
    if (passado < duracao) requestAnimationFrame(quadro);
    else canvas.remove();
  }
  requestAnimationFrame(quadro);
}

// ---------- Celebração (subir de nível / conquista) ----------
const filaCelebracao = [];
let celebrando = false;
/** Enfileira uma celebração; elas aparecem uma de cada vez. */
export function celebrar({ emoji, titulo, subtitulo, rotulo = 'Continuar' }) {
  filaCelebracao.push({ emoji, titulo, subtitulo, rotulo });
  if (!celebrando) {
    celebrando = true; // marca já, para duas celebrações seguidas não abrirem juntas
    setTimeout(proximaCelebracao, 350);
  }
}
function proximaCelebracao() {
  const c = filaCelebracao.shift();
  if (!c) {
    celebrando = false;
    return;
  }
  celebrando = true;
  const raiz = document.createElement('div');
  raiz.className = 'celebracao-raiz';
  raiz.innerHTML = `
    <div class="celebracao" role="alertdialog" aria-modal="true">
      <div class="celebracao-emoji">${c.emoji}</div>
      <h3 class="gradiente-texto">${esc(c.titulo)}</h3>
      <p>${esc(c.subtitulo || '')}</p>
      <button class="btn primario largo">${esc(c.rotulo)}</button>
    </div>`;
  document.body.appendChild(raiz);
  requestAnimationFrame(() => raiz.classList.add('aberta'));
  confete();
  vibrar([30, 40, 30]);
  const fechar = () => {
    raiz.classList.remove('aberta');
    setTimeout(() => {
      raiz.remove();
      proximaCelebracao();
    }, 250);
  };
  raiz.querySelector('button').addEventListener('click', fechar);
  raiz.addEventListener('click', (e) => e.target === raiz && fechar());
}

// ---------- Seletor de dias da semana ----------
/** HTML de chips seg..dom. dias = null significa todos. */
export function seletorDiasHTML(dias, nome = 'dias') {
  return `<div class="dias-semana" data-grupo="${nome}">
    ${ORDEM_SEMANA.map((d) => {
      const on = !dias || dias.length === 0 || dias.includes(d);
      return `<button type="button" class="dia-chip ${on ? 'on' : ''}" data-dia="${d}" aria-pressed="${on}">${DIAS_CURTOS[d]}</button>`;
    }).join('')}
  </div>`;
}
/** Liga os cliques do seletor de dias dentro de um container. */
export function ligarSeletorDias(container) {
  container.querySelectorAll('.dias-semana').forEach((g) => {
    g.addEventListener('click', (e) => {
      const b = e.target.closest('.dia-chip');
      if (!b) return;
      b.classList.toggle('on');
      b.setAttribute('aria-pressed', b.classList.contains('on'));
    });
  });
}
/** Lê os dias marcados. Retorna null se todos estiverem marcados ("todo dia"). */
export function lerDias(container, nome = 'dias') {
  const g = container.querySelector(`.dias-semana[data-grupo="${nome}"]`);
  const dias = [...g.querySelectorAll('.dia-chip.on')].map((b) => Number(b.dataset.dia));
  return dias.length === 7 || dias.length === 0 ? null : dias.sort();
}
/** Texto resumido de dias: "Todo dia", "Seg a sex", "Seg, qua, sex". */
export function textoDias(dias) {
  if (!dias || dias.length === 0 || dias.length === 7) return 'Todo dia';
  const ord = ORDEM_SEMANA.filter((d) => dias.includes(d));
  if (ord.length === 5 && !dias.includes(0) && !dias.includes(6)) return 'Seg a sex';
  if (ord.length === 2 && dias.includes(0) && dias.includes(6)) return 'Fins de semana';
  return ord.map((d) => DIAS_CURTOS[d]).join(', ').replace(/^./, (c) => c.toUpperCase());
}

// ---------- Emojis sugeridos ----------
export const EMOJIS = ['✅', '🛏️', '📖', '🧘', '📝', '💧', '🏃', '🦷', '💊', '🥗', '🧹', '🐶', '💤', '🌅', '📵', '💼', '📚', '🎯', '🙏', '🧴', '🎸', '💰', '🌱', '☀️'];
export function seletorEmojiHTML(atual = '✅') {
  return `<div class="emoji-linha">
    <input class="entrada emoji-entrada" name="emoji" value="${esc(atual)}" maxlength="4" aria-label="Emoji">
    <div class="emoji-sugestoes">${EMOJIS.map((e) => `<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div>
  </div>`;
}
export function ligarSeletorEmoji(container) {
  container.querySelectorAll('.emoji-linha').forEach((linha) => {
    const input = linha.querySelector('input');
    linha.addEventListener('click', (e) => {
      const b = e.target.closest('[data-emoji]');
      if (b) input.value = b.dataset.emoji;
    });
  });
}

// ---------- Arrastar para reordenar ----------
/**
 * Torna os filhos de um container reordenáveis arrastando pela alça.
 * Funciona tanto em lista vertical quanto em grade de 2 colunas.
 * @param {HTMLElement} container
 * @param {{itens:string, alca:string, aoSoltar:(ids:string[])=>void}} o
 */
export function tornarOrdenavel(container, { itens, alca, aoSoltar }) {
  container.addEventListener('pointerdown', (e) => {
    const h = e.target.closest(alca);
    if (!h || !container.contains(h)) return;
    const el = h.closest(itens);
    if (!el) return;
    e.preventDefault();
    vibrar(8);
    const rect = el.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    let px = e.clientX;
    let py = e.clientY;
    el.classList.add('arrastando');
    container.classList.add('ordenando');
    const rolador = container.closest('.view, .sheet-corpo') || document.scrollingElement;

    const posicionar = () => {
      el.style.transform = '';
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${px - offX - r.left}px, ${py - offY - r.top}px) scale(1.03)`;
    };
    const reordenar = () => {
      const embaixo = document.elementFromPoint(px, py);
      const alvo = embaixo && embaixo.closest(itens);
      if (!alvo || alvo === el || !container.contains(alvo)) return;
      const r = alvo.getBoundingClientRect();
      const meiaLargura = r.width < container.clientWidth * 0.7;
      const depois = meiaLargura ? px > r.left + r.width / 2 : py > r.top + r.height / 2;
      if (depois) {
        if (alvo.nextElementSibling !== el) alvo.after(el);
      } else if (alvo.previousElementSibling !== el) {
        alvo.before(el);
      }
    };
    // rolagem automática perto das bordas
    let rodando = true;
    const rolar = () => {
      if (!rodando) return;
      const rr = rolador.getBoundingClientRect ? rolador.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const topo = Math.max(rr.top, 0) + 70;
      const baixo = Math.min(rr.bottom, window.innerHeight) - 110;
      let dy = 0;
      if (py < topo) dy = -Math.min(14, (topo - py) / 4);
      else if (py > baixo) dy = Math.min(14, (py - baixo) / 4);
      if (dy) {
        rolador.scrollTop += dy;
        reordenar();
        posicionar();
      }
      requestAnimationFrame(rolar);
    };
    requestAnimationFrame(rolar);

    const mover = (ev) => {
      px = ev.clientX;
      py = ev.clientY;
      reordenar();
      posicionar();
    };
    const soltar = () => {
      rodando = false;
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      el.style.transform = '';
      el.classList.remove('arrastando');
      container.classList.remove('ordenando');
      const ids = [...container.querySelectorAll(itens)].map((x) => x.dataset.id);
      aoSoltar(ids);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  });
}

/** Reordena um array de objetos {id} conforme a lista de IDs. */
export function reordenarPorIds(lista, ids) {
  const pos = new Map(ids.map((id, i) => [id, i]));
  return [...lista].sort((a, b) => (pos.get(a.id) ?? 9999) - (pos.get(b.id) ?? 9999));
}

/** Mensagem motivadora para listas vazias. */
export function vazioHTML(emoji, titulo, texto, botao = '') {
  return `<div class="vazio">
    <div class="vazio-emoji">${emoji}</div>
    <h3>${esc(titulo)}</h3>
    <p>${esc(texto)}</p>
    ${botao}
  </div>`;
}

// ---------- Ícones SVG usados em vários lugares ----------
export const ICONE_FECHAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
export const ICONE_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
export const ICONE_ALCA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
export const ICONE_EDITAR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>';
export const ICONE_LIXO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
export const ICONE_OLHO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
export const ICONE_OLHO_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.1 6.1C3.6 7.9 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
export const ICONE_MAIS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
export const ICONE_MENOS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>';
export const ICONE_SETA_ESQ = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
export const ICONE_SETA_DIR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
export const ICONE_SETA_BAIXO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>';
export const ICONE_ORDENAR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>';
