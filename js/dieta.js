// =============================================================
// dieta.js — DIETA (fica na aba Treinos, ao lado das fichas).
// • Plano alimentar: refeições com horário, alimentos (quantidade e
//   nome), calorias e proteína opcionais, dias da semana e observações.
// • Hoje: "Próxima refeição" em destaque, lista em ordem de horário e
//   botão "✓ Comi" — o check reinicia sozinho a cada dia.
// • XP: cada refeição vale XP (cheio até 1h depois do horário) e
//   cumprir a dieta inteira do dia dá um bônus.
// • As refeições também aparecem no "Plano de hoje" (tela Hoje).
// Dados: d.dieta (plano e metas) e d.diario[dia].refeicoes (marcações).
// =============================================================

import { dados, alterar } from './store.js';
import { hojeKey, esc, uid, diasDaSemana, DIAS_LETRA, diaSemana, lerNumero, plural, horaAtual, somarMinutos, formatarNumero } from './utils.js';
import { registroDia, lerDia, valeNoDia, fatorHorario, xpComHorario } from './historico.js';
import { ganharXP, removerXP } from './xp.js';
import {
  abrirSheet, confirmar, toast, vibrar, confete,
  seletorDiasHTML, ligarSeletorDias, lerDias, textoDias, vazioHTML,
  ICONE_CHECK, ICONE_LIXO, ICONE_MAIS, ICONE_EDITAR, ICONE_SETA_DIR,
} from './ui.js';
import { anel } from './graficos.js';

/** Tolerância: comer até 1h depois do horário vale XP cheio. */
const TOLERANCIA_MIN = 60;
/** A refeição "chama" a partir de 30 min antes do horário. */
const ANTECEDENCIA_MIN = 30;

const NOMES_SUGERIDOS = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Pré-treino', 'Pós-treino', 'Jantar', 'Ceia'];
const EMOJIS_COMIDA = ['🍳', '☕', '🥣', '🍌', '🍎', '🥪', '🍽️', '🍛', '🥗', '🍗', '🥩', '🐟', '🍚', '🥑', '🥛', '🧃', '🥤', '🍝', '🥜', '🍓'];
const EMOJI_DO_NOME = {
  'café da manhã': '🍳', 'lanche da manhã': '🍎', almoço: '🍛', 'lanche da tarde': '🥪',
  'pré-treino': '🍌', 'pós-treino': '🥤', jantar: '🍽️', ceia: '🥛',
};

/** Modelo para quem quer começar rápido (dá para editar tudo depois). */
const MODELO = [
  { nome: 'Café da manhã', emoji: '🍳', horario: '07:00', itens: [['2', 'ovos mexidos'], ['1 fatia', 'pão integral'], ['1', 'fruta'], ['1 xícara', 'café sem açúcar']] },
  { nome: 'Lanche da manhã', emoji: '🍎', horario: '10:00', itens: [['1', 'iogurte natural'], ['1 punhado', 'castanhas']] },
  { nome: 'Almoço', emoji: '🍛', horario: '12:30', itens: [['4 col.', 'arroz'], ['1 concha', 'feijão'], ['150 g', 'frango grelhado'], ['à vontade', 'salada']] },
  { nome: 'Lanche da tarde', emoji: '🥪', horario: '16:00', itens: [['1', 'sanduíche natural'], ['1', 'fruta']] },
  { nome: 'Jantar', emoji: '🍽️', horario: '19:30', itens: [['150 g', 'proteína (carne, frango ou peixe)'], ['à vontade', 'legumes'], ['1', 'batata-doce média']] },
  { nome: 'Ceia', emoji: '🥛', horario: '22:00', itens: [['1 copo', 'leite ou chá']] },
];

// -------------------------------------------------------------
// Regras e consultas
// -------------------------------------------------------------

const emMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
};
const porHorario = (a, b) => (a.horario || '99:99').localeCompare(b.horario || '99:99');

/** Horário até o qual a refeição vale XP cheio. */
export function limiteRefeicao(r) {
  return r.horario ? somarMinutos(r.horario, TOLERANCIA_MIN) : null;
}

/** Refeições do plano que valem no dia (em ordem de horário). */
export function refeicoesDoDia(dia = hojeKey()) {
  return dados().dieta.refeicoes.filter((r) => valeNoDia(r, dia)).sort(porHorario);
}

