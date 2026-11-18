// =============================================================
// historico.js — o "relógio" do jogo.
// • Registro de cada dia (diario) e virada do dia à meia-noite.
// • Cálculo de quais itens valem em cada dia, resumo e status do dia.
// • Sequências (dias seguidos) e multiplicador de XP.
// Este módulo só faz cálculos e não dá XP (isso é no xp.js).
// =============================================================

import { dados } from './store.js';
import { hojeKey, somarDias, diaSemana, diasDaSemana, horaAtual } from './utils.js';
import { fecharDiaDoPet } from './pet.js';

/** Registro do dia (cria se não existir). */
export function registroDia(dia) {
  const d = dados();
  if (!d.diario[dia]) {
    d.diario[dia] = { rotina: {}, checks: {}, agua: 0, aguaLanc: null, bonusRotina: null, resumo: null };
  }
  const r = d.diario[dia];
  r.rotina ||= {};
  r.checks ||= {};
  return r;
}

/** Registro do dia somente leitura (pode ser null). */
export function lerDia(dia) {
  return dados().diario[dia] || null;
}

/**
 * Um item (de rotina ou bloco de check) vale no dia?
 * - não vale antes de ter sido criado
 * - dias = null/[] significa "todo dia"; senão, lista de 0..6 (0 = domingo)
 */
export function valeNoDia(item, dia) {
  if (item.criadoEm && dia < item.criadoEm) return false;
  if (Array.isArray(item.dias) && item.dias.length > 0 && !item.dias.includes(diaSemana(dia))) return false;
  return true;
}

/** Itens da rotina que valem no dia. */
export function itensRotinaDoDia(dia) {
  return dados().rotina.filter((i) => valeNoDia(i, dia));
}

/** Calcula o resumo da rotina do dia a partir dos dados atuais. */
export function calcularResumo(dia) {
  const reg = lerDia(dia);
  const itens = itensRotinaDoDia(dia);
  const feitos = itens.filter((i) => reg && reg.rotina && reg.rotina[i.id]).length;
  return { total: itens.length, feitos };
}

/**
 * Resumo da rotina { total, feitos }.
 * Dias passados usam o resumo "congelado" na virada do dia
 * (assim editar a rotina hoje não muda o seu passado).
 */
export function resumoRotina(dia) {
  const d = dados();
  const hoje = hojeKey();
  if (dia < d.criadoEm) return { total: 0, feitos: 0 };
  const reg = lerDia(dia);
  if (dia < hoje && reg && reg.resumo) return reg.resumo;
  if (dia > hoje) return { total: itensRotinaDoDia(dia).length, feitos: 0 };
  return calcularResumo(dia);
}

/** Rotina de hoje 100% (e com pelo menos 1 item)? */
export function rotinaCompleta(dia = hojeKey()) {
  const r = resumoRotina(dia);
  return r.total > 0 && r.feitos >= r.total;
}

/**
 * Status do dia para o calendário:
 * 'futuro' | 'pre' (antes de instalar) | 'neutro' (sem itens) |
 * 'cumprido' | 'parcial' | 'falhou' | 'hoje' (em andamento)
 */
export function statusDia(dia) {
  const hoje = hojeKey();
  if (dia > hoje) return 'futuro';
  if (dia < dados().criadoEm) return 'pre';
  const r = resumoRotina(dia);
  if (r.total === 0) return 'neutro';
  if (r.protegido) return 'protegido';
  if (r.feitos >= r.total) return 'cumprido';
  if (dia === hoje) return 'hoje';
  return r.feitos > 0 ? 'parcial' : 'falhou';
}

/**
 * Sequência de dias seguidos com a rotina 100% cumprida.
 * Dias sem nenhum item programado não contam nem quebram a sequência.
 * Hoje só entra na conta se já estiver completo (não quebra antes da meia-noite).
 * @param {boolean} ateOntem true = ignora o dia de hoje
 */
export function sequenciaRotina(ateOntem = false) {
  const d = dados();
  const hoje = hojeKey();
  let n = 0;
  let dia = somarDias(hoje, -1);
  let guarda = 0;
  while (dia >= d.criadoEm && guarda++ < 4000) {
    const r = resumoRotina(dia);
    // dia protegido por escudo: não conta, mas também não quebra a sequência
    if (r.total > 0 && !r.protegido) {
      if (r.feitos >= r.total) n++;
      else break;
    }
    dia = somarDias(dia, -1);
  }
  if (!ateOntem && rotinaCompleta(hoje)) n++;
  return n;
}

/**
 * Multiplicador de sequência, em porcentagem inteira (0, 10, 20 ... 50).
 * A cada 7 dias seguidos de rotina 100% = +10%, máximo +50%.
 * Usa a sequência ATÉ ONTEM, para o valor não mudar no meio do dia.
 */
export function multiplicador() {
  const seq = sequenciaRotina(true);
  return Math.min(Math.floor(seq / 7) * 10, 50);
}

/** Bloco de check foi feito no dia? Retorna o registro {lanc, ts} ou null. */
export function checkFeito(check, dia = hojeKey()) {
  const reg = lerDia(dia);
  return (reg && reg.checks && reg.checks[check.id]) || null;
}

