// =============================================================
// painel.js — aba HOJE: placar do jogador + painel de BLOCOS
// no estilo dos widgets do iPhone.
// • Modo "Editar painel": ligar/desligar, arrastar para reordenar
//   e escolher tamanho (pequeno = meia largura, grande = largura toda).
// • Blocos de check personalizados (ex.: Quarto arrumado).
// Para criar um TIPO novo de bloco: adicione em TIPOS e em BLOCOS_FIXOS
// (seed.js) e escreva a função de conteúdo em CONTEUDO.
// =============================================================

import { dados, alterar } from './store.js';
import {
  hojeKey, esc, uid, saudacao, DIAS_LONGOS, DIAS_LETRA, formatarData, formatarMoeda, formatarHora,
  horaAtual, diasDaSemana, diaSemana, lerNumero, plural, MESES,
} from './utils.js';
import { registroDia, lerDia, valeNoDia, resumoRotina, sequenciaRotina, multiplicador, checkFeito, sequenciaCheck, atualizarMelhoresSequencias, itensRotinaDoDia } from './historico.js';
import { ganharXP, removerXP, nivelInfo, xpDoDia } from './xp.js';
import { alternarItem } from './rotina.js';
import { contagens, listar, concluir } from './pendencias.js';
import { proximaFicha, treinosNaSemana, iniciarTreino, abrirTreinoAtivo } from './treinos.js';
import { aguaHoje, adicionarAgua, ultimaNota, abrirNotas, comprasFaltando, abrirCompras, totalGastosMes, abrirGastos } from './extras.js';
import { anel, barras } from './graficos.js';
import {
  abrirSheet, confirmar, toast, vibrar, tornarOrdenavel, reordenarPorIds, vazioHTML,
  seletorDiasHTML, ligarSeletorDias, lerDias, textoDias, seletorEmojiHTML, ligarSeletorEmoji,
  ICONE_ALCA, ICONE_OLHO, ICONE_OLHO_OFF, ICONE_EDITAR, ICONE_MAIS, ICONE_MENOS, ICONE_CHECK,
} from './ui.js';
import { irPara } from './nav.js';
import { BLOCOS_FIXOS } from './seed.js';
import { companheiro, avatarHTML, humor, fala } from './personagens.js';
import { missoesDoDia, resgatarMissao, bauDisponivel, abrirBau, ligaAtual, LIGAS } from './missoes.js';
import { pocaoAtiva } from './xp.js';
import { tocar } from './sons.js';
import { confete, celebrar } from './ui.js';

let editando = false;
let ultimoPctXP = null; // para animar a barra de XP enchendo
let variacaoFala = 0; // muda a fala do companheiro a cada toque

/** Nome e emoji de cada tipo de bloco fixo. */
const TIPOS = {
  missoes: { nome: 'Missões do dia', emoji: '🎯' },
  liga: { nome: 'Liga da semana', emoji: '🏆' },
  rotina: { nome: 'Rotina do dia', emoji: '✅' },
  pendencias: { nome: 'Pendências', emoji: '📌' },
  treino: { nome: 'Treino do dia', emoji: '🏋️' },
  metaTreinos: { nome: 'Meta semanal', emoji: '🎯' },
  agua: { nome: 'Água', emoji: '💧' },
  notas: { nome: 'Notas rápidas', emoji: '🗒️' },
  compras: { nome: 'Compras', emoji: '🛒' },
  gastos: { nome: 'Gastos do mês', emoji: '💸' },
  sequencia: { nome: 'Sequência', emoji: '🔥' },
  semanaXP: { nome: 'Pontuação da semana', emoji: '📊' },
};

/** Garante que todo bloco fixo e todo check tenham sua entrada no painel. */
export function sincronizarBlocos() {
  const d = dados();
  let mudou = false;
  for (const b of BLOCOS_FIXOS) {
    if (b.tipo === 'check') continue;
    if (!d.painel.some((x) => x.tipo === b.tipo)) {
      const novo = { id: `b-${b.tipo}`, tipo: b.tipo, ativo: b.ativo, tamanho: b.tamanho };
      if (b.inicio) d.painel.unshift(novo);
      else d.painel.push(novo);
      mudou = true;
    }
  }
  for (const c of d.checks) {
    if (!d.painel.some((x) => x.tipo === 'check' && x.ref === c.id)) {
      d.painel.splice(1, 0, { id: `b-${c.id}`, tipo: 'check', ref: c.id, ativo: true, tamanho: 'p' });
      mudou = true;
    }
  }
  const antes = d.painel.length;
  d.painel = d.painel.filter((b) => b.tipo !== 'check' || d.checks.some((c) => c.id === b.ref));
  if (d.painel.length !== antes) mudou = true;
  return mudou;
}

