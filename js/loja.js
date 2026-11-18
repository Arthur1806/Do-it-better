// =============================================================
// loja.js — onde as MOEDAS viram vantagens. Seções:
// • Itens: escudo de sequência, poções, ampulheta, baú misterioso.
// • Pet: petiscos, ração, brinquedo, sabonete, kit de cuidados.
// • Visual: roupas, cabelos, chapéus e cores do personagem.
// • Skins de pet e temas de cor do app.
// IDs de compra: 'item:x', 'pet:x', 'visual:categoria:valor', 'skin:x', 'tema:x'.
// =============================================================

import { dados } from './store.js';
import { hojeKey } from './utils.js';
import { gastarMoedas, nivelInfo } from './xp.js';
import { ITENS_PET } from './pet.js';
import { CATEGORIAS, opcoes, idItem, liberado } from './visual.js';
import { SKINS_PET } from './personagens.js';

export const TEMAS = [
  { id: 'neon', nome: 'Neon', preco: 0, c1: '#7C3AED', c2: '#06B6D4', c1claro: '#A78BFA', c2claro: '#22D3EE' },
  { id: 'aurora', nome: 'Aurora', preco: 200, c1: '#10B981', c2: '#06B6D4', c1claro: '#6EE7B7', c2claro: '#67E8F9' },
  { id: 'sunset', nome: 'Pôr do sol', preco: 200, c1: '#F97316', c2: '#EC4899', c1claro: '#FDBA74', c2claro: '#F9A8D4' },
  { id: 'oceano', nome: 'Oceano', preco: 250, c1: '#2563EB', c2: '#22D3EE', c1claro: '#93C5FD', c2claro: '#67E8F9' },
  { id: 'sakura', nome: 'Sakura', preco: 300, c1: '#EC4899', c2: '#A78BFA', c1claro: '#F9A8D4', c2claro: '#C4B5FD' },
  { id: 'matrix', nome: 'Matrix', preco: 400, c1: '#16A34A', c2: '#A3E635', c1claro: '#86EFAC', c2claro: '#D9F99D' },
  { id: 'ouro', nome: 'Ouro', preco: 500, nivel: 10, c1: '#D97706', c2: '#FACC15', c1claro: '#FCD34D', c2claro: '#FEF08A' },
];

export const ITENS = [
  { id: 'escudo', emoji: '🛡️', nome: 'Escudo de sequência', desc: 'Se você falhar a rotina num dia, o escudo protege sua sequência. Usado sozinho. Máximo 2.', preco: 150 },
  { id: 'pocao', emoji: '🧪', nome: 'Poção de XP', desc: '+50% de XP em tudo pela próxima 1 hora.', preco: 100 },
  { id: 'superPocao', emoji: '⚗️', nome: 'Super poção', desc: '+100% de XP (XP em dobro) por 30 minutos.', preco: 220 },
  { id: 'ampulheta', emoji: '⏳', nome: 'Ampulheta', desc: 'Hoje, todos os horários limite ganham +1h de folga. Use num dia corrido.', preco: 90, inventario: true },
  { id: 'bauMisterioso', emoji: '🎁', nome: 'Baú misterioso', desc: 'Um item de visual aleatório da loja que você ainda não tem (pode ser raro ou épico!).', preco: 280, inventario: true },
];

/** Itens de cuidado do pet, no formato da loja. */
export const ITENS_DO_PET = Object.entries(ITENS_PET).map(([id, x]) => ({ id, ...x, desc: descreverEfeito(x.efeito) }));

function descreverEfeito(e) {
  const p = [];
  if (e.minimo) return 'Recupera força, limpeza e alegria para pelo menos 70.';
  if (e.forca) p.push(`+${e.forca} força`);
  if (e.limpeza) p.push(`+${e.limpeza} limpeza`);
  if (e.alegria) p.push(`+${e.alegria} alegria`);
  return p.join(' · ');
}

