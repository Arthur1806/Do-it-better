// =============================================================
// treinos.js — aba TREINOS (fichas A/B/C de academia).
// • Rodízio automático: A -> B -> C -> A (segue a ordem das fichas).
// • Modo "Treinando agora": cronômetro, séries, carga/reps na hora,
//   descanso automático com vibração/bipe, resumo ao finalizar.
// • XP: 100 por treino + 50 se bater recorde de carga.
// • Histórico e gráfico de evolução de carga por exercício.
// =============================================================

import { dados, alterar, salvar } from './store.js';
import {
  hojeKey, chaveData, esc, uid, formatarDuracao, duracaoAmigavel, formatarData, formatarDataCurta,
  formatarNumero, lerNumero, diasDaSemana, DIAS_LETRA, diaSemana, plural,
} from './utils.js';
import { ganharXP, removerXP } from './xp.js';
import {
  abrirSheet, confirmar, toast, vibrar, bipe, prepararAudio, confete, tornarOrdenavel, reordenarPorIds, vazioHTML,
  ICONE_CHECK, ICONE_ALCA, ICONE_LIXO, ICONE_MAIS, ICONE_MENOS, ICONE_SETA_BAIXO, ICONE_SETA_DIR,
} from './ui.js';
import { anel, linha } from './graficos.js';

export const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Glúteos', 'Panturrilha', 'Cardio', 'Outro'];

let editandoFichas = false;
let verTodasSessoes = false;
let overlay = null;
let timer = null;

/** Chave de identificação de um exercício (pelo nome, para juntar fichas diferentes). */
export const chaveEx = (nome) => String(nome || '').trim().toLowerCase();
/** Carga com vírgula: 42.5 -> "42,5" */
const kg = (v) => formatarNumero(v, 2);
/** Letra/ícone da ficha: "Treino A" -> "A" */
const letraFicha = (nome) => (String(nome).replace(/^treino\s*/i, '').trim().charAt(0) || 'T').toUpperCase();

// -------------------------------------------------------------
// Regras e consultas
// -------------------------------------------------------------

/** Próxima ficha do rodízio (a seguinte à última finalizada). */
export function proximaFicha() {
  const t = dados().treinos;
  if (!t.fichas.length) return null;
  const i = t.fichas.findIndex((f) => f.id === t.ultimaFichaId);
  return t.fichas[(i + 1) % t.fichas.length];
}

/** Sessões da semana atual (segunda a domingo). */
export function treinosNaSemana() {
  const dias = diasDaSemana(hojeKey());
  return dados().treinos.sessoes.filter((s) => s.dia >= dias[0] && s.dia <= dias[6]);
}

/** Maior carga já registrada num exercício (0 se nunca fez). */
export function recordeAnterior(chave) {
  let max = 0;
  for (const s of dados().treinos.sessoes) {
    for (const ex of s.exercicios) {
      if (chaveEx(ex.nome) !== chave) continue;
      for (const se of ex.series) if (se.carga > max) max = se.carga;
    }
  }
  return max;
}

/** Evolução de um exercício: um ponto por sessão (maior carga), com marcação de recorde. */
export function historicoExercicio(chave) {
  const sessoes = [...dados().treinos.sessoes].sort((a, b) => a.inicio - b.inicio);
  const pontos = [];
  let melhor = 0;
  for (const s of sessoes) {
    const ex = s.exercicios.find((e) => chaveEx(e.nome) === chave);
    if (!ex || !ex.series.length) continue;
    const max = Math.max(...ex.series.map((x) => x.carga));
    const volume = ex.series.reduce((t, x) => t + x.carga * x.reps, 0);
    const recorde = pontos.length > 0 && max > melhor;
    if (max > melhor) melhor = max;
    pontos.push({ dia: s.dia, valor: max, volume, series: ex.series, recorde, nome: ex.nome, sessaoId: s.id });
  }
  return pontos;
}

/** Lista de exercícios que já apareceram em treinos (para a evolução). */
function exerciciosComHistorico() {
  const mapa = new Map();
  for (const s of dados().treinos.sessoes) {
    for (const ex of s.exercicios) {
      if (!ex.series.length) continue;
      const k = chaveEx(ex.nome);
      const max = Math.max(...ex.series.map((x) => x.carga));
      const atual = mapa.get(k) || { chave: k, nome: ex.nome, grupo: ex.grupo, pr: 0, vezes: 0 };
      atual.pr = Math.max(atual.pr, max);
      atual.vezes++;
      mapa.set(k, atual);
    }
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// -------------------------------------------------------------
// Tela da aba
// -------------------------------------------------------------

export function montar(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.acao) {
      case 'comecar':
        iniciarTreino(id);
        break;
      case 'continuar':
        abrirTreinoAtivo();
        break;
      case 'trocar':
        escolherFicha();
        break;
      case 'meta':
        abrirMetaTreinos();
        break;
      case 'editar-fichas':
        editandoFichas = !editandoFichas;
        render(el);
        break;
      case 'nova-ficha':
        abrirFormFicha();
        break;
      case 'editar-ficha':
        abrirFormFicha(dados().treinos.fichas.find((f) => f.id === id));
        break;
      case 'evolucao':
        abrirEvolucao(b.dataset.chave);
        break;
      case 'sessao':
        abrirSessao(id);
        break;
      case 'ver-todas':
        verTodasSessoes = !verTodasSessoes;
        render(el);
        break;
    }
  });
}

