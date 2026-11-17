// =============================================================
// missoes.js — o "loop diário" do jogo:
// • MISSÕES DO DIA: 3 missões sorteadas por dia conforme o que você usa.
//   Concluiu? Toque para resgatar XP + moedas. As 3 resgatadas = baú bônus.
// • BAÚ DIÁRIO: uma recompensa surpresa por dia. Abrir em dias seguidos
//   aumenta a "Presença" e o valor do baú.
// • LIGAS: o XP da semana define sua liga (Bronze até Mestre).
// =============================================================

import { dados, salvar } from './store.js';
import { hojeKey, somarDias, diasDaSemana, inicioSemana, aleatorioComSemente, sortearComPeso, horaAtual } from './utils.js';
import { registroDia, lerDia, resumoRotina, valeNoDia } from './historico.js';
import { ganharXP, ganharMoedas, xpDoDia } from './xp.js';

// -------------------------------------------------------------
// Missões
// -------------------------------------------------------------

const abertas = (d) => d.pendencias.filter((p) => !p.concluidaEm);
const concluidasHoje = (d, filtro = () => true) => d.pendencias.filter((p) => p.concluidaDia === hojeKey() && filtro(p)).length;

/**
 * Catálogo de missões. Cada uma:
 *  pode(d)      -> faz sentido sortear hoje?
 *  alvo(d)      -> quantidade para concluir
 *  progresso(d) -> quanto já foi feito hoje
 */
const CATALOGO = {
  'rotina-n': {
    icone: '✅',
    texto: (a) => `Marque ${a} hábitos da rotina`,
    pode: (d) => resumoRotina(hojeKey()).total >= 2,
    alvo: (d) => Math.min(3, resumoRotina(hojeKey()).total),
    progresso: () => resumoRotina(hojeKey()).feitos,
  },
  'rotina-100': {
    icone: '🌟',
    texto: () => 'Complete 100% da rotina hoje',
    pode: () => resumoRotina(hojeKey()).total >= 1,
    alvo: () => 1,
    // progresso fracionado (ex.: 3 de 5 = 0,6) para a barrinha andar
    progresso: () => {
      const r = resumoRotina(hojeKey());
      return r.total > 0 ? r.feitos / r.total : 0;
    },
    xp: 40,
  },
  'cedo-2': {
    icone: '🌅',
    texto: () => 'Marque 2 hábitos antes das 10h',
    pode: (d) => resumoRotina(hojeKey()).total >= 2 && horaAtual() < '09:30',
    alvo: () => 2,
    progresso: () => {
      const reg = lerDia(hojeKey());
      if (!reg) return 0;
      return Object.values(reg.rotina).filter((x) => new Date(x.ts).getHours() < 10).length;
    },
  },
  'pend-1': {
    icone: '📌',
    texto: () => 'Conclua 1 pendência',
    pode: (d) => abertas(d).length >= 1,
    alvo: () => 1,
    progresso: (d) => concluidasHoje(d),
  },
  'pend-2': {
    icone: '🗂️',
    texto: () => 'Conclua 2 pendências',
    pode: (d) => abertas(d).length >= 3,
    alvo: () => 2,
    progresso: (d) => concluidasHoje(d),
    xp: 35,
  },
  'pend-alta': {
    icone: '🔺',
    texto: () => 'Resolva uma pendência de prioridade alta',
    pode: (d) => abertas(d).some((p) => p.prioridade === 'alta'),
    alvo: () => 1,
    progresso: (d) => concluidasHoje(d, (p) => p.prioridade === 'alta'),
    xp: 35,
  },
  agua: {
    icone: '💧',
    texto: (a) => `Beba ${a} copos de água`,
    pode: () => true,
    alvo: (d) => d.ajustes.metaAgua,
    progresso: () => {
      const reg = lerDia(hojeKey());
      return reg ? reg.agua || 0 : 0;
    },
  },
  treino: {
    icone: '🏋️',
    texto: () => 'Finalize um treino',
    pode: (d) => d.treinos.fichas.length > 0,
    alvo: () => 1,
    progresso: (d) => d.treinos.sessoes.filter((s) => s.dia === hojeKey()).length,
    xp: 40,
  },
  'check-prazo': {
    icone: '⏰',
    texto: () => 'Cumpra um desafio matinal dentro do prazo',
    pode: (d) => d.checks.some((c) => c.horaLimite && valeNoDia(c, hojeKey()) && horaAtual() < c.horaLimite),
    alvo: () => 1,
    progresso: (d) => {
      const reg = lerDia(hojeKey());
      if (!reg) return 0;
      return d.checks.filter((c) => c.horaLimite && reg.checks[c.id] && reg.checks[c.id].noPrazo).length;
    },
  },
  'xp-150': {
    icone: '⚡',
    texto: () => 'Ganhe 150 XP hoje',
    pode: () => true,
    alvo: () => 150,
    progresso: () => xpDoDia(hojeKey()),
    xp: 30,
  },
  nota: {
    icone: '🗒️',
    texto: () => 'Anote uma ideia nas notas rápidas',
    pode: () => true,
    alvo: () => 1,
    progresso: (d) => d.notas.filter((n) => new Date(n.criadaEm).toDateString() === new Date().toDateString()).length,
    xp: 15,
  },
};

