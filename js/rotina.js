// =============================================================
// rotina.js — aba ROTINA: tarefas diárias recorrentes.
// • Check diário que reinicia sozinho na virada do dia.
// • XP por item + bônus ao completar 100% do dia.
// • Sequência e calendário do mês (cumprido / parcial / falhou).
// =============================================================

import { dados, alterar } from './store.js';
import { hojeKey, esc, uid, MESES, DIAS_LETRA, ORDEM_SEMANA, diaSemana, formatarData, lerNumero, plural } from './utils.js';
import { registroDia, lerDia, valeNoDia, resumoRotina, statusDia, sequenciaRotina, multiplicador, atualizarMelhoresSequencias } from './historico.js';
import { ganharXP, removerXP } from './xp.js';
import {
  abrirSheet, confirmar, toast, vibrar, confete,
  seletorDiasHTML, ligarSeletorDias, lerDias, textoDias,
  seletorEmojiHTML, ligarSeletorEmoji, tornarOrdenavel, reordenarPorIds, vazioHTML,
  ICONE_CHECK, ICONE_ALCA, ICONE_EDITAR, ICONE_LIXO, ICONE_SETA_ESQ, ICONE_SETA_DIR, ICONE_MAIS,
} from './ui.js';
import { anel } from './graficos.js';

let editando = false;
let mesVisto = null; // 'AAAA-MM' exibido no calendário

// -------------------------------------------------------------
// Regras
// -------------------------------------------------------------

/** Marca/desmarca um item da rotina hoje. Desmarcar remove o XP. */
export function alternarItem(id) {
  const d = dados();
  const item = d.rotina.find((i) => i.id === id);
  if (!item) return;
  const hoje = hojeKey();
  if (!valeNoDia(item, hoje)) {
    toast('Este item não vale hoje.');
    return;
  }
  vibrar(10);
  alterar(() => {
    const reg = registroDia(hoje);
    if (reg.rotina[id]) {
      removerXP(reg.rotina[id].lanc);
      delete reg.rotina[id];
    } else {
      const l = ganharXP({ base: item.xp, fonte: 'rotina', ref: id, rotulo: item.nome });
      reg.rotina[id] = { lanc: l.id, ts: Date.now() };
    }
    reavaliarBonusRotina();
    atualizarMelhoresSequencias();
  });
}

/**
 * Garante que o bônus de 100% exista só quando a rotina de hoje está completa.
 * Chamado sempre que algo na rotina muda (marcar, desmarcar, criar, excluir).
 */
export function reavaliarBonusRotina() {
  const d = dados();
  const hoje = hojeKey();
  const reg = registroDia(hoje);
  const r = resumoRotina(hoje);
  const completa = r.total > 0 && r.feitos >= r.total;
  if (completa && !reg.bonusRotina) {
    const l = ganharXP({ base: d.ajustes.xp.rotinaBonus, fonte: 'bonus-rotina', ref: hoje, rotulo: 'Rotina 100%' });
    reg.bonusRotina = l.id;
    setTimeout(() => {
      toast(`Rotina 100%! +${l.xp} XP de bônus 🎉`);
      confete({ quantidade: 80, duracao: 1800 });
    }, 200);
  } else if (!completa && reg.bonusRotina) {
    removerXP(reg.bonusRotina);
    reg.bonusRotina = null;
  }
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
      case 'alternar':
        alternarItem(id);
        break;
      case 'editar-modo':
        editando = !editando;
        render(el);
        break;
      case 'novo':
        abrirFormItem();
        break;
      case 'editar':
        abrirFormItem(dados().rotina.find((i) => i.id === id));
        break;
      case 'excluir':
        excluirItem(id);
        break;
      case 'mes-ant':
      case 'mes-prox':
        mudarMes(b.dataset.acao === 'mes-ant' ? -1 : 1);
        render(el);
        break;
      case 'dia-cal':
        mostrarDia(b.dataset.dia);
        break;
    }
  });
}

