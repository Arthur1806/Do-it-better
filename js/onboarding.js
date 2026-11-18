// =============================================================
// onboarding.js — QUESTIONÁRIO DE PRIMEIRA ENTRADA.
// Em ~1 minuto o usuário conta quem é e o que quer melhorar, e o app
// monta tudo sob medida: rotina, desafios matinais, fichas de treino,
// pendências iniciais, metas, companheiro e a ordem do painel.
// Pode ser refeito em Perfil → Ajustes (os dados atuais são mantidos).
// =============================================================

import { dados, alterar } from './store.js';
import { hojeKey, esc, uid, somarMinutos, diasDaSemana, plural } from './utils.js';
import { ganharXP } from './xp.js';
import { PERSONAGENS, ESTAGIOS, avatarHTML, personagem } from './personagens.js';
import { avatarSVG, montarEditor, AVATAR_PADRAO } from './visual.js';
import { criarExemplos, limparExemplos } from './seed.js';
import { vibrar, confete, ICONE_SETA_ESQ, ICONE_MAIS, ICONE_MENOS, ICONE_CHECK } from './ui.js';
import { tocar } from './sons.js';
import { ressortearMissoes } from './missoes.js';

// -------------------------------------------------------------
// Conteúdo das perguntas
// -------------------------------------------------------------

const OBJETIVOS = [
  { id: 'disciplina', emoji: '🎯', nome: 'Ter mais disciplina', focos: ['saude', 'casa', 'mente'] },
  { id: 'forma', emoji: '💪', nome: 'Entrar em forma', focos: ['treino', 'saude', 'sono'] },
  { id: 'produtivo', emoji: '🚀', nome: 'Ser mais produtivo', focos: ['trabalho', 'estudos'] },
  { id: 'organizar', emoji: '🗂️', nome: 'Organizar a vida', focos: ['casa', 'financas', 'trabalho'] },
  { id: 'mente', emoji: '🧠', nome: 'Cuidar da mente', focos: ['mente', 'sono', 'saude'] },
  { id: 'estudar', emoji: '📚', nome: 'Estudar mais', focos: ['estudos', 'mente'] },
];

export const AREAS = [
  { id: 'saude', emoji: '🍎', nome: 'Saúde' },
  { id: 'treino', emoji: '🏋️', nome: 'Treino' },
  { id: 'estudos', emoji: '📚', nome: 'Estudos' },
  { id: 'trabalho', emoji: '💼', nome: 'Trabalho' },
  { id: 'casa', emoji: '🏠', nome: 'Casa' },
  { id: 'financas', emoji: '💰', nome: 'Finanças' },
  { id: 'mente', emoji: '🧘', nome: 'Mente' },
  { id: 'sono', emoji: '😴', nome: 'Sono' },
];

const SEG_SEX = [1, 2, 3, 4, 5];
/** Hábitos sugeridos por área. pre = já vem marcado.
 *  hora = horário limite fixo · min = minutos depois de acordar. */
const HABITOS = {
  saude: [
    { emoji: '💧', nome: 'Beber água ao acordar', min: 30, pre: true },
    { emoji: '🥗', nome: 'Comer uma fruta ou salada', hora: '16:00' },
    { emoji: '💊', nome: 'Tomar vitaminas/remédios', min: 60 },
    { emoji: '🚶', nome: 'Caminhar 20 minutos', hora: '19:00' },
  ],
  treino: [
    { emoji: '🤸', nome: 'Alongar 10 minutos', min: 45, pre: true },
    { emoji: '🥩', nome: 'Bater a meta de proteína', hora: '21:00' },
  ],
  estudos: [
    { emoji: '📚', nome: 'Estudar 30 minutos', hora: '20:00', pre: true },
    { emoji: '📖', nome: 'Ler 20 páginas', hora: '22:00' },
    { emoji: '🗣️', nome: 'Praticar um idioma (15 min)', hora: '21:00' },
    { emoji: '🧠', nome: 'Revisar as anotações do dia', hora: '21:30', dias: SEG_SEX },
  ],
  trabalho: [
    { emoji: '🎯', nome: 'Definir as 3 prioridades do dia', min: 120, dias: SEG_SEX, pre: true },
    { emoji: '📵', nome: 'Bloco de foco sem celular', hora: '12:00', dias: SEG_SEX },
    { emoji: '📨', nome: 'Zerar a caixa de entrada', hora: '17:00', dias: SEG_SEX },
    { emoji: '📝', nome: 'Planejar o dia seguinte', hora: '21:00', dias: SEG_SEX },
  ],
  casa: [
    { emoji: '🍽️', nome: 'Lavar a louça', hora: '21:00', pre: true },
    { emoji: '🧹', nome: 'Arrumar a casa por 10 minutos', hora: '20:00' },
    { emoji: '🧺', nome: 'Cuidar da roupa', hora: '19:00', dias: [3, 6] },
    { emoji: '🌱', nome: 'Regar as plantas', hora: '10:00', dias: [1, 4] },
  ],
  financas: [
    { emoji: '💰', nome: 'Anotar os gastos do dia', hora: '22:00', pre: true },
    { emoji: '🚫', nome: 'Nenhuma compra por impulso', hora: '23:00' },
    { emoji: '📊', nome: 'Conferir o saldo', hora: '10:00', dias: [1] },
  ],
  mente: [
    { emoji: '🧘', nome: 'Meditar 10 minutos', min: 60, pre: true },
    { emoji: '🙏', nome: 'Escrever 3 gratidões', hora: '22:00' },
    { emoji: '📓', nome: 'Diário: como foi o dia', hora: '22:30' },
    { emoji: '🌳', nome: 'Tempo ao ar livre', hora: '18:00' },
  ],
  sono: [
    { emoji: '📵', nome: 'Sem telas 30 min antes de dormir', hora: '22:30', pre: true },
    { emoji: '🛌', nome: 'Deitar antes das 23h', hora: '23:00' },
  ],
};

