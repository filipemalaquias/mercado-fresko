
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDocsFromServer,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { auth, db, functions } from "../../firebase/config";
import MenuComerciante from "./menu";
import "./encomendas.css";

const ESTADOS = [
    { value: "pendente", label: "Pendente" },
    { value: "verificado", label: "Verificado" },
    { value: "empacotado", label: "Empacotado" },
    { value: "em_delivery", label: "Em delivery" },
    { value: "entregue", label: "Entregue" },
];

const ESTADO_CANCELADA = { value: "cancelada", label: "Cancelada" };

const normalizarEstado = (estado) => {
    const valor = String(estado || "pendente")
        .toLowerCase()
        .trim()
        .replaceAll(" ", "_")
        .replaceAll("-", "_");

    if (["confirmado", "confirmada", "verified"].includes(valor)) {
        return "verificado";
    }

    if (["embalado", "embalada", "packed"].includes(valor)) {
        return "empacotado";
    }

    if (["delivery", "em_entrega", "a_caminho", "em_transito"].includes(valor)) {
        return "em_delivery";
    }

    if (["entregue", "delivered", "concluido", "concluida"].includes(valor)) {
        return "entregue";
    }

    if (["cancelada", "cancelado", "cancelled", "canceled"].includes(valor)) {
        return "cancelada";
    }

    return ESTADOS.some((item) => item.value === valor)
        ? valor
        : "pendente";
};

const obterData = (encomenda) => {
    const valor =
        encomenda.criadoEm ||
        encomenda.dataCriacao ||
        encomenda.createdAt ||
        encomenda.data ||
        encomenda.timestamp;

    if (!valor) return null;

    if (typeof valor.toDate === "function") {
        return valor.toDate();
    }

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
};

const formatarData = (encomenda) => {
    const data = obterData(encomenda);

    if (!data) return "Data não disponível";

    return new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
};

const formatarValor = (valor) =>
    new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "AOA",
        maximumFractionDigits: 2,
    }).format(Number(valor) || 0);

const obterNumero = (encomenda) =>
    encomenda.numeroEncomenda ||
    encomenda.numeroPedido ||
    encomenda.codigo ||
    encomenda.id.slice(0, 8).toUpperCase();

const obterCliente = (encomenda) =>
    encomenda.clienteNome ||
    encomenda.nomeCliente ||
    encomenda.nome ||
    encomenda.cliente?.nome ||
    encomenda.cliente?.nomeCompleto ||
    "Cliente sem nome";

const obterTelefone = (encomenda) =>
    encomenda.clienteTelefone ||
    encomenda.telefoneCliente ||
    encomenda.telefone ||
    encomenda.cliente?.telefone ||
    "Não indicado";

const obterItens = (encomenda) => {
    const itens = encomenda.itens || encomenda.produtos || encomenda.items;
    return Array.isArray(itens) ? itens : [];
};

const obterQuantidade = (encomenda) => {
    const itens = obterItens(encomenda);

    if (itens.length) {
        return itens.reduce(
            (total, item) =>
                total + (Number(item.quantidade || item.quantity) || 1),
            0
        );
    }

    return Number(encomenda.quantidadeItens || encomenda.quantidade) || 0;
};

const obterTotal = (encomenda) => {
    const valor =
        encomenda.total ??
        encomenda.valorTotal ??
        encomenda.totalPedido ??
        encomenda.valor ??
        encomenda.totalAmount;

    if (valor !== undefined && valor !== null) {
        return Number(valor) || 0;
    }

    return obterItens(encomenda).reduce((total, item) => {
        const preco = Number(item.preco ?? item.price) || 0;
        const quantidade = Number(item.quantidade ?? item.quantity) || 1;
        return total + preco * quantidade;
    }, 0);
};

