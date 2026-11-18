// =============================================================
// pixel.js — motor de PIXEL ART em SVG (sem imagens, sem biblioteca).
// • Cada desenho é uma grade de letras; cada letra é uma cor da paleta
//   ('.' = transparente).
// • Camadas são empilhadas (a de cima cobre a de baixo).
// • O contorno escuro é gerado sozinho em volta do desenho.
// • A saída é um <svg> nítido em qualquer tamanho (crispEdges).
// Para desenhar algo novo: crie uma grade de strings do mesmo tamanho
// (o personagem fica em boneco.js; os pets são 14x12) e use as letras da paleta.
// =============================================================

const CONTORNO = '#1a1326';

/** Escurece (f > 0) ou clareia (f < 0) uma cor hex. */
export function sombrear(hex, f = 0.18) {
  const n = parseInt(String(hex).slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 0) {
    r = Math.round(r * (1 - f));
    g = Math.round(g * (1 - f));
    b = Math.round(b * (1 - f));
  } else {
    r = Math.round(r + (255 - r) * -f);
    g = Math.round(g + (255 - g) * -f);
    b = Math.round(b + (255 - b) * -f);
  }
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Mistura duas cores (t = 0 -> a, t = 1 -> b). */
export function misturar(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const c = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = c(na);
  const [r2, g2, b2] = c(nb);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return '#' + ((1 << 24) | (m(r1, r2) << 16) | (m(g1, g2) << 8) | m(b1, b2)).toString(16).slice(1);
}

/**
 * Empilha camadas numa grade L x A.
 * camada = { linhas: string[], x?: number, y?: number }
 */
export function compor(camadas, L, A) {
  const g = Array.from({ length: A }, () => Array(L).fill('.'));
  for (const c of camadas) {
    if (!c || !c.linhas) continue;
    const ox = c.x || 0;
    const oy = c.y || 0;
    c.linhas.forEach((linha, y) => {
      for (let x = 0; x < linha.length; x++) {
        const ch = linha[x];
        if (ch === '.' || ch === ' ') continue;
        const gx = x + ox;
        const gy = y + oy;
        if (gy >= 0 && gy < A && gx >= 0 && gx < L) g[gy][gx] = ch === '_' ? '.' : ch; // '_' apaga
      }
    });
  }
  return g;
}

/** Gera o SVG de uma grade (com contorno automático de 1 pixel). */
export function svgDaGrade(grade, paleta, { contorno = CONTORNO, classe = '', rotulo = '' } = {}) {
  const A = grade.length;
  const L = grade[0].length;
  // grade com margem de 1 px para o contorno
  const G = Array.from({ length: A + 2 }, (_, y) => Array.from({ length: L + 2 }, (_, x) => (y > 0 && y <= A && x > 0 && x <= L ? grade[y - 1][x - 1] : '.')));
  if (contorno) {
    const cheio = (x, y) => y >= 0 && y < A + 2 && x >= 0 && x < L + 2 && G[y][x] !== '.' && G[y][x] !== '#';
    for (let y = 0; y < A + 2; y++) {
      for (let x = 0; x < L + 2; x++) {
        if (G[y][x] !== '.') continue;
        if (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1)) G[y][x] = '#';
      }
    }
  }
  const cor = (ch) => (ch === '#' ? contorno : paleta[ch] || (paleta[ch.toUpperCase()] ? sombrear(paleta[ch.toUpperCase()]) : null));
  let rects = '';
  for (let y = 0; y < G.length; y++) {
    let x = 0;
    while (x < G[y].length) {
      const ch = G[y][x];
      if (ch === '.') {
        x++;
        continue;
      }
      let fim = x + 1;
      while (fim < G[y].length && G[y][fim] === ch) fim++;
      const c = cor(ch);
      if (c) rects += `<rect x="${x}" y="${y}" width="${fim - x}" height="1" fill="${c}"/>`;
      x = fim;
    }
  }
  return `<svg class="pixel ${classe}" viewBox="0 0 ${L + 2} ${A + 2}" shape-rendering="crispEdges" role="img" aria-label="${rotulo}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

// O PERSONAGEM (24 x 32) fica em boneco.js desde a v5.

// =============================================================
// SPRITES DOS PETS (grade 14 x 12)
// Letras: A cor principal · a sombra · B barriga/focinho · E olho
//         N nariz · R detalhe rosado · W branco · Y bico/chifre
//         G casco · g casco escuro · L luz (robô) · k preto
// =============================================================

export const PET_SPRITES = {
  felino: [
    '.A..........A.',
    '.AA........AA.',
    '.ARA......ARA.',
    '.AAAAAAAAAAAA.',
    'AAAAAAAAAAAAAA',
    'AAAEAAAAAAEAAA',
    'AAAEAAAAAAEAAA',
    'AABBBBNNBBBBAA',
    '.ABBBBBBBBBBA.',
    '..AAAAAAAAAA..',
    '..AABBBBBBAA..',
    '..aa......aa..',
  ],
  canino: [
    '...AAAAAAAA...',
    '.aaAAAAAAAAaa.',
    'aaaAAAAAAAAaaa',
    'aaaAEAAAAEAaaa',
    'aaaAEAAAAEAaaa',
    'aa.ABBBBBBA.aa',
    'aa.BBBNNBBB.aa',
    '...BBBRRBBB...',
    '....AAAAAA....',
    '...AABBBBAA...',
    '...AABBBBAA...',
    '...aa....aa...',
  ],
  urso: [
    '.aa........aa.',
    'aaaa......aaaa',
    'aaAAAAAAAAAAaa',
    '.AAAAAAAAAAAA.',
    '.AAaEAAAAEaAA.',
    '.AAaaAAAAaaAA.',
    '.AAAABNNBAAAA.',
    '..AAABBBBAAA..',
    '...AAAAAAAA...',
    '..aaAAAAAAaa..',
    '..aaAAAAAAaa..',
    '...aa....aa...',
  ],
  coelho: [
    '...AA....AA...',
    '...AR....RA...',
    '...AR....RA...',
    '...AA....AA...',
    '..AAAAAAAAAA..',
    '.AAAAAAAAAAAA.',
    '.AAEAAAAAAEAA.',
    '.ARAAANNAAARA.',
    '..AAABBBBAAA..',
    '..AABBBBBBAA..',
    '..AABBBBBBAA..',
    '...aa....aa...',
  ],
  passaro: [
    '..a........a..',
    '..aA......Aa..',
    '..AAAAAAAAAA..',
    '.AWWWAAAAWWWA.',
    '.AWEWAAAAWEWA.',
    '.AWWWAYYAWWWA.',
    '.AAAAAAYAAAAA.',
    'aAABBBBBBBBAAa',
    'aAABBBBBBBBAAa',
    '.AABBBBBBBBAA.',
    '..AAAAAAAAAA..',
    '...YY....YY...',
  ],
  tartaruga: [
    '.....AAAA.....',
    '....AEAAEA....',
    '.....ARRA.....',
    '...GGGGGGGG...',
    '..GgGGggGGgG..',
    '.AGGgGGGGgGGA.',
    '.AGgGGggGGgGA.',
    '..GGGgGGgGGG..',
    '...GGGGGGGG...',
    '..AA......AA..',
    '..............',
    '..............',
  ],
  slime: [
    '..............',
    '..............',
    '......AA......',
    '.....AAAA.....',
    '....AWAAAA....',
    '...AWAAAAAA...',
    '..AAAEAAEAAA..',
    '..AAAEAAEAAA..',
    '.AAAAARRAAAAA.',
    '.AAAAAAAAAAAA.',
    'aaaaaaaaaaaaaa',
    '..............',
  ],
  dragao: [
    '..Y........Y..',
    '..YA......AY..',
    '..AAAAAAAAAA..',
    '.AAAAAAAAAAAA.',
    '.AAEAAAAAAEAA.',
    '.AAAAAAAAAAAA.',
    'aAABBNBBNBBAAa',
    'aaABBBBBBBBAaa',
    'aa.AABBBBAA.aa',
    '...AABBBBAA...',
    '...AA....AAa..',
    '...aa....aa...',
  ],
  robo: [
    '......Y.......',
    '......k.......',
    '...AAAAAAAA...',
    '..AAAAAAAAAA..',
    '..ALLAAAALLA..',
    '..ALLAAAALLA..',
    '..AAAkkkkAAA..',
    '...AAAAAAAA...',
    '..aABBBBBBAa..',
    '..aABRYRBBAa..',
    '...AAAAAAAA...',
    '...kk....kk...',
  ],
};

/** Rabo de raposa (sobreposto ao felino). */
export const RABO_RAPOSA = { y: 8, linhas: ['............AA', '............AA', '............BB'] };
