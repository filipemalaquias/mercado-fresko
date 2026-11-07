
import { Link } from "react-router-dom";
import {
    ArrowRight,
    Heart,
    MapPin,
    ShieldCheck,
    Store,
    Target,
    Users,
    Eye,
    ShoppingBasket,
    Sparkles,
    Handshake,
    TrendingUp,
    CheckCircle2,
} from "lucide-react";

import Header from "../components/Header";
import "../styles/sobre.css";

const valores = [
    {
        icon: Heart,
        titulo: "Proximidade",
        descricao:
            "Aproximamos consumidores e comerciantes, valorizando as relações que fazem crescer as nossas comunidades.",
    },
    {
        icon: ShieldCheck,
        titulo: "Confiança",
        descricao:
            "Promovemos uma experiência clara e transparente para facilitar a descoberta de negócios locais.",
    },
    {
        icon: Users,
        titulo: "Inclusão",
        descricao:
            "Acreditamos que os pequenos negócios também devem ter acesso às oportunidades do mundo digital.",
    },
];

const beneficios = [
    "Mais visibilidade para os comerciantes locais",
    "Descoberta mais simples de lojas e produtos",
    "Uma ligação mais próxima entre negócios e consumidores",
];

export default function Sobre() {
    return (
        <>
            <Header />

            <main className="sobre-page">
                {/* HERO */}
                <section className="sobre-hero">
                    <div className="sobre-container sobre-hero-grid">
                        <div className="sobre-hero-copy">
                            <span className="sobre-eyebrow">
                                <Sparkles size={15} />
                                CONHEÇA O MERCADO FRESKO
                            </span>

                            <h1>
                                O comércio local
                                <span> mais perto de si.</span>
                            </h1>

                            <p>
                                Ligamos pessoas a negócios locais e ajudamos
                                os comerciantes a conquistar mais visibilidade.
                                Acreditamos que grandes oportunidades começam
                                perto de nós.
                            </p>

                            <div className="sobre-hero-actions">
                                <Link
                                    to="/parceiros"
                                    className="sobre-button"
                                >
                                    Seja nosso parceiro
                                    <ArrowRight size={18} />
                                </Link>

                                <a
                                    href="#quem-somos"
                                    className="sobre-text-link"
                                >
                                    Descubra a nossa história
                                    <ChevronIcon />
                                </a>
                            </div>

                            <div className="sobre-hero-trust">
                                <span>
                                    <CheckCircle2 size={16} />
                                    Comércio local
                                </span>
                                <span>
                                    <CheckCircle2 size={16} />
                                    Oportunidades digitais
                                </span>
                            </div>
                        </div>

                        <div className="sobre-visual">
                            <div className="sobre-visual-decoration sobre-decoration-one" />
                            <div className="sobre-visual-decoration sobre-decoration-two" />

                            <div className="sobre-visual-icon">
                                <ShoppingBasket
                                    size={66}
                                    strokeWidth={1.5}
                                />
                            </div>

                            <div className="sobre-floating-card sobre-floating-one">
                                <span className="sobre-floating-icon">
                                    <MapPin size={19} />
                                </span>
                                <span>
                                    <strong>Comércio local</strong>
                                    <small>Mais perto de si</small>
                                </span>
                            </div>

                            <div className="sobre-floating-card sobre-floating-two">
                                <span className="sobre-floating-icon">
                                    <TrendingUp size={19} />
                                </span>
                                <span>
                                    <strong>Novas oportunidades</strong>
                                    <small>Negócios em crescimento</small>
                                </span>
                            </div>

                            <div className="sobre-visual-caption">
                                <span className="sobre-caption-dot" />
                                <span>
                                    Pessoas, negócios e comunidades.
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* QUEM SOMOS */}
                <section
                    className="sobre-section"
                    id="quem-somos"
                >
                    <div className="sobre-container sobre-intro">
                        <div className="sobre-intro-heading">
                            <span className="sobre-eyebrow">
                                QUEM SOMOS
                            </span>

                            <h2>
                                Acreditamos no poder do comércio local.
                            </h2>

                            <span className="sobre-heading-line" />
                        </div>

                        <div className="sobre-intro-text">
                            <p>
                                O Mercado Fresko é uma plataforma criada para
                                aproximar consumidores e comerciantes,
                                facilitando a descoberta de lojas e produtos
                                através da tecnologia.
                            </p>

                            <p>
                                Queremos ajudar os negócios locais a apresentar
                                o que fazem, alcançar novos clientes e aproveitar
                                as oportunidades do mercado digital.
                            </p>

                            <p>
                                Mais do que encontrar produtos, queremos
                                contribuir para uma relação mais próxima entre
                                os comerciantes e as comunidades que servem.
                            </p>

                            <Link
                                to="/parceiros"
                                className="sobre-inline-link"
                            >
                                Conheça a nossa rede
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* MISSÃO E VISÃO */}
                <section className="sobre-section sobre-section-soft">
                    <div className="sobre-container">
                        <div className="sobre-section-heading">
                            <span className="sobre-eyebrow">
                                O NOSSO PROPÓSITO
                            </span>

                            <h2>
                                Mais oportunidades para quem faz acontecer.
                            </h2>

                            <p>
                                A tecnologia é o caminho. O desenvolvimento
                                do comércio local é o que queremos promover.
                            </p>
                        </div>

                        <div className="sobre-missao-grid">
                            <article className="sobre-missao-card">
                                <span className="sobre-missao-icon">
                                    <Target size={26} />
                                </span>

                                <span className="sobre-card-label">
                                    O QUE FAZEMOS
                                </span>

                                <h3>A nossa missão</h3>

                                <p>
                                    Facilitar a descoberta de lojas e produtos,
                                    apoiando a presença digital dos comerciantes
                                    e aproximando-os dos consumidores.
                                </p>
                            </article>

                            <article className="sobre-missao-card">
                                <span className="sobre-missao-icon">
                                    <Eye size={26} />
                                </span>

                                <span className="sobre-card-label">
                                    PARA ONDE VAMOS
                                </span>

                                <h3>A nossa visão</h3>

                                <p>
                                    Tornar o Mercado Fresko uma referência na
                                    descoberta do comércio local, contribuindo
                                    para o crescimento dos pequenos negócios
                                    em Angola.
                                </p>
                            </article>
                        </div>
                    </div>
                </section>

                {/* BENEFÍCIOS */}
                <section className="sobre-section">
                    <div className="sobre-container sobre-beneficios">
                        <div className="sobre-beneficios-visual">
                            <div className="sobre-beneficios-icon">
                                <Store size={43} strokeWidth={1.5} />
                            </div>

                            <div className="sobre-beneficios-message">
                                <Handshake size={22} />
                                <span>
                                    <strong>Crescemos juntos.</strong>
                                    <small>
                                        Cada negócio local conta.
                                    </small>
                                </span>
                            </div>
                        </div>

                        <div className="sobre-beneficios-content">
                            <span className="sobre-eyebrow">
                                PORQUÊ O MERCADO FRESKO?
                            </span>

                            <h2>
                                Oportunidades para os negócios. Facilidade
                                para os consumidores.
                            </h2>

                            <p>
                                Queremos tornar mais simples a forma como
                                descobrimos o comércio que existe à nossa volta,
                                valorizando quem empreende e quem escolhe
                                comprar localmente.
                            </p>

                            <ul className="sobre-beneficios-list">
                                {beneficios.map((beneficio) => (
                                    <li key={beneficio}>
                                        <CheckCircle2 size={19} />
                                        <span>{beneficio}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to="/parceiros"
                                className="sobre-button"
                            >
                                Descubra como participar
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* VALORES */}
                <section className="sobre-section sobre-section-soft">
                    <div className="sobre-container">
                        <div className="sobre-section-heading">
                            <span className="sobre-eyebrow">
                                OS NOSSOS VALORES
                            </span>

                            <h2>
                                Os princípios que nos orientam.
                            </h2>

                            <p>
                                Queremos construir uma plataforma que crie
                                valor para as pessoas, os negócios e as
                                comunidades.
                            </p>
                        </div>

                        <div className="valores-grid">
                            {valores.map(
                                ({ icon: Icon, titulo, descricao }) => (
                                    <article
                                        className="valor-card"
                                        key={titulo}
                                    >
                                        <span className="valor-icon">
                                            <Icon size={25} />
                                        </span>

                                        <h3>{titulo}</h3>
                                        <p>{descricao}</p>
                                    </article>
                                )
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="sobre-cta">
                    <div className="sobre-container sobre-cta-inner">
                        <div className="sobre-cta-content">
                            <span className="sobre-eyebrow">
                                CRESCEMOS EM CONJUNTO
                            </span>

                            <h2>
                                Tem um negócio? O seu próximo cliente pode
                                estar mais perto do que imagina.
                            </h2>

                            <p>
                                Junte-se ao Mercado Fresko e faça parte de uma
                                rede que valoriza o comércio local.
                            </p>
                        </div>

                        <Link
                            to="/parceiros"
                            className="sobre-button sobre-button-light"
                        >
                            Quero ser parceiro
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </section>
            </main>
        </>
    );
}

function ChevronIcon() {
    return <ArrowRight size={16} />;
}
