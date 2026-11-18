// =============================================================
// personagens.js — os PETS (em pixel art) e a COLEÇÃO.
// • Você escolhe um pet inicial no questionário e dá um nome a ele.
// • O pet evolui com o seu nível (5 estágios, de Filhote a Lendário).
// • Outros pets são desbloqueados pelo seu progresso.
// • Skins de pet (dourado, sombra, neon...) deixam ele exclusivo.
// • O estado do pet (forte, sujo, fraco, triste) vem de pet.js.
// Para criar um pet novo: escolha um sprite de pixel.js e uma paleta.
// =============================================================

import { dados } from './store.js';
import { emitir, hojeKey, esc, aleatorioComSemente } from './utils.js';
import { nivelInfo, xpDoDia, nivelDesbloqueio } from './xp.js';
import { resumoRotina, sequenciaRotina } from './historico.js';
import { PET_SPRITES, RABO_RAPOSA, compor, svgDaGrade, sombrear, misturar } from './pixel.js';
import { estadoPet } from './pet.js';
import { gradeMutante, paletaMutante, mutacaoDoPet, FOGO_PET, MUTACOES } from './mutacao.js';
import { fogoSVG } from './fogo.js';

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

// ---------- Catálogo de pets ----------
// paleta: A principal · B barriga/focinho · E olhos · N nariz · R rosado · W branco · Y bico/chifre · G casco · L luz
const P = (A, B, extra = {}) => ({ A, B, E: '#1b1726', N: '#2b1d1d', R: '#f9a8d4', W: '#ffffff', Y: '#fbbf24', ...extra });