export function render(el) {
  const d = dados();
  const hoje = hojeKey();
  const r = resumoRotina(hoje);
  const seq = sequenciaRotina();
  const mult = multiplicador();
  const reg = lerDia(hoje);
  const deHoje = d.rotina.filter((i) => valeNoDia(i, hoje));
  const outros = d.rotina.filter((i) => !valeNoDia(i, hoje));
  if (!d.rotina.length) editando = false;

  let tituloResumo = 'Bora começar!';
  if (r.total === 0) tituloResumo = 'Nada programado hoje';
  else if (r.feitos >= r.total) tituloResumo = 'Rotina completa! 🎉';
  else if (r.feitos > 0) tituloResumo = `Faltam ${r.total - r.feitos}. Você consegue!`;

  const linha = (i) => {
    const feito = !!(reg && reg.rotina[i.id]);
    return `<div class="item-linha ${feito ? 'feito' : ''}">
      <button class="check-circulo ${feito ? 'on' : ''}" data-acao="alternar" data-id="${i.id}" aria-label="${feito ? 'Desmarcar' : 'Marcar'} ${esc(i.nome)}">${ICONE_CHECK}</button>
      <button class="item-info" data-acao="alternar" data-id="${i.id}">
        <span class="item-nome"><span class="item-emoji">${esc(i.emoji || '✅')}</span>${esc(i.nome)}</span>
        <span class="item-sub">${textoDias(i.dias)}</span>
      </button>
      <span class="xp-badge">+${i.xp}</span>
    </div>`;
  };

  const linhaEdicao = (i) => `<div class="item-linha editavel" data-id="${i.id}">
      <span class="alca" aria-label="Arrastar">${ICONE_ALCA}</span>
      <button class="item-info" data-acao="editar" data-id="${i.id}">
        <span class="item-nome"><span class="item-emoji">${esc(i.emoji || '✅')}</span>${esc(i.nome)}</span>
        <span class="item-sub">${textoDias(i.dias)} · ${i.xp} XP</span>
      </button>
      <button class="btn-icone" data-acao="editar" data-id="${i.id}" aria-label="Editar">${ICONE_EDITAR}</button>
      <button class="btn-icone perigo-texto" data-acao="excluir" data-id="${i.id}" aria-label="Excluir">${ICONE_LIXO}</button>
    </div>`;

  let lista;
  if (!d.rotina.length) {
    lista = vazioHTML('🌱', 'Sua rotina está vazia', 'Grandes resultados nascem de pequenos hábitos. Crie o primeiro e comece a pontuar!',
      `<button class="btn primario" data-acao="novo">${ICONE_MAIS} Criar hábito</button>`);
  } else if (editando) {
    lista = `<p class="dica">Arraste pela alça para mudar a ordem. Toque para editar.</p>
      <div class="lista card" id="lista-rotina-edicao">${d.rotina.map(linhaEdicao).join('')}</div>
      <button class="btn secundario largo" data-acao="novo">${ICONE_MAIS} Novo item</button>`;
  } else {
    lista = `
      <h2 class="secao-titulo">Hoje</h2>
      ${deHoje.length ? `<div class="lista card">${deHoje.map(linha).join('')}</div>` : vazioHTML('😌', 'Dia livre', 'Nenhum item programado para hoje. Aproveite para descansar!')}
      ${outros.length ? `<h2 class="secao-titulo">Em outros dias</h2>
        <div class="lista card apagada">${outros.map((i) => `<div class="item-linha">
          <span class="item-emoji grande">${esc(i.emoji || '✅')}</span>
          <button class="item-info" data-acao="editar" data-id="${i.id}"><span class="item-nome">${esc(i.nome)}</span><span class="item-sub">${textoDias(i.dias)}</span></button>
          <span class="xp-badge">+${i.xp}</span></div>`).join('')}</div>` : ''}`;
  }

  el.innerHTML = `
    <header class="cabecalho">
      <h1 class="titulo-tela">Rotina</h1>
      ${d.rotina.length ? `<button class="btn-texto" data-acao="editar-modo">${editando ? 'OK' : 'Editar'}</button>` : ''}
    </header>

    <section class="card resumo-rotina">
      ${anel(r.total ? r.feitos / r.total : 0, { tam: 88, esp: 9, html: `<strong>${r.feitos}</strong><small>/${r.total}</small>` })}
      <div class="resumo-info">
        <div class="resumo-titulo">${tituloResumo}</div>
        <div class="resumo-linhas">
          <span>🔥 ${plural(seq, 'dia seguido', 'dias seguidos')}</span>
          <span>⚡ Multiplicador: ${mult ? `<b class="neon">+${mult}%</b>` : 'inativo'}</span>
          <span>🎁 +${d.ajustes.xp.rotinaBonus} XP ao completar 100%</span>
        </div>
      </div>
    </section>

    ${lista}

    ${d.rotina.length ? calendarioHTML() : ''}
  `;

  const listaEd = el.querySelector('#lista-rotina-edicao');
  if (listaEd) {
    tornarOrdenavel(listaEd, {
      itens: '.item-linha',
      alca: '.alca',
      aoSoltar: (ids) => alterar(() => (dados().rotina = reordenarPorIds(dados().rotina, ids))),
    });
  }
}

