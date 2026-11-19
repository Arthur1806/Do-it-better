// =============================================================
// perfil.js — aba PERFIL (o seu progresso e os ajustes):
//   Jornada   -> nível, liga da semana, estatísticas e gráfico de XP
//   Medalhas  -> séries Bronze/Prata/Ouro/Diamante + especiais
//   Ajustes   -> metas, valores de XP, sons, backup, dados
// Pet, personagem, loja e coleção ficam na aba Pet (petaba.js).
// =============================================================

import { dados, alterar, exportar, importar, apagarTudo, SCHEMA_VERSION, tamanhoKB } from './store.js';
import { hojeKey, esc, formatarData, formatarDataCurta, formatarDataHora, formatarNumero, formatarHora, lerNumero, DIAS_LETRA, diaSemana, plural } from './utils.js';
import { nivelInfo, xpUltimosDias, melhorDia, TITULOS, xpParaChegar, pocaoAtiva, NIVEL_MAX, PRESTIGIO_MAX, podePrestigio, fazerPrestigio, bonusPrestigio, LIMITES_XP } from './xp.js';
import { sequenciaRotina, multiplicador } from './historico.js';
import { SERIES, ESPECIAIS, TIERS, progressoSerie, todasMedalhas } from './conquistas.js';
import { PERSONAGENS, ESTAGIOS, avatarHTML, companheiro, estagioDoNivel, novosNaColecao, personagem } from './personagens.js';
import { ligaAtual, ligaSemanaPassada, LIGAS } from './missoes.js';
import { avatarSVG, fisicoAtual } from './visual.js';
import { irPara } from './nav.js';
import * as Nuvem from './nuvem.js';
import { abrirOnboarding } from './onboarding.js';
import { limparExemplos } from './seed.js';
import { anel, barras } from './graficos.js';
import { abrirSheet, confirmar, pedirTexto, toast, vibrar, confete, ICONE_MAIS, ICONE_MENOS, ICONE_SETA_DIR } from './ui.js';
import { tocar } from './sons.js';

let periodo = 7; // 7 ou 30 dias no gráfico
let versaoApp = '—';
let secao = 'jornada';


const SECOES = [
  ['jornada', 'Jornada'],
  ['medalhas', 'Medalhas'],
  ['ajustes', 'Ajustes'],
];

/** Aplica o tema (escuro/claro) no documento. */
export function aplicarTema(tema = dados().ajustes.tema) {
  document.documentElement.dataset.theme = tema === 'claro' ? 'claro' : 'escuro';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'claro' ? '#F4F5FB' : '#070A14');
  try {
    localStorage.setItem('doitbetter:tema', tema);
  } catch (_) {}
}

/** Recebe a versão do app (vinda do service worker). */
export function definirVersao(v) {
  versaoApp = v;
  const el = document.getElementById('versao-app');
  if (el) el.textContent = v;
}