export const PERSONAGENS = [
  // Iniciais
  { id: 'cachorro', nome: 'Thor', especie: 'Cachorro', sprite: 'canino', paleta: P('#c98a4b', '#f5deb3'), inicial: true, jeito: 'leal e animado', cor: '#c98a4b' },
  { id: 'gato', nome: 'Mia', especie: 'Gato', sprite: 'felino', paleta: P('#f59e0b', '#fff7ed'), inicial: true, jeito: 'curioso e independente', cor: '#f59e0b' },
  { id: 'raposa', nome: 'Kira', especie: 'Raposa', sprite: 'felino', rabo: true, paleta: P('#ea580c', '#ffffff'), inicial: true, jeito: 'esperta e focada', cor: '#fb923c' },
  { id: 'panda', nome: 'Bao', especie: 'Panda', sprite: 'urso', paleta: P('#f8fafc', '#d1d5db', { a: '#1f2937', E: '#ffffff', N: '#111827', R: '#1f2937' }), inicial: true, jeito: 'calmo e constante', cor: '#a3e635' },
  { id: 'lobo', nome: 'Rex', especie: 'Lobo', sprite: 'felino', paleta: P('#7c8597', '#e5e7eb', { R: '#cbd5e1' }), inicial: true, jeito: 'forte e determinado', cor: '#60a5fa' },
  // Desbloqueáveis
  { id: 'coelho', nome: 'Pipoca', especie: 'Coelho', sprite: 'coelho', paleta: P('#f1f5f9', '#ffffff'), requisito: 'Abra o baú diário 5 dias seguidos', teste: (d) => d.stats.melhorCheckin >= 5, cor: '#f472b6' },
  { id: 'tartaruga', nome: 'Zen', especie: 'Tartaruga', sprite: 'tartaruga', paleta: P('#65a30d', '#65a30d', { G: '#92400e', R: '#f472b6' }), requisito: '7 dias seguidos com a rotina 100%', teste: (d) => melhorSeq(d) >= 7, cor: '#4ade80' },
  { id: 'coruja', nome: 'Sofia', especie: 'Coruja', sprite: 'passaro', paleta: P('#8b5a2b', '#e7c9a0', { Y: '#f59e0b' }), requisito: 'Marque 50 hábitos da rotina', teste: (d) => contarHabitos(d) >= 50, cor: '#c084fc' },
  { id: 'pinguim', nome: 'Gelinho', especie: 'Pinguim', sprite: 'passaro', paleta: P('#1f2937', '#f8fafc', { Y: '#f97316', a: '#111827' }), requisito: 'Conclua 25 pendências', teste: (d) => d.pendencias.filter((p) => p.concluidaEm).length >= 25, cor: '#38bdf8' },
  { id: 'urso', nome: 'Bruno', especie: 'Urso', sprite: 'urso', paleta: P('#8b5a2b', '#d6a77a', { a: '#5c3a1e' }), requisito: 'Finalize 10 treinos', teste: (d) => d.treinos.sessoes.length >= 10, cor: '#f59e0b' },
  { id: 'slime', nome: 'Gota', especie: 'Slime d’água', sprite: 'slime', paleta: P('#38bdf8', '#38bdf8', { R: '#0ea5e9' }), requisito: 'Bata a meta de água em 10 dias', teste: (d) => diasComAgua(d) >= 10, cor: '#22d3ee' },
  { id: 'pintinho', nome: 'Kiko', especie: 'Pintinho', sprite: 'passaro', paleta: P('#facc15', '#fef08a', { Y: '#f97316', a: '#eab308' }), requisito: 'Cumpra 10 desafios matinais no prazo', teste: (d) => d.stats.checksCedo >= 10, cor: '#facc15' },
  { id: 'pantera', nome: 'Sombra', especie: 'Pantera', sprite: 'felino', paleta: P('#1f2937', '#374151', { E: '#facc15', R: '#4b5563' }), requisito: 'Conclua 5 pendências em um único dia', teste: (d) => maxPendenciasNumDia(d) >= 5, cor: '#a78bfa' },
  { id: 'robo', nome: 'Byte', especie: 'Robô', sprite: 'robo', paleta: P('#94a3b8', '#cbd5e1', { L: '#22d3ee', R: '#ef4444', k: '#1f2937' }), requisito: 'Resgate 20 missões diárias', teste: (d) => d.stats.missoesResgatadas >= 20, cor: '#94a3b8' },
  { id: 'husky', nome: 'Neve', especie: 'Husky', sprite: 'canino', paleta: P('#64748b', '#f8fafc', { a: '#475569' }), requisito: 'Bata 3 recordes de carga', teste: (d) => recordesPessoais(d) >= 3, cor: '#38bdf8' },
  { id: 'fenix', nome: 'Brasa', especie: 'Fênix', sprite: 'passaro', paleta: P('#dc2626', '#fb923c', { Y: '#fde047', a: '#fbbf24', W: '#fde68a' }), requisito: 'Alcance o nível 15', teste: (d) => nivelDesbloqueio(d) >= 15, cor: '#f97316' },
  { id: 'dragaoGelo', nome: 'Cristal', especie: 'Dragão de gelo', sprite: 'dragao', paleta: P('#60a5fa', '#e0f2fe', { Y: '#f8fafc', a: '#2563eb', N: '#1e3a8a' }), requisito: 'Chegue à liga Diamante numa semana', teste: (d) => d.stats.melhorLiga >= 4, cor: '#93c5fd' },
  { id: 'dragao', nome: 'Ignis', especie: 'Dragão', sprite: 'dragao', paleta: P('#16a34a', '#fde047', { Y: '#fef3c7', a: '#15803d' }), requisito: '30 dias seguidos com a rotina 100%', teste: (d) => melhorSeq(d) >= 30, cor: '#34d399', lendario: true },
];

/** Skins de pet (trocam as cores principais). */
export const SKINS_PET = [
  { id: 'normal', nome: 'Original', r: 'comum', d: { tipo: 'gratis' } },
  { id: 'rosa', nome: 'Algodão-doce', r: 'raro', cores: { A: '#f9a8d4', B: '#fdf2f8', a: '#ec4899' }, d: { tipo: 'loja', preco: 250 } },
  { id: 'sombra', nome: 'Sombra', r: 'epico', cores: { A: '#3b2f6b', B: '#6d5dbf', a: '#1e1847', E: '#a78bfa' }, d: { tipo: 'loja', preco: 500 } },
  { id: 'neon', nome: 'Neon', r: 'epico', cores: { A: '#06b6d4', B: '#a5f3fc', a: '#0e7490', E: '#0f172a' }, d: { tipo: 'nivel', n: 12 } },
  { id: 'dourado', nome: 'Dourado', r: 'lendario', cores: { A: '#f59e0b', B: '#fde68a', a: '#b45309', G: '#d97706' }, d: { tipo: 'nivel', n: 25 } },
  { id: 'fantasma', nome: 'Fantasma', r: 'lendario', cores: { A: '#e2e8f0', B: '#f8fafc', a: '#94a3b8', E: '#6366f1' }, d: { tipo: 'sequencia', n: 30 } },
];

/** Estágios de evolução (pelo nível do jogador). */
/**
 * Estágios do pet (v5): agora vêm das MUTAÇÕES (mutacao.js), não do nível.
 * O nível só libera a mutação; quem muta é você, com DNA 🧬.
 */
