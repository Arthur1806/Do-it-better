// =============================================================
// social.js — aba 🏆 SOCIAL (v5.1): jogar online.
//   • Ranking: geral (todo mundo) e só dos amigos — XP da semana.
//   • Amigos: buscar por @nick, e-mail exato ou código; pedidos; convite
//     pelo WhatsApp (link com ?amigo=nick).
//   • Grupos: grupos privados só com amigos, cada um com o seu ranking.
//   • Conta: criar conta (e-mail + senha, SEM e-mail de confirmação),
//     código de recuperação, nuvem, nick, sair e excluir conta.
// Tudo o que é do jogo continua funcionando offline; esta aba precisa de
// internet só para o que é online.
// =============================================================

import { dados, alterar } from './store.js';
import { esc, formatarNumero, formatarDataHora } from './utils.js';
import * as Nuvem from './nuvem.js';
import * as Sync from './sync.js';
import { personagemHTML } from './visual.js';
import { avatarHTML, personagem as petDoCatalogo } from './personagens.js';
import { LIGAS } from './missoes.js';
import { MUTACOES } from './mutacao.js';
import { abrirSheet, confirmar, toast, vibrar, confete, vazioHTML } from './ui.js';

const SECOES = [
  ['ranking', '🏆 Ranking'],
  ['amigos', '👥 Amigos'],
  ['grupos', '🛡️ Grupos'],
  ['conta', '☁️ Conta'],
];

let secao = 'ranking';
let tipoRanking = 'geral'; // 'geral' | 'amigos'
let elTela = null;
const cache = { perfil: null, ranking: null, rankingAmigos: null, amigos: null, grupos: null, quando: {} };
let carregando = {};

const LINK_APP = () => `${location.origin}${location.pathname.replace(/index\.html$/, '')}`;

// -------------------------------------------------------------
// Dados (com cache para não buscar a cada redesenho)
// -------------------------------------------------------------

async function buscar(chave, fn, { forcar = false, validade = 45000 } = {}) {
  if (!Nuvem.logado()) return null;
  if (!forcar && cache[chave] && Date.now() - (cache.quando[chave] || 0) < validade) return cache[chave];
  if (carregando[chave]) return carregando[chave];
  carregando[chave] = fn()
    .then((r) => {
      cache[chave] = r;
      cache.quando[chave] = Date.now();
      return r;
    })
    .finally(() => delete carregando[chave]);
  return carregando[chave];
}
const carregarPerfil = (o) => buscar('perfil', () => Nuvem.meuPerfil(), o);
const carregarRanking = (o) => buscar('ranking', () => Nuvem.rpc('ranking_geral', { p_limite: 100 }), o);
const carregarRankingAmigos = (o) => buscar('rankingAmigos', () => Nuvem.rpc('ranking_amigos'), o);
const carregarAmigos = (o) => buscar('amigos', () => Nuvem.rpc('meus_amigos'), o);
const carregarGrupos = (o) => buscar('grupos', () => Nuvem.rpc('meus_grupos'), o);

function limparCache() {
  for (const k of ['perfil', 'ranking', 'rankingAmigos', 'amigos', 'grupos']) cache[k] = null;
  cache.quando = {};
}

/** Pedidos de amizade recebidos (para o aviso na barra de abas). */
export function pedidosRecebidos() {
  return (cache.amigos || []).filter((a) => a.relacao === 'recebido').length;
}
export async function atualizarAvisos() {
  if (!Nuvem.logado()) return 0;
  try {
    await carregarAmigos();
  } catch (_) {}
  return pedidosRecebidos();
}

// -------------------------------------------------------------
// Pedaços de interface
// -------------------------------------------------------------

/** Mini personagem + pet de outro jogador. */
function bonecoDe(j, { tam = 'mini' } = {}) {
  const cfg = j.avatar && Object.keys(j.avatar).length ? j.avatar : undefined;
  return `<span class="jogador-boneco ${tam}">${personagemHTML(cfg || {}, { classe: tam === 'mini' ? 'mini' : '', fisico: j.fisico, semFogo: tam === 'mini' })}</span>`;
}
function petDe(j, tam = 'p') {
  const p = j.pet || {};
  if (!p.especie) return '';
  return avatarHTML(petDoCatalogo(p.especie), { tam, mutacao: p.mutacao || 0, skin: p.skin || 'normal', estado: false });
}
const liga = (i) => LIGAS[Math.max(0, Math.min(LIGAS.length - 1, i || 0))];
const estrelas = (n) => (n ? `<span class="estrelas">${'⭐'.repeat(Math.min(5, n))}</span>` : '');

function linhaJogador(j, { meuId, mostrarPos = true, acao = 'ver-jogador', extra = '' } = {}) {
  const eu = j.id === meuId;
  const medalha = j.pos === 1 ? '🥇' : j.pos === 2 ? '🥈' : j.pos === 3 ? '🥉' : `${j.pos}º`;
  return `<button class="jogador-linha ${eu ? 'eu' : ''} ${j.pos <= 3 ? 'podio' : ''}" data-acao="${acao}" data-id="${j.id}">
    ${mostrarPos ? `<span class="jogador-pos">${medalha}</span>` : ''}
    ${bonecoDe(j)}
    <span class="jogador-info"><b>@${esc(j.nick)}${eu ? ' <small>(você)</small>' : ''}</b>
      <small>Nv ${j.nivel}${estrelas(j.prestigio)} · ${liga(j.liga).emoji} ${liga(j.liga).nome}${j.sequencia ? ` · 🔥${j.sequencia}` : ''}</small></span>
    ${extra || `<span class="jogador-xp"><b>${formatarNumero(j.xp_semana || 0)}</b><small>XP semana</small></span>`}
  </button>`;
}

