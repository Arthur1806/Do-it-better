// =============================================================
// nuvem.js — conexão com o servidor (Supabase), sem biblioteca externa.
//
// • A CHAVE abaixo é a chave PÚBLICA do projeto (pode ficar no GitHub):
//   quem protege os dados são as regras de segurança do banco (RLS).
// • A sessão (tokens de login) fica no localStorage deste aparelho, numa
//   chave separada dos dados do jogo.
// • O app NÃO manda e-mails: o cadastro cria a conta já confirmada e
//   devolve um código de recuperação (Edge Function "conta").
// =============================================================

export const URL_NUVEM = 'https://qrqmqrapxgxnocklgunm.supabase.co';
const CHAVE = 'sb_publishable_WAVfgcUDh0MbhjjqU-fYPw_DOvD_L0o';
const CHAVE_SESSAO = 'doitbetter:sessao';

let sessao = lerSessao();
const ouvintes = new Set();

function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
  } catch (_) {
    return null;
  }
}
function gravarSessao(s) {
  sessao = s;
  try {
    if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch (_) {}
  ouvintes.forEach((fn) => fn(s));
}

/** Avisa quando entra ou sai da conta. */
export function aoMudarSessao(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export const logado = () => !!(sessao && sessao.refresh_token);
export const usuario = () => (sessao ? sessao.user : null);
export const online = () => navigator.onLine !== false;

/** Erro com mensagem amigável. */
class ErroNuvem extends Error {
  constructor(msg, status) {
    super(msg);
    this.status = status;
  }
}

async function pedir(caminho, { metodo = 'POST', corpo, token, cabecalhos = {} } = {}) {
  if (!online()) throw new ErroNuvem('Sem internet agora. Seus dados ficam salvos no aparelho.', 0);
  let resp;
  try {
    resp = await fetch(URL_NUVEM + caminho, {
      method: metodo,
      headers: {
        apikey: CHAVE,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...cabecalhos,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch (_) {
    throw new ErroNuvem('Não consegui falar com o servidor. Verifique a internet.', 0);
  }
  const texto = await resp.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (_) {
    dados = texto;
  }
  if (!resp.ok) {
    const msg = (dados && (dados.erro || dados.msg || dados.error_description || dados.message)) || `Erro ${resp.status}`;
    throw new ErroNuvem(traduzir(msg), resp.status);
  }
  return dados;
}

function traduzir(msg) {
  const m = String(msg);
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/refresh token/i.test(m)) return 'Sua sessão expirou. Entre de novo.';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return m;
}

function guardarTokens(t) {
  gravarSessao({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expira: Date.now() + (t.expires_in || 3600) * 1000,
    user: { id: t.user.id, email: t.user.email },
  });
}

// -------------------------------------------------------------
// Conta
// -------------------------------------------------------------

/** Cria a conta (sem e-mail de confirmação). Devolve o código de recuperação. */
export async function cadastrar(email, senha, nick) {
  const r = await pedir('/functions/v1/conta', { corpo: { acao: 'cadastrar', email, senha, nick } });
  if (!r || !r.ok) throw new ErroNuvem((r && r.erro) || 'Não foi possível criar a conta.');
  await entrar(email, senha);
  return r.codigo;
}

export async function entrar(email, senha) {
  const t = await pedir('/auth/v1/token?grant_type=password', { corpo: { email: email.trim(), password: senha } });
  guardarTokens(t);
  return usuario();
}

/** Troca a senha com o código de recuperação. Devolve o NOVO código. */
export async function recuperarSenha(email, codigo, novaSenha) {
  const r = await pedir('/functions/v1/conta', { corpo: { acao: 'recuperar', email, codigo, senha: novaSenha } });
  if (!r || !r.ok) throw new ErroNuvem((r && r.erro) || 'Não foi possível trocar a senha.');
  await entrar(email, novaSenha);
  return r.codigo;
}

export async function novoCodigo() {
  const r = await pedir('/functions/v1/conta', { corpo: { acao: 'novo-codigo' }, token: await token() });
  return r.codigo;
}

export async function excluirConta() {
  await pedir('/functions/v1/conta', { corpo: { acao: 'excluir' }, token: await token() });
  gravarSessao(null);
}

export async function sair() {
  const t = sessao && sessao.access_token;
  gravarSessao(null);
  if (t) pedir('/auth/v1/logout', { token: t }).catch(() => {});
}

/** Token válido (renova sozinho quando está perto de vencer). */
let renovando = null;
export async function token() {
  if (!logado()) throw new ErroNuvem('Entre na sua conta primeiro.', 401);
  if (sessao.expira - Date.now() > 60000) return sessao.access_token;
  if (!renovando) {
    renovando = pedir('/auth/v1/token?grant_type=refresh_token', { corpo: { refresh_token: sessao.refresh_token } })
      .then(guardarTokens)
      .catch((e) => {
        if (e.status === 400 || e.status === 401) gravarSessao(null); // sessão inválida: precisa entrar de novo
        throw e;
      })
      .finally(() => (renovando = null));
  }
  await renovando;
  return sessao.access_token;
}

// -------------------------------------------------------------
// Banco
// -------------------------------------------------------------

/** Chama uma função do banco (as regras ficam no servidor). */
export async function rpc(nome, args = {}) {
  return pedir(`/rest/v1/rpc/${nome}`, { corpo: args, token: await token() });
}

/** Lê o save da nuvem: { rev, dados, atualizado_em } ou null. */
export async function lerSave({ comDados = true } = {}) {
  const sel = comDados ? 'rev,dados,atualizado_em,dispositivo' : 'rev,atualizado_em,dispositivo';
  const r = await pedir(`/rest/v1/saves?select=${sel}`, { metodo: 'GET', token: await token() });
  return Array.isArray(r) && r.length ? r[0] : null;
}

/** Meu perfil público (nick, código de amigo...). */
export async function meuPerfil() {
  const u = usuario();
  if (!u) return null;
  const r = await pedir(`/rest/v1/perfis?select=id,nick,codigo,no_ranking,nick_trocado_em&id=eq.${u.id}`, { metodo: 'GET', token: await token() });
  return Array.isArray(r) && r.length ? r[0] : null;
}
