// =============================================================
// desafios.js — DESAFIOS SEMANAIS e DNA mutante 🧬 (v5).
//
// • Toda segunda-feira são sorteados 4 desafios para a semana, conforme o
//   que você usa (rotina, treinos, pendências, água, pet...). Eles são mais
//   difíceis que os desafios diários (missoes.js) e pagam muito mais:
//   XP, moedas e DNA 🧬.
// • Resgatou os 4? Ganha o BAÚ DA SEMANA (moedas, DNA e, a cada semana
//   completa, avança nos itens exclusivos de visual).
// • DNA 🧬 é a moeda das mutações do pet (veja pet.js / mutacao.js).
//   Também se ganha DNA a cada 3 dias com o pet bem cuidado.
// =============================================================

import { dados, salvar } from './store.js';
import { hojeKey, somarDias, diasDaSemana, inicioSemana, aleatorioComSemente, diferencaDias, emitir } from './utils.js';
import { lerDia, resumoRotina } from './historico.js';
import { ganharXP, ganharMoedas, xpDoDia } from './xp.js';

/** Dias da semana atual até hoje (segunda .. hoje). */
function diasAteHoje() {
  const hoje = hojeKey();
  return diasDaSemana(hoje).filter((k) => k <= hoje);
}
const contarDias = (fn) => diasAteHoje().filter((k) => fn(k, lerDia(k))).length;
const somarDiasCom = (fn) => diasAteHoje().reduce((s, k) => s + (fn(k, lerDia(k)) || 0), 0);
const xpSemana = () => diasAteHoje().reduce((s, k) => s + xpDoDia(k), 0);

/** Rotina 100% num dia (só conta dias com itens programados). */
const rotina100 = (k) => {
  const r = resumoRotina(k);
  return r.total > 0 && r.feitos >= r.total;
};

/**
 * Catálogo dos desafios semanais.
 *  pode(d) -> faz sentido sortear nesta semana?
 *  alvo(d) -> meta
 *  progresso(d) -> quanto já foi feito na semana
 *  grupo -> no máximo 1 desafio de cada grupo por semana
 */
const CATALOGO = {
  'rotina-100': {
    grupo: 'rotina', icone: '🌟', xp: 200, moedas: 70, dna: 2,
    texto: (a) => `Feche a rotina 100% em ${a} dias`,
    pode: (d) => d.rotina.length >= 2,
    alvo: () => 5,
    progresso: () => contarDias(rotina100),
  },
  'no-horario': {
    grupo: 'rotina', icone: '⏱️', xp: 160, moedas: 60, dna: 1,
    texto: (a) => `Cumpra ${a} hábitos dentro do horário`,
    pode: (d) => d.rotina.filter((i) => i.horario).length >= 2,
    alvo: (d) => Math.min(20, d.rotina.filter((i) => i.horario).length * 4),
    progresso: () => somarDiasCom((k, reg) => (reg ? Object.values(reg.rotina || {}).filter((x) => x.fator === 1 && x.comHorario).length : 0)),
  },
  treinos: {
    grupo: 'treino', icone: '🏋️', xp: 180, moedas: 60, dna: 2,
    texto: (a) => `Finalize ${a} treinos na semana`,
    pode: (d) => d.treinos.fichas.length > 0,
    alvo: (d) => Math.max(2, Math.min(5, d.ajustes.metaTreinosSemana || 3)),
    progresso: (d) => {
      const dias = diasAteHoje();
      return d.treinos.sessoes.filter((s) => dias.includes(s.dia)).length;
    },
  },
  pendencias: {
    grupo: 'pend', icone: '📌', xp: 150, moedas: 50, dna: 1,
    texto: (a) => `Conclua ${a} pendências`,
    pode: (d) => d.pendencias.filter((p) => !p.concluidaEm).length >= 3,
    alvo: (d) => Math.min(8, Math.max(3, Math.ceil(d.pendencias.filter((p) => !p.concluidaEm).length * 0.6))),
    progresso: (d) => {
      const dias = diasAteHoje();
      return d.pendencias.filter((p) => p.concluidaDia && dias.includes(p.concluidaDia)).length;
    },
  },
  agua: {
    grupo: 'saude', icone: '💧', xp: 140, moedas: 50, dna: 1,
    texto: (a) => `Bata a meta de água em ${a} dias`,
    pode: () => true,
    alvo: () => 5,
    progresso: (d) => contarDias((k, reg) => reg && (reg.agua || 0) >= d.ajustes.metaAgua),
  },
  carinho: {
    grupo: 'pet', icone: '🐾', xp: 120, moedas: 40, dna: 2,
    texto: (a) => `Faça carinho no pet em ${a} dias`,
    pode: (d) => d.meta.onboardingFeito,
    alvo: () => 6,
    progresso: () => contarDias((k, reg) => reg && reg.carinho),
  },
  banho: {
    grupo: 'pet', icone: '🛁', xp: 120, moedas: 40, dna: 2,
    texto: (a) => `Dê banho no pet em ${a} dias`,
    pode: (d) => d.meta.onboardingFeito,
    alvo: () => 4,
    progresso: () => contarDias((k, reg) => reg && reg.banho),
  },
  missoes: {
    grupo: 'jogo', icone: '🎯', xp: 160, moedas: 60, dna: 1,
    texto: (a) => `Resgate ${a} desafios diários`,
    pode: (d) => d.meta.onboardingFeito,
    alvo: () => 15,
    progresso: () => somarDiasCom((k, reg) => (reg && reg.missoes ? Object.keys(reg.missoes.resgatadas || {}).length : 0)),
  },
  bau: {
    grupo: 'jogo', icone: '🎁', xp: 100, moedas: 50, dna: 1,
    texto: (a) => `Abra o baú diário em ${a} dias`,
    pode: () => true,
    alvo: () => 6,
    progresso: () => contarDias((k, reg) => reg && reg.bau),
  },
  xp: {
    grupo: 'xp', icone: '⚡', xp: 150, moedas: 60, dna: 2,
    texto: (a) => `Ganhe ${a.toLocaleString('pt-BR')} XP nesta semana`,
    pode: () => true,
    // um pouco acima da semana passada (mínimo 800): sempre exige esforço
    alvo: () => {
      const passada = diasDaSemana(somarDias(hojeKey(), -7)).reduce((s, k) => s + xpDoDia(k), 0);
      return Math.max(800, Math.round((passada * 1.15) / 50) * 50);
    },
    progresso: () => xpSemana(),
  },
};

