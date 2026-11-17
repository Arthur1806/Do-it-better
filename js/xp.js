// =============================================================
// xp.js — regras de XP e níveis.
// • Todo XP vira um "lançamento" com ID. Desfazer = remover o lançamento,
//   então nunca há pontos duplicados.
// • Nível N precisa de 100 × N XP para passar para o N+1.
//   Nível 1 -> 2: 100 XP | 2 -> 3: 200 XP | 3 -> 4: 300 XP ...
// • O multiplicador de sequência é aplicado no momento em que o XP é ganho.
// =============================================================

import { dados } from './store.js';
import { hojeKey, somarDias, uid, emitir } from './utils.js';
import { multiplicador } from './historico.js';

/** Títulos por nível (a partir de qual nível vale cada título). */
export const TITULOS = [
  { nivel: 1, titulo: 'Iniciante' },
  { nivel: 3, titulo: 'Aprendiz' },
  { nivel: 5, titulo: 'Focado' },
  { nivel: 7, titulo: 'Disciplinado' },
  { nivel: 10, titulo: 'Determinado' },
  { nivel: 15, titulo: 'Imparável' },
  { nivel: 20, titulo: 'Mestre' },
  { nivel: 30, titulo: 'Lenda' },
];

export function tituloDoNivel(n) {
  let t = TITULOS[0].titulo;
  for (const x of TITULOS) if (n >= x.nivel) t = x.titulo;
  return t;
}

/** XP acumulado necessário para CHEGAR ao nível n. */
export function xpParaChegar(n) {
  // 100 × (1 + 2 + ... + (n-1)) = 50 × n × (n-1)
  return 50 * n * (n - 1);
}

/** Informações do nível para um total de XP. */
export function nivelInfo(total = dados().xp.total) {
  total = Math.max(0, total);
  let n = 1;
  while (xpParaChegar(n + 1) <= total) n++;
  const base = xpParaChegar(n);
  const necessario = 100 * n;
  return {
    nivel: n,
    titulo: tituloDoNivel(n),
    total,
    xpNoNivel: total - base,
    xpParaProximo: necessario,
    falta: necessario - (total - base),
    progresso: (total - base) / necessario,
  };
}

/**
 * Dá XP ao jogador.
 * @param {object} p
 * @param {number} p.base       XP antes do multiplicador
 * @param {string} p.fonte      'rotina' | 'bonus-rotina' | 'check' | 'pendencia' | 'treino' | 'recorde' | 'agua'
 * @param {string} [p.ref]      ID do item que gerou o XP
 * @param {string} [p.rotulo]   texto para o histórico
 * @param {boolean} [p.multiplicar=true]
 * @returns o lançamento criado
 */
export function ganharXP({ base, fonte, ref = null, rotulo = '', multiplicar = true }) {
  const d = dados();
  const dia = hojeKey();
  const nivelAntes = nivelInfo(d.xp.total).nivel;
  const mult = multiplicar ? multiplicador() : 0;
  const xp = Math.round(base * (1 + mult / 100));
  const lanc = { id: uid(), dia, ts: Date.now(), base, mult, xp, fonte, ref, rotulo };
  d.xp.lancamentos.push(lanc);
  d.xp.total += xp;
  d.xp.porDia[dia] = (d.xp.porDia[dia] || 0) + xp;
  emitir('xp', lanc);
  const depois = nivelInfo(d.xp.total);
  if (depois.nivel > nivelAntes) emitir('nivel', depois);
  return lanc;
}

/** Remove um lançamento de XP (desfazer). Retorna o lançamento removido. */
export function removerXP(idLanc) {
  if (!idLanc) return null;
  const d = dados();
  const i = d.xp.lancamentos.findIndex((l) => l.id === idLanc);
  if (i < 0) return null;
  const [lanc] = d.xp.lancamentos.splice(i, 1);
  d.xp.total = Math.max(0, d.xp.total - lanc.xp);
  d.xp.porDia[lanc.dia] = (d.xp.porDia[lanc.dia] || 0) - lanc.xp;
  if (d.xp.porDia[lanc.dia] <= 0) delete d.xp.porDia[lanc.dia];
  emitir('xp-removido', lanc);
  return lanc;
}

/** XP ganho num dia. */
export function xpDoDia(dia = hojeKey()) {
  return dados().xp.porDia[dia] || 0;
}

/** Lista [{dia, xp}] dos últimos n dias (do mais antigo ao mais novo). */
export function xpUltimosDias(n) {
  const hoje = hojeKey();
  return Array.from({ length: n }, (_, i) => {
    const dia = somarDias(hoje, i - (n - 1));
    return { dia, xp: xpDoDia(dia) };
  });
}

/** Melhor dia de todos { dia, xp } (ou null). */
export function melhorDia() {
  let melhor = null;
  for (const [dia, xp] of Object.entries(dados().xp.porDia)) {
    if (!melhor || xp > melhor.xp) melhor = { dia, xp };
  }
  return melhor;
}

/** Recalcula total e cache por dia a partir dos lançamentos (integridade). */
export function recalcularXP() {
  const d = dados();
  let total = 0;
  const porDia = {};
  for (const l of d.xp.lancamentos) {
    total += l.xp;
    porDia[l.dia] = (porDia[l.dia] || 0) + l.xp;
  }
  d.xp.total = total;
  d.xp.porDia = porDia;
}
