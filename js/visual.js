// =============================================================
// visual.js — o PERSONAGEM do jogador (boneco humano em pixel art).
// • Personalização: pele, cabelo (estilo e cor), roupa, calça, sapato,
//   chapéu/boné e acessório, cada um com cor.
// • Raridades: comum, raro, épico e lendário. Os mais exclusivos liberam
//   com o progresso (nível, sequência, medalhas, liga) ou na loja.
// Para criar um item novo: adicione o desenho em pixel.js e uma linha
// em ESTILOS ou CORES com o "desbloqueio".
// =============================================================

import { dados } from './store.js';
import { emitir, esc } from './utils.js';
import { nivelInfo } from './xp.js';
import { sequenciaRotina } from './historico.js';
import { AVATAR_PADRAO } from './visual-padrao.js';
import { CORPO, ROUPAS, CALCAS, CABELOS, CHAPEUS, ACESSORIOS, compor, svgDaGrade, sombrear, misturar } from './pixel.js';

export const RARIDADES = {
  comum: { nome: 'Comum', cor: '#94a3b8' },
  raro: { nome: 'Raro', cor: '#38bdf8' },
  epico: { nome: 'Épico', cor: '#a855f7' },
  lendario: { nome: 'Lendário', cor: '#f59e0b' },
};

// Formas de desbloquear:
//   { tipo: 'gratis' }
//   { tipo: 'loja', preco }              -> comprar com moedas
//   { tipo: 'nivel', n }                 -> alcançar o nível
//   { tipo: 'sequencia', n }             -> melhor sequência de rotina 100%
//   { tipo: 'medalha', id, texto }       -> ter a medalha
//   { tipo: 'liga', n, texto }           -> melhor liga semanal (0 Bronze ... 5 Mestre)
//   { tipo: 'treinos', n }               -> treinos finalizados
const G = { tipo: 'gratis' };
const loja = (preco) => ({ tipo: 'loja', preco });
const nivel = (n) => ({ tipo: 'nivel', n });

/** Estilos (formas) por categoria. */
export const ESTILOS = {
  cabelo: [
    { id: 'curto', nome: 'Curto', r: 'comum', d: G },
    { id: 'espetado', nome: 'Espetado', r: 'comum', d: G },
    { id: 'franja', nome: 'Franja', r: 'comum', d: G },
    { id: 'longo', nome: 'Longo', r: 'comum', d: G },
    { id: 'rabo', nome: 'Rabo de cavalo', r: 'comum', d: G },
    { id: 'careca', nome: 'Careca', r: 'comum', d: G },
    { id: 'coque', nome: 'Coque', r: 'raro', d: loja(120) },
    { id: 'cacheado', nome: 'Cacheado', r: 'raro', d: loja(150) },
    { id: 'moicano', nome: 'Moicano', r: 'epico', d: nivel(6) },
    { id: 'trancas', nome: 'Tranças', r: 'epico', d: { tipo: 'sequencia', n: 14 } },
    { id: 'chamas', nome: 'Cabelo de fogo', r: 'lendario', d: { tipo: 'sequencia', n: 30 } },
  ],
  roupa: [
    { id: 'camiseta', nome: 'Camiseta', r: 'comum', d: G },
    { id: 'regata', nome: 'Regata', r: 'comum', d: G },
    { id: 'moletom', nome: 'Moletom', r: 'comum', d: G },
    { id: 'listrada', nome: 'Listrada', r: 'raro', d: loja(120) },
    { id: 'social', nome: 'Camisa social', r: 'raro', d: loja(150) },
    { id: 'jaqueta', nome: 'Jaqueta', r: 'raro', d: nivel(4) },
    { id: 'atleta', nome: 'Regata de atleta', r: 'epico', d: { tipo: 'treinos', n: 10 } },
    { id: 'armadura', nome: 'Armadura', r: 'epico', d: loja(800) },
    { id: 'heroi', nome: 'Traje de herói', r: 'lendario', d: nivel(20) },
    { id: 'terno', nome: 'Terno de gala', r: 'lendario', d: { tipo: 'liga', n: 5, texto: 'Chegue à liga Mestre' } },
  ],
  calca: [
    { id: 'calca', nome: 'Calça', r: 'comum', d: G },
    { id: 'shorts', nome: 'Shorts', r: 'comum', d: G },
    { id: 'saia', nome: 'Saia', r: 'comum', d: G },
    { id: 'jogger', nome: 'Jogger', r: 'raro', d: loja(80) },
  ],
  chapeu: [
    { id: 'nenhum', nome: 'Nenhum', r: 'comum', d: G },
    { id: 'bone', nome: 'Boné', r: 'comum', d: G },
    { id: 'gorro', nome: 'Gorro', r: 'comum', d: G },
    { id: 'boneVirado', nome: 'Boné para trás', r: 'raro', d: loja(100) },
    { id: 'bandana', nome: 'Bandana', r: 'raro', d: loja(120) },
    { id: 'cowboy', nome: 'Chapéu de cowboy', r: 'epico', d: nivel(8) },
    { id: 'cartola', nome: 'Cartola', r: 'epico', d: loja(450) },
    { id: 'viking', nome: 'Capacete viking', r: 'epico', d: { tipo: 'medalha', id: 'pendencias-2', texto: 'Medalha Resolvedor Prata' } },
    { id: 'coroa', nome: 'Coroa', r: 'lendario', d: { tipo: 'medalha', id: 'semana-perfeita', texto: 'Tenha uma semana perfeita' } },
    { id: 'aureola', nome: 'Auréola', r: 'lendario', d: { tipo: 'medalha', id: 'perfeitos-3', texto: '50 dias perfeitos' } },
  ],
  acessorio: [
    { id: 'nenhum', nome: 'Nenhum', r: 'comum', d: G },
    { id: 'oculos', nome: 'Óculos', r: 'comum', d: G },
    { id: 'barba', nome: 'Barba', r: 'comum', d: G },
    { id: 'bigode', nome: 'Bigode', r: 'comum', d: G },
    { id: 'escuros', nome: 'Óculos escuros', r: 'raro', d: loja(150) },
    { id: 'fone', nome: 'Fone gamer', r: 'epico', d: nivel(5) },
  ],
};

