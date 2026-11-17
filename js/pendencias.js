// =============================================================
// pendencias.js — aba PENDÊNCIAS (tarefas avulsas com prazo).
// • XP por prioridade (alta 30 / média 20 / baixa 10, editável).
// • Concluída depois do prazo vale metade.
// • Concluir com um toque + desfazer (desfazer remove o XP).
// =============================================================

import { dados, alterar } from './store.js';
import { hojeKey, somarDias, esc, uid, rotuloPrazo, formatarDataHora } from './utils.js';
import { ganharXP, removerXP } from './xp.js';
import { abrirSheet, confirmar, toast, vibrar, vazioHTML, ICONE_CHECK, ICONE_MAIS, ICONE_ORDENAR } from './ui.js';

let filtro = 'todas'; // todas | hoje | atrasadas | proximas | concluidas
let ordem = 'prazo'; // prazo | prioridade

const PRIORIDADES = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const PESO = { alta: 0, media: 1, baixa: 2 };

/** XP de uma pendência conforme a prioridade (antes de atraso/multiplicador). */
export function xpDaPrioridade(p) {
  const x = dados().ajustes.xp;
  return p === 'alta' ? x.pendAlta : p === 'baixa' ? x.pendBaixa : x.pendMedia;
}

/** Pendência atrasada = aberta e com prazo antes de hoje. */
function atrasada(p, hoje = hojeKey()) {
  return !p.concluidaEm && p.prazo && p.prazo < hoje;
}

/** Contagens usadas no painel e nos filtros. */
export function contagens() {
  const hoje = hojeKey();
  const abertas = dados().pendencias.filter((p) => !p.concluidaEm);
  return {
    todas: abertas.length,
    hoje: abertas.filter((p) => p.prazo === hoje).length,
    atrasadas: abertas.filter((p) => p.prazo && p.prazo < hoje).length,
    proximas: abertas.filter((p) => p.prazo && p.prazo > hoje).length,
    concluidas: dados().pendencias.length - abertas.length,
  };
}

/** Lista filtrada e ordenada. */
export function listar(f = filtro, o = ordem) {
  const hoje = hojeKey();
  let l = dados().pendencias;
  if (f === 'concluidas') {
    return l.filter((p) => p.concluidaEm).sort((a, b) => b.concluidaEm - a.concluidaEm);
  }
  l = l.filter((p) => !p.concluidaEm);
  if (f === 'hoje') l = l.filter((p) => p.prazo === hoje);
  if (f === 'atrasadas') l = l.filter((p) => p.prazo && p.prazo < hoje);
  if (f === 'proximas') l = l.filter((p) => p.prazo && p.prazo > hoje);
  if (f === 'hoje-e-atrasadas') l = l.filter((p) => p.prazo && p.prazo <= hoje);
  const porPrazo = (a, b) => (a.prazo || '9999') .localeCompare(b.prazo || '9999');
  const porPrio = (a, b) => PESO[a.prioridade] - PESO[b.prioridade];
  return [...l].sort((a, b) => (o === 'prioridade' ? porPrio(a, b) || porPrazo(a, b) : porPrazo(a, b) || porPrio(a, b)) || a.criadaEm - b.criadaEm);
}

/** Conclui uma pendência (dá XP) e oferece desfazer. */
export function concluir(id) {
  const d = dados();
  const p = d.pendencias.find((x) => x.id === id);
  if (!p || p.concluidaEm) return;
  vibrar(12);
  let lanc;
  alterar(() => {
    const hoje = hojeKey();
    const atrasou = p.prazo && hoje > p.prazo;
    let base = xpDaPrioridade(p.prioridade);
    if (atrasou) base = Math.round(base / 2);
    lanc = ganharXP({ base, fonte: 'pendencia', ref: p.id, rotulo: p.titulo });
    p.concluidaEm = Date.now();
    p.concluidaDia = hoje;
    p.lanc = lanc.id;
    p.xpGanho = lanc.xp;
    p.atrasada = !!atrasou;
  });
  toast(p.atrasada ? `Concluída com atraso (metade do XP)` : 'Pendência concluída! 💥', {
    acao: { rotulo: 'Desfazer', fn: () => reabrir(id, true) },
    duracao: 5000,
  });
}

/** Reabre uma pendência concluída, removendo o XP que ela deu. */
export function reabrir(id, silencioso = false) {
  const d = dados();
  const p = d.pendencias.find((x) => x.id === id);
  if (!p || !p.concluidaEm) return;
  alterar(() => {
    removerXP(p.lanc);
    p.concluidaEm = null;
    p.concluidaDia = null;
    p.lanc = null;
    p.xpGanho = 0;
    p.atrasada = false;
  });
  if (!silencioso) toast('Pendência reaberta (XP removido)');
}

// -------------------------------------------------------------
// Tela
// -------------------------------------------------------------