const carregandoHTML = (txt = 'Carregando…') => `<div class="social-carregando"><span class="girando">⏳</span> ${esc(txt)}</div>`;
const erroHTML = (e) => `<div class="card social-erro"><p>😕 ${esc(e.message || 'Algo deu errado.')}</p><button class="btn secundario" data-acao="recarregar">Tentar de novo</button></div>`;

// -------------------------------------------------------------
// Tela
// -------------------------------------------------------------

export function montar(el) {
  elTela = el;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.acao) {
      case 'secao':
        secao = b.dataset.secao;
        vibrar(6);
        render(el, { refazer: true });
        el.scrollTo({ top: 0 });
        break;
      case 'tipo-ranking':
        tipoRanking = b.dataset.tipo;
        render(el, { refazer: true });
        break;
      case 'recarregar':
        limparCache();
        render(el, { forcar: true });
        break;
      case 'criar-conta':
        abrirCadastro();
        break;
      case 'entrar':
        abrirLogin();
        break;
      case 'ver-jogador':
        verJogador(id);
        break;
      case 'buscar':
        buscarJogador(el.querySelector('[name="busca"]').value);
        break;
      case 'adicionar':
        pedirAmizade(id, b);
        break;
      case 'aceitar':
      case 'recusar':
        responder(id, b.dataset.acao === 'aceitar');
        break;
      case 'whatsapp':
        convidarWhatsApp();
        break;
      case 'compartilhar':
        compartilharConvite();
        break;
      case 'colar-convite':
        colarConvite();
        break;
      case 'copiar':
        copiar(b.dataset.texto);
        break;
      case 'novo-grupo':
        abrirNovoGrupo();
        break;
      case 'ver-grupo':
        verGrupo(id);
        break;
      case 'sincronizar':
        Sync.enviar({ forcar: true }).then(() => Sync.puxar()).then(() => toast('☁️ Sincronizado!'));
        break;
      case 'novo-codigo':
        gerarNovoCodigo();
        break;
      case 'trocar-nick':
        trocarNick();
        break;
      case 'sair':
        sairDaConta();
        break;
      case 'excluir':
        excluirConta();
        break;
    }
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.name === 'busca') buscarJogador(e.target.value);
  });
  el.addEventListener('change', (e) => {
    if (e.target.name === 'noRanking') {
      const v = e.target.checked;
      alterar((d) => (d.ajustes.noRanking = v));
      Sync.enviar({ forcar: true });
      toast(v ? 'Você aparece no ranking geral 🏆' : 'Você saiu do ranking geral (amigos ainda veem você)');
    }
  });
  window.addEventListener('dib-nuvem', () => {
    if (secao === 'conta' && el.classList.contains('ativa')) desenharStatusNuvem(el);
  });
  Nuvem.aoMudarSessao(() => {
    limparCache();
    el.dataset.desenhado = '';
    if (el.classList.contains('ativa')) render(el, { refazer: true });
  });
}

export function render(el, params = {}) {
  if (params.secao) secao = params.secao;
  const logado = Nuvem.logado();
  // redesenhos automáticos (dados do jogo mudaram) não interessam a esta aba
  const marca = `${logado}:${secao}:${tipoRanking}`;
  if (!Object.keys(params).length && el.dataset.desenhado === marca) return;
  el.dataset.desenhado = marca;
  el.innerHTML = `
    <header class="cabecalho">
      <h1 class="titulo-tela">Social</h1>
      ${logado ? `<button class="btn-texto" data-acao="recarregar" aria-label="Atualizar">↻ Atualizar</button>` : ''}
    </header>
    ${logado ? `<nav class="subnav subnav-social" role="tablist" aria-label="Seções do social">
      ${SECOES.map(([id, nome]) => `<button role="tab" aria-selected="${secao === id}" class="${secao === id ? 'on' : ''}" data-acao="secao" data-secao="${id}">${nome}${id === 'amigos' && pedidosRecebidos() ? `<i class="ponto-novo">${pedidosRecebidos()}</i>` : ''}</button>`).join('')}
    </nav>` : ''}
    <div class="secao-conteudo social-conteudo"></div>`;
  const box = el.querySelector('.social-conteudo');
  if (!logado) {
    box.innerHTML = boasVindasHTML();
    return;
  }
  const forcar = !!params.forcar || !!params.entrando;
  ({ ranking: renderRanking, amigos: renderAmigos, grupos: renderGrupos, conta: renderConta }[secao] || renderRanking)(box, { forcar });
}

function boasVindasHTML() {
  return `<section class="card social-hero">
      <div class="social-hero-arte">${personagemHTML(dados().avatar)}</div>
      <h2>Jogue online 🔥</h2>
      <p>Crie sua conta para <b>salvar o progresso na nuvem</b> (troque de celular sem perder nada), entrar no <b>ranking geral</b> da semana, adicionar <b>amigos</b> e criar <b>grupos</b> com ranking próprio.</p>
      <button class="btn primario largo" data-acao="criar-conta">Criar conta grátis</button>
      <button class="btn secundario largo" data-acao="entrar">Já tenho conta</button>
      <p class="dica">Não enviamos e-mails. Seu e-mail serve para você entrar e para seus amigos te acharem. Seus dados pessoais (pendências, notas, gastos) nunca aparecem para ninguém.</p>
    </section>`;
}

