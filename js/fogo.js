// =============================================================
// fogo.js — aura de FOGO em pixel art (v5), usada no pet mutante e no
// personagem na forma final (nível 50).
//
// Como funciona: uma simulação simples de calor (o clássico "fogo do
// Doom"). Cada pixel do desenho solta calor; o calor sobe, esfria um pouco
// a cada linha e balança para os lados. Rodamos a simulação algumas vezes e
// guardamos vários "quadros"; o CSS mostra um quadro de cada vez, e as
// chamas parecem vivas. Fagulhas soltas sobem acima das chamas.
//
// O SVG do fogo fica ATRÁS do desenho, alinhado pixel a pixel com ele
// (o desenho do svgDaGrade tem 1 pixel de margem para o contorno).
// O resultado é guardado em cache, porque a tela é redesenhada muitas vezes.
// =============================================================

const QUADROS = 6;
const cache = new Map();

/** Gerador de números aleatórios com semente (mesmo fogo a cada desenho). */
function rng(semente) {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Paletas de fogo, do mais quente (perto do corpo) ao mais frio (ponta da chama). */
export const PALETAS_FOGO = {
  fogo: ['#fff3b0', '#fde047', '#fb923c', '#ef4444', '#b91c1c', '#7f1d1d'],
  azul: ['#f0f9ff', '#a5f3fc', '#22d3ee', '#3b82f6', '#1d4ed8', '#1e3a8a'],
  roxo: ['#fdf4ff', '#f0abfc', '#c084fc', '#a855f7', '#7c3aed', '#3b0764'],
};
const NIVEIS = 6; // níveis de calor (0 = sem fogo)

/**
 * SVG das chamas para uma grade de pixel art.
 * @param {string[][]} grade  a mesma grade passada ao svgDaGrade
 * @param {object} o
 * @param {number} [o.intensidade=1]  0.4 (brasas) .. 1.4 (inferno)
 * @param {number} [o.topo]  pixels livres acima do desenho para as chamas
 * @param {number} [o.lado]  pixels livres de cada lado
 * @param {string} [o.paleta='fogo']
 * @param {number} [o.duracao=0.9] segundos para passar por todos os quadros
 */
export function fogoSVG(grade, { intensidade = 1, topo, lado, paleta = 'fogo', duracao = 0.9, semente = 7 } = {}) {
  const A = grade.length;
  const L = grade[0].length;
  topo = topo ?? Math.round(4 + 6 * intensidade);
  lado = lado ?? Math.round(2 + 2 * intensidade);
  const chave = `${grade.map((r) => r.join('')).join('|')}:${intensidade}:${topo}:${lado}:${paleta}:${semente}`;
  if (!cache.has(chave)) cache.set(chave, gerar(grade, { A, L, intensidade, topo, lado, paleta, semente }));
  const { svgQuadros, cw, ch } = cache.get(chave);
  // posição relativa ao desenho (que mede L+2 x A+2 por causa do contorno)
  const estilo = `left:${(-lado / (L + 2)) * 100}%;top:${(-topo / (A + 2)) * 100}%;width:${(cw / (L + 2)) * 100}%;height:${(ch / (A + 2)) * 100}%;--dur:${duracao}s`;
  return `<svg class="fogo" viewBox="0 0 ${cw} ${ch}" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true" style="${estilo}">${svgQuadros}</svg>`;
}

function gerar(grade, { A, L, intensidade, topo, lado, paleta, semente }) {
  const pal = PALETAS_FOGO[paleta] || PALETAS_FOGO.fogo;
  const base = 1;
  const cw = L + 2 + lado * 2;
  const ch = A + 2 + topo + base;
  // máscara: pixels do desenho + o contorno (1 pixel em volta)
  const mask = Array.from({ length: ch }, () => new Array(cw).fill(false));
  const corpo = Array.from({ length: ch }, () => new Array(cw).fill(false));
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      if (grade[y][x] === '.') continue;
      const X = x + 1 + lado;
      const Y = y + 1 + topo;
      corpo[Y][X] = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (mask[Y + dy]) mask[Y + dy][X + dx] = true;
    }
  }
  // a parte de baixo do corpo (pés) quase não solta fogo
  let yBaixo = 0;
  for (let y = 0; y < ch; y++) if (mask[y].some(Boolean)) yBaixo = y;
  const r = rng(semente * 7919 + A * 31 + L);
  // quantos níveis de calor se perdem a cada pixel que sobe (em média):
  // mais intensidade = chamas mais altas
  const taxa = Math.max(0.5, 2.6 - 1.45 * intensidade);
  const inteiro = Math.floor(taxa);
  const resto = taxa - inteiro;
  let calor = Array.from({ length: ch }, () => new Array(cw).fill(0));

  const passo = () => {
    const novo = Array.from({ length: ch }, () => new Array(cw).fill(0));
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (!mask[y][x]) continue;
      // fontes tremulando; os pés esquentam menos
      const fraco = y > yBaixo - 3;
      novo[y][x] = fraco ? NIVEIS - 3 : r() < 0.7 ? NIVEIS : NIVEIS - 2;
    }
    for (let y = ch - 2; y >= 0; y--) {
      for (let x = 0; x < cw; x++) {
        if (mask[y][x]) continue;
        // o calor vem de baixo, com um balanço para os lados (vento)
        const t = r();
        const desvio = t < 0.25 ? -1 : t > 0.75 ? 1 : 0;
        const sx = Math.min(cw - 1, Math.max(0, x + desvio));
        const v = novo[y + 1][sx];
        novo[y][x] = Math.max(0, v - inteiro - (r() < resto ? 1 : 0));
      }
    }
    calor = novo;
  };

  const fagulhas = Array.from({ length: Math.round(2 + 4 * intensidade) }, () => ({
    x: lado + Math.floor(r() * (L + 2)),
    y0: Math.floor(r() * (topo + 4)),
    vel: 1 + Math.floor(r() * 2),
  }));

  for (let i = 0; i < 16; i++) passo(); // aquece
  let svgQuadros = '';
  const cor = (h) => (h > 0 ? pal[NIVEIS - h] || null : null);
  for (let q = 0; q < QUADROS; q++) {
    passo();
    passo();
    let rects = '';
    for (let y = 0; y < ch; y++) {
      let x = 0;
      while (x < cw) {
        const c = corpo[y][x] ? null : cor(calor[y][x]);
        if (!c) {
          x++;
          continue;
        }
        let fim = x + 1;
        while (fim < cw && !corpo[y][fim] && cor(calor[y][fim]) === c) fim++;
        rects += `<rect x="${x}" y="${y}" width="${fim - x}" height="1" fill="${c}"/>`;
        x = fim;
      }
    }
    for (const f of fagulhas) {
      const y = (f.y0 - q * f.vel + (topo + 4) * 4) % (topo + 4);
      if (y >= 0 && y < ch && !mask[y][f.x] && !calor[y][f.x]) rects += `<rect x="${f.x}" y="${y}" width="1" height="1" fill="${q % 2 ? pal[1] : pal[0]}"/>`;
    }
    svgQuadros += `<g class="fq" style="animation-delay:calc(var(--dur) * ${-q / QUADROS})">${rects}</g>`;
  }
  return { svgQuadros, cw, ch };
}
