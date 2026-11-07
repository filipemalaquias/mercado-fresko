import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  Apple,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Fish,
  Heart,
  Leaf,
  MapPin,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Store,
  Wheat,
  X,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { auth, db, functions } from "../firebase/config";
import imagemProduto from "../assets/hero.png";
import "../styles/produtos.css";

const CARRINHO_KEY = "mercado-fresko-carrinho";
const REFERENCIA_KEY = "mercado-fresko-afiliado";
const TEMPO_REFERENCIA = 30 * 24 * 60 * 60 * 1000;

function lerCarrinhoInicial() {
  try {
    const dados = JSON.parse(localStorage.getItem(CARRINHO_KEY) || "[]");
    return Array.isArray(dados)
      ? dados.filter(
          (item) =>
            typeof item?.produtoId === "string" &&
            Number.isInteger(item?.quantidade) &&
            item.quantidade > 0
        )
      : [];
  } catch (error) {
    console.warn("O carrinho guardado não pôde ser lido:", error);
    return [];
  }
}

function lerReferenciaAfiliado() {
  try {
    const valor = JSON.parse(localStorage.getItem(REFERENCIA_KEY) || "null");
    if (
      valor &&
      typeof valor.uid === "string" &&
      valor.expiraEm > Date.now()
    ) {
      return valor.uid;
    }
    localStorage.removeItem(REFERENCIA_KEY);
  } catch (error) {
    console.warn("A referência de afiliado guardada não pôde ser lida:", error);
  }
  return "";
}

function formatarPreco(preco) {
  return new Intl.NumberFormat("pt-AO", {
    maximumFractionDigits: 2,
  }).format(Number(preco) || 0) + " Kz";
}

function escolherIcone(categoria) {
  const valor = String(categoria || "").toLocaleLowerCase("pt-AO");
  if (valor.includes("peixe") || valor.includes("carne")) return Fish;
  if (valor.includes("fruta")) return Apple;
  if (valor.includes("agro") || valor.includes("cereal")) return Wheat;
  if (valor.includes("verdura") || valor.includes("legume")) return Leaf;
  return ShoppingBasket;
}