// -------------------------------------------------------------
// Blocos de check
// -------------------------------------------------------------

/** XP que o check vale AGORA (metade depois do horário-limite). */
function xpCheckAgora(c) {
  if (c.horaLimite && horaAtual() > c.horaLimite) return Math.round(c.xp / 2);
  return c.xp;
}

/** Marca/desmarca um bloco de check hoje. */
export function alternarCheck(id) {
  const d = dados();
  const c = d.checks.find((x) => x.id === id);
  if (!c) return;
  const hoje = hojeKey();
  if (!valeNoDia(c, hoje)) {
    toast(`"${c.nome}" não vale hoje. Folga! 😌`);
    return;
  }
  vibrar(12);
  alterar(() => {
    const reg = registroDia(hoje);
    if (reg.checks[c.id]) {
      removerXP(reg.checks[c.id].lanc);
      if (reg.checks[c.id].noPrazo) d.stats.checksCedo = Math.max(0, (d.stats.checksCedo || 0) - 1);
      delete reg.checks[c.id];
    } else {
      const atrasado = c.horaLimite && horaAtual() > c.horaLimite;
      const l = ganharXP({ base: xpCheckAgora(c), fonte: 'check', ref: c.id, rotulo: c.nome });
      const noPrazo = !!c.horaLimite && !atrasado;
      reg.checks[c.id] = { lanc: l.id, ts: Date.now(), noPrazo };
      if (noPrazo) d.stats.checksCedo = (d.stats.checksCedo || 0) + 1;
      if (atrasado) setTimeout(() => toast(`Depois das ${c.horaLimite} vale metade do XP`), 100);
    }
    atualizarMelhoresSequencias();
  });
}

export function abrirFormCheck(c = null) {
  const d = dados();
  const novo = !c;
  const html = `<form class="form" autocomplete="off">
    <label class="campo"><span>Nome</span>
      <input class="entrada" name="nome" maxlength="40" value="${esc(c ? c.nome : '')}" placeholder="Ex.: Tomar vitamina">
    </label>
    <div class="campo"><span>Ícone</span>${seletorEmojiHTML(c ? c.emoji : '✅')}</div>
    <label class="campo"><span>XP</span>
      <input class="entrada" name="xp" inputmode="numeric" value="${c ? c.xp : 20}">
    </label>
    <div class="campo"><span>Dias em que vale</span>${seletorDiasHTML(c ? c.dias : null)}</div>
    <label class="campo"><span>Horário limite (opcional)</span>
      <input class="entrada" type="time" name="horaLimite" value="${c && c.horaLimite ? c.horaLimite : ''}">
      <small class="dica">Marcado até esse horário vale o XP cheio; depois, metade.</small>
    </label>
    <div class="form-botoes">
      ${!novo ? '<button type="button" class="btn perigo-texto" data-excluir>Excluir bloco</button>' : ''}
      <button class="btn primario largo" type="submit">${novo ? 'Criar bloco' : 'Salvar'}</button>
    </div>
  </form>`;
  abrirSheet({
    titulo: novo ? 'Novo bloco de check' : 'Editar bloco',
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
        const v = {
          nome,
          emoji: form.elements.emoji.value.trim() || '✅',
          xp: Math.max(0, Math.round(lerNumero(form.elements.xp.value, 20))),
          dias: lerDias(corpo),
          horaLimite: form.elements.horaLimite.value || null,
        };
        alterar(() => {
          if (novo) {
            const id = uid();
            d.checks.push({ id, chave: '', ...v, criadoEm: hojeKey(), melhorSequencia: 0 });
            d.painel.unshift({ id: `b-${id}`, tipo: 'check', ref: id, ativo: true, tamanho: 'p' });
          } else {
            Object.assign(c, v, { exemplo: false });
          }
        });
        fechar();
        toast(novo ? 'Bloco criado no painel ✨' : 'Bloco atualizado');
      });
      const bx = corpo.querySelector('[data-excluir]');
      if (bx) {
        bx.addEventListener('click', async () => {
          if (!(await confirmar(`Excluir o bloco "${c.nome}"? O XP já ganho continua.`, { titulo: 'Excluir bloco', ok: 'Excluir', perigo: true }))) return;
          alterar(() => {
            d.checks = d.checks.filter((x) => x.id !== c.id);
            d.painel = d.painel.filter((b) => b.ref !== c.id);
          });
          fechar();
        });
      }
    },
  });
}