function mudarMes(delta) {
  let [a, m] = (mesVisto || hojeKey().slice(0, 7)).split('-').map(Number);
  m += delta;
  if (m < 1) { m = 12; a--; }
  if (m > 12) { m = 1; a++; }
  const novo = `${a}-${String(m).padStart(2, '0')}`;
  if (novo > hojeKey().slice(0, 7)) return;
  mesVisto = novo;
}

/** Calendário do mês com o status de cada dia. */
function calendarioHTML() {
  const hoje = hojeKey();
  if (!mesVisto) mesVisto = hoje.slice(0, 7);
  const [a, m] = mesVisto.split('-').map(Number);
  const primeiro = `${mesVisto}-01`;
  const diasNoMes = new Date(a, m, 0).getDate();
  const vazios = (diaSemana(primeiro) + 6) % 7; // segunda = coluna 0
  const cont = { cumprido: 0, parcial: 0, falhou: 0, protegido: 0 };
  let celulas = '';
  for (let i = 0; i < vazios; i++) celulas += '<span class="cal-dia cal-vazio"></span>';
  for (let dd = 1; dd <= diasNoMes; dd++) {
    const k = `${mesVisto}-${String(dd).padStart(2, '0')}`;
    const st = statusDia(k);
    if (cont[st] !== undefined) cont[st]++;
    celulas += `<button class="cal-dia ${st} ${k === hoje ? 'eh-hoje' : ''}" data-acao="dia-cal" data-dia="${k}" aria-label="${formatarData(k)}">${dd}</button>`;
  }
  const ehMesAtual = mesVisto === hoje.slice(0, 7);
  return `<section class="card calendario">
    <header class="cal-topo">
      <button class="btn-icone" data-acao="mes-ant" aria-label="Mês anterior">${ICONE_SETA_ESQ}</button>
      <h3>${MESES[m - 1].replace(/^./, (c) => c.toUpperCase())} de ${a}</h3>
      <button class="btn-icone" data-acao="mes-prox" aria-label="Próximo mês" ${ehMesAtual ? 'disabled' : ''}>${ICONE_SETA_DIR}</button>
    </header>
    <div class="cal-grade cal-cabecalho">${ORDEM_SEMANA.map((d) => `<span>${DIAS_LETRA[d]}</span>`).join('')}</div>
    <div class="cal-grade">${celulas}</div>
    <div class="cal-legenda">
      <span><i class="cumprido"></i>${cont.cumprido} cumpridos</span>
      <span><i class="parcial"></i>${cont.parcial} parciais</span>
      <span><i class="falhou"></i>${cont.falhou} falhados</span>
      ${cont.protegido ? `<span><i class="protegido"></i>${cont.protegido} com escudo</span>` : ''}
    </div>
  </section>`;
}