export function render(el) {
  const d = dados();
  const t = d.treinos;
  const prox = proximaFicha();
  const andamento = t.emAndamento;
  const semana = treinosNaSemana();
  const meta = d.ajustes.metaTreinosSemana;
  const diasTreinados = new Set(semana.map((s) => s.dia));
  const sessoes = [...t.sessoes].sort((a, b) => b.inicio - a.inicio);
  const mostrar = verTodasSessoes ? sessoes : sessoes.slice(0, 5);
  const exercicios = exerciciosComHistorico();
  if (!t.fichas.length) editandoFichas = false;

  let destaque;
  if (andamento) {
    destaque = `<section class="card destaque-treino andamento">
      <small class="rotulo-neon">● TREINO EM ANDAMENTO</small>
      <h2 class="gradiente-texto">${esc(andamento.fichaNome)}</h2>
      <p>Começou às ${new Date(andamento.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${formatarDuracao((Date.now() - andamento.inicio) / 1000)}</p>
      <button class="btn primario largo" data-acao="continuar">Continuar treino</button>
    </section>`;
  } else if (prox) {
    destaque = `<section class="card destaque-treino">
      <small class="rotulo-neon">PRÓXIMO TREINO</small>
      <h2 class="gradiente-texto">${esc(prox.nome)}</h2>
      <ul class="lista-ex-resumo">
        ${prox.exercicios.map((e) => `<li><span>${esc(e.nome)}</span><small>${e.series}×${e.reps} · ${kg(e.carga)} kg</small></li>`).join('') || '<li><span>Sem exercícios ainda</span></li>'}
      </ul>
      <div class="botoes-linha">
        <button class="btn primario largo" data-acao="comecar" data-id="${prox.id}">Começar treino</button>
        ${t.fichas.length > 1 ? '<button class="btn secundario" data-acao="trocar">Trocar</button>' : ''}
      </div>
    </section>`;
  } else {
    destaque = vazioHTML('🏋️', 'Nenhuma ficha de treino', 'Monte sua primeira ficha e transforme cada treino em XP.', `<button class="btn primario" data-acao="nova-ficha">${ICONE_MAIS} Criar ficha</button>`);
  }

  const fichaHTML = (f) => {
    const ehProx = !andamento && prox && prox.id === f.id;
    const grupos = [...new Set(f.exercicios.map((e) => e.grupo))].join(', ');
    return `<div class="ficha card ${ehProx ? 'proxima' : ''}" data-id="${f.id}">
      ${editandoFichas ? `<span class="alca" aria-label="Arrastar">${ICONE_ALCA}</span>` : ''}
      <span class="ficha-letra">${esc(letraFicha(f.nome))}</span>
      <button class="ficha-info" data-acao="editar-ficha" data-id="${f.id}">
        <strong>${esc(f.nome)}</strong>
        <small>${plural(f.exercicios.length, 'exercício', 'exercícios')}${grupos ? ` · ${esc(grupos)}` : ''}</small>
      </button>
      ${ehProx ? '<span class="tag tag-neon">Próximo</span>' : ''}
      ${!editandoFichas && !andamento ? `<button class="btn-icone play" data-acao="comecar" data-id="${f.id}" aria-label="Começar ${esc(f.nome)}">▶</button>` : ''}
    </div>`;
  };

  el.innerHTML = `
    <header class="cabecalho"><h1 class="titulo-tela">Treinos</h1></header>

    ${destaque}

    <section class="card meta-semana">
      ${anel(meta ? semana.length / meta : 0, { tam: 76, esp: 8, html: `<strong>${semana.length}</strong><small>/${meta}</small>` })}
      <div class="meta-info">
        <div class="resumo-titulo">${semana.length >= meta ? 'Meta da semana batida! 🎯' : `Faltam ${meta - semana.length} treino${meta - semana.length > 1 ? 's' : ''} na semana`}</div>
        <div class="semana-pontos">
          ${diasDaSemana(hojeKey()).map((dia) => `<span class="${diasTreinados.has(dia) ? 'on' : ''} ${dia === hojeKey() ? 'hoje' : ''}">${DIAS_LETRA[diaSemana(dia)]}</span>`).join('')}
        </div>
        <button class="btn-texto" data-acao="meta">Alterar meta</button>
      </div>
    </section>

    <div class="secao-cab">
      <h2 class="secao-titulo">Fichas</h2>
      ${t.fichas.length > 1 ? `<button class="btn-texto" data-acao="editar-fichas">${editandoFichas ? 'OK' : 'Reordenar'}</button>` : ''}
    </div>
    ${editandoFichas ? '<p class="dica">Arraste para mudar a ordem do rodízio.</p>' : ''}
    <div class="lista-fichas" id="lista-fichas">${t.fichas.map(fichaHTML).join('')}</div>
    <button class="btn secundario largo" data-acao="nova-ficha">${ICONE_MAIS} Nova ficha</button>

    <h2 class="secao-titulo">Evolução de carga</h2>
    ${exercicios.length ? `<div class="lista card">${exercicios.map((x) => `<button class="item-linha clicavel" data-acao="evolucao" data-chave="${esc(x.chave)}">
        <span class="item-info"><span class="item-nome">${esc(x.nome)}</span><span class="item-sub">${esc(x.grupo || '')} · ${plural(x.vezes, 'treino', 'treinos')}</span></span>
        <span class="tag tag-neon">PR ${kg(x.pr)} kg</span>${ICONE_SETA_DIR}
      </button>`).join('')}</div>` : vazioHTML('📈', 'Sem dados ainda', 'Finalize um treino para acompanhar sua evolução e seus recordes.')}

    <h2 class="secao-titulo">Histórico</h2>
    ${sessoes.length ? `<div class="lista card">${mostrar.map((s) => `<button class="item-linha clicavel" data-acao="sessao" data-id="${s.id}">
        <span class="ficha-letra pequena">${esc(letraFicha(s.fichaNome))}</span>
        <span class="item-info"><span class="item-nome">${esc(s.fichaNome)} ${s.recordes && s.recordes.length ? '🏆' : ''}</span>
        <span class="item-sub">${formatarData(s.dia)} · ${duracaoAmigavel(s.duracao)} · ${formatarNumero(s.volume)} kg</span></span>
        <span class="xp-badge">+${s.xp}</span>
      </button>`).join('')}</div>
      ${sessoes.length > 5 ? `<button class="btn-texto centro" data-acao="ver-todas">${verTodasSessoes ? 'Ver menos' : `Ver todas (${sessoes.length})`}</button>` : ''}` : vazioHTML('🗓️', 'Nenhum treino registrado', 'Seu primeiro treino vai aparecer aqui. Bora!')}
  `;

  const lf = el.querySelector('#lista-fichas');
  if (editandoFichas && lf) {
    tornarOrdenavel(lf, {
      itens: '.ficha',
      alca: '.alca',
      aoSoltar: (ids) => alterar(() => (dados().treinos.fichas = reordenarPorIds(dados().treinos.fichas, ids))),
    });
  }
}

