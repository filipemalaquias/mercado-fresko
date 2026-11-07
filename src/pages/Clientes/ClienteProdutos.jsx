
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where, } from "firebase/firestore";
import {
  Search,
  ShoppingCart,
  Star,
  Store,
  MapPin,
  Package,
  ChevronRight,
  Heart,
  SlidersHorizontal,
  X,
  RefreshCw,
  ShoppingBag,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { db } from "../../firebase/config";
import "./ClienteProdutos.css";

const formatarPreco = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "Preço indisponível";

  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(numero);
};

const texto = (valor) => String(valor ?? "").trim();

const numeroSeguro = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const obterAvaliacao = (produto) => {
  const campos = [
    "avaliacaoMedia",
    "mediaAvaliacoes",
    "classificacaoMedia",
    "rating",
    "avaliacao",
    "classificacao",
  ];

  for (const campo of campos) {
    const valor = Number(produto[campo]);

    if (
      produto[campo] !== undefined &&
      produto[campo] !== null &&
      Number.isFinite(valor) &&
      valor >= 0 &&
      valor <= 5
    ) {
      return valor;
    }
  }

  return 0;
};

const obterNumeroAvaliacoes = (produto) => {
  return numeroSeguro(
    produto.totalAvaliacoes ??
    produto.numeroAvaliacoes ??
    produto.avaliacoesCount ??
    produto.reviewCount ??
    0
  );
};

function ClienteProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [encomendas, setEncomendas] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  const [lojaSelecionada, setLojaSelecionada] = useState("Todas");
  const [ordenacao, setOrdenacao] = useState("recentes");

  const [favoritos, setFavoritos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [produtoDetalhe, setProdutoDetalhe] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let produtosCarregados = false;
    let lojasCarregadas = false;
    let encomendasCarregadas = false;

    const atualizarCarregamento = () => {
      if (
        produtosCarregados &&
        lojasCarregadas &&
        encomendasCarregadas
      ) {
        setCarregando(false);
      }
    };


const cancelarProdutos = onSnapshot(
  query(
    collection(db, "produtos"),
    where("publicado", "==", true)
  ),
  (snapshot) => {
    const lista = snapshot.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }))
      .filter(
        (produto) => numeroSeguro(produto.quantidade) > 0
      );

    setProdutos(lista);
    setErro("");

    produtosCarregados = true;
    atualizarCarregamento();
  },
  (error) => {
    console.error(
      "Erro ao carregar produtos:",
      error.code,
      error.message
    );

    setErro(
      error.code === "permission-denied"
        ? "O Firestore recusou a leitura dos produtos publicados. Verifica as regras de leitura da coleção produtos."
        : `Falha ao carregar produtos: ${error.message}`
    );

    produtosCarregados = true;
    atualizarCarregamento();
  }
);




