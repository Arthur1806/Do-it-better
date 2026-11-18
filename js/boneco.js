// =============================================================
// boneco.js — o PERSONAGEM em pixel art 24 x 32 (v5).
//
// Como o desenho é montado:
// 1. Um MOLDE de corpo, escolhido pelo físico (Franzino → Lenda em Chamas).
//    O molde não tem cores: cada pixel diz a REGIÃO do corpo
//    (1 cabeça · 2 pescoço · 3 tronco · 4 braço · 5 mão · 6 quadril · 7 perna · 8 pé).
// 2. A ROUPA, a CALÇA e o SAPATO são REGRAS sobre essas regiões
//    ("o tronco e os 3 primeiros pixels do braço viram camiseta, a gola é
//    mais escura..."). Por isso qualquer roupa serve em qualquer físico.
// 3. Rosto, cabelo, acessório e chapéu são camadas desenhadas por cima.
//
// Letras da paleta (veja paletaBoneco em visual.js):
//   S pele · s sombra da pele · E olho · W branco/brilho · M boca · B bochecha
//   T roupa · t sombra da roupa · P calça · p sombra da calça · F sapato · f sola
//   H cabelo · h sombra do cabelo · Q chapéu · q sombra do chapéu
//   G dourado · Y ouro claro · R vermelho · k preto · O armação · L lente
//   Z metal · z metal escuro · V capa · J terno · j lapela · X olho brilhando
//   U fogo · u fogo claro
// =============================================================

export const LARGURA = 24;
export const ALTURA = 32;

/** Monta uma linha de 24 pixels a partir de trechos [letra, x0, x1]. */
function linha(...trechos) {
  const r = Array(LARGURA).fill('.');
  for (const [ch, x0, x1 = x0] of trechos) for (let x = x0; x <= x1; x++) r[x] = ch;
  return r.join('');
}

// -------------------------------------------------------------
// Moldes de corpo
// -------------------------------------------------------------

const CABECA = {
  2: linha(['1', 8, 15]),
  3: linha(['1', 7, 16]),
  4: linha(['1', 6, 17]),
  5: linha(['1', 6, 17]),
  6: linha(['1', 6, 17]),
  7: linha(['1', 6, 17]),
  8: linha(['1', 6, 17]),
  9: linha(['1', 6, 17]),
  10: linha(['1', 6, 17]),
  11: linha(['1', 7, 16]),
  12: linha(['1', 8, 15]),
};

/** Corpos: cada um é { linha: string } para as linhas 13..31. */
function molde(corpo) {
  const linhas = [];
  for (let y = 0; y < ALTURA; y++) linhas.push(CABECA[y] || corpo[y] || linha());
  return linhas;
}