export function montar(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const d = dados();
    switch (b.dataset.acao) {
      case 'secao':
        secao = b.dataset.secao;
        vibrar(6);
        render(el);
        el.scrollTo({ top: 0 });
        break;
      case 'periodo':
        periodo = Number(b.dataset.dias);
        render(el);
        break;
      case 'ir-loja':
        irPara('pet', { secao: 'loja' });
        break;
      case 'serie':
        mostrarSerie(b.dataset.id);
        break;
      case 'especial':
        mostrarEspecial(b.dataset.id);
        break;
      case 'refazer':
        abrirOnboarding({ refazer: true });
        break;
      case 'sons':
        alterar(() => (d.ajustes.sons = b.dataset.valor === '1'));
        if (d.ajustes.sons) tocar('check');
        break;
      case 'tema':
        alterar(() => (d.ajustes.tema = b.dataset.tema));
        aplicarTema();
        break;
      case 'passo': {
        const campo = b.dataset.campo;
        const [min, max] = campo === 'metaAgua' ? [1, 30] : [1, 14];
        const v = Math.min(max, Math.max(min, d.ajustes[campo] + Number(b.dataset.passo)));
        vibrar(6);
        alterar(() => (d.ajustes[campo] = v));
        break;
      }
      case 'valores-xp':
        abrirValoresXP();
        break;
      case 'niveis':
        mostrarNiveis();
        break;
      case 'prestigio':
        confirmar(`Sua contagem de níveis volta para o 1 e você ganha uma estrela ⭐ (+5% de XP para sempre). Seu XP total, moedas, medalhas e tudo o que já liberou continuam seus. O físico do personagem recomeça a evoluir.`, { titulo: 'Fazer prestígio?', ok: 'Fazer prestígio' }).then((ok) => {
          if (!ok) return;
          alterar(() => fazerPrestigio());
          confete();
          tocar('fanfarra');
          toast('⭐ Prestígio! Uma nova jornada começa.');
        });
        break;
      case 'ir-conta':
        irPara('social', { secao: 'conta' });
        break;
      case 'exportar':
        exportarBackup();
        break;
      case 'importar':
        el.querySelector('#input-importar').click();
        break;
      case 'limpar-exemplos':
        limparDadosExemplo();
        break;
      case 'apagar-tudo':
        apagarTodosOsDados();
        break;
      case 'atualizar':
        procurarAtualizacao();
        break;
    }
  });
  el.addEventListener('change', (e) => {
    const d = dados();
    if (e.target.id === 'input-importar') {
      const arq = e.target.files && e.target.files[0];
      e.target.value = '';
      if (arq) importarBackup(arq);
    }
    if (e.target.name === 'nome') {
      alterar(() => (d.ajustes.nome = e.target.value.trim().slice(0, 30)), { silencioso: true });
      toast('Nome salvo 👋');
    }
    if (e.target.name === 'limiteGastos') {
      alterar(() => (d.ajustes.limiteGastos = Math.max(0, lerNumero(e.target.value.replace(/[R$\s]/g, ''), 0))));
    }
  });
}

export function render(el, params = {}) {
  if (params.secao) secao = params.secao;
  const d = dados();
  const info = nivelInfo(d.xp.total);
  const p = companheiro();
  const est = estagioDoNivel(info.nivel);
  if (!SECOES.some(([id]) => id === secao)) secao = 'jornada';
  const f = fisicoAtual();
  const total = todasMedalhas().length;
  const ganhas = Object.keys(d.conquistas).filter((k) => todasMedalhas().some((m) => m.id === k)).length;

  el.innerHTML = `
    <header class="cabecalho perfil-cab">
      <div class="perfil-id">
        <span class="perfil-avatar">${avatarSVG(d.avatar)}</span>
        <div><h1 class="titulo-tela">${esc(d.ajustes.nome || 'Perfil')}</h1>
        <small>Nível ${info.nivel} · ${info.titulo} · ${f.nome}</small></div>
      </div>
      <button class="pilula-moedas" data-acao="ir-loja">🪙 <b>${d.carteira.moedas}</b></button>
    </header>

    <nav class="subnav" role="tablist" aria-label="Seções do perfil">
      ${SECOES.map(([id, nome]) => `<button role="tab" aria-selected="${secao === id}" class="${secao === id ? 'on' : ''}" data-acao="secao" data-secao="${id}">${nome}${id === 'medalhas' ? `<small>${ganhas}/${total}</small>` : ''}</button>`).join('')}
    </nav>

    <div class="secao-conteudo" data-secao="${secao}">${SECAO[secao](d, info)}</div>
  `;
}

// -------------------------------------------------------------
// Conteúdo de cada seção
// -------------------------------------------------------------

