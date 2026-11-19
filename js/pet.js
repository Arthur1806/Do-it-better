// =============================================================
// pet.js — as NECESSIDADES do pet. Ele vive da sua disciplina:
//   🍖 Comida   — cai com o tempo (~30 por dia). Ração custa moedas.
//   💧 Água     — cai com o tempo (~40 por dia). Água custa moedas.
//   💪 Força    — sobe a cada hábito/treino cumprido; cai em dias falhados
//                 e quando ele passa fome ou sede.
//   🧼 Limpeza  — cai todo dia; banho e dias perfeitos recuperam.
//   😊 Alegria  — carinho e brinquedos; cai quando você some.
//
// A ECONOMIA: moedas vêm da rotina, das missões e do baú. Quem abandona a
// rotina para de ganhar moedas — e sem moedas não compra comida nem água,
// então o pet fica com fome, sede, fraco, sujo e triste (ele nunca morre).
// Pet bem cuidado (tudo ≥ 60) dá +5% de XP em tudo.
// Este módulo não depende de outros módulos do jogo (só dos dados).
// =============================================================

import { dados } from './store.js';
import { hojeKey } from './utils.js';

const lim = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
const inteiro = (v) => Math.round(v);

/** Quanto cada necessidade cai por hora. */
const QUEDA_POR_HORA = { comida: 30 / 24, agua: 40 / 24 };

/** Itens do pet (comprados com moedas, guardados na mochila). */
export const ITENS_PET = {
  agua: { emoji: '💧', nome: 'Água fresca', efeito: { agua: 45 }, preco: 5, basico: true },
  comida: { emoji: '🍖', nome: 'Ração', efeito: { comida: 40 }, preco: 12, basico: true },
  racao: { emoji: '🥩', nome: 'Ração premium', efeito: { comida: 80, forca: 15 }, preco: 40 },
  petisco: { emoji: '🍪', nome: 'Petisco', efeito: { comida: 10, alegria: 25 }, preco: 25 },
  brinquedo: { emoji: '🧸', nome: 'Brinquedo', efeito: { alegria: 40 }, preco: 50 },
  sabonete: { emoji: '🧴', nome: 'Sabonete cheiroso', efeito: { limpeza: 60 }, preco: 30 },
  kit: { emoji: '🩹', nome: 'Kit veterinário', efeito: { forca: 70, limpeza: 70, alegria: 70, comida: 70, agua: 70, minimo: true }, preco: 200 },
};

export const NECESSIDADES = [
  { id: 'comida', emoji: '🍖', nome: 'Comida' },
  { id: 'agua', emoji: '💧', nome: 'Água' },
  { id: 'forca', emoji: '💪', nome: 'Força' },
  { id: 'limpeza', emoji: '🧼', nome: 'Limpeza' },
  { id: 'alegria', emoji: '😊', nome: 'Alegria' },
];

/** Valor arredondado de uma necessidade (para mostrar). */
export const valor = (k, p = dados().pet) => inteiro(p[k] ?? 0);

/**
 * Atualiza fome e sede pelo tempo que passou. Retorna true se algo mudou.
 * Chamado ao abrir o app, ao voltar para ele e a cada minuto.
 */
export function atualizarPet(agora = Date.now()) {
  const d = dados();
  const p = d.pet;
  if (!p || !d.meta.onboardingFeito) return false;
  if (!p.atualizadoEm) {
    p.atualizadoEm = agora;
    return false;
  }
  const horas = Math.min(24 * 30, (agora - p.atualizadoEm) / 3600000);
  if (horas < 0.05) return false; // menos de 3 minutos
  const antes = JSON.stringify([valor('comida'), valor('agua'), valor('forca'), valor('alegria'), p.mutacao || 0]);
  p.comida = lim((p.comida ?? 80) - QUEDA_POR_HORA.comida * horas);
  p.agua = lim((p.agua ?? 80) - QUEDA_POR_HORA.agua * horas);
  // passar fome ou sede enfraquece e entristece
  const carencia = (p.comida < 15 ? 1 : 0) + (p.agua < 15 ? 1 : 0);
  if (carencia) {
    p.forca = lim(p.forca - 0.9 * carencia * horas);
    p.alegria = lim(p.alegria - 0.6 * carencia * horas);
  }
  // CASTIGO (v5): comida OU água chegaram a zero → perde um estágio de mutação.
  // Depois disso só pode perder outro quando voltar a ser alimentado (> 30).
  if ((p.mutacao || 0) > 0 && !p.travaPerda && (p.comida <= 0.5 || p.agua <= 0.5)) {
    p.mutacao--;
    p.travaPerda = true;
    p.perdeuMutacaoEm = agora;
  }
  if (p.travaPerda && p.comida > 30 && p.agua > 30) p.travaPerda = false;
  p.atualizadoEm = agora;
  return antes !== JSON.stringify([valor('comida'), valor('agua'), valor('forca'), valor('alegria'), p.mutacao || 0]);
}

