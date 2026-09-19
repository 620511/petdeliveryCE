export default function PrivacyPolicy() {
  return <Legal title="Política de Privacidade">
    <p>Esta página descreve, de forma geral, como o PetDeliveryCE trata dados pessoais. O documento deve ser revisado e aprovado juridicamente antes da publicação definitiva.</p>
    <h2>1. Dados tratados</h2>
    <p>Podemos tratar dados necessários para cadastro, autenticação, atendimento, pedidos, entrega, pagamentos, segurança e funcionamento da plataforma, conforme a finalidade aplicável.</p>
    <h2>2. Finalidades</h2>
    <p>Os dados são utilizados para prestar os serviços, processar pedidos, manter a segurança, cumprir obrigações legais e exercer direitos. Comunicações promocionais dependem da base legal aplicável e, quando necessário, da escolha do titular.</p>
    <h2>3. Compartilhamento</h2>
    <p>Dados podem ser compartilhados com lojistas envolvidos no pedido e prestadores necessários à operação, pagamentos, infraestrutura e segurança, somente na medida necessária e conforme as responsabilidades aplicáveis.</p>
    <h2>4. Direitos</h2>
    <p>O titular pode exercer os direitos previstos na LGPD pelos canais disponibilizados na plataforma, sujeitos às hipóteses legais de conservação e demais requisitos aplicáveis.</p>
    <h2>5. Segurança</h2>
    <p>Adotamos medidas técnicas e administrativas de segurança, controle de acesso, autenticação, registros de auditoria e gestão de incidentes, buscando reduzir riscos de acesso, perda, alteração ou divulgação indevida.</p>
    <h2>6. Retenção</h2>
    <p>Os dados são mantidos pelo período necessário às finalidades informadas e às obrigações legais, regulatórias ou de exercício regular de direitos.</p>
    <h2>7. Atualizações</h2>
    <p>Esta política poderá ser atualizada. A versão vigente e a data de atualização devem ser informadas na publicação.</p>
  </Legal>;
}
function Legal({ title, children }) { return <div style={{maxWidth:800,margin:"0 auto",padding:"35px 18px",fontFamily:"system-ui",lineHeight:1.65}}><h1 style={{color:"#F15A24"}}>{title}</h1>{children}<p style={{marginTop:40,color:"#777"}}>PetDeliveryCE — versão 1.0</p></div>; }