/** Itens de visual vendidos na loja (os de progresso não são vendidos). */
export function visuaisDaLoja() {
  const l = [];
  for (const c of CATEGORIAS) for (const o of opcoes(c.id)) if (o.d.tipo === 'loja') l.push({ cat: c.id, catNome: c.nome, item: o });
  return l;
}

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/** Aplica o tema de cor ativo em todo o app (CSS e gradientes dos gráficos). */
export function aplicarTemaCor(id = dados().loja.temaAtivo) {
  const t = TEMAS.find((x) => x.id === id) || TEMAS[0];
  const r = document.documentElement.style;
  r.setProperty('--roxo', t.c1);
  r.setProperty('--ciano', t.c2);
  r.setProperty('--roxo-claro', t.c1claro);
  r.setProperty('--ciano-claro', t.c2claro);
  r.setProperty('--roxo-rgb', rgb(t.c1));
  r.setProperty('--ciano-rgb', rgb(t.c2));
  try {
    localStorage.setItem('doitbetter:cor', JSON.stringify(t));
  } catch (_) {}
}

/**
 * Compra algo. Retorna { ok, msg, festa? }.
 * id: 'item:escudo' | 'pet:petisco' | 'visual:cabelo:coque' | 'skin:sombra' | 'tema:aurora'
 */
export function comprar(id) {
  const d = dados();
  const [tipo, a, b] = String(id).split(':');
  const falta = (preco) => ({ ok: false, msg: `Faltam ${preco - d.carteira.moedas} moedas.` });

  if (tipo === 'tema') {
    const tema = TEMAS.find((t) => t.id === a);
    if (!tema) return { ok: false, msg: 'Tema não encontrado.' };
    if (d.loja.temas.includes(a)) {
      d.loja.temaAtivo = a;
      aplicarTemaCor(a);
      return { ok: true, msg: `Tema ${tema.nome} aplicado 🎨` };
    }
    if (tema.nivel && nivelInfo(d.xp.total).nivel < tema.nivel) return { ok: false, msg: `Disponível a partir do nível ${tema.nivel}.` };
    if (!gastarMoedas(tema.preco)) return falta(tema.preco);
    d.loja.temas.push(a);
    d.loja.temaAtivo = a;
    aplicarTemaCor(a);
    return { ok: true, msg: `Tema ${tema.nome} desbloqueado! 🎨`, festa: true };
  }

  if (tipo === 'visual') {
    const item = opcoes(a).find((o) => o.id === b);
    if (!item) return { ok: false, msg: 'Item não encontrado.' };
    if (liberado(a, item)) {
      d.avatar[a] = b;
      return { ok: true, msg: `${item.nome} equipado! ✨` };
    }
    if (item.d.tipo !== 'loja') return { ok: false, msg: 'Este item é liberado pelo progresso, não pela loja.' };
    if (!gastarMoedas(item.d.preco)) return falta(item.d.preco);
    d.guardaRoupa.push(idItem(a, b));
    d.avatar[a] = b;
    return { ok: true, msg: `${item.nome} comprado e equipado! ✨`, festa: true };
  }

  if (tipo === 'skin') {
    const sk = SKINS_PET.find((x) => x.id === a);
    if (!sk) return { ok: false, msg: 'Skin não encontrada.' };
    if (skinLiberada(sk)) {
      d.pet.skin = a;
      return { ok: true, msg: `Skin ${sk.nome} aplicada no ${d.pet.nome || 'pet'}! 🐾` };
    }
    if (sk.d.tipo !== 'loja') return { ok: false, msg: 'Esta skin é liberada pelo progresso.' };
    if (!gastarMoedas(sk.d.preco)) return falta(sk.d.preco);
    d.loja.skinsPet.push(a);
    d.pet.skin = a;
    return { ok: true, msg: `Skin ${sk.nome} comprada! 🐾`, festa: true };
  }

  if (tipo === 'pet') {
    const it = ITENS_PET[a];
    if (!it) return { ok: false, msg: 'Item não encontrado.' };
    if (!gastarMoedas(it.preco)) return falta(it.preco);
    d.carteira.inventario[a] = (d.carteira.inventario[a] || 0) + 1;
    return { ok: true, msg: `${it.emoji} ${it.nome} guardado na mochila. Use em "Cuidar do pet".` };
  }

  if (tipo === 'item') {
    const item = ITENS.find((i) => i.id === a);
    if (!item) return { ok: false, msg: 'Item não encontrado.' };
    if (a === 'escudo' && d.carteira.escudos >= 2) return { ok: false, msg: 'Você já tem o máximo de 2 escudos.' };
    if (!gastarMoedas(item.preco)) return falta(item.preco);
    if (a === 'escudo') d.carteira.escudos++;
    if (a === 'pocao' || a === 'superPocao') {
      const pct = a === 'pocao' ? 50 : 100;
      const min = a === 'pocao' ? 60 : 30;
      d.carteira.boostPct = Math.max(pct, pocaoAtivaPct(d));
      d.carteira.boostAte = Math.max(Date.now(), d.carteira.boostAte || 0) + min * 60 * 1000;
    }
    if (item.inventario) d.carteira.inventario[a] = (d.carteira.inventario[a] || 0) + 1;
    const msgs = {
      escudo: 'Escudo equipado 🛡️ Sua sequência está protegida!',
      pocao: 'Poção ativada! +50% XP por 1 hora 🧪',
      superPocao: 'Super poção ativada! XP em dobro por 30 min ⚗️',
      ampulheta: 'Ampulheta guardada ⏳ Use quando precisar de mais tempo.',
      bauMisterioso: 'Baú misterioso guardado 🎁 Abra na loja quando quiser!',
    };
    return { ok: true, msg: msgs[a], festa: !item.inventario };
  }
  return { ok: false, msg: 'Item não encontrado.' };
}

