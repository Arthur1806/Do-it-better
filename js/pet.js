// =============================================================
// pet.js — as NECESSIDADES do pet. Ele vive da sua disciplina:
//   💪 Força    — sobe a cada hábito/treino cumprido; cai em dias falhados
//   🧼 Limpeza  — cai um pouco todo dia; banho e dias perfeitos recuperam
//   😊 Alegria  — carinho, brinquedos e petiscos; cai quando você some
// Se você abandona a rotina, o pet fica FRACO, SUJO e TRISTE (nunca morre).
// Pet bem cuidado (tudo ≥ 70) dá +5% de XP em tudo.
// Este módulo não depende de outros módulos do jogo (só dos dados).
// =============================================================

import { dados } from './store.js';
import { hojeKey } from './utils.js';

const lim = (v) => Math.max(0, Math.min(100, Math.round(v)));

/** Itens de cuidado (comprados na loja, guardados no inventário). */
export const ITENS_PET = {
  petisco: { emoji: '🍖', nome: 'Petisco', efeito: { alegria: 25, forca: 10 }, preco: 30 },
  racao: { emoji: '🥩', nome: 'Ração premium', efeito: { forca: 40 }, preco: 80 },
  brinquedo: { emoji: '🧸', nome: 'Brinquedo', efeito: { alegria: 35 }, preco: 50 },
  sabonete: { emoji: '🧴', nome: 'Sabonete cheiroso', efeito: { limpeza: 60 }, preco: 60 },
  kit: { emoji: '🩹', nome: 'Kit de cuidados', efeito: { forca: 70, limpeza: 70, alegria: 70, minimo: true }, preco: 200 },
};

/** Estado atual (flags usadas no desenho e nas falas). */
export function estadoPet(p = dados().pet) {
  if (!p) return {};
  const h = new Date().getHours();
  const sujo = p.limpeza < 40;
  const fraco = p.forca < 35;
  const triste = p.alegria < 35;
  return {
    sujo,
    fraco,
    triste,
    doente: p.forca < 15,
    dormindo: h < 6 && !fraco,
    radiante: p.forca >= 75 && p.limpeza >= 75 && p.alegria >= 75,
  };
}

/** Bônus de XP do pet bem cuidado (em %). */
export function bonusPet() {
  const p = dados().pet;
  if (!p || !dados().meta.onboardingFeito) return 0;
  return p.forca >= 70 && p.limpeza >= 70 && p.alegria >= 70 ? 5 : 0;
}

/** Resumo em texto do estado do pet. */
export function descricaoEstado(nome) {
  const e = estadoPet();
  if (e.doente) return `${nome} está muito fraco. Volte à rotina hoje para ele se recuperar!`;
  if (e.fraco && e.sujo) return `${nome} está fraco e sujo. Cada hábito cumprido devolve força.`;
  if (e.fraco) return `${nome} está fraco. Cada hábito cumprido devolve força.`;
  if (e.sujo) return `${nome} está sujo. Cumpra 1 hábito hoje e dê um banho.`;
  if (e.triste) return `${nome} está tristinho. Um carinho ou brinquedo ajudam.`;
  if (e.radiante) return `${nome} está radiante! Bônus de +5% XP ativo. 🐾`;
  return `${nome} está bem. Deixe tudo acima de 70 para ganhar +5% de XP.`;
}

function aplicar(efeito) {
  const p = dados().pet;
  for (const k of ['forca', 'limpeza', 'alegria']) {
    if (efeito[k] === undefined) continue;
    p[k] = efeito.minimo ? lim(Math.max(p[k], efeito[k])) : lim(p[k] + efeito[k]);
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
 * acoes: 'carinho' (1x/dia, +moedas), 'banho' (1x/dia grátis), ou um item do inventário.
 */
export function cuidar(acao) {
  const d = dados();
  const p = d.pet;
  const reg = (d.diario[hojeKey()] ||= { rotina: {}, checks: {}, agua: 0, aguaLanc: null, bonusRotina: null, resumo: null });
  if (acao === 'carinho') {
    if (reg.carinho) {
      aplicar({ alegria: 2 });
      return { ok: true, msg: `${p.nome} adorou! (o bônus de moedas é 1x por dia)` };
    }
    reg.carinho = true;
    aplicar({ alegria: 15 });
    d.carteira.moedas += 5;
    return { ok: true, msg: `${p.nome} ficou feliz com o carinho! +5 🪙`, moeda: true };
  }
  if (acao === 'banho') {
    const b = podeBanho();
    if (b.jaDeu) return { ok: false, msg: 'Já teve banho hoje. Use um sabonete da loja para outro.' };
    if (!b.fezAlgo) return { ok: false, msg: 'Cumpra pelo menos 1 hábito hoje para liberar o banho. 🛁' };
    reg.banho = true;
    aplicar({ limpeza: 50, alegria: 5 });
    return { ok: true, msg: `${p.nome} está limpinho! ✨` };
  }
  const item = ITENS_PET[acao];
  if (!item) return { ok: false, msg: 'Ação desconhecida.' };
  if (!(d.carteira.inventario[acao] > 0)) return { ok: false, msg: `Você não tem ${item.nome}. Compre na loja.`, semItem: true };
  d.carteira.inventario[acao]--;
  aplicar(item.efeito);
  return { ok: true, msg: `${item.emoji} ${p.nome} usou ${item.nome}!` };
}
