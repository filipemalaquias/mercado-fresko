import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Minus,
    Plus,
    ShoppingCart,
    Store,
    Trash2,
    ShieldCheck
} from "lucide-react";

import Header from "../components/Header";
import MenuCliente from "../components/MenuCliente";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/config";
import { useCarrinho } from "../context/CarrinhoContext";
import imagemProdutoPadrao from "../assets/hero.png";
import "../styles/carrinho.css";

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-AO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function Carrinho() {
    const { itens, subtotal, atualizarQuantidade, remover, limpar } = useCarrinho();
    const navigate = useNavigate();

    const [perfil, setPerfil] = useState(null);
    const [carregandoAuth, setCarregandoAuth] = useState(true);

    useEffect(() => {
        const cancelar = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setPerfil(null);
                setCarregandoAuth(false);
                return;
            }
            try {
                const snap = await getDoc(doc(db, "usuarios", user.uid));
                if (snap.exists()) {
                    const dados = snap.data();
                    const tipo = dados.perfil?.tipo || dados.tipo;
                    if (tipo === "cliente") {
                        setPerfil(dados);
                    } else {
                        setPerfil(null);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
                setPerfil(null);
            } finally {
                setCarregandoAuth(false);
            }
        });
        return () => cancelar();
    }, []);

    const totalItens = itens.reduce((acc, i) => acc + i.quantidade, 0);

    // Agrupar os itens pela loja
    const porLoja = itens.reduce((acc, item) => {
        const chave = item.comercianteId || "geral";
        if (!acc[chave]) {
            acc[chave] = {
                nome: item.lojaNome || "Comércio local",
                comercianteId: item.comercianteId,
                itens: [],
            };
        }
        acc[chave].itens.push(item);
        return acc;
    }, {});

    const lojas = Object.values(porLoja);

    if (carregandoAuth) {
        return <div style={{ minHeight: "100vh", background: "#fafaf7" }} />;
    }

    return (
        <>
            {perfil ? (
                <MenuCliente usuario={perfil} onLogout={() => auth.signOut()} />
            ) : (
                <Header />
            )}

            <main className="mf-cart-page">
                {/* 👇 HERO BANNER (O azul/petróleo no topo) */}
                <section className="mf-cart-hero">
                    <div className="mf-cart-hero-content">
                        <div className="mf-cart-hero-icon">
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <h1>O seu carrinho</h1>
                            <p>
                                {totalItens === 0
                                    ? "Ainda não adicionou produtos."
                                    : `Tem ${totalItens} ${totalItens === 1 ? "item" : "itens"} prontos para a sua mesa.`}
                            </p>
                        </div>
                    </div>
                    <div className="mf-cart-hero-badge">
                        <ShieldCheck size={16} /> Compra 100% Segura
                    </div>
                </section>

                <div className="mf-cart-container">
                    {/* Breadcrumb */}
                    <nav className="mf-cart-breadcrumb">
                        <Link to="/">Início</Link>
                        <span>/</span>
                        <span>Carrinho</span>
                    </nav>

                    <div className="mf-cart-header-actions">
                        <button
                            type="button"
                            className="mf-cart-back"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft size={16} />
                            Continuar a explorar
                        </button>

                        {itens.length > 0 && (
                            <button
                                type="button"
                                className="mf-cart-clear"
                                onClick={limpar}
                            >
                                <Trash2 size={15} />
                                Limpar tudo
                            </button>
                        )}
                    </div>

                    {itens.length === 0 ? (
                        <div className="mf-cart-empty">
                            <span className="mf-cart-empty-icon">
                                <ShoppingCart size={40} />
                            </span>
                            <h2>O carrinho está vazio</h2>
                            <p>
                                Explore o mercado e adicione produtos frescos ao seu carrinho.
                            </p>
                            <Link to="/" className="mf-cart-btn mf-cart-btn-primary">
                                Descobrir produtos
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        <div className="mf-cart-layout">
                            {/* Lista de Itens */}
                            <div className="mf-cart-lista">
                                {lojas.map((loja) => (
                                    <div className="mf-cart-loja" key={loja.comercianteId || "geral"}>
                                        <div className="mf-cart-loja-header">
                                            <Store size={15} />
                                            <strong>{loja.nome}</strong>
                                        </div>

                                        {loja.itens.map((item) => (
                                            <div className="mf-cart-item" key={item.id}>
                                                <Link to={`/produto/${item.id}`} className="mf-cart-item-img">
                                                    <img
                                                        src={item.imagemUrl || imagemProdutoPadrao}
                                                        alt={item.nome}
                                                    />
                                                </Link>

                                                <div className="mf-cart-item-info">
                                                    <Link to={`/produto/${item.id}`} className="mf-cart-item-nome">
                                                        {item.nome}
                                                    </Link>
                                                    <span className="mf-cart-item-preco">
                                                        {formatarPreco(item.preco)} Kz
                                                        <small> / {item.unidade}</small>
                                                    </span>
                                                    <span className="mf-cart-item-stock">
                                                        <CheckCircle2 size={12} />
                                                        {item.stock} em stock
                                                    </span>
                                                </div>

                                                <div className="mf-cart-item-actions">
                                                    <div className="mf-cart-qty">
                                                        <button
                                                            type="button"
                                                            onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                                                            aria-label="Diminuir"
                                                        >
                                                            <Minus size={13} />
                                                        </button>
                                                        <span>{item.quantidade}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                                                            aria-label="Aumentar"
                                                            disabled={item.quantidade >= item.stock}
                                                        >
                                                            <Plus size={13} />
                                                        </button>
                                                    </div>

                                                    <span className="mf-cart-item-total">
                                                        {formatarPreco(item.preco * item.quantidade)} Kz
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="mf-cart-remove"
                                                        onClick={() => remover(item.id)}
                                                        aria-label={`Remover ${item.nome}`}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Resumo */}
                            <aside className="mf-cart-resumo">
                                <h2>Resumo do pedido</h2>
                                
                                <div className="mf-cart-resumo-linha">
                                    <span>Subtotal</span>
                                    <strong>{formatarPreco(subtotal)} Kz</strong>
                                </div>
                                <div className="mf-cart-resumo-linha">
                                    <span>Itens</span>
                                    <strong>{totalItens}</strong>
                                </div>
                                <div className="mf-cart-resumo-linha">
                                    <span>Entrega</span>
                                    <span style={{ color: "#1b7c3e", fontWeight: 600 }}>A combinar</span>
                                </div>
                                <div className="mf-cart-resumo-total">
                                    <span>Total</span>
                                    <strong>{formatarPreco(subtotal)} Kz</strong>
                                </div>
                                
                                <button
                                    type="button"
                                    className="mf-cart-btn mf-cart-btn-primary mf-cart-btn-full"
                                    onClick={() => navigate("/cliente/finalizar-encomenda")}
                                    disabled={itens.length === 0}
                                >
                                    Finalizar encomenda
                                    <ArrowRight size={16} />
                                </button>
                                <Link to="/" className="mf-cart-btn mf-cart-btn-outline mf-cart-btn-full">
                                    Continuar a comprar
                                </Link>
                                <p className="mf-cart-resumo-aviso">
                                    <ShieldCheck size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
                                    Os preços e o stock são publicados pelos comerciantes.
                                </p>
                            </aside>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}

export default Carrinho;