const MOLDES = {
  // Franzino: ombros estreitos, braço fino
  magro: molde({
    13: linha(['2', 10, 13]),
    14: linha(['4', 6, 7], ['3', 8, 15], ['4', 16, 17]),
    15: linha(['4', 5, 6], ['3', 8, 15], ['4', 17, 18]),
    16: linha(['4', 5, 6], ['3', 8, 15], ['4', 17, 18]),
    17: linha(['4', 5, 6], ['3', 8, 15], ['4', 17, 18]),
    18: linha(['4', 5, 6], ['3', 8, 15], ['4', 17, 18]),
    19: linha(['4', 5, 6], ['3', 8, 15], ['4', 17, 18]),
    20: linha(['5', 5, 6], ['3', 8, 15], ['5', 17, 18]),
    21: linha(['5', 5, 6], ['3', 8, 15], ['5', 17, 18]),
    22: linha(['6', 8, 15]),
    23: linha(['6', 8, 15]),
    24: linha(['7', 8, 10], ['7', 13, 15]),
    25: linha(['7', 8, 10], ['7', 13, 15]),
    26: linha(['7', 8, 10], ['7', 13, 15]),
    27: linha(['7', 8, 10], ['7', 13, 15]),
    28: linha(['7', 8, 10], ['7', 13, 15]),
    29: linha(['8', 7, 10], ['8', 13, 16]),
    30: linha(['8', 7, 10], ['8', 13, 16]),
  }),
  // Treinado: ombros e braços normais
  medio: molde({
    13: linha(['2', 10, 13]),
    14: linha(['4', 5, 6], ['3', 7, 16], ['4', 17, 18]),
    15: linha(['4', 4, 6], ['3', 7, 16], ['4', 17, 19]),
    16: linha(['4', 4, 5], ['3', 7, 16], ['4', 18, 19]),
    17: linha(['4', 4, 5], ['3', 7, 16], ['4', 18, 19]),
    18: linha(['4', 4, 5], ['3', 7, 16], ['4', 18, 19]),
    19: linha(['4', 4, 5], ['3', 7, 16], ['4', 18, 19]),
    20: linha(['5', 4, 5], ['3', 7, 16], ['5', 18, 19]),
    21: linha(['5', 4, 5], ['3', 7, 16], ['5', 18, 19]),
    22: linha(['6', 7, 16]),
    23: linha(['6', 7, 16]),
    24: linha(['7', 7, 10], ['7', 13, 16]),
    25: linha(['7', 7, 10], ['7', 13, 16]),
    26: linha(['7', 7, 10], ['7', 13, 16]),
    27: linha(['7', 7, 10], ['7', 13, 16]),
    28: linha(['7', 7, 10], ['7', 13, 16]),
    29: linha(['8', 6, 10], ['8', 13, 17]),
    30: linha(['8', 6, 10], ['8', 13, 17]),
  }),
  // Forte / Guerreiro: ombros largos, bíceps grosso, tronco em "V"
  forte: molde({
    13: linha(['2', 9, 14]),
    14: linha(['4', 4, 6], ['3', 7, 16], ['4', 17, 19]),
    15: linha(['4', 3, 6], ['3', 7, 16], ['4', 17, 20]),
    16: linha(['4', 3, 5], ['3', 7, 16], ['4', 18, 20]),
    17: linha(['4', 3, 5], ['3', 7, 16], ['4', 18, 20]),
    18: linha(['4', 3, 5], ['3', 7, 16], ['4', 18, 20]),
    19: linha(['4', 3, 5], ['3', 8, 15], ['4', 18, 20]),
    20: linha(['5', 3, 5], ['3', 8, 15], ['5', 18, 20]),
    21: linha(['5', 3, 5], ['3', 8, 15], ['5', 18, 20]),
    22: linha(['6', 7, 16]),
    23: linha(['6', 7, 16]),
    24: linha(['7', 7, 10], ['7', 13, 16]),
    25: linha(['7', 7, 10], ['7', 13, 16]),
    26: linha(['7', 7, 10], ['7', 13, 16]),
    27: linha(['7', 7, 10], ['7', 13, 16]),
    28: linha(['7', 7, 10], ['7', 13, 16]),
    29: linha(['8', 6, 10], ['8', 13, 17]),
    30: linha(['8', 6, 10], ['8', 13, 17]),
  }),
  // Imparável / Lenda: muito musculoso, pescoço de touro, pernas grossas
  massa: molde({
    13: linha(['2', 8, 15]),
    14: linha(['4', 3, 6], ['3', 7, 16], ['4', 17, 20]),
    15: linha(['4', 2, 6], ['3', 7, 16], ['4', 17, 21]),
    16: linha(['4', 2, 5], ['3', 7, 16], ['4', 18, 21]),
    17: linha(['4', 2, 5], ['3', 7, 16], ['4', 18, 21]),
    18: linha(['4', 2, 5], ['3', 7, 16], ['4', 18, 21]),
    19: linha(['4', 2, 5], ['3', 8, 15], ['4', 18, 21]),
    20: linha(['5', 2, 5], ['3', 8, 15], ['5', 18, 21]),
    21: linha(['5', 2, 5], ['3', 8, 15], ['5', 18, 21]),
    22: linha(['6', 7, 16]),
    23: linha(['6', 7, 16]),
    24: linha(['7', 6, 10], ['7', 13, 17]),
    25: linha(['7', 6, 10], ['7', 13, 17]),
    26: linha(['7', 6, 10], ['7', 13, 17]),
    27: linha(['7', 6, 10], ['7', 13, 17]),
    28: linha(['7', 6, 10], ['7', 13, 17]),
    29: linha(['8', 5, 10], ['8', 13, 18]),
    30: linha(['8', 5, 10], ['8', 13, 18]),
  }),
};

export function moldeDoFisico(n) {
  return n <= 1 ? 'magro' : n === 2 ? 'medio' : n <= 4 ? 'forte' : 'massa';
}

// -------------------------------------------------------------
// Ferramentas sobre a grade
// -------------------------------------------------------------

function criarGrade(nome) {
  return MOLDES[nome].map((l) => l.split(''));
}

/** Informações das regiões (linhas do tronco, braços, pernas...). */
function regioes(g) {
  const info = { tronco: [], bracoE: [], bracoD: [], perna: [], quadril: [], pe: [] };
  const meio = LARGURA / 2;
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      const c = g[y][x];
      if (c === '3') info.tronco.push([x, y]);
      if (c === '4' || c === '5') (x < meio ? info.bracoE : info.bracoD).push([x, y, c]);
      if (c === '6') info.quadril.push([x, y]);
      if (c === '7') info.perna.push([x, y]);
      if (c === '8') info.pe.push([x, y]);
    }
  }
  const ys = (lista) => lista.map((p) => p[1]);
  info.troncoY0 = Math.min(...ys(info.tronco));
  info.troncoY1 = Math.max(...ys(info.tronco));
  info.bracoY0 = Math.min(...ys(info.bracoE));
  info.maoY0 = Math.min(...info.bracoE.filter((p) => p[2] === '5').map((p) => p[1]));
  info.pernaY0 = Math.min(...ys(info.perna));
  info.pernaY1 = Math.max(...ys(info.perna));
  info.quadrilY0 = Math.min(...ys(info.quadril));
  return info;
}

const bordaDireita = (g, x, y, regiao) => g[y][x + 1] === undefined || !regiao.includes(g[y][x + 1]);

// -------------------------------------------------------------
// Roupas (parte de cima) — regras sobre o tronco e os braços
// -------------------------------------------------------------

/**
 * Cada roupa recebe (g, info, set) e pinta por cima das regiões.
 * set(x, y, letra) só pinta pixels que existem no corpo (ou forçado com 4º parâmetro).
 */