// -------------------------------------------------------------
// Treinando agora
// -------------------------------------------------------------

/** Começa um treino (da ficha informada ou da próxima do rodízio). */
export function iniciarTreino(fichaId) {
  const d = dados();
  if (d.treinos.emAndamento) {
    abrirTreinoAtivo();
    return;
  }
  const f = d.treinos.fichas.find((x) => x.id === fichaId) || proximaFicha();
  if (!f) {
    toast('Crie uma ficha de treino primeiro.');
    return;
  }
  if (!f.exercicios.length) {
    toast('Esta ficha ainda não tem exercícios.');
    abrirFormFicha(f);
    return;
  }
  prepararAudio(); // libera o bipe no iPhone (precisa de um toque)
  vibrar(15);
  alterar(() => {
    d.treinos.emAndamento = {
      id: uid(),
      fichaId: f.id,
      fichaNome: f.nome,
      inicio: Date.now(),
      descanso: null,
      exercicios: f.exercicios.map((e) => ({
        exId: e.id,
        nome: e.nome,
        grupo: e.grupo,
        descanso: e.descanso,
        series: Array.from({ length: Math.max(1, e.series) }, () => ({ reps: e.reps, carga: e.carga, feita: false })),
      })),
    };
  });
  abrirTreinoAtivo();
}

/** Abre (ou reabre) a tela de treino em andamento. */
export function abrirTreinoAtivo() {
  if (!dados().treinos.emAndamento) return;
  prepararAudio();
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'treino-ativo';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Treinando agora');
    document.body.appendChild(overlay);
    ligarOverlay(overlay);
  }
  document.body.classList.add('treinando');
  renderOverlay();
  requestAnimationFrame(() => requestAnimationFrame(() => overlay && overlay.classList.add('aberto')));
  iniciarTimer();
}

function fecharOverlay() {
  pararTimer();
  document.body.classList.remove('treinando');
  if (!overlay) return;
  const o = overlay;
  overlay = null;
  o.classList.remove('aberto');
  setTimeout(() => o.remove(), 320);
}

function contarSeries(t) {
  let total = 0;
  let feitas = 0;
  let volume = 0;
  for (const ex of t.exercicios) {
    for (const s of ex.series) {
      total++;
      if (s.feita) {
        feitas++;
        volume += s.carga * s.reps;
      }
    }
  }
  return { total, feitas, volume };
}

