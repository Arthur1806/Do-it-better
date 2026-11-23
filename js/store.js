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
export const SCHEMA_VERSION = 6;

/** Chave usada no localStorage. */
const CHAVE = 'doitbetter:dados';
/** Cópia de segurança automática feita antes de importar/apagar. */
const CHAVE_BACKUP = 'doitbetter:backup-anterior';

let estado = null;
let primeiraVez = false;
const ouvintes = new Set();
const gravacoes = new Set(); // avisados em TODA gravação (inclusive as silenciosas) — usado pela nuvem

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
      jornadaFeita: false, // tutorial em missões (v6)
      jornada: { passo: 0 },
      resumoVisto: null, // dia em que o resumo de ontem já foi mostrado
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
      comida: 85,
      agua: 85,
      atualizadoEm: null, // para calcular fome e sede pelo tempo
      diasSemCuidado: 0,
      diasBemCuidado: 0, // dias seguidos terminando bem cuidado (a cada 3: +1 DNA)
      mutacao: 0, // 0 Filhote · 1 Mutante · 2 Fera · 3 Fera Suprema (v5)
      mutacaoMax: 0, // maior estágio que já teve (voltar a ele custa metade)
      travaPerda: false,
      perdeuMutacaoEm: null,
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
      dna: 0, // DNA mutante 🧬 (v5): paga as mutações do pet
      boostAte: 0, // poção de XP ativa até este timestamp
      boostPct: 50, // força da poção ativa (%)
      ampulhetaDia: null, // dia em que a ampulheta (+1h nos horários) está ativa
      inventario: { comida: 3, agua: 3, petisco: 1, racao: 0, brinquedo: 0, sabonete: 1, kit: 0, ampulheta: 0, bauMisterioso: 0 },
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
        refeicao: 8, // por refeição da dieta cumprida (v5.2)
        dietaBonus: 30, // bônus ao cumprir todas as refeições do dia
      },
      metaTreinosSemana: 4,
      metaAgua: 8, // copos por dia
      limiteGastos: 0, // 0 = sem limite
      sons: true,
      noRanking: true, // aparecer no ranking geral (v5.1)
    },
    // XP: lançamentos individuais (permite desfazer sem duplicar pontos)
    xp: {
      total: 0,
      lancamentos: [], // { id, dia, ts, base, mult, xp, fonte, ref, rotulo }
      porDia: {}, // { 'AAAA-MM-DD': xp } — cache para gráficos
      prestigio: 0, // estrelas de prestígio (v5)
      basePrestigio: 0, // XP total no momento do último prestígio
      fisicoPiso: 1, // físico mínimo (quem migrou da v4 não perde o físico que tinha)
    },
    conquistas: {}, // { idConquista: timestampDoDesbloqueio }
    desafios: null, // desafios semanais sorteados { semana, lista, resgatados, bonus }
    stats: {
      melhorSequencia: 0, // maior sequência de rotina 100%
      checkinSeq: 0, // dias seguidos abrindo o baú diário
      melhorCheckin: 0,
      ultimoCheckin: null,
      checksCedo: 0, // desafios matinais cumpridos no prazo
      missoesResgatadas: 0,
      melhorLiga: 0, // índice da melhor liga semanal
      comboMax: 0,
      desafiosSemanais: 0, // desafios semanais resgatados
      semanasCompletas: 0, // semanas com todos os desafios resgatados
      alimentou: 0, // vezes que deu comida/água ao pet (jornada inicial)
    },
    // Painel (tela Hoje): ordem, visibilidade e tamanho dos blocos
    painel: [], // { id, tipo, ref?, ativo, tamanho: 'p' | 'g' }
    // Rotina: itens recorrentes
    rotina: [], // { id, nome, emoji, xp, dias: null | [0..6], horario: 'HH:MM' | null, criadoEm, exemplo }
    // Blocos de check personalizados (ex.: Quarto arrumado)
    checks: [], // { id, chave, nome, emoji, xp, dias, horaLimite, criadoEm, melhorSequencia, exemplo }
    // Registro de cada dia (é aqui que os checks diários "reiniciam": cada dia tem o seu)
    diario: {}, // { 'AAAA-MM-DD': { rotina:{id:{lanc,ts}}, checks:{id:{lanc,ts}}, refeicoes:{id:{lanc,ts}}, agua, aguaLanc, bonusRotina, bonusDieta, resumo } }
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
    // Dieta (v5.2): plano alimentar. As marcações de cada dia ficam em diario[dia].refeicoes
    dieta: {
      refeicoes: [], // { id, nome, emoji, horario, itens: [{ id, qtd, nome }], kcal, proteina, obs, dias, criadoEm }
      metaKcal: 0, // 0 = usa a soma das refeições
      metaProteina: 0,
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

  // 4: comida e água do pet (compradas com moedas) e tela Hoje reorganizada.
  4: (d) => {
    if (d.pet) {
      d.pet.comida = 85;
      d.pet.agua = 85;
      d.pet.atualizadoEm = Date.now();
    }
    if (d.carteira) {
      d.carteira.inventario = d.carteira.inventario || {};
      d.carteira.inventario.comida = (d.carteira.inventario.comida || 0) + 3;
      d.carteira.inventario.agua = (d.carteira.inventario.agua || 0) + 3;
    }
    // o que é do dia agora fica no "Plano de hoje": esses blocos saem do painel
    for (const b of d.painel || []) if (['rotina', 'check', 'pendencias', 'treino'].includes(b.tipo)) b.ativo = false;
    d.meta = d.meta || {};
    d.meta.novidadeV4 = true;
    return d;
  },

  // 5: curva de níveis mais longa (nível máximo 50) e prestígio.
  // Ninguém cai de nível: se a curva nova deixaria a pessoa num nível menor,
  // entra um lançamento de "ajuste" que mantém o nível e o progresso atuais.
  5: (d) => {
    const xp = d.xp || (d.xp = { total: 0, lancamentos: [], porDia: {} });
    const total = (xp.lancamentos || []).reduce((s, l) => s + (l.xp || 0), 0);
    // curva antiga: chegar ao nível n = 50 × n × (n − 1)
    let velho = 1;
    while (50 * (velho + 1) * velho <= total) velho++;
    const fracao = (total - 50 * velho * (velho - 1)) / (100 * velho);
    // curva nova (igual à de xp.js)
    const passo = (n) => Math.max(100, Math.round((90 * Math.pow(n, 1.1)) / 10) * 10);
    const chegar = (n) => {
      let t = 0;
      for (let i = 1; i < Math.min(n, 50); i++) t += passo(i);
      return t;
    };
    let novo = 1;
    while (novo < 50 && chegar(novo + 1) <= total) novo++;
    const alvoNivel = Math.min(50, velho);
    if (novo < alvoNivel) {
      const alvo = Math.round(chegar(alvoNivel) + (alvoNivel < 50 ? fracao * passo(alvoNivel) : 0));
      const bonus = alvo - total;
      if (bonus > 0) {
        xp.lancamentos.push({
          id: 'ajuste-v5', dia: d.criadoEm || '2000-01-01', ts: Date.now(), base: bonus, mult: 0, xp: bonus, moedas: 0,
          fonte: 'ajuste', ref: null, rotulo: 'Conversão de níveis (v5)',
        });
      }
    }
    xp.total = xp.lancamentos.reduce((s, l) => s + (l.xp || 0), 0);
    xp.prestigio = 0;
    xp.basePrestigio = 0;
    // o físico que a pessoa já tinha também não regride (níveis antigos 1/3/6/10/20)
    xp.fisicoPiso = [20, 10, 6, 3, 1].findIndex((n) => velho >= n) >= 0 ? 5 - [20, 10, 6, 3, 1].findIndex((n) => velho >= n) : 1;
    d.meta = d.meta || {};
    d.meta.novidadeV5 = true;
    return d;
  },

  // 6: lançamento público — regras justas de XP (valores acima do teto são ajustados)
  //    e a jornada inicial (quem já joga começa com ela concluída).
  6: (d) => {
    const teto = { rotinaPadrao: 30, rotinaBonus: 60, pendAlta: 40, pendMedia: 40, pendBaixa: 40, treino: 150, treinoRecorde: 75, agua: 20 };
    const x = (d.ajustes && d.ajustes.xp) || {};
    for (const [k, v] of Object.entries(teto)) if (typeof x[k] === 'number' && x[k] > v) x[k] = v;
    for (const i of d.rotina || []) if (typeof i.xp === 'number' && i.xp > 30) i.xp = 30;
    for (const c of d.checks || []) if (typeof c.xp === 'number' && c.xp > 40) c.xp = 40;
    d.meta = d.meta || {};
    if (d.meta.onboardingFeito) d.meta.jornadaFeita = true;
    d.meta.novidadeV6 = !!d.meta.onboardingFeito;
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
  gravacoes.forEach((fn) => {
    try {
      fn();
    } catch (_) {}
  });
  if (!opcoes.silencioso) ouvintes.forEach((fn) => fn());
}

/** Registra uma função chamada a cada gravação no aparelho (até as silenciosas). */
export function aoGravar(fn) {
  gravacoes.add(fn);
  return () => gravacoes.delete(fn);
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
