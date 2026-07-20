import LegalDoc from "../components/LegalDoc.jsx";

const SECTIONS = [
  { h: "1. Controlador e contato", p: [
    "Esta Política explica como o Manda trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).",
    "Controlador: [NOME/RAZÃO SOCIAL], CNPJ [CNPJ]. Encarregado pelo tratamento de dados (DPO) e contato para privacidade: [EMAIL DE CONTATO].",
  ] },
  { h: "2. Dados que coletamos", p: [
    "Cadastro: nome, email e CPF. Sua senha é armazenada de forma criptografada (hash) — não temos acesso a ela.",
    "Uso do serviço: as propostas que você cria (nome e empresa do seu cliente, email do cliente, escopo, itens, valores, além da logo e das imagens de capa que você enviar) e os eventos ligados a elas (quando uma proposta é visualizada, aceita ou recusada, incluindo data, hora e o endereço IP de quem abriu o link público).",
    "Pagamento: os dados do cartão são coletados e processados diretamente pela Stripe. Nós não armazenamos o número do cartão — guardamos apenas identificadores da assinatura (por exemplo, IDs de cliente e de assinatura da Stripe) e o status do seu plano.",
  ] },
  { h: "3. Para que usamos (finalidade e base legal)", p: [
    "Fornecer o serviço, criar sua conta e gerar os links de proposta — base legal: execução de contrato.",
    "Processar pagamentos e cumprir obrigações fiscais e legais — execução de contrato e obrigação legal.",
    "Garantir segurança, prevenir fraudes e melhorar o produto — legítimo interesse.",
    "Comunicações e cookies não essenciais, quando aplicável — consentimento.",
  ] },
  { h: "4. Com quem compartilhamos", p: [
    "Utilizamos prestadores que tratam dados em nosso nome (operadores): Stripe (processamento de pagamentos), Supabase (banco de dados) e Vercel (hospedagem).",
    "Alguns desses prestadores podem armazenar ou processar dados fora do Brasil (transferência internacional), sempre buscando salvaguardas adequadas. Não vendemos seus dados pessoais.",
  ] },
  { h: "5. Link público da proposta", p: [
    "Quando você conclui uma proposta, geramos um link público. Qualquer pessoa com o link pode ver o conteúdo daquela proposta (sem acesso aos seus dados de conta). Você controla para quem envia o link.",
  ] },
  { h: "6. Por quanto tempo guardamos", p: [
    "Mantemos seus dados enquanto sua conta estiver ativa e pelo prazo necessário para cumprir obrigações legais (por exemplo, dados fiscais podem ser mantidos por até 5 anos). Depois disso, os dados são excluídos ou anonimizados.",
  ] },
  { h: "7. Seus direitos (LGPD)", p: [
    "Você pode solicitar, a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização ou exclusão, portabilidade, informação sobre com quem compartilhamos e revogação de consentimento. Basta escrever para [EMAIL DE CONTATO].",
  ] },
  { h: "8. Segurança", p: [
    "Adotamos medidas técnicas e organizacionais para proteger seus dados, como criptografia de senhas e controle de acesso. Nenhum sistema é totalmente imune, mas trabalhamos continuamente para reduzir riscos.",
  ] },
  { h: "9. Cookies e armazenamento local", p: [
    "Usamos cookies e armazenamento local essenciais para manter você logado e para o funcionamento do aplicativo. [Se você adotar ferramentas de analytics ou marketing, descreva-as aqui e colete consentimento.]",
  ] },
  { h: "10. Alterações desta Política", p: [
    "Podemos atualizar esta Política. Mudanças relevantes serão comunicadas, e a data de “última atualização” no topo será revisada.",
  ] },
];

export default function Privacy() {
  return <LegalDoc title="Política de Privacidade" updated="20 de julho de 2026" sections={SECTIONS} />;
}
