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
    "O Manda tem planos pagos (Básico, Pro e Business), cobrados por período (mensal ou anual). Os pagamentos são processados pelo Mercado Pago, e você escolhe a forma de pagamento na tela dele.",
    "Duas formas de contratar. Pagamento avulso: você paga um período e o acesso vale por ele; nada é cobrado de novo automaticamente, e para continuar depois do vencimento é só pagar outra vez. Assinatura com renovação automática (disponível no cartão): o Mercado Pago cobra o valor do plano a cada ciclo, sem você precisar fazer nada, até que você cancele. Você escolhe qual das duas quer no momento da contratação, e a opção escolhida fica indicada antes da confirmação do pagamento.",
    "Cancelamento da renovação automática: pode ser feito a qualquer momento, sozinho, em Configurações > Plano e uso, sem taxa e sem precisar falar com ninguém. Depois de cancelar, você continua com acesso até o fim do período que já foi pago e não é cobrado de novo.",
    "Se o pagamento não entrar no vencimento, a conta não é apagada nem rebaixada: ela fica aguardando pagamento, em modo somente leitura. Você continua vendo suas propostas e os links já enviados seguem no ar, mas criar, enviar e baixar ficam bloqueados até a regularização. Há 3 dias de carência após o vencimento.",
    "Direito de arrependimento (7 dias): conforme o art. 49 do Código de Defesa do Consumidor, em qualquer contratação feita pelo site você pode desistir em até 7 dias corridos, contados do pagamento, e receber de volta o valor integral daquele período, monetariamente atualizado, sem precisar justificar e sem qualquer desconto — inclusive se já tiver usado o serviço nesse intervalo. Esse direito não é afetado pela existência do plano Gratuito nem por qualquer outra condição destes Termos.",
    "Como pedir: o pedido de reembolso é feito dentro do próprio aplicativo, em Configurações > Reembolso, que é a mesma ferramenta usada para contratar, conforme o art. 5º do Decreto nº 7.962/2013. Você recebe a confirmação do recebimento por e-mail na hora, e a resposta em até 5 dias. Também é possível escrever para mandaaisuporte@gmail.com. O estorno é feito pelo mesmo meio do pagamento: no cartão, o valor volta na fatura; no Pix, volta para a conta usada no pagamento.",
    "Depois dos 7 dias: nos planos mensais, não há devolução do mês em andamento, que já estará em curso. Nos planos anuais, se você cancelar antes do fim do prazo, devolvemos o valor proporcional aos meses cheios ainda não usufruídos, contados a partir do pedido.",
    "Os preços podem mudar. Alterações não afetam o período já pago e serão avisadas com antecedência razoável. Em caso de aumento em assinatura com renovação automática, você é avisado antes da próxima cobrança e pode cancelar sem custo.",
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
  return <LegalDoc title="Termos de Uso" updated="14 de setembro de 2026" sections={SECTIONS} />;
}
