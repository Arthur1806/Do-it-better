// =============================================================
// graficos.js — gráficos em SVG puro (sem bibliotecas):
// anel de progresso, barras e linha de evolução com recordes.
// Os gradientes "g-dib" (diagonal) e "g-dib-v" (vertical) estão
// definidos uma única vez no index.html.
// =============================================================

import { esc, limitar } from './utils.js';

/**
 * Anel de progresso.
 * @param {number} pct 0..1
 * @param {{tam?:number, esp?:number, html?:string, classe?:string}} o
 */
export function anel(pct, { tam = 64, esp = 7, html = '', classe = '' } = {}) {
  const p = limitar(Number(pct) || 0, 0, 1);
  const r = (tam - esp) / 2;
  const c = 2 * Math.PI * r;
  const meio = tam / 2;
  return `<div class="anel ${classe} ${p >= 1 ? 'completo' : ''}" style="width:${tam}px;height:${tam}px">
    <svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}" aria-hidden="true">
      <circle class="anel-trilho" cx="${meio}" cy="${meio}" r="${r}" stroke-width="${esp}" fill="none"/>
      ${p > 0 ? `<circle class="anel-valor" cx="${meio}" cy="${meio}" r="${r}" stroke-width="${esp}" fill="none"
        stroke="url(#g-dib)" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}"
        stroke-dashoffset="${(c * (1 - p)).toFixed(2)}" transform="rotate(-90 ${meio} ${meio})"/>` : ''}
    </svg>
    <div class="anel-centro">${html}</div>
  </div>`;
}

/**
 * Gráfico de barras.
 * @param {{rotulo:string, valor:number, destaque?:boolean}[]} itens
 * @param {{altura?:number, mostrarValores?:boolean, rotulosACada?:number}} o
 */
export function barras(itens, { altura = 120, mostrarValores = true, rotulosACada = 1 } = {}) {
  const L = 320;
  const H = altura;
  const topo = mostrarValores ? 16 : 6;
  const base = H - 18;
  const max = Math.max(1, ...itens.map((i) => i.valor));
  const n = itens.length || 1;
  const passo = L / n;
  const larg = Math.max(3, Math.min(28, passo * 0.62));
  const partes = itens.map((it, i) => {
    const h = Math.max(it.valor > 0 ? 3 : 0, ((base - topo) * it.valor) / max);
    const x = i * passo + (passo - larg) / 2;
    const y = base - h;
    const rot = i % rotulosACada === 0 || i === n - 1;
    return `
      <rect x="${x.toFixed(1)}" y="${(base - (base - topo)).toFixed(1)}" width="${larg.toFixed(1)}" height="${(base - topo).toFixed(1)}" rx="${Math.min(6, larg / 2)}" class="barra-fundo"/>
      ${h > 0 ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${larg.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(6, larg / 2)}" fill="url(#g-dib-v)" class="${it.destaque ? 'barra-destaque' : ''}"/>` : ''}
      ${mostrarValores && it.valor > 0 && n <= 10 ? `<text x="${(x + larg / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" class="graf-valor" text-anchor="middle">${it.valor}</text>` : ''}
      ${rot ? `<text x="${(x + larg / 2).toFixed(1)}" y="${H - 3}" class="graf-rotulo ${it.destaque ? 'forte' : ''}" text-anchor="middle">${esc(it.rotulo)}</text>` : ''}`;
  });
  return `<svg class="grafico" viewBox="0 0 ${L} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${partes.join('')}</svg>`;
}

/**
 * Gráfico de linha com destaque dos recordes pessoais.
 * @param {{rotulo:string, valor:number, recorde?:boolean}[]} pontos
 * @param {{altura?:number, unidade?:string}} o
 */
export function linha(pontos, { altura = 190, unidade = 'kg' } = {}) {
  const L = 320;
  const H = altura;
  const esq = 34;
  const dir = 14;
  const topo = 22;
  const base = H - 24;
  if (!pontos.length) return '';
  const valores = pontos.map((p) => p.valor);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (min === max) {
    min = Math.max(0, min - 5);
    max = max + 5;
  } else {
    const folga = (max - min) * 0.15;
    min = Math.max(0, min - folga);
    max = max + folga;
  }
  const xDe = (i) => (pontos.length === 1 ? (esq + L - dir) / 2 : esq + (i * (L - esq - dir)) / (pontos.length - 1));
  const yDe = (v) => base - ((v - min) / (max - min)) * (base - topo);

  // linhas de grade
  const grades = [0, 0.5, 1].map((f) => {
    const v = min + (max - min) * f;
    const y = yDe(v);
    return `<line x1="${esq}" x2="${L - dir}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="graf-grade"/>
      <text x="${esq - 6}" y="${(y + 4).toFixed(1)}" class="graf-rotulo" text-anchor="end">${Math.round(v)}</text>`;
  });

  const coords = pontos.map((p, i) => [xDe(i), yDe(p.valor)]);
  const d = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${d} L${coords[coords.length - 1][0].toFixed(1)},${base} L${coords[0][0].toFixed(1)},${base} Z`;

  const pts = pontos.map((p, i) => {
    const [x, y] = coords[i];
    if (p.recorde) {
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="graf-pr-brilho"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" class="graf-pr"/>
        <text x="${x.toFixed(1)}" y="${(y - 12).toFixed(1)}" class="graf-pr-texto" text-anchor="middle">PR</text>`;
    }
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" class="graf-ponto"/>`;
  });

  const rotX = [];
  const passo = Math.max(1, Math.ceil(pontos.length / 5));
  pontos.forEach((p, i) => {
    if (i % passo === 0 || i === pontos.length - 1) {
      rotX.push(`<text x="${xDe(i).toFixed(1)}" y="${H - 6}" class="graf-rotulo" text-anchor="middle">${esc(p.rotulo)}</text>`);
    }
  });

  return `<svg class="grafico" viewBox="0 0 ${L} ${H}" role="img" aria-label="Evolução em ${esc(unidade)}">
    <defs><linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color: var(--roxo); stop-opacity: .35"/><stop offset="1" style="stop-color: var(--ciano); stop-opacity: 0"/>
    </linearGradient>
    <linearGradient id="g-linha" gradientUnits="userSpaceOnUse" x1="${esq}" y1="0" x2="${L - dir}" y2="0">
      <stop offset="0" style="stop-color: var(--roxo)"/><stop offset="1" style="stop-color: var(--ciano)"/>
    </linearGradient></defs>
    ${grades.join('')}
    ${pontos.length > 1 ? `<path d="${area}" fill="url(#g-area)"/>` : ''}
    ${pontos.length > 1 ? `<path d="${d}" fill="none" stroke="url(#g-linha)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${pts.join('')}
    ${rotX.join('')}
  </svg>`;
}
