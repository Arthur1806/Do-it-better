// =============================================================
// app.js — ponto de entrada. Carrega os dados, cria os exemplos na
// primeira abertura, registra as abas, cuida da virada do dia,
// do botão "+", das celebrações e do service worker (offline).
// =============================================================

import * as Store from './store.js';
import { on, hojeKey } from './utils.js';
import { fecharDias, atualizarMelhoresSequencias } from './historico.js';
import { recalcularXP } from './xp.js';
import { verificarConquistas } from './conquistas.js';
import { criarExemplos } from './seed.js';
import { registrarAba, irPara, renderizarAtual } from './nav.js';
import { abrirSheet, toast, flutuarXP, celebrar } from './ui.js';
import * as painel from './painel.js';
import * as rotina from './rotina.js';
import * as pendencias from './pendencias.js';
import * as treinos from './treinos.js';
import * as perfil from './perfil.js';
import { abrirNotas } from './extras.js';

// ---------- 1. Dados ----------
Store.carregar();
const d = Store.dados();
if (Store.ehPrimeiraVez() && !d.meta.exemplosCriados) {
  criarExemplos(d);
}
recalcularXP(); // garante a integridade do total de XP
fecharDias(); // fecha os dias que passaram desde a última abertura
painel.sincronizarBlocos();
atualizarMelhoresSequencias();
verificarConquistas();
// Na abertura não celebramos conquistas antigas: só salvamos.
Store.salvar({ silencioso: true });
Store.pedirArmazenamentoPersistente();
perfil.aplicarTema();

// ---------- 2. Feedback de jogo ----------
let pronto = false; // evita celebrar durante a inicialização
on('xp', (l) => l.xp > 0 && flutuarXP(l.xp));
on('xp-removido', (l) => l.xp > 0 && flutuarXP(l.xp, { negativo: true }));
on('nivel', (info) => {
  if (!pronto) return;
  celebrar({ emoji: '🚀', titulo: `Nível ${info.nivel}!`, subtitulo: `Você agora é ${info.titulo}. Continue assim!` });
});
on('conquista', (c) => {
  if (!pronto) return;
  celebrar({ emoji: c.emoji, titulo: 'Conquista desbloqueada!', subtitulo: `${c.nome} — ${c.descricao}` });
});
window.addEventListener('dib-erro-salvar', () => toast('Não foi possível salvar: armazenamento cheio? Exporte um backup.', { tipo: 'erro', duracao: 6000 }));

// ---------- 3. Abas ----------
registrarAba('hoje', painel);
registrarAba('rotina', rotina);
registrarAba('pendencias', pendencias);
registrarAba('treinos', treinos);
registrarAba('perfil', perfil);

document.getElementById('tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]');
  if (b) irPara(b.dataset.aba);
});

// Sempre que os dados mudam: verifica conquistas e redesenha a aba visível
Store.aoMudar(() => {
  if (verificarConquistas()) Store.salvar({ silencioso: true });
  renderizarAtual();
});
document.addEventListener('dib-redesenhar', renderizarAtual);

// Botão "+" some na aba Perfil
document.addEventListener('dib-aba', (e) => {
  document.getElementById('fab').classList.toggle('escondido', e.detail === 'perfil');
});

irPara('hoje');
pronto = true;
treinos.verificarTreinoPendente();

// ---------- 4. Botão "+" (adicionar rápido) ----------
document.getElementById('fab').addEventListener('click', () => {
  abrirSheet({
    titulo: 'Adicionar',
    html: `<div class="acoes-rapidas">
      <button class="acao-rapida card" data-rapido="pendencia"><span>📌</span><b>Pendência</b><small>Algo para resolver</small></button>
      <button class="acao-rapida card" data-rapido="rotina"><span>🔁</span><b>Item de rotina</b><small>Hábito diário</small></button>
      <button class="acao-rapida card" data-rapido="nota"><span>🗒️</span><b>Nota</b><small>Ideia rápida</small></button>
      <button class="acao-rapida card" data-rapido="check"><span>✅</span><b>Bloco de check</b><small>Novo bloco no painel</small></button>
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
  if (hojeKey() === diaAtual) return;
  diaAtual = hojeKey();
  fecharDias();
  Store.salvar(); // redesenha tudo
  toast('Novo dia! Os checks diários foram reiniciados ☀️');
}
setInterval(verificarDia, 30000);
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