// -------------------------------------------------------------
// Conteúdo de cada bloco
// Cada função recebe (bloco, grande) e devolve o HTML interno.
// -------------------------------------------------------------

const topo = (emoji, nome, extra = '') => `<div class="bloco-topo"><span class="bloco-emoji">${emoji}</span><span class="bloco-nome">${esc(nome)}</span>${extra}</div>`;

const CONTEUDO = {
  missoes(b, g) {
    const ms = missoesDoDia();
    const feitas = ms.filter((m) => m.resgatada).length;
    return `${topo('🎯', 'Missões do dia', `<span class="bloco-extra">${feitas}/${ms.length}</span>`)}
      <div class="missoes">${ms.map((m) => `<div class="missao ${m.resgatada ? 'resgatada' : m.completa ? 'pronta' : ''}">
          <span class="missao-icone">${m.icone}</span>
          <span class="missao-info"><span class="missao-texto">${esc(m.texto)}</span>
            <span class="missao-barra"><i style="width:${(m.progresso / m.alvo) * 100}%"></i></span></span>
          ${m.resgatada ? `<span class="missao-ok">${ICONE_CHECK}</span>`
            : m.completa ? `<button class="btn-resgatar" data-acao="resgatar" data-item="${m.tipo}">Resgatar</button>`
            : `<span class="missao-premio">+${m.xp}<small> XP</small><br><small>🪙${m.moedas}</small></span>`}
        </div>`).join('') || '<small class="apagado">Crie hábitos ou pendências para receber missões.</small>'}</div>
      ${ms.length && feitas < ms.length ? `<div class="bloco-rodape">Complete as ${ms.length} e ganhe um <b>baú bônus</b> 🎁</div>` : ms.length ? '<div class="bloco-rodape">Todas resgatadas! Volte amanhã para novas missões ✨</div>' : ''}`;
  },

  liga() {
    const l = ligaAtual();
    return `${topo('🏆', 'Liga da semana')}
      <div class="bloco-corpo coluna">
        <div class="liga-nome"><span class="liga-emoji">${l.emoji}</span>${l.nome}</div>
        <small>${l.xp} XP nesta semana</small>
        <div class="barra"><div class="barra-fill" style="width:${l.pct * 100}%"></div></div>
      </div>
      <div class="bloco-rodape">${l.proxima ? `${l.falta} XP para ${l.proxima.emoji} ${l.proxima.nome}` : 'Liga máxima! 👑'}</div>`;
  },

  rotina(b, g) {
    const hoje = hojeKey();
    const r = resumoRotina(hoje);
    const reg = lerDia(hoje);
    const itens = itensRotinaDoDia(hoje);
    const completo = r.total > 0 && r.feitos >= r.total;
    const rodape = r.total === 0 ? 'Nada programado' : completo ? 'Completa! 🎉' : `Faltam ${r.total - r.feitos}`;
    return `${topo('✅', 'Rotina do dia')}
      <div class="bloco-corpo ${g ? 'lado' : ''}">
        ${anel(r.total ? r.feitos / r.total : 0, { tam: g ? 76 : 70, esp: 8, html: `<strong>${r.feitos}</strong><small>/${r.total}</small>` })}
        ${g ? `<div class="mini-lista">${itens.slice(0, 4).map((i) => {
          const f = !!(reg && reg.rotina[i.id]);
          return `<button class="mini-item ${f ? 'feito' : ''}" data-acao="rotina-item" data-item="${i.id}"><span class="mini-check">${f ? ICONE_CHECK : ''}</span>${esc(i.emoji || '')} ${esc(i.nome)}</button>`;
        }).join('')}${itens.length > 4 ? `<small class="mais">+${itens.length - 4} itens</small>` : ''}</div>` : ''}
      </div>
      <div class="bloco-rodape">${rodape}</div>`;
  },

  pendencias(b, g) {
    const c = contagens();
    const lista = listar('hoje-e-atrasadas', 'prazo');
    const total = c.hoje + c.atrasadas;
    return `${topo('📌', 'Pendências')}
      <div class="bloco-corpo ${g ? 'lado' : ''}">
        <div class="numero-bloco"><strong>${total}</strong><small>${g ? 'para hoje' : 'hoje'}</small></div>
        ${g ? `<div class="mini-lista">${lista.slice(0, 3).map((p) => `<button class="mini-item" data-acao="pend-concluir" data-item="${p.id}"><span class="mini-check"></span>${esc(p.titulo)}${p.prazo < hojeKey() ? ' <i class="ponto-perigo"></i>' : ''}</button>`).join('') || '<small class="mais">Tudo em dia! 🏝️</small>'}</div>` : ''}
      </div>
      <div class="bloco-rodape">${c.atrasadas ? `<span class="perigo">${c.atrasadas} atrasada${c.atrasadas > 1 ? 's' : ''}</span>` : total ? 'Bora resolver!' : 'Tudo em dia ✨'}</div>`;
  },

  treino(b, g) {
    const t = dados().treinos;
    if (t.emAndamento) {
      return `${topo('🏋️', 'Treino do dia', '<span class="tag tag-neon pulsa">AO VIVO</span>')}
        <div class="bloco-corpo coluna"><div class="treino-nome gradiente-texto">${esc(t.emAndamento.fichaNome)}</div>
        <small>Em andamento desde ${formatarHora(t.emAndamento.inicio)}</small></div>
        <button class="btn primario largo" data-acao="treino-continuar">Continuar treino</button>`;
    }
    const f = proximaFicha();
    if (!f) {
      return `${topo('🏋️', 'Treino do dia')}<div class="bloco-corpo coluna"><small>Nenhuma ficha criada.</small></div>
        <button class="btn secundario largo" data-acao="abrir-treinos">Criar ficha</button>`;
    }
    const treinouHoje = t.sessoes.some((s) => s.dia === hojeKey());
    return `${topo('🏋️', treinouHoje ? 'Treino feito hoje ✅' : 'Treino do dia')}
      <div class="bloco-corpo coluna">
        <small>${treinouHoje ? 'Próximo:' : 'Agora é a vez do'}</small>
        <div class="treino-nome gradiente-texto">${esc(f.nome)}</div>
        <small>${plural(f.exercicios.length, 'exercício', 'exercícios')}${g ? ' · ' + esc([...new Set(f.exercicios.map((e) => e.grupo))].join(', ')) : ''}</small>
      </div>
      <button class="btn primario largo" data-acao="treino-comecar" data-item="${f.id}">Começar treino</button>`;
  },

  metaTreinos() {
    const n = treinosNaSemana().length;
    const meta = dados().ajustes.metaTreinosSemana;
    return `${topo('🎯', 'Meta semanal')}
      <div class="bloco-corpo">${anel(meta ? n / meta : 0, { tam: 70, esp: 8, html: `<strong>${n}</strong><small>/${meta}</small>` })}</div>
      <div class="bloco-rodape">${n >= meta ? 'Meta batida! 🔥' : `Faltam ${meta - n} treino${meta - n > 1 ? 's' : ''}`}</div>`;
  },

  agua(b, g) {
    const n = aguaHoje();
    const meta = dados().ajustes.metaAgua;
    const copos = Math.min(meta, 12);
    return `${topo('💧', 'Água')}
      <div class="bloco-corpo coluna">
        <div class="numero-bloco"><strong>${n}</strong><small>/${meta} copos</small></div>
        <div class="copos">${Array.from({ length: copos }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
      </div>
      <div class="bloco-acoes">
        <button class="btn-redondo" data-acao="agua-menos" aria-label="Menos um copo">${ICONE_MENOS}</button>
        <button class="btn-redondo primario" data-acao="agua-mais" aria-label="Mais um copo">${ICONE_MAIS}</button>
      </div>`;
  },

  notas(b, g) {
    const n = ultimaNota();
    return `${topo('🗒️', 'Notas rápidas')}
      <div class="bloco-corpo coluna"><p class="nota-previa">${n ? esc(n.texto) : '<span class="apagado">Nenhuma nota ainda.</span>'}</p></div>
      <button class="btn secundario largo pequeno-alt" data-acao="nota-nova">${ICONE_MAIS} Nova nota</button>`;
  },

  compras(b, g) {
    const f = comprasFaltando();
    return `${topo('🛒', 'Compras')}
      <div class="bloco-corpo coluna ${g ? '' : ''}">
        <div class="numero-bloco"><strong>${f.length}</strong><small>faltando</small></div>
        <ul class="lista-curta">${f.slice(0, g ? 4 : 2).map((c) => `<li>${esc(c.nome)}</li>`).join('')}</ul>
      </div>`;
  },

  gastos(b, g) {
    const total = totalGastosMes();
    const lim = dados().ajustes.limiteGastos;
    const pct = lim > 0 ? Math.min(1, total / lim) : 0;
    const estourou = lim > 0 && total > lim;
    return `${topo('💸', 'Gastos do mês')}
      <div class="bloco-corpo coluna">
        <div class="valor-grande ${estourou ? 'perigo' : ''}">${formatarMoeda(total)}</div>
        ${lim > 0 ? `<div class="barra ${estourou ? 'perigo' : ''}"><div class="barra-fill" style="width:${pct * 100}%"></div></div><small>${estourou ? 'Limite estourado!' : `de ${formatarMoeda(lim)}`}</small>` : `<small>${MESES[new Date().getMonth()]}</small>`}
      </div>`;
  },

  sequencia() {
    const s = sequenciaRotina();
    const m = multiplicador();
    const prox = m >= 50 ? null : 7 - (sequenciaRotina(true) % 7);
    return `${topo('🔥', 'Sequência')}
      <div class="bloco-corpo coluna">
        <div class="numero-bloco fogo"><strong>${s}</strong><small>${s === 1 ? 'dia seguido' : 'dias seguidos'}</small></div>
      </div>
      <div class="bloco-rodape">${m ? `<b class="neon">+${m}% XP</b>` : prox ? `+10% XP em ${prox} dia${prox > 1 ? 's' : ''}` : ''}</div>`;
  },

  semanaXP() {
    const hoje = hojeKey();
    const dias = diasDaSemana(hoje);
    const itens = dias.map((dia) => ({ rotulo: DIAS_LETRA[diaSemana(dia)], valor: xpDoDia(dia), destaque: dia === hoje }));
    const total = itens.reduce((s, i) => s + i.valor, 0);
    return `${topo('📊', 'Pontuação da semana', `<span class="bloco-extra">${total} XP</span>`)}
      <div class="bloco-corpo">${barras(itens, { altura: 110 })}</div>`;
  },

  check(b, g) {
    const c = dados().checks.find((x) => x.id === b.ref);
    if (!c) return '';
    const hoje = hojeKey();
    const vale = valeNoDia(c, hoje);
    const feito = checkFeito(c, hoje);
    const seq = sequenciaCheck(c);
    let status;
    if (!vale) status = '<small class="apagado">Folga hoje 😌</small>';
    else if (feito) status = `<small>Feito às ${formatarHora(feito.ts)}</small>`;
    else status = `<small>${c.horaLimite ? (horaAtual() > c.horaLimite ? `${xpCheckAgora(c)} XP (após ${c.horaLimite})` : `${c.xp} XP até ${c.horaLimite}`) : `${c.xp} XP`}</small>`;
    return `${topo(esc(c.emoji || '✅'), c.nome)}
      <div class="bloco-corpo coluna check-corpo">
        <div class="check-grande ${feito ? 'on' : ''} ${!vale ? 'desligado' : ''}">${ICONE_CHECK}</div>
        ${status}
      </div>
      <div class="bloco-rodape">${seq ? `🔥 ${plural(seq, 'dia seguido', 'dias seguidos')}` : vale && !feito ? 'Toque para marcar' : 'Comece a sequência!'}</div>`;
  },
};