/** Marcação de uma refeição no dia (ou null). */
export function marcaRefeicao(id, dia = hojeKey()) {
  const reg = lerDia(dia);
  return (reg && reg.refeicoes && reg.refeicoes[id]) || null;
}

/** { total, feitas, kcal, proteina, kcalPlano, proteinaPlano } do dia. */
export function resumoDieta(dia = hojeKey()) {
  const lista = refeicoesDoDia(dia);
  const r = { total: lista.length, feitas: 0, kcal: 0, proteina: 0, kcalPlano: 0, proteinaPlano: 0 };
  for (const x of lista) {
    r.kcalPlano += x.kcal || 0;
    r.proteinaPlano += x.proteina || 0;
    if (marcaRefeicao(x.id, dia)) {
      r.feitas++;
      r.kcal += x.kcal || 0;
      r.proteina += x.proteina || 0;
    }
  }
  return r;
}

/** Quantas refeições de hoje ainda faltam. */
export function faltamHoje() {
  const r = resumoDieta();
  return Math.max(0, r.total - r.feitas);
}

/**
 * Situação de uma refeição agora:
 * 'feita' | 'cedo' (falta mais de 30 min) | 'logo' (até 30 min) |
 * 'agora' (passou do horário, dentro da tolerância) | 'atrasada'
 */
export function situacao(r, agora = horaAtual()) {
  if (marcaRefeicao(r.id)) return { tipo: 'feita', texto: 'feita ✓' };
  if (!r.horario) return { tipo: 'cedo', texto: 'qualquer hora' };
  const dif = emMin(r.horario) - emMin(agora); // minutos até o horário
  if (dif > ANTECEDENCIA_MIN) {
    const h = Math.floor(dif / 60);
    const m = dif % 60;
    return { tipo: 'cedo', texto: h ? `em ${h}h${m ? String(m).padStart(2, '0') : ''}` : `em ${m} min`, falta: dif };
  }
  if (dif > 0) return { tipo: 'logo', texto: `em ${dif} min`, falta: dif };
  const f = fatorHorario(limiteRefeicao(r), agora);
  if (f.noPrazo) return { tipo: 'agora', texto: dif === 0 ? 'hora de comer!' : `hora de comer · ${-dif} min`, falta: 0 };
  return { tipo: 'atrasada', texto: `atrasada · ${f.pct}% do XP`, pct: f.pct };
}

/**
 * Refeição em destaque: a próxima (ou a da hora) ainda não feita hoje.
 * Se só sobraram atrasadas, mostra a mais recente delas.
 */
export function proximaRefeicao() {
  const pendentes = refeicoesDoDia().filter((r) => !marcaRefeicao(r.id));
  return pendentes.find((r) => situacao(r).tipo !== 'atrasada') || pendentes[pendentes.length - 1] || null;
}

/** Refeição que está "chamando" agora (para o aviso na barra de abas). */
export function refeicaoAgora() {
  return refeicoesDoDia().find((r) => {
    const s = situacao(r);
    return s.tipo === 'logo' || s.tipo === 'agora';
  }) || null;
}

/** XP que a refeição vale agora. */
export function xpRefeicaoAgora(r) {
  return xpComHorario(dados().ajustes.xp.refeicao, limiteRefeicao(r));
}

/** Marca/desmarca uma refeição hoje. Desmarcar remove o XP. */
export function alternarRefeicao(id) {
  const d = dados();
  const r = d.dieta.refeicoes.find((x) => x.id === id);
  if (!r) return;
  const hoje = hojeKey();
  if (!valeNoDia(r, hoje)) {
    toast('Esta refeição não está no plano de hoje.');
    return;
  }
  vibrar(10);
  alterar(() => {
    const reg = registroDia(hoje);
    reg.refeicoes ||= {};
    if (reg.refeicoes[id]) {
      removerXP(reg.refeicoes[id].lanc);
      delete reg.refeicoes[id];
    } else {
      const lim = limiteRefeicao(r);
      const f = fatorHorario(lim);
      const l = ganharXP({ base: xpRefeicaoAgora(r), fonte: 'refeicao', ref: id, rotulo: r.nome });
      reg.refeicoes[id] = { lanc: l.id, ts: Date.now(), fator: f.fator, comHorario: !!r.horario };
      if (r.horario && !f.noPrazo) setTimeout(() => toast(`Passou do horário (${r.horario}): valeu ${f.pct}% do XP ⏰`), 120);
    }
    reavaliarBonusDieta();
  });
}