/** Desafios matinais = blocos de check com horário limite (min após acordar). */
const DESAFIOS = [
  { id: 'quarto', area: 'casa', emoji: '🛏️', nome: 'Quarto arrumado', min: 60, xp: 20, chave: 'quarto' },
  { id: 'soneca', area: 'sono', emoji: '⏰', nome: 'Acordar sem soneca', min: 15, xp: 15 },
  { id: 'cafe', area: 'saude', emoji: '🥣', nome: 'Café da manhã saudável', min: 120, xp: 15 },
  { id: 'celular', area: 'mente', emoji: '📵', nome: 'Sem celular na 1ª hora', min: 60, xp: 20 },
  { id: 'sapo', area: 'trabalho', emoji: '🐸', nome: 'Fazer a tarefa mais difícil primeiro', min: 240, xp: 25, dias: SEG_SEX },
  { id: 'estudo-cedo', area: 'estudos', emoji: '☀️', nome: 'Estudar antes do almoço', min: 300, xp: 20 },
  { id: 'treino-cedo', area: 'treino', emoji: '🌄', nome: 'Movimentar o corpo cedo', min: 180, xp: 20 },
];

/** Pendências sugeridas por área. */
const PENDS = {
  saude: [{ titulo: 'Marcar check-up médico', prioridade: 'media', prazo: 'semana' }, { titulo: 'Marcar dentista', prioridade: 'baixa', prazo: null }],
  treino: [{ titulo: 'Fazer avaliação física', prioridade: 'media', prazo: 'semana' }, { titulo: 'Comprar roupa/tênis de treino', prioridade: 'baixa', prazo: null }],
  estudos: [{ titulo: 'Montar o cronograma de estudos', prioridade: 'alta', prazo: 'hoje' }, { titulo: 'Terminar trabalho/curso pendente', prioridade: 'alta', prazo: 'semana' }],
  trabalho: [{ titulo: 'Responder e-mails importantes', prioridade: 'alta', prazo: 'hoje' }, { titulo: 'Atualizar currículo/LinkedIn', prioridade: 'media', prazo: null }, { titulo: 'Preparar reunião da semana', prioridade: 'media', prazo: 'semana' }],
  casa: [{ titulo: 'Fazer a lista de compras', prioridade: 'media', prazo: 'hoje' }, { titulo: 'Limpar a geladeira', prioridade: 'baixa', prazo: 'semana' }, { titulo: 'Consertar o que está quebrado', prioridade: 'baixa', prazo: null }],
  financas: [{ titulo: 'Pagar as contas do mês', prioridade: 'alta', prazo: 'semana' }, { titulo: 'Montar o orçamento do mês', prioridade: 'media', prazo: 'semana' }, { titulo: 'Cancelar assinaturas que não uso', prioridade: 'baixa', prazo: null }],
  mente: [{ titulo: 'Reservar um tempo só para mim', prioridade: 'media', prazo: 'semana' }, { titulo: 'Ligar para alguém querido', prioridade: 'baixa', prazo: 'semana' }],
  sono: [{ titulo: 'Deixar o quarto escuro e silencioso', prioridade: 'baixa', prazo: 'semana' }],
};

