import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Heart,
  Package,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Store,
  UserRound,
  X,
} from "lucide-react";

// 👇 IMPORTANTE: Importar o Contexto do Carrinho
import { useCarrinho } from "../context/CarrinhoContext";
import "./MenuCliente.css";

export default function MenuCliente({
  usuario,
  onLogout,
  notificacoesNaoLidas = 0,
}) {
  const [submenuAberto, setSubmenuAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [pesquisaMobileAberta, setPesquisaMobileAberta] = useState(false);
  const [pesquisa, setPesquisa] = useState("");

  const submenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // 👇 USAR O CONTEXTO DO CARRINHO AQUI
  const { totalItens } = useCarrinho();

  const nome = usuario?.nome || "Cliente";
  const foto = usuario?.fotoPerfil || "";
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || "")
    .join("");

  const navegacao = [
    { nome: "Início", destino: "/cliente", tipo: "inicio", icon: ShoppingBag },
    { nome: "Produtos", destino: "/cliente/produtos", tipo: "produtos", icon: Package },
    { nome: "Lojas", destino: "/cliente/lojas", tipo: "lojas", icon: Store },
    { nome: "Meus pedidos", destino: "/cliente/pedidos", tipo: "pedidos", icon: ClipboardList },
  ];

  useEffect(() => {
    setSubmenuAberto(false);
    setMenuMobileAberto(false);
    setPesquisaMobileAberta(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    if (!menuMobileAberto) return;
    const fecharComEscape = (event) => {
      if (event.key === "Escape") setMenuMobileAberto(false);
    };
    document.addEventListener("keydown", fecharComEscape);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fecharComEscape);
      document.body.style.overflow = overflowAnterior;
    };
  }, [menuMobileAberto]);

  useEffect(() => {
    function fecharAoClicarFora(event) {
      if (submenuRef.current && !submenuRef.current.contains(event.target)) {
        setSubmenuAberto(false);
      }
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  const fecharMenu = () => setMenuMobileAberto(false);

  function terminarSessao() {
    setSubmenuAberto(false);
    if (onLogout) onLogout();
    else navigate("/login");
  }

  const submeterPesquisa = (event) => {
    event.preventDefault();
    const termo = pesquisa.trim();
    if (!termo) return;
    navigate(`/cliente/produtos?q=${encodeURIComponent(termo)}`);
    setPesquisa("");
    setPesquisaMobileAberta(false);
  };

  return (
    <header className="mfc-header">
      <div className="mfc-header-container">
        {/* Logótipo */}
        <Link to="/cliente" className="mfc-brand" onClick={fecharMenu}>
          <span className="mfc-brand-symbol">
            <ShoppingBasket size={25} strokeWidth={2} />
          </span>
          <span className="mfc-brand-text">
            <strong>Mercado</strong>
            <span>Fresko</span>
          </span>
        </Link>

        {/* Barra de pesquisa (desktop) */}
        <form className="mfc-search" role="search" onSubmit={submeterPesquisa}>
          <Search className="mfc-search-icon" size={18} />
          <input
            type="search"
            className="mfc-search-input"
            placeholder="Pesquisar produtos..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
          {pesquisa && (
            <button type="button" className="mfc-search-clear" onClick={() => setPesquisa("")}>
              <X size={16} />
            </button>
          )}
        </form>

        {/* Botão de pesquisa (mobile) */}
        <button
          type="button"
          className="mfc-search-toggle"
          onClick={() => setPesquisaMobileAberta((v) => !v)}
        >
          {pesquisaMobileAberta ? <X size={22} /> : <Search size={22} />}
        </button>

        {/* Navegação principal */}
        <nav className={`mfc-navigation ${menuMobileAberto ? "mfc-navigation-open" : ""}`}>
          <div className="mfc-nav-heading">
            <span>Navegação</span>
            <button type="button" className="mfc-nav-close" onClick={fecharMenu}>
              <X size={21} />
            </button>
          </div>

          {navegacao.map((item) => {
            const ativo = location.pathname === item.destino;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.tipo}
                to={item.destino}
                onClick={fecharMenu}
                className={`mfc-nav-link ${ativo ? "mfc-nav-active" : ""}`}
              >
                <span className="mfc-nav-icon-wrapper">
                  <Icon size={18} />
                  <span>{item.nome}</span>
                </span>
                <ChevronRight className="mfc-nav-chevron" size={17} />
              </NavLink>
            );
          })}

          <div className="mfc-mobile-footer">
            <p>Descubra e valorize o comércio local.</p>
            <button
              type="button"
              className="mfc-mobile-partner"
              onClick={() => { fecharMenu(); terminarSessao(); }}
            >
              Terminar sessão
            </button>
          </div>
        </nav>

        {/* Fundo do menu mobile */}
        {menuMobileAberto && (
          <button type="button" className="mfc-backdrop" onClick={fecharMenu} />
        )}

        {/* Ações (Carrinho e Perfil) */}
        <div className="mfc-actions">
          {/* 👇 O BADGE AGORA USA O totalItens DO CONTEXTO */}
          <Link to="/carrinho" className="mfc-action-btn" aria-label="Carrinho">
            <ShoppingCart size={20} />
            {totalItens > 0 && <span className="mfc-badge">{totalItens}</span>}
          </Link>

          <Link to="/cliente/notificacoes" className="mfc-action-btn" aria-label="Notificações">
            <Bell size={20} />
            {notificacoesNaoLidas > 0 && <span className="mfc-badge">{notificacoesNaoLidas}</span>}
          </Link>

          <div className="mfc-user-menu" ref={submenuRef}>
            <button
              type="button"
              className={`mfc-user-trigger${submenuAberto ? " is-open" : ""}`}
              onClick={() => setSubmenuAberto((aberto) => !aberto)}
            >
              <span className="mfc-user-avatar">
                {foto ? <img src={foto} alt="" /> : iniciais || <UserRound size={18} />}
              </span>
              <span className="mfc-user-info">
                <strong>{nome.split(" ")[0]}</strong>
              </span>
              <ChevronDown className={`mfc-user-chevron${submenuAberto ? " is-rotated" : ""}`} size={16} />
            </button>

            {submenuAberto && (
              <div className="mfc-user-dropdown">
                <div className="mfc-dropdown-heading">
                  <strong>{nome}</strong>
                  <span>{usuario?.email}</span>
                </div>
                <Link to="/cliente/perfil" className="mfc-dropdown-item" onClick={() => setSubmenuAberto(false)}>
                  <UserRound size={18} /> O meu perfil
                </Link>
                <Link to="/cliente/favoritos" className="mfc-dropdown-item" onClick={() => setSubmenuAberto(false)}>
                  <Heart size={18} /> Favoritos
                </Link>
                <Link to="/cliente/ajuda" className="mfc-dropdown-item" onClick={() => setSubmenuAberto(false)}>
                  <CircleHelp size={18} /> Ajuda
                </Link>
                <div className="mfc-dropdown-divider" />
                <button type="button" className="mfc-dropdown-item mfc-logout" onClick={terminarSessao}>
                  <LogOut size={18} /> Terminar sessão
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Botão do menu móvel */}
        <button
          type="button"
          className="mfc-menu-toggle"
          onClick={() => setMenuMobileAberto((aberto) => !aberto)}
        >
          {menuMobileAberto ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* Barra de pesquisa mobile */}
      {pesquisaMobileAberta && (
        <form className="mfc-search mfc-search-mobile" onSubmit={submeterPesquisa}>
          <Search className="mfc-search-icon" size={18} />
          <input
            type="search"
            className="mfc-search-input"
            placeholder="Pesquisar produtos..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            autoFocus
          />
          {pesquisa && (
            <button type="button" className="mfc-search-clear" onClick={() => setPesquisa("")}>
              <X size={16} />
            </button>
          )}
        </form>
      )}
    </header>
  );
}