/** Paletas de cores por categoria. */
export const CORES = {
  pele: [
    { id: 'p1', nome: 'Clara', hex: '#ffe0bd', r: 'comum', d: G },
    { id: 'p2', nome: 'Média clara', hex: '#f1c27d', r: 'comum', d: G },
    { id: 'p3', nome: 'Média', hex: '#e0ac69', r: 'comum', d: G },
    { id: 'p4', nome: 'Morena', hex: '#c68642', r: 'comum', d: G },
    { id: 'p5', nome: 'Escura', hex: '#8d5524', r: 'comum', d: G },
    { id: 'p6', nome: 'Muito escura', hex: '#5c3a21', r: 'comum', d: G },
    { id: 'alien', nome: 'Alienígena', hex: '#86efac', r: 'epico', d: nivel(12) },
    { id: 'avatar', nome: 'Azul místico', hex: '#93c5fd', r: 'epico', d: loja(400) },
  ],
  corCabelo: [
    { id: 'preto', nome: 'Preto', hex: '#241c2e', r: 'comum', d: G },
    { id: 'castanho', nome: 'Castanho', hex: '#5b3a29', r: 'comum', d: G },
    { id: 'loiro', nome: 'Loiro', hex: '#e6c36a', r: 'comum', d: G },
    { id: 'ruivo', nome: 'Ruivo', hex: '#b5452a', r: 'comum', d: G },
    { id: 'grisalho', nome: 'Grisalho', hex: '#c4c4cf', r: 'comum', d: G },
    { id: 'rosa', nome: 'Rosa', hex: '#f472b6', r: 'raro', d: loja(100) },
    { id: 'azul', nome: 'Azul', hex: '#60a5fa', r: 'raro', d: loja(100) },
    { id: 'verde', nome: 'Verde', hex: '#4ade80', r: 'raro', d: loja(100) },
    { id: 'roxo', nome: 'Roxo', hex: '#a78bfa', r: 'raro', d: loja(100) },
    { id: 'dourado', nome: 'Dourado', hex: '#fcd34d', r: 'lendario', d: nivel(15) },
    { id: 'platina', nome: 'Platina neon', hex: '#e0f2fe', r: 'lendario', d: { tipo: 'liga', n: 4, texto: 'Chegue à liga Diamante' } },
  ],
  geral: [
    { id: 'branco', nome: 'Branco', hex: '#f1f5f9', r: 'comum', d: G },
    { id: 'preto', nome: 'Preto', hex: '#273041', r: 'comum', d: G },
    { id: 'cinza', nome: 'Cinza', hex: '#6b7280', r: 'comum', d: G },
    { id: 'vermelho', nome: 'Vermelho', hex: '#ef4444', r: 'comum', d: G },
    { id: 'laranja', nome: 'Laranja', hex: '#f97316', r: 'comum', d: G },
    { id: 'amarelo', nome: 'Amarelo', hex: '#facc15', r: 'comum', d: G },
    { id: 'verde', nome: 'Verde', hex: '#22c55e', r: 'comum', d: G },
    { id: 'azul', nome: 'Azul', hex: '#3b82f6', r: 'comum', d: G },
    { id: 'marinho', nome: 'Marinho', hex: '#1e3a8a', r: 'comum', d: G },
    { id: 'jeans', nome: 'Jeans', hex: '#3b5b8c', r: 'comum', d: G },
    { id: 'roxo', nome: 'Roxo', hex: '#8b5cf6', r: 'comum', d: G },
    { id: 'rosa', nome: 'Rosa', hex: '#ec4899', r: 'comum', d: G },
    { id: 'marrom', nome: 'Marrom', hex: '#92400e', r: 'comum', d: G },
    { id: 'neon', nome: 'Verde neon', hex: '#39ff14', r: 'raro', d: loja(150) },
    { id: 'ouro', nome: 'Ouro', hex: '#fbbf24', r: 'lendario', d: nivel(15) },
  ],
};

