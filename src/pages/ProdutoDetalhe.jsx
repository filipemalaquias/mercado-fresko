import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    CircleHelp,
    Mail,
    MapPin,
    Minus,
    Package,
    Plus,
    ShieldCheck,
    ShoppingBasket,
    Store,
    Truck,
    Check,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCarrinho } from "../context/CarrinhoContext"; // Importante!
import { db } from "../firebase/config";
import imagemProdutoPadrao from "../assets/hero.png";
import "../styles/produto.css";

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-AO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function ProdutoDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // 1. Puxar a função "adicionar" do contexto
    const { adicionar } = useCarrinho();

    const [produto, setProduto] = useState(null);
    const [loja, setLoja] = useState(null);
    const [relacionados, setRelacionados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [quantidade, setQuantidade] = useState(1);
    
    // Estado para o botão ficar verde e dizer "Adicionado"
    const [adicionado, setAdicionado] = useState(false);

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            setCarregando(true);
            setErro("");

            try {
                const snap = await getDoc(doc(db, "produtos", id));

                if (!snap.exists()) {
                    if (ativo) setErro("Produto não encontrado.");
                    return;
                }

                const dadosProduto = { id: snap.id, ...snap.data() };

                if (!dadosProduto.publicado) {
                    if (ativo) setErro("Este produto já não está disponível.");
                    return;
                }

                if (ativo) setProduto(dadosProduto);

                if (dadosProduto.comercianteId) {
                    const lojaSnap = await getDoc(
                        doc(db, "lojas", dadosProduto.comercianteId)
                    );
                    if (lojaSnap.exists() && ativo) {
                        setLoja({ id: lojaSnap.id, ...lojaSnap.data() });
                    }
                }

                if (dadosProduto.categoria) {
                    const relSnap = await getDocs(
                        query(
                            collection(db, "produtos"),
                            where("publicado", "==", true),
                            where("categoria", "==", dadosProduto.categoria),
                            limit(8)
                        )
                    );

                    const rel = relSnap.docs
                        .map((d) => ({ id: d.id, ...d.data() }))
                        .filter((p) => p.id !== dadosProduto.id)
                        .slice(0, 4);

                    if (ativo) setRelacionados(rel);
                }
            } catch (e) {
                console.error(e);
                if (ativo) setErro("Não foi possível carregar este produto.");
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        carregar();
        return () => { ativo = false; };
    }, [id]);

    const stock = Number(produto?.quantidade) || 0;
    const podeAdicionar = quantidade < stock;

    const categoriaTexto = useMemo(() => {
        if (!produto?.categoria) return "Produto local";
        return produto.categoria;
    }, [produto]);

    // 2. Função que trata do clique no botão
    const handleAdicionarAoCarrinho = () => {
        if (stock === 0) return;
        
        // Adiciona ao contexto global
        adicionar(produto, quantidade);
        
        // Dá o feedback visual verde
        setAdicionado(true);
        setTimeout(() => setAdicionado(false), 2000);
    };

    if (carregando) {
        return (
            <>
                <Header />
                <main className="pd-page">
                    <div className="pd-container">
                        <div className="pd-skeleton">
                            <div className="pd-skeleton-img" />
                            <div className="pd-skeleton-body">
                                <div className="pd-skeleton-line" />
                                <div className="pd-skeleton-line short" />
                                <div className="pd-skeleton-line" />
                                <div className="pd-skeleton-line price" />
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (erro || !produto) {
        return (
            <>
                <Header />
                <main className="pd-page">
                    <div className="pd-container">
                        <div className="pd-error">
                            <CircleHelp size={40} />
                            <h1>Não encontrámos este produto</h1>
                            <p>{erro || "O produto pode ter sido removido."}</p>
                            <Link to="/" className="pd-btn pd-btn-primary">
                                Voltar à home
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const imagem = produto.imagemUrl || imagemProdutoPadrao;

    return (
        <>
            <Header />

            <main className="pd-page">
                <div className="pd-container">
                    <nav className="pd-breadcrumb" aria-label="Navegação">
                        <Link to="/">Início</Link>
                        <span>/</span>
                        <Link to="/#produtos">Produtos</Link>
                        <span>/</span>
                        <span className="pd-breadcrumb-current">
                            {produto.nome || "Produto"}
                        </span>
                    </nav>

                    <button
                        type="button"
                        className="pd-back"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>

                    <div className="pd-layout">
                        <div className="pd-media">
                            <div className="pd-media-inner">
                                <img src={imagem} alt={produto.nome || "Produto"} />
                            </div>
                            <span className="pd-category-badge">
                                {categoriaTexto}
                            </span>
                        </div>

                        <div className="pd-info">
                            {loja && (
                                <Link
                                    to={`/comerciante/${loja.id}`}
                                    className="pd-store-link"
                                >
                                    <Store size={15} />
                                    {loja.nome || "Comércio local"}
                                    <ArrowRight size={13} />
                                </Link>
                            )}

                            <h1>{produto.nome || "Produto local"}</h1>

                            <p className="pd-description">
                                {produto.descricao ||
                                    "Produto fresco e local, disponível no Mercado Fresko. Fala com o comerciante para mais detalhes sobre origem e entrega."}
                            </p>

                            <div className="pd-price-block">
                                <span className="pd-price">
                                    {formatarPreco(produto.preco)}
                                    <span> Kz</span>
                                </span>
                                <small>
                                    por {produto.unidade || "unidade"}
                                </small>
                            </div>

                            <div className="pd-meta-grid">
                                <div className="pd-meta-item">
                                    <CheckCircle2 size={16} />
                                    <div>
                                        <strong>Em stock</strong>
                                        <small>{stock} unidades disponíveis</small>
                                    </div>
                                </div>

                                <div className="pd-meta-item">
                                    <Package size={16} />
                                    <div>
                                        <strong>Unidade</strong>
                                        <small>{produto.unidade || "Unidade"}</small>
                                    </div>
                                </div>

                                {loja?.municipio && (
                                    <div className="pd-meta-item">
                                        <MapPin size={16} />
                                        <div>
                                            <strong>Localização</strong>
                                            <small>
                                                {[loja.municipio, loja.provincia]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </small>
                                        </div>
                                    </div>
                                )}

                                <div className="pd-meta-item">
                                    <Truck size={16} />
                                    <div>
                                        <strong>Entrega</strong>
                                        <small>Combine com o comerciante</small>
                                    </div>
                                </div>
                            </div>

                            {/* Quantidade + Ação */}
                            <div className="pd-actions">
                                <div className="pd-qty">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuantidade((q) => Math.max(1, q - 1))
                                        }
                                        aria-label="Diminuir quantidade"
                                    >
                                        <Minus size={15} />
                                    </button>
                                    <span>{quantidade}</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuantidade((q) =>
                                                podeAdicionar ? q + 1 : q
                                            )
                                        }
                                        aria-label="Aumentar quantidade"
                                        disabled={!podeAdicionar}
                                    >
                                        <Plus size={15} />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    // 3. Aqui aplicamos a classe verde e a função!
                                    className={`pd-btn pd-btn-primary pd-btn-full ${adicionado ? 'pd-btn-success' : ''}`}
                                    disabled={stock === 0}
                                    onClick={handleAdicionarAoCarrinho}
                                >
                                    {adicionado ? (
                                        <>
                                            <Check size={17} />
                                            Adicionado ao carrinho
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingBasket size={17} />
                                            {stock === 0
                                                ? "Sem stock"
                                                : `Reservar ${quantidade} ${produto.unidade || "unidade"}${quantidade > 1 ? "s" : ""}`}
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="pd-note">
                                <ShieldCheck size={15} />
                                <span>
                                    Os preços e o stock são publicados pelo
                                    comerciante. Confirma as condições antes de
                                    finalizar.
                                </span>
                            </div>

                            {loja && (
                                <div className="pd-store-card">
                                    <div className="pd-store-logo">
                                        {loja.logoUrl ? (
                                            <img src={loja.logoUrl} alt={`Logótipo de ${loja.nome}`} />
                                        ) : (
                                            <Store size={22} />
                                        )}
                                    </div>
                                    <div className="pd-store-card-info">
                                        <strong>{loja.nome}</strong>
                                        <span>
                                            {[loja.municipio, loja.provincia]
                                                .filter(Boolean)
                                                .join(", ") || "Angola"}
                                        </span>
                                    </div>
                                    <Link
                                        to={`/comerciante/${loja.id}`}
                                        className="pd-btn pd-btn-outline pd-btn-sm"
                                    >
                                        Ver loja
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            )}

                            {loja?.email && (
                                <a href={`mailto:${loja.email}`} className="pd-contact">
                                    <Mail size={16} />
                                    Contactar o comerciante
                                </a>
                            )}
                        </div>
                    </div>

                    {relacionados.length > 0 && (
                        <section className="pd-related">
                            <div className="pd-related-heading">
                                <h2>Também pode gostar</h2>
                                <Link to="/#produtos" className="pd-related-link">
                                    Ver todos <ArrowRight size={15} />
                                </Link>
                            </div>

                            <div className="pd-related-grid">
                                {relacionados.map((rel) => (
                                    <Link key={rel.id} to={`/produto/${rel.id}`} className="pd-related-card">
                                        <div className="pd-related-img">
                                            <img src={rel.imagemUrl || imagemProdutoPadrao} alt={rel.nome || "Produto"} />
                                        </div>
                                        <div className="pd-related-body">
                                            <strong>{rel.nome}</strong>
                                            <span>{formatarPreco(rel.preco)} Kz</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            <Footer />
        </>
    );
}

export default ProdutoDetalhe;