// ---------- Treino ----------
// [nome, grupo, carga base (intermediário), descanso]
const EX = {
  supino: ['Supino reto', 'Peito', 40, 90], supinoInc: ['Supino inclinado com halteres', 'Peito', 14, 75], crucifixo: ['Crucifixo na máquina', 'Peito', 30, 60],
  puxada: ['Puxada frontal', 'Costas', 45, 90], remadaBaixa: ['Remada baixa', 'Costas', 40, 75], remadaCurv: ['Remada curvada', 'Costas', 30, 75],
  agacha: ['Agachamento livre', 'Pernas', 50, 120], legpress: ['Leg press 45°', 'Pernas', 120, 90], extensora: ['Cadeira extensora', 'Pernas', 35, 60], flexora: ['Mesa flexora', 'Pernas', 30, 60], panturrilha: ['Panturrilha em pé', 'Panturrilha', 40, 45],
  desenv: ['Desenvolvimento com halteres', 'Ombros', 14, 75], elevLat: ['Elevação lateral', 'Ombros', 6, 45], crucInv: ['Crucifixo inverso', 'Ombros', 8, 45],
  rosca: ['Rosca direta', 'Bíceps', 20, 60], martelo: ['Rosca martelo', 'Bíceps', 10, 60],
  corda: ['Tríceps na polia (corda)', 'Tríceps', 20, 60], frances: ['Tríceps francês', 'Tríceps', 12, 60],
  prancha: ['Prancha (reps = segundos)', 'Abdômen', 0, 45], infra: ['Abdominal infra', 'Abdômen', 0, 45],
  // em casa (peso do corpo)
  flexao: ['Flexão de braço', 'Peito', 0, 60], agachaLivre: ['Agachamento com peso do corpo', 'Pernas', 0, 60], afundo: ['Afundo', 'Pernas', 0, 60],
  ponte: ['Ponte de glúteo', 'Glúteos', 0, 45], banco: ['Tríceps no banco/cadeira', 'Tríceps', 0, 60], burpee: ['Burpee', 'Cardio', 0, 60],
  polichinelo: ['Polichinelo', 'Cardio', 0, 30], escalador: ['Escalador (mountain climber)', 'Abdômen', 0, 45], superman: ['Superman', 'Costas', 0, 45],
  remadaMochila: ['Remada com mochila', 'Costas', 5, 60], pikePush: ['Flexão pike (ombros)', 'Ombros', 0, 60],
};
const PLANOS = {
  fullbody: { nome: 'Corpo todo (A/B)', fichas: [['Corpo todo A', ['agacha', 'supino', 'puxada', 'desenv', 'prancha']], ['Corpo todo B', ['legpress', 'supinoInc', 'remadaBaixa', 'elevLat', 'rosca', 'corda']]] },
  superiorInferior: { nome: 'Superior/Inferior (A/B)', fichas: [['Treino A — Superior', ['supino', 'puxada', 'desenv', 'remadaBaixa', 'rosca', 'corda']], ['Treino B — Inferior', ['agacha', 'legpress', 'extensora', 'flexora', 'panturrilha', 'prancha']]] },
  abc: { nome: 'A/B/C', fichas: [['Treino A — Peito e Tríceps', ['supino', 'supinoInc', 'crucifixo', 'corda']], ['Treino B — Costas e Bíceps', ['puxada', 'remadaBaixa', 'remadaCurv', 'rosca', 'martelo']], ['Treino C — Pernas e Ombros', ['agacha', 'legpress', 'extensora', 'desenv', 'elevLat']]] },
  abcd: { nome: 'A/B/C/D', fichas: [['Treino A — Peito e Tríceps', ['supino', 'supinoInc', 'crucifixo', 'corda', 'frances']], ['Treino B — Costas e Bíceps', ['puxada', 'remadaBaixa', 'remadaCurv', 'rosca', 'martelo']], ['Treino C — Pernas', ['agacha', 'legpress', 'extensora', 'flexora', 'panturrilha']], ['Treino D — Ombros e Abdômen', ['desenv', 'elevLat', 'crucInv', 'prancha', 'infra']]] },
  abcde: { nome: 'A/B/C/D/E', fichas: [['Treino A — Peito', ['supino', 'supinoInc', 'crucifixo']], ['Treino B — Costas', ['puxada', 'remadaBaixa', 'remadaCurv']], ['Treino C — Pernas', ['agacha', 'legpress', 'extensora', 'flexora', 'panturrilha']], ['Treino D — Ombros e Abdômen', ['desenv', 'elevLat', 'crucInv', 'prancha']], ['Treino E — Braços', ['rosca', 'martelo', 'corda', 'frances']]] },
  casaFull: { nome: 'Corpo todo em casa (A/B)', fichas: [['Casa A', ['agachaLivre', 'flexao', 'remadaMochila', 'ponte', 'prancha']], ['Casa B', ['afundo', 'pikePush', 'superman', 'banco', 'escalador', 'burpee']]] },
  casaAbc: { nome: 'A/B/C em casa', fichas: [['Casa A — Empurrar', ['flexao', 'pikePush', 'banco', 'prancha']], ['Casa B — Puxar e core', ['remadaMochila', 'superman', 'escalador', 'infra']], ['Casa C — Pernas e cardio', ['agachaLivre', 'afundo', 'ponte', 'polichinelo', 'burpee']]] },
};
const NIVEIS_TREINO = {
  iniciante: { nome: 'Iniciante', fator: 0.6, reps: 12, series: 3 },
  intermediario: { nome: 'Intermediário', fator: 1, reps: 10, series: 3 },
  avancado: { nome: 'Avançado', fator: 1.4, reps: 8, series: 4 },
};
function planoPadrao(freq, local) {
  if (local === 'casa') return freq <= 2 ? 'casaFull' : 'casaAbc';
  if (freq <= 2) return 'fullbody';
  if (freq === 3) return 'abc';
  if (freq === 4) return 'abcd';
  if (freq === 5) return 'abcde';
  return 'abc';
}
function planosDoLocal(local) {
  return local === 'casa' ? ['casaFull', 'casaAbc'] : ['fullbody', 'superiorInferior', 'abc', 'abcd', 'abcde'];
}
function arredondarCarga(c) {
  if (c <= 0) return 0;
  if (c < 12) return Math.max(1, Math.round(c));
  return Math.round(c / 2.5) * 2.5;
}
/** Gera as fichas a partir das respostas. */
function gerarFichas(t) {
  const n = NIVEIS_TREINO[t.nivel];
  return PLANOS[t.plano].fichas.map(([nome, lista]) => ({
    id: uid(),
    nome,
    exercicios: lista.map((k, i) => {
      const [enome, grupo, carga, descanso] = EX[k];
      const prancha = grupo === 'Abdômen' && carga === 0 && /Prancha/.test(enome);
      return {
        id: uid(),
        nome: enome,
        grupo,
        series: i === 0 && t.nivel !== 'iniciante' ? 4 : n.series,
        reps: prancha ? (t.nivel === 'iniciante' ? 30 : 45) : grupo === 'Cardio' ? 20 : n.reps,
        carga: arredondarCarga(carga * n.fator),
        descanso,
      };
    }),
  }));
}

// -------------------------------------------------------------
// Estado do questionário
// -------------------------------------------------------------

let raiz = null;
let r = null; // respostas
let passo = 0;
let refazendo = false;

function respostasIniciais() {
  const d = dados();
  return {
    nome: d.ajustes.nome || '',
    objetivo: d.perfil.objetivo || '',
    pet: d.pet.especie || 'cachorro',
    nomePet: d.pet.nome || '',
    avatar: { ...AVATAR_PADRAO, ...d.avatar },
    focos: [...(d.perfil.focos || [])],
    acorda: d.perfil.acorda || '07:00',
    habitos: [], // [{emoji,nome,dias}]
    desafios: [], // ids de DESAFIOS
    treino: { local: 'academia', freq: d.ajustes.metaTreinosSemana || 3, plano: planoPadrao(d.ajustes.metaTreinosSemana || 3, 'academia'), nivel: 'iniciante' },
    pendencias: [], // [{titulo, prioridade, prazo}]
    metaAgua: d.ajustes.metaAgua || 8,
    limiteGastos: d.ajustes.limiteGastos || 0,
    sons: d.ajustes.sons !== false,
    habitosTocados: false,
    desafiosTocados: false,
  };
}

function passos() {
  const l = ['boas-vindas', 'nome', 'personagem', 'pet', 'areas', 'acorda', 'rotina'];
  if (r.focos.includes('treino')) l.push('treino');
  l.push('pendencias', 'metas', 'pronto');
  return l;
}

/** Horário limite sugerido de um hábito (fixo ou relativo à hora de acordar). */
function horarioDe(h) {
  if (h.hora) return h.hora;
  if (h.min) return somarMinutos(r.acorda, h.min);
  return null;
}

