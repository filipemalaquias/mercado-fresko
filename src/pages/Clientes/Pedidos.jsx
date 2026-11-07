import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  ArrowRight,
  Clock3,
  PackageCheck,
  Store,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { auth, db, functions } from "../../firebase/config";

const ESTADOS = {
  pendente: { titulo: "A aguardar confirmação", classe: "pendente" },
  verificado: { titulo: "Confirmada pela loja", classe: "verificado" },
  empacotado: { titulo: "Em preparação", classe: "empacotado" },
  em_delivery: { titulo: "A caminho", classe: "delivery" },
  entregue: { titulo: "Entregue", classe: "entregue" },
  cancelada: { titulo: "Cancelada", classe: "cancelada" },
};

function formatarValor(valor) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function formatarData(valor) {
  const data = valor?.toDate?.();
  return data
    ? new Intl.DateTimeFormat("pt-AO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(data)
    : "Data indisponível";
}

export default function ClientePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [cancelando, setCancelando] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    let cancelarPedidos = () => {};

    const cancelarAuth = onAuthStateChanged(auth, (user) => {
      cancelarPedidos();
      setPedidos([]);
      setErro("");

      if (!user) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      cancelarPedidos = onSnapshot(
        query(
          collection(db, "encomendas"),
          where("clienteUid", "==", user.uid)
        ),
        (snapshot) => {
          const lista = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          lista.sort(
            (a, b) =>
              (b.criadoEm?.toMillis?.() || 0) -
              (a.criadoEm?.toMillis?.() || 0)
          );
          setPedidos(lista);
          setCarregando(false);
        },
        (error) => {
          console.error("Não foi possível carregar os pedidos:", error);
          setErro(
            error.code === "permission-denied"
              ? "O Firebase recusou o acesso aos pedidos desta conta. Confirme a sessão e publique as regras Firestore atualizadas."
              : "Não foi possível carregar os pedidos. Verifique a ligação e tente novamente."
          );
          setCarregando(false);
        }
      );
    });

    return () => {
      cancelarAuth();
      cancelarPedidos();
    };
  }, []);

  const pedidosFiltrados = useMemo(
    () =>
      filtro === "todos"
        ? pedidos
        : pedidos.filter((pedido) => (pedido.estado || pedido.status) === filtro),
    [filtro, pedidos]
  );

  async function cancelarPedido(pedido) {
    if (cancelando) return;
    if (
      !window.confirm(
        `Cancelar o pedido #${pedido.numeroEncomenda || pedido.id.slice(0, 8).toUpperCase()}?`
      )
    ) {
      return;
    }

    setCancelando(pedido.id);
    setErro("");
    setMensagem("");

    try {
      await httpsCallable(functions, "atualizarEstadoEncomenda")({
        encomendaId: pedido.id,
        estado: "cancelada",
      });
      setMensagem("O pedido foi cancelado e o stock foi atualizado.");
    } catch (error) {
      console.error("Não foi possível cancelar o pedido:", error);
      setErro(
        error.message ||
          "Não foi possível cancelar o pedido. Atualize a página e tente novamente."
      );
    } finally {
      setCancelando("");
    }
  }

  return (
    <main className="mf-client-content">
      <div className="mf-client-page-heading">
        <div>
          <span className="mf-client-eyebrow">ACOMPANHAMENTO</span>
          <h1>Os meus pedidos</h1>
          <p>Consulte o estado e os detalhes dos pedidos enviados às lojas.</p>
        </div>
        <span className="mf-client-page-heading-icon">
          <PackageCheck size={27} />
        </span>
      </div>

      {erro && <div className="mf-client-alert" role="alert">{erro}</div>}
      {mensagem && <div className="mf-client-notice" role="status">{mensagem}</div>}

      <div className="mf-client-orders-toolbar">
        <label htmlFor="filtroPedidos">Filtrar pedidos</label>
        <select
          id="filtroPedidos"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
        >
          <option value="todos">Todos os estados</option>
          {Object.entries(ESTADOS).map(([estado, dados]) => (
            <option key={estado} value={estado}>{dados.titulo}</option>
          ))}
        </select>
        <span>{pedidosFiltrados.length} pedido(s)</span>
      </div>

      {carregando ? (
        <div className="mf-client-empty" role="status">
          <span className="mf-client-spinner" />
          <p>A carregar os seus pedidos...</p>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="mf-client-empty">
          <span className="mf-client-empty-icon">
            <PackageCheck size={27} />
          </span>
          <h2>{pedidos.length ? "Nenhum pedido neste estado" : "Ainda não tem pedidos"}</h2>
          <p>
            {pedidos.length
              ? "Escolha outro estado para consultar os seus pedidos."
              : "Explore o catálogo e envie o seu primeiro pedido diretamente a uma loja."}
          </p>
          <Link to="/produtos">Explorar produtos <ArrowRight size={17} /></Link>
        </div>
      ) : (
        <div className="mf-client-order-list">
          {pedidosFiltrados.map((pedido) => {
            const estadoKey = pedido.estado || pedido.status || "pendente";
            const estado = ESTADOS[estadoKey] || ESTADOS.pendente;
            const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

            return (
              <article className="mf-client-order-card" key={pedido.id}>
                <div className="mf-client-order-heading">
                  <div>
                    <span className="mf-client-order-number">
                      Pedido #{pedido.numeroEncomenda || pedido.id.slice(0, 8).toUpperCase()}
                    </span>
                    <small>{formatarData(pedido.criadoEm)}</small>
                  </div>
                  <span className={`mf-client-order-status ${estado.classe}`}>
                    {estado.titulo}
                  </span>
                </div>

                <div className="mf-client-order-store">
                  <Store size={16} />
                  <strong>{pedido.nomeLoja || "Comerciante local"}</strong>
                </div>

                <div className="mf-client-order-items">
                  {itens.map((item) => (
                    <span key={item.produtoId}>
                      {item.quantidade} × {item.nome}
                    </span>
                  ))}
                </div>

                <div className="mf-client-order-footer">
                  <span>
                    <Clock3 size={14} />
                    Pagamento e entrega combinados diretamente com a loja
                  </span>
                  <strong>{formatarValor(pedido.total)}</strong>
                </div>

                {estadoKey === "pendente" && (
                  <button
                    type="button"
                    className="mf-client-cancel-order"
                    onClick={() => cancelarPedido(pedido)}
                    disabled={cancelando === pedido.id}
                  >
                    <XCircle size={16} />
                    {cancelando === pedido.id ? "A cancelar..." : "Cancelar pedido"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
