// =============================================================
// loja.js — onde as MOEDAS viram vantagens:
// • Escudo de sequência: protege a sequência num dia falhado (máx. 2).
// • Poção de XP: +50% de XP por 1 hora.
// • Temas de cor: trocam o gradiente do app inteiro.
// =============================================================

import { dados } from './store.js';
import { gastarMoedas, nivelInfo } from './xp.js';

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
  { id: 'escudo', emoji: '🛡️', nome: 'Escudo de sequência', desc: 'Se você falhar a rotina num dia, o escudo protege sua sequência. Usado automaticamente. Máximo 2.', preco: 150 },
  { id: 'pocao', emoji: '🧪', nome: 'Poção de XP', desc: '+50% de XP em tudo que você fizer na próxima 1 hora.', preco: 100 },
];

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

/** Compra um item ou tema. Retorna { ok, msg }. */
export function comprar(id) {
  const d = dados();
  const tema = TEMAS.find((t) => t.id === id);
  if (tema) {
    if (d.loja.temas.includes(id)) {
      d.loja.temaAtivo = id;
      aplicarTemaCor(id);
      return { ok: true, msg: `Tema ${tema.nome} aplicado 🎨` };
    }
    if (tema.nivel && nivelInfo(d.xp.total).nivel < tema.nivel) return { ok: false, msg: `Disponível a partir do nível ${tema.nivel}.` };
    if (!gastarMoedas(tema.preco)) return { ok: false, msg: `Faltam ${tema.preco - d.carteira.moedas} moedas.` };
    d.loja.temas.push(id);
    d.loja.temaAtivo = id;
    aplicarTemaCor(id);
    return { ok: true, msg: `Tema ${tema.nome} desbloqueado! 🎨`, festa: true };
  }
  const item = ITENS.find((i) => i.id === id);
  if (!item) return { ok: false, msg: 'Item não encontrado.' };
  if (id === 'escudo' && d.carteira.escudos >= 2) return { ok: false, msg: 'Você já tem o máximo de 2 escudos.' };
  if (!gastarMoedas(item.preco)) return { ok: false, msg: `Faltam ${item.preco - d.carteira.moedas} moedas.` };
  if (id === 'escudo') d.carteira.escudos++;
  if (id === 'pocao') d.carteira.boostAte = Math.max(Date.now(), d.carteira.boostAte || 0) + 60 * 60 * 1000;
  return { ok: true, msg: id === 'escudo' ? 'Escudo equipado 🛡️ Sua sequência está protegida!' : 'Poção ativada! +50% XP por 1 hora 🧪', festa: true };
}