/** Categorias do editor (ordem das abas). */
export const CATEGORIAS = [
  { id: 'pele', nome: 'Pele', tipo: 'cor', paleta: 'pele' },
  { id: 'cabelo', nome: 'Cabelo', tipo: 'estilo' },
  { id: 'corCabelo', nome: 'Cor do cabelo', tipo: 'cor', paleta: 'corCabelo' },
  { id: 'roupa', nome: 'Roupa', tipo: 'estilo' },
  { id: 'corRoupa', nome: 'Cor da roupa', tipo: 'cor', paleta: 'geral' },
  { id: 'calca', nome: 'Calça', tipo: 'estilo' },
  { id: 'corCalca', nome: 'Cor da calça', tipo: 'cor', paleta: 'geral' },
  { id: 'corSapato', nome: 'Sapato', tipo: 'cor', paleta: 'geral' },
  { id: 'chapeu', nome: 'Chapéu', tipo: 'estilo' },
  { id: 'corChapeu', nome: 'Cor do chapéu', tipo: 'cor', paleta: 'geral' },
  { id: 'acessorio', nome: 'Acessório', tipo: 'estilo' },
];

export { AVATAR_PADRAO };

/** Lista de opções de uma categoria. */
export function opcoes(cat) {
  const c = CATEGORIAS.find((x) => x.id === cat);
  return c.tipo === 'cor' ? CORES[c.paleta] : ESTILOS[cat];
}

/** ID global de um item (usado no guarda-roupa e na loja). */
export const idItem = (cat, valor) => `${cat}:${valor}`;

export function buscarItem(cat, valor) {
  return opcoes(cat).find((o) => o.id === valor) || null;
}

// -------------------------------------------------------------
// Desbloqueio
// -------------------------------------------------------------

/** O item está liberado para usar? */
export function liberado(cat, item, d = dados()) {
  const dd = item.d;
  switch (dd.tipo) {
    case 'gratis':
      return true;
    case 'loja':
      return d.guardaRoupa.includes(idItem(cat, item.id));
    case 'nivel':
      return nivelInfo(d.xp.total).nivel >= dd.n;
    case 'sequencia':
      return Math.max(d.stats.melhorSequencia || 0, sequenciaRotina()) >= dd.n;
    case 'medalha':
      return !!d.conquistas[dd.id];
    case 'liga':
      return (d.stats.melhorLiga || 0) >= dd.n;
    case 'treinos':
      return d.treinos.sessoes.length >= dd.n;
    default:
      return false;
  }
}

