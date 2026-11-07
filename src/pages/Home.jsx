import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Check,
    CheckCircle2,
    CircleHelp,
    Fish,
    Leaf,
    MapPin,
    Menu,
    Package,
    Search,
    ShieldCheck,
    ShoppingBasket,
    Sprout,
    Store,
    Truck,
    X,
    Milk,
    Wheat,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { db } from "../firebase/config";
import imagemProdutoPadrao from "../assets/hero.png";
import "../styles/home.css";

const categorias = [
    {
        nome: "Frutas e verduras",
        descricao: "Da terra, com frescura",
        icon: Sprout,
        imagem:
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=85",
        cor: "green",
        termos: ["fruta", "verdura", "legume", "horticola", "hortícola", "vegetal"],
    },
    {
        nome: "Peixe e marisco",
        descricao: "Sabores do nosso mar",
        icon: Fish,
        imagem:
            "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=800&q=85",
        cor: "blue",
        termos: ["peixe", "pescado", "marisco", "camarão", "camarao", "sardinha", "atum"],
    },
    {
        nome: "Mercearia",
        descricao: "Tudo para a despensa",
        icon: Wheat,
        imagem:
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=85",
        cor: "gold",
        termos: ["mercearia", "arroz", "massa", "farinha", "cereal", "conserva", "azeite"],
    },
    {
        nome: "Laticínios e ovos",
        descricao: "Essenciais do dia a dia",
        icon: Milk,
        imagem:
            "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=85",
        cor: "cream",
        termos: ["laticínio", "laticinio", "leite", "queijo", "iogurte", "ovo", "manteiga"],
    },
];

const beneficios = [
    {
        icon: Leaf,
        titulo: "Produtos locais",
        texto: "Descubra o que é produzido e comercializado perto de si.",
    },
    {
        icon: ShieldCheck,
        titulo: "Informação clara",
        texto: "Consulte os preços e a disponibilidade anunciados pelas lojas.",
    },
    {
        icon: Truck,
        titulo: "Mais comodidade",
        texto: "Explore opções e consulte as condições de entrega de cada vendedor.",
    },
];

const PRODUTOS_POR_PAGINA = 8;

