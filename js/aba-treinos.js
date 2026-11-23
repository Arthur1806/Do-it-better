// =============================================================
// aba-treinos.js — aba TREINOS: junta o corpo em dois lados:
//   🏋️ Treino — fichas, treino em andamento, evolução (treinos.js)
//   🥗 Dieta  — refeições, horários e o que comer (dieta.js)
// Um seletor no topo troca entre os dois (igual à aba Tarefas).
// =============================================================

import * as treinos from './treinos.js';
import * as dieta from './dieta.js';
import { dados } from './store.js';
import { vibrar } from './ui.js';

let sub = 'treino';
let caixas = null;

export function montar(el) {
  el.innerHTML = `
    <header class="cabecalho"><h1 class="titulo-tela">Treino & Dieta</h1></header>
    <div class="segmentado seletor-tarefas seletor-treinos" role="tablist">
      <button data-sub="treino" role="tab"></button>
      <button data-sub="dieta" role="tab"></button>
    </div>
    <div class="sub-tarefa" id="view-treino"></div>
    <div class="sub-tarefa" id="view-dieta"></div>`;
  caixas = { treino: el.querySelector('#view-treino'), dieta: el.querySelector('#view-dieta') };
  treinos.montar(caixas.treino);
  dieta.montar(caixas.dieta);
  el.querySelector('.seletor-treinos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (!b || b.dataset.sub === sub) return;
    sub = b.dataset.sub;
    vibrar(6);
    render(el, {});
    el.scrollTo({ top: 0 });
  });
}

/** Qual lado está aberto (para o botão "+" criar a coisa certa). */
export function subAtual() {
  return sub;
}

export function render(el, params = {}) {
  if (params.sub === 'treino' || params.sub === 'dieta') sub = params.sub;
  const andamento = !!dados().treinos.emAndamento;
  const faltam = dieta.faltamHoje();
  const agora = !!dieta.refeicaoAgora();
  el.querySelectorAll('.seletor-treinos [data-sub]').forEach((b) => {
    const on = b.dataset.sub === sub;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on);
    b.innerHTML = b.dataset.sub === 'treino'
      ? `🏋️ Treino ${andamento ? '<i class="contador urgente">●</i>' : ''}`
      : `🥗 Dieta ${faltam ? `<i class="contador ${agora ? 'urgente' : ''}">${faltam}</i>` : dieta.refeicoesDoDia().length ? '✓' : ''}`;
  });
  caixas.treino.hidden = sub !== 'treino';
  caixas.dieta.hidden = sub !== 'dieta';
  if (sub === 'treino') treinos.render(caixas.treino, params);
  else dieta.render(caixas.dieta, params);
}
