// =============================================================
// conquistas.js — MEDALHAS.
// • SÉRIES: cada série tem 4 níveis (Bronze, Prata, Ouro, Diamante).
//   Ex.: "Sequência de fogo" 3 / 7 / 30 / 100 dias.
// • ESPECIAIS: medalhas únicas (ex.: Semana perfeita).
// • Cada medalha desbloqueada dá MOEDAS de recompensa.
// Uma vez desbloqueada, a medalha fica para sempre.
// Para criar uma série nova, adicione em SERIES com valor(d) e niveis.
// =============================================================

import { dados } from './store.js';
import { emitir, hojeKey, somarDias, diaSemana, diasDaSemana, inicioSemana } from './utils.js';
import { resumoRotina, sequenciaRotina, sequenciaCheck } from './historico.js';
import { nivelInfo, ganharMoedas } from './xp.js';
import { contarHabitos, diasComAgua, recordesPessoais, PERSONAGENS } from './personagens.js';

export const TIERS = [
  { n: 1, nome: 'Bronze', emoji: '🥉', classe: 'bronze', moedas: 10 },
  { n: 2, nome: 'Prata', emoji: '🥈', classe: 'prata', moedas: 25 },
  { n: 3, nome: 'Ouro', emoji: '🥇', classe: 'ouro', moedas: 60 },
  { n: 4, nome: 'Diamante', emoji: '💎', classe: 'diamante', moedas: 150 },
];

const diasPerfeitos = (d) => {
  let n = Object.values(d.diario).filter((r) => r.resumo && r.resumo.total > 0 && r.resumo.feitos >= r.resumo.total).length;
  const hoje = resumoRotina(hojeKey());
  if (hoje.total > 0 && hoje.feitos >= hoje.total) n++;
  return n;
};
const melhorSeq = (d) => Math.max(d.stats.melhorSequencia || 0, sequenciaRotina());
const melhorQuarto = (d) => Math.max(0, ...d.checks.filter((c) => c.chave === 'quarto').map((c) => Math.max(c.melhorSequencia || 0, sequenciaCheck(c))));

export const SERIES = [
  { id: 'sequencia', emoji: '🔥', nome: 'Sequência de fogo', unidade: 'dias seguidos com a rotina 100%', niveis: [3, 7, 30, 100], valor: melhorSeq },
  { id: 'perfeitos', emoji: '🌟', nome: 'Dias perfeitos', unidade: 'dias com a rotina 100%', niveis: [1, 10, 50, 150], valor: diasPerfeitos },
  { id: 'habitos', emoji: '✅', nome: 'Hábito de ferro', unidade: 'hábitos marcados', niveis: [10, 100, 500, 2000], valor: contarHabitos },
  { id: 'pendencias', emoji: '📌', nome: 'Resolvedor', unidade: 'pendências concluídas', niveis: [1, 25, 100, 300], valor: (d) => d.pendencias.filter((p) => p.concluidaEm).length },
  { id: 'treinos', emoji: '🏋️', nome: 'Atleta', unidade: 'treinos finalizados', niveis: [1, 10, 50, 150], valor: (d) => d.treinos.sessoes.length },
  { id: 'recordes', emoji: '💪', nome: 'Quebra-recordes', unidade: 'recordes de carga', niveis: [1, 5, 15, 40], valor: recordesPessoais },
  { id: 'agua', emoji: '💧', nome: 'Hidratação', unidade: 'dias com a meta de água', niveis: [3, 10, 30, 100], valor: diasComAgua },
  { id: 'madrugador', emoji: '🌅', nome: 'Madrugador', unidade: 'desafios matinais no prazo', niveis: [5, 20, 60, 200], valor: (d) => d.stats.checksCedo || 0 },
  { id: 'quarto', emoji: '🛏️', nome: 'Quarto em ordem', unidade: 'dias seguidos de quarto arrumado', niveis: [7, 30, 100, 365], valor: melhorQuarto },
  { id: 'missoes', emoji: '🎯', nome: 'Caçador de missões', unidade: 'missões resgatadas', niveis: [5, 30, 100, 300], valor: (d) => d.stats.missoesResgatadas || 0 },
  { id: 'presenca', emoji: '📅', nome: 'Presença', unidade: 'dias seguidos abrindo o baú', niveis: [3, 7, 30, 100], valor: (d) => d.stats.melhorCheckin || 0 },
  { id: 'nivel', emoji: '⭐', nome: 'Evolução', unidade: 'de nível', niveis: [5, 10, 20, 30], valor: (d) => nivelInfo(d.xp.total).nivel },
  { id: 'xp', emoji: '💠', nome: 'Colecionador de XP', unidade: 'XP no total', niveis: [1000, 5000, 20000, 50000], valor: (d) => d.xp.total },
  { id: 'colecao', emoji: '🐾', nome: 'Domador', unidade: 'pets na coleção', niveis: [2, 5, 10, PERSONAGENS.length], valor: (d) => Object.keys(d.colecao).length },
];

