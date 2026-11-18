// =============================================================
// store.js — CAMADA ÚNICA DE DADOS do app.
//
// • Todos os dados ficam em UM objeto, salvo no localStorage do aparelho
//   (sem servidor, sem login).
// • O objeto tem um número de versão do esquema (schemaVersion).
//   Quando você adicionar recursos no futuro e precisar mudar o formato
//   dos dados, NÃO apague nada: aumente SCHEMA_VERSION e escreva uma
//   migração em MIGRACOES (veja o exemplo comentado lá embaixo).
// • Campos novos que só precisam de um valor padrão nem precisam de
//   migração: basta colocá-los em estadoPadrao() — a função normalizar()
//   preenche o que estiver faltando nos dados antigos.
// =============================================================

import { hojeKey } from './utils.js';
import { AVATAR_PADRAO } from './visual-padrao.js';

/** Versão atual do formato dos dados. Aumente ao criar uma migração. */
export const SCHEMA_VERSION = 3;

/** Chave usada no localStorage. */
const CHAVE = 'doitbetter:dados';
/** Cópia de segurança automática feita antes de importar/apagar. */
const CHAVE_BACKUP = 'doitbetter:backup-anterior';

let estado = null;
let primeiraVez = false;
const ouvintes = new Set();

/** Estrutura completa dos dados com valores padrão. */
export function estadoPadrao() {
  return {
    schemaVersion: SCHEMA_VERSION,
    criadoEm: hojeKey(), // dia em que o app foi aberto pela primeira vez
    meta: {
      ultimoDia: hojeKey(), // último dia "aberto" (para detectar a virada do dia)
      exemplosCriados: false,
      onboardingFeito: false, // questionário de primeira entrada
      avatarCriado: false, // já montou o personagem?
    },
    // Personagem do jogador (boneco em pixel art)
    avatar: { ...AVATAR_PADRAO },
    guardaRoupa: [], // itens de visual comprados na loja (ex.: 'cabelo:coque')
    visualVisto: [], // itens de progresso já liberados
    visualNovos: [], // liberados e ainda não vistos
    // O pet e suas necessidades (0 a 100)
    pet: {
      especie: 'cachorro',
      nome: '',
      skin: 'normal',
      forca: 85,
      limpeza: 85,
      alegria: 85,
      diasSemCuidado: 0,
    },
    // Perfil do jogador (preenchido no questionário de primeira entrada)
    perfil: {
      objetivo: '',
      focos: [], // áreas: saude, treino, estudos, trabalho, casa, financas, mente, sono
      acorda: '07:00',
      personagem: 'raposa', // companheiro ativo
    },
    // Economia do jogo
    carteira: {
      moedas: 0,
      escudos: 0, // protegem a sequência em um dia falhado
      boostAte: 0, // poção de XP ativa até este timestamp
      boostPct: 50, // força da poção ativa (%)
      ampulhetaDia: null, // dia em que a ampulheta (+1h nos horários) está ativa
      inventario: { petisco: 1, racao: 0, brinquedo: 0, sabonete: 1, kit: 0, ampulheta: 0, bauMisterioso: 0 },
    },
    colecao: {}, // { idPersonagem: timestampDoDesbloqueio }
    colecaoVista: [], // personagens já vistos (para o aviso de "novo")
    loja: {
      temas: ['neon'],
      temaAtivo: 'neon',
      skinsPet: ['normal'],
    },
    ajustes: {
      nome: '',
      tema: 'escuro', // 'escuro' | 'claro'
      xp: {
        rotinaPadrao: 10, // XP padrão de um item novo da rotina
        rotinaBonus: 50, // bônus ao completar 100% da rotina do dia
        pendAlta: 30,
        pendMedia: 20,
        pendBaixa: 10,
        treino: 100, // por treino finalizado
        treinoRecorde: 50, // bônus se bater recorde de carga
        agua: 15, // ao bater a meta de água do dia
      },
      metaTreinosSemana: 4,
      metaAgua: 8, // copos por dia
      limiteGastos: 0, // 0 = sem limite
      sons: true,
    },
    // XP: lançamentos individuais (permite desfazer sem duplicar pontos)
    xp: {
      total: 0,
      lancamentos: [], // { id, dia, ts, base, mult, xp, fonte, ref, rotulo }
      porDia: {}, // { 'AAAA-MM-DD': xp } — cache para gráficos
    },
    conquistas: {}, // { idConquista: timestampDoDesbloqueio }
    stats: {
      melhorSequencia: 0, // maior sequência de rotina 100%
      checkinSeq: 0, // dias seguidos abrindo o baú diário
      melhorCheckin: 0,
      ultimoCheckin: null,
      checksCedo: 0, // desafios matinais cumpridos no prazo
      missoesResgatadas: 0,
      melhorLiga: 0, // índice da melhor liga semanal
      comboMax: 0,
    },
    // Painel (tela Hoje): ordem, visibilidade e tamanho dos blocos
    painel: [], // { id, tipo, ref?, ativo, tamanho: 'p' | 'g' }
    // Rotina: itens recorrentes
    rotina: [], // { id, nome, emoji, xp, dias: null | [0..6], horario: 'HH:MM' | null, criadoEm, exemplo }
    // Blocos de check personalizados (ex.: Quarto arrumado)
    checks: [], // { id, chave, nome, emoji, xp, dias, horaLimite, criadoEm, melhorSequencia, exemplo }
    // Registro de cada dia (é aqui que os checks diários "reiniciam": cada dia tem o seu)
    diario: {}, // { 'AAAA-MM-DD': { rotina:{id:{lanc,ts}}, checks:{id:{lanc,ts}}, agua, aguaLanc, bonusRotina, resumo } }
    pendencias: [], // { id, titulo, descricao, prazo, prioridade, etiqueta, criadaEm, concluidaEm, concluidaDia, lanc, xpGanho }
    etiquetas: ['Trabalho', 'Pessoal', 'Casa'],
    notas: [], // { id, texto, criadaEm, editadaEm }
    compras: [], // { id, nome, comprado }
    gastos: [], // { id, valor, descricao, dia }
    treinos: {
      fichas: [], // { id, nome, exemplo, exercicios: [{ id, nome, grupo, series, reps, carga, descanso }] }
      sessoes: [], // histórico de treinos finalizados
      ultimaFichaId: null, // para o rodízio A -> B -> C -> A
      emAndamento: null, // treino em andamento (sobrevive se o app fechar)
    },
  };
}

