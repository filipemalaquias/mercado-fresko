
import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Boxes,
  Settings,
  Store,
  LogOut,
  Home,
  Menu as MenuIcon,
  X,
  CircleUserRound,
} from "lucide-react";

import { auth, db } from "../../firebase/config";
import "./menu.css";

const itensMenu = [
  {
    nome: "Dashboard",
    caminho: "/comerciantes/dashboard",
    icone: LayoutDashboard,
  },
  {
    nome: "Produtos",
    caminho: "/comerciantes/produtos",
    icone: Package,
  },
  {
    nome: "Stock",
    caminho: "/comerciantes/stock",
    icone: Boxes,
    indicador: "stock",
  },
  {
    nome: "Encomendas",
    caminho: "/comerciantes/encomendas",
    icone: ClipboardList,
    indicador: "encomendas",
  },
  {
    nome: "Configurações",
    caminho: "/comerciantes/configuracoes",
    icone: Settings,
  },
];

export default function MenuComerciante() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [aTerminarSessao, setATerminarSessao] = useState(false);
  const [erro, setErro] = useState("");
  const [indicadores, setIndicadores] = useState({ encomendas: 0, stock: 0 });
  const [erroIndicadores, setErroIndicadores] = useState("");

  useEffect(() => {
    let ativo = true;
    let cancelarDados = () => {};
    const cancelarAuth = onAuthStateChanged(auth, (utilizadorAtual) => {
      cancelarDados();
      cancelarDados = () => {};

      if (!utilizadorAtual) {
        setIndicadores({ encomendas: 0, stock: 0 });
        return;
      }

      let encomendasPendentes = 0;
      let produtosStockBaixo = 0;
      const cancelarEncomendas = onSnapshot(
        query(
          collection(db, "encomendas"),
          where("comercianteId", "==", utilizadorAtual.uid)
        ),
        (snapshot) => {
          encomendasPendentes = snapshot.docs.filter((documento) => {
            const dados = documento.data();
            const estado = String(dados.estado || dados.status || "pendente")
              .toLowerCase()
              .trim();
            return ["pendente", "pending", "aguardando"].includes(estado);
          }).length;
          if (ativo) {
            setIndicadores((atuais) => ({
              ...atuais,
              encomendas: encomendasPendentes,
            }));
            setErroIndicadores("");
          }
        },
        (error) => {
          console.error("Não foi possível atualizar o indicador de encomendas:", error);
          if (ativo) setErroIndicadores("Não foi possível atualizar os indicadores do menu.");
        }
      );
      const cancelarProdutos = onSnapshot(
        query(
          collection(db, "produtos"),
          where("comercianteId", "==", utilizadorAtual.uid)
        ),
        (snapshot) => {
          produtosStockBaixo = snapshot.docs.filter((documento) => {
            const dados = documento.data();
            const quantidade = Number(dados.quantidade) || 0;
            const minimo = Number(dados.stockMinimo) || 0;
            return quantidade <= 0 || quantidade <= minimo;
          }).length;
          if (ativo) {
            setIndicadores((atuais) => ({
              ...atuais,
              stock: produtosStockBaixo,
            }));
            setErroIndicadores("");
          }
        },
        (error) => {
          console.error("Não foi possível atualizar o indicador de stock:", error);
          if (ativo) setErroIndicadores("Não foi possível atualizar os indicadores do menu.");
        }
      );
      cancelarDados = () => {
        cancelarEncomendas();
        cancelarProdutos();
      };
    });

    return () => {
      ativo = false;
      cancelarDados();
      cancelarAuth();
    };
  }, []);

  async function terminarSessao() {
    if (aTerminarSessao) return;

    setATerminarSessao(true);
    setErro("");

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
      setErro("Não foi possível terminar a sessão. Tenta novamente.");
    } finally {
      setATerminarSessao(false);
    }
  }

  function fecharMenu() {
    setMenuAberto(false);
  }

  const utilizador = auth.currentUser;
  const nomeUtilizador =
    utilizador?.displayName || utilizador?.email || "Comerciante";

  return (
    <>
      <header className="mc-topbar">
        <Link
          to="/comerciantes/dashboard"
          className="mc-brand"
          onClick={fecharMenu}
        >
          <span className="mc-brand-icon">
            <Store size={24} />
          </span>

          <span className="mc-brand-text">
            <strong>Mercado Fresko</strong>
            <small>Gestão da sua loja</small>
          </span>
        </Link>

        <div className="mc-account">
          <span className="mc-account-avatar">
            {nomeUtilizador.charAt(0).toUpperCase()}
          </span>
          <span className="mc-account-info">
            <strong>{nomeUtilizador}</strong>
            <small>Comerciante</small>
          </span>
          <CircleUserRound size={18} aria-hidden="true" />
        </div>

        <button
          type="button"
          className="mc-mobile-toggle"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
        >
          {menuAberto ? <X size={23} /> : <MenuIcon size={23} />}
        </button>
      </header>

      {menuAberto && (
        <button
          type="button"
          className="mc-overlay"
          onClick={fecharMenu}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`mc-sidebar ${menuAberto ? "mc-sidebar-open" : ""}`}
      >
        <div className="mc-sidebar-heading">
          <span className="mc-sidebar-label">PAINEL DA LOJA</span>
        </div>

        <nav className="mc-navigation">
          {itensMenu.map((item) => {
            const Icone = item.icone;
            const quantidadeIndicador = item.indicador
              ? indicadores[item.indicador]
              : 0;

            return (
              <NavLink
                key={item.caminho}
                to={item.caminho}
                end={item.caminho === "/comerciantes/dashboard"}
                className={({ isActive }) =>
                  `mc-nav-link ${isActive ? "mc-nav-link-active" : ""}`
                }
                onClick={fecharMenu}
              >
                <Icone size={20} />
                <span>{item.nome}</span>
                {quantidadeIndicador > 0 && (
                  <span className="mc-nav-badge" aria-label={`${quantidadeIndicador} itens a requerer atenção`}>
                    {quantidadeIndicador > 99 ? "99+" : quantidadeIndicador}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mc-sidebar-bottom">
          {erro && (
            <p className="mc-error" role="alert">
              {erro}
            </p>
          )}
          {erroIndicadores && (
            <p className="mc-error" role="status">
              {erroIndicadores}
            </p>
          )}

          <Link
            to="/"
            className="mc-nav-link mc-public-link"
            onClick={fecharMenu}
          >
            <Home size={20} />
            <span>Ver site público</span>
          </Link>

          <button
            type="button"
            className="mc-logout-button"
            onClick={terminarSessao}
            disabled={aTerminarSessao}
          >
            <LogOut size={20} />
            <span>
              {aTerminarSessao
                ? "A terminar sessão..."
                : "Terminar sessão"}
            </span>
          </button>

          <div className="mc-sidebar-footer">
            Mercado Fresko © {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
}