function mostrarDia(k) {
  const st = statusDia(k);
  const r = resumoRotina(k);
  const nomes = { protegido: 'protegido pelo escudo 🛡️', cumprido: 'cumprido ✅', parcial: 'parcial', falhou: 'não cumprido', hoje: 'em andamento', neutro: 'sem itens', pre: 'antes de você começar', futuro: 'ainda não chegou' };
  const detalhe = r.total && st !== 'pre' && st !== 'futuro' ? ` (${r.feitos}/${r.total})` : '';
  toast(`${formatarData(k)}: ${nomes[st]}${detalhe}`);
}

async function excluirItem(id) {
  const d = dados();
  const item = d.rotina.find((i) => i.id === id);
  if (!item) return;
  const ok = await confirmar(`Excluir "${item.nome}"? O histórico e o XP já ganho continuam.`, { titulo: 'Excluir item', ok: 'Excluir', perigo: true });
  if (!ok) return;
  alterar(() => {
    d.rotina = d.rotina.filter((i) => i.id !== id);
    reavaliarBonusRotina();
  });
}

// -------------------------------------------------------------
// Formulário (novo / editar)
// -------------------------------------------------------------

export function abrirFormItem(item = null) {
  const d = dados();
  const novo = !item;
  const html = `<form class="form" autocomplete="off">
    <label class="campo"><span>Nome</span>
      <input class="entrada" name="nome" maxlength="60" value="${esc(item ? item.nome : '')}" placeholder="Ex.: Ler 20 minutos" enterkeyhint="done">
    </label>
    <div class="campo"><span>Ícone</span>${seletorEmojiHTML(item ? item.emoji : '✅')}</div>
    <label class="campo"><span>XP por dia cumprido</span>
      <input class="entrada" name="xp" inputmode="numeric" value="${item ? item.xp : d.ajustes.xp.rotinaPadrao}">
    </label>
    <div class="campo"><span>Repetir nos dias</span>
      ${seletorDiasHTML(item ? item.dias : null)}
      <small class="dica">Todos marcados = todo dia. Desmarque os dias em que não vale.</small>
    </div>
    <div class="form-botoes">
      ${!novo ? '<button type="button" class="btn perigo-texto" data-acao="excluir-form">Excluir</button>' : ''}
      <button class="btn primario largo" type="submit">${novo ? 'Adicionar' : 'Salvar'}</button>
    </div>
  </form>`;

  abrirSheet({
    titulo: novo ? 'Novo item da rotina' : 'Editar item',
    html,
    aoMontar(corpo, fechar) {
      ligarSeletorDias(corpo);
      ligarSeletorEmoji(corpo);
      const form = corpo.querySelector('form');
      if (novo) setTimeout(() => form.elements.nome.focus(), 320);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = form.elements.nome.value.trim();
        if (!nome) {
          form.elements.nome.focus();
          return;
        }
        const xp = Math.max(0, Math.round(lerNumero(form.elements.xp.value, d.ajustes.xp.rotinaPadrao)));
        const dias = lerDias(corpo);
        const emoji = form.elements.emoji.value.trim() || '✅';
        alterar(() => {
          if (novo) d.rotina.push({ id: uid(), nome, emoji, xp, dias, criadoEm: hojeKey() });
          else Object.assign(item, { nome, emoji, xp, dias, exemplo: false });
          reavaliarBonusRotina();
        });
        fechar();
        toast(novo ? 'Item adicionado à rotina ✅' : 'Item atualizado');
      });
      const bx = corpo.querySelector('[data-acao="excluir-form"]');
      if (bx) {
        bx.addEventListener('click', async () => {
          fechar();
          await excluirItem(item.id);
        });
      }
    },
  });
}
