// =============================================================
// extras.js — recursos menores usados pelos blocos do painel:
// água, notas rápidas, lista de compras e gastos do mês.
// =============================================================

import { dados, alterar } from './store.js';
import { hojeKey, esc, uid, formatarMoeda, formatarData, formatarDataHora, lerNumero, MESES } from './utils.js';
import { registroDia, lerDia } from './historico.js';
import { ganharXP, removerXP } from './xp.js';
import { abrirSheet, confirmar, toast, vibrar, vazioHTML, ICONE_LIXO, ICONE_CHECK } from './ui.js';

// -------------------------------------------------------------
// Água
// -------------------------------------------------------------

export function aguaHoje() {
  const reg = lerDia(hojeKey());
  return reg ? reg.agua || 0 : 0;
}

/** Soma (ou subtrai) copos de água. Ao bater a meta ganha XP; se cair abaixo, o XP sai. */
export function adicionarAgua(delta = 1) {
  const d = dados();
  const meta = d.ajustes.metaAgua;
  vibrar(8);
  alterar(() => {
    const reg = registroDia(hojeKey());
    reg.agua = Math.max(0, (reg.agua || 0) + delta);
    if (reg.agua >= meta && !reg.aguaLanc && meta > 0) {
      const l = ganharXP({ base: d.ajustes.xp.agua, fonte: 'agua', rotulo: 'Meta de água' });
      reg.aguaLanc = l.id;
      setTimeout(() => toast('Meta de água batida! 💧'), 150);
    } else if (reg.agua < meta && reg.aguaLanc) {
      removerXP(reg.aguaLanc);
      reg.aguaLanc = null;
    }
  });
}

// -------------------------------------------------------------
// Notas rápidas
// -------------------------------------------------------------

export function ultimaNota() {
  const n = dados().notas;
  return n.length ? n[0] : null; // a mais recente fica no início
}

export function abrirNotas({ nova = false } = {}) {
  const d = dados();
  const lista = () =>
    d.notas.length
      ? d.notas
          .map(
            (n) => `<div class="nota card" data-id="${n.id}">
        <textarea class="entrada nota-texto" data-id="${n.id}" rows="2">${esc(n.texto)}</textarea>
        <div class="nota-rodape"><small>${formatarDataHora(n.editadaEm || n.criadaEm)}</small>
        <button class="btn-icone perigo-texto" data-excluir="${n.id}" aria-label="Excluir nota">${ICONE_LIXO}</button></div>
      </div>`
          )
          .join('')
      : vazioHTML('🗒️', 'Nenhuma nota', 'Anote ideias, lembretes e insights antes que eles escapem.');

  abrirSheet({
    titulo: 'Notas rápidas',
    html: `<form class="form nova-nota" autocomplete="off">
        <textarea class="entrada" name="texto" rows="3" placeholder="Escreva uma nota..."></textarea>
        <button class="btn primario largo" type="submit">Salvar nota</button>
      </form>
      <div class="lista-notas">${lista()}</div>`,
    aoMontar(corpo) {
      const form = corpo.querySelector('form');
      const box = corpo.querySelector('.lista-notas');
      if (nova) setTimeout(() => form.elements.texto.focus(), 320);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = form.elements.texto.value.trim();
        if (!texto) return;
        alterar(() => d.notas.unshift({ id: uid(), texto, criadaEm: Date.now(), editadaEm: null }));
        form.elements.texto.value = '';
        box.innerHTML = lista();
        toast('Nota salva 🗒️');
      });
      // editar no lugar: salva ao sair do campo
      box.addEventListener('change', (e) => {
        const t = e.target.closest('.nota-texto');
        if (!t) return;
        const n = d.notas.find((x) => x.id === t.dataset.id);
        if (!n) return;
        const texto = t.value.trim();
        alterar(() => {
          if (!texto) d.notas = d.notas.filter((x) => x.id !== n.id);
          else {
            n.texto = texto;
            n.editadaEm = Date.now();
          }
        });
      });
      box.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-excluir]');
        if (!b) return;
        if (!(await confirmar('Excluir esta nota?', { titulo: 'Excluir nota', ok: 'Excluir', perigo: true }))) return;
        alterar(() => (d.notas = d.notas.filter((x) => x.id !== b.dataset.excluir)));
        box.innerHTML = lista();
      });
    },
  });
}

// -------------------------------------------------------------
// Lista de compras
// -------------------------------------------------------------

export function comprasFaltando() {
  return dados().compras.filter((c) => !c.comprado);
}

