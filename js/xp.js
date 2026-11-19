// =============================================================
// xp.js — regras de XP e níveis.
// • Todo XP vira um "lançamento" com ID. Desfazer = remover o lançamento,
//   então nunca há pontos duplicados.
// • v5: a curva ficou mais longa. O nível máximo é 50 (cerca de 1 ano de
//   uso diário). Cada nível pede um pouco mais que o anterior:
//   XP para passar do nível N = 90 × N^1,1 (mínimo 100, arredondado a 10).
//   Nível 2: 100 XP · nível 10: ~4.850 · nível 20: ~22 mil · nível 50: ~155 mil.
// • PRESTÍGIO: no nível 50 dá para recomeçar a contagem de níveis e ganhar
//   uma estrela ⭐ (+5% de XP cada, até 5). O XP total nunca é apagado:
//   a contagem passa a partir de xp.basePrestigio.
// • O multiplicador de sequência é aplicado no momento em que o XP é ganho.
// =============================================================

import { dados } from './store.js';
import { hojeKey, somarDias, uid, emitir } from './utils.js';
import { multiplicador } from './historico.js';
import { bonusPet, aoGanharXP, aoPerderXP } from './pet.js';

/** Títulos por nível (a partir de qual nível vale cada título). */
export const TITULOS = [
  { nivel: 1, titulo: 'Iniciante' },
  { nivel: 3, titulo: 'Aprendiz' },
  { nivel: 6, titulo: 'Focado' },
  { nivel: 10, titulo: 'Disciplinado' },
  { nivel: 16, titulo: 'Determinado' },
  { nivel: 24, titulo: 'Imparável' },
  { nivel: 32, titulo: 'Mestre' },
  { nivel: 42, titulo: 'Lenda' },
  { nivel: 50, titulo: 'Mito' },
];

/** Nível máximo (depois dele, só prestígio). */
export const NIVEL_MAX = 50;
/** Estrelas de prestígio no máximo (cada uma dá +5% de XP). */
export const PRESTIGIO_MAX = 5;

export function tituloDoNivel(n) {
  let t = TITULOS[0].titulo;
  for (const x of TITULOS) if (n >= x.nivel) t = x.titulo;
  return t;
}

/** XP para passar do nível n para o n+1. */
export function xpDoNivel(n) {
  if (n >= NIVEL_MAX) return 0;
  return Math.max(100, Math.round((90 * Math.pow(n, 1.1)) / 10) * 10);
}

// tabela: XP acumulado para CHEGAR a cada nível (1..50)
const CHEGAR = [0, 0];
for (let n = 1; n < NIVEL_MAX; n++) CHEGAR[n + 1] = CHEGAR[n] + xpDoNivel(n);

/** XP acumulado (desde o último prestígio) necessário para CHEGAR ao nível n. */
export function xpParaChegar(n) {
  return CHEGAR[Math.max(1, Math.min(NIVEL_MAX, n))];
}

/** Nível pela curva, para um XP contado desde o último prestígio. */
export function nivelDoXP(xp) {
  let n = 1;
  while (n < NIVEL_MAX && CHEGAR[n + 1] <= xp) n++;
  return n;
}

/** XP que conta para os níveis (o total menos o que ficou antes do prestígio). */
function xpDosNiveis(total) {
  return Math.max(0, total - (dados().xp.basePrestigio || 0));
}

/** Informações do nível para um total de XP. */
export function nivelInfo(total = dados().xp.total) {
  total = Math.max(0, total);
  const x = xpDosNiveis(total);
  const n = nivelDoXP(x);
  const base = xpParaChegar(n);
  const maximo = n >= NIVEL_MAX;
  const necessario = xpDoNivel(n);
  return {
    nivel: n,
    titulo: tituloDoNivel(n),
    total,
    maximo,
    prestigio: dados().xp.prestigio || 0,
    xpNoNivel: x - base,
    xpParaProximo: necessario,
    falta: maximo ? 0 : necessario - (x - base),
    progresso: maximo ? 1 : (x - base) / necessario,
  };
}

/** Quanto XP falta para chegar ao nível n (0 se já chegou). */
export function faltaParaNivel(n) {
  return Math.max(0, xpParaChegar(n) - xpDosNiveis(dados().xp.total));
}

/**
 * Nível usado para DESBLOQUEIOS (visuais, temas, pets, medalhas).
 * Depois de um prestígio tudo o que já foi liberado continua liberado.
 */
export function nivelDesbloqueio(d = dados()) {
  return (d.xp.prestigio || 0) > 0 ? NIVEL_MAX : nivelInfo(d.xp.total).nivel;
}

/** Pode fazer o prestígio agora? */
export function podePrestigio() {
  const d = dados();
  return nivelInfo(d.xp.total).maximo && (d.xp.prestigio || 0) < PRESTIGIO_MAX;
}

/** Faz o prestígio: +1 estrela e a contagem de níveis recomeça do 1. */
export function fazerPrestigio() {
  if (!podePrestigio()) return false;
  const d = dados();
  d.xp.prestigio = (d.xp.prestigio || 0) + 1;
  d.xp.basePrestigio = d.xp.total;
  d.xp.fisicoPiso = 1;
  emitir('prestigio', d.xp.prestigio);
  return true;
}