/** O bônus "Dieta 100%" existe só enquanto todas as refeições de hoje estão feitas. */
export function reavaliarBonusDieta() {
  const d = dados();
  const hoje = hojeKey();
  const reg = registroDia(hoje);
  const r = resumoDieta(hoje);
  const completa = r.total > 0 && r.feitas >= r.total;
  if (completa && !reg.bonusDieta) {
    const l = ganharXP({ base: d.ajustes.xp.dietaBonus, fonte: 'bonus-dieta', ref: hoje, rotulo: 'Dieta 100%' });
    reg.bonusDieta = l.id;
    setTimeout(() => {
      toast(`Dieta do dia completa! +${l.xp} XP de bônus 🥗`);
      confete({ quantidade: 70, duracao: 1600 });
    }, 200);
  } else if (!completa && reg.bonusDieta) {
    removerXP(reg.bonusDieta);
    reg.bonusDieta = null;
  }
}

/** Texto curto dos alimentos: "2 ovos · 1 fatia pão integral". */
function textoItens(r, max = 3) {
  const itens = r.itens || [];
  if (!itens.length) return '';
  const partes = itens.slice(0, max).map((i) => `${i.qtd ? `${i.qtd} ` : ''}${i.nome}`);
  return partes.join(' · ') + (itens.length > max ? ` · +${itens.length - max}` : '');
}

function textoMacros(r) {
  const p = [];
  if (r.kcal) p.push(`${formatarNumero(r.kcal)} kcal`);
  if (r.proteina) p.push(`${formatarNumero(r.proteina)} g prot.`);
  return p.join(' · ');
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
      case 'refeicao-marcar':
        alternarRefeicao(id);
        break;
      case 'refeicao-ver':
        abrirRefeicao(id);
        break;
      case 'refeicao-editar':
        abrirFormRefeicao(dados().dieta.refeicoes.find((r) => r.id === id));
        break;
      case 'refeicao-nova':
        abrirFormRefeicao();
        break;
      case 'dieta-modelo':
        usarModelo();
        break;
      case 'dieta-metas':
        abrirMetas();
        break;
    }
  });
}

