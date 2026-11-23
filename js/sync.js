// =============================================================
// sync.js — SINCRONIZAÇÃO com a nuvem (offline primeiro).
//
// • O jogo continua salvando no aparelho (store.js), como sempre.
// • Logado, cada gravação marca "pendente" e, alguns segundos depois,
//   o jogo inteiro sobe para a nuvem (tabela saves, com número de revisão).
// • Ao abrir o app (e ao voltar para ele), confere se a nuvem tem uma
//   versão mais nova — por exemplo, salva em outro celular — e baixa.
// • Conflito (os dois aparelhos mudaram): vale o mais recente; o outro
//   fica guardado como cópia de segurança no aparelho.
// • Junto com o save, publica o PERFIL PÚBLICO (nick, nível, XP da semana,
//   personagem, pet, sequência) usado no ranking e pelos amigos.
// =============================================================

import * as Store from './store.js';
import * as Nuvem from './nuvem.js';
import { hojeKey, inicioSemana } from './utils.js';
import { nivelInfo } from './xp.js';
import { xpDaSemana, ligaAtual } from './missoes.js';
import { sequenciaRotina, resumoRotina } from './historico.js';
import { fisicoAtual } from './visual.js';

const CHAVE_META = 'doitbetter:nuvem';
const ESPERA = 4000; // ms depois da última mudança para enviar

let meta = lerMeta();
let timer = null;
let enviando = null;
let aplicandoRemoto = false;
let estado = Nuvem.logado() ? 'sincronizado' : 'desligado';
let ultimoErro = '';

function lerMeta() {
  try {
    const m = { rev: null, pendente: false, alteradoEm: 0, ultimaSync: 0, vinculado: false, ...JSON.parse(localStorage.getItem(CHAVE_META) || '{}') };
    // quem já sincronizava antes desta marcação continua vinculado
    if (m.vinculado === false && m.rev !== null) m.vinculado = true;
    return m;
  } catch (_) {
    return { rev: null, pendente: false, alteradoEm: 0, ultimaSync: 0, vinculado: false };
  }
}
function gravarMeta() {
  try {
    localStorage.setItem(CHAVE_META, JSON.stringify(meta));
  } catch (_) {}
}

function mudarEstado(e, erro = '') {
  estado = e;
  ultimoErro = erro;
  window.dispatchEvent(new CustomEvent('dib-nuvem', { detail: { estado, erro } }));
}

/** Este aparelho já decidiu o que fazer com o progresso (primeiro login)? */
export const vinculado = () => !!meta.vinculado;

/** Estado para a interface: desligado | sincronizado | pendente | enviando | offline | erro */
export function estadoNuvem() {
  return { estado, erro: ultimoErro, ultimaSync: meta.ultimaSync };
}

const dispositivo = () => {
  const ua = navigator.userAgent || '';
  return /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : 'Computador';
};

/** Resumo público do jogador (o que os outros veem). */
export function resumoPublico() {
  const d = Store.dados();
  const info = nivelInfo(d.xp.total);
  return {
    avatar: d.avatar,
    fisico: fisicoAtual().n,
    pet: { especie: d.pet.especie, nome: d.pet.nome, skin: d.pet.skin, mutacao: d.pet.mutacao || 0 },
    nivel: info.nivel,
    prestigio: d.xp.prestigio || 0,
    xp_total: d.xp.total,
    sequencia: sequenciaRotina(),
    melhor_sequencia: d.stats.melhorSequencia || 0,
    semana: inicioSemana(hojeKey()),
    xp_semana: xpDaSemana(),
    liga: ligaAtual().i,
    no_ranking: d.ajustes.noRanking !== false,
    // status de hoje (usado pelos lembretes no celular)
    status_dia: (() => {
      const r = resumoRotina(hojeKey());
      return { dia: hojeKey(), feitos: r.feitos, total: r.total, fome: (d.pet.comida ?? 80) < 30, sede: (d.pet.agua ?? 80) < 30, pet: d.pet.nome || '', sequencia: sequenciaRotina() };
    })(),
  };
}

/** Resumo curto de um save (para a pergunta "qual progresso manter?"). */
export function resumoDoSave(d) {
  if (!d || !d.xp) return { nivel: 1, xp: 0 };
  return { nivel: nivelInfo(d.xp.total).nivel, xp: d.xp.total || 0, nome: (d.ajustes && d.ajustes.nome) || '' };
}

// -------------------------------------------------------------
// Envio
// -------------------------------------------------------------

function agendar() {
  clearTimeout(timer);
  timer = setTimeout(() => enviar(), ESPERA);
}

/** Envia o save (e o perfil público) se houver algo pendente. */
export async function enviar({ forcar = false } = {}) {
  // até decidir o que fazer com o progresso no primeiro login, nada sobe
  if (!Nuvem.logado() || !meta.vinculado) return;
  if (!forcar && !meta.pendente) return;
  if (!Nuvem.online()) return mudarEstado('offline');
  if (enviando) return enviando;
  enviando = (async () => {
    mudarEstado('enviando');
    try {
      const r = await Nuvem.rpc('salvar_save', { p_dados: Store.dados(), p_rev_base: meta.rev, p_dispositivo: dispositivo() });
      if (r.conflito) {
        // outro aparelho salvou antes: decide quem fica
        await resolverConflito();
        return;
      }
      meta.rev = r.rev;
      meta.pendente = false;
      meta.ultimaSync = Date.now();
      gravarMeta();
      await Nuvem.rpc('publicar_perfil', { p: resumoPublico() }).catch(() => {});
      mudarEstado('sincronizado');
    } catch (e) {
      mudarEstado(Nuvem.online() ? 'erro' : 'offline', e.message);
      if (!Nuvem.logado()) mudarEstado('desligado');
    } finally {
      enviando = null;
    }
  })();
  return enviando;
}