const SECAO = {
  jornada(d, info) {
    const seq = sequenciaRotina();
    const mult = multiplicador();
    const melhor = melhorDia();
    const serie = xpUltimosDias(periodo);
    const totalPeriodo = serie.reduce((s, x) => s + x.xp, 0);
    const hoje = hojeKey();
    const l = ligaAtual();
    const lp = ligaSemanaPassada();
    const itensGraf = serie.map((x) => ({
      rotulo: periodo === 7 ? DIAS_LETRA[diaSemana(x.dia)] : formatarDataCurta(x.dia).slice(0, 2),
      valor: x.xp,
      destaque: x.dia === hoje,
    }));
    return `
    <section class="card heroi-nivel">
      ${anel(info.progresso, { tam: 132, esp: 11, classe: 'anel-heroi', html: `<small>NÍVEL</small><strong>${info.nivel}</strong>` })}
      <div class="heroi-info">
        <h2 class="gradiente-texto">${info.titulo}</h2>
        <p><b>${formatarNumero(info.total)}</b> XP no total</p>
        <div class="barra-xp"><div class="barra-xp-fill" style="width:${Math.round(info.progresso * 100)}%"></div></div>
        <small>${info.maximo ? `Nível máximo! ${podePrestigio() ? 'Você pode fazer o prestígio.' : ''}` : `Faltam ${formatarNumero(info.falta)} XP para o nível ${info.nivel + 1}`}</small>
        ${info.prestigio ? `<p class="estrelas-prestigio" aria-label="${info.prestigio} estrela(s) de prestígio">${'⭐'.repeat(info.prestigio)} <small>+${bonusPrestigio()}% XP</small></p>` : ''}
        ${podePrestigio() ? `<button class="btn primario" data-acao="prestigio">⭐ Fazer prestígio</button>` : ''}
        <button class="btn-texto" data-acao="niveis">Ver títulos ${ICONE_SETA_DIR}</button>
      </div>
    </section>

    <section class="card liga-card">
      <div class="secao-cab"><h3>Liga da semana</h3><small class="apagado">reinicia toda segunda</small></div>
      <div class="liga-escada">${LIGAS.map((x) => `<div class="degrau ${x.i < l.i ? 'passou' : ''} ${x.i === l.i ? 'atual' : ''}"><span>${x.emoji}</span><small>${x.nome}</small></div>`).join('')}</div>
      <div class="barra"><div class="barra-fill" style="width:${l.pct * 100}%"></div></div>
      <p class="dica">${l.proxima ? `<b>${l.xp} XP</b> nesta semana · faltam <b>${l.falta} XP</b> para ${l.proxima.emoji} ${l.proxima.nome}` : `<b>${l.xp} XP</b> · você está na liga máxima! 👑`}
        <br>Semana passada: ${lp.emoji} ${lp.nome} (${lp.xp} XP)${l.xp > lp.xp ? ' — você já superou! 🚀' : ''}</p>
    </section>

    <div class="grade-stats">
      <div class="stat card"><small>🔥 Sequência</small><strong>${seq}</strong><small>${seq === 1 ? 'dia' : 'dias'} · recorde ${d.stats.melhorSequencia}</small></div>
      <div class="stat card ${mult ? 'neon-borda' : ''}"><small>⚡ Multiplicador</small><strong>${mult ? `+${mult}%` : '0%'}</strong><small>+10% a cada 7 dias</small></div>
      <div class="stat card"><small>🏆 Melhor dia</small><strong>${melhor ? melhor.xp : 0}</strong><small>${melhor ? formatarData(melhor.dia) : 'ainda não'}</small></div>
      <div class="stat card"><small>📅 Presença</small><strong>${d.stats.checkinSeq || 0}</strong><small>dias abrindo o baú · recorde ${d.stats.melhorCheckin || 0}</small></div>
    </div>

    <section class="card grafico-card">
      <div class="secao-cab">
        <h3>Pontuação</h3>
        <div class="segmentado pequeno">
          <button class="${periodo === 7 ? 'on' : ''}" data-acao="periodo" data-dias="7">7 dias</button>
          <button class="${periodo === 30 ? 'on' : ''}" data-acao="periodo" data-dias="30">30 dias</button>
        </div>
      </div>
      ${barras(itensGraf, { altura: 150, mostrarValores: periodo === 7, rotulosACada: periodo === 7 ? 1 : 5 })}
      <p class="dica">Total: <b>${formatarNumero(totalPeriodo)} XP</b> · média ${formatarNumero(Math.round(totalPeriodo / periodo))} XP/dia</p>
    </section>`;
  },

  medalhas(d) {
    return `
    <p class="dica">Cada medalha dá moedas: 🥉 10 · 🥈 25 · 🥇 60 · 💎 150.</p>
    <div class="lista-series">
      ${SERIES.map((s) => {
        const pr = progressoSerie(s, d);
        return `<button class="serie-medalha card" data-acao="serie" data-id="${s.id}">
          <span class="serie-icone tier-${pr.tier}">${s.emoji}</span>
          <span class="serie-info">
            <b>${s.nome}</b>
            <span class="serie-tiers">${TIERS.map((t, i) => `<i class="${pr.tier > i ? 'tier-' + t.classe : 'tier-vazio'}" title="${t.nome}">${pr.tier > i ? t.emoji : '○'}</i>`).join('')}</span>
            ${pr.proximo ? `<span class="serie-barra"><i style="width:${pr.pct * 100}%"></i></span><small>${formatarNumero(pr.valor)}/${formatarNumero(pr.proximo)} ${esc(s.unidade)}</small>` : '<small>Série completa! 💎</small>'}
          </span>
        </button>`;
      }).join('')}
    </div>
    <h2 class="secao-titulo">Especiais</h2>
    <div class="grade-medalhas">
      ${ESPECIAIS.map((c) => {
        const ok = !!d.conquistas[c.id];
        return `<button class="medalha ${ok ? 'ok' : 'bloqueada'}" data-acao="especial" data-id="${c.id}" aria-label="${esc(c.nome)}${ok ? '' : ' (bloqueada)'}">
          <span class="medalha-icone">${ok ? c.emoji : '🔒'}</span>
          <span class="medalha-nome">${esc(c.nome)}</span>
        </button>`;
      }).join('')}
    </div>`;
  },

  ajustes(d) {
    return `
    <section class="card ajustes">
      <label class="ajuste">
        <span>Seu nome</span>
        <input class="entrada compacta" name="nome" value="${esc(d.ajustes.nome)}" placeholder="Como quer ser chamado?" maxlength="30" enterkeyhint="done">
      </label>
      <div class="ajuste">
        <span>Tema</span>
        <div class="segmentado pequeno">
          <button class="${d.ajustes.tema !== 'claro' ? 'on' : ''}" data-acao="tema" data-tema="escuro">Escuro</button>
          <button class="${d.ajustes.tema === 'claro' ? 'on' : ''}" data-acao="tema" data-tema="claro">Claro</button>
        </div>
      </div>
      <div class="ajuste">
        <span>Sons do jogo</span>
        <div class="segmentado pequeno">
          <button class="${d.ajustes.sons ? 'on' : ''}" data-acao="sons" data-valor="1">Ligado</button>
          <button class="${!d.ajustes.sons ? 'on' : ''}" data-acao="sons" data-valor="0">Desligado</button>
        </div>
      </div>
      <div class="ajuste">
        <span>Meta semanal de treinos</span>
        <div class="stepper">
          <button class="btn-icone" data-acao="passo" data-campo="metaTreinosSemana" data-passo="-1" aria-label="Menos">${ICONE_MENOS}</button>
          <strong>${d.ajustes.metaTreinosSemana}</strong>
          <button class="btn-icone" data-acao="passo" data-campo="metaTreinosSemana" data-passo="1" aria-label="Mais">${ICONE_MAIS}</button>
        </div>
      </div>
      <div class="ajuste">
        <span>Meta de água (copos/dia)</span>
        <div class="stepper">
          <button class="btn-icone" data-acao="passo" data-campo="metaAgua" data-passo="-1" aria-label="Menos">${ICONE_MENOS}</button>
          <strong>${d.ajustes.metaAgua}</strong>
          <button class="btn-icone" data-acao="passo" data-campo="metaAgua" data-passo="1" aria-label="Mais">${ICONE_MAIS}</button>
        </div>
      </div>
      <label class="ajuste">
        <span>Limite de gastos/mês</span>
        <input class="entrada compacta" name="limiteGastos" inputmode="decimal" value="${d.ajustes.limiteGastos ? formatarNumero(d.ajustes.limiteGastos, 2) : ''}" placeholder="Sem limite">
      </label>
      <button class="ajuste clicavel" data-acao="valores-xp"><span>Valores de XP</span>${ICONE_SETA_DIR}</button>
      <button class="ajuste clicavel" data-acao="refazer"><span>✨ Refazer personalização</span>${ICONE_SETA_DIR}</button>
    </section>

    <h2 class="secao-titulo">Conta e nuvem</h2>
    <section class="card ajustes">
      <button class="ajuste clicavel" data-acao="ir-conta"><span>☁️ ${Nuvem.logado() ? 'Minha conta e sincronização' : 'Criar conta / entrar (salvar na nuvem)'}</span>${ICONE_SETA_DIR}</button>
    </section>

    <h2 class="secao-titulo">Backup</h2>
    <section class="card ajustes">
      <p class="dica">${Nuvem.logado() ? 'Seu progresso também fica salvo na nuvem. O backup em arquivo é uma garantia extra.' : 'Sem conta, seus dados ficam só neste aparelho. Exporte um backup de vez em quando (ex.: salve no app Arquivos ou no iCloud Drive).'}</p>
      <button class="ajuste clicavel" data-acao="exportar"><span>📤 Exportar backup (.json)</span>${ICONE_SETA_DIR}</button>
      <button class="ajuste clicavel" data-acao="importar"><span>📥 Importar backup</span>${ICONE_SETA_DIR}</button>
      <input type="file" id="input-importar" class="oculto" aria-hidden="true">
    </section>

    <h2 class="secao-titulo">Dados</h2>
    <section class="card ajustes">
      <button class="ajuste clicavel" data-acao="limpar-exemplos"><span>🧹 Limpar dados de exemplo</span>${ICONE_SETA_DIR}</button>
      <button class="ajuste clicavel perigo-texto" data-acao="apagar-tudo"><span>🗑️ Apagar todos os dados</span>${ICONE_SETA_DIR}</button>
    </section>

    <section class="sobre">
      <div class="logo pequeno">Do It Better</div>
      <p>Versão do app <b id="versao-app">${esc(versaoApp)}</b> · dados v${SCHEMA_VERSION} · ${tamanhoKB()} KB</p>
      <p>Usando desde ${formatarData(d.criadoEm)}</p>
      <button class="btn-texto" data-acao="atualizar">Procurar atualização</button>
    </section>`;
  },
};