export function render(el) {
  const d = dados();
  const dieta = d.dieta;
  const hoje = hojeKey();
  const deHoje = refeicoesDoDia(hoje);
  const outros = dieta.refeicoes.filter((r) => !valeNoDia(r, hoje)).sort(porHorario);
  const res = resumoDieta(hoje);
  const prox = proximaRefeicao();

  if (!dieta.refeicoes.length) {
    el.innerHTML = `<header class="cabecalho"><h1 class="titulo-tela">Dieta</h1></header>
      ${vazioHTML('🥗', 'Monte seu plano alimentar', 'Coloque suas refeições, horários e o que comer em cada uma. O app avisa a próxima refeição e cada uma cumprida vale XP.',
        `<div class="botoes-coluna">
          <button class="btn primario" data-acao="refeicao-nova">${ICONE_MAIS} Criar refeição</button>
          <button class="btn secundario" data-acao="dieta-modelo">Usar um modelo (6 refeições)</button>
        </div>`)}`;
    return;
  }

  // ---------- destaque: próxima refeição ----------
  let destaque;
  if (!deHoje.length) {
    destaque = `<section class="card destaque-treino destaque-dieta">
      <small class="rotulo-neon">DIETA DE HOJE</small>
      <h2 class="gradiente-texto">Dia livre</h2>
      <p>Nenhuma refeição do plano vale hoje.</p>
    </section>`;
  } else if (!prox) {
    destaque = `<section class="card destaque-treino destaque-dieta completa">
      <small class="rotulo-neon">DIETA DE HOJE</small>
      <h2 class="gradiente-texto">Tudo certo! 🎉</h2>
      <p>Você cumpriu as ${res.total} refeições de hoje${res.kcal ? ` · ${formatarNumero(res.kcal)} kcal` : ''}.</p>
    </section>`;
  } else {
    const s = situacao(prox);
    const rotulo = s.tipo === 'agora' ? '● HORA DE COMER' : s.tipo === 'atrasada' ? '⚠️ REFEIÇÃO ATRASADA' : 'PRÓXIMA REFEIÇÃO';
    destaque = `<section class="card destaque-treino destaque-dieta ${s.tipo === 'agora' || s.tipo === 'logo' ? 'andamento' : ''} ${s.tipo === 'atrasada' ? 'atrasada' : ''}">
      <small class="rotulo-neon">${rotulo}</small>
      <div class="dieta-prox-topo">
        <span class="dieta-emoji">${esc(prox.emoji || '🍽️')}</span>
        <div>
          <h2 class="gradiente-texto">${esc(prox.nome)}</h2>
          <p>${prox.horario ? `às <b>${prox.horario}</b> · ` : ''}${esc(s.texto)}</p>
        </div>
      </div>
      ${(prox.itens || []).length ? `<ul class="lista-ex-resumo">
        ${prox.itens.map((i) => `<li><span>${esc(i.nome)}</span><small>${esc(i.qtd || '')}</small></li>`).join('')}
      </ul>` : ''}
      ${textoMacros(prox) ? `<small class="dieta-macros">${textoMacros(prox)}</small>` : ''}
      ${prox.obs ? `<p class="dieta-obs">📝 ${esc(prox.obs)}</p>` : ''}
      <div class="botoes-linha">
        <button class="btn primario largo" data-acao="refeicao-marcar" data-id="${prox.id}">${ICONE_CHECK} Comi · +${xpRefeicaoAgora(prox)} XP</button>
      </div>
    </section>`;
  }

  // ---------- resumo do dia ----------
  const metaK = dieta.metaKcal || 0;
  const metaP = dieta.metaProteina || 0;
  const linhaMeta = (rot, feito, plano, meta, un) => {
    if (!meta && !plano) return '';
    const alvo = meta || plano;
    return `<div class="dieta-meta-linha">
      <span>${rot}</span><b>${formatarNumero(feito)}<small> / ${formatarNumero(alvo)} ${un}</small></b>
      <div class="barra fina"><div class="barra-fill" style="width:${Math.min(100, alvo ? (feito / alvo) * 100 : 0)}%"></div></div>
    </div>`;
  };
  const dias = diasDaSemana(hoje);
  const semana = dias.map((dia) => {
    const r = dia <= hoje ? resumoDieta(dia) : null;
    let cls = '';
    if (r && r.total) cls = r.feitas >= r.total ? 'on' : r.feitas > 0 ? 'meio' : '';
    return `<span class="${cls} ${dia === hoje ? 'hoje' : ''}" title="${r ? `${r.feitas}/${r.total}` : ''}">${DIAS_LETRA[diaSemana(dia)]}</span>`;
  }).join('');

  const resumo = `<section class="card meta-semana resumo-dieta">
    ${anel(res.total ? res.feitas / res.total : 0, { tam: 76, esp: 8, html: `<strong>${res.feitas}</strong><small>/${res.total}</small>` })}
    <div class="meta-info">
      <div class="resumo-titulo">${!res.total ? 'Sem refeições hoje' : res.feitas >= res.total ? 'Dieta de hoje completa! 🥗' : `Faltam ${plural(res.total - res.feitas, 'refeição', 'refeições')}`}</div>
      ${linhaMeta('🔥 Calorias', res.kcal, res.kcalPlano, metaK, 'kcal')}
      ${linhaMeta('💪 Proteína', res.proteina, res.proteinaPlano, metaP, 'g')}
      <div class="semana-pontos">${semana}</div>
      <button class="btn-texto" data-acao="dieta-metas">${metaK || metaP ? 'Alterar metas' : 'Definir metas'}</button>
    </div>
  </section>`;

  // ---------- lista de hoje ----------
  const linha = (r) => {
    const marca = marcaRefeicao(r.id);
    const feito = !!marca;
    const s = situacao(r);
    const atrasado = s.tipo === 'atrasada';
    let sub = textoItens(r) || 'toque para ver os detalhes';
    if (feito && marca.comHorario && marca.fator < 1) sub = `✓ com atraso · ${Math.round(marca.fator * 100)}% do XP`;
    const macros = textoMacros(r);
    return `<div class="item-linha ${feito ? 'feito' : ''} ${atrasado ? 'atrasado' : ''}">
      <button class="check-circulo ${feito ? 'on' : ''}" data-acao="refeicao-marcar" data-id="${r.id}" aria-label="${feito ? 'Desmarcar' : 'Marcar'} ${esc(r.nome)}">${ICONE_CHECK}</button>
      <button class="item-info" data-acao="refeicao-ver" data-id="${r.id}">
        <span class="item-nome"><span class="item-emoji">${esc(r.emoji || '🍽️')}</span>${esc(r.nome)}</span>
        <span class="item-sub ${atrasado ? 'texto-atraso' : ''}">${esc(sub)}${macros && !feito ? ` · ${macros}` : ''}</span>
      </button>
      ${r.horario ? `<span class="hora-chip ${feito ? '' : atrasado ? 'atrasado' : s.tipo === 'logo' || s.tipo === 'agora' ? 'perto' : ''}">${r.horario}</span>` : ''}
      <span class="xp-badge ${atrasado ? 'reduzido' : ''}">${feito ? '' : `+${xpRefeicaoAgora(r)}`}</span>
    </div>`;
  };

  el.innerHTML = `
    <header class="cabecalho"><h1 class="titulo-tela">Dieta</h1></header>
    ${destaque}
    ${resumo}
    <div class="secao-cab">
      <h2 class="secao-titulo">Refeições de hoje</h2>
      <button class="btn-texto" data-acao="refeicao-nova">${ICONE_MAIS} Refeição</button>
    </div>
    ${deHoje.length ? `<div class="lista card">${deHoje.map(linha).join('')}</div>` : vazioHTML('😌', 'Dia livre', 'Nenhuma refeição programada para hoje.')}
    <p class="dica">Comer até 1h depois do horário vale XP cheio (+${d.ajustes.xp.refeicao}). Todas as refeições do dia: +${d.ajustes.xp.dietaBonus} XP de bônus.</p>
    ${outros.length ? `<h2 class="secao-titulo">Em outros dias</h2>
      <div class="lista card apagada">${outros.map((r) => `<button class="item-linha clicavel" data-acao="refeicao-ver" data-id="${r.id}">
        <span class="item-emoji grande">${esc(r.emoji || '🍽️')}</span>
        <span class="item-info"><span class="item-nome">${esc(r.nome)}</span><span class="item-sub">${textoDias(r.dias)}${r.horario ? ` · ${r.horario}` : ''}</span></span>
        ${ICONE_SETA_DIR}
      </button>`).join('')}</div>` : ''}
    <button class="btn secundario largo" data-acao="refeicao-nova">${ICONE_MAIS} Nova refeição</button>
  `;
}