const ROUPAS = {
  camiseta: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 3);
    gola(i, set, 'redonda');
  },
  regata: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    // cavas e decote fundo: ombros ficam de fora
    for (const [x, y] of i.tronco) {
      if (y === i.troncoY0 && (x <= 8 || x >= 15)) set(x, y, 'S');
      if (y <= i.troncoY0 + 1 && x >= 10 && x <= 13) set(x, y, y === i.troncoY0 + 1 && (x === 10 || x === 13) ? 't' : 'S');
    }
  },
  moletom: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 99);
    punhos(g, i, set);
    // capuz atrás do pescoço
    for (let x = 8; x <= 15; x++) if (g[13][x] === '.' || g[13][x] === '2') set(x, 13, x >= 10 && x <= 13 ? 't' : 'T', true);
    // bolso canguru e cordões
    for (let x = 9; x <= 14; x++) set(x, i.troncoY1 - 2, 't');
    for (let y = i.troncoY1 - 2; y <= i.troncoY1 - 1; y++) {
      set(9, y, 't');
      set(14, y, 't');
    }
    set(10, i.troncoY0, 'W');
    set(10, i.troncoY0 + 1, 'W');
    set(13, i.troncoY0, 'W');
    set(13, i.troncoY0 + 1, 'W');
  },
  listrada: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 3);
    for (const [x, y] of i.tronco) if ((y - i.troncoY0) % 2 === 1) set(x, y, 'W');
    for (const lado of [i.bracoE, i.bracoD]) for (const [x, y] of lado) if (y - i.bracoY0 === 1) set(x, y, 'W');
    gola(i, set, 'redonda');
  },
  social: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 99);
    punhos(g, i, set, 'W');
    // colarinho branco aberto + carcela com botões
    set(9, i.troncoY0, 'W');
    set(10, i.troncoY0, 'W');
    set(13, i.troncoY0, 'W');
    set(14, i.troncoY0, 'W');
    set(11, i.troncoY0, 'S');
    set(12, i.troncoY0, 'S');
    set(11, i.troncoY0 + 1, 'S');
    for (let y = i.troncoY0 + 1; y <= i.troncoY1; y++) set(12, y, 't');
    for (let y = i.troncoY0 + 2; y <= i.troncoY1; y += 2) set(12, y, 'W');
    set(8, i.troncoY0 + 2, 't');
    set(9, i.troncoY0 + 2, 't');
  },
  jaqueta: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 99);
    punhos(g, i, set);
    // aberta na frente: camiseta branca por baixo e zíper
    for (let y = i.troncoY0; y <= i.troncoY1; y++) {
      set(11, y, 'W');
      set(12, y, 'W');
      set(10, y, 'z');
      set(13, y, 'z');
    }
    // gola levantada
    set(9, 13, 'T', true);
    set(14, 13, 'T', true);
    set(9, i.troncoY0, 't');
    set(14, i.troncoY0, 't');
    set(8, i.troncoY1 - 1, 't');
    set(15, i.troncoY1 - 1, 't');
  },
  atleta: (g, i, set) => {
    ROUPAS.regata(g, i, set);
    // número no peito e faixas laterais
    const y0 = i.troncoY0 + 2;
    for (let y = y0; y <= y0 + 3; y++) set(12, y, 'W');
    set(11, y0, 'W');
    for (const [x, y] of i.tronco) if (bordaDireita(g, x, y, '3') || g[y][x - 1] !== '3') if (y > i.troncoY0) set(x, y, 'W');
  },
  armadura: (g, i, set) => {
    vestirTronco(g, i, set, 'Z');
    vestirBracos(g, i, set, 'Z', 3);
    for (const [x, y] of i.tronco) {
      if (bordaDireita(g, x, y, '3')) set(x, y, 'z');
      if (y === i.troncoY0 + 4 || y === i.troncoY1) set(x, y, 'z');
    }
    // ombreiras mais largas
    for (const lado of [i.bracoE, i.bracoD]) {
      for (const [x, y] of lado) {
        if (y - i.bracoY0 > 1) continue;
        set(x, y, 'Z');
        const fora = x < LARGURA / 2 ? -1 : 1;
        if (g[y][x + fora] === '.' && y - i.bracoY0 === 1) set(x + fora, y, 'z', true);
      }
    }
    // emblema dourado
    set(11, i.troncoY0 + 1, 'G');
    set(12, i.troncoY0 + 1, 'G');
    set(10, i.troncoY0 + 2, 'G');
    set(13, i.troncoY0 + 2, 'G');
    set(11, i.troncoY0 + 3, 'G');
    set(12, i.troncoY0 + 3, 'G');
    for (const x of [9, 14]) set(x, i.troncoY1 - 1, 'G');
  },
  heroi: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 99);
    punhos(g, i, set, 'G');
    // emblema em losango e cinto dourado
    const y0 = i.troncoY0 + 1;
    set(11, y0, 'G');
    set(12, y0, 'G');
    for (let x = 10; x <= 13; x++) set(x, y0 + 1, 'G');
    set(11, y0 + 2, 'G');
    set(12, y0 + 2, 'G');
    set(11, y0 + 1, 'R');
    set(12, y0 + 1, 'R');
    for (const [x, y] of i.tronco) if (y === i.troncoY1) set(x, y, x === 11 || x === 12 ? 'Y' : 'G');
  },
  terno: (g, i, set) => {
    vestirTronco(g, i, set, 'J');
    vestirBracos(g, i, set, 'J', 99);
    punhos(g, i, set, 'W');
    // camisa branca em V, gravata vermelha e lapelas
    for (let y = i.troncoY0; y <= i.troncoY0 + 4; y++) {
      const abre = Math.max(0, 2 - Math.floor((y - i.troncoY0) / 2));
      for (let x = 11 - abre; x <= 12 + abre; x++) set(x, y, 'W');
    }
    for (let y = i.troncoY0 + 1; y <= i.troncoY0 + 4; y++) {
      set(11, y, 'R');
      set(12, y, 'R');
    }
    set(11, i.troncoY0, 'R');
    set(11, i.troncoY0 + 5, 'R');
    for (const [x, y] of [[9, i.troncoY0], [10, i.troncoY0 + 1], [14, i.troncoY0], [13, i.troncoY0 + 1]]) set(x, y, 'j');
    for (let y = i.troncoY0 + 5; y <= i.troncoY1; y += 2) set(12, y, 'k');
    set(8, i.troncoY0 + 2, 'W');
  },
  // ---- novas na v5 ----
  time: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 3);
    // gola V branca, faixa na manga e número 10
    set(10, i.troncoY0, 'W');
    set(13, i.troncoY0, 'W');
    set(11, i.troncoY0, 'S');
    set(12, i.troncoY0, 'S');
    set(11, i.troncoY0 + 1, 'W');
    set(12, i.troncoY0 + 1, 'W');
    for (const lado of [i.bracoE, i.bracoD]) for (const [x, y] of lado) if (y - i.bracoY0 === 2) set(x, y, 'W');
    const y0 = i.troncoY0 + 3;
    for (let y = y0; y <= y0 + 3; y++) {
      set(9, y, 'W');
      set(11, y, 'W');
      set(13, y, 'W');
    }
    set(12, y0, 'W');
    set(12, y0 + 3, 'W');
  },
  couro: (g, i, set) => {
    // jaqueta de couro preta por cima de uma camiseta da cor escolhida
    vestirTronco(g, i, set, 'J');
    vestirBracos(g, i, set, 'J', 99);
    punhos(g, i, set);
    for (let y = i.troncoY0; y <= i.troncoY1; y++) {
      set(11, y, 'T');
      set(12, y, 'T');
    }
    // zíper torto e lapelas largas
    for (let y = i.troncoY0 + 1; y <= i.troncoY1; y++) set(13, y, 'z');
    for (const [x, y] of [[8, i.troncoY0], [9, i.troncoY0], [10, i.troncoY0 + 1], [15, i.troncoY0], [14, i.troncoY0], [13, i.troncoY0]]) set(x, y, 'j');
    set(9, 13, 'J', true);
    set(14, 13, 'J', true);
    for (const x of [8, 15]) set(x, i.troncoY1 - 2, 'z');
  },
  kimono: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 99);
    // mangas largas
    for (const lado of [i.bracoE, i.bracoD]) {
      for (const [x, y] of lado) {
        if (y < i.maoY0 - 2 || y >= i.maoY0) continue;
        const fora = x < LARGURA / 2 ? -1 : 1;
        if (g[y][x + fora] === '.') set(x + fora, y, 't', true);
      }
    }
    // gola cruzada e faixa preta
    for (let k = 0; k <= 4; k++) {
      set(9 + k, i.troncoY0 + k, 't');
      if (k < 3) set(14 - k, i.troncoY0 + k, 't');
    }
    set(11, i.troncoY0, 'S');
    set(12, i.troncoY0, 'S');
    for (const [x, y] of i.tronco) if (y >= i.troncoY1 - 1) set(x, y, 'k');
    set(10, i.troncoY1 + 1, 'k', true);
    set(13, i.troncoY1 + 2, 'k', true);
  },
  ninja: (g, i, set) => {
    vestirTronco(g, i, set, 'T');
    vestirBracos(g, i, set, 'T', 99);
    // faixas cruzadas no peito, faixa vermelha na cintura e braços enfaixados
    for (let k = 0; k <= 5; k++) set(8 + k, i.troncoY0 + k, 'k');
    for (const [x, y] of i.tronco) if (y === i.troncoY1) set(x, y, 'R');
    for (const lado of [i.bracoE, i.bracoD]) for (const [x, y, c] of lado) if (c === '4' && y > i.bracoY0 + 2 && (y - i.bracoY0) % 2 === 0) set(x, y, 't');
    set(16, i.troncoY1 + 1, 'R', true);
  },
};

