// =============================================================
// app.js — ponto de entrada. Carrega os dados, mostra o questionário
// na primeira entrada, registra as abas, cuida da virada do dia, do
// botão "+", das celebrações (nível, medalhas, personagens), dos
// combos, dos avisos na barra de abas e do service worker (offline).
// =============================================================

import * as Store from './store.js';
import { on, hojeKey } from './utils.js';
import { fecharDias, atualizarMelhoresSequencias, resumoRotina } from './historico.js';
import { recalcularXP } from './xp.js';
import { verificarConquistas } from './conquistas.js';
import { verificarPersonagens, companheiro, estagioDoNivel, novosNaColecao, avatarHTML } from './personagens.js';
import { verificarVisual, avatarSVG, fisicoAtual, personagemHTML } from './visual.js';
import { abrirEditorPersonagem, celebrarVisual } from './telas-personagem.js';
import { estadoPet, atualizarPet } from './pet.js';
import { atualizarLiga, missoesParaResgatar, bauDisponivel } from './missoes.js';
import { aplicarTemaCor } from './loja.js';
import { abrirOnboarding } from './onboarding.js';
import { registrarAba, irPara, renderizarAtual, abaAtual } from './nav.js';
import { abrirSheet, toast, flutuarXP, celebrar, vibrar } from './ui.js';
import { tocar } from './sons.js';
import * as painel from './painel.js';
import * as rotina from './rotina.js';
import * as pendencias from './pendencias.js';
import * as tarefas from './tarefas.js';
import * as treinos from './treinos.js';
import * as petaba from './petaba.js';
import * as perfil from './perfil.js';
import { abrirNotas } from './extras.js';
import { contagens } from './pendencias.js';

// ---------- 1. Dados ----------
Store.carregar();
const d = Store.dados();
recalcularXP(); // garante a integridade do total de XP
fecharDias(); // fecha os dias que passaram desde a última abertura (e usa escudos)
atualizarPet(); // fome e sede andam com o relógio, mesmo com o app fechado
painel.sincronizarBlocos();
atualizarMelhoresSequencias();
// Na abertura não celebramos o que já existia: só registramos.
verificarPersonagens();
verificarVisual();
atualizarLiga();
verificarConquistas();
Store.salvar({ silencioso: true });
Store.pedirArmazenamentoPersistente();
perfil.aplicarTema();
aplicarTemaCor();

// ---------- 2. Feedback de jogo ----------
let pronto = false; // evita celebrar durante a inicialização
let combo = 0;
let ultimoXP = 0;

on('xp', (l) => {
  if (l.xp <= 0) return;
  flutuarXP(l.xp);
  if (!pronto) return;
  // COMBO: concluir coisas em sequência rápida (até 45 s entre uma e outra)
  const agora = Date.now();
  combo = agora - ultimoXP < 45000 && ['rotina', 'check', 'pendencia', 'agua'].includes(l.fonte) ? combo + 1 : 1;
  ultimoXP = agora;
  if (combo >= 2) {
    mostrarCombo(combo);
    tocar('combo', combo);
    if (combo > (d.stats.comboMax || 0)) d.stats.comboMax = combo;
  } else {
    tocar('check');
  }
});
on('xp-removido', (l) => {
  if (l.xp > 0) flutuarXP(l.xp, { negativo: true });
  if (pronto) tocar('desfazer');
  combo = 0;
});
let fisicoVisto = fisicoAtual().n;
on('nivel', (info) => {
  if (!pronto) return;
  tocar('fanfarra');
  const p = companheiro();
  const antes = estagioDoNivel(info.nivel - 1);
  const depois = estagioDoNivel(info.nivel);
  celebrar({ emoji: '🚀', titulo: `Nível ${info.nivel}!`, subtitulo: `Você agora é ${info.titulo}. Continue assim!` });
  if (depois.estagio > antes.estagio) {
    celebrar({ emoji: avatarHTML(p, { tam: 'g', nivel: info.nivel, estado: false }), titulo: `${p.nome} evoluiu!`, subtitulo: `Agora é ${depois.nome}. Vocês estão ficando lendários juntos! ✨` });
  }
  // o seu personagem também fica mais forte
  const f = fisicoAtual();
  if (f.n > fisicoVisto) {
    celebrar({ emoji: `<span class="celebra-personagem">${personagemHTML(d.avatar, { fisico: f.n })}</span>`, titulo: `Você ficou ${f.nome}!`, subtitulo: `${f.desc} Veja na aba Pet → Personagem.` });
  }
  fisicoVisto = f.n;
});
on('conquista', (c) => {
  if (!pronto) return;
  tocar('fanfarra');
  const premio = c.moedas ? ` +${c.moedas} 🪙` : '';
  celebrar({ emoji: c.tier ? `${c.emoji}${c.tier.emoji}` : c.emoji, titulo: c.tier ? `Medalha de ${c.tier.nome}!` : 'Medalha desbloqueada!', subtitulo: `${c.nome} — ${c.descricao}.${premio}` });
});
on('personagem', (p) => {
  if (!pronto) return;
  tocar('fanfarra');
  celebrar({ emoji: avatarHTML(p, { tam: 'g', estado: false }), titulo: 'Novo pet desbloqueado!', subtitulo: `${p.especie} entrou para a sua coleção. Adote na aba Pet → Coleção.` });
});
on('visual', (x) => {
  if (!pronto) return;
  tocar('fanfarra');
  celebrarVisual(x);
});
window.addEventListener('dib-erro-salvar', () => toast('Não foi possível salvar: armazenamento cheio? Exporte um backup.', { tipo: 'erro', duracao: 6000 }));

