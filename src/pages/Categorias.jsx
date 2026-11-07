
import { Link } from "react-router-dom";
import {
    ArrowRight,
    Apple,
    Leaf,
    Fish,
    Wheat,
    Milk,
    Beef,
    ShoppingBasket,
    ChevronRight,
    Sprout,
    Package
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/categorias.css";

const categorias = [
    {
        id: "agroprodutos",
        nome: "Agroprodutos",
        descricao: "Produtos agrícolas para a sua casa ou negócio.",
        quantidade: "Produtos da terra",
        imagem:
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
        icone: Wheat,
        cor: "olive"
    },
    {
        id: "frutas",
        nome: "Frutas",
        descricao: "Frutas frescas, saborosas e seleccionadas.",
        quantidade: "Frescas e naturais",
        imagem:
            "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=900&q=85",
        icone: Apple,
        cor: "orange"
    },
    {
        id: "legumes",
        nome: "Legumes",
        descricao: "Legumes essenciais para refeições equilibradas.",
        quantidade: "Do campo à mesa",
        imagem:
            "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=85",
        icone: Leaf,
        cor: "olive"
    },
    {
        id: "pescado",
        nome: "Pescado e mariscos",
        descricao: "Peixe e mariscos provenientes da nossa costa.",
        quantidade: "Produtos do mar",
        imagem:
            "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=900&q=85",
        icone: Fish,
        cor: "blue"
    },
    {
        id: "cereais",
        nome: "Cereais e grãos",
        descricao: "Cereais e grãos para diferentes necessidades.",
        quantidade: "Essenciais do dia a dia",
        imagem:
            "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=900&q=85",
        icone: Wheat,
        cor: "brown"
    },
    {
        id: "laticinios",
        nome: "Lacticínios",
        descricao: "Leite e outros produtos de origem láctea.",
        quantidade: "Para toda a família",
        imagem:
            "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=85",
        icone: Milk,
        cor: "blue"
    },
    {
        id: "carnes",
        nome: "Carnes",
        descricao: "Produtos de origem animal para as suas refeições.",
        quantidade: "Selecção de produtos",
        imagem:
            "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=85",
        icone: Beef,
        cor: "orange"
    },
    {
        id: "outros",
        nome: "Outros produtos",
        descricao: "Descubra mais produtos disponíveis no mercado.",
        quantidade: "Mais para descobrir",
        imagem:
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85",
        icone: Package,
        cor: "brown"
    }
];

export default function Categorias() {
    return (
        <>
            <Header />

            <main className="mf-categories-page">
                <section className="mf-categories-hero">
                    <div className="mf-categories-container">
                        <div className="mf-categories-breadcrumb">
                            <Link to="/">Início</Link>
                            <ChevronRight size={14} />
                            <span>Categorias</span>
                        </div>

                        <div className="mf-categories-hero-grid">
                            <div className="mf-categories-hero-copy">
                                <span className="mf-categories-eyebrow">
                                    <Sprout size={16} />
                                    Explore o mercado
                                </span>

                                <h1>
                                    Tudo o que procura,
                                    <br />
                                    <span>num só lugar.</span>
                                </h1>

                                <p>
                                    Explore as nossas categorias e descubra
                                    produtos agrícolas, pescado e muito mais,
                                    reunidos para facilitar as suas compras.
                                </p>

                                <Link
                                    to="/produtos"
                                    className="mf-categories-hero-button"
                                >
                                    Explorar produtos
                                    <ArrowRight size={18} />
                                </Link>

                                <div className="mf-categories-hero-note">
                                    <ShoppingBasket size={17} />
                                    <span>Da produção local até si</span>
                                </div>
                            </div>

                            <div className="mf-categories-hero-image">
                                <img
                                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1100&q=85"
                                    alt="Variedade de produtos frescos num mercado"
                                />

                                <div className="mf-categories-image-label">
                                    <span className="mf-categories-image-icon">
                                        <Leaf size={20} />
                                    </span>
                                    <div>
                                        <strong>Mercado Fresko</strong>
                                        <span>O melhor da terra e do mar</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mf-categories-content">
                    <div className="mf-categories-container">
                        <div className="mf-categories-heading">
                            <div>
                                <span className="mf-categories-section-label">
                                    Encontre o que precisa
                                </span>
                                <h2>Explore por categoria</h2>
                                <p>
                                    Cada categoria aproxima-o dos produtos
                                    que procura.
                                </p>
                            </div>

                            <span className="mf-categories-count">
                                {categorias.length} categorias
                            </span>
                        </div>

                        <div className="mf-categories-grid">
                            {categorias.map((categoria) => {
                                const Icon = categoria.icone;

                                return (
                                    <article
                                        className="mf-category-card"
                                        key={categoria.id}
                                    >
                                        <Link
                                            to={`/produtos?categoria=${encodeURIComponent(
                                                categoria.nome === "Pescado e mariscos"
                                                    ? "Pescado"
                                                    : categoria.nome === "Cereais e grãos"
                                                    ? "Agroprodutos"
                                                    : categoria.nome === "Outros produtos"
                                                    ? "Todos"
                                                    : categoria.nome
                                            )}`}
                                            className="mf-category-card-link"
                                        >
                                            <div className="mf-category-image">
                                                <img
                                                    src={categoria.imagem}
                                                    alt={categoria.nome}
                                                    loading="lazy"
                                                />

                                                <span
                                                    className={`mf-category-icon ${categoria.cor}`}
                                                >
                                                    <Icon size={21} strokeWidth={1.8} />
                                                </span>
                                            </div>

                                            <div className="mf-category-card-content">
                                                <span className="mf-category-kicker">
                                                    {categoria.quantidade}
                                                </span>

                                                <h3>{categoria.nome}</h3>

                                                <p>{categoria.descricao}</p>

                                                <span className="mf-category-explore">
                                                    Explorar categoria
                                                    <ArrowRight size={17} />
                                                </span>
                                            </div>
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="mf-categories-cta">
                            <div className="mf-categories-cta-icon">
                                <ShoppingBasket size={25} />
                            </div>

                            <div className="mf-categories-cta-copy">
                                <span>O mercado está à sua espera</span>
                                <h2>Encontre os seus produtos favoritos.</h2>
                                <p>
                                    Consulte o catálogo e descubra o que está
                                    disponível no Mercado Fresko.
                                </p>
                            </div>

                            <Link
                                to="/produtos"
                                className="mf-categories-cta-button"
                            >
                                Ver todos os produtos
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