// -------------------------------------------------------------
// Ações
// -------------------------------------------------------------

function mostrarSerie(id) {
  const d = dados();
  const s = SERIES.find((x) => x.id === id);
  const pr = progressoSerie(s, d);
  abrirSheet({
    titulo: s.nome,
    html: `<div class="conquista-detalhe ok">
        <div class="medalha-icone gigante tier-${pr.tier}">${s.emoji}</div>
        <p>Você tem <b>${formatarNumero(pr.valor)}</b> ${esc(s.unidade)}.</p>
      </div>
      <div class="lista card">${TIERS.map((t, i) => {
        const ts = d.conquistas[`${s.id}-${i + 1}`];
        return `<div class="item-linha ${ts ? '' : 'apagado'}">
          <span class="medalha-mini ${ts ? t.classe : ''}">${ts ? t.emoji : '🔒'}</span>
          <span class="item-info"><span class="item-nome">${t.nome} — ${formatarNumero(s.niveis[i])} ${esc(s.unidade)}</span>
          <span class="item-sub">${ts ? `Conquistada em ${formatarData(new Date(ts).toISOString().slice(0, 10))}` : `Recompensa: 🪙 ${t.moedas}`}</span></span>
        </div>`;
      }).join('')}</div>`,
  });
}

function mostrarEspecial(id) {
  const c = ESPECIAIS.find((x) => x.id === id);
  const ts = dados().conquistas[id];
  abrirSheet({
    titulo: 'Medalha especial',
    html: `<div class="conquista-detalhe ${ts ? 'ok' : ''}">
      <div class="medalha-icone gigante">${ts ? c.emoji : '🔒'}</div>
      <h3 class="${ts ? 'gradiente-texto' : ''}">${esc(c.nome)}</h3>
      <p>${esc(c.descricao)}</p>
      <p class="dica">${ts ? `Desbloqueada em ${formatarDataHora(ts)}` : `Recompensa: 🪙 ${c.moedas}. Você chega lá! 💪`}</p>
    </div>`,
  });
}