// -------------------------------------------------------------
// MIGRAÇÕES
// Cada função recebe os dados na versão N e devolve na versão N+1.
// Exemplo para o futuro (versão 1 -> 2):
//
//   2: (d) => {
//     // renomeia um campo sem perder dados
//     d.ajustes.metaCopos = d.ajustes.metaAgua;
//     delete d.ajustes.metaAgua;
//     return d;
//   },
//
// Depois é só mudar SCHEMA_VERSION para 2.
// -------------------------------------------------------------
const MIGRACOES = {
  // 1: dados criados antes de existir versão (não deve acontecer, mas é seguro)
  1: (d) => d,

  // 2: personagens, moedas, missões, questionário e medalhas por níveis.
  // Os campos novos recebem padrão via normalizar(); aqui só o que depende
  // dos dados antigos.
  2: (d) => {
    d.meta = d.meta || {};
    d.meta.onboardingFeito = false; // todos veem o questionário novo uma vez
    // Moedas iniciais proporcionais ao XP já conquistado + 1 escudo de presente
    d.carteira = { moedas: Math.floor((d.xp && d.xp.total ? d.xp.total : 0) / 10), escudos: 1, boostAte: 0 };
    // Medalhas antigas -> novas séries (mantém a data do desbloqueio)
    const mapa = {
      'primeiro-treino': 'treinos-1', 'rotina-7': 'sequencia-2', 'rotina-30': 'sequencia-3',
      'quarto-30': 'quarto-2', 'pend-1': 'pendencias-1', 'nivel-5': 'nivel-1', 'nivel-10': 'nivel-2',
      'recorde': 'recordes-1', 'dia-perfeito': 'perfeitos-1', 'hidratado': 'agua-1',
    };
    const novas = {};
    for (const [k, ts] of Object.entries(d.conquistas || {})) novas[mapa[k] || k] = ts;
    delete novas['primeiro-xp'];
    d.conquistas = novas;
    return d;
  },

  // 3: personagem humano em pixel art + pet com necessidades + horários.
  // O companheiro antigo (emoji) vira o seu pet, com o mesmo nome.
  3: (d) => {
    const mapa = {
      raposa: 'raposa', panda: 'panda', lobo: 'lobo', gato: 'gato', tartaruga: 'tartaruga', coruja: 'coruja',
      abelha: 'pinguim', leao: 'urso', golfinho: 'slime', galo: 'pintinho', polvo: 'pantera', robo: 'robo',
      tubarao: 'husky', aguia: 'fenix', unicornio: 'dragaoGelo', dragao: 'dragao',
    };
    const nomes = { raposa: 'Kira', panda: 'Bao', lobo: 'Rex' };
    const antigo = (d.perfil && d.perfil.personagem) || 'raposa';
    d.pet = { especie: mapa[antigo] || 'cachorro', nome: nomes[antigo] || '', skin: 'normal', forca: 85, limpeza: 85, alegria: 85, diasSemCuidado: 0 };
    const colecao = {};
    for (const [k, ts] of Object.entries(d.colecao || {})) if (mapa[k]) colecao[mapa[k]] = ts;
    d.colecao = colecao;
    d.colecaoVista = Object.keys(colecao);
    d.meta = d.meta || {};
    d.meta.avatarCriado = false; // o app abre o criador de personagem uma vez
    d.meta.novidadeV3 = true; // mostra a explicação da novidade no criador
    return d;
  },
};