function normalizar(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-AO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function Home() {
    const [produtos, setProdutos] = useState([]);
    const [lojas, setLojas] = useState([]);
    const [carregandoProdutos, setCarregandoProdutos] = useState(true);
    const [carregandoLojas, setCarregandoLojas] = useState(true);
    const [erroProdutos, setErroProdutos] = useState("");
    const [erroLojas, setErroLojas] = useState("");

    const [pesquisa, setPesquisa] = useState("");
    const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
    const [lojaSelecionada, setLojaSelecionada] = useState("");
    const [menuCategoriasAberto, setMenuCategoriasAberto] = useState(false);
    const [visiveis, setVisiveis] = useState(PRODUTOS_POR_PAGINA);

    const dropdownRef = useRef(null);
    const produtosSectionRef = useRef(null);

    /* ---------- Firestore ---------- */
    useEffect(() => {
        const cancelarProdutos = onSnapshot(
            query(collection(db, "produtos"), where("publicado", "==", true)),
            (snapshot) => {
                const disponiveis = snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() }))
                    .filter((p) => {
                        const stock = Number(p.quantidade);
                        const preco = Number(p.preco);
                        return Number.isFinite(stock) && stock > 0 && Number.isFinite(preco) && preco > 0;
                    })
                    .sort(
                        (a, b) =>
                            (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0)
                    );
                setProdutos(disponiveis);
                setErroProdutos("");
                setCarregandoProdutos(false);
            },
            (error) => {
                console.error("Erro ao carregar produtos:", error);
                setErroProdutos(
                    error.code === "permission-denied"
                        ? "Não foi possível aceder ao catálogo. Verifica as regras do Firestore."
                        : "Não foi possível carregar os produtos. Tenta novamente mais tarde."
                );
                setCarregandoProdutos(false);
            }
        );

        const cancelarLojas = onSnapshot(
            query(collection(db, "lojas"), where("configurada", "==", true)),
            (snapshot) => {
                const disponiveis = snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) =>
                        String(a.nome || "").localeCompare(String(b.nome || ""), "pt")
                    );
                setLojas(disponiveis);
                setErroLojas("");
                setCarregandoLojas(false);
            },
            (error) => {
                console.error("Erro ao carregar lojas:", error);
                setErroLojas(
                    error.code === "permission-denied"
                        ? "Não foi possível aceder às lojas. Verifica as regras do Firestore."
                        : "Não foi possível carregar as lojas neste momento."
                );
                setCarregandoLojas(false);
            }
        );

        return () => {
            cancelarProdutos();
            cancelarLojas();
        };
    }, []);

    /* ---------- Fechar dropdown ao clicar fora ---------- */
    useEffect(() => {
        if (!menuCategoriasAberto) return;
        const handler = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setMenuCategoriasAberto(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuCategoriasAberto]);

    /* ---------- Reset paginação ao mudar filtros ---------- */
    useEffect(() => {
        setVisiveis(PRODUTOS_POR_PAGINA);
    }, [pesquisa, categoriaSelecionada, lojaSelecionada]);

    /* ---------- Filtros ---------- */
    const produtosFiltrados = useMemo(() => {
        const termo = normalizar(pesquisa.trim());

        const categoriaDefinida = categorias.find(
            (c) => c.nome === categoriaSelecionada
        );

        return produtos.filter((produto) => {
            const nomeProduto = normalizar(produto.nome);
            const catProduto = normalizar(produto.categoria);
            const lojaProduto = normalizar(produto.lojaNome);

            const correspondePesquisa =
                !termo ||
                nomeProduto.includes(termo) ||
                catProduto.includes(termo) ||
                lojaProduto.includes(termo);

            let correspondeCategoria = true;
            if (categoriaDefinida) {
                const termos = categoriaDefinida.termos.map(normalizar);
                correspondeCategoria = termos.some((t) => catProduto.includes(t));
            } else if (categoriaSelecionada) {
                correspondeCategoria = catProduto.includes(normalizar(categoriaSelecionada));
            }

            const correspondeLoja = !lojaSelecionada || produto.comercianteId === lojaSelecionada;

            return correspondePesquisa && correspondeCategoria && correspondeLoja;
        });
    }, [produtos, pesquisa, categoriaSelecionada, lojaSelecionada]);

    const produtosVisiveis = useMemo(
        () => produtosFiltrados.slice(0, visiveis),
        [produtosFiltrados, visiveis]
    );

    const lojasComProdutos = useMemo(
        () =>
            lojas
                .map((loja) => ({
                    ...loja,
                    totalProdutos: produtos.filter((p) => p.comercianteId === loja.id).length,
                }))
                .filter((l) => l.totalProdutos > 0)
                .slice(0, 4),
        [lojas, produtos]
    );

    const lojaAtiva = useMemo(
        () => lojas.find((l) => l.id === lojaSelecionada) || null,
        [lojas, lojaSelecionada]
    );

    const temFiltrosAtivos =
        Boolean(pesquisa.trim()) || Boolean(categoriaSelecionada) || Boolean(lojaSelecionada);

    const limparFiltros = () => {
        setPesquisa("");
        setCategoriaSelecionada("");
        setLojaSelecionada("");
    };

    const irParaProdutos = () => {
        produtosSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const selecionarCategoria = (nome) => {
        setCategoriaSelecionada((atual) => (atual === nome ? "" : nome));
        setLojaSelecionada("");
        setMenuCategoriasAberto(false);
        irParaProdutos();
    };

    return (
        <>
            <Header />

            <main className="mf2-home">
                {/* ================= HERO ================= */}
                <section className="mf2-hero">
                    <div className="mf2-hero-glow" aria-hidden="true" />

                    <div className="mf2-container mf2-hero-layout">
                        <div className="mf2-hero-copy">
                            <div className="mf2-overline">
                                <span className="mf2-status-dot" />
                                O mercado local, numa nova experiência
                            </div>

                            <h1>
                                Fresco por natureza.
                                <br />
                                <span>Perto de si.</span>
                            </h1>

                            <p className="mf2-hero-description">
                                Descubra produtos agrícolas, peixe, marisco e muito mais.
                                Explore as lojas locais e encontre o que precisa, num só lugar.
                            </p>

                            <form
                                className="mf2-search"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    setCategoriaSelecionada("");
                                    setLojaSelecionada("");
                                    irParaProdutos();
                                }}
                            >
                                <Search size={20} aria-hidden="true" />
                                <input
                                    type="search"
                                    value={pesquisa}
                                    onChange={(e) => setPesquisa(e.target.value)}
                                    placeholder="O que procura hoje?"
                                    aria-label="Pesquisar produtos e lojas"
                                />
                                {pesquisa && (
                                    <button
                                        className="mf2-search-clear"
                                        type="button"
                                        onClick={() => setPesquisa("")}
                                        aria-label="Limpar pesquisa"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <button className="mf2-search-submit" type="submit">
                                    Pesquisar
                                    <ArrowRight size={16} />
                                </button>
                            </form>

                            <div className="mf2-hero-meta">
                                <span>
                                    <CheckCircle2 size={15} /> Comércio local
                                </span>
                                <span>
                                    <CheckCircle2 size={15} /> Produtos disponíveis
                                </span>
                            </div>

                            <button
                                className="mf2-discover-link"
                                type="button"
                                onClick={irParaProdutos}
                            >
                                Descobrir produtos
                                <ArrowDownRight size={16} />
                            </button>
                        </div>

                        <div className="mf2-hero-art">
                            <div className="mf2-hero-image-wrap">
                                <img
                                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=90"
                                    alt="Seleção de produtos frescos num mercado"
                                    fetchPriority="high"
                                />
                            </div>

                            <div className="mf2-hero-image-shape" aria-hidden="true" />

                            <div className="mf2-floating-note mf2-floating-note-top">
                                <span className="mf2-floating-icon">
                                    <Sprout size={20} />
                                </span>
                                <span>
                                    <strong>Valorizar o que é nosso</strong>
                                    <small>Produtores e comerciantes locais</small>
                                </span>
                            </div>

                            <div className="mf2-floating-note mf2-floating-note-bottom">
                                <span className="mf2-floating-icon mf2-floating-icon-coral">
                                    <ShoppingBasket size={20} />
                                </span>
                                <span>
                                    <strong>Descubra o mercado</strong>
                                    <small>À sua maneira, ao seu ritmo</small>
                                </span>
                            </div>

                            <span className="mf2-hero-vertical-label" aria-hidden="true">
                                MERCADO FRESKO · ANGOLA
                            </span>
                        </div>
                    </div>

                    <div className="mf2-container">
                        <div className="mf2-hero-footer" aria-hidden="true">
                            <span>DA TERRA</span>
                            <span className="mf2-footer-line" />
                            <span>DO MAR</span>
                            <span className="mf2-footer-line" />
                            <span>PARA A SUA MESA</span>
                        </div>
                    </div>
                </section>

                {/* ================= CATEGORIAS ================= */}
                <section className="mf2-section mf2-categories" id="mf2-categorias">
                    <div className="mf2-container">
                        <div className="mf2-section-heading">
                            <div>
                                <span className="mf2-kicker">EXPLORE POR CATEGORIA</span>
                                <h2>
                                    O que vai levar <span>hoje?</span>
                                </h2>
                                <p>Comece por aquilo de que precisa.</p>
                            </div>

                            <button
                                type="button"
                                className="mf2-heading-link"
                                onClick={() => {
                                    limparFiltros();
                                    irParaProdutos();
                                }}
                            >
                                Ver todas
                                <ArrowUpRight size={17} />
                            </button>
                        </div>

                        <div className="mf2-category-grid">
                            {categorias.map((categoria) => {
                                const Icon = categoria.icon;
                                const selecionada = categoriaSelecionada === categoria.nome;
                                return (
                                    <button
                                        key={categoria.nome}
                                        type="button"
                                        className={`mf2-category-card mf2-category-${categoria.cor}${
                                            selecionada ? " is-selected" : ""
                                        }`}
                                        onClick={() => selecionarCategoria(categoria.nome)}
                                        aria-pressed={selecionada}
                                    >
                                        <div className="mf2-category-image">
                                            <img src={categoria.imagem} alt="" loading="lazy" />
                                            <span className="mf2-category-image-overlay" />
                                            <span className="mf2-category-icon">
                                                <Icon size={20} strokeWidth={1.8} />
                                            </span>
                                            <span className="mf2-category-arrow">
                                                {selecionada ? <Check size={17} /> : <ArrowUpRight size={17} />}
                                            </span>
                                        </div>
                                        <span className="mf2-category-description">
                                            {categoria.descricao}
                                        </span>
                                        <strong>{categoria.nome}</strong>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ================= PRODUTOS ================= */}
                <section
                    className="mf2-section mf2-products-section"
                    id="mf2-produtos"
                    ref={produtosSectionRef}
                >
                    <div className="mf2-container">
                        <div className="mf2-section-heading mf2-products-heading">
                            <div>
                                <span className="mf2-kicker">A MONTRA DO MERCADO</span>
                                <h2>
                                    Descubra algo <span>fresco.</span>
                                </h2>
                                <p>Produtos publicados pelos nossos comerciantes.</p>
                            </div>

                            <div className="mf2-products-count">
                                <span className="mf2-count-number">
                                    {carregandoProdutos || erroProdutos
                                        ? "—"
                                        : produtosFiltrados.length}
                                </span>
                                <span>
                                    {produtosFiltrados.length === 1
                                        ? "produto disponível"
                                        : "produtos disponíveis"}
                                </span>
                            </div>
                        </div>

                        <div className="mf2-filter-bar">
                            <div className="mf2-filter-label">
                                <Package size={16} />
                                <span>Explorar produtos</span>
                            </div>

                            <div className="mf2-filter-controls">
                                <button
                                    type="button"
                                    className={`mf2-filter-chip${
                                        !categoriaSelecionada && !lojaSelecionada ? " active" : ""
                                    }`}
                                    onClick={() => {
                                        setCategoriaSelecionada("");
                                        setLojaSelecionada("");
                                    }}
                                >
                                    Todos
                                </button>

                                <div className="mf2-filter-dropdown" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        className={`mf2-filter-chip${
                                            menuCategoriasAberto || categoriaSelecionada ? " active" : ""
                                        }`}
                                        onClick={() => setMenuCategoriasAberto((v) => !v)}
                                        aria-expanded={menuCategoriasAberto}
                                        aria-haspopup="menu"
                                    >
                                        {categoriaSelecionada || "Categorias"}
                                        {menuCategoriasAberto ? <X size={14} /> : <Menu size={14} />}
                                    </button>

                                    {menuCategoriasAberto && (
                                        <div className="mf2-filter-menu" role="menu">
                                            {categorias.map((c) => (
                                                <button
                                                    key={c.nome}
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => selecionarCategoria(c.nome)}
                                                >
                                                    {c.nome}
                                                    {categoriaSelecionada === c.nome && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {lojaAtiva && (
                                    <button
                                        type="button"
                                        className="mf2-filter-chip mf2-filter-store active"
                                        onClick={() => setLojaSelecionada("")}
                                        title="Remover filtro de loja"
                                    >
                                        <Store size={14} />
                                        {lojaAtiva.nome || "Loja"}
                                        <X size={13} />
                                    </button>
                                )}

                                {temFiltrosAtivos && (
                                    <button
                                        type="button"
                                        className="mf2-clear-filters"
                                        onClick={limparFiltros}
                                    >
                                        Limpar
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {erroProdutos ? (
                            <div className="mf2-state-card mf2-state-error" role="alert">
                                <CircleHelp size={26} />
                                <h3>Não foi possível carregar o catálogo</h3>
                                <p>{erroProdutos}</p>
                            </div>
                        ) : carregandoProdutos ? (
                            <div className="mf2-product-grid">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div className="mf2-product-skeleton" key={i}>
                                        <div className="mf2-skeleton-image" />
                                        <div className="mf2-skeleton-line" />
                                        <div className="mf2-skeleton-line short" />
                                        <div className="mf2-skeleton-line price" />
                                    </div>
                                ))}
                            </div>
                        ) : produtosFiltrados.length === 0 ? (
                            <div className="mf2-state-card">
                                <span className="mf2-state-icon">
                                    <Search size={26} />
                                </span>
                                <h3>
                                    {temFiltrosAtivos
                                        ? "Não encontrámos resultados"
                                        : "A montra está a ser preparada"}
                                </h3>
                                <p>
                                    {temFiltrosAtivos
                                        ? "Experimente outro termo de pesquisa ou remova os filtros para ver mais produtos."
                                        : "Assim que os comerciantes publicarem produtos com stock, estes serão apresentados aqui."}
                                </p>
                                {temFiltrosAtivos && (
                                    <button
                                        type="button"
                                        className="mf2-button mf2-button-dark"
                                        onClick={limparFiltros}
                                    >
                                        Ver todos os produtos
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="mf2-product-grid">
                                    {produtosVisiveis.map((produto) => {
                                        const imagem = produto.imagemUrl || imagemProdutoPadrao;
                                        return (
                                            <Link
                                                to={`/produto/${produto.id}`}
                                                className="mf2-product-card"
                                                key={produto.id}
                                            >
                                                <div className="mf2-product-photo">
                                                    <img
                                                        src={imagem}
                                                        alt={produto.nome || "Produto local"}
                                                        loading="lazy"
                                                    />
                                                    <span className="mf2-product-status">
                                                        <span /> Disponível
                                                    </span>
                                                    <span className="mf2-product-category-label">
                                                        {produto.categoria || "Produto local"}
                                                    </span>
                                                </div>

                                                <div className="mf2-product-body">
                                                    <span className="mf2-product-store">
                                                        <Store size={13} />
                                                        {produto.lojaNome || "Comércio local"}
                                                    </span>

                                                    <h3>{produto.nome || "Produto local"}</h3>

                                                    <div className="mf2-product-stock">
                                                        <CheckCircle2 size={13} />
                                                        {Number(produto.quantidade)} em stock
                                                    </div>

                                                    <div className="mf2-product-bottom">
                                                        <div className="mf2-product-price">
                                                            <strong>
                                                                {formatarPreco(produto.preco)}
                                                                <span> Kz</span>
                                                            </strong>
                                                            <small>
                                                                por {produto.unidade || "unidade"}
                                                            </small>
                                                        </div>

                                                        <span
                                                            className="mf2-product-action"
                                                            aria-hidden="true"
                                                        >
                                                            <ArrowUpRight size={18} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {produtosFiltrados.length > produtosVisiveis.length && (
                                    <div className="mf2-products-more">
                                        <span>
                                            A mostrar {produtosVisiveis.length} de{" "}
                                            {produtosFiltrados.length} produtos
                                        </span>
                                        <button
                                            type="button"
                                            className="mf2-button mf2-button-outline"
                                            onClick={() =>
                                                setVisiveis((v) => v + PRODUTOS_POR_PAGINA)
                                            }
                                        >
                                            Ver mais produtos
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="mf2-catalog-disclaimer">
                            <ShieldCheck size={17} />
                            <span>
                                Os preços e as quantidades são publicados pelos comerciantes.
                                Confirme as condições antes de encomendar.
                            </span>
                        </div>
                    </div>
                </section>

                {/* ================= SOBRE ================= */}
                <section className="mf2-story-section" id="mf2-sobre">
                    <div className="mf2-container mf2-story-layout">
                        <div className="mf2-story-visual">
                            <img
                                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=85"
                                alt="Paisagem agrícola e produção local"
                                loading="lazy"
                            />
                            <div className="mf2-story-stamp">
                                <Leaf size={22} />
                                <span>
                                    Feito de proximidade.
                                    <strong>Movido pelo que é nosso.</strong>
                                </span>
                            </div>
                        </div>

                        <div className="mf2-story-copy">
                            <span className="mf2-kicker">MAIS DO QUE UM MERCADO</span>
                            <h2>
                                Aproximamos quem produz de quem <span>escolhe.</span>
                            </h2>
                            <p>
                                O Mercado Fresko nasce para dar mais visibilidade aos produtos
                                agrícolas, marítimos e ao comércio local, tornando mais simples
                                descobrir o que os nossos comerciantes têm para oferecer.
                            </p>

                            <div className="mf2-story-points">
                                <div>
                                    <span><Check size={15} /></span>
                                    <div>
                                        <strong>Uma montra para os produtores</strong>
                                        <small>Mais visibilidade para os negócios locais.</small>
                                    </div>
                                </div>
                                <div>
                                    <span><Check size={15} /></span>
                                    <div>
                                        <strong>Uma experiência simples</strong>
                                        <small>Explore produtos e compare opções num só lugar.</small>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="mf2-button mf2-button-dark"
                                onClick={() => {
                                    limparFiltros();
                                    irParaProdutos();
                                }}
                            >
                                Explorar o mercado
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* ================= BENEFÍCIOS ================= */}
                <section className="mf2-benefits-section">
                    <div className="mf2-container">
                        <div className="mf2-benefits-heading">
                            <span className="mf2-kicker">A DIFERENÇA FRESKO</span>
                            <h2>
                                Comprar local começa <span>por descobrir.</span>
                            </h2>
                            <p>
                                Uma forma mais simples de conhecer os produtos e os negócios
                                que fazem parte da nossa comunidade.
                            </p>
                        </div>

                        <div className="mf2-benefits-grid">
                            {beneficios.map((b, i) => {
                                const Icon = b.icon;
                                return (
                                    <article className="mf2-benefit-card" key={b.titulo}>
                                        <span className="mf2-benefit-number">0{i + 1}</span>
                                        <span className="mf2-benefit-icon">
                                            <Icon size={22} strokeWidth={1.8} />
                                        </span>
                                        <h3>{b.titulo}</h3>
                                        <p>{b.texto}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ================= LOJAS ================= */}
                <section className="mf2-section mf2-stores-section" id="mf2-lojas">
                    <div className="mf2-container">
                        <div className="mf2-section-heading">
                            <div>
                                <span className="mf2-kicker">QUEM FAZ PARTE DO MERCADO</span>
                                <h2>
                                    Conheça os nossos <span>comerciantes.</span>
                                </h2>
                                <p>Descubra lojas com produtos disponíveis no mercado.</p>
                            </div>

                            <span className="mf2-store-count">
                                <Store size={16} />
                                {carregandoLojas
                                    ? "A carregar"
                                    : `${lojasComProdutos.length} lojas em destaque`}
                            </span>
                        </div>

                        {erroLojas ? (
                            <div className="mf2-inline-message" role="alert">
                                {erroLojas}
                            </div>
                        ) : carregandoLojas ? (
                            <div className="mf2-store-grid">
                                {[1, 2, 3].map((i) => (
                                    <div className="mf2-store-skeleton" key={i} />
                                ))}
                            </div>
                        ) : lojasComProdutos.length === 0 ? (
                            <div className="mf2-store-empty">
                                <span className="mf2-store-empty-icon">
                                    <Store size={24} />
                                </span>
                                <div>
                                    <strong>Novos comerciantes em breve</strong>
                                    <p>
                                        Quando as lojas publicarem produtos disponíveis,
                                        poderás descobri-las nesta secção.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mf2-store-grid">
                                {lojasComProdutos.map((loja) => (
                                    <Link
                                        to={`/loja/${loja.id}`}
                                        className="mf2-store-card"
                                        key={loja.id}
                                    >
                                        <div className="mf2-store-card-top">
                                            <div className="mf2-store-logo">
                                                {loja.logoUrl ? (
                                                    <img
                                                        src={loja.logoUrl}
                                                        alt={`Logótipo de ${loja.nome || "loja"}`}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <Store size={24} />
                                                )}
                                            </div>
                                            <span className="mf2-store-verified">
                                                <CheckCircle2 size={13} />
                                                Loja ativa
                                            </span>
                                        </div>

                                        <h3>{loja.nome || "Comércio local"}</h3>

                                        <p className="mf2-store-location">
                                            <MapPin size={14} />
                                            {[loja.municipio, loja.provincia]
                                                .filter(Boolean)
                                                .join(", ") || "Angola"}
                                        </p>

                                        <div className="mf2-store-card-bottom">
                                            <span>
                                                <strong>{loja.totalProdutos}</strong>
                                                {loja.totalProdutos === 1
                                                    ? " produto disponível"
                                                    : " produtos disponíveis"}
                                            </span>
                                            <span
                                                className="mf2-store-card-arrow"
                                                aria-hidden="true"
                                            >
                                                <ArrowUpRight size={18} />
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ================= PARA COMERCIANTES ================= */}
                <section className="mf2-seller-section" id="mf2-parceiros">
                    <div className="mf2-container">
                        <div className="mf2-seller-card">
                            <div className="mf2-seller-decoration mf2-seller-decoration-one" />
                            <div className="mf2-seller-decoration mf2-seller-decoration-two" />

                            <div className="mf2-seller-content">
                                <span className="mf2-seller-label">
                                    PARA PRODUTORES E COMERCIANTES
                                </span>
                                <h2>
                                    O seu negócio merece
                                    <br />
                                    <span>ser descoberto.</span>
                                </h2>
                                <p>
                                    Apresente os seus produtos, dê visibilidade à sua loja
                                    e chegue a novos consumidores com o Mercado Fresko.
                                </p>
                                <Link to="/login" className="mf2-button mf2-button-coral">
                                    Quero vender no Fresko
                                    <ArrowRight size={17} />
                                </Link>
                            </div>

                            <div className="mf2-seller-visual" aria-hidden="true">
                                <div className="mf2-seller-icon-circle">
                                    <Store size={48} strokeWidth={1.3} />
                                </div>
                                <span className="mf2-seller-leaf seller-leaf-one">
                                    <Leaf size={38} />
                                </span>
                                <span className="mf2-seller-leaf seller-leaf-two">
                                    <Sprout size={32} />
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ================= CTA FINAL ================= */}
                <section className="mf2-final-section">
                    <div className="mf2-container mf2-final-inner">
                        <div>
                            <span className="mf2-kicker">O MERCADO FRESKO</span>
                            <h2>
                                O que é nosso,
                                <br />
                                <span>mais perto de si.</span>
                            </h2>
                            <p>
                                Descubra produtos, conheça comerciantes e valorize o mercado local.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="mf2-button mf2-button-primary"
                            onClick={() => {
                                limparFiltros();
                                document
                                    .getElementById("mf2-categorias")
                                    ?.scrollIntoView({ behavior: "smooth" });
                            }}
                        >
                            Descobrir o mercado
                            <ArrowRight size={17} />
                        </button>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}

export default Home;