function renderOverlay() {
  const t = dados().treinos.emAndamento;
  if (!t || !overlay) return;
  const antes = overlay.querySelector('.ta-lista');
  const rolagem = antes ? antes.scrollTop : 0;
  const { total, feitas, volume } = contarSeries(t);

  const exHTML = (ex, i) => {
    const pr = recordeAnterior(chaveEx(ex.nome));
    const completo = ex.series.every((s) => s.feita);
    return `<section class="ta-ex card ${completo ? 'completo' : ''}">
      <header class="ta-ex-topo">
        <div><h3>${esc(ex.nome)}</h3>
        <small>${esc(ex.grupo || '')} · descanso ${ex.descanso}s${pr ? ` · PR ${kg(pr)} kg` : ''}</small></div>
        ${completo ? `<span class="tag tag-neon">${ICONE_CHECK}</span>` : ''}
      </header>
      <div class="serie serie-cab"><span>Série</span><span>Carga (kg)</span><span>Reps</span><span></span></div>
      ${ex.series.map((s, j) => `<div class="serie ${s.feita ? 'feita' : ''}">
        <span class="serie-n">${j + 1}</span>
        <input class="entrada mini" inputmode="decimal" data-ex="${i}" data-s="${j}" data-campo="carga" value="${kg(s.carga)}" aria-label="Carga da série ${j + 1}">
        <input class="entrada mini" inputmode="numeric" data-ex="${i}" data-s="${j}" data-campo="reps" value="${s.reps}" aria-label="Repetições da série ${j + 1}">
        <button class="serie-check ${s.feita ? 'on' : ''}" data-acao="serie" data-ex="${i}" data-s="${j}" aria-label="${s.feita ? 'Desmarcar' : 'Marcar'} série ${j + 1}">${ICONE_CHECK}</button>
      </div>`).join('')}
      <div class="ta-ex-acoes">
        <button class="btn-texto" data-acao="add-serie" data-ex="${i}">${ICONE_MAIS} Série</button>
        ${ex.series.length > 1 ? `<button class="btn-texto" data-acao="rem-serie" data-ex="${i}">${ICONE_MENOS} Série</button>` : ''}
      </div>
    </section>`;
  };

  overlay.innerHTML = `
    <header class="ta-topo">
      <button class="btn-icone" data-acao="minimizar" aria-label="Minimizar">${ICONE_SETA_BAIXO}</button>
      <div class="ta-titulo"><small>Treinando agora</small><strong>${esc(t.fichaNome)}</strong></div>
      <button class="btn-texto perigo-texto" data-acao="cancelar">Cancelar</button>
    </header>
    <div class="ta-placar">
      <div><small>Tempo</small><strong id="ta-tempo">${formatarDuracao((Date.now() - t.inicio) / 1000)}</strong></div>
      <div><small>Séries</small><strong>${feitas}/${total}</strong></div>
      <div><small>Volume</small><strong>${formatarNumero(volume)}<small> kg</small></strong></div>
    </div>
    <div class="barra fina"><div class="barra-fill" style="width:${total ? (feitas / total) * 100 : 0}%"></div></div>
    <div class="ta-lista">${t.exercicios.map(exHTML).join('')}
      <div class="ta-rodape"><button class="btn primario largo" data-acao="finalizar">Finalizar treino</button></div>
    </div>
    <div class="descanso ${t.descanso ? 'ativo' : ''}" id="descanso">${descansoHTML(t)}</div>
  `;
  const lista = overlay.querySelector('.ta-lista');
  if (lista) lista.scrollTop = rolagem;
}

function descansoHTML(t) {
  if (!t.descanso) return '';
  const resta = Math.max(0, (t.descanso.fim - Date.now()) / 1000);
  return `<div class="descanso-card">
    ${anel(t.descanso.total ? resta / t.descanso.total : 0, { tam: 60, esp: 6, html: '' , classe: 'descanso-anel' })}
    <div class="descanso-info"><small>Descanso · ${esc(t.descanso.nome)}</small><strong id="descanso-tempo">${formatarDuracao(Math.ceil(resta))}</strong></div>
    <button class="btn-pilula" data-acao="desc-mais">+15s</button>
    <button class="btn-pilula" data-acao="desc-pular">Pular</button>
  </div>`;
}

function ligarOverlay(o) {
  o.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const d = dados();
    const t = d.treinos.emAndamento;
    if (!t) return;
    const i = Number(b.dataset.ex);
    const j = Number(b.dataset.s);
    switch (b.dataset.acao) {
      case 'minimizar':
        fecharOverlay();
        document.dispatchEvent(new CustomEvent('dib-redesenhar'));
        break;
      case 'cancelar':
        if (await confirmar('Descartar este treino? Nada será salvo e nenhum XP será ganho.', { titulo: 'Cancelar treino', ok: 'Descartar', cancelar: 'Voltar', perigo: true })) {
          alterar(() => (d.treinos.emAndamento = null));
          fecharOverlay();
        }
        break;
      case 'serie': {
        const ex = t.exercicios[i];
        const s = ex.series[j];
        lerInputs(); // garante que os valores digitados foram salvos
        s.feita = !s.feita;
        vibrar(s.feita ? 15 : 8);
        if (s.feita && ex.descanso > 0) {
          t.descanso = { fim: Date.now() + ex.descanso * 1000, total: ex.descanso, nome: ex.nome };
        }
        salvar({ silencioso: true });
        renderOverlay();
        break;
      }
      case 'add-serie': {
        const ex = t.exercicios[i];
        const ult = ex.series[ex.series.length - 1];
        ex.series.push({ reps: ult.reps, carga: ult.carga, feita: false });
        salvar({ silencioso: true });
        renderOverlay();
        break;
      }
      case 'rem-serie': {
        const ex = t.exercicios[i];
        if (ex.series.length > 1) ex.series.pop();
        salvar({ silencioso: true });
        renderOverlay();
        break;
      }
      case 'desc-mais':
        if (t.descanso) {
          t.descanso.fim += 15000;
          t.descanso.total += 15;
          salvar({ silencioso: true });
          atualizarDescanso();
        }
        break;
      case 'desc-pular':
        t.descanso = null;
        salvar({ silencioso: true });
        atualizarDescanso();
        break;
      case 'finalizar':
        lerInputs();
        finalizarTreino();
        break;
    }
  });

  // Ajuste de carga/reps na hora. Mudar a carga de uma série atualiza as
  // próximas séries ainda não feitas que tinham o mesmo valor.
  o.addEventListener('change', (e) => {
    const inp = e.target.closest('input[data-campo]');
    if (!inp) return;
    aplicarInput(inp, true);
    salvar({ silencioso: true });
    // Atualiza só os campos (sem redesenhar), para o teclado não fechar
    const t = dados().treinos.emAndamento;
    if (!t) return;
    o.querySelectorAll(`input[data-ex="${inp.dataset.ex}"][data-campo="${inp.dataset.campo}"]`).forEach((x) => {
      if (x === document.activeElement) return;
      const s = t.exercicios[Number(x.dataset.ex)].series[Number(x.dataset.s)];
      x.value = x.dataset.campo === 'carga' ? kg(s.carga) : s.reps;
    });
  });
  // Seleciona o conteúdo ao tocar, para digitar por cima
  o.addEventListener('focusin', (e) => {
    const inp = e.target.closest('input[data-campo]');
    if (inp) setTimeout(() => inp.select(), 0);
  });
}