function mostrarNiveis() {
  const n = nivelInfo().nivel;
  abrirSheet({
    titulo: 'Níveis e títulos',
    html: `<p class="dica">Cada nível pede um pouco mais de XP que o anterior. O nível máximo é ${NIVEL_MAX}: chegar lá leva cerca de um ano de dedicação. No ${NIVEL_MAX}, o <b>prestígio</b> recomeça a contagem de níveis e dá uma estrela ⭐ (+5% de XP para sempre, até ${PRESTIGIO_MAX} estrelas). O que você já liberou continua seu.</p>
      <div class="lista card">${TITULOS.map((t, i) => {
        const ate = TITULOS[i + 1] ? TITULOS[i + 1].nivel - 1 : null;
        const atual = n >= t.nivel && (!ate || n <= ate);
        return `<div class="item-linha ${atual ? 'destaque' : ''}">
          <span class="item-info"><span class="item-nome">${t.titulo} ${atual ? '⬅️' : ''}</span>
          <span class="item-sub">Nível ${t.nivel}${ate ? `–${ate}` : '+'} · a partir de ${formatarNumero(xpParaChegar(t.nivel))} XP</span></span>
        </div>`;
      }).join('')}</div>`,
  });
}

const MAX_AJUSTE = {
  rotinaPadrao: LIMITES_XP.rotina.porAcao, rotinaBonus: LIMITES_XP['bonus-rotina'].porAcao, pendAlta: LIMITES_XP.pendencia.porAcao,
  pendMedia: LIMITES_XP.pendencia.porAcao, pendBaixa: LIMITES_XP.pendencia.porAcao, treino: LIMITES_XP.treino.porAcao,
  treinoRecorde: LIMITES_XP.recorde.porAcao, agua: LIMITES_XP.agua.porAcao,
};