/** Selo "Combo xN" no topo da tela. */
let comboTimer = null;
function mostrarCombo(n) {
  let el = document.getElementById('combo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'combo';
    el.className = 'combo';
    document.body.appendChild(el);
  }
  el.innerHTML = `<b>COMBO</b><strong>x${n}</strong>${n >= 5 ? '<span>🔥</span>' : ''}`;
  el.classList.remove('visivel');
  void el.offsetWidth;
  el.classList.add('visivel');
  vibrar(n >= 5 ? [10, 30, 10, 30, 10] : [10, 30, 10]);
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => el.classList.remove('visivel'), 1800);
}

// O documento nunca deve rolar (só as telas internas). Se o iOS deslocar a
// página (ex.: ao focar um campo), voltamos para o lugar ao fechar o teclado.
window.addEventListener('scroll', () => {
  const el = document.activeElement;
  const digitando = el && /INPUT|TEXTAREA|SELECT/.test(el.tagName);
  if (!digitando && (window.scrollX || window.scrollY)) window.scrollTo(0, 0);
}, { passive: true });
document.addEventListener('focusout', () => setTimeout(() => {
  const el = document.activeElement;
  if (!(el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) && (window.scrollX || window.scrollY)) window.scrollTo(0, 0);
}, 120));

// ---------- 3. Abas ----------
registrarAba('hoje', painel);
registrarAba('tarefas', tarefas);
registrarAba('treinos', treinos);
registrarAba('pet', petaba);
registrarAba('perfil', perfil);

document.getElementById('tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]');
  if (!b) return;
  vibrar(6);
  irPara(b.dataset.aba);
});

// Sempre que os dados mudam: verifica medalhas/personagens/liga e redesenha
Store.aoMudar(() => {
  const a = verificarPersonagens() | verificarVisual();
  const b = !!atualizarLiga();
  const c = verificarConquistas();
  if (a || b || c) Store.salvar({ silencioso: true });
  renderizarAtual();
  atualizarBadges();
});
document.addEventListener('dib-redesenhar', () => {
  renderizarAtual();
  atualizarBadges();
});
document.addEventListener('dib-redesenhar-badges', () => atualizarBadges());

// Botão "+" só aparece onde se cria coisa (Hoje, Tarefas e Treinos)
document.addEventListener('dib-aba', (e) => {
  document.getElementById('fab').classList.toggle('escondido', e.detail === 'perfil' || e.detail === 'pet');
  atualizarBadges();
});