/** Ação ao tocar no bloco (fora dos botões internos). */
function acaoBloco(b) {
  switch (b.tipo) {
    case 'rotina': return irPara('rotina');
    case 'pendencias': return irPara('pendencias', { filtro: contagens().atrasadas ? 'atrasadas' : 'hoje' });
    case 'treino':
    case 'metaTreinos': return irPara('treinos');
    case 'agua': return adicionarAgua(1);
    case 'notas': return abrirNotas();
    case 'compras': return abrirCompras();
    case 'gastos': return abrirGastos();
    case 'sequencia': return irPara('rotina');
    case 'semanaXP': return irPara('perfil');
    case 'check': return alternarCheck(b.ref);
    case 'missoes': return;
    case 'liga': return irPara('perfil', { secao: 'jornada' });
  }
}

// -------------------------------------------------------------
// Tela
// -------------------------------------------------------------

export function montar(el) {
  el.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-acao]');
    if (!alvo) return;
    const d = dados();
    const blocoEl = alvo.closest('.bloco');
    const bloco = blocoEl ? d.painel.find((x) => x.id === blocoEl.dataset.id) : null;
    const item = alvo.dataset.item;
    switch (alvo.dataset.acao) {
      case 'editar-painel':
        editando = !editando;
        vibrar(8);
        render(el);
        break;
      case 'novo-check':
        abrirFormCheck();
        break;
      case 'bloco':
        if (!editando && bloco) acaoBloco(bloco);
        break;
      case 'tamanho':
        alterar(() => (bloco.tamanho = bloco.tamanho === 'g' ? 'p' : 'g'));
        break;
      case 'visivel':
        alterar(() => (bloco.ativo = !bloco.ativo));
        break;
      case 'editar-check':
        abrirFormCheck(d.checks.find((c) => c.id === bloco.ref));
        break;
      case 'rotina-item':
        if (!editando) alternarItem(item);
        break;
      case 'pend-concluir':
        if (!editando) concluir(item);
        break;
      case 'treino-comecar':
        if (!editando) iniciarTreino(item);
        break;
      case 'treino-continuar':
        if (!editando) abrirTreinoAtivo();
        break;
      case 'abrir-treinos':
        if (!editando) irPara('treinos');
        break;
      case 'agua-mais':
        if (!editando) adicionarAgua(1);
        break;
      case 'agua-menos':
        if (!editando && aguaHoje() > 0) adicionarAgua(-1);
        break;
      case 'nota-nova':
        if (!editando) abrirNotas({ nova: true });
        break;
      case 'ir-perfil':
        irPara('perfil', { secao: 'jornada' });
        break;
      case 'companheiro':
        tocarCompanheiro(el);
        break;
      case 'bau':
        abrirBauAnimado();
        break;
      case 'ir-rotina':
        irPara('rotina');
        break;
      case 'resgatar':
        if (!editando) resgatar(item);
        break;
      case 'ir-loja':
        irPara('perfil', { secao: 'loja' });
        break;
    }
  });
}