/**
 * Semana perfeita: uma semana (segunda a domingo) já terminada — ou hoje,
 * se for domingo — com a rotina 100% em todos os dias que tinham itens
 * e a meta semanal de treinos batida.
 */
export function semanaPerfeita(inicio) {
  const d = dados();
  const hoje = hojeKey();
  const dias = diasDaSemana(inicio);
  if (dias[0] < d.criadoEm) return false;
  if (dias[6] > hoje) return false;
  let comItens = 0;
  for (const dia of dias) {
    const r = resumoRotina(dia);
    if (r.total > 0) {
      comItens++;
      if (r.protegido || r.feitos < r.total) return false;
    }
  }
  if (comItens === 0) return false;
  const treinos = d.treinos.sessoes.filter((s) => s.dia >= dias[0] && s.dia <= dias[6]).length;
  return treinos >= d.ajustes.metaTreinosSemana;
}

export const ESPECIAIS = [
  { id: 'jornada', emoji: '🚀', nome: 'A jornada começa', descricao: 'Personalize o app no questionário inicial.', moedas: 20, teste: (d) => d.meta.onboardingFeito },
  {
    id: 'semana-perfeita',
    emoji: '👑',
    nome: 'Semana perfeita',
    descricao: 'Rotina 100% todos os dias da semana e meta de treinos batida.',
    moedas: 100,
    teste: () => {
      const hoje = hojeKey();
      if (semanaPerfeita(inicioSemana(somarDias(hoje, -7)))) return true;
      return diaSemana(hoje) === 0 && semanaPerfeita(inicioSemana(hoje));
    },
  },
  { id: 'dia-epico', emoji: '⚡', nome: 'Dia épico', descricao: 'Ganhe 300 XP em um único dia.', moedas: 50, teste: (d) => Object.values(d.xp.porDia).some((x) => x >= 300) },
  { id: 'liga-diamante', emoji: '💎', nome: 'Liga Diamante', descricao: 'Chegue à liga Diamante em uma semana.', moedas: 100, teste: (d) => d.stats.melhorLiga >= 4 },
  { id: 'combo-5', emoji: '🌀', nome: 'Combo x5', descricao: 'Conclua 5 coisas seguidas, em sequência rápida.', moedas: 30, teste: (d) => d.stats.comboMax >= 5 },
  { id: 'escudo', emoji: '🛡️', nome: 'Salvo pelo escudo', descricao: 'Tenha a sequência protegida por um escudo.', moedas: 10, teste: (d) => Object.values(d.diario).some((r) => r.resumo && r.resumo.protegido) },
  { id: 'lendario', emoji: '🐉', nome: 'Domador de lendas', descricao: 'Desbloqueie o Dragão Ignis.', moedas: 200, teste: (d) => !!d.colecao.dragao },
];

/** Lista "achatada" de todas as medalhas possíveis (para contagem). */
export function todasMedalhas() {
  const l = [];
  for (const s of SERIES) for (const t of TIERS) l.push({ id: `${s.id}-${t.n}` });
  for (const e of ESPECIAIS) l.push({ id: e.id });
  return l;
}

/** Nível atual (0..4) de uma série e o progresso até o próximo. */
export function progressoSerie(s, d = dados()) {
  let v = 0;
  try {
    v = s.valor(d);
  } catch (_) {}
  let tier = 0;
  s.niveis.forEach((alvo, i) => {
    if (v >= alvo || d.conquistas[`${s.id}-${i + 1}`]) tier = i + 1;
  });
  const proximo = s.niveis[tier] ?? null;
  const anterior = tier > 0 ? s.niveis[tier - 1] : 0;
  return { valor: v, tier, proximo, pct: proximo ? Math.min(1, (v - anterior) / (proximo - anterior)) : 1 };
}

/**
 * Verifica todas as medalhas e desbloqueia as novas (pagando moedas).
 * Retorna true se alguma foi desbloqueada (o chamador deve salvar).
 */
export function verificarConquistas() {
  const d = dados();
  let nova = false;
  for (const s of SERIES) {
    let v = 0;
    try {
      v = s.valor(d);
    } catch (e) {
      console.error('Erro na série', s.id, e);
      continue;
    }
    s.niveis.forEach((alvo, i) => {
      const id = `${s.id}-${i + 1}`;
      if (d.conquistas[id] || v < alvo) return;
      d.conquistas[id] = Date.now();
      const t = TIERS[i];
      ganharMoedas(t.moedas, 'medalha');
      nova = true;
      emitir('conquista', { id, emoji: s.emoji, tier: t, nome: `${s.nome} ${t.nome}`, descricao: `${alvo} ${s.unidade}`, moedas: t.moedas });
    });
  }
  for (const c of ESPECIAIS) {
    if (d.conquistas[c.id]) continue;
    let ok = false;
    try {
      ok = c.teste(d);
    } catch (e) {
      console.error('Erro na conquista', c.id, e);
    }
    if (ok) {
      d.conquistas[c.id] = Date.now();
      ganharMoedas(c.moedas, 'medalha');
      nova = true;
      emitir('conquista', { ...c });
    }
  }
  return nova;
}