/** Letra da sombra de cada tecido. */
const SOMBRA = { T: 't', Z: 'z', J: 'K', P: 'p' };
const sombra = (letra) => SOMBRA[letra] || letra;

function vestirTronco(g, i, set, letra) {
  for (const [x, y] of i.tronco) set(x, y, bordaDireita(g, x, y, '3') || y === i.troncoY1 ? sombra(letra) : letra);
}

/** Veste os braços até `comprimento` pixels a partir do ombro (99 = até o pulso). */
function vestirBracos(g, i, set, letra, comprimento) {
  for (const lado of [i.bracoE, i.bracoD]) {
    for (const [x, y, c] of lado) {
      if (c !== '4' || y - i.bracoY0 >= comprimento) continue;
      const borda = bordaDireita(g, x, y, '45');
      const barra = comprimento < 99 && y - i.bracoY0 === comprimento - 1;
      set(x, y, borda || barra ? sombra(letra) : letra);
    }
  }
}

function punhos(g, i, set, letra = 't') {
  for (const lado of [i.bracoE, i.bracoD]) for (const [x, y, c] of lado) if (c === '4' && y === i.maoY0 - 1) set(x, y, letra);
}

function gola(i, set) {
  for (let x = 9; x <= 14; x++) set(x, i.troncoY0, 't');
  set(11, i.troncoY0, 'S');
  set(12, i.troncoY0, 'S');
}

