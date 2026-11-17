// =============================================================
// conquistas.js — medalhas. Para criar uma nova, adicione um item
// em CONQUISTAS com: id (único), emoji, nome, descricao e a função
// teste(d) que retorna true quando ela deve ser desbloqueada.
// Uma vez desbloqueada, a medalha fica para sempre.
// =============================================================

import { dados } from './store.js';
import { emitir, hojeKey, somarDias, diaSemana, diasDaSemana, inicioSemana } from './utils.js';
import { resumoRotina, sequenciaRotina, sequenciaCheck } from './historico.js';
import { nivelInfo } from './xp.js';

const pendenciasConcluidas = (d) => d.pendencias.filter((p) => p.concluidaEm).length;
const algumDiaCompleto = (d) => {
  if (sequenciaRotina() > 0) return true;
  return Object.values(d.diario).some((r) => r.resumo && r.resumo.total > 0 && r.resumo.feitos >= r.resumo.total);
};
const diasComAgua = (d) => Object.values(d.diario).filter((r) => (r.agua || 0) >= d.ajustes.metaAgua).length;
const recordesPessoais = (d) => d.treinos.sessoes.reduce((s, x) => s + (x.recordes ? x.recordes.length : 0), 0);

/**
 * Semana perfeita: uma semana (segunda a domingo) já terminada — ou hoje,
 * se for domingo — com a rotina 100% em todos os dias que tinham itens
 * e a meta semanal de treinos batida.
 */
export function semanaPerfeita(inicio) {
  const d = dados();
  const hoje = hojeKey();
  const dias = diasDaSemana(inicio);
  if (dias[0] < d.criadoEm) return false; // semana precisa estar toda registrada
  if (dias[6] > hoje) return false;
  let comItens = 0;
  for (const dia of dias) {
    const r = resumoRotina(dia);
    if (r.total > 0) {
      comItens++;
      if (r.feitos < r.total) return false;
    }
  }
  if (comItens === 0) return false;
  const treinos = d.treinos.sessoes.filter((s) => s.dia >= dias[0] && s.dia <= dias[6]).length;
  return treinos >= d.ajustes.metaTreinosSemana;
}

export const CONQUISTAS = [
  { id: 'primeiro-xp', emoji: '✨', nome: 'Primeiro passo', descricao: 'Ganhe seu primeiro XP.', teste: (d) => d.xp.total > 0 },
  { id: 'primeiro-treino', emoji: '🏋️', nome: 'Primeiro treino', descricao: 'Finalize seu primeiro treino.', teste: (d) => d.treinos.sessoes.length >= 1 },
  { id: 'dia-perfeito', emoji: '🌟', nome: 'Dia perfeito', descricao: 'Cumpra 100% da rotina em um dia.', teste: algumDiaCompleto },
  { id: 'rotina-7', emoji: '🔥', nome: '7 dias de rotina', descricao: '7 dias seguidos com a rotina 100% cumprida.', teste: (d) => Math.max(d.stats.melhorSequencia, sequenciaRotina()) >= 7 },
  { id: 'rotina-30', emoji: '☄️', nome: '30 dias de rotina', descricao: '30 dias seguidos com a rotina 100% cumprida.', teste: (d) => Math.max(d.stats.melhorSequencia, sequenciaRotina()) >= 30 },
  {
    id: 'quarto-30',
    emoji: '🛏️',
    nome: 'Quarto em ordem',
    descricao: 'Quarto arrumado por 30 dias seguidos.',
    teste: (d) => d.checks.some((c) => c.chave === 'quarto' && Math.max(c.melhorSequencia || 0, sequenciaCheck(c)) >= 30),
  },
  { id: 'pend-1', emoji: '📌', nome: 'Primeira pendência', descricao: 'Conclua sua primeira pendência.', teste: (d) => pendenciasConcluidas(d) >= 1 },
  { id: 'pend-50', emoji: '🗂️', nome: '50 pendências', descricao: 'Conclua 50 pendências.', teste: (d) => pendenciasConcluidas(d) >= 50 },
  { id: 'nivel-5', emoji: '🥉', nome: 'Nível 5', descricao: 'Alcance o nível 5.', teste: (d) => nivelInfo(d.xp.total).nivel >= 5 },
  { id: 'nivel-10', emoji: '🥇', nome: 'Nível 10', descricao: 'Alcance o nível 10.', teste: (d) => nivelInfo(d.xp.total).nivel >= 10 },
  { id: 'recorde', emoji: '💪', nome: 'Recorde pessoal', descricao: 'Bata um recorde de carga em algum exercício.', teste: (d) => recordesPessoais(d) >= 1 },
  {
    id: 'semana-perfeita',
    emoji: '👑',
    nome: 'Semana perfeita',
    descricao: 'Rotina 100% todos os dias da semana e meta de treinos batida.',
    teste: () => {
      const hoje = hojeKey();
      const semanaPassada = inicioSemana(somarDias(hoje, -7));
      if (semanaPerfeita(semanaPassada)) return true;
      return diaSemana(hoje) === 0 && semanaPerfeita(inicioSemana(hoje));
    },
  },
  { id: 'treinos-25', emoji: '🦾', nome: 'Rato de academia', descricao: 'Finalize 25 treinos.', teste: (d) => d.treinos.sessoes.length >= 25 },
  { id: 'dia-epico', emoji: '⚡', nome: 'Dia épico', descricao: 'Ganhe 300 XP em um único dia.', teste: (d) => Object.values(d.xp.porDia).some((x) => x >= 300) },
  { id: 'hidratado', emoji: '💧', nome: 'Hidratado', descricao: 'Bata a meta de água em 7 dias.', teste: (d) => diasComAgua(d) >= 7 },
];

/**
 * Verifica todas as conquistas e desbloqueia as novas.
 * Retorna true se alguma foi desbloqueada (o chamador deve salvar).
 */
export function verificarConquistas() {
  const d = dados();
  let nova = false;
  for (const c of CONQUISTAS) {
    if (d.conquistas[c.id]) continue;
    let ok = false;
    try {
      ok = c.teste(d);
    } catch (e) {
      console.error('Erro na conquista', c.id, e);
    }
    if (ok) {
      d.conquistas[c.id] = Date.now();
      nova = true;
      emitir('conquista', c);
    }
  }
  return nova;
}