function abrirValoresXP() {
  const d = dados();
  const x = d.ajustes.xp;
  const campos = [
    ['rotinaPadrao', 'Item novo da rotina (padrão)'],
    ['rotinaBonus', 'Bônus rotina 100%'],
    ['pendAlta', 'Pendência — prioridade alta'],
    ['pendMedia', 'Pendência — prioridade média'],
    ['pendBaixa', 'Pendência — prioridade baixa'],
    ['treino', 'Treino finalizado'],
    ['treinoRecorde', 'Bônus de recorde de carga'],
    ['agua', 'Meta de água batida'],
  ];
  abrirSheet({
    titulo: 'Valores de XP',
    html: `<form class="form">
      ${campos.map(([k, n]) => `<label class="ajuste"><span>${n} <small class="apagado">máx. ${MAX_AJUSTE[k]}</small></span><input class="entrada compacta numero" name="${k}" inputmode="numeric" value="${x[k]}"></label>`).join('')}
      <p class="dica">O XP de cada item da rotina e de cada bloco de check é editado no próprio item. Mudanças valem daqui para frente.</p>
      <p class="dica">⚖️ <b>Regras justas:</b> como existe ranking com outras pessoas, cada ação tem um XP máximo e cada tipo de atividade tem um limite por dia (hábitos 400, pendências 240, treinos 300...). Passou do limite, a atividade continua valendo para a rotina, o pet e os desafios.</p>
      <button class="btn secundario largo" type="button" data-padrao>Restaurar padrões</button>
      <button class="btn primario largo" type="submit">Salvar</button>
    </form>`,
    aoMontar(corpo, fechar) {
      const form = corpo.querySelector('form');
      corpo.querySelector('[data-padrao]').addEventListener('click', () => {
        const p = { rotinaPadrao: 10, rotinaBonus: 50, pendAlta: 30, pendMedia: 20, pendBaixa: 10, treino: 100, treinoRecorde: 50, agua: 15 };
        Object.entries(p).forEach(([k, v]) => (form.elements[k].value = v));
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        alterar(() => {
          campos.forEach(([k]) => (x[k] = Math.min(MAX_AJUSTE[k], Math.max(0, Math.round(lerNumero(form.elements[k].value, x[k]))))));
        });
        fechar();
        toast('Valores de XP salvos ⚙️');
      });
    },
  });
}