// -------------------------------------------------------------
// Folhas: detalhes, formulário, metas
// -------------------------------------------------------------

function abrirRefeicao(id) {
  const r = dados().dieta.refeicoes.find((x) => x.id === id);
  if (!r) return;
  const hoje = valeNoDia(r, hojeKey());
  const feito = !!marcaRefeicao(r.id);
  abrirSheet({
    titulo: `${r.emoji || '🍽️'} ${r.nome}`,
    html: `<p class="dica">${r.horario ? `⏰ ${r.horario} · ` : ''}${textoDias(r.dias)}${textoMacros(r) ? ` · ${textoMacros(r)}` : ''}</p>
      ${(r.itens || []).length ? `<div class="lista card">${r.itens.map((i) => `<div class="item-linha">
          <span class="item-info"><span class="item-nome">${esc(i.nome)}</span></span>
          ${i.qtd ? `<strong class="valor">${esc(i.qtd)}</strong>` : ''}
        </div>`).join('')}</div>` : '<p class="dica">Nenhum alimento cadastrado nesta refeição.</p>'}
      ${r.obs ? `<div class="card dieta-obs-card">📝 ${esc(r.obs)}</div>` : ''}
      <div class="form-botoes">
        <button class="btn secundario" data-r-editar>${ICONE_EDITAR} Editar</button>
        ${hoje ? `<button class="btn ${feito ? 'secundario' : 'primario'} largo" data-r-marcar>${feito ? 'Desmarcar' : `${ICONE_CHECK} Comi`}</button>` : ''}
      </div>`,
    aoMontar(corpo, fechar) {
      corpo.addEventListener('click', (e) => {
        if (e.target.closest('[data-r-editar]')) {
          fechar();
          setTimeout(() => abrirFormRefeicao(r), 200);
        }
        if (e.target.closest('[data-r-marcar]')) {
          fechar();
          alternarRefeicao(r.id);
        }
      });
    },
  });
}