/** Sequência própria de um bloco de check (ex.: "12 dias seguidos"). */
export function sequenciaCheck(check) {
  const hoje = hojeKey();
  let n = 0;
  let dia = somarDias(hoje, -1);
  const ini = check.criadoEm || dados().criadoEm;
  let guarda = 0;
  while (dia >= ini && guarda++ < 4000) {
    if (valeNoDia(check, dia)) {
      if (checkFeito(check, dia)) n++;
      else break;
    }
    dia = somarDias(dia, -1);
  }
  if (valeNoDia(check, hoje) && checkFeito(check, hoje)) n++;
  return n;
}

/** Atualiza os recordes de sequência (rotina e checks). */
export function atualizarMelhoresSequencias() {
  const d = dados();
  const s = sequenciaRotina();
  if (s > (d.stats.melhorSequencia || 0)) d.stats.melhorSequencia = s;
  d.checks.forEach((c) => {
    const sc = sequenciaCheck(c);
    if (sc > (c.melhorSequencia || 0)) c.melhorSequencia = sc;
  });
}

/**
 * VIRADA DO DIA. Fecha todos os dias entre o último dia aberto e ontem:
 * congela o resumo de cada um no histórico. Os checks "reiniciam" porque
 * o dia novo começa com um registro vazio.
 * Retorna true se algum dia foi fechado.
 */
export function fecharDias() {
  const d = dados();
  const hoje = hojeKey();
  let dia = d.meta.ultimoDia || hoje;
  if (dia >= hoje) {
    d.meta.ultimoDia = hoje;
    return false;
  }
  if (dia < d.criadoEm) dia = d.criadoEm;
  let guarda = 0;
  const protegidos = [];
  while (dia < hoje && guarda++ < 4000) {
    const reg = registroDia(dia);
    if (!reg.resumo) {
      reg.resumo = calcularResumo(dia);
      // o pet sente como foi o seu dia (ver pet.js)
      const st = reg.resumo.total === 0 ? 'neutro' : reg.resumo.feitos >= reg.resumo.total ? 'cumprido' : reg.resumo.feitos > 0 ? 'parcial' : 'falhou';
      fecharDiaDoPet(st);
      // ESCUDO DE SEQUÊNCIA: um dia falhado é protegido se houver escudo
      // e se havia uma sequência para proteger.
      const r = reg.resumo;
      if (r.total > 0 && r.feitos < r.total && d.carteira && d.carteira.escudos > 0 && sequenciaAte(dia) > 0) {
        d.carteira.escudos--;
        r.protegido = true;
        protegidos.push(dia);
      }
    }
    dia = somarDias(dia, 1);
  }
  d.meta.ultimoDia = hoje;
  d.meta.diasProtegidos = protegidos; // o app avisa ao abrir
  atualizarMelhoresSequencias();
  return true;
}

/** Sequência que existia ANTES do dia informado (usada pelo escudo). */
function sequenciaAte(diaFalho) {
  const d = dados();
  let n = 0;
  let dia = somarDias(diaFalho, -1);
  let guarda = 0;
  while (dia >= d.criadoEm && guarda++ < 4000) {
    const r = resumoRotina(dia);
    if (r.total > 0 && !r.protegido) {
      if (r.feitos >= r.total) n++;
      else break;
    }
    dia = somarDias(dia, -1);
  }
  return n;
}

/** Status de cada dia da semana atual (segunda a domingo). */
export function semanaAtual() {
  return diasDaSemana(hojeKey()).map((dia) => ({ dia, status: statusDia(dia) }));
}

// -------------------------------------------------------------
// HORÁRIOS: cada atividade pode ter um horário limite.
// Até o horário vale 100% do XP; depois, vai diminuindo:
//   até 1h depois: 75% · até 3h depois: 50% · mais que isso: 25%
// A ampulheta da loja dá +1h de folga em todos os horários do dia.
// -------------------------------------------------------------

export const FAIXAS_HORARIO = [
  { ate: 0, fator: 1 },
  { ate: 60, fator: 0.75 },
  { ate: 180, fator: 0.5 },
  { ate: Infinity, fator: 0.25 },
];

const emMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

/** A ampulheta está ativa hoje? */
export function ampulhetaAtiva() {
  const c = dados().carteira;
  return !!c && c.ampulhetaDia === hojeKey();
}

/**
 * Quanto vale agora uma atividade com horário limite.
 * Retorna { fator, atraso (min), pct, noPrazo, falta (min até o limite) }
 */
export function fatorHorario(limite, agora = horaAtual()) {
  if (!limite) return { fator: 1, atraso: 0, pct: 100, noPrazo: true, falta: null };
  const folga = ampulhetaAtiva() ? 60 : 0;
  const atraso = emMinutos(agora) - (emMinutos(limite) + folga);
  const faixa = FAIXAS_HORARIO.find((f) => atraso <= f.ate);
  return { fator: faixa.fator, atraso: Math.max(0, atraso), pct: Math.round(faixa.fator * 100), noPrazo: atraso <= 0, falta: atraso <= 0 ? -atraso : 0 };
}

/** XP que a atividade vale agora (já com o horário). */
export function xpComHorario(base, limite) {
  return Math.max(1, Math.round(base * fatorHorario(limite).fator));
}

/** Texto curto do horário: "até 08:00", "faltam 20 min", "atrasado · 75%". */
export function textoHorario(limite) {
  if (!limite) return '';
  const f = fatorHorario(limite);
  if (f.noPrazo) {
    if (f.falta <= 60) return `⏰ faltam ${f.falta} min (até ${limite})`;
    return `⏰ até ${limite}`;
  }
  return `⚠️ atrasado · vale ${f.pct}%`;
}
