import LegalDoc from "../components/LegalDoc.jsx";

const SECTIONS = [
  { h: "1. Controlador e contato", p: [
    "Esta Política explica como o Manda trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).",
    "Controlador: Victor Gabriel Rodrigues Berlinck. Contato para privacidade e encarregado (DPO): mandaaisuporte@gmail.com.",
  ] },
  { h: "2. Dados que coletamos", p: [
    "Cadastro: nome, email e CPF. Sua senha é armazenada de forma criptografada (hash), não temos acesso a ela.",
    "Uso do serviço: as propostas que você cria (nome e empresa do seu cliente, email do cliente, escopo, itens, valores, além da logo e das imagens de capa que você enviar) e os eventos ligados a elas (quando uma proposta é visualizada, aceita ou recusada, incluindo data, hora e o endereço IP de quem abriu o link público).",
    "Pagamento: os dados de pagamento (cartão, Pix ou boleto) são coletados e processados diretamente pelo Mercado Pago. Nós não armazenamos o número do cartão: guardamos apenas identificadores do pagamento (por exemplo, o ID da operação no Mercado Pago) e o status do seu plano.",
  ] },
  { h: "3. Para que usamos (finalidade e base legal)", p: [
    "Fornecer o serviço, criar sua conta e gerar os links de proposta, base legal: execução de contrato.",
    "Processar pagamentos e cumprir obrigações fiscais e legais, execução de contrato e obrigação legal.",
    "Garantir segurança, prevenir fraudes e melhorar o produto, legítimo interesse.",
    "Comunicações e cookies não essenciais, quando aplicável, consentimento.",
  ] },
  { h: "4. Com quem compartilhamos", p: [
    "Utilizamos prestadores que tratam dados em nosso nome (operadores): Mercado Pago (processamento de pagamentos), Supabase (banco de dados), Hostinger (hospedagem) e Google (login com Google e envio de e-mails).",
    "Alguns desses prestadores podem armazenar ou processar dados fora do Brasil (transferência internacional), sempre buscando salvaguardas adequadas. Não vendemos seus dados pessoais.",
  ] },
  { h: "5. Dados do Google e Gmail (Uso Limitado)", p: [
    "Acesso aos dados (Data Access): a conexão com o Google é opcional. Ao conectar, o Manda acessa apenas: (a) a permissão de ENVIO do Gmail (escopo gmail.send), que autoriza enviar e-mails em seu nome; (b) o endereço da conta Google conectada; e (c) seu nome e e-mail básicos do Login com Google (escopos openid, email, profile). O Manda NÃO acessa, lê, importa nem varre o conteúdo da sua caixa de entrada.",
    "Uso dos dados (Data Use): usamos essa permissão exclusivamente para enviar, a seu pedido e a partir da sua conta, os e-mails de proposta e os lembretes que você mesmo dispara para os seus próprios clientes. Não usamos para nenhuma outra finalidade.",
    "Compartilhamento (Data Transfer): não vendemos nem transferimos esses dados a terceiros. O envio dos e-mails ocorre diretamente pela API do Google, em seu nome; nenhum dado do Google é repassado a intermediários para outros fins.",
    "Proteção (Data Protection): o token de acesso é guardado de forma criptografada em repouso e todo o tráfego usa HTTPS. O acesso fica restrito ao mínimo necessário para o envio.",
    "Retenção e exclusão (Data Retention & Deletion): guardamos o token de acesso e o endereço do Gmail conectado apenas enquanto a conexão estiver ativa. Você pode desconectar a qualquer momento em Configurações, ou revogar em myaccount.google.com/permissions; ao desconectar, ou ao excluir sua conta, esses dados do Google são apagados. Não retemos o conteúdo dos e-mails enviados.",
    "Uso Limitado (Limited Use): o uso e a transferência, pelo Manda, de informações recebidas das APIs do Google seguem a Política de Dados do Usuário dos Serviços de API do Google (Google API Services User Data Policy), incluindo os requisitos de Uso Limitado (Limited Use), disponível em https://developers.google.com/terms/api-services-user-data-policy. Não usamos esses dados para publicidade, não os vendemos, e não permitimos que pessoas os leiam, exceto com o seu consentimento explícito, por motivos de segurança, para cumprir a lei, ou em operações internas com dados agregados e anonimizados.",
  ] },
  { h: "6. Link público da proposta", p: [
    "Quando você conclui uma proposta, geramos um link público. Qualquer pessoa com o link pode ver o conteúdo daquela proposta (sem acesso aos seus dados de conta). Você controla para quem envia o link.",
  ] },
  { h: "7. Por quanto tempo guardamos", p: [
    "Mantemos seus dados enquanto sua conta estiver ativa e pelo prazo necessário para cumprir obrigações legais (por exemplo, dados fiscais podem ser mantidos por até 5 anos). Depois disso, os dados são excluídos ou anonimizados.",
  ] },
  { h: "8. Seus direitos (LGPD)", p: [
    "Você pode solicitar, a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização ou exclusão, portabilidade, informação sobre com quem compartilhamos e revogação de consentimento. Basta escrever para mandaaisuporte@gmail.com.",
  ] },
  { h: "9. Segurança", p: [
    "Adotamos medidas técnicas e organizacionais para proteger seus dados, como criptografia de senhas e controle de acesso. Nenhum sistema é totalmente imune, mas trabalhamos continuamente para reduzir riscos.",
  ] },
  { h: "10. Cookies e armazenamento local", p: [
    "Usamos apenas cookies e armazenamento local essenciais, para manter você logado e para o funcionamento do aplicativo. Não usamos cookies de rastreamento, analytics ou publicidade. Se isso mudar, atualizaremos esta Política e pediremos seu consentimento quando necessário.",
  ] },
  { h: "11. Alterações desta Política", p: [
    "Podemos atualizar esta Política. Mudanças relevantes serão comunicadas, e a data de “última atualização” no topo será revisada.",
  ] },
];

export default function Privacy() {
  return <LegalDoc title="Política de Privacidade" updated="6 de agosto de 2026" sections={SECTIONS} />;
}