export function abrirFormRefeicao(ref = null) {
  const d = dados();
  const nova = !ref;
  const v = ref || { nome: '', emoji: '🍽️', horario: '', itens: [], kcal: 0, proteina: 0, dias: null, obs: '' };
  let emojiEscolhido = !nova; // se a pessoa escolher, o nome não troca mais o emoji

  const alimentoHTML = (i = { qtd: '', nome: '' }) => `<div class="alimento-linha">
      <input class="entrada" name="a-qtd" maxlength="20" value="${esc(i.qtd || '')}" placeholder="Qtd." aria-label="Quantidade">
      <input class="entrada" name="a-nome" maxlength="60" value="${esc(i.nome || '')}" placeholder="Alimento" aria-label="Alimento">
      <button type="button" class="btn-icone perigo-texto" data-a-remover aria-label="Remover alimento">${ICONE_LIXO}</button>
    </div>`;

  abrirSheet({
    titulo: nova ? 'Nova refeição' : 'Editar refeição',
    html: `<form class="form" autocomplete="off">
        <label class="campo"><span>Nome</span>
          <input class="entrada" name="nome" maxlength="40" value="${esc(v.nome)}" placeholder="Ex.: Almoço">
        </label>
        <div class="chips-linha">${NOMES_SUGERIDOS.map((n) => `<button type="button" class="chip" data-nome="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <div class="campo"><span>Ícone</span>
          <div class="emoji-linha">
            <input class="entrada emoji-entrada" name="emoji" value="${esc(v.emoji || '🍽️')}" maxlength="4" aria-label="Emoji">
            <div class="emoji-sugestoes">${EMOJIS_COMIDA.map((e) => `<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div>
          </div>
        </div>
        <div class="campo"><span>Horário</span>
          <input class="entrada" type="time" name="horario" value="${esc(v.horario || '')}">
          <small class="dica">Até 1h depois do horário vale XP cheio. Depois: 75%, 50% e 25%.</small>
        </div>
        <div class="campo"><span>O que comer</span>
          <div class="alimentos">${(v.itens.length ? v.itens : [undefined]).map((i) => alimentoHTML(i)).join('')}</div>
          <button type="button" class="btn secundario largo" data-a-novo>${ICONE_MAIS} Adicionar alimento</button>
        </div>
        <div class="grade-campos">
          <label class="campo"><span>Calorias (kcal)</span><input class="entrada" name="kcal" inputmode="numeric" value="${v.kcal || ''}" placeholder="opcional"></label>
          <label class="campo"><span>Proteína (g)</span><input class="entrada" name="proteina" inputmode="numeric" value="${v.proteina || ''}" placeholder="opcional"></label>
        </div>
        <label class="campo"><span>Observações</span>
          <textarea class="entrada" name="obs" rows="2" maxlength="300" placeholder="Ex.: pode trocar o frango por peixe">${esc(v.obs || '')}</textarea>
        </label>
        <div class="campo"><span>Dias da semana</span>
          ${seletorDiasHTML(v.dias)}
          <small class="dica">Todos marcados = todo dia.</small>
        </div>
        <div class="form-botoes">
          ${!nova ? '<button type="button" class="btn perigo-texto" data-r-excluir>Excluir</button>' : ''}
          <button class="btn primario largo" type="submit">${nova ? 'Adicionar' : 'Salvar'}</button>
        </div>
      </form>`,
    aoMontar(corpo, fechar) {
      ligarSeletorDias(corpo);
      const form = corpo.querySelector('form');
      const lista = corpo.querySelector('.alimentos');
      if (nova) setTimeout(() => form.elements.nome.focus(), 320);

      corpo.addEventListener('click', async (e) => {
        const n = e.target.closest('[data-nome]');
        if (n) {
          form.elements.nome.value = n.dataset.nome;
          const em = EMOJI_DO_NOME[n.dataset.nome.toLowerCase()];
          if (em && !emojiEscolhido) form.elements.emoji.value = em;
        }
        const em = e.target.closest('[data-emoji]');
        if (em) {
          form.elements.emoji.value = em.dataset.emoji;
          emojiEscolhido = true;
        }
        if (e.target.closest('[data-a-novo]')) {
          lista.insertAdjacentHTML('beforeend', alimentoHTML());
          const ultimos = lista.querySelectorAll('[name="a-qtd"]');
          ultimos[ultimos.length - 1].focus();
        }
        const rm = e.target.closest('[data-a-remover]');
        if (rm) {
          const linhaA = rm.closest('.alimento-linha');
          if (lista.children.length > 1) linhaA.remove();
          else linhaA.querySelectorAll('input').forEach((i) => (i.value = ''));
        }
        if (e.target.closest('[data-r-excluir]')) {
          if (!(await confirmar(`Excluir "${ref.nome}" do plano? O XP já ganho continua.`, { titulo: 'Excluir refeição', ok: 'Excluir', perigo: true }))) return;
          alterar(() => {
            d.dieta.refeicoes = d.dieta.refeicoes.filter((x) => x.id !== ref.id);
            reavaliarBonusDieta();
          });
          fechar();
          toast('Refeição excluída');
        }
      });
      form.elements.emoji.addEventListener('input', () => (emojiEscolhido = true));

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = form.elements.nome.value.trim();
        if (!nome) {
          form.elements.nome.focus();
          return;
        }
        const itens = [...lista.querySelectorAll('.alimento-linha')]
          .map((l) => ({ qtd: l.querySelector('[name="a-qtd"]').value.trim(), nome: l.querySelector('[name="a-nome"]').value.trim() }))
          .filter((i) => i.nome)
          .map((i) => ({ id: uid(), ...i }));
        const dados_ = {
          nome,
          emoji: form.elements.emoji.value.trim() || '🍽️',
          horario: form.elements.horario.value || null,
          itens,
          kcal: Math.max(0, Math.round(lerNumero(form.elements.kcal.value, 0))),
          proteina: Math.max(0, Math.round(lerNumero(form.elements.proteina.value, 0))),
          obs: form.elements.obs.value.trim(),
          dias: lerDias(corpo),
        };
        alterar(() => {
          if (nova) d.dieta.refeicoes.push({ id: uid(), criadoEm: hojeKey(), ...dados_ });
          else Object.assign(ref, dados_);
          reavaliarBonusDieta();
        });
        fechar();
        toast(nova ? 'Refeição adicionada 🥗' : 'Refeição salva');
      });
    },
  });
}