/** Avisos (números e pontos) nos ícones da barra de abas. */
function atualizarBadges() {
  const r = resumoRotina(hojeKey());
  const c = contagens();
  const pend = c.hoje + c.atrasadas;
  const marcar = (aba, conteudo, alerta = false) => {
    const b = document.querySelector(`.tabbar [data-aba="${aba}"] .badge`);
    if (!b) return;
    b.textContent = conteudo === true ? '' : conteudo || '';
    b.classList.toggle('visivel', !!conteudo);
    b.classList.toggle('ponto', conteudo === true);
    b.classList.toggle('urgente', alerta);
  };
  const est = d.meta.onboardingFeito ? estadoPet() : {};
  const petPrecisa = est.faminto || est.sede || est.sujo || est.fraco || est.triste;
  const faltam = Math.max(0, r.total - r.feitos) + pend;
  marcar('hoje', bauDisponivel() || missoesParaResgatar() > 0 ? true : '');
  marcar('tarefas', faltam ? String(faltam) : '', c.atrasadas > 0);
  marcar('treinos', d.treinos.emAndamento ? true : '');
  marcar('pet', petPrecisa || novosNaColecao() + d.visualNovos.length > 0 ? true : '', !!petPrecisa);
  marcar('perfil', '');
  // ícone da aba Pet = o seu pet em pixel art
  const iconePet = document.querySelector('.tabbar [data-aba="pet"] .tab-pet');
  const p = companheiro();
  const chavePet = JSON.stringify([p.id, d.pet.skin]);
  if (iconePet && iconePet.dataset.chave !== chavePet) {
    iconePet.innerHTML = avatarHTML(p, { tam: 'p', estado: false });
    iconePet.dataset.chave = chavePet;
  }
  // ícone da aba Perfil = o seu personagem em pixel art
  const icone = document.querySelector('.tabbar [data-aba="perfil"] .tab-avatar');
  const chave = JSON.stringify([d.avatar, fisicoAtual().n]);
  if (icone && icone.dataset.chave !== chave) {
    icone.innerHTML = avatarSVG(d.avatar);
    icone.dataset.chave = chave;
  }
}

/** Quem já usava o app vê uma vez o que mudou na versão 4. */
function talvezMostrarNovidades() {
  if (!d.meta.novidadeV4 || !d.meta.onboardingFeito || !d.meta.avatarCriado) return;
  setTimeout(() => abrirSheet({
    titulo: 'Novidades ✨',
    html: `<div class="novidades">
      <p><b>📋 Plano de hoje:</b> tudo o que é para fazer hoje (rotina, desafios, pendências e treino) numa lista só, em ordem de horário. Toque na caixinha <b>✓</b> para marcar.</p>
      <p><b>🧭 Abas organizadas:</b> <b>Tarefas</b> junta Rotina e Pendências; <b>Pet</b> junta cuidados, personagem, loja e coleção.</p>
      <p><b>🍖 Comida e água custam moedas:</b> o pet sente fome e sede com o tempo. Cumpra a rotina e as missões para ganhar moedas — sem moedas, sem comida!</p>
      <p><b>💪 Evolução física:</b> seu personagem fica mais forte a cada fase, até virar um guerreiro imparável com aura de energia.</p>
      <button class="btn primario largo" data-fechar>Bora!</button>
    </div>`,
    aoMontar(corpo, fechar) {
      corpo.querySelector('[data-fechar]').addEventListener('click', fechar);
    },
  }), 900);
  d.meta.novidadeV4 = false;
  Store.salvar({ silencioso: true });
}

/** Quem já usava o app (ou pulou o questionário) cria o personagem uma vez. */
function talvezCriarPersonagem() {
  if (d.meta.onboardingFeito && !d.meta.avatarCriado) setTimeout(() => abrirEditorPersonagem({ primeiraVez: true }), 700);
}

