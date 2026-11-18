// =============================================================
// mutacao.js — MUTAÇÕES do pet (v5).
//
//   0 Filhote      → a versão fofinha de sempre
//   1 Mutante      → olhos vermelhos, sobrancelha brava, presas, chifrinhos e garras
//   2 Fera         → maior, mais encorpado, espinhos, cicatriz e aura de fogo
//   3 Fera Suprema → chifres enormes, crista de espinhos e um inferno em volta
//
// Para mutar: nível mínimo + DNA 🧬 + pet alimentado (comida, água e força ≥ 50).
// CASTIGO: se a comida OU a água chegarem a zero (pet abandonado por alguns
// dias), ele perde um estágio de mutação (veja atualizarPet em pet.js).
// Voltar a um estágio que ele já teve custa metade do DNA.
//
// O desenho é feito por camadas sobre o sprite de qualquer espécie, então
// funciona para todos os pets (inclusive os que vierem no futuro).
// =============================================================

import { dados } from './store.js';
import { nivelDesbloqueio } from './xp.js';
import { gastarDNA } from './desafios.js';
import { misturar, sombrear } from './pixel.js';

export const MUTACOES = [
  { n: 0, nome: 'Filhote', desc: 'A versão fofinha de sempre.' },
  { n: 1, nome: 'Mutante', nivel: 8, dna: 5, desc: 'Olhos vermelhos, cara de bravo, presas, chifrinhos e garras.' },
  { n: 2, nome: 'Fera', nivel: 20, dna: 20, desc: 'Maior e mais forte: espinhos, cicatriz de batalha e uma aura de fogo.' },
  { n: 3, nome: 'Fera Suprema', nivel: 35, dna: 40, desc: 'Chifres enormes, crista de espinhos e um inferno de chamas em volta.' },
];

export const MUTACAO_MAX = MUTACOES.length - 1;

export function mutacaoDoPet(p = dados().pet) {
  return MUTACOES[Math.max(0, Math.min(MUTACAO_MAX, (p && p.mutacao) || 0))];
}

export function proximaMutacao(p = dados().pet) {
  return MUTACOES[((p && p.mutacao) || 0) + 1] || null;
}

/** Custo em DNA (metade se ele já teve esse estágio antes). */
export function custoMutacao(m, p = dados().pet) {
  if (!m) return 0;
  return (p.mutacaoMax || 0) >= m.n ? Math.ceil(m.dna / 2) : m.dna;
}

/** Pode mutar agora? { ok, prox, custo, faltas: [textos] } */
export function podeMutar() {
  const d = dados();
  const p = d.pet;
  const prox = proximaMutacao(p);
  if (!prox) return { ok: false, prox: null, custo: 0, faltas: [] };
  const custo = custoMutacao(prox, p);
  const faltas = [];
  if (nivelDesbloqueio(d) < prox.nivel) faltas.push(`nível ${prox.nivel}`);
  if ((d.carteira.dna || 0) < custo) faltas.push(`${custo - (d.carteira.dna || 0)} 🧬 DNA`);
  if ((p.comida ?? 0) < 50 || (p.agua ?? 0) < 50 || (p.forca ?? 0) < 50) faltas.push('comida, água e força acima de 50');
  return { ok: faltas.length === 0, prox, custo, faltas };
}

/** Faz a mutação. Retorna o novo estágio ou null. */
export function mutar() {
  const r = podeMutar();
  if (!r.ok) return null;
  const p = dados().pet;
  if (!gastarDNA(r.custo)) return null;
  p.mutacao = r.prox.n;
  p.mutacaoMax = Math.max(p.mutacaoMax || 0, p.mutacao);
  p.mutouEm = Date.now();
  return r.prox;
}

// -------------------------------------------------------------
// Desenho
// -------------------------------------------------------------

