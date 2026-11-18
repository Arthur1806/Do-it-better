// =============================================================
// tarefas.js — aba TAREFAS: junta as duas listas do que você faz:
//   🔁 Rotina      — hábitos que se repetem (com horário)
//   📌 Pendências  — coisas avulsas com prazo
// Um seletor no topo troca entre as duas. Cada uma continua no seu
// módulo (rotina.js e pendencias.js).
// =============================================================

import { hojeKey } from './utils.js';
import { resumoRotina } from './historico.js';
import * as rotina from './rotina.js';
import * as pendencias from './pendencias.js';
import { vibrar } from './ui.js';

let sub = 'rotina';
let caixas = null;

export function montar(el) {
  el.innerHTML = `
    <header class="cabecalho"><h1 class="titulo-tela">Tarefas</h1></header>
    <div class="segmentado seletor-tarefas" role="tablist">
      <button data-sub="rotina" role="tab"></button>
      <button data-sub="pendencias" role="tab"></button>
    </div>
    <div class="sub-tarefa" id="view-rotina"></div>
    <div class="sub-tarefa" id="view-pendencias"></div>`;
  caixas = { rotina: el.querySelector('#view-rotina'), pendencias: el.querySelector('#view-pendencias') };
  rotina.montar(caixas.rotina);
  pendencias.montar(caixas.pendencias);
  el.querySelector('.seletor-tarefas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (!b || b.dataset.sub === sub) return;
    sub = b.dataset.sub;
    vibrar(6);
    render(el, {});
    el.scrollTo({ top: 0 });
  });
}

/** Qual lista está aberta (para o botão "+" sugerir o tipo certo). */
export function subAtual() {
  return sub;
}

export function render(el, params = {}) {
  if (params.sub) sub = params.sub;
  const r = resumoRotina(hojeKey());
  const c = pendencias.contagens();
  const faltam = Math.max(0, r.total - r.feitos);
  const pend = c.hoje + c.atrasadas;
  el.querySelectorAll('.seletor-tarefas [data-sub]').forEach((b) => {
    const on = b.dataset.sub === sub;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on);
    b.innerHTML = b.dataset.sub === 'rotina'
      ? `🔁 Rotina ${faltam ? `<i class="contador">${faltam}</i>` : '✓'}`
      : `📌 Pendências ${pend ? `<i class="contador ${c.atrasadas ? 'urgente' : ''}">${pend}</i>` : ''}`;
  });
  caixas.rotina.hidden = sub !== 'rotina';
  caixas.pendencias.hidden = sub !== 'pendencias';
  const { sub: _s, ...resto } = params;
  if (sub === 'rotina') rotina.render(caixas.rotina, resto);
  else pendencias.render(caixas.pendencias, resto);
}