/** Pré-seleciona hábitos e desafios conforme as áreas (até o usuário mexer). */
function preSelecionar() {
  if (!r.habitosTocados) {
    r.habitos = [];
    for (const a of r.focos) for (const h of HABITOS[a] || []) if (h.pre) r.habitos.push({ emoji: h.emoji, nome: h.nome, dias: h.dias || null, horario: horarioDe(h) });
  }
  if (!r.desafiosTocados) {
    r.desafios = DESAFIOS.filter((x) => r.focos.includes(x.area)).slice(0, 2).map((x) => x.id);
    if (!r.desafios.length) r.desafios = ['quarto'];
  }
}

// -------------------------------------------------------------
// Abrir / fechar
// -------------------------------------------------------------

/** Mostra o questionário. refazer = true quando chamado pelo Perfil. */
export function abrirOnboarding({ refazer = false } = {}) {
  refazendo = refazer;
  r = respostasIniciais();
  passo = refazer ? 1 : 0;
  raiz = document.createElement('div');
  raiz.className = 'onb';
  raiz.setAttribute('role', 'dialog');
  raiz.setAttribute('aria-label', 'Personalizar o Do It Better');
  document.body.appendChild(raiz);
  document.body.classList.add('com-onb');
  raiz.addEventListener('click', aoClicar);
  raiz.addEventListener('input', aoDigitar);
  // Enter nos campos de "adicionar" funciona como o botão +
  raiz.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const c = e.target.dataset.campo;
    const alvo = c === 'novoHabito' ? 'add-habito' : c === 'novaPend' ? 'add-pend' : c === 'nome' ? 'avancar' : null;
    if (!alvo) return;
    e.preventDefault();
    const b = raiz.querySelector(`[data-onb="${alvo}"]`);
    if (b && !b.disabled) b.click();
  });
  desenhar(0);
  requestAnimationFrame(() => raiz.classList.add('aberto'));
}

function fechar() {
  raiz.classList.remove('aberto');
  document.body.classList.remove('com-onb');
  const el = raiz;
  setTimeout(() => el.remove(), 350);
  raiz = null;
}

// -------------------------------------------------------------
// Desenho de cada passo
// -------------------------------------------------------------

function desenhar(direcao = 1) {
  const lista = passos();
  const id = lista[passo];
  const total = lista.length - 1;
  const conteudo = TELAS[id]();
  const podeVoltar = passo > (refazendo ? 1 : 0);
  raiz.innerHTML = `
    <div class="onb-topo">
      ${podeVoltar ? `<button class="btn-icone" data-onb="voltar" aria-label="Voltar">${ICONE_SETA_ESQ}</button>` : '<span class="onb-espaco"></span>'}
      ${id !== 'boas-vindas' ? `<div class="onb-progresso"><div style="width:${(passo / total) * 100}%"></div></div>` : '<span></span>'}
      ${refazendo ? '<button class="btn-texto" data-onb="cancelar">Fechar</button>' : '<span class="onb-espaco"></span>'}
    </div>
    <div class="onb-corpo ${direcao >= 0 ? 'vem-dir' : 'vem-esq'}">${conteudo.html}</div>
    <div class="onb-rodape">
      <button class="btn primario largo grande" data-onb="avancar" ${conteudo.bloqueado ? 'disabled' : ''}>${conteudo.botao || 'Continuar'}</button>
      ${conteudo.extra || ''}
    </div>`;
  if (conteudo.montar) conteudo.montar(raiz.querySelector('.onb-corpo'));
  const foco = raiz.querySelector('[data-autofoco]');
  if (foco) setTimeout(() => foco.focus(), 350);
}

const opcao = (sel, attrs, html, classe = '') => `<button type="button" class="onb-opcao ${classe} ${sel ? 'on' : ''}" ${attrs}>${html}${sel ? `<span class="onb-marca">${ICONE_CHECK}</span>` : ''}</button>`;