// -------------------------------------------------------------
// Calças
// -------------------------------------------------------------

const CALCAS = {
  calca: (g, i, set) => {
    vestirPernas(g, i, set, 99);
    cinto(i, set);
    // costura do meio, bolsos e sombra interna das pernas
    set(11, i.quadrilY0 + 1, 'p');
    set(12, i.quadrilY0 + 1, 'p');
    for (const [x, y] of i.quadril) if (y === i.quadrilY0 + 1 && (x === i.quadril[0][0] + 1 || x === 22 - i.quadril[0][0])) set(x, y, 'p');
  },
  shorts: (g, i, set) => {
    vestirPernas(g, i, set, 2);
    cinto(i, set);
  },
  saia: (g, i, set) => {
    for (const [x, y] of i.quadril) set(x, y, 'P');
    // a saia abre e cobre o vão entre as pernas
    for (let k = 0; k < 3; k++) {
      const y = i.pernaY0 + k;
      const xs = i.perna.filter((p) => p[1] === y).map((p) => p[0]);
      const x0 = Math.min(...xs) - (k > 0 ? 1 : 0);
      const x1 = Math.max(...xs) + (k > 0 ? 1 : 0);
      for (let x = x0; x <= x1; x++) set(x, y, k === 2 ? 'p' : 'P', true);
    }
    for (let x = 9; x <= 14; x += 2) set(x, i.pernaY0 + 1, 'p');
  },
  jogger: (g, i, set) => {
    vestirPernas(g, i, set, 99);
    // cós de elástico com cordão e punho na barra; faixa lateral
    for (const [x, y] of i.quadril) if (y === i.quadrilY0) set(x, y, 'p');
    set(11, i.quadrilY0 + 1, 'W');
    set(12, i.quadrilY0 + 1, 'W');
    for (const [x, y] of i.perna) {
      if (y === i.pernaY1) set(x, y, 'p');
      const esq = x < LARGURA / 2;
      const ext = esq ? !i.perna.some((p) => p[1] === y && p[0] === x - 1) : !i.perna.some((p) => p[1] === y && p[0] === x + 1);
      if (ext && y < i.pernaY1) set(x, y, 'W');
    }
  },
  cargo: (g, i, set) => {
    vestirPernas(g, i, set, 3);
    cinto(i, set);
    // bolsos laterais
    for (const [x, y] of i.perna) {
      if (y !== i.pernaY0 + 1) continue;
      const esq = x < LARGURA / 2;
      const ext = esq ? !i.perna.some((p) => p[1] === y && p[0] === x - 1) : !i.perna.some((p) => p[1] === y && p[0] === x + 1);
      if (ext) set(x, y, 'p'), set(x + (esq ? 1 : -1), y, 'p');
    }
  },
  rasgada: (g, i, set) => {
    CALCAS.calca(g, i, set);
    // rasgos no joelho mostrando a pele
    const y = i.pernaY0 + 2;
    for (const [x, yy] of i.perna) if (yy === y && (x === 8 || x === 9 || x === 14 || x === 15)) set(x, yy, (x + yy) % 2 ? 'S' : 'W');
  },
};

function vestirPernas(g, i, set, comprimento) {
  for (const [x, y] of i.quadril) set(x, y, 'P');
  for (const [x, y] of i.perna) {
    if (y - i.pernaY0 >= comprimento) continue;
    const meio = x === 10 || x === 13; // lado de dentro das pernas
    const barra = comprimento < 99 && y - i.pernaY0 === comprimento - 1;
    set(x, y, meio || barra || bordaDireita(g, x, y, '7') ? 'p' : 'P');
  }
}

function cinto(i, set) {
  for (const [x, y] of i.quadril) if (y === i.quadrilY0) set(x, y, x === 11 || x === 12 ? 'G' : 'k');
}

// -------------------------------------------------------------
// Cabelos (por cima da cabeça; a testa começa na linha 4)
// -------------------------------------------------------------

