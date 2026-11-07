import { Link } from "react-router-dom";
import { ArrowRight, Mail, MessageCircleQuestion } from "lucide-react";

const perguntas = [
  {
    pergunta: "Como faço um pedido?",
    resposta:
      "Escolha produtos de uma única loja, adicione-os ao pedido e envie-o pelo catálogo. A loja receberá o pedido para confirmação.",
  },
  {
    pergunta: "Como combino a entrega e o pagamento?",
    resposta:
      "O Mercado Fresko não processa pagamentos nem calcula entregas. Depois de enviar o pedido, combine esses detalhes diretamente com o comerciante.",
  },
  {
    pergunta: "Posso cancelar um pedido?",
    resposta:
      "Pode cancelar enquanto o pedido estiver pendente de confirmação. Depois de confirmado, contacte diretamente a loja.",
  },
  {
    pergunta: "Como guardo um produto para mais tarde?",
    resposta:
      "No catálogo, selecione o ícone de coração no produto. Os favoritos ficam associados à sua conta.",
  },
];

export default function ClienteAjuda() {
  return (
    <main className="mf-client-content">
      <div className="mf-client-page-heading">
        <div>
          <span className="mf-client-eyebrow">ESTAMOS AQUI PARA AJUDAR</span>
          <h1>Ajuda e suporte</h1>
          <p>Respostas rápidas sobre pedidos e utilização da plataforma.</p>
        </div>
        <span className="mf-client-page-heading-icon">
          <MessageCircleQuestion size={27} />
        </span>
      </div>

      <section className="mf-client-help-list" aria-label="Perguntas frequentes">
        {perguntas.map((item) => (
          <article key={item.pergunta}>
            <h2>{item.pergunta}</h2>
            <p>{item.resposta}</p>
          </article>
        ))}
      </section>

      <section className="mf-client-help-contact">
        <span><Mail size={22} /></span>
        <div>
          <h2>Precisa de ajuda adicional?</h2>
          <p>Fale com a equipa do Mercado Fresko por e-mail.</p>
        </div>
        <a href="mailto:contacto@mercadofresko.ao">
          Enviar e-mail <ArrowRight size={16} />
        </a>
      </section>

      <p className="mf-client-help-back">
        <Link to="/cliente">Voltar à visão geral</Link>
      </p>
    </main>
  );
}