const TELAS = {
  'boas-vindas': () => ({
    html: `<div class="onb-hero">
        <img src="icons/icon-192.png" alt="" class="onb-icone">
        <h1 class="logo grande">Do It Better</h1>
        <p class="onb-lead">Transforme sua rotina num jogo. Ganhe XP, suba de nível, cumpra missões e desbloqueie personagens.</p>
        <div class="onb-beneficios">
          <div><span>🎯</span>Missões e baú todo dia</div>
          <div><span>🔥</span>Sequências que multiplicam seu XP</div>
          <div><span>🐾</span>Um pet que depende de você</div>
          <div><span>🧑‍🎤</span>Personagem com skins exclusivas</div>
        </div>
        <p class="dica">Responda algumas perguntas rápidas e o app fica com a sua cara.</p>
      </div>`,
    botao: 'Vamos começar',
    extra: refazendo ? '' : `<button class="btn-texto centro" data-onb="pular">${dados().meta.exemplosCriados ? 'Pular por enquanto' : 'Pular e usar um exemplo pronto'}</button>`,
  }),

  nome: () => ({
    html: `<h2 class="onb-titulo">Como você quer ser chamado?</h2>
      <input class="entrada grande" data-campo="nome" maxlength="30" placeholder="Seu nome ou apelido" value="${esc(r.nome)}" autocomplete="given-name" enterkeyhint="done" data-autofoco>
      <h2 class="onb-titulo menor">Qual é o seu principal objetivo agora?</h2>
      <div class="onb-grade">${OBJETIVOS.map((o) => opcao(r.objetivo === o.id, `data-objetivo="${o.id}"`, `<span class="onb-emoji">${o.emoji}</span><b>${o.nome}</b>`)).join('')}</div>`,
    bloqueado: !r.objetivo,
  }),

  personagem: () => ({
    html: `<h2 class="onb-titulo">Crie seu personagem</h2>
      <p class="onb-sub">Esse é você no jogo. Itens raros, épicos e lendários (🔒) liberam conforme você avança.</p>
      <div class="onb-editor"></div>`,
    montar: (el) => montarEditor(el.querySelector('.onb-editor'), r.avatar, { categorias: ['pele', 'cabelo', 'corCabelo', 'roupa', 'corRoupa', 'calca', 'corCalca', 'chapeu', 'corChapeu', 'acessorio'] }),
  }),

  pet: () => {
    const p = personagem(r.pet);
    return {
      html: `<h2 class="onb-titulo">Escolha seu pet</h2>
        <p class="onb-sub">Ele vive da sua disciplina: fica forte quando você cumpre a rotina e fraco, sujo e triste quando você some. Cuide bem dele!</p>
        <div class="onb-pers cinco">${PERSONAGENS.filter((x) => x.inicial).map((x) => opcao(r.pet === x.id, `data-pet="${x.id}"`, `${avatarHTML(x, { tam: 'g', nivel: 1, estado: false })}<b>${x.especie}</b><small>${x.jeito}</small>`, 'pers')).join('')}</div>
        <label class="campo"><span>Nome do pet</span><input class="entrada grande" data-campo="nomePet" maxlength="16" placeholder="${esc(p.nome)}" value="${esc(r.nomePet)}"></label>
        <div class="onb-evolucao card">
          <small>Evolução do seu pet (conforme seu nível)</small>
          <div class="onb-estagios">${ESTAGIOS.map((e) => `<div>${avatarHTML(p, { tam: 'p', nivel: e.nivel, estado: false })}<small>${e.nome}<br>nív. ${e.nivel}</small></div>`).join('')}</div>
        </div>
        <p class="dica centro">E mais ${PERSONAGENS.filter((x) => !x.inicial).length} pets para desbloquear com o seu progresso 🔒</p>`,
    };
  },

  areas: () => ({
    html: `<h2 class="onb-titulo">O que você quer melhorar?</h2>
      <p class="onb-sub">Escolha quantas quiser. Isso define suas sugestões de rotina, pendências e os blocos do painel.</p>
      <div class="onb-grade tres">${AREAS.map((a) => opcao(r.focos.includes(a.id), `data-area="${a.id}"`, `<span class="onb-emoji">${a.emoji}</span><b>${a.nome}</b>`)).join('')}</div>`,
    bloqueado: r.focos.length === 0,
  }),

  acorda: () => {
    const horas = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '09:00', '10:00'];
    return {
      html: `<h2 class="onb-titulo">Que horas você costuma acordar?</h2>
        <p class="onb-sub">Os desafios matinais valem XP cheio se feitos logo depois de acordar (ex.: arrumar o quarto em até 1h). Depois, metade.</p>
        <div class="onb-horas">${horas.map((h) => `<button type="button" class="chip ${r.acorda === h ? 'on' : ''}" data-hora="${h}">${h}</button>`).join('')}</div>
        <label class="campo"><span>Outro horário</span><input class="entrada" type="time" data-campo="acorda" value="${r.acorda}"></label>`,
    };
  },

  rotina: () => {
    const sel = (nome) => r.habitos.some((h) => h.nome === nome);
    const proprios = r.habitos.filter((h) => !Object.values(HABITOS).flat().some((x) => x.nome === h.nome));
    const n = r.habitos.length + r.desafios.length;
    return {
      html: `<h2 class="onb-titulo">Monte sua rotina diária</h2>
        <p class="onb-sub">Cada hábito tem um horário: feito até ele, vale XP cheio; depois, vale menos (75% → 50% → 25%). Dá para mudar os horários depois na Rotina.</p>
        ${r.focos.map((a) => {
          const area = AREAS.find((x) => x.id === a);
          return `<div class="onb-secao"><h3>${area.emoji} ${area.nome}</h3><div class="chips-linha">
            ${(HABITOS[a] || []).map((h) => `<button type="button" class="chip ${sel(h.nome) ? 'on' : ''}" data-habito="${esc(h.nome)}" data-area-h="${a}">${h.emoji} ${esc(h.nome)}${horarioDe(h) ? ` <small class="chip-hora">até ${horarioDe(h)}</small>` : ''}</button>`).join('')}
          </div></div>`;
        }).join('')}
        ${proprios.length ? `<div class="onb-secao"><h3>✍️ Seus hábitos</h3><div class="chips-linha">${proprios.map((h) => `<button type="button" class="chip on" data-habito="${esc(h.nome)}">${h.emoji} ${esc(h.nome)}</button>`).join('')}</div></div>` : ''}
        <div class="linha-form">
          <input class="entrada" data-campo="novoHabito" placeholder="Adicionar um hábito seu..." maxlength="50" enterkeyhint="done">
          <button type="button" class="btn secundario" data-onb="add-habito" aria-label="Adicionar">${ICONE_MAIS}</button>
        </div>
        <div class="onb-secao"><h3>⏰ Desafios matinais <small>(XP cheio até o horário)</small></h3>
          <div class="onb-lista-desafios">${DESAFIOS.map((x) => opcao(r.desafios.includes(x.id), `data-desafio="${x.id}"`, `<span class="onb-emoji">${x.emoji}</span><span><b>${x.nome}</b><small>até ${somarMinutos(r.acorda, x.min)} · ${x.xp} XP</small></span>`, 'linha')).join('')}</div>
        </div>
        <p class="dica ${n > 8 ? 'aviso' : ''}">${n > 8 ? '⚠️ Comece leve! Rotinas menores são mais fáceis de manter — dá para adicionar mais depois.' : `${plural(n, 'item escolhido', 'itens escolhidos')}. O ideal para começar é de 3 a 6.`}</p>`,
      bloqueado: n === 0,
    };
  },

  treino: () => {
    const t = r.treino;
    const fichas = gerarFichas(t);
    return {
      html: `<h2 class="onb-titulo">Vamos montar seu treino</h2>
        <div class="campo"><span>Onde você treina?</span>
          <div class="segmentado">
            <button type="button" class="${t.local === 'academia' ? 'on' : ''}" data-local="academia">🏋️ Academia</button>
            <button type="button" class="${t.local === 'casa' ? 'on' : ''}" data-local="casa">🏠 Em casa</button>
          </div></div>
        <div class="campo"><span>Quantas vezes por semana?</span>
          <div class="chips-linha">${[2, 3, 4, 5, 6].map((f) => `<button type="button" class="chip ${t.freq === f ? 'on' : ''}" data-freq="${f}">${f}x</button>`).join('')}</div></div>
        <div class="campo"><span>Divisão</span>
          <div class="chips-linha">${planosDoLocal(t.local).map((p) => `<button type="button" class="chip ${t.plano === p ? 'on' : ''}" data-plano="${p}">${PLANOS[p].nome}</button>`).join('')}</div></div>
        <div class="campo"><span>Seu nível</span>
          <div class="segmentado">${Object.entries(NIVEIS_TREINO).map(([k, n]) => `<button type="button" class="${t.nivel === k ? 'on' : ''}" data-nivel="${k}">${n.nome}</button>`).join('')}</div></div>
        <div class="card onb-preview">
          <small>Suas fichas (o rodízio é automático)</small>
          ${fichas.map((f) => `<div class="onb-ficha"><b>${esc(f.nome)}</b><small>${f.exercicios.map((e) => esc(e.nome)).join(' · ')}</small></div>`).join('')}
          <small class="dica">As cargas são um ponto de partida: ajuste no primeiro treino e o app lembra.</small>
        </div>`,
    };
  },

  pendencias: () => {
    const sugestoes = r.focos.flatMap((a) => (PENDS[a] || []).map((p) => ({ ...p, area: a })));
    const tem = (t) => r.pendencias.some((p) => p.titulo === t);
    const PR = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
    const PZ = { hoje: 'hoje', semana: 'esta semana' };
    return {
      html: `<h2 class="onb-titulo">O que está pendente na sua vida agora?</h2>
        <p class="onb-sub">Tire da cabeça e coloque aqui. Cada pendência concluída vira XP (alta 30 · média 20 · baixa 10).</p>
        ${sugestoes.length ? `<div class="chips-linha">${sugestoes.map((p) => `<button type="button" class="chip ${tem(p.titulo) ? 'on' : ''}" data-pend-sug="${esc(p.titulo)}">${tem(p.titulo) ? '✓' : '+'} ${esc(p.titulo)}</button>`).join('')}</div>` : ''}
        <div class="onb-nova-pend card">
          <input class="entrada" data-campo="novaPend" placeholder="Escreva uma pendência sua..." maxlength="80" enterkeyhint="done">
          <div class="segmentado pequeno" data-grupo="prio-onb">
            ${['alta', 'media', 'baixa'].map((k) => `<button type="button" class="${(r.prioNova || 'media') === k ? 'on' : ''}" data-prio-nova="${k}">${PR[k]}</button>`).join('')}
          </div>
          <button type="button" class="btn secundario largo" data-onb="add-pend">${ICONE_MAIS} Adicionar pendência</button>
        </div>
        ${r.pendencias.length ? `<div class="lista card">${r.pendencias.map((p, i) => `<div class="item-linha">
            <span class="tag prio-${p.prioridade}">${PR[p.prioridade]}</span>
            <span class="item-info"><span class="item-nome">${esc(p.titulo)}</span>${p.prazo ? `<span class="item-sub">prazo: ${PZ[p.prazo]}</span>` : ''}</span>
            <button type="button" class="btn-icone" data-rem-pend="${i}" aria-label="Remover">✕</button></div>`).join('')}</div>`
          : '<p class="dica centro">Nenhuma ainda. Pode pular, se quiser — dá para adicionar depois no botão +.</p>'}`,
      botao: r.pendencias.length ? 'Continuar' : 'Pular por enquanto',
    };
  },

  metas: () => ({
    html: `<h2 class="onb-titulo">Suas metas</h2>
      <div class="card onb-meta">
        <div><b>💧 Água por dia</b><small>copos de ~250 ml</small></div>
        <div class="stepper"><button type="button" class="btn-icone" data-agua="-1" aria-label="Menos">${ICONE_MENOS}</button><strong>${r.metaAgua}</strong><button type="button" class="btn-icone" data-agua="1" aria-label="Mais">${ICONE_MAIS}</button></div>
      </div>
      ${r.focos.includes('treino') ? `<div class="card onb-meta"><div><b>🏋️ Treinos por semana</b><small>vem da sua resposta anterior</small></div><strong class="numero-medio">${r.treino.freq}</strong></div>` : ''}
      ${r.focos.includes('financas') ? `<div class="card onb-meta"><div><b>💸 Limite de gastos no mês</b><small>opcional</small></div><input class="entrada compacta" data-campo="limiteGastos" inputmode="decimal" placeholder="R$ 0" value="${r.limiteGastos || ''}"></div>` : ''}
      <div class="card onb-meta">
        <div><b>🔊 Sons do jogo</b><small>efeitos ao concluir, combos e baús</small></div>
        <div class="segmentado pequeno"><button type="button" class="${r.sons ? 'on' : ''}" data-sons="1">Ligado</button><button type="button" class="${!r.sons ? 'on' : ''}" data-sons="0">Desligado</button></div>
      </div>`,
  }),

  pronto: () => {
    const p = personagem(r.pet);
    const nome = r.nome || 'campeão';
    const resumo = [
      [`🔁`, plural(r.habitos.length, 'hábito', 'hábitos')],
      [`⏰`, plural(r.desafios.length, 'desafio matinal', 'desafios matinais')],
      [`📌`, plural(r.pendencias.length, 'pendência', 'pendências')],
    ];
    if (r.focos.includes('treino')) resumo.push([`🏋️`, plural(PLANOS[r.treino.plano].fichas.length, 'ficha de treino', 'fichas de treino')]);
    return {
      html: `<div class="onb-hero">
          <div class="onb-cena">${avatarSVG(r.avatar)}${avatarHTML(p, { tam: 'g', nivel: 1, humor: 'radiante', estado: false })}</div>
          <div class="balao">Tudo pronto, ${esc(nome)}! Eu sou ${esc(r.nomePet || p.nome)} e vou te acompanhar todo dia. Cuida de mim cumprindo a rotina, combinado? 🐾</div>
          <div class="onb-resumo">${resumo.map(([e, t]) => `<span class="tag">${e} ${t}</span>`).join('')}</div>
          ${!dados().meta.bonusJornada ? `<div class="card onb-premio"><b>🎁 Presente de boas-vindas</b><span>+50 XP · 🛡️ 1 escudo de sequência · medalha "A jornada começa"</span></div>` : ''}
        </div>`,
      botao: refazendo ? 'Salvar personalização' : 'Começar minha jornada 🚀',
    };
  },
};