/** Missões de hoje (sorteadas uma vez e guardadas no registro do dia). */
export function missoesDoDia() {
  const d = dados();
  const hoje = hojeKey();
  // Antes do questionário não há rotina/pendências: não sorteia ainda
  if (!d.meta.onboardingFeito) return [];
  const reg = registroDia(hoje);
  if (!reg.missoes) {
    const rnd = aleatorioComSemente('missoes' + hoje);
    const possiveis = Object.keys(CATALOGO).filter((k) => {
      try {
        return CATALOGO[k].pode(d);
      } catch (_) {
        return false;
      }
    });
    // Sempre uma de rotina (se houver rotina), depois sorteia o resto
    const escolhidas = [];
    const rotinas = possiveis.filter((k) => k.startsWith('rotina') || k === 'cedo-2');
    if (rotinas.length) escolhidas.push(rotinas[Math.floor(rnd() * rotinas.length)]);
    const resto = possiveis.filter((k) => !escolhidas.includes(k) && !(escolhidas[0] && (k.startsWith('rotina') || k === 'cedo-2')));
    while (escolhidas.length < 3 && resto.length) escolhidas.push(resto.splice(Math.floor(rnd() * resto.length), 1)[0]);
    reg.missoes = {
      lista: escolhidas.map((tipo) => {
        const c = CATALOGO[tipo];
        const alvo = Math.max(1, c.alvo(d));
        return { tipo, alvo, texto: c.texto(alvo), icone: c.icone, xp: c.xp || 25, moedas: 10 + Math.floor(rnd() * 3) * 5 };
      }),
      resgatadas: {},
      bonus: false,
    };
    salvar({ silencioso: true }); // guarda o sorteio do dia
  }
  return reg.missoes.lista.map((m) => {
    let prog = 0;
    try {
      prog = CATALOGO[m.tipo] ? CATALOGO[m.tipo].progresso(d) : 0;
    } catch (_) {}
    const resgatada = !!reg.missoes.resgatadas[m.tipo];
    return { ...m, progresso: Math.min(prog, m.alvo), completa: prog >= m.alvo, resgatada };
  });
}

/** Missões prontas para resgatar (para o aviso na barra de abas). */
export function missoesParaResgatar() {
  return missoesDoDia().filter((m) => m.completa && !m.resgatada).length;
}

/** Resgata a recompensa de uma missão. Retorna {xp, moedas, bonus} ou null. */
export function resgatarMissao(tipo) {
  const d = dados();
  const reg = registroDia(hojeKey());
  const m = missoesDoDia().find((x) => x.tipo === tipo);
  if (!m || !m.completa || m.resgatada) return null;
  const l = ganharXP({ base: m.xp, fonte: 'missao', ref: tipo, rotulo: `Missão: ${m.texto}`, multiplicar: false });
  ganharMoedas(m.moedas, 'missao');
  reg.missoes.resgatadas[tipo] = l.id;
  d.stats.missoesResgatadas = (d.stats.missoesResgatadas || 0) + 1;
  let bonus = null;
  if (!reg.missoes.bonus && missoesDoDia().every((x) => x.resgatada)) {
    reg.missoes.bonus = true;
    const lb = ganharXP({ base: 50, fonte: 'missao', ref: 'bonus', rotulo: 'Todas as missões do dia', multiplicar: false });
    ganharMoedas(30, 'missao');
    let escudo = false;
    if (Math.random() < 0.25 && d.carteira.escudos < 2) {
      d.carteira.escudos++;
      escudo = true;
    }
    bonus = { xp: lb.xp, moedas: 30, escudo };
  }
  return { xp: l.xp, moedas: m.moedas, bonus };
}

// -------------------------------------------------------------
// Baú diário
// -------------------------------------------------------------

/** O baú de hoje ainda não foi aberto? */
export function bauDisponivel() {
  const reg = lerDia(hojeKey());
  return !(reg && reg.bau);
}