/** Texto de como liberar. */
export function comoLiberar(item) {
  const dd = item.d;
  switch (dd.tipo) {
    case 'gratis':
      return 'Grátis';
    case 'loja':
      return `🪙 ${dd.preco} na loja`;
    case 'nivel':
      return `Nível ${dd.n}`;
    case 'sequencia':
      return `${dd.n} dias seguidos de rotina 100%`;
    case 'treinos':
      return `${dd.n} treinos finalizados`;
    default:
      return dd.texto || '';
  }
}

/** Todos os itens que dependem de progresso (para avisar quando liberam). */
function itensDeProgresso() {
  const l = [];
  for (const c of CATEGORIAS) for (const o of opcoes(c.id)) if (!['gratis', 'loja'].includes(o.d.tipo)) l.push({ cat: c.id, item: o });
  return l;
}

/**
 * Verifica itens recém-liberados pelo progresso e avisa (evento 'visual').
 * Retorna true se algo novo foi liberado.
 */
export function verificarVisual() {
  const d = dados();
  let novo = false;
  for (const { cat, item } of itensDeProgresso()) {
    const id = idItem(cat, item.id);
    if (d.visualVisto.includes(id)) continue;
    if (liberado(cat, item, d)) {
      d.visualVisto.push(id);
      d.visualNovos.push(id);
      novo = true;
      emitir('visual', { cat, item });
    }
  }
  return novo;
}

// -------------------------------------------------------------
// Desenho
// -------------------------------------------------------------

const hexDe = (cat, valor, padrao) => {
  const o = buscarItem(cat, valor);
  return o && o.hex ? o.hex : padrao;
};

/** Paleta completa a partir da configuração. */
function paletaDe(cfg) {
  const pele = hexDe('pele', cfg.pele, '#f1c27d');
  const cabelo = hexDe('corCabelo', cfg.corCabelo, '#5b3a29');
  return {
    S: pele,
    s: sombrear(pele, 0.16),
    B: misturar(pele, '#ff6b81', 0.35),
    E: '#1b1726',
    M: '#9b3d4a',
    H: cabelo,
    h: sombrear(cabelo, 0.22),
    T: hexDe('corRoupa', cfg.corRoupa, '#3b82f6'),
    P: hexDe('corCalca', cfg.corCalca, '#3b5b8c'),
    F: hexDe('corSapato', cfg.corSapato, '#f1f5f9'),
    Q: hexDe('corChapeu', cfg.corChapeu, '#ef4444'),
    W: '#f8fafc',
    G: '#fbbf24',
    Y: '#fcd34d',
    R: '#dc2626',
    k: '#151722',
    O: '#1f2937',
    L: '#0f172a',
    Z: '#cbd5e1',
    z: '#64748b',
    V: '#dc2626',
    J: '#1f2433',
    j: '#3a4256',
    U: '#f97316',
    u: '#fde047',
    X: '#67e8f9', // olhos brilhando (físico Imparável)
  };
}

// -------------------------------------------------------------
// EVOLUÇÃO FÍSICA do personagem (pelo nível do jogador)
// Começa magrinho e vai ficando mais forte e intimidador.
// -------------------------------------------------------------

export const FISICOS = [
  { n: 1, nivel: 1, nome: 'Franzino', desc: 'Começando a jornada. Cada dia cumprido deixa você mais forte.' },
  { n: 2, nivel: 3, nome: 'Treinado', desc: 'Braços mais fortes e olhar focado.' },
  { n: 3, nivel: 6, nome: 'Forte', desc: 'Ombros largos, braços musculosos e olhar de quem não desiste.' },
  { n: 4, nivel: 10, nome: 'Guerreiro', desc: 'Corpo de guerreiro, faixa e pintura de batalha, aura de fogo.' },
  { n: 5, nivel: 20, nome: 'Imparável', desc: 'Olhos brilhando e aura de energia de um guerreiro imparável.' },
];

export function fisicoDoNivel(nivel) {
  let f = FISICOS[0];
  for (const x of FISICOS) if (nivel >= x.nivel) f = x;
  return f;
}
export function fisicoAtual() {
  return fisicoDoNivel(nivelInfo(dados().xp.total).nivel);
}