function aplicarInput(inp, propagar) {
  const t = dados().treinos.emAndamento;
  if (!t) return;
  const ex = t.exercicios[Number(inp.dataset.ex)];
  if (!ex) return;
  const j = Number(inp.dataset.s);
  const s = ex.series[j];
  const campo = inp.dataset.campo;
  const antigo = s[campo];
  let novo = lerNumero(inp.value, antigo);
  novo = campo === 'reps' ? Math.max(0, Math.round(novo)) : Math.max(0, Math.round(novo * 100) / 100);
  if (novo === antigo) return;
  s[campo] = novo;
  if (propagar) {
    for (let k = j + 1; k < ex.series.length; k++) {
      if (!ex.series[k].feita && ex.series[k][campo] === antigo) ex.series[k][campo] = novo;
    }
  }
}

/** Lê todos os inputs visíveis (caso o "change" ainda não tenha disparado). */
function lerInputs() {
  if (!overlay) return;
  overlay.querySelectorAll('input[data-campo]').forEach((inp) => aplicarInput(inp, false));
}

function iniciarTimer() {
  pararTimer();
  timer = setInterval(tique, 500);
}
function pararTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

/** A cada meio segundo: atualiza o cronômetro e o descanso. */
function tique() {
  const t = dados().treinos.emAndamento;
  if (!t || !overlay) return pararTimer();
  const el = overlay.querySelector('#ta-tempo');
  if (el) el.textContent = formatarDuracao((Date.now() - t.inicio) / 1000);
  if (t.descanso) {
    const resta = (t.descanso.fim - Date.now()) / 1000;
    if (resta <= 0) {
      t.descanso = null;
      salvar({ silencioso: true });
      vibrar([200, 100, 200]);
      bipe(2);
      toast('Descanso finalizado! Próxima série 💪');
      atualizarDescanso();
    } else {
      const txt = overlay.querySelector('#descanso-tempo');
      if (txt) txt.textContent = formatarDuracao(Math.ceil(resta));
      const c = overlay.querySelector('.descanso-anel .anel-valor');
      if (c) {
        const total = Number(c.getAttribute('stroke-dasharray'));
        c.setAttribute('stroke-dashoffset', (total * (1 - resta / t.descanso.total)).toFixed(2));
      }
    }
  }
}

function atualizarDescanso() {
  if (!overlay) return;
  const t = dados().treinos.emAndamento;
  const box = overlay.querySelector('#descanso');
  if (!box || !t) return;
  box.innerHTML = descansoHTML(t);
  box.classList.toggle('ativo', !!t.descanso);
}

/** Finaliza: salva a sessão, dá XP, verifica recordes e mostra o resumo. */
async function finalizarTreino() {
  const d = dados();
  const t = d.treinos.emAndamento;
  if (!t) return;
  const { total, feitas } = contarSeries(t);
  if (!feitas) {
    if (await confirmar('Nenhuma série foi marcada como feita. Deseja descartar o treino?', { titulo: 'Treino vazio', ok: 'Descartar', cancelar: 'Voltar', perigo: true })) {
      alterar(() => (d.treinos.emAndamento = null));
      fecharOverlay();
    }
    return;
  }
  if (feitas < total) {
    const ok = await confirmar(`Ainda faltam ${total - feitas} séries. Finalizar mesmo assim?`, { titulo: 'Finalizar treino', ok: 'Finalizar', cancelar: 'Continuar' });
    if (!ok) return;
  }

  let resumo = null;
  alterar(() => {
    const fim = Date.now();
    const duracao = Math.round((fim - t.inicio) / 1000);
    const exercicios = t.exercicios
      .map((ex) => ({ nome: ex.nome, grupo: ex.grupo, series: ex.series.filter((s) => s.feita).map((s) => ({ reps: s.reps, carga: s.carga })) }))
      .filter((ex) => ex.series.length);
    const volume = exercicios.reduce((v, ex) => v + ex.series.reduce((a, s) => a + s.reps * s.carga, 0), 0);

    // Recorde = carga maior que a maior já registrada (não conta a primeira vez)
    const recordes = [];
    for (const ex of exercicios) {
      const max = Math.max(...ex.series.map((s) => s.carga));
      const ant = recordeAnterior(chaveEx(ex.nome));
      if (ant > 0 && max > ant) recordes.push({ nome: ex.nome, carga: max, anterior: ant });
    }

    const sessaoId = uid();
    const lancs = [];
    const l1 = ganharXP({ base: d.ajustes.xp.treino, fonte: 'treino', ref: sessaoId, rotulo: t.fichaNome });
    lancs.push(l1.id);
    let xp = l1.xp;
    if (recordes.length) {
      const l2 = ganharXP({ base: d.ajustes.xp.treinoRecorde, fonte: 'recorde', ref: sessaoId, rotulo: `Recorde: ${recordes.map((r) => r.nome).join(', ')}` });
      lancs.push(l2.id);
      xp += l2.xp;
    }

    const sessao = {
      id: sessaoId,
      fichaId: t.fichaId,
      fichaNome: t.fichaNome,
      dia: chaveData(new Date(t.inicio)),
      inicio: t.inicio,
      fim,
      duracao,
      volume: Math.round(volume * 100) / 100,
      xp,
      lancs,
      recordes: recordes.map((r) => r.nome),
      exercicios,
    };
    d.treinos.sessoes.push(sessao);

    // A próxima vez já vem com a carga e as reps usadas agora
    const ficha = d.treinos.fichas.find((f) => f.id === t.fichaId);
    if (ficha) {
      for (const ex of t.exercicios) {
        const fe = ficha.exercicios.find((e) => e.id === ex.exId);
        const ult = [...ex.series].reverse().find((s) => s.feita);
        if (fe && ult) {
          fe.carga = ult.carga;
          fe.reps = ult.reps;
        }
      }
    }
    d.treinos.ultimaFichaId = t.fichaId;
    d.treinos.emAndamento = null;
    resumo = { sessao, recordes, series: feitas };
  });
  fecharOverlay();
  mostrarResumo(resumo);
}

