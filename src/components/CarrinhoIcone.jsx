import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCarrinho } from "../context/CarrinhoContext";

function CarrinhoIcone({ className = "" }) {
    const { totalItens } = useCarrinho();

    return (
        <Link
            to="/carrinho"
            className={`mf-cart-icon ${className}`.trim()}
            aria-label={`Carrinho${totalItens ? `, ${totalItens} itens` : ""}`}
        >
            <ShoppingCart size={20} />
            {totalItens > 0 && (
                <span className="mf-cart-badge" aria-hidden="true">
                    {totalItens > 99 ? "99+" : totalItens}
                </span>
            )}
        </Link>
    );
}

export default CarrinhoIcone;