/** Exporta o backup: usa a folha de compartilhamento do iPhone (salvar em Arquivos) ou baixa o arquivo. */
async function exportarBackup() {
  const json = JSON.stringify(exportar(), null, 2);
  const nome = `do-it-better-backup-${hojeKey()}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  try {
    const arquivo = new File([blob], nome, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: 'Backup Do It Better' });
      toast('Backup pronto ✅');
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // o usuário cancelou
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Backup exportado ✅');
}

async function importarBackup(arquivo) {
  let obj;
  try {
    obj = JSON.parse(await arquivo.text());
  } catch (_) {
    toast('Arquivo inválido: não é um JSON.', { tipo: 'erro' });
    return;
  }
  const quando = obj && obj.exportadoEm ? ` de ${formatarDataHora(new Date(obj.exportadoEm).getTime())}` : '';
  const ok = await confirmar(`Importar o backup${quando}? Os dados atuais deste aparelho serão SUBSTITUÍDOS.`, { titulo: 'Importar backup', ok: 'Importar', perigo: true });
  if (!ok) return;
  try {
    importar(obj);
    toast('Backup importado! 🎉');
    setTimeout(() => location.reload(), 700);
  } catch (e) {
    toast(e.message || 'Não foi possível importar.', { tipo: 'erro', duracao: 5000 });
  }
}

async function limparDadosExemplo() {
  const ok = await confirmar('Remove as fichas A/B/C, os 3 itens de rotina e o bloco "Quarto arrumado" de exemplo (os que você editou são mantidos). Seu XP e histórico continuam.', {
    titulo: 'Limpar dados de exemplo',
    ok: 'Limpar',
    perigo: true,
  });
  if (!ok) return;
  let r;
  alterar((d) => (r = limparExemplos(d)));
  const total = r.rotina + r.checks + r.fichas;
  toast(total ? `Removidos: ${r.rotina} itens de rotina, ${r.fichas} fichas, ${r.checks} bloco(s)` : 'Nenhum dado de exemplo para remover');
}

async function apagarTodosOsDados() {
  const ok1 = await confirmar('Isso apaga TODO o seu progresso: XP, nível, conquistas, rotina, pendências, treinos e histórico. Não dá para desfazer. Exporte um backup antes!', {
    titulo: 'Apagar todos os dados?',
    ok: 'Continuar',
    perigo: true,
  });
  if (!ok1) return;
  const txt = await pedirTexto({ titulo: 'Confirmação final', texto: 'Digite APAGAR para confirmar.', placeholder: 'APAGAR', ok: 'Apagar tudo', perigo: true });
  if (txt === null) return;
  if (txt.trim().toUpperCase() !== 'APAGAR') {
    toast('Texto diferente de APAGAR. Nada foi apagado.');
    return;
  }
  apagarTudo();
  toast('Tudo apagado. Recomeçando do zero!');
  setTimeout(() => location.reload(), 700);
}

async function procurarAtualizacao() {
  if (!('serviceWorker' in navigator)) {
    toast('Atualização automática indisponível neste navegador.');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      toast('Service worker ainda não registrado.');
      return;
    }
    await reg.update();
    if (reg.installing || reg.waiting) toast('Baixando nova versão...');
    else toast('Você já está na versão mais recente ✅');
  } catch (_) {
    toast('Sem conexão para procurar atualização.');
  }
}