function mostrarResumo({ sessao, recordes, series }) {
  if (recordes.length) confete();
  else confete({ quantidade: 60, duracao: 1600 });
  abrirSheet({
    titulo: 'Treino concluído! 💪',
    html: `<div class="resumo-treino">
      <h3 class="gradiente-texto">${esc(sessao.fichaNome)}</h3>
      <div class="grade-stats">
        <div class="stat card"><small>Duração</small><strong>${formatarDuracao(sessao.duracao)}</strong></div>
        <div class="stat card"><small>Volume total</small><strong>${formatarNumero(sessao.volume)}<small> kg</small></strong></div>
        <div class="stat card"><small>Séries</small><strong>${series}</strong></div>
        <div class="stat card neon-borda"><small>XP ganho</small><strong class="gradiente-texto">+${sessao.xp}</strong></div>
      </div>
      ${recordes.length ? `<div class="recordes card">
        <h4>🏆 Novo${recordes.length > 1 ? 's' : ''} recorde${recordes.length > 1 ? 's' : ''} pessoal${recordes.length > 1 ? 'is' : ''}!</h4>
        ${recordes.map((r) => `<p><b>${esc(r.nome)}</b>: ${kg(r.carga)} kg <small>(antes ${kg(r.anterior)} kg)</small></p>`).join('')}
      </div>` : ''}
      <p class="dica centro">Na próxima vez, as cargas já vêm com o que você usou hoje.</p>
      <button class="btn primario largo" data-fechar-resumo>Fechar</button>
    </div>`,
    aoMontar(corpo, fechar) {
      corpo.querySelector('[data-fechar-resumo]').addEventListener('click', fechar);
    },
  });
}

// -------------------------------------------------------------
// Folhas auxiliares
// -------------------------------------------------------------

function escolherFicha() {
  const d = dados();
  const prox = proximaFicha();
  abrirSheet({
    titulo: 'Escolher ficha',
    html: `<div class="lista card">${d.treinos.fichas.map((f) => `<button class="item-linha clicavel" data-escolher="${f.id}">
        <span class="ficha-letra pequena">${esc(letraFicha(f.nome))}</span>
        <span class="item-info"><span class="item-nome">${esc(f.nome)}</span><span class="item-sub">${plural(f.exercicios.length, 'exercício', 'exercícios')}</span></span>
        ${prox && prox.id === f.id ? '<span class="tag tag-neon">Próximo</span>' : ''}
      </button>`).join('')}</div>
      <p class="dica">O rodízio continua a partir da ficha que você finalizar.</p>`,
    aoMontar(corpo, fechar) {
      corpo.addEventListener('click', (e) => {
        const b = e.target.closest('[data-escolher]');
        if (!b) return;
        fechar();
        iniciarTreino(b.dataset.escolher);
      });
    },
  });
}

export function abrirMetaTreinos() {
  const d = dados();
  let meta = d.ajustes.metaTreinosSemana;
  abrirSheet({
    titulo: 'Meta semanal de treinos',
    html: `<div class="stepper grande">
        <button class="btn-icone" data-passo="-1" aria-label="Menos">${ICONE_MENOS}</button>
        <strong class="numero-grande" id="meta-valor">${meta}</strong>
        <button class="btn-icone" data-passo="1" aria-label="Mais">${ICONE_MAIS}</button>
      </div>
      <p class="dica centro">treinos por semana (segunda a domingo)</p>
      <button class="btn primario largo" data-salvar>Salvar</button>`,
    aoMontar(corpo, fechar) {
      corpo.addEventListener('click', (e) => {
        const p = e.target.closest('[data-passo]');
        if (p) {
          meta = Math.min(14, Math.max(1, meta + Number(p.dataset.passo)));
          corpo.querySelector('#meta-valor').textContent = meta;
          vibrar(6);
        }
        if (e.target.closest('[data-salvar]')) {
          alterar(() => (d.ajustes.metaTreinosSemana = meta));
          fechar();
          toast(`Meta: ${meta} treinos por semana 🎯`);
        }
      });
    },
  });
}