// ---------- Ranking ----------
function renderRanking(box, { forcar }) {
  const meuId = (Nuvem.usuario() || {}).id;
  box.innerHTML = `<div class="seletor-desafios" role="tablist">
      <button role="tab" class="${tipoRanking === 'geral' ? 'on' : ''}" data-acao="tipo-ranking" data-tipo="geral">🌎 Geral</button>
      <button role="tab" class="${tipoRanking === 'amigos' ? 'on' : ''}" data-acao="tipo-ranking" data-tipo="amigos">👥 Amigos</button>
    </div>
    <div class="ranking-lista">${carregandoHTML()}</div>`;
  const lista = box.querySelector('.ranking-lista');
  Sync.enviar({ forcar: true }).catch(() => {}); // garante que o seu XP da semana está atualizado
  if (tipoRanking === 'geral') {
    carregarRanking({ forcar }).then((r) => {
      if (!r) return;
      const eu = r.eu;
      lista.innerHTML = `<p class="dica centro">Semana de ${formatarData(r.semana)} · zera toda segunda · ${r.total} jogador${r.total === 1 ? '' : 'es'}</p>
        ${eu ? `<div class="card ranking-eu">Você está em <b>${eu.pos}º</b> com <b>${formatarNumero(eu.xp_semana)} XP</b> nesta semana</div>` : `<div class="card ranking-eu">Ganhe XP nesta semana para entrar no ranking! ${dados().ajustes.noRanking === false ? '(você escolheu não aparecer no ranking geral)' : ''}</div>`}
        <div class="lista-jogadores">${r.lista.map((j) => linhaJogador(j, { meuId })).join('') || vazioHTML('🏆', 'Ranking vazio', 'Ninguém fez XP ainda nesta semana. Seja o primeiro!')}</div>
        ${eu && !r.lista.some((j) => j.id === eu.id) ? `<div class="lista-jogadores">${linhaJogador(eu, { meuId })}</div>` : ''}`;
    }).catch((e) => (lista.innerHTML = erroHTML(e)));
  } else {
    carregarRankingAmigos({ forcar }).then((r) => {
      if (!r) return;
      lista.innerHTML = r.length <= 1
        ? `${r.length ? `<div class="lista-jogadores">${r.map((j) => linhaJogador(j, { meuId })).join('')}</div>` : ''}${vazioHTML('👥', 'Adicione amigos', 'Convide seus amigos pelo WhatsApp e disputem o XP da semana.', '<button class="btn primario" data-acao="whatsapp">Convidar pelo WhatsApp</button>')}`
        : `<p class="dica centro">XP desta semana · zera toda segunda</p><div class="lista-jogadores">${r.map((j) => linhaJogador(j, { meuId })).join('')}</div>`;
    }).catch((e) => (lista.innerHTML = erroHTML(e)));
  }
}
const formatarData = (k) => (k ? String(k).split('-').reverse().slice(0, 2).join('/') : '');

// ---------- Amigos ----------
function renderAmigos(box, { forcar }) {
  const meuId = (Nuvem.usuario() || {}).id;
  box.innerHTML = `
    <section class="card social-busca">
      <h3>Adicionar amigo</h3>
      <div class="busca-linha">
        <input class="entrada" name="busca" placeholder="@nick, e-mail ou código" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="btn primario" data-acao="buscar">Buscar</button>
      </div>
      <div class="busca-resultado"></div>
      <div class="botoes-convite">
        <button class="btn btn-whats largo" data-acao="whatsapp">💬 Convidar pelo WhatsApp</button>
        <button class="btn secundario" data-acao="colar-convite">📋 Colar convite</button>
        ${navigator.share ? '<button class="btn secundario" data-acao="compartilhar">↗ Compartilhar</button>' : ''}
      </div>
    </section>
    <div class="amigos-lista">${carregandoHTML()}</div>`;
  const lista = box.querySelector('.amigos-lista');
  carregarAmigos({ forcar }).then((r) => {
    if (!r) return;
    document.dispatchEvent(new CustomEvent('dib-redesenhar-badges'));
    const recebidos = r.filter((a) => a.relacao === 'recebido');
    const enviados = r.filter((a) => a.relacao === 'enviado');
    const amigos = r.filter((a) => a.relacao === 'amigo');
    const botoes = (a) => `<span class="pedido-botoes"><span class="btn-mini ok" data-acao="aceitar" data-id="${a.id}">Aceitar</span><span class="btn-mini" data-acao="recusar" data-id="${a.id}">Recusar</span></span>`;
    lista.innerHTML = `
      ${recebidos.length ? `<h3 class="secao-titulo">Pedidos para você</h3><div class="lista-jogadores">${recebidos.map((a) => linhaJogador(a, { meuId, mostrarPos: false, extra: botoes(a) })).join('')}</div>` : ''}
      <h3 class="secao-titulo">Amigos <small class="apagado">${amigos.length}</small></h3>
      ${amigos.length ? `<div class="lista-jogadores">${amigos.map((a) => linhaJogador(a, { meuId, mostrarPos: false })).join('')}</div>` : vazioHTML('👥', 'Nenhum amigo ainda', 'Busque pelo @nick ou mande o convite no WhatsApp.')}
      ${enviados.length ? `<h3 class="secao-titulo">Aguardando resposta</h3><div class="lista-jogadores">${enviados.map((a) => linhaJogador(a, { meuId, mostrarPos: false, extra: '<span class="jogador-xp"><small>pendente</small></span>' })).join('')}</div>` : ''}`;
  }).catch((e) => (lista.innerHTML = erroHTML(e)));
}

async function buscarJogador(texto) {
  const res = elTela.querySelector('.busca-resultado');
  const t = String(texto || '').trim();
  if (!t) return;
  res.innerHTML = carregandoHTML('Procurando…');
  try {
    const j = await Nuvem.rpc('buscar_jogador', { p_busca: t });
    if (!j) {
      res.innerHTML = `<p class="dica">Ninguém encontrado com “${esc(t)}”. Confira o @nick ou mande o convite pelo WhatsApp.</p>`;
      return;
    }
    const meuId = (Nuvem.usuario() || {}).id;
    const rel = (cache.amigos || []).find((a) => a.id === j.id);
    const extra = j.id === meuId ? '<span class="jogador-xp"><small>é você</small></span>'
      : rel ? `<span class="jogador-xp"><small>${rel.relacao === 'amigo' ? 'já é amigo' : 'pedido pendente'}</small></span>`
      : `<span class="btn-mini ok" data-acao="adicionar" data-id="${j.id}">+ Adicionar</span>`;
    res.innerHTML = `<div class="lista-jogadores">${linhaJogador(j, { meuId, mostrarPos: false, extra })}</div>`;
  } catch (e) {
    res.innerHTML = `<p class="dica">😕 ${esc(e.message)}</p>`;
  }
}