// -------------------------------------------------------------
// Interação
// -------------------------------------------------------------

function aoDigitar(e) {
  const c = e.target.dataset.campo;
  if (!c) return;
  if (c === 'nome') r.nome = e.target.value.trim();
  if (c === 'nomePet') r.nomePet = e.target.value.trim();
  if (c === 'acorda' && e.target.value) {
    r.acorda = e.target.value;
    for (const h of r.habitos) {
      const base = Object.values(HABITOS).flat().find((x) => x.nome === h.nome);
      if (base) h.horario = horarioDe(base);
    }
    raiz.querySelectorAll('[data-hora]').forEach((b) => b.classList.toggle('on', b.dataset.hora === r.acorda));
  }
  if (c === 'limiteGastos') r.limiteGastos = Math.max(0, parseFloat(String(e.target.value).replace(/[R$\s.]/g, '').replace(',', '.')) || 0);
}

function aoClicar(e) {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  // o editor do personagem cuida dos próprios cliques (e pode já ter trocado o botão)
  if (b.closest('.onb-editor') || !raiz.contains(b)) return;
  const ds = b.dataset;
  let redesenhar = true;
  vibrar(6);

  if (ds.onb === 'avancar') return avancar();
  if (ds.onb === 'voltar') {
    passo = Math.max(0, passo - 1);
    return desenhar(-1);
  }
  if (ds.onb === 'cancelar') return fechar();
  if (ds.onb === 'pular') return pular();

  if (ds.objetivo) {
    r.objetivo = ds.objetivo;
    const o = OBJETIVOS.find((x) => x.id === ds.objetivo);
    if (!r.focosTocados) r.focos = [...o.focos];
  }
  if (ds.pet) r.pet = ds.pet;
  if (ds.area) {
    r.focosTocados = true;
    r.focos = r.focos.includes(ds.area) ? r.focos.filter((x) => x !== ds.area) : [...r.focos, ds.area];
  }
  if (ds.hora) r.acorda = ds.hora;
  if (ds.hora) for (const h of r.habitos) {
    const base = Object.values(HABITOS).flat().find((x) => x.nome === h.nome);
    if (base) h.horario = horarioDe(base);
  }
  if (ds.habito) {
    r.habitosTocados = true;
    const ja = r.habitos.findIndex((h) => h.nome === ds.habito);
    if (ja >= 0) r.habitos.splice(ja, 1);
    else {
      const h = (HABITOS[ds.areaH] || []).find((x) => x.nome === ds.habito);
      r.habitos.push({ emoji: h ? h.emoji : '✅', nome: ds.habito, dias: h && h.dias ? h.dias : null, horario: h ? horarioDe(h) : null });
    }
  }
  if (ds.onb === 'add-habito') {
    const inp = raiz.querySelector('[data-campo="novoHabito"]');
    const nome = inp.value.trim();
    if (nome && !r.habitos.some((h) => h.nome.toLowerCase() === nome.toLowerCase())) {
      r.habitosTocados = true;
      r.habitos.push({ emoji: '✨', nome, dias: null });
    }
  }
  if (ds.desafio) {
    r.desafiosTocados = true;
    r.desafios = r.desafios.includes(ds.desafio) ? r.desafios.filter((x) => x !== ds.desafio) : [...r.desafios, ds.desafio];
  }
  if (ds.local) {
    r.treino.local = ds.local;
    r.treino.plano = planoPadrao(r.treino.freq, ds.local);
  }
  if (ds.freq) {
    r.treino.freq = Number(ds.freq);
    r.treino.plano = planoPadrao(r.treino.freq, r.treino.local);
  }
  if (ds.plano) r.treino.plano = ds.plano;
  if (ds.nivel) r.treino.nivel = ds.nivel;
  if (ds.pendSug) {
    const ja = r.pendencias.findIndex((p) => p.titulo === ds.pendSug);
    if (ja >= 0) r.pendencias.splice(ja, 1);
    else {
      const s = Object.values(PENDS).flat().find((p) => p.titulo === ds.pendSug);
      r.pendencias.push({ ...s });
    }
  }
  if (ds.prioNova) r.prioNova = ds.prioNova;
  if (ds.onb === 'add-pend') {
    const inp = raiz.querySelector('[data-campo="novaPend"]');
    const t = inp.value.trim();
    if (t) r.pendencias.push({ titulo: t, prioridade: r.prioNova || 'media', prazo: null });
  }
  if (ds.remPend !== undefined) r.pendencias.splice(Number(ds.remPend), 1);
  if (ds.agua) r.metaAgua = Math.min(20, Math.max(1, r.metaAgua + Number(ds.agua)));
  if (ds.sons !== undefined) r.sons = ds.sons === '1';

  if (redesenhar) {
    const corpo = raiz.querySelector('.onb-corpo');
    const rol = corpo ? corpo.scrollTop : 0;
    desenhar(0);
    const novo = raiz.querySelector('.onb-corpo');
    novo.classList.remove('vem-dir', 'vem-esq');
    novo.scrollTop = rol;
  }
}

