// =============================================================
// perfil.js — aba PERFIL: nível, XP, histórico de pontuação,
// conquistas e AJUSTES (valores de XP, metas, tema, backup...).
// =============================================================

import { dados, alterar, exportar, importar, apagarTudo, SCHEMA_VERSION, tamanhoKB } from './store.js';
import { hojeKey, esc, formatarData, formatarDataCurta, formatarDataHora, formatarNumero, lerNumero, DIAS_LETRA, diaSemana, plural, chaveData } from './utils.js';
import { nivelInfo, xpUltimosDias, melhorDia, TITULOS, xpParaChegar } from './xp.js';
import { sequenciaRotina, multiplicador } from './historico.js';
import { CONQUISTAS } from './conquistas.js';
import { limparExemplos } from './seed.js';
import { anel, barras } from './graficos.js';
import { abrirSheet, confirmar, pedirTexto, toast, vibrar, ICONE_MAIS, ICONE_MENOS, ICONE_SETA_DIR } from './ui.js';

let periodo = 7; // 7 ou 30 dias no gráfico
let versaoApp = '—';

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
      case 'periodo':
        periodo = Number(b.dataset.dias);
        render(el);
        break;
      case 'conquista':
        mostrarConquista(b.dataset.id);
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

export function render(el) {
  const d = dados();
  const info = nivelInfo(d.xp.total);
  const seq = sequenciaRotina();
  const mult = multiplicador();
  const melhor = melhorDia();
  const serie = xpUltimosDias(periodo);
  const totalPeriodo = serie.reduce((s, x) => s + x.xp, 0);
  const desbloqueadas = CONQUISTAS.filter((c) => d.conquistas[c.id]).length;
  const hoje = hojeKey();
  const itensGraf = serie.map((x) => ({
    rotulo: periodo === 7 ? DIAS_LETRA[diaSemana(x.dia)] : formatarDataCurta(x.dia).slice(0, 2),
    valor: x.xp,
    destaque: x.dia === hoje,
  }));

  el.innerHTML = `
    <header class="cabecalho"><h1 class="titulo-tela">Perfil</h1></header>

    <section class="card heroi-nivel">
      ${anel(info.progresso, { tam: 132, esp: 11, classe: 'anel-heroi', html: `<small>NÍVEL</small><strong>${info.nivel}</strong>` })}
      <div class="heroi-info">
        <h2 class="gradiente-texto">${info.titulo}</h2>
        <p><b>${formatarNumero(info.total)}</b> XP no total</p>
        <div class="barra-xp"><div class="barra-xp-fill" style="width:${Math.round(info.progresso * 100)}%"></div></div>
        <small>Faltam ${info.falta} XP para o nível ${info.nivel + 1}</small>
        <button class="btn-texto" data-acao="niveis">Ver títulos ${ICONE_SETA_DIR}</button>
      </div>
    </section>

    <div class="grade-stats">
      <div class="stat card"><small>🔥 Sequência</small><strong>${seq}</strong><small>${seq === 1 ? 'dia' : 'dias'} · recorde ${d.stats.melhorSequencia}</small></div>
      <div class="stat card ${mult ? 'neon-borda' : ''}"><small>⚡ Multiplicador</small><strong>${mult ? `+${mult}%` : '0%'}</strong><small>+10% a cada 7 dias</small></div>
      <div class="stat card"><small>🏆 Melhor dia</small><strong>${melhor ? melhor.xp : 0}</strong><small>${melhor ? formatarData(melhor.dia) : 'ainda não'}</small></div>
      <div class="stat card"><small>🎖️ Conquistas</small><strong>${desbloqueadas}<small>/${CONQUISTAS.length}</small></strong><small>desbloqueadas</small></div>
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
    </section>

    <h2 class="secao-titulo">Conquistas</h2>
    <div class="grade-medalhas">
      ${CONQUISTAS.map((c) => {
        const ok = !!d.conquistas[c.id];
        return `<button class="medalha ${ok ? 'ok' : 'bloqueada'}" data-acao="conquista" data-id="${c.id}" aria-label="${esc(c.nome)}${ok ? '' : ' (bloqueada)'}">
          <span class="medalha-icone">${ok ? c.emoji : '🔒'}</span>
          <span class="medalha-nome">${esc(c.nome)}</span>
        </button>`;
      }).join('')}
    </div>

    <h2 class="secao-titulo">Ajustes</h2>
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
    </section>

    <h2 class="secao-titulo">Backup</h2>
    <section class="card ajustes">
      <p class="dica">Seus dados ficam só neste aparelho. Exporte um backup de vez em quando (ex.: salve no app Arquivos ou no iCloud Drive).</p>
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
    </section>
  `;
}

// -------------------------------------------------------------
// Ações
// -------------------------------------------------------------

function mostrarConquista(id) {
  const c = CONQUISTAS.find((x) => x.id === id);
  const ts = dados().conquistas[id];
  abrirSheet({
    titulo: 'Conquista',
    html: `<div class="conquista-detalhe ${ts ? 'ok' : ''}">
      <div class="medalha-icone gigante">${ts ? c.emoji : '🔒'}</div>
      <h3 class="${ts ? 'gradiente-texto' : ''}">${esc(c.nome)}</h3>
      <p>${esc(c.descricao)}</p>
      <p class="dica">${ts ? `Desbloqueada em ${formatarDataHora(ts)}` : 'Ainda bloqueada. Você chega lá! 💪'}</p>
    </div>`,
  });
}

function mostrarNiveis() {
  const n = nivelInfo().nivel;
  abrirSheet({
    titulo: 'Níveis e títulos',
    html: `<p class="dica">O nível N precisa de 100 × N XP para passar ao próximo.</p>
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
      ${campos.map(([k, n]) => `<label class="ajuste"><span>${n}</span><input class="entrada compacta numero" name="${k}" inputmode="numeric" value="${x[k]}"></label>`).join('')}
      <p class="dica">O XP de cada item da rotina e de cada bloco de check é editado no próprio item. Mudanças valem daqui para frente.</p>
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
          campos.forEach(([k]) => (x[k] = Math.max(0, Math.round(lerNumero(form.elements[k].value, x[k])))));
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