async function pedirAmizade(id, botao) {
  try {
    if (botao) botao.textContent = '…';
    const r = await Nuvem.rpc('pedir_amizade', { p_alvo: id });
    if (!r.ok) return toast(r.erro, { tipo: 'erro' });
    toast(r.status === 'aceita' ? 'Vocês agora são amigos! 🎉' : 'Pedido de amizade enviado ✉️');
    if (r.status === 'aceita') confete({ quantidade: 60 });
    cache.amigos = null;
    cache.rankingAmigos = null;
    render(elTela, { refazer: true });
  } catch (e) {
    toast(e.message, { tipo: 'erro' });
  }
}

async function responder(id, aceitar) {
  try {
    await Nuvem.rpc('responder_amizade', { p_de: id, p_aceitar: aceitar });
    toast(aceitar ? 'Amizade aceita! 🎉' : 'Pedido recusado');
    cache.amigos = null;
    cache.rankingAmigos = null;
    render(elTela, { refazer: true });
  } catch (e) {
    toast(e.message, { tipo: 'erro' });
  }
}

async function textoConvite() {
  const p = await carregarPerfil().catch(() => null);
  const nick = p ? p.nick : '';
  const link = `${LINK_APP()}?amigo=${encodeURIComponent(nick)}`;
  return { nick, link, texto: `Bora evoluir junto no Do It Better? 🔥 Rotina vira jogo, tem pet, ranking e grupo. Me adiciona: @${nick}\n${link}` };
}
async function convidarWhatsApp() {
  const { texto } = await textoConvite();
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}
async function compartilharConvite() {
  const { texto, link } = await textoConvite();
  try {
    await navigator.share({ title: 'Do It Better', text: texto, url: link });
  } catch (_) {}
}
async function colarConvite() {
  let t = '';
  try {
    t = await navigator.clipboard.readText();
  } catch (_) {
    t = '';
  }
  const nick = nickDoConvite(t);
  if (!nick) {
    toast('Copie o convite (o link ou o @nick) e toque aqui de novo.', { duracao: 4200 });
    const campo = elTela.querySelector('[name="busca"]');
    if (campo) campo.focus();
    return;
  }
  const campo = elTela.querySelector('[name="busca"]');
  if (campo) campo.value = '@' + nick;
  buscarJogador('@' + nick);
}

/** Extrai o nick de um link de convite ou de um texto com @nick. */
export function nickDoConvite(t) {
  const s = String(t || '');
  const m = s.match(/[?&]amigo=([a-z0-9_.]{3,20})/i) || s.match(/@([a-z0-9_.]{3,20})/i);
  return m ? m[1].toLowerCase() : '';
}

function copiar(texto) {
  const ok = () => toast('Copiado! 📋');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, () => toast(texto, { duracao: 6000 }));
  else toast(texto, { duracao: 6000 });
}

// ---------- Perfil de outro jogador ----------
async function verJogador(id) {
  const todos = [...(cache.ranking ? cache.ranking.lista : []), ...(cache.rankingAmigos || []), ...(cache.amigos || [])];
  let j = todos.find((x) => x.id === id);
  if (!j && cache.ranking && cache.ranking.eu && cache.ranking.eu.id === id) j = cache.ranking.eu;
  if (!j) return;
  const meuId = (Nuvem.usuario() || {}).id;
  const rel = (cache.amigos || []).find((a) => a.id === id);
  const mut = MUTACOES[(j.pet && j.pet.mutacao) || 0];
  const pet = j.pet && j.pet.especie ? petDoCatalogo(j.pet.especie) : null;
  abrirSheet({
    titulo: `@${j.nick}`,
    html: `<div class="perfil-jogador">
        <div class="palco-jogador">${bonecoDe(j, { tam: 'grande' })}${pet ? petDe(j, 'gg') : ''}</div>
        <div class="perfil-jogador-stats">
          <div><b>${j.nivel}</b><small>nível${j.prestigio ? ` ${'⭐'.repeat(j.prestigio)}` : ''}</small></div>
          <div><b>${formatarNumero(j.xp_semana || 0)}</b><small>XP semana</small></div>
          <div><b>🔥 ${j.sequencia || 0}</b><small>sequência</small></div>
          <div><b>${liga(j.liga).emoji}</b><small>${liga(j.liga).nome}</small></div>
        </div>
        ${pet ? `<p class="dica centro">Pet: <b>${esc((j.pet && j.pet.nome) || pet.nome)}</b> · ${esc(pet.especie)} · ${esc(mut.nome)}</p>` : ''}
        <p class="dica centro">Melhor sequência: ${j.melhor_sequencia || 0} dias</p>
        ${id === meuId ? '' : rel && rel.relacao === 'amigo' ? '<p class="dica centro">✓ Vocês são amigos</p>'
          : rel ? '<p class="dica centro">Pedido de amizade pendente</p>'
          : `<button class="btn primario largo" data-add="${id}">+ Adicionar amigo</button>`}
      </div>`,
    aoMontar(corpo, fechar) {
      const b = corpo.querySelector('[data-add]');
      if (b) b.addEventListener('click', () => {
        fechar();
        pedirAmizade(id);
      });
    },
  });
}

