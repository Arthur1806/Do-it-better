// =============================================================
// pixel.js — motor de PIXEL ART em SVG (sem imagens, sem biblioteca).
// • Cada desenho é uma grade de letras; cada letra é uma cor da paleta
//   ('.' = transparente).
// • Camadas são empilhadas (a de cima cobre a de baixo).
// • O contorno escuro é gerado sozinho em volta do desenho.
// • A saída é um <svg> nítido em qualquer tamanho (crispEdges).
// Para desenhar algo novo: crie uma grade de strings do mesmo tamanho
// (16x20 para o personagem, 14x12 para os pets) e use as letras da paleta.
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

// =============================================================
// SPRITES DO PERSONAGEM (grade 16 x 20)
// Letras: S pele · E olhos · M boca · B bochecha · s sombra da pele
//         T roupa · t sombra · W branco · G dourado · R vermelho · k preto
//         P calça · F sapato · H cabelo · Q chapéu · Y ouro · O armação
//         L lente · Z metal · z metal escuro · V capa · J terno · j terno claro
//         U fogo · u fogo claro
// =============================================================

export const CORPO = [
  '................',
  '....SSSSSSSS....',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSS...',
  '...SSESSSSESS...',
  '...SSESSSSESS...',
  '...SBSSSSSSBS...',
  '...SSSSMMSSSS...',
  '....SSSSSSSS....',
  '......ssss......',
  '...SSSSSSSSSS...',
  '..SSSSSSSSSSSS..',
  '..SSSSSSSSSSSS..',
  '..SSSSSSSSSSSS..',
  '...SSSSSSSSSS...',
  '...SSSS..SSSS...',
  '...SSSS..SSSS...',
  '...FFFF..FFFF...',
  '................',
];

/** Roupas (parte de cima) — y = 11, salvo indicação. */
export const ROUPAS = {
  camiseta: { y: 11, linhas: ['...TTTTTTTTTT...', '..TTTTTTTTTTTT..', '..tTTTTTTTTTTt..', '...TTTTTTTTTT...'] },
  regata: { y: 11, linhas: ['....TTTTTTTT....', '....TTTTTTTT....', '....TTTTTTTT....', '....tTTTTTTt....'] },
  moletom: { y: 10, linhas: ['....tt....tt....', '...TTTTWWTTTT...', '..TTTTTWWTTTTT..', '..tTTTttttTTTt..', '...TTTttttTTT...'] },
  social: { y: 11, linhas: ['...TTTWWWWTTT...', '..TTTTTkTTTTTT..', '..tTTTTkTTTTTt..', '...TTTTkTTTTT...'] },
  listrada: { y: 11, linhas: ['...TTTTTTTTTT...', '..WWWWWWWWWWWW..', '..TTTTTTTTTTTT..', '...WWWWWWWWWW...'] },
  jaqueta: { y: 10, linhas: ['...tt......tt...', '...TTTTWWTTTT...', '..TTTTTWWTTTTT..', '..tTTTTWWTTTTt..', '...TTTTWWTTTT...'] },
  atleta: { y: 11, linhas: ['....TTTTTTTT....', '....TTTWWTTT....', '....TTTWWTTT....', '....tTTTTTTt....'] },
  armadura: { y: 10, linhas: ['...zz......zz...', '..ZZZGZZZZGZZZ..', '..zZZZZGGZZZZz..', '..zZZZZZZZZZZz..', '...ZZZGGGGZZZ...'] },
  heroi: {
    y: 11,
    atras: { y: 11, linhas: ['..VVVVVVVVVVVV..', '.VVVVVVVVVVVVVV.', '.VVVVVVVVVVVVVV.', '.VVVVVVVVVVVVVV.', '.VV..........VV.', '.VV..........VV.', 'VVV..........VVV'] },
    linhas: ['...TTTTTTTTTT...', '..TTTTTGGTTTTT..', '..tTTTGGGGTTTt..', '...TTTTGGTTTT...'],
  },
  terno: { y: 11, linhas: ['...JJJWRRWJJJ...', '..JJJJWRRWJJJJ..', '..jJJJJRRJJJJj..', '...JJJJRRJJJJ...'] },
};

/** Calças — y = 15. */
export const CALCAS = {
  calca: { y: 15, linhas: ['...PPPPPPPPPP...', '...PPPP..PPPP...', '...pPPP..PPPp...'] },
  shorts: { y: 15, linhas: ['...PPPPPPPPPP...', '...pPPp..pPPp...'] },
  saia: { y: 15, linhas: ['...PPPPPPPPPP...', '..PPPPPPPPPPPP..'] },
  jogger: { y: 15, linhas: ['...PPPPPPPPPP...', '...PPPP..PPPP...', '...WWWW..WWWW...'] },
};