function avancar() {
  const lista = passos();
  const id = lista[passo];
  if (id === 'nome') {
    const inp = raiz.querySelector('[data-campo="nome"]');
    if (inp) r.nome = inp.value.trim();
  }
  if (id === 'areas') preSelecionar();
  if (id === 'pronto') return concluir();
  passo = Math.min(lista.length - 1, passo + 1);
  tocar('check');
  desenhar(1);
}

/** Pular: usa o exemplo pronto (só na primeira vez). */
function pular() {
  alterar((d) => {
    if (!d.meta.exemplosCriados) criarExemplos(d);
    d.meta.onboardingFeito = true;
    d.colecao[d.pet.especie] = d.colecao[d.pet.especie] || Date.now();
    d.meta.avatarCriado = false; // mostra o criador de personagem logo depois
    ressortearMissoes();
  });
  fechar();
  document.dispatchEvent(new CustomEvent('dib-onboarding-fim'));
}

// -------------------------------------------------------------
// Aplicar as respostas
// -------------------------------------------------------------

function prazoDe(p) {
  const hoje = hojeKey();
  if (p === 'hoje') return hoje;
  if (p === 'semana') return diasDaSemana(hoje)[6];
  return null;
}

/** Ordem inicial do painel conforme as áreas escolhidas. */
export function montarPainel(focos, checks) {
  const tem = (f) => focos.includes(f);
  const b = (tipo, tamanho, ativo = true, ref) => ({ id: ref ? `b-${ref}` : `b-${tipo}`, tipo, ref, ativo, tamanho });
  return [
    b('missoes', 'g'),
    b('sequencia', 'p'),
    b('liga', 'p'),
    b('agua', 'p', tem('saude') || tem('treino') || focos.length < 3),
    b('metaTreinos', 'p', tem('treino')),
    b('semanaXP', 'g'),
    b('notas', 'p', tem('estudos') || tem('trabalho') || tem('mente')),
    b('compras', 'p', tem('casa')),
    b('gastos', 'g', tem('financas')),
    // o que é do dia aparece no "Plano de hoje"; estes ficam disponíveis no Editar painel
    b('rotina', 'p', false),
    ...checks.map((c) => b('check', 'p', false, c.id)),
    b('treino', 'g', false),
    b('pendencias', 'p', false),
  ];
}