// ---------- Grupos ----------
function renderGrupos(box, { forcar }) {
  box.innerHTML = `<button class="btn primario largo" data-acao="novo-grupo">+ Criar grupo</button>
    <div class="grupos-lista">${carregandoHTML()}</div>`;
  const lista = box.querySelector('.grupos-lista');
  carregarGrupos({ forcar }).then((gs) => {
    if (!gs) return;
    lista.innerHTML = gs.length
      ? `<div class="lista card">${gs.map((g) => `<button class="item-linha grupo-linha" data-acao="ver-grupo" data-id="${g.id}">
          <span class="grupo-emoji">${esc(g.emoji)}</span>
          <span class="item-info"><span class="item-nome">${esc(g.nome)}</span><span class="item-sub">${g.membros} membro${g.membros > 1 ? 's' : ''}${g.dono === (Nuvem.usuario() || {}).id ? ' · você é o dono' : ''}</span></span>
          <span class="seta">›</span></button>`).join('')}</div>`
      : vazioHTML('🛡️', 'Nenhum grupo', 'Crie um grupo privado com seus amigos (família, academia, trabalho...) e tenham um ranking só de vocês.');
  }).catch((e) => (lista.innerHTML = erroHTML(e)));
}

async function abrirNovoGrupo() {
  let amigos = [];
  try {
    amigos = ((await carregarAmigos()) || []).filter((a) => a.relacao === 'amigo');
  } catch (e) {
    return toast(e.message, { tipo: 'erro' });
  }
  const EMOJIS = ['🏆', '🔥', '💪', '🏋️', '📚', '🎯', '⚡', '🐺', '👑', '🚀', '🌱', '🎮'];
  abrirSheet({
    titulo: 'Novo grupo',
    html: `<label class="campo"><span>Nome do grupo</span><input class="entrada" name="nome" maxlength="30" placeholder="Ex.: Galera da academia"></label>
      <div class="campo"><span>Ícone</span><div class="chips-linha">${EMOJIS.map((e, i) => `<button type="button" class="chip ${i ? '' : 'on'}" data-emoji="${e}">${e}</button>`).join('')}</div></div>
      <div class="campo"><span>Amigos no grupo</span>
        ${amigos.length ? `<div class="lista card">${amigos.map((a) => `<label class="item-linha"><input type="checkbox" name="m" value="${a.id}"> <span class="item-info"><span class="item-nome">@${esc(a.nick)}</span><span class="item-sub">Nv ${a.nivel}</span></span></label>`).join('')}</div>`
          : '<p class="dica">Você ainda não tem amigos para adicionar. Dá para criar o grupo e adicionar depois.</p>'}
      </div>
      <button class="btn primario largo" data-criar>Criar grupo</button>`,
    aoMontar(corpo, fechar) {
      let emoji = EMOJIS[0];
      corpo.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-emoji]');
        if (c) {
          emoji = c.dataset.emoji;
          corpo.querySelectorAll('[data-emoji]').forEach((x) => x.classList.toggle('on', x === c));
          return;
        }
        if (!e.target.closest('[data-criar]')) return;
        const nome = corpo.querySelector('[name="nome"]').value.trim();
        if (!nome) return toast('Dê um nome ao grupo', { tipo: 'erro' });
        const membros = [...corpo.querySelectorAll('[name="m"]:checked')].map((x) => x.value);
        try {
          await Nuvem.rpc('criar_grupo', { p_nome: nome, p_emoji: emoji, p_membros: membros });
          fechar();
          toast(`Grupo ${emoji} ${nome} criado!`);
          cache.grupos = null;
          render(elTela, { refazer: true });
        } catch (err) {
          toast(err.message, { tipo: 'erro' });
        }
      });
    },
  });
}

async function verGrupo(id) {
  const g = (cache.grupos || []).find((x) => x.id === id);
  if (!g) return;
  const meuId = (Nuvem.usuario() || {}).id;
  const { corpo, fechar } = abrirSheet({ titulo: `${g.emoji} ${g.nome}`, html: carregandoHTML() });
  const desenhar = async () => {
    try {
      const [rank, amigos] = await Promise.all([Nuvem.rpc('ranking_grupo', { p_grupo: id }), carregarAmigos().catch(() => [])]);
      const dentro = new Set(rank.map((j) => j.id));
      const fora = (amigos || []).filter((a) => a.relacao === 'amigo' && !dentro.has(a.id));
      const souDono = g.dono === meuId;
      corpo.innerHTML = `<p class="dica centro">Ranking da semana · zera toda segunda</p>
        <div class="lista-jogadores">${rank.map((j) => linhaJogador(j, { meuId, acao: 'nada', extra: `${souDono && j.id !== meuId ? `<span class="btn-mini" data-remover="${j.id}">Remover</span>` : ''}<span class="jogador-xp"><b>${formatarNumero(j.xp_semana || 0)}</b><small>XP</small></span>` })).join('')}</div>
        ${fora.length ? `<h3 class="secao-titulo">Adicionar amigos</h3><div class="lista-jogadores">${fora.map((a) => linhaJogador(a, { meuId, mostrarPos: false, acao: 'nada', extra: `<span class="btn-mini ok" data-add="${a.id}">+ Adicionar</span>` })).join('')}</div>` : ''}
        <button class="btn secundario largo perigo" data-sair>Sair do grupo</button>`;
    } catch (e) {
      corpo.innerHTML = erroHTML(e);
    }
  };
  corpo.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    const rem = e.target.closest('[data-remover]');
    try {
      if (add) {
        const r = await Nuvem.rpc('adicionar_ao_grupo', { p_grupo: id, p_amigo: add.dataset.add });
        if (!r.ok) return toast(r.erro, { tipo: 'erro' });
        toast('Adicionado ao grupo!');
        cache.grupos = null;
        return desenhar();
      }
      if (rem) {
        if (!(await confirmar('Remover essa pessoa do grupo?', { ok: 'Remover', perigo: true }))) return;
        await Nuvem.rpc('sair_do_grupo', { p_grupo: id, p_quem: rem.dataset.remover });
        cache.grupos = null;
        return desenhar();
      }
      if (e.target.closest('[data-sair]')) {
        if (!(await confirmar(`Sair do grupo ${g.nome}?`, { ok: 'Sair', perigo: true }))) return;
        await Nuvem.rpc('sair_do_grupo', { p_grupo: id });
        fechar();
        cache.grupos = null;
        render(elTela, { refazer: true });
      }
    } catch (err) {
      toast(err.message, { tipo: 'erro' });
    }
  });
  desenhar();
}

