// =============================================================
// utils.js — funções utilitárias usadas pelo app inteiro:
// datas (sempre no fuso local do aparelho), formatação pt-BR,
// escape de HTML, geração de IDs e um mini barramento de eventos.
// =============================================================

export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// A semana começa na segunda: ordem dos dias (valores de Date.getDay()).
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

const pad = (n) => String(n).padStart(2, '0');

// ---------- Datas ----------
// Um "dia" é representado por uma chave de texto 'AAAA-MM-DD' no horário local.
// Chaves assim podem ser comparadas diretamente com < e >.

/** Converte um Date em chave 'AAAA-MM-DD'. */
export function chaveData(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Chave do dia de hoje. O dia vira à meia-noite local. */
export function hojeKey() {
  return chaveData(new Date());
}

/** Converte chave 'AAAA-MM-DD' em Date (meio-dia, para evitar problemas de horário de verão). */
export function dataDeChave(k) {
  const [a, m, d] = k.split('-').map(Number);
  return new Date(a, m - 1, d, 12, 0, 0);
}

/** Soma (ou subtrai) dias de uma chave. */
export function somarDias(k, n) {
  const d = dataDeChave(k);
  d.setDate(d.getDate() + n);
  return chaveData(d);
}

/** Dia da semana da chave (0 = domingo ... 6 = sábado). */
export function diaSemana(k) {
  return dataDeChave(k).getDay();
}

/** Chave da segunda-feira da semana da data informada. */
export function inicioSemana(k) {
  const dow = diaSemana(k);
  const delta = dow === 0 ? -6 : 1 - dow;
  return somarDias(k, delta);
}

/** As 7 chaves da semana (segunda a domingo) que contém a data. */
export function diasDaSemana(k) {
  const ini = inicioSemana(k);
  return Array.from({ length: 7 }, (_, i) => somarDias(ini, i));
}

/** Quantidade de dias de a até b (b - a). */
export function diferencaDias(a, b) {
  return Math.round((dataDeChave(b) - dataDeChave(a)) / 86400000);
}

/** 'AAAA-MM-DD' -> 'dd/mm/aaaa' */
export function formatarData(k) {
  if (!k) return '';
  const [a, m, d] = k.split('-');
  return `${d}/${m}/${a}`;
}

/** 'AAAA-MM-DD' -> 'dd/mm' */
export function formatarDataCurta(k) {
  if (!k) return '';
  const [, m, d] = k.split('-');
  return `${d}/${m}`;
}

/** Timestamp -> 'dd/mm/aaaa às HH:MM' */
export function formatarDataHora(ts) {
  const d = new Date(ts);
  return `${formatarData(chaveData(d))} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Timestamp -> 'HH:MM' */
export function formatarHora(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Hora atual 'HH:MM' (para comparar com horários-limite). */
export function horaAtual() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Segundos -> 'H:MM:SS' ou 'MM:SS'. */
export function formatarDuracao(seg) {
  seg = Math.max(0, Math.floor(seg));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Segundos -> '1h 05min' / '42min' (texto amigável). */
export function duracaoAmigavel(seg) {
  const min = Math.round(seg / 60);
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h ${pad(min % 60)}min`;
}

/** Rótulo amigável para um prazo: Hoje, Amanhã, Ontem ou dd/mm/aaaa. */
export function rotuloPrazo(k) {
  const hoje = hojeKey();
  const dif = diferencaDias(hoje, k);
  if (dif === 0) return 'Hoje';
  if (dif === 1) return 'Amanhã';
  if (dif === -1) return 'Ontem';
  return formatarData(k);
}

/** Saudação conforme o horário. */
export function saudacao() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ---------- Números ----------

/** Formata número no padrão brasileiro (1.234,5). */
export function formatarNumero(v, casas = 0) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** Formata em reais. */
export function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Lê um número digitado aceitando vírgula ("42,5" -> 42.5). */
export function lerNumero(v, padrao = 0) {
  if (typeof v === 'number') return isFinite(v) ? v : padrao;
  let s = String(v ?? '').trim();
  // Se tem vírgula, ela é o separador decimal e os pontos são de milhar.
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : padrao;
}

export function limitar(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// ---------- Texto / HTML ----------

/** Escapa texto do usuário antes de colocar em innerHTML (evita quebrar a página). */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Gera um ID curto e único. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Pluralização simples: plural(3, 'dia', 'dias') -> '3 dias'. */
export function plural(n, um, varios) {
  return `${formatarNumero(n)} ${n === 1 ? um : varios}`;
}

// ---------- Eventos ----------
// Barramento simples para módulos conversarem sem depender uns dos outros.
// Eventos usados: 'xp' (XP ganho), 'xp-removido', 'nivel' (subiu de nível),
// 'conquista' (medalha desbloqueada), 'novo-dia'.

const ouvintes = {};

export function on(evento, fn) {
  (ouvintes[evento] ||= new Set()).add(fn);
  return () => ouvintes[evento].delete(fn);
}

export function emitir(evento, dados) {
  (ouvintes[evento] || []).forEach((fn) => {
    try {
      fn(dados);
    } catch (e) {
      console.error(`Erro no ouvinte de "${evento}":`, e);
    }
  });
}

// ---------- Sorteio ----------

/**
 * Gerador de números aleatórios com semente (sempre o mesmo resultado para a
 * mesma semente). Usado nas missões do dia: elas não mudam se você reabrir o app.
 */
export function aleatorioComSemente(semente) {
  let h = 1779033703 ^ String(semente).length;
  for (const c of String(semente)) {
    h = Math.imul(h ^ c.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Sorteia um item de uma lista com pesos: [{peso, ...}] */
export function sortearComPeso(lista, rnd = Math.random) {
  const total = lista.reduce((s, x) => s + x.peso, 0);
  let r = rnd() * total;
  for (const x of lista) {
    r -= x.peso;
    if (r <= 0) return x;
  }
  return lista[lista.length - 1];
}

/** Soma minutos a um horário 'HH:MM'. */
export function somarMinutos(hhmm, min) {
  const [h, m] = String(hhmm || '07:00').split(':').map(Number);
  const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + min));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}