/** Margens que cada estágio precisa (chifres em cima, garras embaixo, espinhos dos lados). */
const MARGEM = [
  { topo: 0, lado: 0, base: 0 },
  { topo: 2, lado: 1, base: 1 },
  { topo: 3, lado: 2, base: 1 },
  { topo: 4, lado: 3, base: 1 },
];

/** Aplica a mutação n numa grade de pet (array de arrays). Devolve uma grade nova. */
export function gradeMutante(g, n) {
  if (!n) return g;
  const m = MARGEM[n];
  const H = g.length + m.topo + m.base;
  const W = g[0].length + m.lado * 2;
  const N = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    const oy = y - m.topo;
    const ox = x - m.lado;
    return oy >= 0 && oy < g.length && ox >= 0 && ox < g[0].length ? g[oy][ox] : '.';
  }));
  const get = (x, y) => (N[y] && N[y][x] !== undefined ? N[y][x] : '.');
  const cheio = (x, y) => get(x, y) !== '.';
  const set = (x, y, ch) => {
    if (y >= 0 && y < H && x >= 0 && x < W) N[y][x] = ch;
  };
  const setSeCheio = (x, y, ch) => {
    if (cheio(x, y)) set(x, y, ch);
  };
  const cx = (W - 1) / 2;
  const topoCol = (x) => {
    for (let y = 0; y < H; y++) if (cheio(x, y)) return y;
    return -1;
  };
  let yTopo = H;
  let yBase = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cheio(x, y)) {
    yTopo = Math.min(yTopo, y);
    yBase = Math.max(yBase, y);
  }

  // 1) olhos vermelhos brilhando + sobrancelha brava (em "V")
  const olhos = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (N[y][x] === 'E') {
    N[y][x] = 'X';
    olhos.push([x, y]);
  }
  const topoOlho = olhos.length ? Math.min(...olhos.map((o) => o[1])) : -1;
  if (topoOlho > 0) {
    const linha = olhos.filter((o) => o[1] === topoOlho);
    const esq = linha.filter((o) => o[0] < cx).map((o) => o[0]);
    const dir = linha.filter((o) => o[0] > cx).map((o) => o[0]);
    if (esq.length) {
      const x = Math.max(...esq); // olho esquerdo: parte de dentro mais baixa
      setSeCheio(x, topoOlho - 1, 'k');
      setSeCheio(x + 1, topoOlho - 1, 'k');
      setSeCheio(x - 1, topoOlho - 2, 'k');
    }
    if (dir.length) {
      const x = Math.min(...dir);
      setSeCheio(x, topoOlho - 1, 'k');
      setSeCheio(x - 1, topoOlho - 1, 'k');
      setSeCheio(x + 1, topoOlho - 2, 'k');
    }
  }

  // 2) presas e boca rosnando (abaixo do nariz)
  let yNariz = -1;
  for (let y = 0; y < H && yNariz < 0; y++) if (N[y].includes('N')) yNariz = y;
  if (yNariz >= 0) {
    const xs = N[yNariz].map((c, x) => (c === 'N' ? x : -1)).filter((x) => x >= 0);
    const nl = Math.min(...xs);
    const nr = Math.max(...xs);
    for (let x = nl; x <= nr; x++) setSeCheio(x, yNariz + 1, 'k');
    setSeCheio(nl - 1, yNariz + 1, 'W');
    setSeCheio(nr + 1, yNariz + 1, 'W');
    if (n >= 2) {
      setSeCheio(nl - 1, yNariz + 2, 'W');
      setSeCheio(nr + 1, yNariz + 2, 'W');
    }
  }

  // 3) chifres (crescem e curvam para fora a cada estágio)
  const compr = [0, 2, 3, 5][n];
  const colsChifre = [Math.floor(cx) - 2, Math.ceil(cx) + 2];
  colsChifre.forEach((c, lado) => {
    const yt = topoCol(c);
    if (yt < 0) return;
    const fora = lado === 0 ? -1 : 1;
    for (let i = 1; i <= compr; i++) {
      const x = c + (i >= 3 ? fora : 0) + (i >= 5 ? fora : 0);
      set(x, yt - i, i === compr ? 'c' : 'C');
      if (n >= 2 && i === 1) set(c + fora, yt - 1, 'C'); // base mais grossa
    }
  });

  // 4) garras embaixo de cada pé
  if (yBase >= 0) for (let x = 0; x < W; x++) if (cheio(x, yBase) && !cheio(x, yBase + 1)) set(x, yBase + 1, 'C');

  if (n >= 2) {
    // 5) corpo mais encorpado (metade de baixo mais larga)
    const meio = Math.floor((yTopo + yBase) / 2);
    const vezes = n >= 3 ? 2 : 1;
    for (let v = 0; v < vezes; v++) {
      for (let y = meio; y < yBase; y++) {
        const linha = N[y];
        const xl = linha.findIndex((c) => c !== '.');
        let xr = -1;
        for (let x = W - 1; x >= 0; x--) if (linha[x] !== '.') {
          xr = x;
          break;
        }
        if (xl < 0) continue;
        set(xl - 1, y, linha[xl] === 'C' ? 'A' : linha[xl]);
        set(xr + 1, y, linha[xr] === 'C' ? 'A' : linha[xr]);
      }
    }
    // 6) espinhos nas laterais
    for (const dy of [2, 4, 6]) {
      const y = yTopo + dy + (n >= 3 ? 0 : 1);
      if (y >= H) continue;
      const linha = N[y];
      const xl = linha.findIndex((c) => c !== '.');
      let xr = -1;
      for (let x = W - 1; x >= 0; x--) if (linha[x] !== '.') {
        xr = x;
        break;
      }
      if (xl < 0) continue;
      set(xl - 1, y, 'S');
      set(xr + 1, y, 'S');
      if (n >= 3) {
        set(xl - 2, y - 1, 'S');
        set(xr + 2, y - 1, 'S');
      }
    }
    // 7) cicatriz de batalha na bochecha direita
    const dirOlho = olhos.filter((o) => o[0] > cx);
    if (dirOlho.length) {
      const x = Math.max(...dirOlho.map((o) => o[0]));
      const y = Math.max(...dirOlho.map((o) => o[1]));
      setSeCheio(x + 1, y, 'Z');
      setSeCheio(x, y + 1, 'Z');
      setSeCheio(x + 1, y - 2, 'Z');
    }
  }

  if (n >= 3) {
    // 8) crista de espinhos no alto da cabeça (entre os chifres)
    for (let x = colsChifre[0] + 1; x < colsChifre[1]; x += 2) {
      const yt = topoCol(x);
      if (yt > 0) set(x, yt - 1, 'S');
    }
    // 9) listras de guerra na testa
    if (topoOlho > 1) {
      for (const x of [Math.floor(cx), Math.ceil(cx)]) {
        setSeCheio(x, topoOlho - 2, 'Z');
        setSeCheio(x, topoOlho - 3, 'Z');
      }
    }
  }
  return N;
}

/** Cores da mutação: olhos brilhando, chifres de marfim e o corpo mais escuro. */
export function paletaMutante(pal, n) {
  if (!n) return pal;
  const p = { ...pal };
  const escurece = [0, 0.06, 0.14, 0.24][n];
  for (const k of ['A', 'a', 'B']) if (p[k]) p[k] = misturar(p[k], '#3b0a0a', k === 'B' ? escurece * 0.6 : escurece);
  p.X = n >= 3 ? '#fde047' : '#ff3b3b';
  p.k = p.k || '#140f1f';
  p.C = '#f1ece0';
  p.c = n >= 3 ? '#ef4444' : '#a8a29e';
  p.S = sombrear(p.A, 0.45);
  p.Z = '#7f1d1d';
  if (!p.W) p.W = '#ffffff';
  return p;
}

/** Intensidade do fogo em volta do pet em cada estágio. */
export const FOGO_PET = [0, 0.45, 0.85, 1.25];