export default function Produtos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lojaFiltro = searchParams.get("loja") || "";
  const referenciaUrl = searchParams.get("ref") || "";
  const carrinhoSolicitado = searchParams.get("carrinho") === "aberto";
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCatalogo, setErroCatalogo] = useState("");
  const [utilizador, setUtilizador] = useState(auth.currentUser);
  const [favoritos, setFavoritos] = useState(() => new Set());
  const afiliadoUidRef = useRef(null);
  if (afiliadoUidRef.current === null) {
    afiliadoUidRef.current = lerReferenciaAfiliado();
  }
  const [pesquisa, setPesquisa] = useState(
    searchParams.get("pesquisa") || ""
  );
  const [categoria, setCategoria] = useState(
    searchParams.get("categoria") || "Todos"
  );
  const [ordenacao, setOrdenacao] = useState("relevancia");
  const [precoMaximo, setPrecoMaximo] = useState(Number.MAX_SAFE_INTEGER);
  const [origem, setOrigem] = useState("Todas");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [carrinho, setCarrinho] = useState(lerCarrinhoInicial);
  const [carrinhoAbertoManualmente, setCarrinhoAbertoManualmente] =
    useState(false);
  const carrinhoAberto = carrinhoSolicitado || carrinhoAbertoManualmente;
  const fecharCarrinhoRef = useRef(null);
  const [aEnviarPedido, setAEnviarPedido] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erroPedido, setErroPedido] = useState("");

  function atualizarCarrinho(novoCarrinho) {
    setCarrinho(novoCarrinho);

    try {
      localStorage.setItem(CARRINHO_KEY, JSON.stringify(novoCarrinho));
    } catch (error) {
      console.error("Não foi possível guardar o carrinho neste dispositivo:", error);
      setErroPedido(
        "O armazenamento local está indisponível. O carrinho ficará apenas nesta sessão."
      );
    }
  }

  useEffect(() => {
    if (!referenciaUrl || !/^[A-Za-z0-9_-]{1,128}$/.test(referenciaUrl)) {
      return;
    }

    afiliadoUidRef.current = referenciaUrl;
    try {
      localStorage.setItem(
        REFERENCIA_KEY,
        JSON.stringify({
          uid: referenciaUrl,
          expiraEm: Date.now() + TEMPO_REFERENCIA,
        })
      );
    } catch (error) {
      console.error("Não foi possível guardar a referência de afiliado:", error);
    }
  }, [referenciaUrl]);

  function abrirCarrinho() {
    setCarrinhoAbertoManualmente(true);
  }

  const fecharCarrinho = useCallback((limparReferencia = false) => {
    setCarrinhoAbertoManualmente(false);
    setErroPedido("");
    const parametros = new URLSearchParams(searchParams);
    const tinhaCarrinhoSolicitado = parametros.has("carrinho");
    parametros.delete("carrinho");
    if (limparReferencia) parametros.delete("ref");
    if (tinhaCarrinhoSolicitado || limparReferencia) {
      const pesquisaAtual = parametros.toString();
      navigate(`/produtos${pesquisaAtual ? `?${pesquisaAtual}` : ""}`, {
        replace: true,
      });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    let ativo = true;
    let sequencia = 0;
    let cancelarFavoritos = () => {};
    const cancelarAuth = onAuthStateChanged(auth, async (user) => {
      const sequenciaAtual = ++sequencia;
      cancelarFavoritos();
      setUtilizador(user);
      setFavoritos(new Set());

      if (user) {
        try {
          const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
          if (
            !ativo ||
            sequenciaAtual !== sequencia ||
            !perfilSnap.exists() ||
            perfilSnap.data().tipo !== "cliente"
          ) {
            return;
          }

          cancelarFavoritos = onSnapshot(
            collection(db, "usuarios", user.uid, "favoritos"),
            (snapshot) => {
              setFavoritos(new Set(snapshot.docs.map((item) => item.id)));
            },
            (error) => {
              console.error("Não foi possível carregar os favoritos:", error);
              setErroPedido(
                error.code === "permission-denied"
                  ? "As regras do Firebase ainda não permitem sincronizar favoritos. Publique as regras Firestore atualizadas."
                  : "Não foi possível sincronizar os favoritos da sua conta."
              );
            }
          );
        } catch (error) {
          console.error("Não foi possível validar os favoritos da conta:", error);
        }
      }
    });
    const consulta = query(
      collection(db, "produtos"),
      where("publicado", "==", true)
    );

    const cancelarProdutos = onSnapshot(
      consulta,
      (snapshot) => {
        setProdutos(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setErroCatalogo("");
        setCarregando(false);
      },
      (error) => {
        console.error("Não foi possível carregar o catálogo:", error);
        setErroCatalogo(
          "Não foi possível carregar os produtos. Verifique a ligação e tente novamente."
        );
        setCarregando(false);
      }
    );

    return () => {
      ativo = false;
      sequencia += 1;
      cancelarAuth();
      cancelarProdutos();
      cancelarFavoritos();
    };
  }, []);

  useEffect(() => {
    if (!carrinhoAberto) return undefined;

    const elementoAnterior = document.activeElement;
    fecharCarrinhoRef.current?.focus();

    function fecharComEscape(evento) {
      if (evento.key === "Escape") {
        fecharCarrinho();
      }
    }

    document.addEventListener("keydown", fecharComEscape);

    return () => {
      document.removeEventListener("keydown", fecharComEscape);
      if (elementoAnterior instanceof HTMLElement) {
        elementoAnterior.focus();
      }
    };
  }, [carrinhoAberto, fecharCarrinho]);

  const categorias = useMemo(
    () => [
      "Todos",
      ...new Set(produtos.map((produto) => produto.categoria).filter(Boolean)),
    ],
    [produtos]
  );

  const origens = useMemo(
    () => [...new Set(produtos.map((produto) => produto.provinciaOrigem).filter(Boolean))],
    [produtos]
  );

  const maiorPreco = useMemo(
    () => Math.max(1000, ...produtos.map((produto) => Number(produto.preco) || 0)),
    [produtos]
  );

  const produtosDisponiveis = useMemo(
    () =>
      produtos.filter(
        (produto) => Number(produto.quantidade) > 0 && Number(produto.preco) > 0
      ),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt-AO");
    const resultado = produtosDisponiveis.filter((produto) => {
      const origemProduto = produto.provinciaOrigem || "";
      const correspondePesquisa =
        !termo ||
        `${produto.nome || ""} ${produto.categoria || ""} ${origemProduto} ${produto.lojaNome || ""}`
          .toLocaleLowerCase("pt-AO")
          .includes(termo);

      return (
        correspondePesquisa &&
        (!lojaFiltro || produto.comercianteId === lojaFiltro) &&
        (categoria === "Todos" || produto.categoria === categoria) &&
        Number(produto.preco) <= precoMaximo &&
        (origem === "Todas" || origemProduto === origem)
      );
    });

    if (ordenacao === "preco-crescente") {
      resultado.sort((a, b) => Number(a.preco) - Number(b.preco));
    } else if (ordenacao === "preco-decrescente") {
      resultado.sort((a, b) => Number(b.preco) - Number(a.preco));
    } else if (ordenacao === "nome") {
      resultado.sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    } else if (ordenacao === "destaques") {
      resultado.sort((a, b) => Number(b.destaque) - Number(a.destaque));
    }

    return resultado;
  }, [
    produtosDisponiveis,
    pesquisa,
    lojaFiltro,
    categoria,
    precoMaximo,
    origem,
    ordenacao,
  ]);

  const produtosCarrinho = useMemo(
    () =>
      carrinho
        .map((item) => {
          const produto = produtos.find((registo) => registo.id === item.produtoId);
          return produto ? { ...item, produto } : null;
        })
        .filter(Boolean),
    [carrinho, produtos]
  );

  const totalCarrinho = produtosCarrinho.reduce(
    (total, item) =>
      total + Number(item.produto.preco || 0) * item.quantidade,
    0
  );
  const quantidadeCarrinho = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  );
  const comercianteCarrinho = produtosCarrinho[0]?.produto.comercianteId;
  const carrinhoTemLojasDiferentes = produtosCarrinho.some(
    (item) => item.produto.comercianteId !== comercianteCarrinho
  );

  function limparFiltros(limparLoja = false) {
    setPesquisa("");
    setCategoria("Todos");
    setOrdenacao("relevancia");
    setPrecoMaximo(maiorPreco);
    setOrigem("Todas");
    const parametros = new URLSearchParams(searchParams);
    parametros.delete("pesquisa");
    parametros.delete("categoria");
    if (limparLoja) parametros.delete("loja");
    setSearchParams(parametros);
  }

  async function alternarFavorito(produto) {
    setErroPedido("");
    if (!utilizador) {
      navigate("/login");
      return;
    }

    try {
      const perfilSnap = await getDoc(doc(db, "usuarios", utilizador.uid));
      if (!perfilSnap.exists() || perfilSnap.data().tipo !== "cliente") {
        setErroPedido("Os favoritos estão disponíveis para contas de cliente.");
        return;
      }

      const favoritoRef = doc(
        db,
        "usuarios",
        utilizador.uid,
        "favoritos",
        produto.id
      );
      if (favoritos.has(produto.id)) {
        await deleteDoc(favoritoRef);
      } else {
        await setDoc(favoritoRef, {
          produtoId: produto.id,
          criadoEm: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Não foi possível atualizar os favoritos:", error);
      setErroPedido(
        error.code === "permission-denied"
          ? "O Firebase recusou esta alteração. Publique as regras Firestore atualizadas e tente novamente."
          : error.message || "Não foi possível guardar este favorito."
      );
    }
  }

  function adicionarAoCarrinho(produto) {
    setMensagem("");
    setErroPedido("");

    const outroComerciante = produtosCarrinho.some(
      (item) => item.produto.comercianteId !== produto.comercianteId
    );

    if (outroComerciante) {
      setErroPedido(
        "O pedido é feito a uma loja de cada vez. Termine ou esvazie o pedido atual antes de escolher outra loja."
      );
      abrirCarrinho();
      return;
    }

    const atual = carrinho.find((item) => item.produtoId === produto.id);

    if (atual && atual.quantidade >= Number(produto.quantidade || 0)) {
      setErroPedido("A quantidade disponível deste produto já está no pedido.");
      abrirCarrinho();
      return;
    }

    const proximoCarrinho = atual
      ? carrinho.map((item) =>
          item.produtoId === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      : [...carrinho, { produtoId: produto.id, quantidade: 1 }];
    atualizarCarrinho(proximoCarrinho);
    setMensagem(`${produto.nome} foi adicionado ao pedido.`);
  }

  function alterarQuantidade(produtoId, delta) {
    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto) {
      atualizarCarrinho(
        carrinho.filter((item) => item.produtoId !== produtoId)
      );
      return;
    }

    atualizarCarrinho(
      carrinho
        .map((item) =>
          item.produtoId === produtoId
            ? {
                ...item,
                quantidade: Math.min(
                  Number(produto.quantidade || 0),
                  item.quantidade + delta
                ),
              }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  async function enviarPedido() {
    setErroPedido("");
    setMensagem("");

    if (!utilizador) {
      setErroPedido("Inicie sessão como cliente para enviar o pedido.");
      return;
    }

    if (carrinho.length === 0 || produtosCarrinho.length !== carrinho.length) {
      setErroPedido("Um dos produtos já não está disponível. Atualize o pedido.");
      return;
    }

    if (carrinhoTemLojasDiferentes) {
      setErroPedido("Cada pedido pode incluir produtos de uma única loja.");
      return;
    }

    setAEnviarPedido(true);

    try {
      const perfilSnap = await getDoc(doc(db, "usuarios", utilizador.uid));
      if (!perfilSnap.exists() || perfilSnap.data().tipo !== "cliente") {
        setErroPedido("Esta ação está disponível apenas para contas de cliente.");
        return;
      }

      const criarEncomenda = httpsCallable(functions, "criarEncomenda");
      const resultado = await criarEncomenda({
        itens: carrinho.map(({ produtoId, quantidade }) => ({
          produtoId,
          quantidade,
        })),
        afiliadoUid: afiliadoUidRef.current,
      });

      const pedido = resultado.data;
      atualizarCarrinho([]);
      afiliadoUidRef.current = "";
      try {
        localStorage.removeItem(REFERENCIA_KEY);
      } catch (error) {
        console.error("Não foi possível limpar a referência de afiliado:", error);
      }
      fecharCarrinho(true);
      setMensagem(
        `Pedido #${pedido.numeroEncomenda} enviado à loja. O comerciante combinará consigo os detalhes da entrega e do pagamento.`
      );
    } catch (error) {
      console.error("Não foi possível enviar o pedido:", error);
      if (error.code === "functions/failed-precondition") {
        setErroPedido(error.message);
      } else if (error.code === "functions/unauthenticated") {
        setErroPedido(
          "A sessão expirou ou a verificação de segurança não foi concluída. Inicie sessão novamente e tente outra vez."
        );
      } else {
        setErroPedido(
          error.message ||
            "Não foi possível enviar o pedido. Verifique a ligação e tente novamente."
        );
      }
    } finally {
      setAEnviarPedido(false);
    }
  }

  return (
    <>
      <Header />

      <main className="mf-products-page">
        <section className="mf-products-hero">
          <div className="mf-products-hero-inner">
            <div className="mf-products-breadcrumb">
              <Link to="/">Início</Link>
              <ChevronRight size={14} />
              <span>Produtos</span>
            </div>

            <div className="mf-products-hero-content">
              <div>
                <span className="mf-products-eyebrow">
                  <Leaf size={15} />
                  Mercado Fresko
                </span>
                <h1>
                  O melhor da terra
                  <br />
                  <span>e do mar.</span>
                </h1>
                <p>
                  Descubra produtos frescos, conheça a sua origem e envie
                  pedidos diretamente aos comerciantes locais.
                </p>
              </div>

              <div className="mf-products-hero-art">
                <img
                  src={imagemProduto}
                  alt="Seleção de produtos frescos"
                  loading="lazy"
                />
                <div className="mf-products-art-note">
                  <span className="mf-products-art-icon">
                    <Leaf size={19} />
                  </span>
                  <div>
                    <strong>Frescura local</strong>
                    <span>Da origem até si</span>
                  </div>
                </div>
              </div>
            </div>

            <form
              className="mf-products-search"
              onSubmit={(event) => {
                event.preventDefault();
                const parametros = new URLSearchParams(searchParams);
                const termo = pesquisa.trim();
                if (termo) parametros.set("pesquisa", termo);
                else parametros.delete("pesquisa");
                setSearchParams(parametros);
              }}
            >
              <Search size={21} />
              <input
                type="search"
                value={pesquisa}
                onChange={(event) => setPesquisa(event.target.value)}
                placeholder="O que procura hoje?"
                aria-label="Pesquisar produtos"
              />
              {pesquisa && (
                <button
                  type="button"
                  className="mf-products-search-clear"
                  onClick={() => {
                    setPesquisa("");
                    const parametros = new URLSearchParams(searchParams);
                    parametros.delete("pesquisa");
                    setSearchParams(parametros);
                  }}
                  aria-label="Limpar pesquisa"
                >
                  <X size={18} />
                </button>
              )}
              <button type="submit">Pesquisar</button>
            </form>
          </div>
        </section>

        <section className="mf-products-catalog">
          <div className="mf-products-catalog-inner">
            <div className="mf-products-catalog-heading">
              <div>
                <span className="mf-products-section-label">
                  O nosso catálogo
                </span>
                <h2>Explore os produtos</h2>
                <p>Escolha produtos e envie um pedido à respetiva loja.</p>
              </div>
              <div className="mf-products-heading-actions">
                <span className="mf-products-total">
                  {produtosFiltrados.length}{" "}
                  {produtosFiltrados.length === 1 ? "produto" : "produtos"}
                </span>
                <button
                  type="button"
                  className="mf-products-cart-button"
                  onClick={abrirCarrinho}
                  aria-label={`Abrir pedido, ${quantidadeCarrinho} artigo(s)`}
                >
                  <ShoppingBasket size={18} />
                  Pedido
                  <span>{quantidadeCarrinho}</span>
                </button>
              </div>
            </div>
            {lojaFiltro && (
              <div className="mf-products-store-filter" role="status">
                A mostrar produtos de uma loja selecionada.
                <Link to="/#lojas">Ver lojas em destaque</Link>
              </div>
            )}

            {mensagem && (
              <div className="mf-products-feedback is-success" role="status">
                <CheckCircle2 size={18} />
                {mensagem}
                <Link to="/cliente">Ver os meus pedidos</Link>
              </div>
            )}
            {erroPedido && (
              <div className="mf-products-feedback is-error" role="alert">
                {erroPedido}
              </div>
            )}

            <div className="mf-products-categories">
              {categorias.map((nome) => {
                const Icon = nome === "Todos" ? ShoppingBasket : escolherIcone(nome);
                const quantidade = nome === "Todos"
                  ? produtosDisponiveis.length
                  : produtosDisponiveis.filter((produto) => produto.categoria === nome).length;
                return (
                  <button
                    key={nome}
                    type="button"
                    className={
                      categoria === nome
                        ? "mf-products-category active"
                        : "mf-products-category"
                    }
                    onClick={() => {
                      setCategoria(nome);
                      const parametros = new URLSearchParams(searchParams);
                      if (nome === "Todos") parametros.delete("categoria");
                      else parametros.set("categoria", nome);
                      setSearchParams(parametros);
                    }}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span>{nome}</span>
                    <small>{quantidade}</small>
                  </button>
                );
              })}
            </div>

            {(pesquisa.trim() ||
              categoria !== "Todos" ||
              origem !== "Todas" ||
              precoMaximo < maiorPreco ||
              lojaFiltro) && (
              <div className="mf-products-active-filters" aria-label="Filtros ativos">
                <span>A filtrar:</span>
                {pesquisa.trim() && (
                  <button type="button" onClick={() => {
                    setPesquisa("");
                    const parametros = new URLSearchParams(searchParams);
                    parametros.delete("pesquisa");
                    setSearchParams(parametros);
                  }}>
                    Pesquisa: {pesquisa.trim()} <X size={14} />
                  </button>
                )}
                {categoria !== "Todos" && (
                  <button type="button" onClick={() => {
                    setCategoria("Todos");
                    const parametros = new URLSearchParams(searchParams);
                    parametros.delete("categoria");
                    setSearchParams(parametros);
                  }}>
                    {categoria} <X size={14} />
                  </button>
                )}
                {origem !== "Todas" && (
                  <button type="button" onClick={() => setOrigem("Todas")}>
                    {origem} <X size={14} />
                  </button>
                )}
                {precoMaximo < maiorPreco && (
                  <button type="button" onClick={() => setPrecoMaximo(maiorPreco)}>
                    Até {formatarPreco(precoMaximo)} <X size={14} />
                  </button>
                )}
                {lojaFiltro && (
                  <button type="button" onClick={() => {
                    const parametros = new URLSearchParams(searchParams);
                    parametros.delete("loja");
                    setSearchParams(parametros);
                  }}>
                    Loja selecionada <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="mf-products-active-clear"
                  onClick={() => limparFiltros(true)}
                >
                  Limpar tudo
                </button>
              </div>
            )}

            <div className="mf-products-toolbar">
              <button
                type="button"
                className={
                  filtrosAbertos
                    ? "mf-products-filter-button active"
                    : "mf-products-filter-button"
                }
                onClick={() => setFiltrosAbertos((aberto) => !aberto)}
              >
                <SlidersHorizontal size={17} />
                Filtros
              </button>
              <label className="mf-products-sort">
                <ArrowUpDown size={16} />
                <span>Ordenar:</span>
                <select
                  value={ordenacao}
                  onChange={(event) => setOrdenacao(event.target.value)}
                  aria-label="Ordenar produtos"
                >
                  <option value="relevancia">Relevância</option>
                  <option value="preco-crescente">Menor preço</option>
                  <option value="preco-decrescente">Maior preço</option>
                  <option value="nome">Nome A–Z</option>
                </select>
              </label>
            </div>

            {filtrosAbertos && (
              <div className="mf-products-filter-panel">
                <div className="mf-products-filter-field">
                  <label htmlFor="mf-price-filter">Preço máximo</label>
                  <strong>
                    {precoMaximo >= maiorPreco
                      ? "Sem limite"
                      : formatarPreco(precoMaximo)}
                  </strong>
                  <input
                    id="mf-price-filter"
                    type="range"
                    min="0"
                    max={Math.max(1000, maiorPreco)}
                    step="100"
                    value={Math.min(precoMaximo, Math.max(1000, maiorPreco))}
                    onChange={(event) =>
                      setPrecoMaximo(Number(event.target.value))
                    }
                  />
                </div>
                <div className="mf-products-filter-field">
                  <label htmlFor="mf-origin-filter">Origem</label>
                  <select
                    id="mf-origin-filter"
                    value={origem}
                    onChange={(event) => setOrigem(event.target.value)}
                  >
                    <option value="Todas">Todas as origens</option>
                    {origens.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="mf-products-reset"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {erroCatalogo ? (
              <div className="mf-products-empty" role="alert">
                <span className="mf-products-empty-icon">
                  <PackageSearch size={30} />
                </span>
                <h3>Não foi possível abrir o catálogo</h3>
                <p>{erroCatalogo}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : carregando ? (
              <div className="mf-products-empty" role="status">
                <span className="mf-products-loading-spinner" />
                <p>A carregar produtos...</p>
              </div>
            ) : produtosFiltrados.length > 0 ? (
              <div className="mf-products-grid">
                {produtosFiltrados.map((produto) => (
                  <article className="mf-product-card" key={produto.id}>
                    <div className="mf-product-image">
                      <img
                        src={produto.imagemUrl || imagemProduto}
                        alt={produto.nome}
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className={`mf-product-favorite${favoritos.has(produto.id) ? " is-saved" : ""}`}
                        onClick={() => alternarFavorito(produto)}
                        aria-label={
                          favoritos.has(produto.id)
                            ? `Remover ${produto.nome} dos favoritos`
                            : `Guardar ${produto.nome} nos favoritos`
                        }
                        aria-pressed={favoritos.has(produto.id)}
                      >
                        <Heart
                          size={18}
                          fill={favoritos.has(produto.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    <div className="mf-product-info">
                      <span className="mf-product-category">
                        {produto.categoria}
                      </span>
                      <h3 className="mf-product-name">{produto.nome}</h3>
                      <span className="mf-product-origin">
                        <MapPin size={14} />
                        {produto.provinciaOrigem || "Angola"}
                      </span>
                      <span className="mf-product-store">
                        <Store size={14} />
                        {produto.lojaNome || "Comerciante local"}
                      </span>
                      <div className="mf-product-card-bottom">
                        <div className="mf-product-price">
                          <strong>{formatarPreco(produto.preco)}</strong>
                          <span>por {produto.unidade || "unidade"}</span>
                        </div>
                        <button
                          type="button"
                          className="mf-product-add-button"
                          onClick={() => adicionarAoCarrinho(produto)}
                          aria-label={`Adicionar ${produto.nome} ao pedido`}
                        >
                          <Plus size={18} />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mf-products-empty">
                <span className="mf-products-empty-icon">
                  <PackageSearch size={30} />
                </span>
                <h3>
                  {produtosDisponiveis.length
                    ? "Não encontrámos produtos"
                    : "O catálogo está a ser preparado"}
                </h3>
                <p>
                  {produtosDisponiveis.length
                    ? "Experimente outra pesquisa ou remova alguns filtros."
                    : "Os comerciantes locais ainda não publicaram produtos disponíveis."}
                </p>
                {produtosDisponiveis.length > 0 && (
                  <button type="button" onClick={limparFiltros}>
                    Ver todos os produtos
                  </button>
                )}
              </div>
            )}

            <div className="mf-products-partner-banner">
              <div className="mf-products-partner-icon">
                <ShoppingBasket size={25} />
              </div>
              <div>
                <span>Tem produtos para vender?</span>
                <h3>Faça parte do Mercado Fresko.</h3>
                <p>
                  Ligue o seu negócio a novos clientes e amplie as suas
                  oportunidades de venda.
                </p>
              </div>
              <Link to="/registar?tipo=comerciante">
                Tornar-me parceiro
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {carrinhoAberto && (
        <div
          className="mf-cart-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharCarrinho();
            }
          }}
        >
          <section
            className="mf-cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mf-cart-title"
          >
            <header>
              <div>
                <span className="mf-products-section-label">
                  PEDIDO A UMA LOJA
                </span>
                <h2 id="mf-cart-title">O seu pedido</h2>
              </div>
              <button
                type="button"
                ref={fecharCarrinhoRef}
                onClick={fecharCarrinho}
                aria-label="Fechar pedido"
              >
                <X size={20} />
              </button>
            </header>

            {produtosCarrinho.length === 0 ? (
              <div className="mf-cart-empty">
                <ShoppingBasket size={28} />
                <p>O seu pedido ainda está vazio.</p>
              </div>
            ) : (
              <>
                <div className="mf-cart-items">
                  {produtosCarrinho.map(({ produto, quantidade }) => (
                    <article className="mf-cart-item" key={produto.id}>
                      <img
                        src={produto.imagemUrl || imagemProduto}
                        alt=""
                      />
                      <div className="mf-cart-item-info">
                        <strong>{produto.nome}</strong>
                        <span>{formatarPreco(produto.preco)}</span>
                        <div className="mf-cart-quantity">
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(produto.id, -1)}
                            aria-label={`Diminuir ${produto.nome}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{quantidade}</span>
                          <button
                            type="button"
                            disabled={
                              quantidade >= Number(produto.quantidade || 0)
                            }
                            onClick={() => alterarQuantidade(produto.id, 1)}
                            aria-label={`Aumentar ${produto.nome}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mf-cart-total">
                  <span>Total estimado</span>
                  <strong>{formatarPreco(totalCarrinho)}</strong>
                </div>
                <p className="mf-cart-disclaimer">
                  Não há cobrança online. A loja entrará em contacto para
                  combinar pagamento e entrega ou levantamento.
                </p>
                {!utilizador && (
                  <p className="mf-cart-login-note">
                    Inicie sessão com uma conta de cliente para enviar o pedido.
                  </p>
                )}
                <button
                  type="button"
                  className="mf-cart-submit"
                  disabled={aEnviarPedido || produtosCarrinho.length === 0}
                  onClick={() => {
                    if (!utilizador) {
                      navigate("/login");
                      return;
                    }
                    enviarPedido();
                  }}
                >
                  {aEnviarPedido ? "A enviar pedido..." : "Enviar pedido à loja"}
                </button>
                <button
                  type="button"
                  className="mf-cart-clear"
                  onClick={() => {
                    atualizarCarrinho([]);
                    setErroPedido("");
                  }}
                  disabled={aEnviarPedido}
                >
                  Esvaziar pedido
                </button>
              </>
            )}
          </section>
        </div>
      )}

      <Footer />
    </>
  );
}