/** Bônus de XP das estrelas de prestígio (%). */
export function bonusPrestigio() {
  return Math.min(PRESTIGIO_MAX, dados().xp.prestigio || 0) * 5;
}

// -------------------------------------------------------------
// REGRAS JUSTAS (v6): com ranking público, ninguém pode "fabricar" XP.
// • porAcao: o máximo de XP base que UMA ação rende (mesmo que o item
//   tenha sido configurado com mais).
// • porDia: o máximo de XP base que cada tipo de atividade rende por dia.
//   Passou do limite, a atividade continua contando para a rotina, o pet,
//   as sequências e os desafios — só não rende mais XP naquele dia.
// Desafios, baú e bônus têm valores fixos do jogo e não entram aqui.
// -------------------------------------------------------------
export const LIMITES_XP = {
  rotina: { porAcao: 30, porDia: 400, nome: 'hábitos' },
  'bonus-rotina': { porAcao: 60, porDia: 60, nome: 'bônus da rotina' },
  check: { porAcao: 40, porDia: 160, nome: 'blocos de check' },
  pendencia: { porAcao: 40, porDia: 240, nome: 'pendências' },
  treino: { porAcao: 150, porDia: 300, nome: 'treinos' },
  recorde: { porAcao: 75, porDia: 75, nome: 'recordes' },
  agua: { porAcao: 20, porDia: 20, nome: 'água' },
};

/** XP base já ganho hoje numa fonte (desfazer libera o limite de novo). */
export function baseUsadaHoje(fonte, dia = hojeKey()) {
  let t = 0;
  for (const l of dados().xp.lancamentos) if (l.dia === dia && l.fonte === fonte) t += l.base || 0;
  return t;
}

/** Aplica os limites e devolve { base, limitado }. */
export function limitarBase(fonte, base, dia = hojeKey()) {
  const lim = LIMITES_XP[fonte];
  if (!lim) return { base, limitado: false };
  const porAcao = Math.min(base, lim.porAcao);
  const resta = Math.max(0, lim.porDia - baseUsadaHoje(fonte, dia));
  const final = Math.max(0, Math.min(porAcao, resta));
  return { base: final, limitado: final < base };
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
  // regras justas: limite por ação e por dia
  const lim = limitarBase(fonte, Math.max(0, Math.round(base || 0)), dia);
  const baseOriginal = base;
  base = lim.base;
  // multiplicador de sequência + poção de XP + pet bem cuidado (+5%)
  const mult = multiplicar ? multiplicadorTotal() : 0;
  const xp = Math.round(base * (1 + mult / 100));
  // Cada 10 XP rende 1 moeda (mínimo 1). Desfazer devolve as moedas.
  const moedas = xp > 0 ? Math.max(1, Math.round(xp / 10)) : 0;
  const lanc = { id: uid(), dia, ts: Date.now(), base, mult, xp, moedas, fonte, ref, rotulo };
  d.xp.lancamentos.push(lanc);
  d.xp.total += xp;
  d.xp.porDia[dia] = (d.xp.porDia[dia] || 0) + xp;
  d.carteira.moedas += moedas;
  aoGanharXP(lanc); // o pet fica mais forte com as suas atividades
  if (lim.limitado) {
    lanc.limitado = true;
    emitir('xp-limite', { fonte, nome: LIMITES_XP[fonte].nome, porDia: LIMITES_XP[fonte].porDia, porAcao: LIMITES_XP[fonte].porAcao, pedido: baseOriginal, base });
  }
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
  d.carteira.moedas = Math.max(0, d.carteira.moedas - (lanc.moedas || 0));
  aoPerderXP(lanc);
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
    // o ajuste da conversão de níveis (v5) não conta como XP de um dia
    if (l.fonte !== 'ajuste') porDia[l.dia] = (porDia[l.dia] || 0) + l.xp;
  }
  d.xp.total = total;
  d.xp.porDia = porDia;
}

// -------------------------------------------------------------
// Moedas e poção de XP
// -------------------------------------------------------------

/** A poção de XP está ativa agora? */
export function pocaoAtiva() {
  return (dados().carteira.boostAte || 0) > Date.now();
}

/** Bônus da poção ativa (em %). */
export function bonusPocao() {
  return pocaoAtiva() ? dados().carteira.boostPct || 50 : 0;
}

/** Soma de todos os bônus de XP agora (em %). */
export function multiplicadorTotal() {
  return multiplicador() + bonusPocao() + bonusPet() + bonusPrestigio();
}

/** Ganha moedas (baú, missões, medalhas). */
export function ganharMoedas(qtd, motivo = '') {
  if (!qtd) return;
  dados().carteira.moedas += qtd;
  emitir('moedas', { qtd, motivo });
}

/** Gasta moedas. Retorna false se não tiver saldo. */
export function gastarMoedas(qtd) {
  const c = dados().carteira;
  if (c.moedas < qtd) return false;
  c.moedas -= qtd;
  return true;
}