// ---------- Conta ----------
function renderConta(box, { forcar }) {
  const u = Nuvem.usuario() || {};
  const d = dados();
  box.innerHTML = `<section class="card conta-card">
      <div class="conta-topo">${bonecoDe({ avatar: d.avatar, fisico: undefined }, { tam: 'mini' })}
        <div><b class="conta-nick">@…</b><small>${esc(u.email || '')}</small></div></div>
      <div class="conta-codigo"><span>Seu código de amigo</span><b class="codigo-amigo">…</b></div>
      <div class="status-nuvem"></div>
      <button class="btn secundario largo" data-acao="sincronizar">☁️ Sincronizar agora</button>
    </section>
    <section class="card lista">
      <label class="item-linha"><span class="item-info"><span class="item-nome">Aparecer no ranking geral</span><span class="item-sub">Seus amigos e grupos sempre veem você</span></span>
        <input type="checkbox" class="interruptor" name="noRanking" ${d.ajustes.noRanking !== false ? 'checked' : ''}></label>
      <button class="item-linha" data-acao="trocar-nick"><span class="item-info"><span class="item-nome">Trocar nick</span><span class="item-sub">1 vez a cada 30 dias</span></span><span class="seta">›</span></button>
      <button class="item-linha" data-acao="novo-codigo"><span class="item-info"><span class="item-nome">Novo código de recuperação</span><span class="item-sub">Use se perdeu o seu (o antigo deixa de valer)</span></span><span class="seta">›</span></button>
      <button class="item-linha" data-acao="sair"><span class="item-info"><span class="item-nome">Sair da conta</span><span class="item-sub">O progresso continua neste aparelho</span></span><span class="seta">›</span></button>
      <button class="item-linha perigo" data-acao="excluir"><span class="item-info"><span class="item-nome">Excluir conta</span><span class="item-sub">Apaga tudo da nuvem (o aparelho mantém os dados)</span></span><span class="seta">›</span></button>
    </section>`;
  desenharStatusNuvem(box);
  carregarPerfil({ forcar }).then((p) => {
    if (!p) return;
    box.querySelector('.conta-nick').textContent = '@' + p.nick;
    box.querySelector('.codigo-amigo').innerHTML = `${esc(p.codigo)} <span class="btn-mini" data-acao="copiar" data-texto="${esc(p.codigo)}">Copiar</span>`;
  }).catch(() => {});
}

function desenharStatusNuvem(raiz) {
  const alvo = raiz.querySelector('.status-nuvem');
  if (!alvo) return;
  const s = Sync.estadoNuvem();
  const textos = {
    sincronizado: `✅ Tudo salvo na nuvem${s.ultimaSync ? ` · ${formatarDataHora(s.ultimaSync)}` : ''}`,
    pendente: '🕓 Mudanças esperando para subir…',
    enviando: '⬆️ Enviando…',
    offline: '📴 Sem internet: salvo no aparelho, sobe quando voltar',
    erro: `⚠️ Não consegui sincronizar: ${esc(s.erro)}`,
    desligado: 'Nuvem desligada',
  };
  alvo.className = `status-nuvem ${s.estado}`;
  alvo.innerHTML = textos[s.estado] || '';
}

async function gerarNovoCodigo() {
  if (!(await confirmar('Gerar um novo código de recuperação? O código antigo deixa de funcionar.', { ok: 'Gerar' }))) return;
  try {
    mostrarCodigo(await Nuvem.novoCodigo());
  } catch (e) {
    toast(e.message, { tipo: 'erro' });
  }
}

async function trocarNick() {
  abrirSheet({
    titulo: 'Trocar nick',
    html: `<label class="campo"><span>Novo nick</span><input class="entrada" name="nick" maxlength="20" placeholder="seu_nick" autocapitalize="off" spellcheck="false"></label>
      <p class="dica">De 3 a 20 letras minúsculas, números, _ ou ponto. Só dá para trocar 1 vez a cada 30 dias.</p>
      <button class="btn primario largo" data-ok>Trocar</button>`,
    aoMontar(corpo, fechar) {
      corpo.querySelector('[data-ok]').addEventListener('click', async () => {
        const v = corpo.querySelector('[name="nick"]').value;
        try {
          const r = await Nuvem.rpc('trocar_nick', { p_nick: v });
          if (!r.ok) return toast(r.erro, { tipo: 'erro', duracao: 4500 });
          fechar();
          toast(`Agora você é @${r.nick}`);
          cache.perfil = null;
          render(elTela, { refazer: true });
        } catch (e) {
          toast(e.message, { tipo: 'erro' });
        }
      });
    },
  });
}

async function sairDaConta() {
  if (!(await confirmar('Sair da conta neste aparelho? Seu progresso continua aqui e na nuvem.', { ok: 'Sair' }))) return;
  await Sync.enviar().catch(() => {});
  await Nuvem.sair();
  Sync.desligar();
  toast('Você saiu da conta.');
}

async function excluirConta() {
  if (!(await confirmar('Excluir sua conta? Isso apaga da nuvem o seu save, perfil, amizades e grupos. Não dá para desfazer. Os dados deste aparelho continuam aqui.', { titulo: 'Excluir conta', ok: 'Excluir para sempre', perigo: true }))) return;
  try {
    await Nuvem.excluirConta();
    Sync.desligar();
    toast('Conta excluída.');
  } catch (e) {
    toast(e.message, { tipo: 'erro' });
  }
}