function pocaoAtivaPct(d) {
  return (d.carteira.boostAte || 0) > Date.now() ? d.carteira.boostPct || 50 : 0;
}

/** Skin de pet liberada? */
export function skinLiberada(sk, d = dados()) {
  if (sk.d.tipo === 'gratis') return true;
  if (sk.d.tipo === 'loja') return d.loja.skinsPet.includes(sk.id);
  const fake = { d: sk.d };
  return liberado('pele', fake, d); // mesmas regras de nível/sequência/medalha
}

/** Ativa a ampulheta hoje. */
export function usarAmpulheta() {
  const d = dados();
  if (d.carteira.ampulhetaDia === hojeKey()) return { ok: false, msg: 'A ampulheta já está ativa hoje.' };
  if (!(d.carteira.inventario.ampulheta > 0)) return { ok: false, msg: 'Você não tem ampulhetas. Compre na loja.' };
  d.carteira.inventario.ampulheta--;
  d.carteira.ampulhetaDia = hojeKey();
  return { ok: true, msg: 'Ampulheta ativada! Todos os horários de hoje ganharam +1h ⏳' };
}

/** Abre um baú misterioso: um visual da loja que você ainda não tem. */
export function abrirBauMisterioso() {
  const d = dados();
  if (!(d.carteira.inventario.bauMisterioso > 0)) return { ok: false, msg: 'Você não tem baús misteriosos.' };
  const faltando = visuaisDaLoja().filter((x) => !liberado(x.cat, x.item, d));
  d.carteira.inventario.bauMisterioso--;
  if (!faltando.length) {
    d.carteira.moedas += 300;
    return { ok: true, msg: 'Você já tem todos os visuais da loja! O baú virou 🪙 300.', moedas: 300 };
  }
  // raros saem mais que épicos
  const peso = (x) => (x.item.r === 'epico' ? 1 : 3);
  const total = faltando.reduce((s, x) => s + peso(x), 0);
  let r = Math.random() * total;
  let escolhido = faltando[0];
  for (const x of faltando) {
    r -= peso(x);
    if (r <= 0) {
      escolhido = x;
      break;
    }
  }
  d.guardaRoupa.push(idItem(escolhido.cat, escolhido.item.id));
  return { ok: true, premio: escolhido, msg: `Você ganhou: ${escolhido.item.nome} (${escolhido.catNome})!` };
}