const cancelarLojas = onSnapshot(
  query(
    collection(db, "lojas"),
    where("configurada", "==", true)
  ),
  (snapshot) => {
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    console.log("Lojas configuradas:", lista);

    setLojas(lista);

    lojasCarregadas = true;
    atualizarCarregamento();
  },
  (error) => {
    console.error(
      "Erro ao carregar lojas:",
      error.code,
      error.message
    );

    setErro(
      `Não foi possível carregar as lojas: ${error.message}`
    );

    lojasCarregadas = true;
    atualizarCarregamento();
  }
);



    const cancelarEncomendas = onSnapshot(
      collection(db, "encomendas"),
      (snapshot) => {
        setEncomendas(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
        );

        encomendasCarregadas = true;
        atualizarCarregamento();
      },
      (error) => {
        console.error("Erro ao carregar encomendas:", error);
        encomendasCarregadas = true;
        atualizarCarregamento();
      }
    );

    return () => {
      cancelarProdutos();
      cancelarLojas();
      cancelarEncomendas();
    };
  }, []);

  const categorias = useMemo(() => {
    const valores = produtos
      .map((produto) => texto(produto.categoria))
      .filter(Boolean);

    return ["Todas", ...new Set(valores)].sort((a, b) => {
      if (a === "Todas") return -1;
      if (b === "Todas") return 1;
      return a.localeCompare(b, "pt");
    });
  }, [produtos]);

  const comprasPorProduto = useMemo(() => {
    const contagem = {};

    encomendas.forEach((encomenda) => {
      const estado = texto(
        encomenda.estado ?? encomenda.status
      ).toLowerCase();

      // Não contabilizar encomendas canceladas.
      if (
        ["cancelada", "cancelado", "cancelled", "rejeitada", "rejeitado"].includes(
          estado
        )
      ) {
        return;
      }

      const itens = Array.isArray(encomenda.itens)
        ? encomenda.itens
        : Array.isArray(encomenda.produtos)
          ? encomenda.produtos
          : Array.isArray(encomenda.items)
            ? encomenda.items
            : [];

      itens.forEach((item) => {
        const idProduto =
          item.produtoId ??
          item.idProduto ??
          item.productId ??
          item.id;

        if (!idProduto) return;

        const quantidade = numeroSeguro(
          item.quantidade ?? item.quantity ?? 1
        );

        contagem[idProduto] =
          (contagem[idProduto] || 0) + Math.max(quantidade, 0);
      });
    });

    return contagem;
  }, [encomendas]);

  const produtosEnriquecidos = useMemo(() => {
    return produtos.map((produto) => {
      const loja =
        lojas.find(
          (item) => item.id === produto.comercianteId
        ) ||
        lojas.find(
          (item) => item.nome === produto.lojaNome
        );

      return {
        ...produto,
        lojaNomeExibicao:
          produto.lojaNome || loja?.nome || "Loja do Mercado Fresko",
        lojaLogo: loja?.logoUrl || "",
        lojaId: loja?.id || produto.comercianteId || "",
        provinciaExibicao:
          loja?.provincia || produto.provinciaOrigem || "",
        municipioExibicao: loja?.municipio || "",
        avaliacaoCalculada: obterAvaliacao(produto),
        numeroAvaliacoesCalculado: obterNumeroAvaliacoes(produto),
        totalComprado: comprasPorProduto[produto.id] || 0,
      };
    });
  }, [produtos, lojas, comprasPorProduto]);

  const produtosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt");

    let resultado = produtosEnriquecidos.filter((produto) => {
      const correspondePesquisa =
        !termo ||
        [
          produto.nome,
          produto.categoria,
          produto.descricao,
          produto.lojaNomeExibicao,
          produto.marca,
        ].some((valor) =>
          texto(valor).toLocaleLowerCase("pt").includes(termo)
        );

      const correspondeCategoria =
        categoriaSelecionada === "Todas" ||
        produto.categoria === categoriaSelecionada;

      const correspondeLoja =
        lojaSelecionada === "Todas" ||
        produto.lojaId === lojaSelecionada;

      return (
        correspondePesquisa &&
        correspondeCategoria &&
        correspondeLoja
      );
    });

    resultado = [...resultado];

    switch (ordenacao) {
      case "comprados":
        resultado.sort(
          (a, b) => b.totalComprado - a.totalComprado
        );
        break;

      case "avaliados":
        resultado.sort((a, b) => {
          if (
            a.avaliacaoCalculada !== b.avaliacaoCalculada
          ) {
            return b.avaliacaoCalculada - a.avaliacaoCalculada;
          }

          return (
            b.numeroAvaliacoesCalculado -
            a.numeroAvaliacoesCalculado
          );
        });
        break;

      case "precoCrescente":
        resultado.sort(
          (a, b) => numeroSeguro(a.preco) - numeroSeguro(b.preco)
        );
        break;

      case "precoDecrescente":
        resultado.sort(
          (a, b) => numeroSeguro(b.preco) - numeroSeguro(a.preco)
        );
        break;

      default:
        resultado.sort((a, b) => {
          const dataA = a.criadoEm?.toDate
            ? a.criadoEm.toDate().getTime()
            : new Date(a.criadoEm || 0).getTime();

          const dataB = b.criadoEm?.toDate
            ? b.criadoEm.toDate().getTime()
            : new Date(b.criadoEm || 0).getTime();

          return (
            (Number.isFinite(dataB) ? dataB : 0) -
            (Number.isFinite(dataA) ? dataA : 0)
          );
        });
    }

    return resultado;
  }, [
    produtosEnriquecidos,
    pesquisa,
    categoriaSelecionada,
    lojaSelecionada,
    ordenacao,
  ]);

  const maisComprados = useMemo(() => {
    return [...produtosEnriquecidos]
      .filter((produto) => produto.totalComprado > 0)
      .sort((a, b) => b.totalComprado - a.totalComprado)
      .slice(0, 8);
  }, [produtosEnriquecidos]);

  const maisClassificados = useMemo(() => {
    return [...produtosEnriquecidos]
      .filter(
        (produto) => produto.numeroAvaliacoesCalculado > 0
      )
      .sort((a, b) => {
        if (b.avaliacaoCalculada !== a.avaliacaoCalculada) {
          return b.avaliacaoCalculada - a.avaliacaoCalculada;
        }

        return (
          b.numeroAvaliacoesCalculado -
          a.numeroAvaliacoesCalculado
        );
      })
      .slice(0, 8);
  }, [produtosEnriquecidos]);

  const lojasDestaque = useMemo(() => {
    return [...lojas]
      .map((loja) => ({
        ...loja,
        quantidadeProdutos: produtos.filter(
          (produto) =>
            produto.comercianteId === loja.id ||
            produto.lojaNome === loja.nome
        ).length,
      }))
      .sort(
        (a, b) => b.quantidadeProdutos - a.quantidadeProdutos
      )
      .slice(0, 8);
  }, [lojas, produtos]);

  const alternarFavorito = (produtoId) => {
    setFavoritos((atuais) =>
      atuais.includes(produtoId)
        ? atuais.filter((id) => id !== produtoId)
        : [...atuais, produtoId]
    );
  };

  const adicionarAoCarrinho = (produto) => {
    setCarrinho((atuais) => {
      const existente = atuais.find(
        (item) => item.id === produto.id
      );

      if (existente) {
        if (
          existente.quantidade >= numeroSeguro(produto.quantidade)
        ) {
          return atuais;
        }

        return atuais.map((item) =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }

      return [
        ...atuais,
        { ...produto, quantidade: 1 },
      ];
    });
  };

  const limparFiltros = () => {
    setPesquisa("");
    setCategoriaSelecionada("Todas");
    setLojaSelecionada("Todas");
    setOrdenacao("recentes");
  };

  const ProdutoCard = ({ produto }) => (
    <article className="cp-product-card">
      <div className="cp-product-image-wrap">
        <button
          type="button"
          className="cp-product-image-button"
          onClick={() => setProdutoDetalhe(produto)}
          aria-label={`Ver ${produto.nome}`}
        >
          {produto.imagemUrl ? (
            <img
              src={produto.imagemUrl}
              alt={produto.nome}
              className="cp-product-image"
              loading="lazy"
            />
          ) : (
            <div className="cp-product-placeholder">
              <Package size={38} />
              <span>Sem imagem</span>
            </div>
          )}
        </button>

        <button
          type="button"
          className={`cp-favorite-button ${
            favoritos.includes(produto.id) ? "is-favorite" : ""
          }`}
          onClick={() => alternarFavorito(produto.id)}
          aria-label={
            favoritos.includes(produto.id)
              ? "Remover dos favoritos"
              : "Adicionar aos favoritos"
          }
        >
          <Heart
            size={18}
            fill={
              favoritos.includes(produto.id)
                ? "currentColor"
                : "none"
            }
          />
        </button>

        {produto.totalComprado > 0 && (
          <span className="cp-product-badge">Popular</span>
        )}
      </div>

      <div className="cp-product-info">
        <span className="cp-product-category">
          {produto.categoria || "Produto"}
        </span>

        <button
          type="button"
          className="cp-product-name"
          onClick={() => setProdutoDetalhe(produto)}
        >
          {produto.nome || "Produto sem nome"}
        </button>

        <button
          type="button"
          className="cp-product-store"
          onClick={() =>
            produto.lojaId &&
            setLojaSelecionada(produto.lojaId)
          }
          title="Filtrar produtos desta loja"
        >
          <Store size={13} />
          <span>{produto.lojaNomeExibicao}</span>
        </button>

        <div className="cp-product-rating">
          <Star
            size={14}
            fill={
              produto.numeroAvaliacoesCalculado > 0
                ? "#e9a23b"
                : "none"
            }
            color="#e9a23b"
          />
          <span>
            {produto.numeroAvaliacoesCalculado > 0
              ? produto.avaliacaoCalculada.toFixed(1)
              : "Sem avaliações"}
          </span>

          {produto.numeroAvaliacoesCalculado > 0 && (
            <span className="cp-rating-count">
              ({produto.numeroAvaliacoesCalculado})
            </span>
          )}
        </div>

        <div className="cp-product-bottom">
          <div>
            <strong className="cp-product-price">
              {formatarPreco(produto.preco)}
            </strong>
            <span className="cp-product-stock">
              {numeroSeguro(produto.quantidade)} disponíveis
            </span>
          </div>

          <button
            type="button"
            className="cp-add-cart"
            onClick={() => adicionarAoCarrinho(produto)}
            aria-label={`Adicionar ${produto.nome} ao carrinho`}
            title="Adicionar ao carrinho"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  );

  const SecaoProdutos = ({
    titulo,
    descricao,
    lista,
    tipo,
  }) => {
    if (!lista.length) return null;

    return (
      <section className="cp-section">
        <div className="cp-section-heading">
          <div className="cp-section-title-group">
            <span className="cp-section-kicker">
              {tipo === "comprados"
                ? "OS FAVORITOS DOS CLIENTES"
                : "ESCOLHAS DA COMUNIDADE"}
            </span>
            <h2>{titulo}</h2>
            <p>{descricao}</p>
          </div>

          <button
            type="button"
            className="cp-text-link"
            onClick={() => {
              setOrdenacao(tipo);
              setCategoriaSelecionada("Todas");
              setLojaSelecionada("Todas");
              document
                .getElementById("cp-catalogo")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Ver todos <ChevronRight size={17} />
          </button>
        </div>

        <div className="cp-product-grid cp-featured-grid">
          {lista.slice(0, 4).map((produto) => (
            <ProdutoCard key={produto.id} produto={produto} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="cp-page">
      <div className="cp-container">
        <div className="cp-breadcrumb">
          <Link to="/cliente">Área do cliente</Link>
          <ChevronRight size={14} />
          <span>Produtos</span>
        </div>

        <section className="cp-hero">
          <div className="cp-hero-content">
            <span className="cp-hero-eyebrow">
              <ShoppingBag size={15} />
              MERCADO FRESKO
            </span>

            <h1>
              Encontre tudo o que precisa,
              <span> num só lugar.</span>
            </h1>

            <p>
              Explore produtos, descubra lojas da sua região
              e encontre os seus próximos favoritos.
            </p>

            <a href="#cp-catalogo" className="cp-hero-button">
              Explorar produtos
              <ChevronRight size={18} />
            </a>

            <div className="cp-hero-trust">
              <span>
                <CheckCircle2 size={15} /> Lojas locais
              </span>
              <span>
                <CheckCircle2 size={15} /> Produtos disponíveis
              </span>
            </div>
          </div>

          <div className="cp-hero-visual" aria-hidden="true">
            <div className="cp-hero-circle cp-hero-circle-one" />
            <div className="cp-hero-circle cp-hero-circle-two" />

            <div className="cp-hero-floating-card">
              <span className="cp-floating-icon">
                <ShoppingCart size={21} />
              </span>
              <div>
                <strong>Compre local</strong>
                <span>Descubra as lojas perto de si</span>
              </div>
            </div>

            <div className="cp-hero-big-icon">
              <ShoppingBag size={76} strokeWidth={1.25} />
            </div>
          </div>
        </section>

        <section className="cp-search-panel">
          <div className="cp-search-main">
            <Search size={21} />
            <input
              type="search"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="O que procura hoje? Produtos, marcas ou lojas..."
              aria-label="Pesquisar produtos"
            />

            {pesquisa && (
              <button
                type="button"
                className="cp-clear-search"
                onClick={() => setPesquisa("")}
                aria-label="Limpar pesquisa"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="cp-search-divider" />

          <label className="cp-store-filter">
            <Store size={18} />
            <select
              value={lojaSelecionada}
              onChange={(event) =>
                setLojaSelecionada(event.target.value)
              }
              aria-label="Filtrar por loja"
            >
              <option value="Todas">Todas as lojas</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome || "Loja sem nome"}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="cp-category-section">
          <div className="cp-section-heading cp-category-heading">
            <div className="cp-section-title-group">
              <span className="cp-section-kicker">EXPLORE</span>
              <h2>Comprar por categoria</h2>
              <p>Encontre rapidamente o que procura.</p>
            </div>
          </div>

          <div className="cp-category-list">
            {categorias.map((categoria, index) => (
              <button
                key={categoria}
                type="button"
                className={`cp-category-chip ${
                  categoriaSelecionada === categoria
                    ? "active"
                    : ""
                }`}
                onClick={() => setCategoriaSelecionada(categoria)}
              >
                <span className="cp-category-icon">
                  {index === 0 ? (
                    <ShoppingBag size={19} />
                  ) : (
                    <Package size={19} />
                  )}
                </span>
                {categoria}
              </button>
            ))}
          </div>
        </section>

        {erro && (
          <div className="cp-error-message" role="alert">
            <AlertCircle size={21} />
            <div>
              <strong>Não foi possível carregar os produtos</strong>
              <p>{erro}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} /> Tentar novamente
            </button>
          </div>
        )}

        {carregando ? (
          <div className="cp-loading">
            <span className="cp-spinner" />
            <strong>A preparar o seu marketplace...</strong>
            <p>Estamos a carregar produtos e lojas.</p>
          </div>
        ) : (
          <>
            {!erro && (
              <>
                <SecaoProdutos
                  titulo="Mais comprados"
                  descricao="Produtos que os clientes estão a escolher."
                  lista={maisComprados}
                  tipo="comprados"
                />

                <SecaoProdutos
                  titulo="Mais classificados"
                  descricao="Produtos com melhores avaliações registadas."
                  lista={maisClassificados}
                  tipo="avaliados"
                />

                <section className="cp-section cp-stores-section">
                  <div className="cp-section-heading">
                    <div className="cp-section-title-group">
                      <span className="cp-section-kicker">
                        COMÉRCIO DA SUA REGIÃO
                      </span>
                      <h2>Lojas em destaque</h2>
                      <p>
                        Descubra os comerciantes presentes no
                        Mercado Fresko.
                      </p>
                    </div>
                  </div>

                  {lojasDestaque.length ? (
                    <div className="cp-store-grid">
                      {lojasDestaque.map((loja) => (
                        <button
                          type="button"
                          key={loja.id}
                          className="cp-store-card"
                          onClick={() => {
                            setLojaSelecionada(loja.id);
                            document
                              .getElementById("cp-catalogo")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          <div className="cp-store-logo">
                            {loja.logoUrl ? (
                              <img
                                src={loja.logoUrl}
                                alt={`Logótipo de ${loja.nome}`}
                                loading="lazy"
                              />
                            ) : (
                              <Store size={27} />
                            )}
                          </div>

                          <div className="cp-store-info">
                            <strong>{loja.nome || "Loja local"}</strong>
                            <span>
                              <MapPin size={13} />
                              {[loja.municipio, loja.provincia]
                                .filter(Boolean)
                                .join(", ") || "Angola"}
                            </span>
                            <small>
                              {loja.quantidadeProdutos}{" "}
                              {loja.quantidadeProdutos === 1
                                ? "produto"
                                : "produtos"}
                            </small>
                          </div>

                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="cp-inline-empty">
                      <Store size={28} />
                      <p>
                        Ainda não existem lojas configuradas para
                        apresentar.
                      </p>
                    </div>
                  )}
                </section>

                <section className="cp-section cp-catalog-section" id="cp-catalogo">
                  <div className="cp-section-heading cp-catalog-heading">
                    <div className="cp-section-title-group">
                      <span className="cp-section-kicker">
                        DESCUBRA O CATÁLOGO
                      </span>
                      <h2>
                        {pesquisa
                          ? `Resultados para "${pesquisa}"`
                          : categoriaSelecionada !== "Todas"
                            ? categoriaSelecionada
                            : lojaSelecionada !== "Todas"
                              ? "Produtos desta loja"
                              : "Todos os produtos"}
                      </h2>
                      <p>
                        {produtosFiltrados.length}{" "}
                        {produtosFiltrados.length === 1
                          ? "produto disponível"
                          : "produtos disponíveis"}
                      </p>
                    </div>

                    <label className="cp-sort-select">
                      <SlidersHorizontal size={17} />
                      <select
                        value={ordenacao}
                        onChange={(event) =>
                          setOrdenacao(event.target.value)
                        }
                        aria-label="Ordenar produtos"
                      >
                        <option value="recentes">Mais recentes</option>
                        <option value="comprados">Mais comprados</option>
                        <option value="avaliados">Mais classificados</option>
                        <option value="precoCrescente">
                          Menor preço
                        </option>
                        <option value="precoDecrescente">
                          Maior preço
                        </option>
                      </select>
                    </label>
                  </div>

                  {(pesquisa ||
                    categoriaSelecionada !== "Todas" ||
                    lojaSelecionada !== "Todas") && (
                    <button
                      type="button"
                      className="cp-reset-filters"
                      onClick={limparFiltros}
                    >
                      <X size={15} /> Limpar filtros
                    </button>
                  )}

                  {produtosFiltrados.length ? (
                    <div className="cp-product-grid">
                      {produtosFiltrados.map((produto) => (
                        <ProdutoCard
                          key={produto.id}
                          produto={produto}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="cp-empty-state">
                      <span className="cp-empty-icon">
                        <Package size={34} />
                      </span>
                      <h3>
                        {produtos.length
                          ? "Não encontrámos produtos"
                          : "Ainda não há produtos disponíveis"}
                      </h3>
                      <p>
                        {produtos.length
                          ? "Experimenta outra pesquisa ou remove alguns filtros."
                          : "Os produtos publicados com stock aparecerão aqui."}
                      </p>
                      {(pesquisa ||
                        categoriaSelecionada !== "Todas" ||
                        lojaSelecionada !== "Todas") && (
                        <button
                          type="button"
                          className="cp-primary-button"
                          onClick={limparFiltros}
                        >
                          Ver todos os produtos
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        <footer className="cp-market-footer">
          <div className="cp-footer-icon">
            <ShoppingBag size={23} />
          </div>
          <div>
            <strong>Mercado Fresko</strong>
            <p>Valorizar o comércio local, simplificar as suas compras.</p>
          </div>
          <div className="cp-footer-links">
            <Link to="/cliente/ajuda">Ajuda</Link>
            <Link to="/cliente/pedidos">Meus pedidos</Link>
          </div>
        </footer>
      </div>

      {carrinho.length > 0 && (
        <div className="cp-cart-summary">
          <div className="cp-cart-summary-icon">
            <ShoppingCart size={20} />
            <span>{carrinho.reduce((soma, item) => soma + item.quantidade, 0)}</span>
          </div>

          <div className="cp-cart-summary-text">
            <strong>
              {carrinho.reduce(
                (soma, item) => soma + item.quantidade,
                0
              )}{" "}
              artigos no carrinho
            </strong>
            <span>
              {formatarPreco(
                carrinho.reduce(
                  (soma, item) =>
                    soma + numeroSeguro(item.preco) * item.quantidade,
                  0
                )
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              window.alert(
                "O carrinho visual está pronto. A finalização da encomenda precisa de ser ligada ao fluxo de compras do Mercado Fresko."
              )
            }
          >
            Ver carrinho <ChevronRight size={17} />
          </button>
        </div>
      )}

      {produtoDetalhe && (
        <div
          className="cp-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProdutoDetalhe(null);
            }
          }}
        >
          <section
            className="cp-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cp-modal-title"
          >
            <button
              type="button"
              className="cp-modal-close"
              onClick={() => setProdutoDetalhe(null)}
              aria-label="Fechar detalhes"
            >
              <X size={21} />
            </button>

            <div className="cp-modal-image">
              {produtoDetalhe.imagemUrl ? (
                <img
                  src={produtoDetalhe.imagemUrl}
                  alt={produtoDetalhe.nome}
                />
              ) : (
                <Package size={52} />
              )}
            </div>

            <div className="cp-modal-content">
              <span className="cp-product-category">
                {produtoDetalhe.categoria || "Produto"}
              </span>

              <h2 id="cp-modal-title">
                {produtoDetalhe.nome || "Detalhes do produto"}
              </h2>

              <div className="cp-modal-store">
                <Store size={16} />
                {produtoDetalhe.lojaNomeExibicao}
              </div>

              <strong className="cp-modal-price">
                {formatarPreco(produtoDetalhe.preco)}
              </strong>

              <p className="cp-modal-description">
                {produtoDetalhe.descricao ||
                  "Consulte a disponibilidade deste produto junto da loja."}
              </p>

              <div className="cp-modal-meta">
                <span>
                  <Package size={16} />
                  {numeroSeguro(produtoDetalhe.quantidade)} em stock
                </span>

                <span>
                  <Star size={16} color="#e9a23b" />
                  {produtoDetalhe.numeroAvaliacoesCalculado > 0
                    ? `${produtoDetalhe.avaliacaoCalculada.toFixed(1)} / 5`
                    : "Sem avaliações"}
                </span>
              </div>

              <button
                type="button"
                className="cp-primary-button cp-modal-add"
                onClick={() => {
                  adicionarAoCarrinho(produtoDetalhe);
                  setProdutoDetalhe(null);
                }}
              >
                <ShoppingCart size={18} />
                Adicionar ao carrinho
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ClienteProdutos;