/** Aplica, em ordem, todas as migrações necessárias. */
export function migrar(d) {
  let v = Number(d.schemaVersion) || 0;
  if (v > SCHEMA_VERSION) {
    // Dados de uma versão MAIS NOVA do app: não mexe, só avisa.
    console.warn(`Dados na versão ${v}, app na versão ${SCHEMA_VERSION}.`);
    return d;
  }
  while (v < SCHEMA_VERSION) {
    const proxima = v + 1;
    const fn = MIGRACOES[proxima];
    if (fn) d = fn(d) || d;
    v = proxima;
    d.schemaVersion = v;
  }
  return d;
}

/** Preenche campos ausentes com os padrões (sem sobrescrever o que existe). */
function normalizar(alvo, padrao) {
  for (const k of Object.keys(padrao)) {
    const p = padrao[k];
    if (alvo[k] === undefined || alvo[k] === null && p !== null && typeof p === 'object') {
      alvo[k] = structuredCloneSeguro(p);
    } else if (p && typeof p === 'object' && !Array.isArray(p) && alvo[k] && typeof alvo[k] === 'object' && !Array.isArray(alvo[k])) {
      // Objetos de "mapa" (chaves dinâmicas) não são normalizados por dentro.
      if (Object.keys(p).length > 0) normalizar(alvo[k], p);
    }
  }
  return alvo;
}

function structuredCloneSeguro(v) {
  return JSON.parse(JSON.stringify(v));
}

// -------------------------------------------------------------
// API pública
// -------------------------------------------------------------

/** Carrega os dados do aparelho (ou cria a estrutura inicial). */
export function carregar() {
  let bruto = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch (e) {
    console.error('localStorage indisponível', e);
  }
  if (!bruto) {
    estado = estadoPadrao();
    primeiraVez = true;
    return estado;
  }
  try {
    const d = JSON.parse(bruto);
    estado = normalizar(migrar(d), estadoPadrao());
  } catch (e) {
    console.error('Dados corrompidos; guardando cópia e recomeçando.', e);
    try {
      localStorage.setItem(CHAVE + ':corrompido:' + Date.now(), bruto);
    } catch (_) {}
    estado = estadoPadrao();
    primeiraVez = true;
  }
  return estado;
}

/** true se não havia dados salvos quando o app abriu. */
export function ehPrimeiraVez() {
  return primeiraVez;
}

/** Acesso direto ao objeto de dados (leitura e escrita; depois chame salvar()). */
export function dados() {
  if (!estado) carregar();
  return estado;
}

/**
 * Grava no aparelho.
 * @param {{silencioso?: boolean}} opcoes silencioso = não redesenha a tela
 */
export function salvar(opcoes = {}) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    console.error('Falha ao salvar', e);
    // Avisa a interface (o app mostra um toast)
    window.dispatchEvent(new CustomEvent('dib-erro-salvar', { detail: e }));
  }
  if (!opcoes.silencioso) ouvintes.forEach((fn) => fn());
}

/** Altera os dados dentro de uma função e salva em seguida. */
export function alterar(fn, opcoes) {
  const r = fn(estado);
  salvar(opcoes);
  return r;
}

/** Registra uma função chamada sempre que os dados mudarem. */
export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Gera o objeto de backup (para exportar em .json). */
export function exportar() {
  return {
    app: 'do-it-better',
    exportadoEm: new Date().toISOString(),
    schemaVersion: estado.schemaVersion,
    dados: estado,
  };
}

/**
 * Importa um backup. Aceita o formato exportado ou o objeto de dados puro.
 * Lança erro com mensagem amigável se o arquivo for inválido.
 */
export function importar(obj) {
  const d = obj && obj.app === 'do-it-better' && obj.dados ? obj.dados : obj;
  if (!d || typeof d !== 'object' || !d.ajustes || !d.xp || !Array.isArray(d.rotina)) {
    throw new Error('Este arquivo não parece ser um backup do Do It Better.');
  }
  if ((Number(d.schemaVersion) || 0) > SCHEMA_VERSION) {
    throw new Error('Este backup foi feito por uma versão mais nova do app. Atualize o app antes de importar.');
  }
  guardarBackupAnterior();
  estado = normalizar(migrar(structuredCloneSeguro(d)), estadoPadrao());
  estado.meta.exemplosCriados = true; // nunca recriar exemplos sobre um backup
  salvar();
}

/** Apaga tudo e recomeça do zero (sem dados de exemplo). */
export function apagarTudo() {
  guardarBackupAnterior();
  estado = estadoPadrao();
  estado.meta.exemplosCriados = true;
  salvar();
}

/** Guarda uma cópia do estado atual antes de operações destrutivas. */
function guardarBackupAnterior() {
  try {
    if (estado) localStorage.setItem(CHAVE_BACKUP, JSON.stringify(estado));
  } catch (_) {
    /* sem espaço: ignora, é só uma garantia extra */
  }
}

/** Tamanho aproximado dos dados salvos, em KB. */
export function tamanhoKB() {
  try {
    return Math.round((localStorage.getItem(CHAVE) || '').length / 1024);
  } catch (_) {
    return 0;
  }
}

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
export function pedirArmazenamentoPersistente() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}
