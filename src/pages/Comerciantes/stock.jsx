import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  LoaderCircle,
  Package,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import MenuComerciante from "./menu";
import "./stock.css";

function estadoStock(produto) {
  const quantidade = Number(produto.quantidade) || 0;
  const minimo = Number(produto.stockMinimo) || 0;

  if (quantidade <= 0) return { texto: "Sem stock", classe: "is-empty" };
  if (quantidade <= minimo) return { texto: "Stock baixo", classe: "is-low" };
  return { texto: "Disponível", classe: "is-available" };
}

export default function StockComerciante() {
  const [utilizador, setUtilizador] = useState(auth.currentUser);
  const [produtos, setProdutos] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [aGuardar, setAGuardar] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, setUtilizador);
    return () => cancelar();
  }, []);

  useEffect(() => {
    if (!utilizador?.uid) {
      return undefined;
    }

    const cancelar = onSnapshot(
      query(
        collection(db, "produtos"),
        where("comercianteId", "==", utilizador.uid)
      ),
      (snapshot) => {
        const lista = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setProdutos(lista);
        setQuantidades((atuais) => {
          const seguintes = { ...atuais };
          for (const produto of lista) {
            if (!(produto.id in seguintes)) {
              seguintes[produto.id] = String(produto.quantidade ?? 0);
            }
          }
          return seguintes;
        });
        setCarregando(false);
      },
      (error) => {
        console.error("Não foi possível carregar o stock:", error);
        setErro(
          error.code === "permission-denied"
            ? "O Firebase recusou o acesso ao stock. Confirme a conta e as regras publicadas."
            : "Não foi possível carregar o stock. Verifique a ligação e tente novamente."
        );
        setCarregando(false);
      }
    );

    return () => cancelar();
  }, [utilizador?.uid]);

  const contagens = useMemo(
    () => ({
      todos: produtos.length,
      baixo: produtos.filter((produto) => {
        const qtd = Number(produto.quantidade) || 0;
        return qtd > 0 && qtd <= (Number(produto.stockMinimo) || 0);
      }).length,
      sem: produtos.filter((produto) => Number(produto.quantidade) <= 0).length,
    }),
    [produtos]
  );

  const listaFiltrada = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt-AO");
    return produtos.filter((produto) => {
      const quantidade = Number(produto.quantidade) || 0;
      const stockMinimo = Number(produto.stockMinimo) || 0;
      const correspondePesquisa =
        !termo ||
        `${produto.nome || ""} ${produto.categoria || ""}`
          .toLocaleLowerCase("pt-AO")
          .includes(termo);
      const correspondeFiltro =
        filtro === "todos" ||
        (filtro === "baixo" && quantidade > 0 && quantidade <= stockMinimo) ||
        (filtro === "sem" && quantidade <= 0);
      return correspondePesquisa && correspondeFiltro;
    });
  }, [produtos, pesquisa, filtro]);

  async function guardarQuantidade(produto) {
    const quantidade = Number(quantidades[produto.id]);
    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 1000000) {
      setErro("A quantidade deve ser um número inteiro entre 0 e 1 000 000.");
      setSucesso("");
      return;
    }

    setAGuardar(produto.id);
    setErro("");
    setSucesso("");
    try {
      await updateDoc(doc(db, "produtos", produto.id), {
        quantidade,
        atualizadoEm: serverTimestamp(),
      });
      setSucesso(`Stock de "${produto.nome}" atualizado.`);
    } catch (error) {
      console.error("Não foi possível atualizar o stock:", error);
      setErro(
        error.code === "permission-denied"
          ? "Não tem permissão para atualizar este produto. Confirme as regras do Firestore."
          : error.message || "Não foi possível atualizar o stock. Tente novamente."
      );
    } finally {
      setAGuardar("");
    }
  }

  return (
    <div className="mf-stock-page">
      <MenuComerciante />
      <main className="mf-stock-main">
        <header className="mf-stock-heading">
          <div>
            <span className="mf-stock-eyebrow">INVENTÁRIO DA LOJA</span>
            <h1>Controlo de stock</h1>
            <p>Atualize as quantidades e identifique rapidamente os produtos a repor.</p>
          </div>
          <span className="mf-stock-heading-icon"><Boxes size={29} /></span>
        </header>

        <section className="mf-stock-summary">
          <article><span>Total de produtos</span><strong>{contagens.todos}</strong><Package size={20} /></article>
          <article className="is-warning"><span>Stock baixo</span><strong>{contagens.baixo}</strong><AlertCircle size={20} /></article>
          <article className="is-empty"><span>Sem stock</span><strong>{contagens.sem}</strong><Boxes size={20} /></article>
        </section>

        {erro && <div className="mf-stock-alert is-error" role="alert"><AlertCircle size={18} />{erro}</div>}
        {sucesso && <div className="mf-stock-alert is-success" role="status"><CheckCircle2 size={18} />{sucesso}</div>}

        <section className="mf-stock-panel">
          <div className="mf-stock-toolbar">
            <label className="mf-stock-search">
              <Search size={17} />
              <input
                type="search"
                value={pesquisa}
                onChange={(event) => setPesquisa(event.target.value)}
                placeholder="Pesquisar produtos..."
                aria-label="Pesquisar produtos do stock"
              />
            </label>
            <div className="mf-stock-filters" aria-label="Filtrar stock">
              {[
                ["todos", "Todos"],
                ["baixo", "Stock baixo"],
                ["sem", "Sem stock"],
              ].map(([valor, titulo]) => (
                <button
                  type="button"
                  key={valor}
                  className={filtro === valor ? "is-active" : ""}
                  onClick={() => setFiltro(valor)}
                >
                  {titulo}
                  <span>{contagens[valor]}</span>
                </button>
              ))}
            </div>
          </div>

          {carregando ? (
            <div className="mf-stock-empty" role="status">
              <LoaderCircle size={27} className="mf-stock-spin" />
              <p>A carregar inventário...</p>
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="mf-stock-empty">
              <Package size={28} />
              <h2>{produtos.length ? "Nenhum produto encontrado" : "Ainda não há produtos"}</h2>
              <p>{produtos.length ? "Tente outra pesquisa ou filtro." : "Cadastre produtos para começar a controlar o stock."}</p>
              {!produtos.length && <Link to="/comerciantes/produtos">Adicionar produto <ArrowRight size={16} /></Link>}
            </div>
          ) : (
            <div className="mf-stock-list">
              {listaFiltrada.map((produto) => {
                const status = estadoStock(produto);
                const mudou = String(produto.quantidade ?? 0) !== quantidades[produto.id];

                return (
                  <article className="mf-stock-row" key={produto.id}>
                    <span className="mf-stock-product-icon"><Package size={21} /></span>
                    <div className="mf-stock-product-info">
                      <strong>{produto.nome}</strong>
                      <span>{produto.categoria || "Sem categoria"} · Stock mínimo: {produto.stockMinimo ?? 0}</span>
                    </div>
                    <span className={`mf-stock-badge ${status.classe}`}>{status.texto}</span>
                    <label className="mf-stock-quantity">
                      <span>Quantidade</span>
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        value={quantidades[produto.id] ?? ""}
                        onChange={(event) =>
                          setQuantidades((atuais) => ({
                            ...atuais,
                            [produto.id]: event.target.value,
                          }))
                        }
                        aria-label={`Quantidade de ${produto.nome}`}
                      />
                      <small>{produto.unidade || "unidade"}</small>
                    </label>
                    <button
                      type="button"
                      className="mf-stock-save"
                      disabled={!mudou || aGuardar === produto.id}
                      onClick={() => guardarQuantidade(produto)}
                    >
                      {aGuardar === produto.id ? <LoaderCircle size={16} className="mf-stock-spin" /> : <CheckCircle2 size={16} />}
                      <span>Guardar</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
