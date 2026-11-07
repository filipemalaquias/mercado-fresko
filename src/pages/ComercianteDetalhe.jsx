import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    collection,
    doc,
    getDoc,
    getDocs,
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
    Package,
    Search,
    Store,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { db } from "../firebase/config";
import imagemProdutoPadrao from "../assets/hero.png";
import "../styles/comerciante.css";

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-AO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function ComercianteDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loja, setLoja] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [pesquisa, setPesquisa] = useState("");

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            setCarregando(true);
            setErro("");

            try {
                const lojaSnap = await getDoc(doc(db, "lojas", id));

                if (!lojaSnap.exists()) {
                    if (ativo) setErro("Comerciante não encontrado.");
                    return;
                }

                const dadosLoja = { id: lojaSnap.id, ...lojaSnap.data() };
                if (ativo) setLoja(dadosLoja);

                const produtosSnap = await getDocs(
                    query(
                        collection(db, "produtos"),
                        where("publicado", "==", true),
                        where("comercianteId", "==", id)
                    )
                );

                const lista = produtosSnap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((p) => {
                        const stock = Number(p.quantidade);
                        const preco = Number(p.preco);
                        return (
                            Number.isFinite(stock) &&
                            stock > 0 &&
                            Number.isFinite(preco) &&
                            preco > 0
                        );
                    })
                    .sort(
                        (a, b) =>
                            (b.criadoEm?.toMillis?.() || 0) -
                            (a.criadoEm?.toMillis?.() || 0)
                    );

                if (ativo) setProdutos(lista);
            } catch (e) {
                console.error(e);
                if (ativo) setErro("Não foi possível carregar esta loja.");
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        carregar();
        return () => {
            ativo = false;
        };
    }, [id]);

    const produtosFiltrados = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();
        if (!termo) return produtos;

        return produtos.filter((p) => {
            const nome = String(p.nome || "").toLowerCase();
            const categoria = String(p.categoria || "").toLowerCase();
            return nome.includes(termo) || categoria.includes(termo);
        });
    }, [produtos, pesquisa]);

    if (carregando) {
        return (
            <>
                <Header />
                <main className="cd-page">
                    <div className="cd-container">
                        <div className="cd-skeleton-hero" />
                        <div className="cd-skeleton-grid">
                            {[1, 2, 3].map((i) => (
                                <div className="cd-skeleton-card" key={i} />
                            ))}
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (erro || !loja) {
        return (
            <>
                <Header />
                <main className="cd-page">
                    <div className="cd-container">
                        <div className="cd-error">
                            <CircleHelp size={40} />
                            <h1>Não encontrámos este comerciante</h1>
                            <p>{erro || "A loja pode ter sido removida."}</p>
                            <Link to="/" className="cd-btn cd-btn-primary">
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

    return (
        <>
            <Header />

            <main className="cd-page">
                <div className="cd-container">
                    {/* Breadcrumb */}
                    <nav className="cd-breadcrumb" aria-label="Navegação">
                        <Link to="/">Início</Link>
                        <span>/</span>
                        <Link to="/#lojas">Comerciantes</Link>
                        <span>/</span>
                        <span className="cd-breadcrumb-current">
                            {loja.nome || "Loja"}
                        </span>
                    </nav>

                    <button
                        type="button"
                        className="cd-back"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>

                    {/* Hero da loja */}
                    <section className="cd-hero">
                        <div className="cd-hero-bg" />

                        <div className="cd-hero-inner">
                            <div className="cd-hero-logo">
                                {loja.logoUrl ? (
                                    <img
                                        src={loja.logoUrl}
                                        alt={`Logótipo de ${loja.nome}`}
                                    />
                                ) : (
                                    <Store size={40} />
                                )}
                            </div>

                            <div className="cd-hero-info">
                                <div className="cd-hero-badges">
                                    <span className="cd-badge cd-badge-active">
                                        <CheckCircle2 size={13} />
                                        Loja ativa
                                    </span>
                                    {loja.configurada && (
                                        <span className="cd-badge">
                                            Verificada
                                        </span>
                                    )}
                                </div>

                                <h1>{loja.nome || "Comércio local"}</h1>

                                <p className="cd-hero-location">
                                    <MapPin size={15} />
                                    {[loja.municipio, loja.provincia]
                                        .filter(Boolean)
                                        .join(", ") || "Angola"}
                                </p>

                                {loja.descricao && (
                                    <p className="cd-hero-descricao">
                                        {loja.descricao}
                                    </p>
                                )}
                            </div>

                            <div className="cd-hero-stats">
                                <div>
                                    <strong>{produtos.length}</strong>
                                    <span>
                                        {produtos.length === 1
                                            ? "produto"
                                            : "produtos"}
                                    </span>
                                </div>
                                {loja.email && (
                                    <a
                                        href={`mailto:${loja.email}`}
                                        className="cd-btn cd-btn-outline cd-btn-sm"
                                    >
                                        <Mail size={14} />
                                        Contactar
                                    </a>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Produtos da loja */}
                    <section className="cd-products">
                        <div className="cd-products-heading">
                            <div>
                                <h2>Produtos desta loja</h2>
                                <p>
                                    {produtos.length === 0
                                        ? "A loja ainda não tem produtos disponíveis."
                                        : `Explore os ${produtos.length} produto${
                                              produtos.length > 1 ? "s" : ""
                                          } disponíveis.`}
                                </p>
                            </div>

                            {produtos.length > 0 && (
                                <div className="cd-search">
                                    <Search size={16} />
                                    <input
                                        type="search"
                                        placeholder="Pesquisar nesta loja..."
                                        value={pesquisa}
                                        onChange={(e) =>
                                            setPesquisa(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {produtos.length === 0 ? (
                            <div className="cd-empty">
                                <Package size={30} />
                                <h3>Sem produtos disponíveis</h3>
                                <p>
                                    Esta loja ainda não publicou produtos com
                                    stock. Volta mais tarde.
                                </p>
                                <Link
                                    to="/#lojas"
                                    className="cd-btn cd-btn-primary"
                                >
                                    Ver outras lojas
                                    <ArrowRight size={15} />
                                </Link>
                            </div>
                        ) : produtosFiltrados.length === 0 ? (
                            <div className="cd-empty">
                                <Search size={30} />
                                <h3>Nenhum produto encontrado</h3>
                                <p>
                                    Tenta outro termo ou limpa a pesquisa.
                                </p>
                                <button
                                    type="button"
                                    className="cd-btn cd-btn-outline"
                                    onClick={() => setPesquisa("")}
                                >
                                    Limpar pesquisa
                                </button>
                            </div>
                        ) : (
                            <div className="cd-grid">
                                {produtosFiltrados.map((produto) => (
                                    <Link
                                        key={produto.id}
                                        to={`/produto/${produto.id}`}
                                        className="cd-card"
                                    >
                                        <div className="cd-card-img">
                                            <img
                                                src={
                                                    produto.imagemUrl ||
                                                    imagemProdutoPadrao
                                                }
                                                alt={
                                                    produto.nome || "Produto"
                                                }
                                                loading="lazy"
                                            />
                                            <span className="cd-card-category">
                                                {produto.categoria ||
                                                    "Produto local"}
                                            </span>
                                        </div>

                                        <div className="cd-card-body">
                                            <h3>
                                                {produto.nome ||
                                                    "Produto local"}
                                            </h3>

                                            <div className="cd-card-stock">
                                                <CheckCircle2 size={13} />
                                                {Number(produto.quantidade)} em
                                                stock
                                            </div>

                                            <div className="cd-card-bottom">
                                                <div className="cd-card-price">
                                                    <strong>
                                                        {formatarPreco(
                                                            produto.preco
                                                        )}
                                                        <span> Kz</span>
                                                    </strong>
                                                    <small>
                                                        por{" "}
                                                        {produto.unidade ||
                                                            "unidade"}
                                                    </small>
                                                </div>

                                                <span className="cd-card-arrow">
                                                    <ArrowRight size={16} />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Footer />
        </>
    );
}

export default ComercianteDetalhe;