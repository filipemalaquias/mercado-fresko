import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBasket, Trash2, ArrowRight, ShieldCheck, Truck, ReceiptText } from "lucide-react";
import { useCarrinho } from "../../context/CarrinhoContext";
import "./ClienteCarrinho.css";

const formatarPreco = (valor) =>
  valor.toLocaleString("pt-AO", { style: "currency", currency: "AOA" });

export default function ClienteCarrinho() {
  const navigate = useNavigate();
  const { itens, remover, alterarQuantidade, limparCarrinho } = useCarrinho();

  // 1. Cálculo do Subtotal
  const subtotal = itens.reduce((acc, item) => {
    const preco = Number(item.preco ?? item.precoVenda ?? 0);
    return acc + preco * item.quantidade;
  }, 0);

  // 2. Configurações de Frete e Imposto (Pode alterar estes valores conforme a sua regra de negócio)
  const taxaEntrega = itens.length > 0 ? 1000 : 0; 
  const percentagemImposto = 0.14; // Exemplo: 14% de IVA (ou o valor que preferir)
  const imposto = subtotal * percentagemImposto;
  
  // 3. Cálculo do Total
  const total = subtotal + taxaEntrega + imposto;

  // Se o carrinho estiver vazio
  if (itens.length === 0) {
    return (
      <div className="carrinho-page carrinho-vazio">
        <div className="carrinho-vazio-icon">
          <ShoppingBasket size={48} strokeWidth={1.5} />
        </div>
        <h2>O seu carrinho está vazio</h2>
        <p>Parece que ainda não adicionou nenhum produto. Explore o mercado e encontre o que precisa.</p>
        <Link to="/cliente/produtos" className="carrinho-btn-primary">
          Explorar catálogo <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="carrinho-page">
      <div className="carrinho-header">
        <button onClick={() => navigate(-1)} className="carrinho-back">
          <ArrowLeft size={20} /> Continuar a comprar
        </button>
        <h1>O seu Carrinho</h1>
        <button onClick={limparCarrinho} className="carrinho-clear">
          <Trash2 size={16} /> Limpar tudo
        </button>
      </div>

      <div className="carrinho-grid">
        {/* Lista de Produtos */}
        <div className="carrinho-lista">
          {itens.map((item) => {
            const preco = Number(item.preco ?? item.precoVenda ?? 0);
            const imagem = item.imagemURL ?? item.imagemUrl ?? item.imagem ?? "https://placehold.co/150x150?text=Sem+Imagem";
            const nome = item.nome ?? item.nomeProduto ?? "Produto";

            return (
              <div key={item.id} className="carrinho-item">
                <Link to={`/cliente/produtos/${item.id}`} className="carrinho-item-img-link">
                  <img src={imagem} alt={nome} className="carrinho-item-img" />
                </Link>
                
                <div className="carrinho-item-info">
                  <Link to={`/cliente/produtos/${item.id}`} className="carrinho-item-nome">
                    {nome}
                  </Link>
                  <p className="carrinho-item-preco-unit">{formatarPreco(preco)} / un</p>
                  
                  <div className="carrinho-item-actions">
                    <div className="carrinho-qtd">
                      <button 
                        onClick={() => alterarQuantidade(item.id, item.quantidade - 1)} 
                        disabled={item.quantidade <= 1}
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantidade}</span>
                      <button 
                        onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <button onClick={() => remover(item.id)} className="carrinho-remove" aria-label="Remover produto">
                      <Trash2 size={16} /> Remover
                    </button>
                  </div>
                </div>

                <div className="carrinho-item-total">
                  {formatarPreco(preco * item.quantidade)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo do Pedido */}
        <aside className="carrinho-resumo">
          <h2>Resumo do Pedido</h2>
          
          <div className="resumo-linhas">
            <div className="resumo-linha">
              <span>Subtotal ({itens.length} {itens.length === 1 ? 'artigo' : 'artigos'})</span>
              <span>{formatarPreco(subtotal)}</span>
            </div>
            
            <div className="resumo-linha">
              <span className="resumo-label-icon">
                <Truck size={16} /> Taxa de entrega
              </span>
              <span>{formatarPreco(taxaEntrega)}</span>
            </div>

            <div className="resumo-linha">
              <span className="resumo-label-icon">
                <ReceiptText size={16} /> Imposto (14%)
              </span>
              <span>{formatarPreco(imposto)}</span>
            </div>
          </div>
          
          <div className="resumo-total">
            <span>Total a pagar</span>
            <strong>{formatarPreco(total)}</strong>
          </div>

          <button 
            className="carrinho-btn-checkout"
            onClick={() => navigate("/cliente/finalizar-encomenda")}
          >
            Finalizar Encomenda <ArrowRight size={18} />
          </button>

          <div className="carrinho-seguro">
            <ShieldCheck size={18} />
            <span>Compra 100% Segura</span>
          </div>
        </aside>
      </div>
    </div>
  );
}