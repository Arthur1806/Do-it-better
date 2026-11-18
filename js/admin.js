// =============================================================
// admin.js — MODO ADMIN (dono do app).
//
// Quem é admin é decidido NO SERVIDOR (tabela admins + função sou_admin),
// pelo e-mail da conta. Logado numa conta admin, o app deixa tudo no máximo
// e repõe sempre que abre (e a cada hora):
//   nível 50 + 5 estrelas de prestígio, físico Lenda em Chamas,
//   todos os pets, skins, temas, visuais e medalhas, pet Fera Suprema
//   com tudo em 100, moedas, DNA, escudos e mochila cheios.
// O XP extra entra como "ajuste" (não conta como XP da semana), então o
// ranking semanal continua justo para os amigos.
// =============================================================

import { dados, salvar } from './store.js';
import * as Nuvem from './nuvem.js';
import { xpParaChegar, nivelInfo, NIVEL_MAX, PRESTIGIO_MAX } from './xp.js';
import { PERSONAGENS, SKINS_PET } from './personagens.js';
import { TEMAS } from './loja.js';
import { todasMedalhas } from './conquistas.js';
import { CATEGORIAS, opcoes, idItem } from './visual.js';
import { MUTACAO_MAX } from './mutacao.js';
import { hojeKey } from './utils.js';

export const ehAdmin = (d = dados()) => !!(d.meta && d.meta.admin);

/** Coloca tudo no máximo (pode chamar quantas vezes quiser). */
export function aplicarMaximo() {
  const d = dados();
  const agora = Date.now();
  // nível 50 (o XP que faltar entra como ajuste, fora do XP da semana)
  d.xp.prestigio = PRESTIGIO_MAX;
  d.xp.basePrestigio = 0;
  d.xp.fisicoPiso = 6;
  if (!nivelInfo(d.xp.total).maximo) {
    const falta = xpParaChegar(NIVEL_MAX) - d.xp.total;
    if (falta > 0) {
      d.xp.lancamentos.push({ id: 'admin-' + agora, dia: d.criadoEm || hojeKey(), ts: agora, base: falta, mult: 0, xp: falta, moedas: 0, fonte: 'ajuste', ref: null, rotulo: 'Modo admin' });
      d.xp.total += falta;
    }
  }
  // coleção, skins, temas, visuais e medalhas
  for (const p of PERSONAGENS) d.colecao[p.id] = d.colecao[p.id] || agora;
  d.colecaoVista = Object.keys(d.colecao);
  d.loja.skinsPet = SKINS_PET.map((s) => s.id);
  d.loja.temas = TEMAS.map((t) => t.id);
  const guarda = new Set(d.guardaRoupa);
  for (const c of CATEGORIAS) for (const o of opcoes(c.id)) guarda.add(idItem(c.id, o.id));
  d.guardaRoupa = [...guarda];
  // tudo já "visto": sem enxurrada de celebrações de desbloqueio
  d.visualVisto = [...new Set([...d.visualVisto, ...d.guardaRoupa])];
  d.visualNovos = [];
  for (const m of todasMedalhas()) d.conquistas[m.id] = d.conquistas[m.id] || agora;
  d.stats.melhorLiga = 5;
  // pet no máximo
  Object.assign(d.pet, { mutacao: MUTACAO_MAX, mutacaoMax: MUTACAO_MAX, forca: 100, limpeza: 100, alegria: 100, comida: 100, agua: 100, atualizadoEm: agora, travaPerda: false, perdeuMutacaoEm: null });
  // carteira e mochila cheias
  d.carteira.moedas = Math.max(d.carteira.moedas, 999999);
  d.carteira.dna = Math.max(d.carteira.dna || 0, 9999);
  d.carteira.escudos = 2;
  for (const k of Object.keys(d.carteira.inventario)) d.carteira.inventario[k] = Math.max(d.carteira.inventario[k] || 0, 99);
}

/** Pergunta ao servidor se esta conta é admin e aplica/remove o modo. */
export async function verificarAdmin() {
  if (!Nuvem.logado()) return false;
  let sou = false;
  try {
    sou = !!(await Nuvem.rpc('sou_admin'));
  } catch (_) {
    return ehAdmin(); // sem internet: mantém como estava
  }
  const d = dados();
  if (sou) {
    d.meta.admin = true;
    aplicarMaximo();
    salvar();
  } else if (d.meta.admin) {
    d.meta.admin = false; // saiu da conta admin: o modo desliga (os itens já ganhos ficam)
    salvar();
  }
  return sou;
}

/** Repõe comida, água, moedas etc. de tempos em tempos (só admin). */
export function manterMaximo() {
  if (!ehAdmin()) return false;
  aplicarMaximo();
  return true;
}
