import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, MapPin, Search, Store, X } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../../firebase/config";
import "./ClienteLojas.css";

export default function ClienteLojas() {
  const [lojas, setLojas] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let lojasAtuais = [];
    let comerciantesAtuais = new Set();

    function atualizarLojas() {
      setLojas(
        lojasAtuais.filter((loja) => comerciantesAtuais.has(loja.id))
      );
    }

    const cancelarLojas = onSnapshot(
      query(collection(db, "lojas"), where("configurada", "==", true)),
      (snapshot) => {
        lojasAtuais = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        atualizarLojas();
        setErro("");
        setCarregando(false);
      },
      (error) => {
        console.error("Não foi possível carregar as lojas:", error);
        setErro("Não foi possível carregar as lojas.");
        setCarregando(false);
      }
    );

    const cancelarProdutos = onSnapshot(
      query(collection(db, "produtos"), where("publicado", "==", true)),
      (snapshot) => {
        comerciantesAtuais = new Set(
          snapshot.docs
            .filter((item) => Number(item.data().quantidade) > 0)
            .map((item) => item.data().comercianteId)
            .filter(Boolean)
        );
        setCarregandoProdutos(false);
        atualizarLojas();
      },
      (error) => {
        console.error("Não foi possível verificar os produtos:", error);
        setCarregando(false);
        setCarregandoProdutos(false);
      }
    );

    return () => {
      cancelarLojas();
      cancelarProdutos();
    };
  }, []);

  const lojasFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    if (!termo) return lojas;
    return lojas.filter((loja) =>
      `${loja.nome || ""} ${loja.provincia || ""} ${loja.municipio || ""} ${loja.descricao || ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [lojas, pesquisa]);

  return (
    <div className="cliente-container lojas-page">
      {/* Cabeçalho da Página */}
      <section className="lojas-header">
        <div className="lojas-header-content">
          <span className="lojas-eyebrow">
            <Store size={16} /> Comércio Local
          </span>
          <h1>Lojas e Comerciantes</h1>
          <p>Encontre mini mercados e comerciantes com loja configurada no Fresko.</p>
        </div>
      </section>

      {/* Barra de Pesquisa */}
      <section className="lojas-search-section">
        <form className="lojas-search" onSubmit={(e) => e.preventDefault()}>
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar por nome da loja, município ou província..."
            aria-label="Pesquisar lojas"
          />
          {pesquisa && (
            <button
              type="button"
              className="lojas-search-clear"
              onClick={() => setPesquisa("")}
              aria-label="Limpar pesquisa"
            >
              <X size={18} />
            </button>
          )}
        </form>
      </section>

      {erro && <div className="lojas-alerta" role="alert">{erro}</div>}

      {/* Lista de Lojas */}
      <section className="lojas-lista-section">
        {carregando || carregandoProdutos ? (
          <div className="lojas-empty">
            <span className="lojas-spinner" />
            <p>A carregar lojas...</p>
          </div>
        ) : lojasFiltradas.length === 0 ? (
          <div className="lojas-empty">
            <div className="lojas-empty-icon">
              <Store size={32} />
            </div>
            <h2>{pesquisa ? "Nenhuma loja encontrada" : "Ainda não há lojas disponíveis"}</h2>
            <p>
              {pesquisa
                ? "Experimente pesquisar por outro nome ou localização."
                : "As lojas com produtos publicados e em stock aparecerão aqui."}
            </p>
            <Link to="/cliente/produtos" className="lojas-btn-primary">
              Ver produtos disponíveis <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="lojas-grid">
            {lojasFiltradas.map((loja) => (
              <article className="loja-card" key={loja.id}>
                <div className="loja-card-header">
                  <div className="loja-card-logo">
                    {loja.logoUrl ? (
                      <img src={loja.logoUrl} alt={loja.nome} loading="lazy" />
                    ) : (
                      <Store size={28} />
                    )}
                  </div>
                  <span className="loja-card-tag">Loja Oficial</span>
                </div>

                <div className="loja-card-body">
                  <h2>{loja.nome || "Comerciante local"}</h2>
                  
                  <div className="loja-card-location">
                    <MapPin size={14} />
                    <span>{[loja.municipio, loja.provincia].filter(Boolean).join(", ") || "Angola"}</span>
                  </div>

                  <p className="loja-card-desc">
                    {loja.descricao || "Descubra os produtos disponíveis nesta loja."}
                  </p>
                </div>

                <div className="loja-card-footer">
                  <Link to={`/cliente/produtos?loja=${encodeURIComponent(loja.id)}`} className="loja-card-btn">
                    Ver produtos <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}