function abrirEvolucao(chave) {
  const pontos = historicoExercicio(chave);
  if (!pontos.length) return;
  const nome = pontos[pontos.length - 1].nome;
  const pr = pontos.reduce((m, p) => (p.valor > m.valor ? p : m), pontos[0]);
  const primeiro = pontos[0].valor;
  const ganho = pr.valor - primeiro;
  abrirSheet({
    titulo: nome,
    html: `<div class="grade-stats tres">
        <div class="stat card neon-borda"><small>Recorde</small><strong class="gradiente-texto">${kg(pr.valor)}<small> kg</small></strong><small>${formatarData(pr.dia)}</small></div>
        <div class="stat card"><small>Evolução</small><strong>${ganho >= 0 ? '+' : ''}${kg(ganho)}<small> kg</small></strong><small>desde o início</small></div>
        <div class="stat card"><small>Treinos</small><strong>${pontos.length}</strong><small>registrados</small></div>
      </div>
      <div class="card grafico-card">
        <h4>Carga máxima por treino</h4>
        ${linha(pontos.slice(-30).map((p) => ({ rotulo: formatarDataCurta(p.dia), valor: p.valor, recorde: p.recorde })))}
        <p class="legenda-pr"><i></i> PR = novo recorde pessoal</p>
      </div>
      <h4 class="secao-titulo">Últimos treinos</h4>
      <div class="lista card">${[...pontos].reverse().slice(0, 10).map((p) => `<div class="item-linha">
        <span class="item-info"><span class="item-nome">${formatarData(p.dia)} ${p.recorde ? '🏆' : ''}</span>
        <span class="item-sub">${p.series.map((s) => `${kg(s.carga)}×${s.reps}`).join(' · ')}</span></span>
        <strong class="valor">${kg(p.valor)} kg</strong></div>`).join('')}</div>`,
  });
}

function abrirSessao(id) {
  const d = dados();
  const s = d.treinos.sessoes.find((x) => x.id === id);
  if (!s) return;
  abrirSheet({
    titulo: s.fichaNome,
    html: `<p class="dica">${formatarData(s.dia)} · ${new Date(s.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      <div class="grade-stats">
        <div class="stat card"><small>Duração</small><strong>${formatarDuracao(s.duracao)}</strong></div>
        <div class="stat card"><small>Volume</small><strong>${formatarNumero(s.volume)}<small> kg</small></strong></div>
        <div class="stat card"><small>XP</small><strong class="gradiente-texto">+${s.xp}</strong></div>
        <div class="stat card"><small>Recordes</small><strong>${s.recordes ? s.recordes.length : 0}</strong></div>
      </div>
      <div class="lista card">${s.exercicios.map((ex) => `<div class="item-linha">
        <span class="item-info"><span class="item-nome">${esc(ex.nome)} ${s.recordes && s.recordes.includes(ex.nome) ? '🏆' : ''}</span>
        <span class="item-sub">${ex.series.map((x) => `${kg(x.carga)} kg × ${x.reps}`).join(' · ')}</span></span></div>`).join('')}</div>
      <button class="btn perigo-texto largo" data-excluir-sessao>Excluir este treino do histórico</button>`,
    aoMontar(corpo, fechar) {
      corpo.querySelector('[data-excluir-sessao]').addEventListener('click', async () => {
        if (!(await confirmar('Excluir este treino? O XP ganho com ele também será removido.', { titulo: 'Excluir treino', ok: 'Excluir', perigo: true }))) return;
        alterar(() => {
          (s.lancs || []).forEach((l) => removerXP(l));
          d.treinos.sessoes = d.treinos.sessoes.filter((x) => x.id !== id);
        });
        fechar();
        toast('Treino excluído (XP removido)');
      });
    },
  });
}

// -------------------------------------------------------------
// Editor de fichas e exercícios
// -------------------------------------------------------------

