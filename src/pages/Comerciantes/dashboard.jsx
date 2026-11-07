
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  LayoutDashboard,
  Store,
  Package,
  ClipboardList,
  Boxes,
  Settings,
  MapPin,
  Phone,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  TriangleAlert,
} from "lucide-react";

import { auth, db } from "../../firebase/config";
import MenuComerciante from "./menu";
import "./dashboard.css";

const formatarMoeda = (valor) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

const obterTotalEncomenda = (encomenda) => {
  const total =
    encomenda.total ??
    encomenda.valorTotal ??
    encomenda.totalPedido ??
    encomenda.valor ??
    encomenda.totalAmount;

  if (total !== undefined && total !== null) return Number(total) || 0;

  const itens = encomenda.itens || encomenda.produtos || encomenda.items;
  return Array.isArray(itens)
    ? itens.reduce(
        (soma, item) =>
          soma +
          (Number(item.preco ?? item.price) || 0) *
            (Number(item.quantidade ?? item.quantity) || 1),
        0
      )
    : 0;
};

const MODULOS = [
  {
    titulo: "Produtos",
    descricao: "Adicionar, editar e organizar os produtos da loja.",
    destino: "/comerciantes/produtos",
    icone: Package,
  },
  {
    titulo: "Encomendas",
    descricao: "Confirmar pedidos e acompanhar cada etapa da entrega.",
    destino: "/comerciantes/encomendas",
    icone: ClipboardList,
  },
  {
    titulo: "Stock",
    descricao: "Controlar as quantidades e a disponibilidade.",
    destino: "/comerciantes/stock",
    icone: Boxes,
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
  const [encomendas, setEncomendas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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

  useEffect(() => {
    if (!utilizador?.uid) return undefined;

    const cancelarEncomendas = onSnapshot(
      query(
        collection(db, "encomendas"),
        where("comercianteId", "==", utilizador.uid)
      ),
      (snapshot) => {
        setEncomendas(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
        );
      },
      (error) => {
        console.error("Erro ao carregar os indicadores de encomendas:", error);
        setErro("Não foi possível atualizar os indicadores das encomendas.");
      }
    );
    const cancelarProdutos = onSnapshot(
      query(
        collection(db, "produtos"),
        where("comercianteId", "==", utilizador.uid)
      ),
      (snapshot) => {
        setProdutos(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
        );
      },
      (error) => {
        console.error("Erro ao carregar os indicadores de produtos:", error);
        setErro("Não foi possível atualizar os indicadores dos produtos.");
      }
    );

    return () => {
      cancelarEncomendas();
      cancelarProdutos();
    };
  }, [utilizador?.uid]);

  const indicadores = useMemo(() => {
    const pendentes = encomendas.filter((encomenda) =>
      ["pendente", "pending", "aguardando"].includes(
        String(encomenda.estado || encomenda.status || "pendente")
          .toLowerCase()
          .trim()
      )
    ).length;
    const entregues = encomendas.filter((encomenda) =>
      ["entregue", "delivered", "concluido", "concluida"].includes(
        String(encomenda.estado || encomenda.status || "")
          .toLowerCase()
          .trim()
      )
    );
    const stockBaixo = produtos.filter((produto) => {
      const quantidade = Number(produto.quantidade) || 0;
      return quantidade <= (Number(produto.stockMinimo) || 0);
    }).length;

    return {
      encomendas: encomendas.length,
      pendentes,
      produtos: produtos.length,
      stockBaixo,
      vendasConcluidas: entregues.reduce(
        (total, encomenda) => total + obterTotalEncomenda(encomenda),
        0
      ),
    };
  }, [encomendas, produtos]);

  if (carregando) {
    return (
      <div className="mf-dashboard-loading">
        <LoaderCircle size={34} className="mf-dashboard-spin" />
        <p>A carregar o painel...</p>
      </div>
    );
  }

  const nomeLoja = loja?.nome || "A minha loja";

  return (
    <div className="mf-dashboard">
      <MenuComerciante />
      <div className="mf-dashboard-main">
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

          <section className="mf-dashboard-metrics" aria-label="Resumo do negócio">
            <Link to="/comerciantes/encomendas" className="mf-dashboard-metric">
              <span className="mf-dashboard-metric-icon is-blue"><ClipboardList size={20} /></span>
              <span><small>Encomendas pendentes</small><strong>{indicadores.pendentes}</strong><em>{indicadores.encomendas} no total</em></span>
              <Clock3 size={16} className="mf-dashboard-metric-arrow" />
            </Link>
            <Link to="/comerciantes/produtos" className="mf-dashboard-metric">
              <span className="mf-dashboard-metric-icon is-green"><PackageCheck size={20} /></span>
              <span><small>Produtos no catálogo</small><strong>{indicadores.produtos}</strong><em>Ver e gerir catálogo</em></span>
              <ArrowRight size={16} className="mf-dashboard-metric-arrow" />
            </Link>
            <Link to="/comerciantes/stock" className="mf-dashboard-metric">
              <span className="mf-dashboard-metric-icon is-orange"><TriangleAlert size={20} /></span>
              <span><small>Produtos para repor</small><strong>{indicadores.stockBaixo}</strong><em>Stock baixo ou esgotado</em></span>
              <ArrowRight size={16} className="mf-dashboard-metric-arrow" />
            </Link>
            <article className="mf-dashboard-metric">
              <span className="mf-dashboard-metric-icon is-purple"><CircleDollarSign size={20} /></span>
              <span><small>Vendas entregues</small><strong className="mf-dashboard-revenue">{formatarMoeda(indicadores.vendasConcluidas)}</strong><em>Valor de encomendas entregues</em></span>
            </article>
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