export function render(el, params = {}) {
  const d = dados();
  if (sincronizarBlocos()) alterar(() => {}, { silencioso: true });
  const hoje = hojeKey();
  const info = nivelInfo(d.xp.total);
  const pct = Math.round(info.progresso * 100);
  const xpHoje = xpDoDia(hoje);
  const mult = multiplicador();
  const blocos = d.painel.filter((b) => editando || b.ativo);
  const pctInicial = ultimoPctXP === null ? pct : ultimoPctXP;

  const blocoHTML = (b) => {
    const g = b.tamanho === 'g';
    const fn = CONTEUDO[b.tipo];
    if (!fn) return '';
    const conteudo = fn(b, g);
    if (!conteudo) return '';
    const nome = b.tipo === 'check' ? (d.checks.find((c) => c.id === b.ref) || {}).nome : TIPOS[b.tipo].nome;
    const feitoCheck = b.tipo === 'check' && checkFeito(d.checks.find((c) => c.id === b.ref) || {}, hoje);
    return `<article class="bloco bloco-${b.tipo} ${g ? 'g' : 'p'} ${b.ativo ? '' : 'inativo'} ${feitoCheck ? 'feito' : ''}" data-id="${b.id}" data-acao="bloco" role="button" tabindex="0" aria-label="${esc(nome)}">
      ${editando ? `<div class="bloco-ctrl">
        <span class="alca" aria-label="Arrastar">${ICONE_ALCA}</span>
        <button class="ctrl" data-acao="tamanho" aria-label="Tamanho">${g ? 'G' : 'P'}</button>
        <button class="ctrl" data-acao="visivel" aria-label="${b.ativo ? 'Ocultar' : 'Mostrar'}">${b.ativo ? ICONE_OLHO : ICONE_OLHO_OFF}</button>
        ${b.tipo === 'check' ? `<button class="ctrl" data-acao="editar-check" aria-label="Editar">${ICONE_EDITAR}</button>` : ''}
      </div>` : ''}
      ${conteudo}
    </article>`;
  };

  const nome = d.ajustes.nome ? `, ${esc(d.ajustes.nome)}` : '';
  const p = companheiro();
  const hu = humor();
  const r = resumoRotina(hoje);
  const seqOntem = sequenciaRotina(true);
  const h = new Date().getHours();
  const emRisco = h >= 17 && r.total > 0 && r.feitos < r.total && seqOntem > 0;
  const pocao = pocaoAtiva();

  el.innerHTML = `
    <header class="topo-hoje">
      <div class="logo">Do It Better</div>
      <div class="topo-acoes">
        <button class="pilula-moedas" data-acao="ir-loja" aria-label="${d.carteira.moedas} moedas — abrir loja">🪙 <b>${d.carteira.moedas}</b>${d.carteira.escudos ? `<span class="pilula-escudo">🛡️${d.carteira.escudos}</span>` : ''}</button>
        <button class="btn-icone ${editando ? 'ativo' : ''}" data-acao="editar-painel" aria-label="${editando ? 'Concluir edição' : 'Editar painel'}">${editando ? ICONE_CHECK : ICONE_EDITAR}</button>
      </div>
    </header>

    <section class="placar card">
      <div class="placar-topo">
        <button class="placar-avatar" data-acao="companheiro" aria-label="Falar com ${esc(p.nome)}">
          ${avatarHTML(p, { tam: 'g', nivel: info.nivel, humor: hu })}
        </button>
        <div class="placar-saudacao">
          <h1>${saudacao()}${nome}!</h1>
          <p>${DIAS_LONGOS[diaSemana(hoje)].replace(/^./, (c) => c.toUpperCase())}, ${formatarData(hoje)}</p>
          <button class="balao" data-acao="companheiro"><b>${esc(p.nome)}:</b> ${esc(fala(variacaoFala))}</button>
        </div>
      </div>
      <div class="placar-linha" data-acao="ir-perfil">
        <div class="nivel-badge" aria-label="Nível ${info.nivel}"><small>NÍVEL</small><strong>${info.nivel}</strong></div>
        <div class="placar-xp">
          <div class="placar-titulo"><span>${info.titulo}</span>${mult ? `<span class="tag tag-neon">🔥 +${mult}%</span>` : ''}${pocao ? `<span class="tag tag-pocao">🧪 +50%</span>` : ''}</div>
          <div class="barra-xp"><div class="barra-xp-fill" style="width:${pctInicial}%"></div></div>
          <small>${info.xpNoNivel} / ${info.xpParaProximo} XP · faltam ${info.falta}</small>
        </div>
        <div class="pontos-dia"><strong>${xpHoje}</strong><small>XP hoje</small></div>
      </div>
    </section>

    ${!editando && bauDisponivel() ? `<button class="banner banner-bau" data-acao="bau">
        <span class="banner-emoji balanca">🎁</span>
        <span class="banner-texto"><b>Baú diário disponível!</b><small>${d.stats.ultimoCheckin && d.stats.checkinSeq ? `Presença: ${d.stats.checkinSeq} dia(s) seguidos · quanto mais seguido, maior o prêmio` : 'Abra todo dia: prêmios crescem com a sua presença'}</small></span>
        <span class="banner-cta">Abrir</span>
      </button>` : ''}
    ${!editando && emRisco ? `<button class="banner banner-risco" data-acao="ir-rotina">
        <span class="banner-emoji pulsa">🔥</span>
        <span class="banner-texto"><b>Sua sequência de ${seqOntem} dias está em risco!</b><small>Faltam ${r.total - r.feitos} hábito(s) hoje.${d.carteira.escudos ? ' Você tem 🛡️, mas não desperdice!' : ' Sem escudo para te salvar.'}</small></span>
        <span class="banner-cta">Ir</span>
      </button>` : ''}

    ${editando ? `<div class="painel-dica card">
        <p>Arraste pela alça <b>⋮⋮</b> para mudar a ordem. <b>P/G</b> muda o tamanho e o olho mostra/oculta.</p>
        <button class="btn secundario largo" data-acao="novo-check">${ICONE_MAIS} Novo bloco de check</button>
      </div>` : ''}

    <section class="grade-blocos ${editando ? 'editando' : ''} ${params.entrando ? 'animar' : ''}" id="grade-blocos">
      ${blocos.length ? blocos.map(blocoHTML).join('') : `<div class="g-span">${vazioHTML('🧩', 'Painel vazio', 'Toque em "Editar painel" para escolher os blocos que quer ver aqui.')}</div>`}
    </section>
  `;

  // Barra de XP enchendo animada
  const fill = el.querySelector('.barra-xp-fill');
  if (fill && pctInicial !== pct) {
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${pct}%`)));
  }
  ultimoPctXP = pct;

  if (editando) {
    tornarOrdenavel(el.querySelector('#grade-blocos'), {
      itens: '.bloco',
      alca: '.alca',
      aoSoltar: (ids) => alterar(() => (dados().painel = reordenarPorIds(dados().painel, ids))),
    });
  }
}

// -------------------------------------------------------------
// Companheiro, baú e missões
// -------------------------------------------------------------

/** Tocar no companheiro: nova fala, pulinho e (1x por dia) um carinho que dá moedas. */
function tocarCompanheiro(el) {
  variacaoFala++;
  const d = dados();
  const reg = registroDia(hojeKey());
  const p = companheiro();
  if (!reg.carinho) {
    alterar(() => {
      reg.carinho = true;
      d.carteira.moedas += 5;
    });
    tocar('moeda');
    toast(`${p.nome} ficou feliz com o carinho! +5 🪙`);
  } else {
    render(el);
  }
  const av = el.querySelector('.placar-avatar .avatar');
  if (av) {
    av.classList.remove('pula');
    void av.offsetWidth;
    av.classList.add('pula');
  }
  vibrar(10);
}

/** Abre o baú diário com animação de suspense. */
function abrirBauAnimado() {
  let premio;
  alterar(() => (premio = abrirBau()), { silencioso: true });
  if (!premio) return;
  const textos = {
    moedas: [`🪙 ${premio.valor} moedas`, 'Gaste na loja: escudos, poções e temas.'],
    xp: [`⚡ ${premio.valor} XP`, 'Direto para a sua barra de nível!'],
    escudo: ['🛡️ Escudo de sequência', 'Protege sua sequência num dia falhado.'],
    pocao: ['🧪 Poção de XP (30 min)', '+50% de XP em tudo pelos próximos 30 minutos!'],
  };
  const [titulo, sub] = textos[premio.tipo];
  const raiz = document.createElement('div');
  raiz.className = 'bau-raiz';
  raiz.innerHTML = `<div class="bau-caixa">
      <div class="bau-emoji tremendo">🎁</div>
      <div class="bau-premio">
        ${premio.raro ? '<span class="tag tag-neon">RARO!</span>' : ''}
        <h3 class="gradiente-texto">${titulo}</h3>
        <p>${sub}</p>
        <small>Presença: ${premio.presenca} dia(s) seguido(s)${premio.presenca > 1 ? ' · bônus aplicado!' : ''}</small>
        <button class="btn primario largo">Pegar</button>
      </div>
    </div>`;
  document.body.appendChild(raiz);
  requestAnimationFrame(() => raiz.classList.add('aberta'));
  vibrar([20, 40, 20, 40, 20]);
  setTimeout(() => {
    raiz.classList.add('revelado');
    tocar('bau');
    confete({ quantidade: premio.raro ? 160 : 90 });
    vibrar(30);
  }, 1100);
  const fechar = () => {
    raiz.classList.remove('aberta');
    setTimeout(() => raiz.remove(), 250);
    alterar(() => {}); // redesenha a tela com o prêmio aplicado
  };
  raiz.addEventListener('click', (e) => {
    if (raiz.classList.contains('revelado') && (e.target.closest('button') || e.target === raiz)) fechar();
  });
}

/** Resgata a recompensa de uma missão concluída. */
function resgatar(tipo) {
  let res;
  alterar(() => (res = resgatarMissao(tipo)));
  if (!res) return;
  tocar('moeda');
  vibrar([15, 30, 15]);
  toast(`Missão resgatada! +${res.xp} XP · +${res.moedas} 🪙`);
  if (res.bonus) {
    celebrar({
      emoji: '🎁',
      titulo: 'Todas as missões!',
      subtitulo: `Baú bônus: +${res.bonus.xp} XP e +${res.bonus.moedas} moedas${res.bonus.escudo ? ' e um 🛡️ escudo!' : '.'} Volte amanhã para novas missões.`,
    });
  }
}