export function abrirFormFicha(ficha = null) {
  const d = dados();
  const nova = !ficha;
  const letra = String.fromCharCode(65 + (d.treinos.fichas.length % 26));
  const rascunho = JSON.parse(JSON.stringify(ficha || { id: uid(), nome: `Treino ${letra}`, exercicios: [] }));

  const listaHTML = () =>
    rascunho.exercicios.length
      ? `<div class="lista card" id="ex-lista">${rascunho.exercicios.map((e) => `<div class="item-linha" data-id="${e.id}">
          <span class="alca" aria-label="Arrastar">${ICONE_ALCA}</span>
          <button type="button" class="item-info" data-ex-editar="${e.id}">
            <span class="item-nome">${esc(e.nome)}</span>
            <span class="item-sub">${esc(e.grupo)} · ${e.series}×${e.reps} · ${kg(e.carga)} kg · ${e.descanso}s</span>
          </button>
          <button type="button" class="btn-icone perigo-texto" data-ex-excluir="${e.id}" aria-label="Remover">${ICONE_LIXO}</button>
        </div>`).join('')}</div>`
      : vazioHTML('🏋️', 'Sem exercícios', 'Adicione os exercícios desta ficha.');

  abrirSheet({
    titulo: nova ? 'Nova ficha' : 'Editar ficha',
    html: `<form class="form" autocomplete="off">
        <label class="campo"><span>Nome da ficha</span>
          <input class="entrada" name="nome" maxlength="40" value="${esc(rascunho.nome)}" placeholder="Ex.: Treino A — Peito">
        </label>
        <div class="secao-cab"><h3 class="secao-titulo">Exercícios</h3></div>
        <div class="ex-box">${listaHTML()}</div>
        <button type="button" class="btn secundario largo" data-ex-novo>${ICONE_MAIS} Adicionar exercício</button>
        <div class="form-botoes">
          ${!nova ? '<button type="button" class="btn perigo-texto" data-excluir-ficha>Excluir ficha</button>' : ''}
          <button class="btn primario largo" type="submit">Salvar ficha</button>
        </div>
      </form>`,
    aoMontar(corpo, fechar) {
      const form = corpo.querySelector('form');
      const box = corpo.querySelector('.ex-box');
      const redesenhar = () => {
        box.innerHTML = listaHTML();
        const l = box.querySelector('#ex-lista');
        if (l) tornarOrdenavel(l, { itens: '.item-linha', alca: '.alca', aoSoltar: (ids) => (rascunho.exercicios = reordenarPorIds(rascunho.exercicios, ids)) });
      };
      redesenhar();

      corpo.addEventListener('click', async (e) => {
        if (e.target.closest('[data-ex-novo]')) {
          abrirFormExercicio(null, (ex) => {
            rascunho.exercicios.push(ex);
            redesenhar();
          });
        }
        const be = e.target.closest('[data-ex-editar]');
        if (be) {
          const ex = rascunho.exercicios.find((x) => x.id === be.dataset.exEditar);
          abrirFormExercicio(ex, (novo) => {
            Object.assign(ex, novo);
            redesenhar();
          });
        }
        const bx = e.target.closest('[data-ex-excluir]');
        if (bx) {
          rascunho.exercicios = rascunho.exercicios.filter((x) => x.id !== bx.dataset.exExcluir);
          redesenhar();
        }
        if (e.target.closest('[data-excluir-ficha]')) {
          if (!(await confirmar(`Excluir "${ficha.nome}"? O histórico de treinos continua salvo.`, { titulo: 'Excluir ficha', ok: 'Excluir', perigo: true }))) return;
          alterar(() => {
            d.treinos.fichas = d.treinos.fichas.filter((f) => f.id !== ficha.id);
            if (d.treinos.emAndamento && d.treinos.emAndamento.fichaId === ficha.id) d.treinos.emAndamento = null;
          });
          fechar();
          toast('Ficha excluída');
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = form.elements.nome.value.trim();
        if (!nome) {
          form.elements.nome.focus();
          return;
        }
        rascunho.nome = nome;
        alterar(() => {
          if (nova) d.treinos.fichas.push(rascunho);
          else Object.assign(ficha, rascunho, { exemplo: false });
        });
        fechar();
        toast(nova ? 'Ficha criada 🏋️' : 'Ficha salva');
      });
    },
  });
}

function abrirFormExercicio(ex, aoSalvar) {
  const novo = !ex;
  const v = ex || { nome: '', grupo: 'Peito', series: 3, reps: 12, carga: 10, descanso: 60 };
  let grupo = v.grupo;
  abrirSheet({
    titulo: novo ? 'Novo exercício' : 'Editar exercício',
    html: `<form class="form" autocomplete="off">
        <label class="campo"><span>Nome</span>
          <input class="entrada" name="nome" maxlength="50" value="${esc(v.nome)}" placeholder="Ex.: Supino reto">
        </label>
        <div class="campo"><span>Grupo muscular</span>
          <div class="chips-linha">${GRUPOS.map((g) => `<button type="button" class="chip ${g === grupo ? 'on' : ''}" data-grupo="${g}">${g}</button>`).join('')}</div>
        </div>
        <div class="grade-campos">
          <label class="campo"><span>Séries</span><input class="entrada" name="series" inputmode="numeric" value="${v.series}"></label>
          <label class="campo"><span>Repetições</span><input class="entrada" name="reps" inputmode="numeric" value="${v.reps}"></label>
          <label class="campo"><span>Carga (kg)</span><input class="entrada" name="carga" inputmode="decimal" value="${kg(v.carga)}"></label>
          <label class="campo"><span>Descanso (s)</span><input class="entrada" name="descanso" inputmode="numeric" value="${v.descanso}"></label>
        </div>
        <div class="chips-linha">${[30, 45, 60, 90, 120, 180].map((s) => `<button type="button" class="chip" data-desc="${s}">${s}s</button>`).join('')}</div>
        <button class="btn primario largo" type="submit">${novo ? 'Adicionar' : 'Salvar'}</button>
      </form>`,
    aoMontar(corpo, fechar) {
      const form = corpo.querySelector('form');
      if (novo) setTimeout(() => form.elements.nome.focus(), 320);
      corpo.addEventListener('click', (e) => {
        const g = e.target.closest('[data-grupo]');
        if (g) {
          grupo = g.dataset.grupo;
          corpo.querySelectorAll('[data-grupo]').forEach((b) => b.classList.toggle('on', b === g));
        }
        const ds = e.target.closest('[data-desc]');
        if (ds) form.elements.descanso.value = ds.dataset.desc;
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = form.elements.nome.value.trim();
        if (!nome) {
          form.elements.nome.focus();
          return;
        }
        aoSalvar({
          id: ex ? ex.id : uid(),
          nome,
          grupo,
          series: Math.max(1, Math.round(lerNumero(form.elements.series.value, 3))),
          reps: Math.max(1, Math.round(lerNumero(form.elements.reps.value, 10))),
          carga: Math.max(0, Math.round(lerNumero(form.elements.carga.value, 0) * 100) / 100),
          descanso: Math.max(0, Math.round(lerNumero(form.elements.descanso.value, 60))),
        });
        fechar();
      });
    },
  });
}

/** Se o app abriu com um treino em andamento, oferece continuar. */
export function verificarTreinoPendente() {
  const t = dados().treinos.emAndamento;
  if (!t) return;
  toast(`Treino em andamento: ${t.fichaNome}`, { acao: { rotulo: 'Continuar', fn: abrirTreinoAtivo }, duracao: 8000 });
}
