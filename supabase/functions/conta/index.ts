// Edge Function "conta" do Do It Better.
// O app NÃO envia e-mails: o cadastro cria a conta já confirmada e gera um
// CÓDIGO DE RECUPERAÇÃO (mostrado uma vez). Com ele a pessoa troca a senha.
//   POST { acao: 'cadastrar', email, senha, nick, convite? } -> { ok, codigo, indicado }
//   POST { acao: 'recuperar', email, codigo, senha }         -> { ok, codigo (novo) }
//   POST { acao: 'novo-codigo' }  (logado)                   -> { ok, codigo }
//   POST { acao: 'excluir' }      (logado)                   -> { ok }
// Publicada com verify_jwt = false (a função confere o login sozinha onde precisa).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const erro = (msg: string, status = 400) => json({ ok: false, erro: msg }, status);

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// palavrões longos são barrados em qualquer parte do nick; os curtos só se forem o nick inteiro
// (assim "carolina" e "computador" continuam valendo)
const PALAVROES = ['porra', 'caralho', 'buceta', 'merda', 'viado', 'cuzao', 'piroca', 'xoxota', 'arrombad', 'nazi', 'hitler'];
const RESERVADOS = ['admin', 'suporte', 'doitbetter', 'fdp', 'pqp', 'puta', 'foda', 'rola', 'xota', 'cu'];
const nickValido = (n: string) => {
  const limpo = n.replace(/[._0-9]/g, '');
  return /^[a-z0-9_.]{3,20}$/.test(n) && !PALAVROES.some((p) => limpo.includes(p)) && !RESERVADOS.includes(limpo);
};
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120;

// código legível: 12 letras/números sem ambíguos (0/O, 1/I), em 3 blocos
function gerarCodigo() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(b, (x) => abc[x % abc.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
async function hash(codigo: string) {
  const limpo = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dib:' + limpo));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, '0')).join('');
}
async function guardarCodigo(userId: string) {
  const codigo = gerarCodigo();
  const { error } = await admin.from('recuperacao').upsert({ user_id: userId, codigo_hash: await hash(codigo), criado_em: new Date().toISOString() });
  if (error) throw error;
  return codigo;
}
async function usuarioDoToken(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return erro('Método não permitido', 405);
  let corpo: Record<string, string> = {};
  try {
    corpo = await req.json();
  } catch (_) {
    return erro('Pedido inválido');
  }
  try {
    const acao = corpo.acao;

    if (acao === 'cadastrar') {
      const email = String(corpo.email || '').trim().toLowerCase();
      const senha = String(corpo.senha || '');
      const nick = String(corpo.nick || '').trim().toLowerCase().replace(/^@/, '');
      const convite = String(corpo.convite || '').trim().toLowerCase().replace(/^@/, '').slice(0, 20);
      if (!emailValido(email)) return erro('E-mail inválido.');
      if (senha.length < 6 || senha.length > 72) return erro('A senha precisa ter de 6 a 72 caracteres.');
      if (!nickValido(nick)) return erro('Nick inválido: use de 3 a 20 letras minúsculas, números, _ ou . (sem palavrões).');
      const { data: ja } = await admin.from('perfis').select('id').eq('nick', nick).maybeSingle();
      if (ja) return erro('Esse nick já está em uso. Escolha outro.');
      const { data: idExistente } = await admin.rpc('id_por_email', { p_email: email });
      if (idExistente) return erro('Já existe uma conta com esse e-mail. Toque em "Já tenho conta".');
      const { data: criado, error: e1 } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nick } });
      if (e1 || !criado.user) return erro('Não foi possível criar a conta: ' + (e1?.message || 'erro desconhecido'));
      const { error: e2 } = await admin.from('perfis').insert({ id: criado.user.id, nick });
      if (e2) {
        await admin.auth.admin.deleteUser(criado.user.id);
        return erro(e2.code === '23505' ? 'Esse nick já está em uso. Escolha outro.' : 'Não foi possível criar o perfil.');
      }
      const codigo = await guardarCodigo(criado.user.id);
      // indicação: quem convidou vira amigo e os dois ganham prêmio (nunca impede o cadastro)
      let indicado = false;
      if (/^[a-z0-9_.]{3,20}$/.test(convite) && convite !== nick) {
        const { data } = await admin.rpc('registrar_indicacao', { p_novo: criado.user.id, p_nick: convite });
        indicado = !!data;
      }
      return json({ ok: true, codigo, indicado });
    }

    if (acao === 'recuperar') {
      const email = String(corpo.email || '').trim().toLowerCase();
      const senha = String(corpo.senha || '');
      if (senha.length < 6 || senha.length > 72) return erro('A nova senha precisa ter de 6 a 72 caracteres.');
      const { data: id } = await admin.rpc('id_por_email', { p_email: email });
      // mesma resposta para e-mail inexistente e código errado (não revela contas)
      const falha = () => erro('E-mail ou código de recuperação incorretos.');
      if (!id) return falha();
      const { data: reg } = await admin.from('recuperacao').select('codigo_hash').eq('user_id', id).maybeSingle();
      if (!reg || reg.codigo_hash !== (await hash(String(corpo.codigo || '')))) return falha();
      const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
      if (error) return erro('Não foi possível trocar a senha.');
      const codigo = await guardarCodigo(id); // o código usado deixa de valer
      return json({ ok: true, codigo });
    }

    if (acao === 'novo-codigo') {
      const u = await usuarioDoToken(req);
      if (!u) return erro('Entre na sua conta primeiro.', 401);
      return json({ ok: true, codigo: await guardarCodigo(u.id) });
    }

    if (acao === 'excluir') {
      const u = await usuarioDoToken(req);
      if (!u) return erro('Entre na sua conta primeiro.', 401);
      const { error } = await admin.auth.admin.deleteUser(u.id); // apaga perfil, save, amizades e grupos (cascata)
      if (error) return erro('Não foi possível excluir a conta.');
      return json({ ok: true });
    }

    return erro('Ação desconhecida.');
  } catch (e) {
    console.error(e);
    return erro('Erro no servidor. Tente de novo em instantes.', 500);
  }
});
