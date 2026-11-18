// =============================================================
// seed.js — dados de exemplo criados SOMENTE na primeira abertura:
// fichas A/B/C, 3 itens de rotina e o bloco "Quarto arrumado".
// Tudo que é exemplo leva exemplo: true, para poder ser limpo
// depois pelo botão nos Ajustes.
// =============================================================

import { hojeKey, uid } from './utils.js';

/** Blocos fixos do painel, na ordem inicial. */
export const BLOCOS_FIXOS = [
  { tipo: 'missoes', ativo: true, tamanho: 'g', inicio: true },
  { tipo: 'rotina', ativo: false, tamanho: 'p' },
  { tipo: 'check', ref: 'chk-quarto', ativo: false, tamanho: 'p' },
  { tipo: 'treino', ativo: false, tamanho: 'g' },
  { tipo: 'pendencias', ativo: false, tamanho: 'p' },
  { tipo: 'agua', ativo: true, tamanho: 'p' },
  { tipo: 'metaTreinos', ativo: true, tamanho: 'p' },
  { tipo: 'sequencia', ativo: true, tamanho: 'p' },
  { tipo: 'liga', ativo: true, tamanho: 'p' },
  { tipo: 'semanaXP', ativo: true, tamanho: 'g' },
  { tipo: 'notas', ativo: true, tamanho: 'p' },
  { tipo: 'compras', ativo: true, tamanho: 'p' },
  { tipo: 'gastos', ativo: false, tamanho: 'g' },
];

function ex(nome, grupo, series, reps, carga, descanso) {
  return { id: uid(), nome, grupo, series, reps, carga, descanso };
}

/** Cria os dados de exemplo dentro do objeto de dados. */
export function criarExemplos(d) {
  const hoje = hojeKey();

  d.rotina = [
    { id: uid(), nome: 'Ler 20 minutos', emoji: '📖', xp: 10, dias: null, horario: '22:00', criadoEm: hoje, exemplo: true },
    { id: uid(), nome: 'Meditar 10 minutos', emoji: '🧘', xp: 10, dias: null, horario: '09:00', criadoEm: hoje, exemplo: true },
    { id: uid(), nome: 'Planejar o dia seguinte', emoji: '📝', xp: 10, dias: [1, 2, 3, 4, 5], horario: '21:00', criadoEm: hoje, exemplo: true },
  ];

  d.checks = [
    {
      id: 'chk-quarto',
      chave: 'quarto', // usado pela conquista "Quarto em ordem"
      nome: 'Quarto arrumado',
      emoji: '🛏️',
      xp: 20,
      dias: null,
      horaLimite: '09:00', // depois disso vale metade
      criadoEm: hoje,
      melhorSequencia: 0,
      exemplo: true,
    },
  ];

  d.treinos.fichas = [
    {
      id: uid(),
      nome: 'Treino A',
      exemplo: true,
      exercicios: [
        ex('Supino reto', 'Peito', 4, 10, 40, 90),
        ex('Supino inclinado com halteres', 'Peito', 3, 12, 14, 75),
        ex('Crucifixo na máquina', 'Peito', 3, 12, 30, 60),
        ex('Tríceps na polia (corda)', 'Tríceps', 3, 12, 20, 60),
      ],
    },
    {
      id: uid(),
      nome: 'Treino B',
      exemplo: true,
      exercicios: [
        ex('Puxada frontal', 'Costas', 4, 10, 45, 90),
        ex('Remada baixa', 'Costas', 3, 12, 40, 75),
        ex('Rosca direta', 'Bíceps', 3, 10, 20, 60),
        ex('Rosca martelo', 'Bíceps', 3, 12, 10, 60),
      ],
    },
    {
      id: uid(),
      nome: 'Treino C',
      exemplo: true,
      exercicios: [
        ex('Agachamento livre', 'Pernas', 4, 10, 50, 120),
        ex('Leg press 45°', 'Pernas', 3, 12, 120, 90),
        ex('Cadeira extensora', 'Pernas', 3, 12, 35, 60),
        ex('Desenvolvimento com halteres', 'Ombros', 3, 10, 14, 75),
        ex('Elevação lateral', 'Ombros', 3, 15, 6, 45),
      ],
    },
  ];

  d.painel = BLOCOS_FIXOS.map(({ inicio, ...b }) => ({ id: b.ref ? `b-${b.ref}` : `b-${b.tipo}`, ...b }));
  d.meta.exemplosCriados = true;
}

/** Remove os dados de exemplo que ainda não foram editados por você. */
export function limparExemplos(d) {
  const removidos = {
    rotina: d.rotina.filter((i) => i.exemplo).length,
    checks: d.checks.filter((c) => c.exemplo).length,
    fichas: d.treinos.fichas.filter((f) => f.exemplo).length,
  };
  d.rotina = d.rotina.filter((i) => !i.exemplo);
  const idsChecks = new Set(d.checks.filter((c) => c.exemplo).map((c) => c.id));
  d.checks = d.checks.filter((c) => !c.exemplo);
  d.painel = d.painel.filter((b) => !(b.tipo === 'check' && idsChecks.has(b.ref)));
  const idsFichas = new Set(d.treinos.fichas.filter((f) => f.exemplo).map((f) => f.id));
  d.treinos.fichas = d.treinos.fichas.filter((f) => !f.exemplo);
  if (d.treinos.emAndamento && idsFichas.has(d.treinos.emAndamento.fichaId)) d.treinos.emAndamento = null;
  if (idsFichas.has(d.treinos.ultimaFichaId)) d.treinos.ultimaFichaId = null;
  return removidos;
}