function concluir() {
  const primeiraVez = !dados().meta.bonusJornada;
  alterar((d) => {
    const hoje = hojeKey();
    d.ajustes.nome = r.nome;
    d.ajustes.metaAgua = r.metaAgua;
    d.ajustes.sons = r.sons;
    if (r.focos.includes('financas')) d.ajustes.limiteGastos = r.limiteGastos;
    d.perfil.objetivo = r.objetivo;
    d.perfil.focos = [...r.focos];
    d.perfil.acorda = r.acorda;
    d.avatar = { ...r.avatar };
    d.meta.avatarCriado = true;
    if (d.pet.especie !== r.pet) d.pet.skin = 'normal';
    d.pet.especie = r.pet;
    d.pet.nome = r.nomePet || personagem(r.pet).nome;
    if (!d.colecao[r.pet]) d.colecao[r.pet] = Date.now();
    if (!d.colecaoVista.includes(r.pet)) d.colecaoVista.push(r.pet);

    // Exemplos não editados saem; o que é seu fica.
    const tinhaSessoes = d.treinos.sessoes.length > 0;
    const fichasExemplo = d.treinos.fichas.filter((f) => f.exemplo);
    limparExemplos(d);
    // fichas de exemplo já usadas em treinos ficam, se você não montar um treino novo
    if (!r.focos.includes('treino') && tinhaSessoes) d.treinos.fichas.unshift(...fichasExemplo.map((f) => ({ ...f, exemplo: false })));

    // Rotina
    const existe = (nome) => d.rotina.some((i) => i.nome.toLowerCase() === nome.toLowerCase());
    for (const h of r.habitos) {
      if (!existe(h.nome)) d.rotina.push({ id: uid(), nome: h.nome, emoji: h.emoji, xp: d.ajustes.xp.rotinaPadrao, dias: h.dias, horario: h.horario || null, criadoEm: hoje });
    }
    // Desafios matinais (blocos de check com horário)
    const novosChecks = [];
    for (const id of r.desafios) {
      const x = DESAFIOS.find((y) => y.id === id);
      const ja = d.checks.find((c) => c.nome === x.nome);
      if (ja) {
        ja.horaLimite = somarMinutos(r.acorda, x.min);
        novosChecks.push(ja);
        continue;
      }
      const c = { id: uid(), chave: x.chave || '', nome: x.nome, emoji: x.emoji, xp: x.xp, dias: x.dias || null, horaLimite: somarMinutos(r.acorda, x.min), criadoEm: hoje, melhorSequencia: 0 };
      d.checks.push(c);
      novosChecks.push(c);
    }
    // Treino
    if (r.focos.includes('treino')) {
      d.treinos.fichas.unshift(...gerarFichas(r.treino)); // as novas entram primeiro no rodízio
      d.ajustes.metaTreinosSemana = r.treino.freq;
      d.treinos.ultimaFichaId = null;
    }
    // Pendências
    for (const p of r.pendencias) {
      if (d.pendencias.some((x) => !x.concluidaEm && x.titulo === p.titulo)) continue;
      d.pendencias.push({ id: uid(), titulo: p.titulo, descricao: '', prazo: prazoDe(p.prazo), prioridade: p.prioridade, etiqueta: '', criadaEm: Date.now(), concluidaEm: null, lanc: null, xpGanho: 0 });
    }
    // Painel montado para você (checks antigos que não foram escolhidos continuam, no fim)
    const outrosChecks = d.checks.filter((c) => !novosChecks.includes(c));
    d.painel = montarPainel(r.focos, novosChecks);
    for (const c of outrosChecks) d.painel.push({ id: `b-${c.id}`, tipo: 'check', ref: c.id, ativo: false, tamanho: 'p' });

    d.meta.onboardingFeito = true;
    d.meta.exemplosCriados = true;
    ressortearMissoes();
    // Os iniciais só entram na coleção quando escolhidos
    if (!refazendo) {
      for (const x of PERSONAGENS) if (x.inicial && x.id !== r.pet) delete d.colecao[x.id];
      d.colecaoVista = d.colecaoVista.filter((id) => d.colecao[id]);
    }
    if (primeiraVez) {
      d.meta.bonusJornada = true;
      d.carteira.escudos = Math.min(2, (d.carteira.escudos || 0) + 1);
      ganharXP({ base: 50, fonte: 'bonus', rotulo: 'Começo da jornada', multiplicar: false });
    }
  });
  fechar();
  confete();
  tocar('fanfarra');
  document.dispatchEvent(new CustomEvent('dib-onboarding-fim'));
}