/** Cabelos — y = 0. */
export const CABELOS = {
  careca: { linhas: [] },
  curto: { linhas: ['....HHHHHHHH....', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '...Hh......hH...', '...H........H...'] },
  espetado: { linhas: ['...H.HH.HH.HH...', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '...HhH....HhH...', '...H........H...'] },
  franja: { linhas: ['....HHHHHHHH....', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '...HHHHHHh..H...', '...HHHh.....H...'] },
  longo: {
    linhas: ['....HHHHHHHH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHh......hHH..', '..HH........HH..', '..HH........HH..', '..HH........HH..', '..HH........HH..', '..Hh........hH..', '..hh........hh..', '..hh........hh..', '..hh........hh..'],
  },
  rabo: { linhas: ['....HHHHHHHH....', '...HHHHHHHHHH...', '...HHHHHHHHHHH..', '...Hh......hHHH.', '...H........HHH.', '.............HH.', '.............Hh.', '..............h.'] },
  coque: { linhas: ['......HHHH......', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '...Hh......hH...'] },
  cacheado: { linhas: ['...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHHH.', '.HHHh......hHHH.', '.HHH........HHH.', '.HH..........HH.', '..H..........H..'] },
  moicano: { linhas: ['......HHHH......', '......HHHH......', '...hhhHHHHhhh...', '...h........h...'] },
  trancas: {
    linhas: ['....HHHHHHHH....', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '..HHh......hHH..', '..Hh........hH..', '..hH........Hh..', '..Hh........hH..', '..hH........Hh..', '..Hh........hH..', '..hH........Hh..', '..G..........G..'],
  },
  chamas: { fixo: true, linhas: ['..u.U.uU.U.u....', '..UuUUUuUUUuU...', '..UUUUUUUUUUUU..', '...UU......UU...'] },
};

/** Chapéus — y = 0, salvo indicação. */
export const CHAPEUS = {
  nenhum: { linhas: [] },
  bone: { linhas: ['....QQQQQQQQ....', '...QQQQQQQQQQ...', '...QQQQWWQQQQ...', '..qqqqqqqqqqqq..'] },
  boneVirado: { linhas: ['....QQQQQQQQ....', '...QQQQQQQQQQ...', '...QQQQQQQQQQ...', '...q........qqq.'] },
  gorro: { linhas: ['.......WW.......', '....QQQQQQQQ....', '...QQQQQQQQQQ...', '...qqqqqqqqqq...'] },
  bandana: { y: 2, linhas: ['...QQQQQQQQQQ...', '...QWQQQQWQQQQq.', '.............qq.'] },
  cowboy: { linhas: ['....QQQQQQQQ....', '....QqQQQQqQ....', '....QQQQQQQQ....', '.qqqqqqqqqqqqqq.'] },
  cartola: { fixo: true, linhas: ['....kkkkkkkk....', '....kkkkkkkk....', '....RRRRRRRR....', '..kkkkkkkkkkkk..'] },
  viking: { fixo: true, linhas: ['..W..........W..', '..WW.ZZZZZZ.WW..', '...WZZZZZZZZW...', '...zzGzzGzzGz...'] },
  coroa: { fixo: true, linhas: ['...Y..Y..Y..Y...', '...YYYYYYYYYY...', '...YRYYYYYYRY...'] },
  aureola: { fixo: true, linhas: ['....YYYYYYYY....'] },
};

/**
 * CABELO DE PODER (formas transformadas). A grade do personagem ganha
 * "extra" linhas em cima, então y = 0 aqui fica 3 linhas acima da cabeça.
 * I = reflexo de luz no cabelo.
 */
export const CABELO_PODER = {
  extra: 3,
  linhas: [
    '.....H....H.....',
    '.H...HH..HH...H.',
    '.HH.HHHHHHHH.HH.',
    '..HHHHIHHIHHHH..',
    '.HHHHHHHHHHHHHH.',
    '..HHHHHHHHHHHH..',
    '..HHhH.HH.HhHH..',
    '..HH........HH..',
    '..H..........H..',
    '..h..........h..',
  ],
};

/** Acessórios do rosto. */
export const ACESSORIOS = {
  nenhum: { linhas: [] },
  oculos: { y: 5, linhas: ['....OEOOOOEO....', '....OEO..OEO....'] },
  escuros: { y: 5, linhas: ['...OLLLOOLLLO...', '....LLL..LLL....'] },
  barba: { y: 8, cabelo: true, linhas: ['...HH......HH...', '....HHHHHHHH....', '.....HHHHHH.....'] },
  bigode: { y: 8, cabelo: true, linhas: ['.....HHHHHH.....'] },
  fone: { y: 1, linhas: ['....kkkkkkkk....', '...k........k...', '..k..........k..', '..k..........k..', '.RR..........RR.', '.RR..........RR.'] },
};

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
