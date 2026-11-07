
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  LayoutDashboard,
  Store,
  Package,
  Boxes,
  Users,
  Settings,
  LogOut,
  MapPin,
  Phone,
  ArrowRight,
  Menu,
  X,
  ExternalLink,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import { auth, db } from "../../firebase/config";
import "./dashboard.css";

const MODULOS = [
  {
    titulo: "Produtos",
    descricao: "Adicionar, editar e organizar os produtos da loja.",
    destino: "/comerciantes/produtos",
    icone: Package,
  },
  {
    titulo: "Stock",
    descricao: "Controlar as quantidades e a disponibilidade.",
    destino: "/comerciantes/stock",
    icone: Boxes,
  },
  {
    titulo: "Utilizadores",
    descricao: "Gerir os utilizadores autorizados da loja.",
    destino: "/comerciantes/utilizadores",
    icone: Users,
  },
  {
    titulo: "Configurações",
    descricao: "Editar os dados e a apresentação da loja.",
    destino: "/comerciantes/configuracoes",
    icone: Settings,
  },
];

export default function ComercianteDashboard() {
  const navigate = useNavigate();

  const [utilizador, setUtilizador] = useState(null);
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    let ativo = true;

    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (!ativo) return;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      setUtilizador(user);
      setCarregando(true);
      setErro("");

      try {
        const referenciaLoja = doc(db, "lojas", user.uid);
        const resultado = await getDoc(referenciaLoja);

        if (!ativo) return;

        if (!resultado.exists()) {
          navigate("/comerciantes/home", { replace: true });
          return;
        }

        const dados = resultado.data();

        if (!dados.configurada) {
          navigate("/comerciantes/home", { replace: true });
          return;
        }

        setLoja(dados);
      } catch (error) {
        console.error("Erro ao carregar o dashboard:", error);

        if (ativo) {
          setErro(
            "Não foi possível carregar os dados da loja. Verifique as permissões do Firestore."
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      cancelar();
    };
  }, [navigate]);

  async function terminarSessao() {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
      setErro("Não foi possível terminar a sessão.");
    }
  }

  if (carregando) {
    return (
      <div className="mf-dashboard-loading">
        <LoaderCircle size={34} className="mf-dashboard-spin" />
        <p>A carregar o painel...</p>
      </div>
    );
  }

  const nomeLoja = loja?.nome || "A minha loja";

  const nomeComerciante =
    utilizador?.displayName ||
    utilizador?.email ||
    "Comerciante";

  return (
    <div className="mf-dashboard">
      {menuAberto && (
        <button
          className="mf-dashboard-overlay"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={`mf-dashboard-sidebar ${
          menuAberto ? "mf-dashboard-sidebar-open" : ""
        }`}
      >
        <Link
          to="/comerciantes/dashboard"
          className="mf-dashboard-brand"
          onClick={() => setMenuAberto(false)}
        >
          <span className="mf-dashboard-brand-icon">
            <Store size={23} />
          </span>
          <span>Mercado Fresko</span>
        </Link>

        <div className="mf-dashboard-store">
          <div className="mf-dashboard-store-logo">
            {loja?.logoUrl ? (
              <img src={loja.logoUrl} alt={`Logótipo de ${nomeLoja}`} />
            ) : (
              <Store size={27} />
            )}
          </div>

          <div className="mf-dashboard-store-info">
            <strong>{nomeLoja}</strong>
            <span>Área do comerciante</span>
          </div>
        </div>

        <p className="mf-dashboard-menu-label">MENU PRINCIPAL</p>

        <nav className="mf-dashboard-nav">
          <Link
            to="/comerciantes/dashboard"
            className="mf-dashboard-nav-link mf-dashboard-nav-active"
            onClick={() => setMenuAberto(false)}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </Link>

          {MODULOS.map((modulo) => {
            const Icone = modulo.icone;

            return (
              <Link
                key={modulo.destino}
                to={modulo.destino}
                className="mf-dashboard-nav-link"
                onClick={() => setMenuAberto(false)}
              >
                <Icone size={19} />
                <span>{modulo.titulo}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mf-dashboard-sidebar-bottom">
          <Link to="/" className="mf-dashboard-nav-link">
            <ExternalLink size={19} />
            <span>Ver página pública</span>
          </Link>

          <button
            type="button"
            className="mf-dashboard-nav-link mf-dashboard-logout"
            onClick={terminarSessao}
          >
            <LogOut size={19} />
            <span>Terminar sessão</span>
          </button>
        </div>
      </aside>

      <div className="mf-dashboard-main">
        <header className="mf-dashboard-topbar">
          <button
            type="button"
            className="mf-dashboard-menu-toggle"
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          >
            {menuAberto ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="mf-dashboard-breadcrumb">
            <span>Comerciante</span>
            <span>/</span>
            <strong>Dashboard</strong>
          </div>

          <div className="mf-dashboard-user">
            <div className="mf-dashboard-avatar">
              {nomeComerciante.charAt(0).toUpperCase()}
            </div>

            <div className="mf-dashboard-user-info">
              <strong>{nomeComerciante}</strong>
              <span>Comerciante</span>
            </div>
          </div>
        </header>

        <main className="mf-dashboard-content">
          {erro && (
            <div className="mf-dashboard-error" role="alert">
              <AlertCircle size={20} />
              <span>{erro}</span>
            </div>
          )}

          <section className="mf-dashboard-welcome">
            <div>
              <p className="mf-dashboard-eyebrow">
                PAINEL DE GESTÃO
              </p>

              <h1>Bem-vindo à tua loja!</h1>

              <p>
                Gere os produtos, acompanha o stock e mantém
                as informações da tua loja atualizadas.
              </p>
            </div>

            <div className="mf-dashboard-welcome-icon">
              <LayoutDashboard size={38} />
            </div>
          </section>

          <section className="mf-dashboard-store-card">
            <div className="mf-dashboard-store-card-logo">
              {loja?.logoUrl ? (
                <img src={loja.logoUrl} alt={`Logótipo de ${nomeLoja}`} />
              ) : (
                <Store size={34} />
              )}
            </div>

            <div className="mf-dashboard-store-card-info">
              <span className="mf-dashboard-status">
                <span className="mf-dashboard-status-dot" />
                Loja configurada
              </span>

              <h2>{nomeLoja}</h2>

              <p>
                <MapPin size={16} />
                {[loja?.municipio, loja?.provincia]
                  .filter(Boolean)
                  .join(", ") || "Localização não indicada"}
              </p>

              {loja?.telefone && (
                <p>
                  <Phone size={16} />
                  {loja.telefone}
                </p>
              )}
            </div>

            <Link
              to="/comerciantes/configuracoes"
              className="mf-dashboard-edit-button"
            >
              <Settings size={17} />
              Editar loja
            </Link>
          </section>

          <section className="mf-dashboard-section">
            <div className="mf-dashboard-section-heading">
              <div>
                <h2>Gestão da loja</h2>
                <p>
                  Escolhe uma área para gerir o teu negócio.
                </p>
              </div>
            </div>

            <div className="mf-dashboard-modules">
              {MODULOS.map((modulo) => {
                const Icone = modulo.icone;

                return (
                  <Link
                    key={modulo.destino}
                    to={modulo.destino}
                    className="mf-dashboard-module-card"
                  >
                    <div className="mf-dashboard-module-icon">
                      <Icone size={24} />
                    </div>

                    <h3>{modulo.titulo}</h3>
                    <p>{modulo.descricao}</p>

                    <span className="mf-dashboard-module-link">
                      Abrir módulo
                      <ArrowRight size={17} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mf-dashboard-section mf-dashboard-description">
            <div>
              <h2>Informações da loja</h2>
              <p>
                Mantém os dados comerciais atualizados para
                facilitar o contacto com os teus clientes.
              </p>
            </div>

            <div className="mf-dashboard-description-details">
              <div>
                <span>Nome</span>
                <strong>{loja?.nome || "Não indicado"}</strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>{loja?.telefone || "Não indicado"}</strong>
              </div>

              <div>
                <span>Província</span>
                <strong>{loja?.provincia || "Não indicada"}</strong>
              </div>

              <div>
                <span>Município</span>
                <strong>{loja?.municipio || "Não indicado"}</strong>
              </div>

              <div className="mf-dashboard-description-full">
                <span>Descrição</span>
                <strong>
                  {loja?.descricao || "Ainda não adicionaste uma descrição."}
                </strong>
              </div>
            </div>

            <Link
              to="/comerciantes/configuracoes"
              className="mf-dashboard-text-link"
            >
              Atualizar informações
              <ArrowRight size={17} />
            </Link>
          </section>

          <footer className="mf-dashboard-footer">
            <span>Mercado Fresko</span>
            <span>Área de gestão do comerciante</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
