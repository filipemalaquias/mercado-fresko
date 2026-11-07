import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    ChevronRight,
    Menu,
    Search,
    ShoppingBasket,
    ShoppingCart,
    UserRound,
    X,
} from "lucide-react";

import "../styles/header.css";
import CarrinhoIcone from "./CarrinhoIcone";

const navegacao = [
    { nome: "Início", destino: "/", tipo: "inicio" },
    { nome: "Sobre nós", destino: "/sobre", tipo: "sobre" },
    { nome: "Parceiros", destino: "/parceiros", tipo: "parceiros" },
];

function Header() {
    const [menuAberto, setMenuAberto] = useState(false);
    const [pesquisa, setPesquisa] = useState("");
    const [pesquisaMobileAberta, setPesquisaMobileAberta] = useState(false);

    const inputRef = useRef(null);
    const inputMobileRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        setMenuAberto(false);
        setPesquisaMobileAberta(false);
        window.scrollTo({ top: 0, behavior: "auto" });
    }, [location.pathname]);

    useEffect(() => {
        if (!menuAberto) return;

        const fecharComEscape = (event) => {
            if (event.key === "Escape") setMenuAberto(false);
        };

        document.addEventListener("keydown", fecharComEscape);
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", fecharComEscape);
            document.body.style.overflow = overflowAnterior;
        };
    }, [menuAberto]);

    useEffect(() => {
        if (pesquisaMobileAberta) {
            inputMobileRef.current?.focus();
        }
    }, [pesquisaMobileAberta]);

    const fecharMenu = () => setMenuAberto(false);

    const linkAtivo = (item) => {
        if (item.tipo === "inicio") return location.pathname === "/";
        return location.pathname === item.destino;
    };

    const submeterPesquisa = (event) => {
        event.preventDefault();
        const termo = pesquisa.trim();
        if (!termo) return;

        navigate(`/pesquisa?q=${encodeURIComponent(termo)}`);
        setPesquisa("");
        setPesquisaMobileAberta(false);
        fecharMenu();
    };

    return (
        <header className="mf-header">
            <div className="mf-header-container">
                {/* Logótipo */}
                <Link
                    to="/"
                    className="mf-brand"
                    aria-label="Mercado Fresko — página inicial"
                    onClick={fecharMenu}
                >
                    <span className="mf-brand-symbol" aria-hidden="true">
                        <ShoppingBasket size={25} strokeWidth={2} />
                    </span>
                    <span className="mf-brand-text">
                        <strong>Mercado</strong>
                        <span>Fresko</span>
                    </span>
                </Link>

                {/* Barra de pesquisa (desktop) */}
                <form
                    className="mf-search"
                    role="search"
                    onSubmit={submeterPesquisa}
                >
                    <Search
                        className="mf-search-icon"
                        size={18}
                        aria-hidden="true"
                    />
                    <input
                        ref={inputRef}
                        type="search"
                        className="mf-search-input"
                        placeholder="Pesquisar produtos, lojas, parceiros..."
                        value={pesquisa}
                        onChange={(e) => setPesquisa(e.target.value)}
                        aria-label="Pesquisar no Mercado Fresko"
                    />
                    {pesquisa && (
                        <button
                            type="button"
                            className="mf-search-clear"
                            onClick={() => {
                                setPesquisa("");
                                inputRef.current?.focus();
                            }}
                            aria-label="Limpar pesquisa"
                        >
                            <X size={16} />
                        </button>
                    )}
                </form>

                {/* Botão de pesquisa (mobile) */}
                <button
                    type="button"
                    className="mf-search-toggle"
                    onClick={() => setPesquisaMobileAberta((v) => !v)}
                    aria-label={
                        pesquisaMobileAberta
                            ? "Fechar pesquisa"
                            : "Abrir pesquisa"
                    }
                    aria-expanded={pesquisaMobileAberta}
                >
                    {pesquisaMobileAberta ? <X size={22} /> : <Search size={22} />}
                </button>

                {/* Navegação principal */}
                <nav
                    id="mf-navigation"
                    className={`mf-navigation ${
                        menuAberto ? "mf-navigation-open" : ""
                    }`}
                    aria-label="Navegação principal"
                >
                    <div className="mf-navigation-heading">
                        <span>Navegação</span>
                        <button
                            type="button"
                            className="mf-menu-close"
                            onClick={fecharMenu}
                            aria-label="Fechar menu"
                        >
                            <X size={21} />
                        </button>
                    </div>

                    {navegacao.map((item) => {
                        const ativo = linkAtivo(item);
                        return (
                            <Link
                                key={item.tipo}
                                to={item.destino}
                                onClick={fecharMenu}
                                aria-current={ativo ? "page" : undefined}
                                className={`mf-nav-link ${
                                    ativo ? "mf-nav-active" : ""
                                }`}
                            >
                                <span>{item.nome}</span>
                                <ChevronRight
                                    className="mf-nav-chevron"
                                    size={17}
                                />
                            </Link>
                        );
                    })}


                    <div className="mf-mobile-menu-footer">
                        <p>Descubra e valorize o comércio local.</p>

                        <Link
                            to="/login"
                            className="mf-mobile-account"
                            onClick={fecharMenu}
                        >
                            <UserRound size={19} />
                            <span>Aceder à minha conta</span>
                            <ArrowRight size={17} />
                        </Link>

                        <Link
                            to="/parceiros"
                            className="mf-mobile-partner"
                            onClick={fecharMenu}
                        >
                            Quero ser parceiro
                        </Link>
                    </div>
                </nav>

                {/* Fundo para fechar o menu móvel */}
                {menuAberto && (
                    <button
                        type="button"
                        className="mf-menu-backdrop"
                        aria-label="Fechar menu de navegação"
                        onClick={fecharMenu}
                    />
                )}

                {/* Ações para computador */}
                <div className="mf-header-actions">
                    <CarrinhoIcone />
                    <Link
                        to="/login"
                        className="mf-account-button"
                        aria-label="Aceder à minha conta"
                    >
                        <UserRound size={18} />
                        <span>Entrar</span>
                    </Link>
                    <Link to="/parceiros" className="mf-header-cta">
                        <span>Seja parceiro</span>
                        <ArrowRight size={17} />
                    </Link>
                </div>

                {/* Botão do menu móvel */}
                <button
                    type="button"
                    className={`mf-menu-toggle ${
                        menuAberto ? "mf-menu-toggle-active" : ""
                    }`}
                    onClick={() => setMenuAberto((aberto) => !aberto)}
                    aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
                    aria-expanded={menuAberto}
                    aria-controls="mf-navigation"
                >
                    {menuAberto ? <X size={23} /> : <Menu size={23} />}
                </button>
            </div>

            {/* Barra de pesquisa em linha própria no mobile */}
            {pesquisaMobileAberta && (
                <form
                    className="mf-search mf-search-mobile"
                    role="search"
                    onSubmit={submeterPesquisa}
                >
                    <Search
                        className="mf-search-icon"
                        size={18}
                        aria-hidden="true"
                    />
                    <input
                        ref={inputMobileRef}
                        type="search"
                        className="mf-search-input"
                        placeholder="Pesquisar produtos, lojas, parceiros..."
                        value={pesquisa}
                        onChange={(e) => setPesquisa(e.target.value)}
                        aria-label="Pesquisar no Mercado Fresko"
                    />
                    {pesquisa && (
                        <button
                            type="button"
                            className="mf-search-clear"
                            onClick={() => {
                                setPesquisa("");
                                inputMobileRef.current?.focus();
                            }}
                            aria-label="Limpar pesquisa"
                        >
                            <X size={16} />
                        </button>
                    )}
                </form>
            )}
        </header>
    );
}

export default Header;