/** Vale o mais recente; o outro vira cópia de segurança no aparelho. */
async function resolverConflito() {
  const remoto = await Nuvem.lerSave();
  if (!remoto) {
    meta.rev = null;
    gravarMeta();
    enviando = null;
    return enviar({ forcar: true });
  }
  const remotoEm = Date.parse(remoto.atualizado_em) || 0;
  if (remotoEm > (meta.alteradoEm || 0)) {
    aplicarRemoto(remoto); // a nuvem é mais nova
  } else {
    guardarCopia(remoto.dados);
    meta.rev = remoto.rev;
    gravarMeta();
    enviando = null;
    await enviar({ forcar: true }); // este aparelho é mais novo
  }
}

function guardarCopia(dados) {
  try {
    localStorage.setItem('doitbetter:backup-anterior', JSON.stringify(dados));
  } catch (_) {}
}

function aplicarRemoto(remoto) {
  aplicandoRemoto = true;
  try {
    Store.importar({ app: 'do-it-better', dados: remoto.dados }); // guarda a versão local como backup
  } finally {
    aplicandoRemoto = false;
  }
  meta.rev = remoto.rev;
  meta.pendente = false;
  meta.ultimaSync = Date.now();
  meta.vinculado = true;
  gravarMeta();
  mudarEstado('sincronizado');
  window.dispatchEvent(new CustomEvent('dib-nuvem-baixou'));
}

// -------------------------------------------------------------
// Recebimento
// -------------------------------------------------------------

/** Confere se a nuvem tem uma versão mais nova e baixa. */
export async function puxar() {
  if (!Nuvem.logado() || !Nuvem.online() || !meta.vinculado) return;
  try {
    const info = await Nuvem.lerSave({ comDados: false });
    if (!info) {
      meta.rev = null;
      meta.pendente = true;
      gravarMeta();
      return enviar();
    }
    if (meta.rev !== null && info.rev <= meta.rev) {
      if (meta.pendente) return enviar();
      return mudarEstado('sincronizado');
    }
    const remoto = await Nuvem.lerSave();
    if (meta.pendente && (Date.parse(remoto.atualizado_em) || 0) < (meta.alteradoEm || 0)) {
      // mudei aqui depois da última versão da nuvem: este aparelho ganha
      guardarCopia(remoto.dados);
      meta.rev = remoto.rev;
      gravarMeta();
      return enviar({ forcar: true });
    }
    aplicarRemoto(remoto);
  } catch (e) {
    mudarEstado(Nuvem.online() ? 'erro' : 'offline', e.message);
  }
}

// -------------------------------------------------------------
// Primeiro login neste aparelho
// -------------------------------------------------------------

/**
 * Depois de entrar: devolve { precisaEscolher, local, nuvem } quando os dois
 * lados têm progresso; senão já resolve sozinho.
 */
export async function aposEntrar() {
  meta.vinculado = false;
  meta.rev = null;
  gravarMeta();
  const remoto = await Nuvem.lerSave();
  const local = Store.dados();
  const localTemProgresso = (local.xp.total || 0) > 0 || local.xp.lancamentos.length > 0;
  if (!remoto) {
    meta = { rev: null, pendente: true, alteradoEm: Date.now(), ultimaSync: 0, vinculado: true };
    gravarMeta();
    await enviar({ forcar: true });
    return { precisaEscolher: false };
  }
  if (!localTemProgresso) {
    aplicarRemoto(remoto);
    return { precisaEscolher: false, baixou: true };
  }
  return { precisaEscolher: true, local: resumoDoSave(local), nuvem: resumoDoSave(remoto.dados), remoto };
}

/** Resolve a escolha do primeiro login: 'nuvem' ou 'aparelho'. */
export async function escolher(lado, remoto) {
  if (lado === 'nuvem') return aplicarRemoto(remoto);
  guardarCopia(remoto.dados);
  meta.rev = remoto.rev;
  meta.pendente = true;
  meta.alteradoEm = Date.now();
  meta.vinculado = true;
  gravarMeta();
  return enviar({ forcar: true });
}

/** Ao sair da conta: este aparelho continua com os dados, só para de sincronizar. */
export function desligar() {
  meta = { rev: null, pendente: false, alteradoEm: 0, ultimaSync: 0, vinculado: false };
  gravarMeta();
  mudarEstado('desligado');
}

// -------------------------------------------------------------
// Início
// -------------------------------------------------------------

export function iniciarSync() {
  Store.aoGravar(() => {
    if (aplicandoRemoto) return;
    meta.pendente = true;
    meta.alteradoEm = Date.now();
    gravarMeta();
    if (!Nuvem.logado()) return;
    if (estado !== 'enviando') mudarEstado('pendente');
    agendar();
  });
  document.addEventListener('visibilitychange', () => {
    if (!Nuvem.logado()) return;
    if (document.visibilityState === 'hidden') enviar();
    else puxar();
  });
  window.addEventListener('online', () => Nuvem.logado() && puxar());
  window.addEventListener('offline', () => Nuvem.logado() && mudarEstado('offline'));
  setInterval(() => Nuvem.logado() && meta.pendente && enviar(), 60000);
  if (Nuvem.logado()) setTimeout(puxar, 1500);
}