function Encomendas() {
    const [utilizador, setUtilizador] = useState(null);
    const [encomendas, setEncomendas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [pesquisa, setPesquisa] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [selecionada, setSelecionada] = useState(null);
    const [atualizando, setAtualizando] = useState("");
    const [atualizandoLista, setAtualizandoLista] = useState(false);
    const [mensagem, setMensagem] = useState("");

    useEffect(() => {
        const cancelarAuth = onAuthStateChanged(auth, (user) => {
            setUtilizador(user);

            if (!user) {
                setEncomendas([]);
                setCarregando(false);
            }
        });

        return () => cancelarAuth();
    }, []);

    useEffect(() => {
        if (!utilizador?.uid) return;

        setCarregando(true);
        setErro("");

        const consulta = query(
            collection(db, "encomendas"),
            where("comercianteId", "==", utilizador.uid)
        );

        const cancelar = onSnapshot(
            consulta,
            (snapshot) => {
                const lista = snapshot.docs.map((item) => ({
                    id: item.id,
                    ...item.data(),
                }));

                lista.sort((a, b) => {
                    const dataA = obterData(a)?.getTime() || 0;
                    const dataB = obterData(b)?.getTime() || 0;
                    return dataB - dataA;
                });

                setEncomendas(lista);
                setCarregando(false);
            },
            (error) => {
                console.error("Erro ao carregar encomendas:", error);
                setErro(
                    "Não foi possível carregar as encomendas. Verifica as permissões do Firebase e a coleção encomendas."
                );
                setCarregando(false);
            }
        );

        return () => cancelar();
    }, [utilizador?.uid]);

    const estatisticas = useMemo(() => {
        const contar = (estado) =>
            encomendas.filter(
                (item) => normalizarEstado(item.estado || item.status) === estado
            ).length;

        return {
            total: encomendas.length,
            pendentes: contar("pendente"),
            preparacao: contar("verificado") + contar("empacotado"),
            delivery: contar("em_delivery"),
            entregues: contar("entregue"),
        };
    }, [encomendas]);

    const encomendasFiltradas = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return encomendas.filter((item) => {
            const estado = normalizarEstado(item.estado || item.status);

            const correspondeEstado =
                filtroEstado === "todos" || estado === filtroEstado;

            const correspondePesquisa =
                !termo ||
                obterNumero(item).toLowerCase().includes(termo) ||
                obterCliente(item).toLowerCase().includes(termo) ||
                obterTelefone(item).toLowerCase().includes(termo);

            return correspondeEstado && correspondePesquisa;
        });
    }, [encomendas, pesquisa, filtroEstado]);

    const atualizarEncomendas = async () => {
        if (!utilizador?.uid || atualizandoLista) return;

        setAtualizandoLista(true);
        setErro("");
        try {
            const snapshot = await getDocsFromServer(
                query(
                    collection(db, "encomendas"),
                    where("comercianteId", "==", utilizador.uid)
                )
            );
            const lista = snapshot.docs.map((documento) => ({
                id: documento.id,
                ...documento.data(),
            }));
            lista.sort((a, b) => (obterData(b)?.getTime() || 0) - (obterData(a)?.getTime() || 0));
            setEncomendas(lista);
            setMensagem("Encomendas atualizadas.");
        } catch (error) {
            console.error("Erro ao atualizar encomendas:", error);
            setErro(
                "Não foi possível atualizar as encomendas. Verifica a ligação e tenta novamente."
            );
        } finally {
            setAtualizandoLista(false);
        }
    };

    const alterarEstado = async (encomenda, novoEstado) => {
        if (!utilizador?.uid || atualizando) return;
        if (
            novoEstado === "cancelada" &&
            !window.confirm(
                `Cancelar a encomenda ${obterNumero(encomenda)} e repor o stock dos produtos?`
            )
        ) {
            return;
        }

        setAtualizando(encomenda.id);
        setMensagem("");
        setErro("");

        try {
            const atualizarEncomenda = httpsCallable(
                functions,
                "atualizarEstadoEncomenda"
            );

            await atualizarEncomenda({
                encomendaId: encomenda.id,
                estado: novoEstado,
            });

            setMensagem(
                `Encomenda ${obterNumero(encomenda)} atualizada para "${(ESTADOS.find((e) => e.value === novoEstado) || ESTADO_CANCELADA).label}".`
            );

            setSelecionada((atual) =>
                atual?.id === encomenda.id
                    ? { ...atual, estado: novoEstado, status: novoEstado }
                    : atual
            );
        } catch (error) {
            console.error("Erro ao atualizar encomenda:", error);
            setErro(
                error.message ||
                    "Não foi possível atualizar o estado da encomenda. Tente novamente."
            );
        } finally {
            setAtualizando("");
        }
    };

    const avancarEstado = (encomenda) => {
        const estadoAtual = normalizarEstado(
            encomenda.estado || encomenda.status
        );
        const indice = ESTADOS.findIndex((e) => e.value === estadoAtual);

        if (indice >= 0 && indice < ESTADOS.length - 1) {
            alterarEstado(encomenda, ESTADOS[indice + 1].value);
        }
    };

    const proximoEstado = (encomenda) => {
        const estado = normalizarEstado(encomenda.estado || encomenda.status);
        const indice = ESTADOS.findIndex((e) => e.value === estado);
        return indice >= 0 ? ESTADOS[indice + 1] : undefined;
    };

    const renderEstado = (encomenda) => {
        const estado = normalizarEstado(encomenda.estado || encomenda.status);
        const encontrado =
            ESTADOS.find((e) => e.value === estado) ||
            (estado === "cancelada" ? ESTADO_CANCELADA : null);

        return (
            <span className={`enc-status enc-status-${estado}`}>
                <span className="enc-status-dot" />
                {encontrado?.label || "Pendente"}
            </span>
        );
    };

    if (!utilizador && !carregando) {
        return (
            <div className="enc-login">
                <div className="enc-login-card">
                    <span className="enc-login-icon">🔐</span>
                    <h2>Inicia sessão</h2>
                    <p>Entra na tua conta de comerciante para consultar as encomendas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="enc-layout">
            <MenuComerciante />

            <main className="enc-main">
                <header className="enc-header">
                    <div>
                        <span className="enc-eyebrow">GESTÃO DA LOJA</span>
                        <h1>Encomendas</h1>
                        <p>Acompanha e gere os pedidos dos teus clientes.</p>
                    </div>

                    <button
                        className="enc-refresh"
                        onClick={atualizarEncomendas}
                        disabled={atualizandoLista}
                        type="button"
                    >
                        <span aria-hidden="true">{atualizandoLista ? "…" : "↻"}</span>
                        <span>{atualizandoLista ? "A atualizar..." : "Atualizar encomendas"}</span>
                    </button>
                </header>

                {erro && <div className="enc-alert enc-alert-error">{erro}</div>}
                {mensagem && (
                    <div className="enc-alert enc-alert-success">{mensagem}</div>
                )}

                <section className="enc-stats">
                    <div className="enc-stat-card">
                        <div className="enc-stat-top">
                            <span className="enc-stat-label">Todas as encomendas</span>
                            <span className="enc-stat-icon enc-icon-blue">▤</span>
                        </div>
                        <strong>{estatisticas.total}</strong>
                        <small>Pedidos registados</small>
                    </div>

                    <div className="enc-stat-card">
                        <div className="enc-stat-top">
                            <span className="enc-stat-label">Novas</span>
                            <span className="enc-stat-icon enc-icon-orange">◷</span>
                        </div>
                        <strong>{estatisticas.pendentes}</strong>
                        <small>Aguardam verificação</small>
                    </div>

                    <div className="enc-stat-card">
                        <div className="enc-stat-top">
                            <span className="enc-stat-label">Em preparação</span>
                            <span className="enc-stat-icon enc-icon-purple">▣</span>
                        </div>
                        <strong>{estatisticas.preparacao}</strong>
                        <small>Verificadas ou empacotadas</small>
                    </div>

                    <div className="enc-stat-card">
                        <div className="enc-stat-top">
                            <span className="enc-stat-label">Em delivery</span>
                            <span className="enc-stat-icon enc-icon-cyan">➤</span>
                        </div>
                        <strong>{estatisticas.delivery}</strong>
                        <small>A caminho do cliente</small>
                    </div>

                    <div className="enc-stat-card">
                        <div className="enc-stat-top">
                            <span className="enc-stat-label">Entregues</span>
                            <span className="enc-stat-icon enc-icon-green">✓</span>
                        </div>
                        <strong>{estatisticas.entregues}</strong>
                        <small>Pedidos concluídos</small>
                    </div>
                </section>

                <section className="enc-panel">
                    <div className="enc-panel-heading">
                        <div>
                            <h2>Lista de encomendas</h2>
                            <p>Consulta os pedidos e atualiza o seu estado.</p>
                        </div>
                        <span className="enc-count">
                            {encomendasFiltradas.length} resultado(s)
                        </span>
                    </div>

                    <div className="enc-toolbar">
                        <div className="enc-search">
                            <span>⌕</span>
                            <input
                                type="search"
                                placeholder="Pesquisar por pedido, cliente ou telefone..."
                                value={pesquisa}
                                onChange={(e) => setPesquisa(e.target.value)}
                            />
                        </div>

                        <select
                            className="enc-filter"
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="todos">Todos os estados</option>
                            {ESTADOS.map((estado) => (
                                <option key={estado.value} value={estado.value}>
                                    {estado.label}
                                </option>
                            ))}
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>

                    {carregando ? (
                        <div className="enc-loading">
                            <span className="enc-spinner" />
                            <p>A carregar encomendas...</p>
                        </div>
                    ) : encomendasFiltradas.length === 0 ? (
                        <div className="enc-empty">
                            <span className="enc-empty-icon">▤</span>
                            <h3>
                                {encomendas.length
                                    ? "Nenhuma encomenda encontrada"
                                    : "Ainda não tens encomendas"}
                            </h3>
                            <p>
                                {encomendas.length
                                    ? "Experimenta alterar a pesquisa ou o filtro selecionado."
                                    : "Quando os clientes fizerem pedidos à tua loja, eles aparecerão aqui."}
                            </p>
                            {encomendas.length > 0 && (
                                <button
                                    className="enc-button-secondary"
                                    onClick={() => {
                                        setPesquisa("");
                                        setFiltroEstado("todos");
                                    }}
                                >
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="enc-table-wrap">
                            <table className="enc-table">
                                <thead>
                                    <tr>
                                        <th>Encomenda</th>
                                        <th>Cliente</th>
                                        <th>Data</th>
                                        <th>Artigos</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {encomendasFiltradas.map((encomenda) => {
                                        const proximo = proximoEstado(encomenda);
                                        const estado = normalizarEstado(
                                            encomenda.estado || encomenda.status
                                        );

                                        return (
                                            <tr key={encomenda.id}>
                                                <td>
                                                    <strong className="enc-order-number">
                                                        #{obterNumero(encomenda)}
                                                    </strong>
                                                    <small className="enc-order-sub">
                                                        ID: {encomenda.id.slice(0, 10)}
                                                    </small>
                                                </td>
                                                <td>
                                                    <div className="enc-customer">
                                                        <span className="enc-avatar">
                                                            {obterCliente(encomenda)
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </span>
                                                        <div>
                                                            <strong>{obterCliente(encomenda)}</strong>
                                                            <small>{obterTelefone(encomenda)}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="enc-date">
                                                    {formatarData(encomenda)}
                                                </td>
                                                <td>{obterQuantidade(encomenda)}</td>
                                                <td className="enc-total">
                                                    {formatarValor(obterTotal(encomenda))}
                                                </td>
                                                <td>{renderEstado(encomenda)}</td>
                                                <td>
                                                    <div className="enc-actions">
                                                        <button
                                                            type="button"
                                                            className="enc-view-btn"
                                                            title="Ver detalhes"
                                                            onClick={() => setSelecionada(encomenda)}
                                                        >
                                                            Ver
                                                        </button>

                                                        {proximo && (
                                                            <button
                                                                type="button"
                                                                className="enc-next-btn"
                                                                disabled={atualizando === encomenda.id}
                                                                onClick={() => avancarEstado(encomenda)}
                                                            >
                                                                {atualizando === encomenda.id
                                                                    ? "A guardar..."
                                                                    : `Marcar ${proximo.label.toLowerCase()}`}
                                                            </button>
                                                        )}

                                                        {estado === "pendente" && (
                                                            <button
                                                                type="button"
                                                                className="enc-cancel-btn"
                                                                disabled={atualizando === encomenda.id}
                                                                onClick={() => alterarEstado(encomenda, "cancelada")}
                                                            >
                                                                Cancelar
                                                            </button>
                                                        )}

                                                        {estado === "entregue" && (
                                                            <span className="enc-complete">Concluída ✓</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <footer className="enc-footer">
                    <span>Mercado Fresko</span>
                    <span>Gestão de encomendas</span>
                </footer>
            </main>

            {selecionada && (
                <div
                    className="enc-modal-backdrop"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setSelecionada(null);
                    }}
                >
                    <section className="enc-modal">
                        <div className="enc-modal-header">
                            <div>
                                <span className="enc-eyebrow">DETALHES DO PEDIDO</span>
                                <h2>#{obterNumero(selecionada)}</h2>
                                <p>{formatarData(selecionada)}</p>
                            </div>
                            <button
                                className="enc-modal-close"
                                onClick={() => setSelecionada(null)}
                                aria-label="Fechar"
                            >
                                ×
                            </button>
                        </div>

                        <div className="enc-modal-section">
                            <h3>Informações do cliente</h3>
                            <div className="enc-detail-row">
                                <span>Nome</span>
                                <strong>{obterCliente(selecionada)}</strong>
                            </div>
                            <div className="enc-detail-row">
                                <span>Telefone</span>
                                <strong>{obterTelefone(selecionada)}</strong>
                            </div>
                            <div className="enc-detail-row">
                                <span>Entrega ou levantamento</span>
                                <strong>
                                    {selecionada.moradaEntrega ||
                                        selecionada.enderecoEntrega ||
                                        selecionada.endereco ||
                                        selecionada.morada ||
                                        selecionada.cliente?.morada ||
                                        "A combinar diretamente com o cliente"}
                                </strong>
                            </div>
                            <div className="enc-detail-row">
                                <span>Pagamento</span>
                                <strong>A combinar diretamente com o cliente</strong>
                            </div>
                        </div>

                        <div className="enc-modal-section">
                            <h3>Produtos encomendados</h3>
                            {obterItens(selecionada).length === 0 ? (
                                <p className="enc-no-items">
                                    Os artigos não estão disponíveis nos dados deste pedido.
                                </p>
                            ) : (
                                <div className="enc-items">
                                    {obterItens(selecionada).map((item, index) => {
                                        const nome =
                                            item.nome ||
                                            item.nomeProduto ||
                                            item.name ||
                                            "Produto";
                                        const quantidade =
                                            Number(item.quantidade || item.quantity) || 1;
                                        const preco =
                                            Number(item.preco ?? item.price) || 0;

                                        return (
                                            <div className="enc-item" key={item.id || index}>
                                                <div>
                                                    <strong>{nome}</strong>
                                                    <small>
                                                        Quantidade: {quantidade}
                                                    </small>
                                                </div>
                                                <strong>
                                                    {formatarValor(preco * quantidade)}
                                                </strong>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="enc-modal-total">
                            <span>Total da encomenda</span>
                            <strong>{formatarValor(obterTotal(selecionada))}</strong>
                        </div>

                        <div className="enc-modal-section">
                            <h3>Estado do pedido</h3>
                            {renderEstado(selecionada)}

                            <div className="enc-progress">
                                {ESTADOS.map((estado, index) => {
                                    const atual = ESTADOS.findIndex(
                                        (e) =>
                                            e.value ===
                                            normalizarEstado(
                                                selecionada.estado || selecionada.status
                                            )
                                    );

                                    return (
                                        <div
                                            key={estado.value}
                                            className={`enc-progress-step ${
                                                index <= atual ? "is-done" : ""
                                            }`}
                                        >
                                            <span>{index < atual ? "✓" : index + 1}</span>
                                            <small>{estado.label}</small>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="enc-modal-actions">
                            <button
                                className="enc-button-secondary"
                                onClick={() => setSelecionada(null)}
                            >
                                Fechar
                            </button>

                            {proximoEstado(selecionada) && (
                                <button
                                    className="enc-button-primary"
                                    disabled={atualizando === selecionada.id}
                                    onClick={() => avancarEstado(selecionada)}
                                >
                                    {atualizando === selecionada.id
                                        ? "A guardar..."
                                        : `Marcar como ${proximoEstado(selecionada).label.toLowerCase()}`}
                                </button>
                            )}
                            {normalizarEstado(
                                selecionada.estado || selecionada.status
                            ) === "pendente" && (
                                <button
                                    className="enc-cancel-btn"
                                    disabled={atualizando === selecionada.id}
                                    onClick={() =>
                                        alterarEstado(selecionada, "cancelada")
                                    }
                                >
                                    Cancelar encomenda
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default Encomendas;