export function montar(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.acao) {
      case 'filtro':
        filtro = b.dataset.filtro;
        render(el);
        break;
      case 'ordem':
        ordem = ordem === 'prazo' ? 'prioridade' : 'prazo';
        render(el);
        break;
      case 'concluir': {
        const card = b.closest('.pend');
        if (card) card.classList.add('concluindo');
        setTimeout(() => concluir(id), 180);
        break;
      }
      case 'reabrir':
        reabrir(id);
        break;
      case 'editar':
        abrirFormPendencia(dados().pendencias.find((p) => p.id === id));
        break;
      case 'nova':
        abrirFormPendencia();
        break;
    }
  });
}

export function render(el, params = {}) {
  if (params.filtro) filtro = params.filtro;
  const c = contagens();
  const lista = listar();
  const hoje = hojeKey();
  const filtros = [
    ['todas', 'Todas', c.todas],
    ['hoje', 'Hoje', c.hoje],
    ['atrasadas', 'Atrasadas', c.atrasadas],
    ['proximas', 'Próximas', c.proximas],
    ['concluidas', 'Concluídas', c.concluidas],
  ];

  const item = (p) => {
    const feita = !!p.concluidaEm;
    const xp = feita ? p.xpGanho : xpDaPrioridade(p.prioridade);
    const late = atrasada(p, hoje);
    const prazo = p.prazo
      ? `<span class="tag ${late ? 'tag-perigo' : p.prazo === hoje ? 'tag-alerta' : ''}">📅 ${late ? 'Atrasada · ' : ''}${rotuloPrazo(p.prazo)}</span>`
      : '';
    return `<div class="pend card prio-${p.prioridade} ${feita ? 'feita' : ''}">
      <button class="check-circulo ${feita ? 'on' : ''}" data-acao="${feita ? 'reabrir' : 'concluir'}" data-id="${p.id}" aria-label="${feita ? 'Reabrir' : 'Concluir'}">${ICONE_CHECK}</button>
      <button class="pend-info" data-acao="editar" data-id="${p.id}">
        <span class="pend-titulo">${esc(p.titulo)}</span>
        ${p.descricao ? `<span class="pend-desc">${esc(p.descricao)}</span>` : ''}
        <span class="pend-meta">
          <span class="tag prio">${PRIORIDADES[p.prioridade]}</span>
          ${prazo}
          ${p.etiqueta ? `<span class="tag tag-etiqueta">#${esc(p.etiqueta)}</span>` : ''}
          ${feita ? `<span class="tag">✔ ${formatarDataHora(p.concluidaEm)}</span>` : ''}
        </span>
      </button>
      <span class="xp-badge">${feita ? '' : '+'}${xp}</span>
    </div>`;
  };

  const vazios = {
    todas: ['🏝️', 'Nenhuma pendência', 'Mente leve! Anote aqui o que precisa resolver e ganhe XP ao concluir.'],
    hoje: ['☀️', 'Nada para hoje', 'Nenhuma pendência vence hoje. Que tal adiantar alguma?'],
    atrasadas: ['🏆', 'Zero atrasos', 'Tudo em dia. Continue assim, campeão!'],
    proximas: ['🔭', 'Nada no horizonte', 'Sem pendências com prazo futuro.'],
    concluidas: ['🚀', 'Ainda nada concluído', 'Conclua sua primeira pendência e veja o XP subir!'],
  };
  const [ve, vt, vx] = vazios[filtro] || vazios.todas;

  el.innerHTML = `
    <header class="cabecalho">
      <h1 class="titulo-tela">Pendências</h1>
      <button class="btn-texto" data-acao="ordem" aria-label="Ordenar">${ICONE_ORDENAR} ${ordem === 'prazo' ? 'Prazo' : 'Prioridade'}</button>
    </header>
    <div class="filtros" role="tablist">
      ${filtros.map(([k, n, q]) => `<button class="chip ${filtro === k ? 'on' : ''} ${k === 'atrasadas' && q ? 'chip-alerta' : ''}" data-acao="filtro" data-filtro="${k}" role="tab" aria-selected="${filtro === k}">${n}${q ? ` <b>${q}</b>` : ''}</button>`).join('')}
    </div>
    <div class="lista-pend">
      ${lista.length ? lista.map(item).join('') : vazioHTML(ve, vt, vx, filtro !== 'concluidas' ? `<button class="btn primario" data-acao="nova">${ICONE_MAIS} Nova pendência</button>` : '')}
    </div>
  `;
}

// -------------------------------------------------------------
// Formulário
// -------------------------------------------------------------

export function abrirFormPendencia(p = null) {
  const d = dados();
  const nova = !p;
  const hoje = hojeKey();
  const x = d.ajustes.xp;
  const prioAtual = p ? p.prioridade : 'media';
  const etiquetaAtual = p ? p.etiqueta || '' : '';
  const html = `<form class="form" autocomplete="off">
    <label class="campo"><span>Título</span>
      <input class="entrada" name="titulo" maxlength="80" value="${esc(p ? p.titulo : '')}" placeholder="Ex.: Pagar a conta de luz" enterkeyhint="next">
    </label>
    <label class="campo"><span>Descrição (opcional)</span>
      <textarea class="entrada" name="descricao" rows="2" maxlength="400" placeholder="Detalhes...">${esc(p ? p.descricao || '' : '')}</textarea>
    </label>
    <div class="campo"><span>Prazo (opcional)</span>
      <div class="chips-linha">
        <button type="button" class="chip" data-prazo="${hoje}">Hoje</button>
        <button type="button" class="chip" data-prazo="${somarDias(hoje, 1)}">Amanhã</button>
        <button type="button" class="chip" data-prazo="${somarDias(hoje, 7)}">Em 1 semana</button>
        <button type="button" class="chip" data-prazo="">Sem prazo</button>
      </div>
      <input class="entrada" type="date" name="prazo" value="${p && p.prazo ? p.prazo : ''}">
    </div>
    <div class="campo"><span>Prioridade</span>
      <div class="segmentado" data-grupo="prioridade">
        ${['alta', 'media', 'baixa'].map((k) => `<button type="button" class="${prioAtual === k ? 'on' : ''}" data-valor="${k}">${PRIORIDADES[k]} <small>${k === 'alta' ? x.pendAlta : k === 'media' ? x.pendMedia : x.pendBaixa} XP</small></button>`).join('')}
      </div>
    </div>
    <div class="campo"><span>Etiqueta</span>
      <div class="chips-linha" data-grupo="etiqueta">
        <button type="button" class="chip ${!etiquetaAtual ? 'on' : ''}" data-etiqueta="">Nenhuma</button>
        ${d.etiquetas.map((t) => `<button type="button" class="chip ${etiquetaAtual === t ? 'on' : ''}" data-etiqueta="${esc(t)}">#${esc(t)}</button>`).join('')}
      </div>
      <input class="entrada" name="novaEtiqueta" maxlength="24" placeholder="Ou crie uma nova etiqueta">
    </div>
    <small class="dica">Concluída depois do prazo vale metade do XP.</small>
    <div class="form-botoes">
      ${!nova ? '<button type="button" class="btn perigo-texto" data-acao="excluir-form">Excluir</button>' : ''}
      <button class="btn primario largo" type="submit">${nova ? 'Adicionar' : 'Salvar'}</button>
    </div>
  </form>`;

  abrirSheet({
    titulo: nova ? 'Nova pendência' : 'Editar pendência',
    html,
    aoMontar(corpo, fechar) {
      const form = corpo.querySelector('form');
      let prioridade = prioAtual;
      let etiqueta = etiquetaAtual;
      if (nova) setTimeout(() => form.elements.titulo.focus(), 320);

      corpo.addEventListener('click', (e) => {
        const bp = e.target.closest('[data-prazo]');
        if (bp) form.elements.prazo.value = bp.dataset.prazo;
        const bpr = e.target.closest('[data-grupo="prioridade"] [data-valor]');
        if (bpr) {
          prioridade = bpr.dataset.valor;
          bpr.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === bpr));
        }
        const be = e.target.closest('[data-etiqueta]');
        if (be) {
          etiqueta = be.dataset.etiqueta;
          be.parentElement.querySelectorAll('[data-etiqueta]').forEach((b) => b.classList.toggle('on', b === be));
          form.elements.novaEtiqueta.value = '';
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const titulo = form.elements.titulo.value.trim();
        if (!titulo) {
          form.elements.titulo.focus();
          return;
        }
        const nova_et = form.elements.novaEtiqueta.value.trim();
        const etq = nova_et || etiqueta;
        const valores = {
          titulo,
          descricao: form.elements.descricao.value.trim(),
          prazo: form.elements.prazo.value || null,
          prioridade,
          etiqueta: etq || '',
        };
        alterar(() => {
          if (nova_et && !d.etiquetas.includes(nova_et)) d.etiquetas.push(nova_et);
          if (nova) d.pendencias.push({ id: uid(), ...valores, criadaEm: Date.now(), concluidaEm: null, lanc: null, xpGanho: 0 });
          else Object.assign(p, valores);
        });
        fechar();
        toast(nova ? 'Pendência adicionada 📌' : 'Pendência atualizada');
      });

      const bx = corpo.querySelector('[data-acao="excluir-form"]');
      if (bx) {
        bx.addEventListener('click', async () => {
          const msg = p.concluidaEm ? 'Excluir esta pendência? O XP que ela deu será mantido.' : 'Excluir esta pendência?';
          if (!(await confirmar(msg, { titulo: 'Excluir', ok: 'Excluir', perigo: true }))) return;
          alterar(() => (d.pendencias = d.pendencias.filter((x) => x.id !== p.id)));
          fechar();
          toast('Pendência excluída');
        });
      }
    },
  });
}