export const ESTAGIOS = MUTACOES.map((m) => ({ estagio: m.n + 1, n: m.n, nivel: m.nivel || 1, dna: m.dna || 0, nome: m.nome, enfeite: '' }));

/** Estágio atual do SEU pet (o parâmetro é mantido por compatibilidade). */
export function estagioDoNivel() {
  return ESTAGIOS[mutacaoDoPet().n];
}

export function personagem(id) {
  return PERSONAGENS.find((p) => p.id === id) || PERSONAGENS[0];
}

/** O pet do jogador (catálogo + nome escolhido). */
export function companheiro() {
  const d = dados();
  const base = personagem(d.pet.especie);
  return { ...base, nome: d.pet.nome || base.nome };
}

export function desbloqueado(id) {
  return !!dados().colecao[id];
}

// -------------------------------------------------------------
// Desenho do pet
// -------------------------------------------------------------

/** Grade do pet com os efeitos de estado (sujo, sonolento). */
function gradePet(p, est, mut = 0) {
  const camadas = [{ linhas: PET_SPRITES[p.sprite] }];
  if (p.rabo) camadas.push(RABO_RAPOSA);
  const g = gradeMutante(compor(camadas, 14, 12), mut);
  const H = g.length;
  const W = g[0].length;
  const olho = (c) => c === 'E' || c === 'X';
  if (est && est.sujo) {
    // manchas de sujeira em posições fixas
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (['A', 'B', 'a'].includes(g[y][x]) && (x * 7 + y * 13) % 9 === 0) g[y][x] = 'm';
  }
  if (est && (est.fraco || est.dormindo || est.faminto)) {
    // olhos semicerrados: o pixel de cima do olho vira pálpebra
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (olho(g[y][x]) && olho(g[y + 1][x])) g[y][x] = 'A';
  }
  return g;
}

/** Paleta final: base do pet + skin + mutação + efeito de fraqueza (cores apagadas). */
function paletaPet(p, skinId, est, mut = 0) {
  const skin = SKINS_PET.find((s) => s.id === skinId);
  let pal = { ...p.paleta, ...(skin && skin.cores ? skin.cores : {}) };
  if (!pal.a) pal.a = sombrear(pal.A, 0.22);
  pal = paletaMutante(pal, mut);
  pal.g = pal.g || sombrear(pal.G || '#92400e', 0.25);
  pal.m = '#6b4a2b'; // lama
  if (est && est.fraco) {
    for (const k of Object.keys(pal)) if (k !== 'E' && k !== 'm') pal[k] = misturar(pal[k], '#8a8f98', 0.45);
  }
  return pal;
}

/**
 * HTML do pet (pixel art) com aura do estágio e efeitos de estado.
 * @param {object} p   item do catálogo (padrão: o seu pet)
 * @param {{tam?:string, nivel?:number, humor?:string, skin?:string, estado?:object|false}} o
 */
export function avatarHTML(p = companheiro(), { tam = 'm', nivel = nivelInfo().nivel, humor = '', skin, estado, mutacao } = {}) {
  const d = dados();
  const ehMeu = p.id === d.pet.especie;
  const sk = skin ?? (ehMeu ? d.pet.skin : 'normal');
  const est = estado === false ? null : estado || (ehMeu ? estadoPet() : null);
  // a mutação é do SEU pet (os da coleção aparecem como filhotes)
  const mut = mutacao ?? (ehMeu ? mutacaoDoPet().n : 0);
  const e = { estagio: mut + 1, enfeite: '' };
  const classes = est ? Object.keys(est).filter((k) => est[k] === true).map((k) => 'pet-' + k).join(' ') : '';
  const grade = gradePet(p, est, mut);
  // o desenho cresce com a mutação (pixels do mesmo tamanho, pet maior)
  const escala = ((grade[0].length + 2) / 16) * (1 + mut * 0.07);
  const fogo = mut && !(est && est.fraco) ? fogoSVG(grade, { intensidade: FOGO_PET[mut], semente: 3 + mut }) : '';
  return `<span class="avatar pet tam-${tam} est-${e.estagio} ${mut ? 'mutante mut-' + mut : ''} ${humor ? 'humor-' + humor : ''} ${classes}" style="--cor-pers:${p.cor};--escala:${escala.toFixed(3)}" aria-label="${esc(p.nome)}">
    <span class="avatar-aura"></span>
    <span class="avatar-emoji">${fogo}${svgDaGrade(grade, paletaPet(p, sk, est, mut), { rotulo: p.especie })}</span>
    ${e.enfeite ? `<span class="avatar-enfeite">${e.enfeite}</span>` : ''}
    ${est && est.sujo ? '<span class="pet-moscas" aria-hidden="true"><i></i><i></i></span>' : ''}
    ${est && est.triste ? '<span class="pet-lagrima" aria-hidden="true"></span>' : ''}
    ${est && est.dormindo ? '<span class="pet-zzz" aria-hidden="true">z</span>' : ''}
    ${est && (est.faminto || est.sede) ? `<span class="pet-pede" aria-hidden="true">${est.faminto ? '🍖' : ''}${est.sede ? '💧' : ''}</span>` : ''}
  </span>`;
}