// ---------- Primeira entrada: questionário ----------
function iniciar() {
  irPara('hoje');
  atualizarBadges();
  pronto = true;
  treinos.verificarTreinoPendente();
  const salvos = (d.meta.diasProtegidos || []).length;
  if (salvos) {
    setTimeout(() => toast(`🛡️ Seu escudo salvou sua sequência (${salvos} dia${salvos > 1 ? 's' : ''} sem rotina completa)!`, { duracao: 5000 }), 800);
    d.meta.diasProtegidos = [];
    Store.salvar({ silencioso: true });
  }
  talvezCriarPersonagem();
  talvezMostrarNovidades();
}
if (!d.meta.onboardingFeito) {
  irPara('hoje');
  abrirOnboarding();
  document.addEventListener('dib-onboarding-fim', () => {
    d.meta.novidadeV4 = false;
    pronto = true;
    irPara('hoje');
    atualizarBadges();
    talvezCriarPersonagem();
  }, { once: true });
  pronto = true;
} else {
  iniciar();
}

// ---------- 4. Botão "+" (adicionar rápido) ----------
document.getElementById('fab').addEventListener('click', () => {
  // na aba Tarefas o "+" já cria o que está aberto (rotina ou pendência)
  if (abaAtual() === 'tarefas') {
    if (tarefas.subAtual() === 'pendencias') pendencias.abrirFormPendencia();
    else rotina.abrirFormItem();
    return;
  }
  abrirSheet({
    titulo: 'Adicionar',
    html: `<div class="acoes-rapidas">
      <button class="acao-rapida card" data-rapido="pendencia"><span>📌</span><b>Pendência</b><small>Algo para resolver</small></button>
      <button class="acao-rapida card" data-rapido="rotina"><span>🔁</span><b>Item de rotina</b><small>Hábito diário</small></button>
      <button class="acao-rapida card" data-rapido="nota"><span>🗒️</span><b>Nota</b><small>Ideia rápida</small></button>
      <button class="acao-rapida card" data-rapido="check"><span>🎯</span><b>Desafio diário</b><small>Check com sequência 🔥</small></button>
    </div>`,
    aoMontar(corpo, fechar) {
      corpo.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rapido]');
        if (!b) return;
        fechar();
        const tipo = b.dataset.rapido;
        setTimeout(() => {
          if (tipo === 'pendencia') pendencias.abrirFormPendencia();
          if (tipo === 'rotina') rotina.abrirFormItem();
          if (tipo === 'nota') abrirNotas({ nova: true });
          if (tipo === 'check') painel.abrirFormCheck();
        }, 200);
      });
    },
  });
});

// ---------- 5. Virada do dia (meia-noite) ----------
let diaAtual = hojeKey();
function verificarDia() {
  // fome e sede do pet (a cada minuto ou ao voltar ao app)
  if (atualizarPet()) {
    Store.salvar({ silencioso: true });
    atualizarBadges();
    if (['hoje', 'pet'].includes(abaAtual())) renderizarAtual();
  }
  if (hojeKey() === diaAtual) return;
  diaAtual = hojeKey();
  fecharDias();
  Store.salvar(); // redesenha tudo
  toast('Novo dia! Os checks diários foram reiniciados ☀️');
}
setInterval(verificarDia, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    verificarDia();
    renderizarAtual(); // atualiza horários e cronômetros ao voltar
  }
});

// ---------- 6. Service worker (offline + atualização) ----------
if ('serviceWorker' in navigator) {
  const tinhaControle = !!navigator.serviceWorker.controller;
  let atualizacaoPedida = false;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const avisar = (worker) => {
        toast('Nova versão disponível!', {
          acao: { rotulo: 'Atualizar', fn: () => {
            atualizacaoPedida = true;
            worker.postMessage('pular-espera');
          } },
          duracao: 0,
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) avisar(w);
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      // Pergunta a versão ao service worker (a versão fica só no sw.js)
      const ativo = (await navigator.serviceWorker.ready).active;
      if (ativo) {
        const canal = new MessageChannel();
        canal.port1.onmessage = (ev) => ev.data && ev.data.versao && perfil.definirVersao(ev.data.versao);
        ativo.postMessage('versao', [canal.port2]);
      }
    } catch (e) {
      console.warn('Service worker não registrado:', e);
    }
  });
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Na 1ª instalação não recarrega; numa atualização, sim.
    if ((!tinhaControle && !atualizacaoPedida) || recarregando) return;
    recarregando = true;
    location.reload();
  });
}
