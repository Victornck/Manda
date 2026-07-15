import { createClient } from "@supabase/supabase-js";

// Lê as chaves do .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// Enquanto não configurar, `supabase` fica null e o app mostra estados vazios (sem dados falsos).
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export const isSupabaseReady = Boolean(supabase);

// ---- Camada de dados ----
//
// Schema sugerido (rode no SQL editor do Supabase):
//
//   create table proposals (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid references auth.users not null,
//     client text, company text, client_email text, title text,
//     scope text, items jsonb default '[]',
//     start_date text, end_date text,
//     payment text, revisions text, validity text, bio text,
//     status text default 'Rascunho',
//     created_at timestamptz default now()
//   );
//   alter table proposals enable row level security;
//   create policy "own rows" on proposals
//     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

// Usuário logado (perfil do freelancer). Retorna null quando não há sessão.
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return null;
  return {
    name: u.user_metadata?.name || (u.email ? u.email.split("@")[0] : "Sua conta"),
    email: u.email || "",
    plan: u.user_metadata?.plan || "Plano Free",
  };
}

// Propostas do usuário. Retorna null quando não há backend configurado.
export async function fetchProposals() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email, password) {
  if (!supabase) return { ok: true, mock: true };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { ok: !error, error };
}

export async function signUp(email, password, name, cpf) {
  if (!supabase) return { ok: true, mock: true };
  // Nota: unicidade de CPF (uma conta por CPF) precisa ser garantida no banco,
  // com uma coluna UNIQUE e uma checagem no cadastro. Aqui só passamos o dado.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, cpf } },
  });
  return { ok: !error, error };
}