/** Verifica novos desbloqueios. Retorna true se algum foi liberado. */
export function verificarPersonagens() {
  const d = dados();
  let novo = false;
  if (d.meta.onboardingFeito && !d.colecao[d.pet.especie]) d.colecao[d.pet.especie] = Date.now();
  for (const p of PERSONAGENS) {
    if (p.inicial || d.colecao[p.id] || !p.teste) continue;
    let ok = false;
    try {
      ok = p.teste(d);
    } catch (e) {
      console.error('pet', p.id, e);
    }
    if (ok) {
      d.colecao[p.id] = Date.now();
      novo = true;
      emitir('personagem', p);
    }
  }
  return novo;
}

/** Quantos pets novos ainda não foram vistos. */
export function novosNaColecao() {
  const d = dados();
  return Object.keys(d.colecao).filter((id) => !d.colecaoVista.includes(id)).length;
}

// ---------- Humor e falas ----------

/** Humor do pet conforme o seu dia. */
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
    'Cada hábito que você cumpre me deixa mais forte! 🐾',
    '{faltam} hábitos esperando você hoje. Começa pelo mais fácil!',
  ],
  animado: [
    'Isso aí! Já estou me sentindo mais forte! 🚀',
    'Mais {faltam} e a rotina fecha. Bora!',
    'Tô sentindo o XP subindo daqui! ⚡',
    'Que ritmo! Continua que eu tô vendo.',
  ],
  radiante: [
    'ROTINA 100%! Você é demais, {nome}! 🎉',
    'Dia perfeito! A sequência agora é de {seq} dias! 🔥',
    'Hoje eu fiquei muito feliz com você! ✨',
  ],
  preocupado: [
    'Ei... nossa sequência de {seq} dias está em risco! 😟',
    'Ainda dá tempo! Faltam só {faltam}. Vamos?',
    'Não me deixa ficar fraquinho hoje, {nome}... 🥺',
  ],
  sonolento: ['Zzz... ainda é cedo, mas eu topo começar! 😴', 'Madrugada? Que disciplina! 🌙'],
  // estados de cuidado (têm prioridade)
  faminto: ['Tô com fome... compra uma ração pra mim? 🍖', 'Minha barriga tá roncando! 🥺', 'Sem moedas não tem comida... bora cumprir a rotina?'],
  sede: ['Tô com sede... me dá água? 💧', 'Uma aguinha cairia bem agora! 💧'],
  sujo: ['Tô todo sujinho... me dá um banho? 🛁', 'Eca, tô cheio de lama! Cumpre um hábito e me dá banho?'],
  fraco: ['Tô fraquinho... cada hábito que você cumpre me dá força. 🥺', 'Faz um tempo que a gente não treina a disciplina... me ajuda?'],
  triste: ['Senti sua falta... um carinho resolveria. 💔', 'Tô meio triste. Brinca comigo?'],
};

/** Uma fala do pet (muda a cada toque). */
export function fala(variacao = 0) {
  const d = dados();
  const est = estadoPet();
  const chave = est.faminto ? 'faminto' : est.sede ? 'sede' : est.fraco ? 'fraco' : est.sujo ? 'sujo' : est.triste ? 'triste' : humor();
  const lista = FALAS[chave];
  const rnd = aleatorioComSemente(hojeKey() + chave + variacao);
  const r = resumoRotina(hojeKey());
  return lista[Math.floor(rnd() * lista.length)]
    .replace('{nome}', d.ajustes.nome || 'campeão')
    .replace('{faltam}', String(Math.max(0, r.total - r.feitos)))
    .replace('{seq}', String(Math.max(sequenciaRotina(), sequenciaRotina(true))));
}