/** Estado atual (flags usadas no desenho e nas falas). */
export function estadoPet(p = dados().pet) {
  if (!p) return {};
  const h = new Date().getHours();
  const faminto = (p.comida ?? 80) < 30;
  const sede = (p.agua ?? 80) < 30;
  const sujo = p.limpeza < 40;
  const fraco = p.forca < 35;
  const triste = p.alegria < 35;
  return {
    faminto,
    sede,
    sujo,
    fraco,
    triste,
    doente: p.forca < 15,
    dormindo: h < 6 && !fraco && !faminto && !sede,
    radiante: NECESSIDADES.every((n) => (p[n.id] ?? 80) >= 75),
  };
}

/** O pet precisa de alguma coisa? */
export function precisaDeAtencao() {
  const e = estadoPet();
  return e.faminto || e.sede || e.fraco || e.sujo || e.triste;
}

/** Bônus de XP do pet bem cuidado (em %). */
export function bonusPet() {
  const p = dados().pet;
  if (!p || !dados().meta.onboardingFeito) return 0;
  return NECESSIDADES.every((n) => (p[n.id] ?? 80) >= 60) ? 5 : 0;
}

/** Resumo em texto do estado do pet. */
export function descricaoEstado(nome) {
  const e = estadoPet();
  const moedas = dados().carteira.moedas;
  const semDinheiro = moedas < ITENS_PET.agua.preco;
  if ((e.faminto || e.sede) && semDinheiro) return `${nome} está com ${e.faminto ? 'fome' : 'sede'} e você está sem moedas! Cumpra a rotina e os desafios para ganhar.`;
  if (e.faminto && e.sede) return `${nome} está com fome e sede. Compre ração e água (🪙 ${ITENS_PET.comida.preco + ITENS_PET.agua.preco}).`;
  if (e.faminto) return `${nome} está com fome. Uma ração custa 🪙 ${ITENS_PET.comida.preco}.`;
  if (e.sede) return `${nome} está com sede. Água custa 🪙 ${ITENS_PET.agua.preco}.`;
  if (e.doente) return `${nome} está muito fraco. Volte à rotina hoje para ele se recuperar!`;
  if (e.fraco) return `${nome} está fraco. Cada hábito cumprido devolve força.`;
  if (e.sujo) return `${nome} está sujo. Cumpra 1 hábito hoje e dê um banho.`;
  if (e.triste) return `${nome} está tristinho. Um carinho ou brinquedo ajudam.`;
  if (bonusPet()) return `${nome} está ótimo! Bônus de +5% XP ativo. 🐾`;
  return `${nome} está bem. Deixe tudo acima de 60 para ganhar +5% de XP.`;
}

/** Custo diário médio para manter o pet alimentado (em moedas). */
export function custoDiario() {
  return Math.round((30 / ITENS_PET.comida.efeito.comida) * ITENS_PET.comida.preco + (40 / ITENS_PET.agua.efeito.agua) * ITENS_PET.agua.preco);
}

function aplicar(efeito) {
  const p = dados().pet;
  for (const n of NECESSIDADES) {
    const k = n.id;
    if (efeito[k] === undefined) continue;
    p[k] = efeito.minimo ? lim(Math.max(p[k] ?? 0, efeito[k])) : lim((p[k] ?? 0) + efeito[k]);
  }
}

// -------------------------------------------------------------
// O que a sua rotina faz com o pet
// -------------------------------------------------------------

const GANHO = { rotina: { forca: 4, alegria: 2 }, check: { forca: 3, alegria: 2 }, pendencia: { forca: 3 }, treino: { forca: 12, alegria: 5 }, 'bonus-rotina': { forca: 6, limpeza: 8, alegria: 8 }, agua: { forca: 3 } };

/** Atividade cumprida -> pet mais forte. */
export function aoGanharXP(lanc) {
  const g = GANHO[lanc.fonte];
  if (g && dados().pet) aplicar(g);
}
/** Desfez a atividade -> devolve o ganho (para não ganhar força de graça). */
export function aoPerderXP(lanc) {
  const g = GANHO[lanc.fonte];
  if (!g || !dados().pet) return;
  const inverso = {};
  for (const k of Object.keys(g)) inverso[k] = -g[k];
  aplicar(inverso);
}