// -------------------------------------------------------------
// Cadastro, login e recuperação
// -------------------------------------------------------------

function campoSenha(nome = 'senha', rotulo = 'Senha', auto = 'current-password') {
  return `<label class="campo"><span>${rotulo}</span><input class="entrada" type="password" name="${nome}" minlength="6" maxlength="72" autocomplete="${auto}" placeholder="mínimo 6 caracteres"></label>`;
}

export function abrirCadastro() {
  abrirSheet({
    titulo: 'Criar conta',
    html: `<label class="campo"><span>Seu nick (é assim que te acham)</span><div class="entrada-prefixo"><span>@</span><input class="entrada" name="nick" maxlength="20" placeholder="arthur" autocapitalize="off" spellcheck="false" autocomplete="username"></div></label>
      <label class="campo"><span>E-mail</span><input class="entrada" type="email" name="email" maxlength="120" placeholder="voce@email.com" autocapitalize="off" autocomplete="email"></label>
      ${campoSenha('senha', 'Senha', 'new-password')}
      <p class="dica">Não mandamos e-mail de confirmação. Depois de criar, você recebe um <b>código de recuperação</b> — guarde (tire um print) para trocar a senha se esquecer.</p>
      <button class="btn primario largo" data-ok>Criar conta</button>`,
    aoMontar(corpo, fechar) {
      const nick = corpo.querySelector('[name="nick"]');
      nick.addEventListener('input', () => (nick.value = nick.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')));
      const ok = corpo.querySelector('[data-ok]');
      ok.addEventListener('click', async () => {
        const v = (n) => corpo.querySelector(`[name="${n}"]`).value.trim();
        if (!/^[a-z0-9_.]{3,20}$/.test(v('nick'))) return toast('Nick: 3 a 20 letras minúsculas, números, _ ou .', { tipo: 'erro' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) return toast('Confira o e-mail', { tipo: 'erro' });
        if (corpo.querySelector('[name="senha"]').value.length < 6) return toast('A senha precisa de pelo menos 6 caracteres', { tipo: 'erro' });
        ok.disabled = true;
        ok.textContent = 'Criando…';
        try {
          const codigo = await Nuvem.cadastrar(v('email'), corpo.querySelector('[name="senha"]').value, v('nick'));
          fechar();
          await depoisDeEntrar();
          mostrarCodigo(codigo, { boasVindas: true });
          confete();
        } catch (e) {
          toast(e.message, { tipo: 'erro', duracao: 5000 });
          ok.disabled = false;
          ok.textContent = 'Criar conta';
        }
      });
    },
  });
}

export function abrirLogin() {
  abrirSheet({
    titulo: 'Entrar',
    html: `<label class="campo"><span>E-mail</span><input class="entrada" type="email" name="email" maxlength="120" autocapitalize="off" autocomplete="email"></label>
      ${campoSenha()}
      <button class="btn primario largo" data-ok>Entrar</button>
      <button class="btn-texto largo" data-esqueci>Esqueci a senha</button>`,
    aoMontar(corpo, fechar) {
      corpo.querySelector('[data-esqueci]').addEventListener('click', () => {
        fechar();
        abrirRecuperar(corpo.querySelector('[name="email"]').value.trim());
      });
      const ok = corpo.querySelector('[data-ok]');
      ok.addEventListener('click', async () => {
        ok.disabled = true;
        ok.textContent = 'Entrando…';
        try {
          await Nuvem.entrar(corpo.querySelector('[name="email"]').value, corpo.querySelector('[name="senha"]').value);
          fechar();
          await depoisDeEntrar();
        } catch (e) {
          toast(e.message, { tipo: 'erro', duracao: 4500 });
          ok.disabled = false;
          ok.textContent = 'Entrar';
        }
      });
    },
  });
}

function abrirRecuperar(email = '') {
  abrirSheet({
    titulo: 'Trocar a senha',
    html: `<p class="dica">Use o <b>código de recuperação</b> que apareceu quando você criou a conta (aquele do print 😉).</p>
      <label class="campo"><span>E-mail da conta</span><input class="entrada" type="email" name="email" value="${esc(email)}" autocapitalize="off"></label>
      <label class="campo"><span>Código de recuperação</span><input class="entrada" name="codigo" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" spellcheck="false"></label>
      ${campoSenha('nova', 'Nova senha', 'new-password')}
      <button class="btn primario largo" data-ok>Trocar senha e entrar</button>
      <p class="dica">Perdeu o código também? Fale com quem te passou o app: o administrador consegue redefinir sua senha.</p>`,
    aoMontar(corpo, fechar) {
      const ok = corpo.querySelector('[data-ok]');
      ok.addEventListener('click', async () => {
        const v = (n) => corpo.querySelector(`[name="${n}"]`).value.trim();
        ok.disabled = true;
        try {
          const codigo = await Nuvem.recuperarSenha(v('email'), v('codigo'), corpo.querySelector('[name="nova"]').value);
          fechar();
          await depoisDeEntrar();
          mostrarCodigo(codigo, { novo: true });
        } catch (e) {
          toast(e.message, { tipo: 'erro', duracao: 4500 });
          ok.disabled = false;
        }
      });
    },
  });
}

/** Mostra o código de recuperação (só aparece uma vez!). */
function mostrarCodigo(codigo, { boasVindas = false, novo = false } = {}) {
  abrirSheet({
    titulo: boasVindas ? 'Conta criada! 🎉' : 'Código de recuperação',
    html: `<div class="codigo-recuperacao">
        ${boasVindas ? '<p>Seu progresso agora fica salvo na nuvem. Antes de continuar, <b>guarde este código</b>:</p>' : novo ? '<p>Senha trocada! Este é o seu <b>novo</b> código (o anterior não vale mais):</p>' : '<p>Seu novo código de recuperação:</p>'}
        <b class="codigo-grande">${esc(codigo)}</b>
        <button class="btn secundario largo" data-copiar>📋 Copiar código</button>
        <p class="dica">Ele é a única forma de trocar a senha se você esquecer (o app não manda e-mail). <b>Tire um print agora</b> ou salve nas notas.</p>
        <label class="item-linha"><input type="checkbox" data-guardei> <span>Guardei o código</span></label>
        <button class="btn primario largo" data-ok disabled>Continuar</button>
      </div>`,
    aoMontar(corpo, fechar) {
      corpo.querySelector('[data-copiar]').addEventListener('click', () => copiar(codigo));
      const ok = corpo.querySelector('[data-ok]');
      corpo.querySelector('[data-guardei]').addEventListener('change', (e) => (ok.disabled = !e.target.checked));
      ok.addEventListener('click', fechar);
    },
  });
}

/** Depois de entrar: decide o que fazer com o progresso deste aparelho × nuvem. */
async function depoisDeEntrar() {
  limparCache();
  try {
    const r = await Sync.aposEntrar();
    if (r.precisaEscolher) {
      const usarNuvem = await confirmar(
        `Encontrei progresso na nuvem (nível ${r.nuvem.nivel}, ${formatarNumero(r.nuvem.xp)} XP) e neste aparelho (nível ${r.local.nivel}, ${formatarNumero(r.local.xp)} XP). Qual você quer manter? O outro fica guardado como cópia de segurança.`,
        { titulo: 'Qual progresso usar?', ok: `☁️ Nuvem (nível ${r.nuvem.nivel})`, cancelar: `📱 Este aparelho (nível ${r.local.nivel})` }
      );
      await Sync.escolher(usarNuvem ? 'nuvem' : 'aparelho', r.remoto);
      toast(usarNuvem ? 'Progresso da nuvem carregado ☁️' : 'Progresso deste aparelho enviado para a nuvem ☁️');
    } else if (r.baixou) {
      toast('Seu progresso foi carregado da nuvem ☁️');
    } else {
      toast('Progresso salvo na nuvem ☁️');
    }
  } catch (e) {
    toast(`Entrou, mas não consegui sincronizar: ${e.message}`, { tipo: 'erro', duracao: 5000 });
  }
  secao = 'ranking';
  if (elTela) render(elTela, { forcar: true });
  document.dispatchEvent(new CustomEvent('dib-redesenhar-badges'));
  continuarConvite();
}

/** Se a pessoa entrou mas o app fechou antes da escolha do progresso, retoma. */
export function talvezVincular() {
  if (Nuvem.logado() && !Sync.vinculado()) depoisDeEntrar();
}

// -------------------------------------------------------------
// Convite pelo link (?amigo=nick)
// -------------------------------------------------------------

/** Chamado pelo app ao abrir: se veio de um link de convite, trata. */
export function tratarConviteDoLink() {
  const p = new URLSearchParams(location.search);
  const nick = nickDoConvite(`?amigo=${p.get('amigo') || ''}`);
  if (!nick) return false;
  try {
    history.replaceState(null, '', location.pathname);
  } catch (_) {}
  const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  abrirSheet({
    titulo: `@${nick} te convidou! 🔥`,
    html: `<div class="convite">
        <p>Seu amigo quer evoluir junto com você no <b>Do It Better</b>: rotina vira jogo, com pet, ranking e grupos.</p>
        ${!instalado && ios ? `<div class="card convite-passos">
          <b>📱 Já tem o app na tela de início?</b>
          <p>Copie o convite, abra o app e vá em <b>Social → Amigos → Colar convite</b>.</p>
          <button class="btn secundario largo" data-copiar>📋 Copiar convite @${esc(nick)}</button>
        </div>
        <div class="card convite-passos">
          <b>✨ Ainda não tem?</b>
          <p>Toque em <b>Compartilhar</b> (o quadrado com a seta) e depois em <b>Adicionar à Tela de Início</b>. Abra o app por lá, crie sua conta e cole o convite.</p>
        </div>` : ''}
        ${Nuvem.logado() ? `<button class="btn primario largo" data-ver>Ver @${esc(nick)} e adicionar</button>`
          : `<button class="btn primario largo" data-criar>Criar conta e adicionar @${esc(nick)}</button><button class="btn-texto largo" data-entrar>Já tenho conta</button>`}
      </div>`,
    aoMontar(corpo, fechar) {
      const c = corpo.querySelector('[data-copiar]');
      if (c) c.addEventListener('click', () => copiar(`@${nick} ${LINK_APP()}?amigo=${nick}`));
      const irParaAmigos = () => {
        fechar();
        sessionStorage.setItem('dib-convite', nick);
        document.dispatchEvent(new CustomEvent('dib-ir', { detail: { aba: 'social', secao: 'amigos' } }));
      };
      const v = corpo.querySelector('[data-ver]');
      if (v) v.addEventListener('click', irParaAmigos);
      const cr = corpo.querySelector('[data-criar]');
      if (cr) cr.addEventListener('click', () => {
        sessionStorage.setItem('dib-convite', nick);
        fechar();
        abrirCadastro();
      });
      const en = corpo.querySelector('[data-entrar]');
      if (en) en.addEventListener('click', () => {
        sessionStorage.setItem('dib-convite', nick);
        fechar();
        abrirLogin();
      });
    },
  });
  return true;
}

/** Se há um convite guardado e já está logado, busca o amigo na aba Amigos. */
export function continuarConvite() {
  const nick = sessionStorage.getItem('dib-convite');
  if (!nick || !Nuvem.logado() || !elTela) return;
  sessionStorage.removeItem('dib-convite');
  secao = 'amigos';
  render(elTela, { refazer: true });
  const campo = elTela.querySelector('[name="busca"]');
  if (campo) campo.value = '@' + nick;
  buscarJogador('@' + nick);
}
