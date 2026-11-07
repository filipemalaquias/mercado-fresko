import { Link } from "react-router-dom";
import { useState } from "react";
import {
    ShoppingBasket,
    ArrowUpRight,
    ArrowRight,
    Mail,
    MapPin,
    Leaf,
    AtSign,
    Send,
    Share2,
    Camera,
} from "lucide-react";

import "../styles/footer.css";

const colunas = [
    {
        titulo: "Explorar",
        links: [
            { nome: "Início", destino: "/" },
            { nome: "Produtos", destino: "/produtos" },
            { nome: "Categorias", destino: "/#categorias" },
            { nome: "Sobre nós", destino: "/#sobre" },
        ],
    },
    {
        titulo: "Parceiros",
        links: [
            { nome: "Os nossos parceiros", destino: "/#parceiros" },
            { nome: "Vender no Fresko", destino: "/#tornar-parceiro" },
            { nome: "Minha conta", destino: "/login" },
        ],
    },
    {
        titulo: "Apoio",
        links: [
            { nome: "Perguntas frequentes", destino: "/#faq" },
            { nome: "Termos e condições", destino: "/#termos" },
            { nome: "Política de privacidade", destino: "/#privacidade" },
        ],
    },
];

function Footer() {
    const ano = new Date().getFullYear();
    const [email, setEmail] = useState("");
    const [subscrito, setSubscrito] = useState(false);

    const subscrever = (event) => {
        event.preventDefault();
        if (!email.trim()) return;
        setSubscrito(true);
        setEmail("");
        setTimeout(() => setSubscrito(false), 4000);
    };

    return (
        <footer className="mf-footer">
            {/* ================= TOPO — marca + newsletter ================= */}
            <div className="mf-footer-top">
                <div className="mf-footer-container mf-footer-top-inner">
                    <div className="mf-footer-brand-block">
                        <Link to="/" className="mf-footer-brand">
                            <span className="mf-footer-logo">
                                <ShoppingBasket size={22} />
                            </span>
                            <span className="mf-footer-brand-text">
                                Mercado<strong>Fresko</strong>
                            </span>
                        </Link>

                        <p className="mf-footer-tagline">
                            Do produtor até si. Uma plataforma dedicada a
                            valorizar o comércio local angolano.
                        </p>
                    </div>

                    <form className="mf-footer-newsletter" onSubmit={subscrever}>
                        <label htmlFor="footer-email">
                            Receba novidades do mercado
                        </label>

                        <div className="mf-footer-input-wrap">
                            <Mail size={16} className="mf-footer-input-icon" />
                            <input
                                id="footer-email"
                                type="email"
                                placeholder="o.seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button type="submit" aria-label="Subscrever newsletter">
                                <Send size={16} />
                            </button>
                        </div>

                        {subscrito && (
                            <span className="mf-footer-newsletter-ok">
                                ✓ Subscrição registada. Obrigado!
                            </span>
                        )}
                    </form>
                </div>
            </div>

            {/* ================= CORPO — colunas ================= */}
            <div className="mf-footer-main">
                <div className="mf-footer-container mf-footer-grid">
                    <div className="mf-footer-brand-column">
                        <h3>Sobre o Fresko</h3>
                        <p>
                            Aproximamos produtores, comerciantes e consumidores
                            num só lugar. Produtos frescos, informação clara
                            e comércio local valorizado.
                        </p>

                        <div className="mf-footer-socials">
                            <a
                                href="https://www.facebook.com/"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Facebook"
                            >
                                <Share2 size={16} />
                            </a>
                            <a
                                href="https://www.instagram.com/"
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Instagram"
                            >
                                <Camera size={16} />
                            </a>
                            <a
                                href="mailto:contacto@mercadofresko.ao"
                                aria-label="Email"
                            >
                                <AtSign size={16} />
                            </a>
                        </div>
                    </div>

                    {colunas.map((coluna) => (
                        <div className="mf-footer-column" key={coluna.titulo}>
                            <h3>{coluna.titulo}</h3>
                            {coluna.links.map((link) => (
                                <Link key={link.nome} to={link.destino}>
                                    {link.nome}
                                </Link>
                            ))}
                        </div>
                    ))}

                    <div className="mf-footer-contact">
                        <h3>Fale connosco</h3>

                        <a
                            href="mailto:contacto@mercadofresko.ao"
                            className="mf-footer-contact-link"
                        >
                            <Mail size={15} />
                            contacto@mercadofresko.ao
                        </a>

                        <div className="mf-footer-location">
                            <MapPin size={15} />
                            <span>Luanda, Angola</span>
                        </div>

                        <Link to="/#tornar-parceiro" className="mf-footer-cta">
                            Quero ser parceiro
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ================= BASE ================= */}
            <div className="mf-footer-bottom">
                <div className="mf-footer-container mf-footer-bottom-inner">
                    <p>© {ano} Mercado Fresko. Todos os direitos reservados.</p>

                    <span className="mf-footer-signature">
                        <Leaf size={14} />
                        Valorizar o que é nosso.
                    </span>

                    <Link to="/produtos" className="mf-footer-back">
                        Explorar produtos
                        <ArrowUpRight size={15} />
                    </Link>
                </div>
            </div>
        </footer>
    );
}

export default Footer;