/**
 * Virada do dia: como foi o dia que terminou.
 * status: 'cumprido' | 'parcial' | 'falhou' | 'neutro' | 'protegido'
 */
export function fecharDiaDoPet(status) {
  const p = dados().pet;
  if (!p || !dados().meta.onboardingFeito) return;
  const efeitos = {
    cumprido: { forca: 0, limpeza: -6, alegria: 4 },
    parcial: { forca: -10, limpeza: -12, alegria: -6 },
    protegido: { forca: -10, limpeza: -12, alegria: -6 },
    falhou: { forca: -22, limpeza: -20, alegria: -15 },
    neutro: { forca: -3, limpeza: -8, alegria: -4 },
  };
  // pet bem cuidado no fim do dia (tudo ≥ 70): a cada 3 dias, +1 DNA 🧬
  const bemCuidado = NECESSIDADES.every((n) => (p[n.id] ?? 0) >= 70);
  p.diasBemCuidado = bemCuidado ? (p.diasBemCuidado || 0) + 1 : 0;
  if (bemCuidado && p.diasBemCuidado % 3 === 0) dados().carteira.dna = (dados().carteira.dna || 0) + 1;
  aplicar(efeitos[status] || efeitos.neutro);
  p.diasSemCuidado = status === 'falhou' ? (p.diasSemCuidado || 0) + 1 : 0;
}

// -------------------------------------------------------------
// Ações de cuidado
// -------------------------------------------------------------

/** Dá para dar banho de graça hoje? (1x por dia, depois de cumprir 1 hábito) */
export function podeBanho() {
  const d = dados();
  const reg = d.diario[hojeKey()];
  const fezAlgo = reg && (Object.keys(reg.rotina || {}).length > 0 || Object.keys(reg.checks || {}).length > 0);
  return { ok: !!fezAlgo && !(reg && reg.banho), jaDeu: !!(reg && reg.banho), fezAlgo: !!fezAlgo };
}

/**
 * Executa uma ação. Retorna { ok, msg }.
 * 'carinho' (1x/dia, +moedas), 'banho' (1x/dia grátis), ou um item.
 * Se o item não estiver na mochila, compra na hora (se houver moedas).
 */
export function cuidar(acao) {
  const d = dados();
  const p = d.pet;
  const reg = (d.diario[hojeKey()] ||= { rotina: {}, checks: {}, agua: 0, aguaLanc: null, bonusRotina: null, resumo: null });
  if (acao === 'carinho') {
    if (reg.carinho) {
      aplicar({ alegria: 2 });
      return { ok: true, msg: `${p.nome} adorou! (as moedas do carinho são 1x por dia)` };
    }
    reg.carinho = true;
    aplicar({ alegria: 15 });
    d.carteira.moedas += 5;
    return { ok: true, msg: `${p.nome} ficou feliz com o carinho! +5 🪙`, moeda: true };
  }
  if (acao === 'banho') {
    const b = podeBanho();
    if (b.jaDeu) return { ok: false, msg: 'Já tomou banho hoje. Use um sabonete para outro.' };
    if (!b.fezAlgo) return { ok: false, msg: 'Cumpra pelo menos 1 hábito hoje para liberar o banho grátis. 🛁' };
    reg.banho = true;
    aplicar({ limpeza: 50, alegria: 5 });
    return { ok: true, msg: `${p.nome} está limpinho! ✨` };
  }
  const item = ITENS_PET[acao];
  if (!item) return { ok: false, msg: 'Ação desconhecida.' };
  const inv = d.carteira.inventario;
  let comprou = false;
  if (!(inv[acao] > 0)) {
    if (d.carteira.moedas < item.preco) {
      return { ok: false, semMoedas: true, msg: `Sem moedas para ${item.nome} (🪙 ${item.preco}). Cumpra a rotina e os desafios para ganhar mais!` };
    }
    d.carteira.moedas -= item.preco;
    comprou = true;
  } else {
    inv[acao]--;
  }
  aplicar(item.efeito);
  if (['comida', 'agua', 'racao', 'petisco'].includes(acao)) d.stats.alimentou = (d.stats.alimentou || 0) + 1;
  return { ok: true, msg: `${item.emoji} ${p.nome} recebeu ${item.nome}!${comprou ? ` (−${item.preco} 🪙)` : ''}` };
}