/** Aplica músculos, expressão e brilho do físico na grade. */
function aplicarFisico(g, n) {
  const get = (x, y) => (g[y] && g[y][x] !== undefined ? g[y][x] : '.');
  const set = (x, y, ch) => {
    if (y >= 0 && y < g.length && x >= 0 && x < 16) g[y][x] = ch;
  };
  if (n >= 2) {
    // bíceps mais largos e sobrancelhas
    for (const y of [12, 13]) {
      set(1, y, get(2, y));
      set(14, y, get(13, y));
    }
    if (get(5, 4) === 'S') set(5, 4, 'E');
    if (get(10, 4) === 'S') set(10, 4, 'E');
  }
  if (n >= 3) {
    // ombros largos, antebraços fortes, pescoço grosso, cara séria
    set(2, 11, get(3, 11));
    set(13, 11, get(12, 11));
    set(1, 14, 'S');
    set(14, 14, 'S');
    if (get(5, 10) === '.') set(5, 10, 's');
    if (get(10, 10) === '.') set(10, 10, 's');
    // sobrancelhas franzidas (em "V") e olhar estreito: cara de bravo
    const rosto = (x, y) => ['S', 'E', 'B'].includes(get(x, y));
    if (rosto(4, 4) && rosto(11, 4)) {
      set(6, 4, 'S');
      set(9, 4, 'S');
      set(4, 4, 'E');
      set(11, 4, 'E');
      set(6, 5, 'E');
      set(9, 5, 'E');
      set(5, 5, 'S');
      set(10, 5, 'S');
    }
    if (get(7, 8) === 'M') {
      set(7, 8, 'k');
      set(8, 8, 'k');
    }
  }
  if (n >= 4) {
    // corpo de guerreiro e pintura de batalha
    set(1, 11, get(2, 11));
    set(14, 11, get(13, 11));
    for (const y of [15, 16, 17]) {
      set(2, y, get(3, y));
      set(13, y, get(12, y));
    }
    set(2, 18, 'F');
    set(13, 18, 'F');
    // pintura de guerra (2 riscos em cada bochecha) e boca cerrada
    for (const [x, y] of [[4, 7], [5, 7], [10, 7], [11, 7]]) if (['S', 'B'].includes(get(x, y))) set(x, y, 'R');
    if (get(6, 8) === 'S' && get(7, 8) === 'k') set(6, 8, 'k');
    if (get(9, 8) === 'S' && get(8, 8) === 'k') set(9, 8, 'k');
    // faixa de guerreiro na testa (só se a testa estiver à mostra)
    let testa = 0;
    for (let x = 4; x <= 11; x++) if (['S', 'h'].includes(get(x, 3))) testa++;
    if (testa >= 6) {
      for (let x = 3; x <= 12; x++) if (['S', 'h', 'H'].includes(get(x, 3))) set(x, 3, 'R');
      set(13, 3, 'R');
      set(14, 4, 'R');
      set(13, 4, 'R');
    }
  }
  if (n >= 5) {
    // olhos brilhando
    for (let y = 5; y <= 6; y++) for (let x = 0; x < 16; x++) if (g[y][x] === 'E' && !(y === 5 && (x === 6 || x === 9))) g[y][x] = 'X';
  }
  return g;
}

/** Grade (16x20) do personagem. */
export function gradeAvatar(cfg = dados().avatar, fisico = fisicoAtual().n) {
  const c = { ...AVATAR_PADRAO, ...cfg };
  const roupa = ROUPAS[c.roupa] || ROUPAS.camiseta;
  const camadas = [];
  if (roupa.atras) camadas.push(roupa.atras);
  camadas.push({ linhas: CORPO });
  camadas.push(CALCAS[c.calca] || CALCAS.calca);
  camadas.push(roupa);
  camadas.push(CABELOS[c.cabelo] || CABELOS.curto);
  camadas.push(ACESSORIOS[c.acessorio] || ACESSORIOS.nenhum);
  camadas.push(CHAPEUS[c.chapeu] || CHAPEUS.nenhum);
  return aplicarFisico(compor(camadas, 16, 20), fisico);
}