export function abrirCompras() {
  const d = dados();
  const lista = () => {
    if (!d.compras.length) return vazioHTML('🛒', 'Lista vazia', 'Adicione o que está faltando em casa e risque quando comprar.');
    const ord = [...d.compras].sort((a, b) => Number(a.comprado) - Number(b.comprado));
    return `<div class="lista card">${ord
      .map(
        (c) => `<div class="item-linha ${c.comprado ? 'feito' : ''}">
        <button class="check-circulo ${c.comprado ? 'on' : ''}" data-alternar="${c.id}" aria-label="Marcar">${ICONE_CHECK}</button>
        <button class="item-info" data-alternar="${c.id}"><span class="item-nome">${esc(c.nome)}</span></button>
        <button class="btn-icone perigo-texto" data-excluir="${c.id}" aria-label="Excluir">${ICONE_LIXO}</button>
      </div>`
      )
      .join('')}</div>
      ${d.compras.some((c) => c.comprado) ? '<button class="btn secundario largo" data-limpar>Remover itens comprados</button>' : ''}`;
  };
  abrirSheet({
    titulo: 'Lista de compras',
    html: `<form class="form linha-form" autocomplete="off">
        <input class="entrada" name="nome" placeholder="Adicionar item..." enterkeyhint="done" maxlength="60">
        <button class="btn primario" type="submit">Adicionar</button>
      </form>
      <div class="lista-compras">${lista()}</div>`,
    aoMontar(corpo) {
      const form = corpo.querySelector('form');
      const box = corpo.querySelector('.lista-compras');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = form.elements.nome.value.trim();
        if (!nome) return;
        alterar(() => d.compras.push({ id: uid(), nome, comprado: false }));
        form.elements.nome.value = '';
        box.innerHTML = lista();
      });
      box.addEventListener('click', (e) => {
        const a = e.target.closest('[data-alternar]');
        const x = e.target.closest('[data-excluir]');
        const l = e.target.closest('[data-limpar]');
        if (a) {
          const c = d.compras.find((i) => i.id === a.dataset.alternar);
          vibrar(8);
          alterar(() => (c.comprado = !c.comprado));
        }
        if (x) alterar(() => (d.compras = d.compras.filter((i) => i.id !== x.dataset.excluir)));
        if (l) alterar(() => (d.compras = d.compras.filter((i) => !i.comprado)));
        if (a || x || l) box.innerHTML = lista();
      });
    },
  });
}

// -------------------------------------------------------------
// Gastos do mês
// -------------------------------------------------------------

export function gastosDoMes(mes = hojeKey().slice(0, 7)) {
  return dados().gastos.filter((g) => g.dia.slice(0, 7) === mes);
}
export function totalGastosMes(mes) {
  return gastosDoMes(mes).reduce((s, g) => s + g.valor, 0);
}

export function abrirGastos() {
  const d = dados();
  const mes = hojeKey().slice(0, 7);
  const nomeMes = MESES[Number(mes.slice(5, 7)) - 1];
  const resumo = () => {
    const total = totalGastosMes(mes);
    const lim = d.ajustes.limiteGastos;
    const pct = lim > 0 ? Math.min(1, total / lim) : 0;
    const estourou = lim > 0 && total > lim;
    return `<div class="card gastos-resumo ${estourou ? 'estourou' : ''}">
      <small>Total de ${nomeMes}</small>
      <strong class="numero-grande">${formatarMoeda(total)}</strong>
      ${lim > 0 ? `<div class="barra"><div class="barra-fill" style="width:${pct * 100}%"></div></div>
        <small>${estourou ? `Passou ${formatarMoeda(total - lim)} do limite` : `Restam ${formatarMoeda(lim - total)} de ${formatarMoeda(lim)}`}</small>` : '<small>Defina um limite mensal nos Ajustes (Perfil).</small>'}
    </div>`;
  };
  const lista = () => {
    const gs = gastosDoMes(mes).sort((a, b) => b.dia.localeCompare(a.dia) || b.ts - a.ts);
    if (!gs.length) return vazioHTML('💸', 'Nenhum gasto neste mês', 'Registrar é o primeiro passo para controlar.');
    return `<div class="lista card">${gs
      .map(
        (g) => `<div class="item-linha">
        <div class="item-info"><span class="item-nome">${esc(g.descricao || 'Gasto')}</span><span class="item-sub">${formatarData(g.dia)}</span></div>
        <strong class="valor">${formatarMoeda(g.valor)}</strong>
        <button class="btn-icone perigo-texto" data-excluir="${g.id}" aria-label="Excluir">${ICONE_LIXO}</button>
      </div>`
      )
      .join('')}</div>`;
  };
  abrirSheet({
    titulo: 'Gastos do mês',
    html: `<div class="gastos-topo">${resumo()}</div>
      <form class="form" autocomplete="off">
        <div class="linha-form">
          <input class="entrada" name="valor" inputmode="decimal" placeholder="R$ 0,00" aria-label="Valor">
          <input class="entrada" name="descricao" placeholder="Descrição (ex.: mercado)" maxlength="60" aria-label="Descrição">
        </div>
        <input class="entrada" type="date" name="dia" value="${hojeKey()}" aria-label="Data">
        <button class="btn primario largo" type="submit">Registrar gasto</button>
      </form>
      <div class="lista-gastos">${lista()}</div>`,
    aoMontar(corpo) {
      const form = corpo.querySelector('form');
      const atualizar = () => {
        corpo.querySelector('.gastos-topo').innerHTML = resumo();
        corpo.querySelector('.lista-gastos').innerHTML = lista();
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const valor = lerNumero(form.elements.valor.value.replace(/[R$\s]/g, ''), 0);
        if (!(valor > 0)) {
          form.elements.valor.focus();
          toast('Informe um valor maior que zero.');
          return;
        }
        alterar(() =>
          d.gastos.push({ id: uid(), valor: Math.round(valor * 100) / 100, descricao: form.elements.descricao.value.trim(), dia: form.elements.dia.value || hojeKey(), ts: Date.now() })
        );
        form.elements.valor.value = '';
        form.elements.descricao.value = '';
        atualizar();
        toast('Gasto registrado');
      });
      corpo.querySelector('.lista-gastos').addEventListener('click', async (e) => {
        const x = e.target.closest('[data-excluir]');
        if (!x) return;
        if (!(await confirmar('Excluir este gasto?', { titulo: 'Excluir', ok: 'Excluir', perigo: true }))) return;
        alterar(() => (d.gastos = d.gastos.filter((g) => g.id !== x.dataset.excluir)));
        atualizar();
      });
    },
  });
}