/** Garante o sorteio da semana atual e devolve o estado. */
function estadoSemana() {
  const d = dados();
  const semana = inicioSemana(hojeKey());
  if (!d.desafios || d.desafios.semana !== semana) {
    const rnd = aleatorioComSemente('desafios' + semana);
    const possiveis = Object.keys(CATALOGO).filter((k) => {
      try {
        return CATALOGO[k].pode(d);
      } catch (_) {
        return false;
      }
    });
    const escolhidos = [];
    const grupos = new Set();
    // começa por um de rotina, se houver
    const rot = possiveis.filter((k) => CATALOGO[k].grupo === 'rotina');
    if (rot.length) {
      const k = rot[Math.floor(rnd() * rot.length)];
      escolhidos.push(k);
      grupos.add('rotina');
    }
    const resto = possiveis.filter((k) => !grupos.has(CATALOGO[k].grupo));
    while (escolhidos.length < 4 && resto.length) {
      const k = resto.splice(Math.floor(rnd() * resto.length), 1)[0];
      if (grupos.has(CATALOGO[k].grupo)) continue;
      grupos.add(CATALOGO[k].grupo);
      escolhidos.push(k);
    }
    d.desafios = {
      semana,
      lista: escolhidos.map((tipo) => {
        const c = CATALOGO[tipo];
        const alvo = Math.max(1, c.alvo(d));
        return { tipo, alvo, texto: c.texto(alvo), icone: c.icone, xp: c.xp, moedas: c.moedas, dna: c.dna };
      }),
      resgatados: {},
      bonus: false,
    };
    salvar({ silencioso: true });
  }
  return d.desafios;
}

/** Desafios da semana com o progresso atual. */
export function desafiosDaSemana() {
  const d = dados();
  if (!d.meta.onboardingFeito) return [];
  const est = estadoSemana();
  return est.lista.map((m) => {
    let prog = 0;
    try {
      prog = CATALOGO[m.tipo] ? CATALOGO[m.tipo].progresso(d) : 0;
    } catch (_) {}
    const resgatado = !!est.resgatados[m.tipo];
    return { ...m, progresso: Math.min(prog, m.alvo), completa: prog >= m.alvo, resgatada: resgatado };
  });
}

/** Quantos dias faltam para os desafios semanais renovarem. */
export function diasParaRenovar() {
  const hoje = hojeKey();
  return diferencaDias(hoje, somarDias(inicioSemana(hoje), 7));
}

export function desafiosParaResgatar() {
  return desafiosDaSemana().filter((m) => m.completa && !m.resgatada).length;
}

/** Resgata um desafio semanal. Retorna {xp, moedas, dna, bonus} ou null. */
export function resgatarDesafio(tipo) {
  const d = dados();
  const est = estadoSemana();
  const m = desafiosDaSemana().find((x) => x.tipo === tipo);
  if (!m || !m.completa || m.resgatada) return null;
  const l = ganharXP({ base: m.xp, fonte: 'desafio', ref: tipo, rotulo: `Desafio semanal: ${m.texto}`, multiplicar: false });
  ganharMoedas(m.moedas, 'desafio');
  ganharDNA(m.dna);
  est.resgatados[tipo] = l.id;
  d.stats.desafiosSemanais = (d.stats.desafiosSemanais || 0) + 1;
  let bonus = null;
  if (!est.bonus && desafiosDaSemana().every((x) => x.resgatada)) {
    est.bonus = true;
    d.stats.semanasCompletas = (d.stats.semanasCompletas || 0) + 1;
    const lb = ganharXP({ base: 250, fonte: 'desafio', ref: 'bonus-semana', rotulo: 'Todos os desafios da semana', multiplicar: false });
    ganharMoedas(150, 'desafio');
    ganharDNA(3);
    let escudo = false;
    if (d.carteira.escudos < 2) {
      d.carteira.escudos++;
      escudo = true;
    }
    bonus = { xp: lb.xp, moedas: 150, dna: 3, escudo, semanas: d.stats.semanasCompletas };
  }
  return { xp: l.xp, moedas: m.moedas, dna: m.dna, bonus };
}

// -------------------------------------------------------------
// DNA mutante 🧬
// -------------------------------------------------------------

export function ganharDNA(qtd) {
  if (!qtd) return;
  const c = dados().carteira;
  c.dna = (c.dna || 0) + qtd;
  emitir('dna', qtd);
}

export function gastarDNA(qtd) {
  const c = dados().carteira;
  if ((c.dna || 0) < qtd) return false;
  c.dna -= qtd;
  return true;
}
