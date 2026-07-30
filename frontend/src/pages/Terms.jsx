import LegalDoc from "../components/LegalDoc.jsx";

const SECTIONS = [
  { h: "1. Quem somos", p: [
    "O Manda é uma plataforma online para criar, enviar e acompanhar propostas comerciais, operada por Victor Gabriel Rodrigues Berlinck (“Manda”, “nós”).",
    "Fale com a gente pelo email mandaaisuporte@gmail.com.",
  ] },
  { h: "2. Aceite destes Termos", p: [
    "Ao criar uma conta ou usar o Manda, você concorda com estes Termos de Uso e com a nossa Política de Privacidade. Se não concordar, não utilize o serviço.",
  ] },
  { h: "3. Conta e elegibilidade", p: [
    "Para usar o Manda você deve ter 18 anos ou mais e fornecer informações verdadeiras. É permitida uma conta por CPF.",
    "Você é responsável por manter a confidencialidade da sua senha e por toda atividade realizada na sua conta.",
  ] },
  { h: "4. Planos, cobrança e cancelamento", p: [
    "O Manda tem planos pagos (Básico, Pro e Business), cobrados por período (mensal ou anual). Os pagamentos são processados pelo Mercado Pago, e você escolhe pagar por Pix, cartão ou boleto.",
    "Não há cobrança automática nem renovação automática: o acesso vale pelo período que você pagou. Para continuar depois do vencimento, é só renovar. Você não precisa cancelar nada, e não geramos cobranças novas por conta própria.",
    "Reembolso e direito de arrependimento: conforme o art. 49 do Código de Defesa do Consumidor, em qualquer contratação feita pelo site você pode desistir em até 7 dias corridos, contados do pagamento, e receber a devolução integral do valor daquele período, sem precisar justificar. Passado esse prazo, não há reembolso do período em andamento. Como não existe cobrança automática, você nunca é cobrado por um período que não contratou de propósito.",
    "Os preços podem mudar. Alterações não afetam o período já pago e serão avisadas com antecedência razoável.",
  ] },
  { h: "5. Uso aceitável", p: [
    "Você concorda em não usar o Manda para fins ilícitos, enganosos ou que violem direitos de terceiros, nem tentar comprometer a segurança ou o funcionamento da plataforma.",
    "Podemos suspender ou encerrar contas que violem estes Termos.",
  ] },
  { h: "6. Conteúdo e propriedade", p: [
    "O conteúdo que você insere nas propostas (textos, valores, logo e imagens) é seu. Você nos autoriza a armazenar e exibir esse conteúdo apenas para operar o serviço, inclusive gerando o link público da proposta que você decidir compartilhar.",
    "A marca, o software e o design do Manda pertencem a nós e não podem ser copiados ou reutilizados sem autorização.",
  ] },
  { h: "7. Limitação de responsabilidade", p: [
    "O Manda é fornecido “no estado em que se encontra”. Não garantimos que o serviço será ininterrupto ou livre de erros. Na máxima extensão permitida em lei, não nos responsabilizamos por lucros cessantes ou danos indiretos decorrentes do uso do serviço.",
  ] },
  { h: "8. Alterações destes Termos", p: [
    "Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas, e o uso continuado após a atualização significa concordância com a nova versão.",
  ] },
  { h: "9. Legislação e foro", p: [
    "Estes Termos são regidos pelas leis brasileiras. Para eventuais controvérsias, fica eleito o foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor.",
  ] },
];

export default function Terms() {
  return <LegalDoc title="Termos de Uso" updated="28 de julho de 2026" sections={SECTIONS} />;
}