async function usarModelo() {
  const d = dados();
  if (d.dieta.refeicoes.length && !(await confirmar('Adicionar as 6 refeições do modelo ao seu plano?', { titulo: 'Usar modelo', ok: 'Adicionar' }))) return;
  alterar(() => {
    for (const m of MODELO) {
      d.dieta.refeicoes.push({
        id: uid(), criadoEm: hojeKey(), nome: m.nome, emoji: m.emoji, horario: m.horario,
        itens: m.itens.map(([qtd, nome]) => ({ id: uid(), qtd, nome })), kcal: 0, proteina: 0, obs: '', dias: null,
      });
    }
    reavaliarBonusDieta();
  });
  toast('Modelo adicionado! Toque numa refeição para ajustar ao seu plano ✏️', { duracao: 4500 });
}

function abrirMetas() {
  const d = dados();
  abrirSheet({
    titulo: 'Metas da dieta',
    html: `<form class="form" autocomplete="off">
        <div class="grade-campos">
          <label class="campo"><span>Calorias por dia (kcal)</span><input class="entrada" name="kcal" inputmode="numeric" value="${d.dieta.metaKcal || ''}" placeholder="Ex.: 2200"></label>
          <label class="campo"><span>Proteína por dia (g)</span><input class="entrada" name="proteina" inputmode="numeric" value="${d.dieta.metaProteina || ''}" placeholder="Ex.: 140"></label>
        </div>
        <p class="dica">Deixe em branco para usar a soma das refeições do plano. As calorias e a proteína de cada refeição são contadas quando você marca "Comi".</p>
        <button class="btn primario largo" type="submit">Salvar</button>
      </form>`,
    aoMontar(corpo, fechar) {
      const form = corpo.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        alterar(() => {
          d.dieta.metaKcal = Math.max(0, Math.round(lerNumero(form.elements.kcal.value, 0)));
          d.dieta.metaProteina = Math.max(0, Math.round(lerNumero(form.elements.proteina.value, 0)));
        });
        fechar();
        toast('Metas salvas 🎯');
      });
    },
  });
}
