// =============================================================
// jornada.js — JORNADA INICIAL e RESUMO DE ONTEM (v6).
//
// JORNADA INICIAL: um tutorial em forma de missões, UMA de cada vez, no
// topo da tela Hoje. Ensina o ciclo do jogo na ordem certa (fazer → ganhar
// → cuidar → abrir → competir) e dá prêmios a cada passo. Quem já jogava
// antes da v6 começa com ela concluída.
//
// RESUMO DE ONTEM: na primeira abertura do dia, um relatório curto do dia
// anterior (rotina, XP, sequência, pet) e um empurrão para hoje.
// Fecha o ciclo do hábito: ação → recompensa → reflexão → nova ação.
// =============================================================

import { dados } from './store.js';
import { hojeKey, somarDias, formatarNumero, esc } from './utils.js';
import { resumoRotina, lerDia, sequenciaRotina } from './historico.js';
import { xpDoDia, ganharMoedas } from './xp.js';
import { ganharDNA } from './desafios.js';
import * as Nuvem from './nuvem.js';

/**
 * Passos da jornada. feito(d) diz se já foi cumprido;
 * ir = para onde o botão leva.
 */
export const PASSOS = [
  {
    id: 'habito', emoji: '✅', titulo: 'Marque seu primeiro hábito',
    dica: 'No Plano de hoje, toque na caixinha ✓ de qualquer hábito. Cada um dá XP e moedas.',
    feito: (d) => d.xp.lancamentos.some((l) => ['rotina', 'check'].includes(l.fonte)),
    premio: { moedas: 30 }, ir: { aba: 'hoje' },
  },
  {
    id: 'alimentar', emoji: '🍖', titulo: 'Alimente seu pet',
    dica: 'Ele sente fome e sede com o tempo. Dê comida ou água na aba Pet → Cuidar.',
    feito: (d) => (d.stats.alimentou || 0) > 0,
    premio: { moedas: 30 }, ir: { aba: 'pet', secao: 'cuidar' },
  },
  {
    id: 'bau', emoji: '🎁', titulo: 'Abra o baú diário',
    dica: 'Todo dia tem um prêmio surpresa. Abrir em dias seguidos aumenta o prêmio.',
    feito: (d) => !!d.stats.ultimoCheckin,
    premio: { moedas: 20 }, ir: { aba: 'hoje' },
  },
  {
    id: 'desafio', emoji: '🎯', titulo: 'Resgate um desafio do dia',
    dica: 'Na seção Desafios da tela Hoje: complete um e toque em Resgatar.',
    feito: (d) => (d.stats.missoesResgatadas || 0) > 0,
    premio: { moedas: 40, dna: 1 }, ir: { aba: 'hoje' },
  },
  {
    id: 'conta', emoji: '☁️', titulo: 'Crie sua conta grátis',
    dica: 'Salve o progresso na nuvem e entre no ranking da semana. Não mandamos e-mail.',
    feito: () => Nuvem.logado(),
    premio: { moedas: 80, dna: 2 }, ir: { aba: 'social' },
  },
  {
    id: 'amigo', emoji: '👥', titulo: 'Adicione um amigo',
    dica: 'Busque pelo @nick ou mande o convite no WhatsApp. Juntos vocês evoluem mais.',
    feito: (d) => !!d.meta.temAmigo,
    premio: { moedas: 80, dna: 2 }, ir: { aba: 'social', secao: 'amigos' },
  },
  {
    id: 'cem', emoji: '🌟', titulo: 'Feche a rotina 100% num dia',
    dica: 'Cumpra todos os hábitos de um dia. É assim que a sequência 🔥 começa.',
    feito: (d) => (d.stats.melhorSequencia || 0) > 0 || resumoRotina(hojeKey()).total > 0 && resumoRotina(hojeKey()).feitos >= resumoRotina(hojeKey()).total,
    premio: { moedas: 150, dna: 5, escudo: 1 }, ir: { aba: 'hoje' },
  },
];

/** Estado da jornada: { ativa, indice, passo, pronto, total } */
export function estadoJornada(d = dados()) {
  if (!d.meta.onboardingFeito || d.meta.jornadaFeita) return { ativa: false };
  const indice = Math.min(PASSOS.length - 1, (d.meta.jornada && d.meta.jornada.passo) || 0);
  const passo = PASSOS[indice];
  let pronto = false;
  try {
    pronto = passo.feito(d);
  } catch (_) {}
  return { ativa: true, indice, passo, pronto, total: PASSOS.length };
}