const C = (linhas) => ({ linhas });
export const CABELOS = {
  careca: C([linha(), linha(), linha(), linha(['W', 9])]),
  curto: C([
    linha(),
    linha(['H', 8, 15]),
    linha(['H', 7, 16]),
    linha(['H', 6, 17]),
    linha(['H', 6, 17], ['h', 9, 11]),
    linha(['H', 6, 10], ['h', 8, 10], ['H', 16, 17]),
    linha(['H', 6], ['H', 17]),
    linha(['h', 6], ['h', 17]),
  ]),
  espetado: C([
    linha(['H', 7], ['H', 10], ['H', 13], ['H', 16]),
    linha(['H', 7, 8], ['H', 10, 11], ['H', 13, 14], ['H', 16, 17]),
    linha(['H', 6, 17]),
    linha(['H', 6, 17], ['h', 8], ['h', 11], ['h', 14]),
    linha(['H', 6, 17]),
    linha(['H', 6, 7], ['H', 9], ['H', 12], ['H', 15], ['H', 16, 17]),
    linha(['H', 6], ['H', 17]),
  ]),
  franja: C([
    linha(),
    linha(['H', 8, 15]),
    linha(['H', 7, 16]),
    linha(['H', 6, 17]),
    linha(['H', 6, 17]),
    linha(['H', 6, 17], ['h', 7, 11]),
    linha(['H', 6, 9], ['H', 12, 13], ['H', 17]),
    linha(['H', 6], ['H', 17]),
  ]),
  longo: C([
    linha(),
    linha(['H', 8, 15]),
    linha(['H', 7, 16]),
    linha(['H', 6, 17]),
    linha(['H', 5, 18], ['h', 11, 12]),
    linha(['H', 5, 10], ['H', 13, 18]),
    linha(['H', 5, 7], ['H', 16, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['H', 5, 7], ['H', 16, 18]),
    linha(['h', 5, 7], ['h', 16, 18]),
    linha(['h', 5, 6], ['h', 17, 18]),
    linha(['h', 5, 6], ['h', 17, 18]),
  ]),
  rabo: C([
    linha(),
    linha(['H', 8, 15]),
    linha(['H', 7, 16]),
    linha(['H', 6, 17]),
    linha(['H', 6, 17], ['R', 18], ['H', 19]),
    linha(['H', 6, 10], ['H', 16, 17], ['H', 18, 20]),
    linha(['H', 6], ['H', 17], ['H', 19, 20]),
    linha(['h', 6], ['h', 17], ['H', 19, 20]),
    linha(['H', 20], ['H', 19]),
    linha(['h', 19, 20]),
    linha(['h', 20]),
  ]),
  coque: C([
    linha(['H', 10, 13]),
    linha(['h', 9, 14]),
    linha(['H', 7, 16]),
    linha(['H', 6, 17]),
    linha(['H', 6, 17], ['h', 7, 8], ['h', 15, 16]),
    linha(['H', 6, 7], ['H', 16, 17]),
    linha(['H', 6], ['H', 17]),
  ]),
  cacheado: C([
    linha(['H', 8, 15]),
    linha(['H', 6, 17], ['h', 9], ['h', 14]),
    linha(['H', 5, 18], ['h', 7], ['h', 12], ['h', 16]),
    linha(['H', 4, 19], ['h', 6], ['h', 10], ['h', 15], ['h', 18]),
    linha(['H', 4, 19], ['h', 8], ['h', 13], ['h', 17]),
    linha(['H', 4, 7], ['H', 9], ['H', 12], ['H', 14], ['H', 16, 19], ['h', 5], ['h', 18]),
    linha(['H', 4, 6], ['H', 17, 19]),
    linha(['H', 4, 5], ['H', 18, 19], ['h', 4], ['h', 19]),
    linha(['h', 5], ['h', 18]),
  ]),
  moicano: C([
    linha(['H', 10, 13]),
    linha(['H', 10, 13], ['h', 11]),
    linha(['H', 10, 13]),
    linha(['h', 7, 9], ['H', 10, 13], ['h', 14, 16]),
    linha(['h', 6, 9], ['H', 10, 13], ['h', 14, 17]),
  ]),
  trancas: C([
    linha(),
    linha(['H', 8, 15]),
    linha(['H', 7, 16], ['h', 9], ['h', 12], ['h', 15]),
    linha(['H', 6, 17]),
    linha(['H', 5, 18], ['h', 8], ['h', 11], ['h', 14]),
    linha(['H', 5, 7], ['H', 16, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['h', 5, 6], ['h', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['h', 5, 6], ['h', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['h', 5, 6], ['h', 17, 18]),
    linha(['H', 5, 6], ['H', 17, 18]),
    linha(['h', 5, 6], ['h', 17, 18]),
    linha(['G', 5, 6], ['G', 17, 18]),
  ]),
  chamas: { fixo: true, linhas: [
    linha(['U', 8], ['u', 11], ['U', 15]),
    linha(['U', 7, 8], ['u', 10, 11], ['U', 14, 15], ['u', 17]),
    linha(['U', 6, 17], ['u', 9, 10], ['u', 13]),
    linha(['U', 6, 17], ['u', 7], ['u', 12], ['u', 16]),
    linha(['U', 6, 17]),
    linha(['U', 6, 8], ['u', 9], ['U', 15, 17]),
    linha(['U', 6], ['U', 17]),
  ] },
};

// -------------------------------------------------------------
// Chapéus
// -------------------------------------------------------------

export const CHAPEUS = {
  nenhum: C([]),
  bone: C([
    linha(),
    linha(['Q', 8, 15]),
    linha(['Q', 7, 16]),
    linha(['Q', 6, 17], ['W', 11, 12]),
    linha(['Q', 6, 17], ['q', 6], ['q', 17]),
    linha(['q', 4, 17]),
  ]),
  boneVirado: C([
    linha(),
    linha(['Q', 8, 15]),
    linha(['Q', 7, 16]),
    linha(['Q', 6, 17]),
    linha(['q', 6, 17], ['W', 10, 13]),
  ]),
  gorro: C([
    linha(['W', 11, 12]),
    linha(['Q', 8, 15]),
    linha(['Q', 7, 16], ['q', 9], ['q', 12], ['q', 15]),
    linha(['Q', 6, 17], ['q', 8], ['q', 11], ['q', 14]),
    linha(['q', 6, 17]),
    linha(['q', 6, 17], ['Q', 7], ['Q', 10], ['Q', 13], ['Q', 16]),
  ]),
  bandana: { y: 3, linhas: [
    linha(['Q', 6, 17]),
    linha(['Q', 6, 17], ['W', 8], ['W', 12], ['W', 15], ['q', 18, 19]),
    linha(['q', 18, 19]),
    linha(['q', 19]),
  ] },
  cowboy: C([
    linha(['Q', 9, 14]),
    linha(['Q', 8, 15], ['q', 11, 12]),
    linha(['Q', 8, 15]),
    linha(['q', 8, 15], ['G', 13]),
    linha(['Q', 3, 20]),
    linha(['q', 4, 6], ['q', 17, 19]),
  ]),
  cartola: { fixo: true, linhas: [
    linha(['O', 8, 15], ['z', 9]),
    linha(['O', 8, 15], ['z', 9]),
    linha(['R', 8, 15]),
    linha(['O', 5, 18]),
  ] },
  viking: { fixo: true, linhas: [
    linha(['W', 4], ['W', 19]),
    linha(['W', 4, 5], ['W', 18, 19]),
    linha(['W', 5, 6], ['Z', 8, 15], ['W', 17, 18]),
    linha(['W', 6], ['Z', 7, 16], ['W', 17]),
    linha(['z', 6, 17], ['G', 8], ['G', 11, 12], ['G', 15]),
  ] },
  coroa: { fixo: true, linhas: [
    linha(['Y', 7], ['Y', 11, 12], ['Y', 16]),
    linha(['Y', 7, 8], ['Y', 11, 12], ['Y', 15, 16]),
    linha(['Y', 7, 16], ['R', 9], ['W', 11, 12], ['R', 14]),
    linha(['G', 7, 16]),
  ] },
  aureola: { fixo: true, linhas: [linha(['Y', 9, 14]), linha(['Y', 8], ['Y', 15])] },
};

// -------------------------------------------------------------
// Acessórios
// -------------------------------------------------------------

export const ACESSORIOS = {
  nenhum: C([]),
  oculos: { y: 6, linhas: [
    linha(['O', 7, 10], ['O', 13, 16]),
    linha(['O', 6, 7], ['O', 10, 13], ['O', 16, 17]),
    linha(['O', 7], ['O', 10], ['O', 13], ['O', 16]),
    linha(['O', 7, 10], ['O', 13, 16]),
  ], vazado: true },
  escuros: { y: 6, linhas: [
    linha(['O', 7, 10], ['O', 13, 16]),
    linha(['O', 6], ['L', 7, 10], ['O', 11, 12], ['L', 13, 16], ['O', 17], ['W', 8], ['W', 14]),
    linha(['L', 7, 10], ['L', 13, 16]),
  ] },
  barba: { y: 9, cabelo: true, linhas: [
    linha(['H', 6], ['H', 17]),
    linha(['H', 6, 9], ['H', 14, 17]),
    linha(['H', 7, 16], ['M', 11, 12]),
    linha(['H', 8, 15], ['h', 10, 13]),
    linha(['h', 10, 13]),
  ] },
  bigode: { y: 9, cabelo: true, linhas: [linha(['H', 9, 14], ['h', 11, 12])] },
  fone: { y: 1, linhas: [
    linha(['k', 9, 14]),
    linha(['k', 7, 8], ['k', 15, 16]),
    linha(['k', 6], ['k', 17]),
    linha(['k', 5], ['k', 18]),
    linha(['k', 5], ['k', 18]),
    linha(['R', 4, 6], ['R', 17, 19]),
    linha(['R', 4, 6], ['R', 17, 19], ['W', 4], ['W', 19]),
    linha(['R', 4, 6], ['R', 17, 19]),
    linha(['k', 4, 6], ['k', 17, 19]),
  ] },
  // ---- novos na v5 ----
  mascara: { y: 9, linhas: [
    linha(['O', 6, 17], ['z', 7, 9], ['z', 14, 16]),
    linha(['O', 6, 17]),
    linha(['O', 7, 16], ['z', 10, 13]),
    linha(['O', 8, 15]),
  ], fixo: true },
  cicatriz: { y: 5, linhas: [linha(['R', 15]), linha(['R', 14]), linha(), linha(['R', 13]), linha(['R', 12])], fixo: true },
  corrente: { y: 14, linhas: [
    linha(['G', 9], ['G', 14]),
    linha(['G', 10], ['G', 13]),
    linha(['G', 11, 12]),
    linha(['Y', 11, 12]),
  ], fixo: true },
};

// -------------------------------------------------------------
// Rosto e físico
// -------------------------------------------------------------

function rosto(set, n) {
  // olhos com brilho, bochechas, nariz e boca
  for (const [x, y] of [[8, 7], [9, 7], [8, 8], [9, 8], [14, 7], [15, 7], [14, 8], [15, 8]]) set(x, y, 'E');
  set(8, 7, 'W');
  set(14, 7, 'W');
  set(7, 9, 'B');
  set(16, 9, 'B');
  set(12, 9, 's');
  set(11, 10, 'M');
  set(12, 10, 'M');
  set(10, 13, 's');
  set(13, 13, 's');
  if (n >= 2) {
    // sobrancelhas
    for (const x of [8, 9, 14, 15]) set(x, 6, 'h');
  }
  if (n >= 3) {
    // cara de bravo: sobrancelha em "V", olhar estreito e boca firme
    set(8, 5, 'h');
    set(15, 5, 'h');
    set(8, 6, 'S');
    set(15, 6, 'S');
    set(9, 7, 'E');
    set(14, 7, 'E');
    set(8, 7, 'S');
    set(15, 7, 'S');
    set(10, 10, 'k');
    set(11, 10, 'k');
    set(12, 10, 'k');
    set(13, 10, 'k');
  }
  if (n >= 4) {
    // pintura de guerra nas bochechas
    for (const [x, y] of [[6, 9], [7, 9], [7, 10], [16, 9], [17, 9], [16, 10]]) set(x, y, 'R');
  }
  if (n >= 5) {
    // olhos brilhando
    for (const [x, y] of [[8, 8], [9, 7], [9, 8], [14, 7], [14, 8], [15, 8]]) set(x, y, 'X');
  }
}

/** Faixa de guerreiro na testa (só aparece se a testa estiver à mostra). */
function faixa(g, n) {
  if (n < 4) return;
  const testa = [];
  for (let x = 6; x <= 17; x++) if (g[4][x] === 'S') testa.push(x);
  if (testa.length < 8) return;
  for (let x = 6; x <= 17; x++) if (['S', 'H', 'h'].includes(g[4][x])) g[4][x] = 'R';
  g[4][18] = 'R';
  g[5][18] = 'R';
  g[5][19] = 'R';
  g[6][19] = 'R';
}

// -------------------------------------------------------------
// Montagem
// -------------------------------------------------------------

function sobrepor(g, camada) {
  if (!camada || !camada.linhas) return;
  const oy = camada.y || 0;
  camada.linhas.forEach((l, dy) => {
    for (let x = 0; x < l.length; x++) {
      const ch = l[x];
      if (ch === '.') continue;
      const y = oy + dy;
      if (y >= 0 && y < ALTURA) g[y][x] = ch;
    }
  });
}

/** A capa do herói fica atrás do corpo. */
function capa(g) {
  for (let y = 14; y <= 28; y++) {
    let x0 = LARGURA;
    let x1 = -1;
    for (let yy = 14; yy <= 21; yy++) for (let x = 0; x < LARGURA; x++) if (g[yy][x] !== '.') {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
    const abre = y > 22 ? 1 : 0;
    for (let x = x0 - 1 - abre; x <= x1 + 1 + abre; x++) if (x >= 0 && x < LARGURA && g[y][x] === '.') g[y][x] = y >= 27 ? 'v' : 'V';
  }
}

/**
 * Grade 24 x 32 do personagem.
 * @param {object} c configuração (pele, cabelo, roupa, calça, chapéu, acessório...)
 * @param {number} fisico 1..6
 */
export function gradeBoneco(c, fisico = 1) {
  const g = criarGrade(moldeDoFisico(fisico));
  const info = regioes(g);
  const set = (x, y, ch, forcar = false) => {
    if (y < 0 || y >= ALTURA || x < 0 || x >= LARGURA) return;
    if (!forcar && g[y][x] === '.') return;
    g[y][x] = ch;
  };
  // 1) pele em tudo + sombra no lado direito dos braços, mãos e pernas
  const base = g.map((l) => l.slice());
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      const r = base[y][x];
      if (r === '.') continue;
      if (r === '8') g[y][x] = y === 30 ? 'f' : 'F';
      else if ((r === '4' || r === '5' || r === '7') && bordaDireita(base, x, y, r === '7' ? '7' : '45')) g[y][x] = 's';
      else if (r === '2') g[y][x] = 's';
      else g[y][x] = 'S';
    }
  }
  // tênis: cadarço e bico
  for (const [x, y] of info.pe) {
    if (y !== 29) continue;
    const esq = x < LARGURA / 2;
    if ((esq && x === 9) || (!esq && x === 14)) g[y][x] = 'W';
  }
  // 2) calça e 3) roupa
  (CALCAS[c.calca] || CALCAS.calca)(base, info, set);
  if (c.roupa === 'heroi') capa(g);
  (ROUPAS[c.roupa] || ROUPAS.camiseta)(base, info, set);
  // 4) rosto (com o físico) e 5) cabelo, acessório e chapéu
  rosto(set, fisico);
  const ac = ACESSORIOS[c.acessorio] || ACESSORIOS.nenhum;
  const temChapeu = c.chapeu && c.chapeu !== 'nenhum';
  sobrepor(g, CABELOS[c.cabelo] || CABELOS.curto);
  faixa(g, fisico);
  if (ac.cabelo || ac === ACESSORIOS.corrente || ac === ACESSORIOS.cicatriz || ac === ACESSORIOS.mascara) sobrepor(g, ac);
  else if (!temChapeu || ac !== ACESSORIOS.fone) sobrepor(g, ac);
  if (temChapeu) sobrepor(g, CHAPEUS[c.chapeu]);
  return g;
}