/** Abre o baú do dia e devolve a recompensa sorteada. */
export function abrirBau() {
  const d = dados();
  const hoje = hojeKey();
  const reg = registroDia(hoje);
  if (reg.bau) return null;
  // Presença: dias seguidos abrindo o baú
  const ontem = somarDias(hoje, -1);
  d.stats.checkinSeq = d.stats.ultimoCheckin === ontem ? (d.stats.checkinSeq || 0) + 1 : 1;
  d.stats.ultimoCheckin = hoje;
  d.stats.melhorCheckin = Math.max(d.stats.melhorCheckin || 0, d.stats.checkinSeq);
  const fator = 1 + Math.min(d.stats.checkinSeq - 1, 7) * 0.15; // até +105% no 8º dia seguido

  const premio = sortearComPeso([
    { peso: 50, tipo: 'moedas', min: 10, max: 25 },
    { peso: 25, tipo: 'xp', min: 15, max: 40 },
    { peso: 12, tipo: 'moedas', min: 40, max: 70, raro: true },
    { peso: 8, tipo: 'escudo' },
    { peso: 5, tipo: 'pocao' },
  ]);
  let r;
  if (premio.tipo === 'escudo' && d.carteira.escudos >= 2) {
    r = { tipo: 'moedas', valor: Math.round(60 * fator), raro: true };
  } else if (premio.tipo === 'escudo') {
    d.carteira.escudos++;
    r = { tipo: 'escudo', valor: 1, raro: true };
  } else if (premio.tipo === 'pocao') {
    d.carteira.boostAte = Math.max(Date.now(), d.carteira.boostAte || 0) + 30 * 60 * 1000;
    r = { tipo: 'pocao', valor: 30, raro: true };
  } else {
    const v = Math.round((premio.min + Math.random() * (premio.max - premio.min)) * fator);
    r = { tipo: premio.tipo, valor: v, raro: !!premio.raro };
  }
  if (r.tipo === 'moedas') ganharMoedas(r.valor, 'bau');
  if (r.tipo === 'xp') ganharXP({ base: r.valor, fonte: 'bau', rotulo: 'Baú diário', multiplicar: false });
  reg.bau = r;
  return { ...r, presenca: d.stats.checkinSeq };
}

// -------------------------------------------------------------
// Ligas semanais (contra você mesmo: o XP da semana)
// -------------------------------------------------------------

export const LIGAS = [
  { i: 0, nome: 'Bronze', emoji: '🥉', min: 0 },
  { i: 1, nome: 'Prata', emoji: '🥈', min: 250 },
  { i: 2, nome: 'Ouro', emoji: '🥇', min: 600 },
  { i: 3, nome: 'Platina', emoji: '🏆', min: 1000 },
  { i: 4, nome: 'Diamante', emoji: '💎', min: 1600 },
  { i: 5, nome: 'Mestre', emoji: '👑', min: 2500 },
];

export function xpDaSemana(dia = hojeKey()) {
  return diasDaSemana(dia).reduce((s, k) => s + xpDoDia(k), 0);
}

/** Liga atual e quanto falta para a próxima. */
export function ligaAtual() {
  const xp = xpDaSemana();
  let liga = LIGAS[0];
  for (const l of LIGAS) if (xp >= l.min) liga = l;
  const prox = LIGAS[liga.i + 1] || null;
  return { ...liga, xp, proxima: prox, falta: prox ? prox.min - xp : 0, pct: prox ? (xp - liga.min) / (prox.min - liga.min) : 1 };
}

/** Atualiza a melhor liga alcançada (chamado sempre que os dados mudam). */
export function atualizarLiga() {
  const d = dados();
  const l = ligaAtual();
  if (l.i > (d.stats.melhorLiga || 0)) {
    d.stats.melhorLiga = l.i;
    return l;
  }
  return null;
}

/** Liga da semana passada (para comparação). */
export function ligaSemanaPassada() {
  const xp = xpDaSemana(inicioSemana(somarDias(hojeKey(), -7)));
  let liga = LIGAS[0];
  for (const l of LIGAS) if (xp >= l.min) liga = l;
  return { ...liga, xp };
}

/** Descarta as missões de hoje (se nenhuma foi resgatada) para sortear de novo
 *  com o conteúdo atual — usado ao terminar o questionário. */
export function ressortearMissoes() {
  const reg = dados().diario[hojeKey()];
  if (reg && reg.missoes && !Object.keys(reg.missoes.resgatadas).length) delete reg.missoes;
}
