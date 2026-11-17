// =============================================================
// personagens.js — COMPANHEIROS e COLEÇÃO.
// • Você começa escolhendo um dos 3 iniciais no questionário.
// • O companheiro evolui com o seu nível (5 estágios, de Filhote a Lendário).
// • Outros personagens são desbloqueados pelo seu progresso e uso.
// • O humor e as falas do companheiro reagem ao seu dia.
// Para criar um personagem novo: adicione em PERSONAGENS com um teste(d).
// =============================================================

import { dados } from './store.js';
import { emitir, hojeKey, esc, aleatorioComSemente } from './utils.js';
import { nivelInfo, xpDoDia } from './xp.js';
import { resumoRotina, sequenciaRotina } from './historico.js';

// ---------- Contadores usados pelos requisitos ----------
export function contarHabitos(d = dados()) {
  let n = 0;
  for (const r of Object.values(d.diario)) n += Object.keys(r.rotina || {}).length;
  return n;
}
export function diasComAgua(d = dados()) {
  return Object.values(d.diario).filter((r) => (r.agua || 0) >= d.ajustes.metaAgua).length;
}
export function recordesPessoais(d = dados()) {
  return d.treinos.sessoes.reduce((s, x) => s + (x.recordes ? x.recordes.length : 0), 0);
}
export function maxPendenciasNumDia(d = dados()) {
  const porDia = {};
  for (const p of d.pendencias) if (p.concluidaDia) porDia[p.concluidaDia] = (porDia[p.concluidaDia] || 0) + 1;
  return Math.max(0, ...Object.values(porDia));
}
const melhorSeq = (d) => Math.max(d.stats.melhorSequencia || 0, sequenciaRotina());

// ---------- Catálogo ----------
export const PERSONAGENS = [
  // Iniciais (escolhidos no questionário)
  { id: 'raposa', emoji: '🦊', nome: 'Kira', especie: 'Raposa', inicial: true, jeito: 'esperta e focada', cor: '#fb923c' },
  { id: 'panda', emoji: '🐼', nome: 'Bao', especie: 'Panda', inicial: true, jeito: 'calmo e constante', cor: '#a3e635' },
  { id: 'lobo', emoji: '🐺', nome: 'Rex', especie: 'Lobo', inicial: true, jeito: 'forte e determinado', cor: '#60a5fa' },
  // Desbloqueáveis
  { id: 'gato', emoji: '🐱', nome: 'Mia', especie: 'Gata', requisito: 'Abra o baú diário 5 dias seguidos', teste: (d) => d.stats.melhorCheckin >= 5, cor: '#f472b6' },
  { id: 'tartaruga', emoji: '🐢', nome: 'Zen', especie: 'Tartaruga', requisito: '7 dias seguidos com a rotina 100%', teste: (d) => melhorSeq(d) >= 7, cor: '#4ade80' },
  { id: 'coruja', emoji: '🦉', nome: 'Sofia', especie: 'Coruja', requisito: 'Marque 50 hábitos da rotina', teste: (d) => contarHabitos(d) >= 50, cor: '#c084fc' },
  { id: 'abelha', emoji: '🐝', nome: 'Mel', especie: 'Abelha', requisito: 'Conclua 25 pendências', teste: (d) => d.pendencias.filter((p) => p.concluidaEm).length >= 25, cor: '#facc15' },
  { id: 'leao', emoji: '🦁', nome: 'Leon', especie: 'Leão', requisito: 'Finalize 10 treinos', teste: (d) => d.treinos.sessoes.length >= 10, cor: '#f59e0b' },
  { id: 'golfinho', emoji: '🐬', nome: 'Splash', especie: 'Golfinho', requisito: 'Bata a meta de água em 10 dias', teste: (d) => diasComAgua(d) >= 10, cor: '#22d3ee' },
  { id: 'galo', emoji: '🐓', nome: 'Kiko', especie: 'Galo', requisito: 'Cumpra 10 desafios matinais no prazo', teste: (d) => d.stats.checksCedo >= 10, cor: '#ef4444' },
  { id: 'polvo', emoji: '🐙', nome: 'Oto', especie: 'Polvo', requisito: 'Conclua 5 pendências em um único dia', teste: (d) => maxPendenciasNumDia(d) >= 5, cor: '#e879f9' },
  { id: 'robo', emoji: '🤖', nome: 'Byte', especie: 'Robô', requisito: 'Resgate 20 missões diárias', teste: (d) => d.stats.missoesResgatadas >= 20, cor: '#94a3b8' },
  { id: 'tubarao', emoji: '🦈', nome: 'Bruto', especie: 'Tubarão', requisito: 'Bata 3 recordes de carga', teste: (d) => recordesPessoais(d) >= 3, cor: '#38bdf8' },
  { id: 'aguia', emoji: '🦅', nome: 'Íris', especie: 'Águia', requisito: 'Alcance o nível 10', teste: (d) => nivelInfo(d.xp.total).nivel >= 10, cor: '#d97706' },
  { id: 'unicornio', emoji: '🦄', nome: 'Luna', especie: 'Unicórnio', requisito: 'Chegue à liga Diamante numa semana', teste: (d) => d.stats.melhorLiga >= 4, cor: '#f0abfc' },
  { id: 'dragao', emoji: '🐉', nome: 'Ignis', especie: 'Dragão', requisito: '30 dias seguidos com a rotina 100%', teste: (d) => melhorSeq(d) >= 30, cor: '#34d399', lendario: true },
];

