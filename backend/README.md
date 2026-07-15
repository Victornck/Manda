# Backend

Ainda não implementado.

Aqui vai ficar a camada de servidor quando você ligar dados reais:
autenticação, banco (Supabase) e funções de envio de proposta.
Sugestão de conteúdo futuro:

- migrations SQL do Supabase (tabela `proposals`, políticas RLS)
- edge functions (envio de email, geração de link único)
- variáveis de ambiente do servidor

Por enquanto, toda a lógica de dados vive no cliente
(`frontend/src/lib/supabase.js` e `frontend/src/lib/drafts.js`).