/** Resgata o prêmio do passo atual e avança. Devolve { passo, premio, fim } ou null. */
export function resgatarPasso() {
  const d = dados();
  const e = estadoJornada(d);
  if (!e.ativa || !e.pronto) return null;
  const p = e.passo.premio;
  if (p.moedas) ganharMoedas(p.moedas, 'jornada');
  if (p.dna) ganharDNA(p.dna);
  if (p.escudo && d.carteira.escudos < 2) d.carteira.escudos += p.escudo;
  d.meta.jornada = { passo: e.indice + 1 };
  const fim = e.indice + 1 >= PASSOS.length;
  if (fim) d.meta.jornadaFeita = true;
  return { passo: e.passo, premio: p, fim };
}

export const textoPremio = (p) => [p.moedas ? `🪙${p.moedas}` : '', p.dna ? `🧬${p.dna}` : '', p.escudo ? '🛡️' : ''].filter(Boolean).join(' ');

/** Cartão da jornada (tela Hoje). */
export function jornadaHTML() {
  const e = estadoJornada();
  if (!e.ativa) return '';
  const p = e.passo;
  return `<section class="card jornada ${e.pronto ? 'pronta' : ''}">
    <header class="jornada-topo"><b>🧭 Jornada inicial</b><small>${e.indice + 1} de ${e.total}</small></header>
    <div class="jornada-trilha">${PASSOS.map((x, i) => `<i class="${i < e.indice ? 'ok' : i === e.indice ? 'atual' : ''}" title="${esc(x.titulo)}">${i < e.indice ? '✓' : x.emoji}</i>`).join('')}</div>
    <div class="jornada-passo">
      <span class="jornada-emoji">${p.emoji}</span>
      <span class="jornada-info"><b>${esc(p.titulo)}</b><small>${e.pronto ? 'Feito! Pegue seu prêmio.' : esc(p.dica)}</small></span>
    </div>
    ${e.pronto
      ? `<button class="btn primario largo" data-acao="jornada-resgatar">Resgatar ${textoPremio(p.premio)}</button>`
      : `<button class="btn secundario largo" data-acao="jornada-ir">Fazer agora · prêmio ${textoPremio(p.premio)}</button>`}
  </section>`;
}

// -------------------------------------------------------------
// Resumo de ontem
// -------------------------------------------------------------

/** Deve mostrar o resumo de ontem agora? (1x por dia, só se ontem teve algo) */
export function deveMostrarResumo(d = dados()) {
  const hoje = hojeKey();
  if (!d.meta.onboardingFeito || d.meta.resumoVisto === hoje) return false;
  const ontem = somarDias(hoje, -1);
  if (ontem < d.criadoEm) return false;
  const r = resumoRotina(ontem);
  return r.total > 0 || xpDoDia(ontem) > 0;
}

/** Conteúdo do resumo de ontem. */
export function resumoDeOntemHTML() {
  const d = dados();
  const ontem = somarDias(hojeKey(), -1);
  const r = resumoRotina(ontem);
  const reg = lerDia(ontem) || {};
  const xp = xpDoDia(ontem);
  const seq = sequenciaRotina();
  const pct = r.total ? Math.round((r.feitos / r.total) * 100) : 0;
  const nomePet = d.pet.nome || 'Seu pet';
  let titulo;
  let frase;
  if (r.total && r.feitos >= r.total) {
    titulo = 'Dia perfeito! 🌟';
    frase = seq > 1 ? `Sua sequência está em ${seq} dias. Não deixe ela cair hoje!` : 'Você começou uma sequência. Repita hoje para ela crescer!';
  } else if (r.protegido) {
    titulo = 'Seu escudo te salvou 🛡️';
    frase = 'A sequência continua, mas o escudo foi usado. Hoje não tem segunda chance!';
  } else if (r.feitos > 0) {
    titulo = 'Quase lá! 💪';
    frase = `Faltaram ${r.total - r.feitos} hábito(s) para fechar o dia. Hoje dá!`;
  } else if (r.total) {
    titulo = 'Ontem passou em branco 😶';
    frase = `${nomePet} sentiu sua falta e ficou mais fraco. Um hábito hoje já faz diferença.`;
  } else {
    titulo = 'Bom dia! ☀️';
    frase = 'Mais um dia para evoluir.';
  }
  return `<div class="resumo-ontem">
      <h3>${titulo}</h3>
      <div class="resumo-numeros">
        <div><b>${r.total ? `${r.feitos}/${r.total}` : '—'}</b><small>hábitos${r.total ? ` · ${pct}%` : ''}</small></div>
        <div><b>+${formatarNumero(xp)}</b><small>XP</small></div>
        <div><b>🔥 ${seq}</b><small>sequência</small></div>
      </div>
      ${reg.missoes ? `<p class="dica">🎯 Desafios do dia resgatados: <b>${Object.keys(reg.missoes.resgatadas || {}).length}/${(reg.missoes.lista || []).length}</b></p>` : ''}
      <p class="resumo-frase">${esc(frase)}</p>
      <button class="btn primario largo" data-fechar-resumo>Bora pra hoje! 🚀</button>
    </div>`;
}