/** Estágios de evolução (pelo nível do jogador). */
export const ESTAGIOS = [
  { estagio: 1, nivel: 1, nome: 'Filhote', enfeite: '' },
  { estagio: 2, nivel: 3, nome: 'Aprendiz', enfeite: '✨' },
  { estagio: 3, nivel: 6, nome: 'Guerreiro', enfeite: '⚡' },
  { estagio: 4, nivel: 10, nome: 'Mestre', enfeite: '👑' },
  { estagio: 5, nivel: 20, nome: 'Lendário', enfeite: '🌟' },
];

export function estagioDoNivel(nivel) {
  let e = ESTAGIOS[0];
  for (const x of ESTAGIOS) if (nivel >= x.nivel) e = x;
  return e;
}

export function personagem(id) {
  return PERSONAGENS.find((p) => p.id === id) || PERSONAGENS[0];
}

/** Companheiro ativo. */
export function companheiro() {
  return personagem(dados().perfil.personagem);
}

export function desbloqueado(id) {
  const d = dados();
  return !!d.colecao[id];
}

/** HTML do avatar (emoji com aura e enfeite do estágio). */
export function avatarHTML(p = companheiro(), { tam = 'm', nivel = nivelInfo().nivel, humor = '' } = {}) {
  const e = estagioDoNivel(nivel);
  return `<span class="avatar tam-${tam} est-${e.estagio} ${humor ? 'humor-' + humor : ''}" style="--cor-pers:${p.cor}" aria-label="${esc(p.nome)}">
    <span class="avatar-aura"></span>
    <span class="avatar-emoji">${p.emoji}</span>
    ${e.enfeite ? `<span class="avatar-enfeite">${e.enfeite}</span>` : ''}
  </span>`;
}

/** Verifica novos desbloqueios. Retorna true se algum foi liberado. */
export function verificarPersonagens() {
  const d = dados();
  let novo = false;
  // o companheiro escolhido está sempre desbloqueado (depois do questionário)
  if (d.meta.onboardingFeito && !d.colecao[d.perfil.personagem]) d.colecao[d.perfil.personagem] = Date.now();
  for (const p of PERSONAGENS) {
    if (p.inicial || d.colecao[p.id] || !p.teste) continue;
    let ok = false;
    try {
      ok = p.teste(d);
    } catch (e) {
      console.error('personagem', p.id, e);
    }
    if (ok) {
      d.colecao[p.id] = Date.now();
      novo = true;
      emitir('personagem', p);
    }
  }
  return novo;
}

/** Quantos personagens novos ainda não foram vistos na Coleção. */
export function novosNaColecao() {
  const d = dados();
  return Object.keys(d.colecao).filter((id) => !d.colecaoVista.includes(id)).length;
}

// ---------- Humor e falas ----------

/** Humor do companheiro conforme o seu dia. */
export function humor() {
  const hoje = hojeKey();
  const r = resumoRotina(hoje);
  const h = new Date().getHours();
  if (r.total > 0 && r.feitos >= r.total) return 'radiante';
  if (h < 6) return 'sonolento';
  if (h >= 18 && r.total > 0 && r.feitos < r.total && sequenciaRotina(true) > 0) return 'preocupado';
  if (r.feitos > 0 || xpDoDia(hoje) > 0) return 'animado';
  return 'pronto';
}

const FALAS = {
  pronto: [
    'Bora começar? O primeiro check é o mais difícil. 💪',
    'Hoje é um ótimo dia para subir de nível, {nome}!',
    'Escolha uma coisa pequena e faça agora. Eu te espero!',
    'Cada hábito é XP no bolso. Vamos nessa?',
    '{faltam} hábitos esperando você hoje. Começa pelo mais fácil!',
  ],
  animado: [
    'Isso aí! Já estamos em movimento! 🚀',
    'Mais {faltam} e a rotina fecha. Bora!',
    'Tô sentindo o XP subindo daqui! ⚡',
    'Que ritmo! Continua que eu tô vendo.',
    'Combo vindo aí... não para agora!',
  ],
  radiante: [
    'ROTINA 100%! Você é demais, {nome}! 🎉',
    'Dia perfeito! A sequência agora é de {seq} dias! 🔥',
    'Missão cumprida. Agora aproveita, você mereceu!',
    'Hoje eu fiquei orgulhoso(a) de você! ✨',
  ],
  preocupado: [
    'Ei... sua sequência de {seq} dias está em risco! 😟',
    'Ainda dá tempo! Faltam só {faltam}. Vamos?',
    'Não deixa a chama apagar hoje, {nome}! 🔥',
  ],
  sonolento: ['Zzz... ainda é cedo, mas eu topo começar! 😴', 'Madrugada? Que disciplina! 🌙'],
};

/** Uma fala do companheiro (muda a cada toque). */
export function fala(variacao = 0) {
  const d = dados();
  const hu = humor();
  const lista = FALAS[hu];
  const rnd = aleatorioComSemente(hojeKey() + hu + variacao);
  const r = resumoRotina(hojeKey());
  const texto = lista[Math.floor(rnd() * lista.length)];
  return texto
    .replace('{nome}', d.ajustes.nome || 'campeão')
    .replace('{faltam}', String(Math.max(0, r.total - r.feitos)))
    .replace('{seq}', String(Math.max(sequenciaRotina(), sequenciaRotina(true))));
}