/** SVG do personagem (só o desenho). */
export function avatarSVG(cfg = dados().avatar, classe = '', { fisico } = {}) {
  const c = { ...AVATAR_PADRAO, ...cfg };
  return svgDaGrade(gradeAvatar(c, fisico || fisicoAtual().n), paletaDe(c), { classe: `avatar-pixel ${classe}`, rotulo: 'Seu personagem' });
}

/** Personagem com a aura do físico (fogo no Guerreiro, energia no Imparável). */
export function personagemHTML(cfg = dados().avatar, { classe = '', fisico } = {}) {
  const f = fisico || fisicoAtual().n;
  return `<span class="personagem fisico-${f}">
    <span class="aura-guerreiro" aria-hidden="true"></span>
    ${avatarSVG(cfg, classe, { fisico: f })}
    ${f >= 4 ? '<span class="faiscas" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' : ''}
  </span>`;
}

/** Configuração para mostrar a prévia de um item (cabelo aparece sem chapéu). */
export function previaItem(cfg, cat, valor) {
  const c = { ...cfg, [cat]: valor };
  if (cat === 'cabelo' || cat === 'corCabelo') c.chapeu = 'nenhum';
  return c;
}

/** Etiqueta de raridade. */
export function etiquetaRaridade(r) {
  const x = RARIDADES[r] || RARIDADES.comum;
  return `<span class="raridade r-${r}" style="--cor-r:${x.cor}">${x.nome}</span>`;
}

// -------------------------------------------------------------
// Editor (usado no questionário e no Perfil)
// -------------------------------------------------------------

/**
 * Monta o editor do personagem dentro de um container.
 * @param {HTMLElement} el
 * @param {object} cfg       configuração (é alterada no lugar)
 * @param {{categorias?: string[], aoMudar?: Function, preview?: Function}} o
 */
export function montarEditor(el, cfg, { categorias = CATEGORIAS.map((c) => c.id), aoMudar, preview } = {}) {
  let aba = categorias[0];
  const desenhar = () => {
    const cat = CATEGORIAS.find((c) => c.id === aba);
    const lista = opcoes(aba);
    el.innerHTML = `
      <div class="editor-preview">${preview ? preview(cfg) : avatarSVG(cfg, 'grande')}</div>
      <div class="editor-abas">${categorias.map((id) => `<button type="button" class="${id === aba ? 'on' : ''}" data-ed-aba="${id}">${CATEGORIAS.find((c) => c.id === id).nome}</button>`).join('')}</div>
      <div class="editor-opcoes ${cat.tipo}">
        ${lista.map((o) => {
          const ok = liberado(aba, o);
          const sel = cfg[aba] === o.id;
          const amostra = cat.tipo === 'cor'
            ? `<span class="amostra-cor" style="background:${o.hex}"></span>`
            : avatarSVG(previaItem(cfg, aba, o.id), 'mini');
          return `<button type="button" class="opcao-visual ${sel ? 'on' : ''} ${ok ? '' : 'travado'} r-${o.r}" data-ed-valor="${o.id}" ${ok ? '' : 'aria-disabled="true"'}>
            ${amostra}
            <small>${esc(o.nome)}</small>
            ${ok ? (o.r !== 'comum' ? `<i class="ponto-raridade" style="background:${RARIDADES[o.r].cor}"></i>` : '') : `<span class="cadeado">🔒</span>`}
          </button>`;
        }).join('')}
      </div>
      <p class="dica centro editor-dica"></p>`;
  };
  desenhar();
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ed-aba]');
    if (a) {
      aba = a.dataset.edAba;
      desenhar();
      return;
    }
    const b = e.target.closest('[data-ed-valor]');
    if (!b) return;
    const item = buscarItem(aba, b.dataset.edValor);
    if (!liberado(aba, item)) {
      const dica = el.querySelector('.editor-dica');
      dica.innerHTML = `🔒 <b>${esc(item.nome)}</b> ${etiquetaRaridade(item.r)} — ${esc(comoLiberar(item))}`;
      return;
    }
    cfg[aba] = item.id;
    const rol = el.querySelector('.editor-opcoes').scrollLeft;
    desenhar();
    el.querySelector('.editor-opcoes').scrollLeft = rol;
    if (aoMudar) aoMudar(cfg);
  });
}
