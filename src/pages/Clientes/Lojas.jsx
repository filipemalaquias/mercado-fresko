import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, MapPin, Search, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../../firebase/config";

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
        setErro(
          error.code === "permission-denied"
            ? "As regras do Firestore ainda não permitem consultar lojas publicadas. Publique as regras atualizadas do projeto Firebase."
            : "Não foi possível carregar as lojas. Verifique a ligação e tente novamente."
        );
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
        console.error("Não foi possível verificar os produtos disponíveis por loja:", error);
        setErro(
          error.code === "permission-denied"
            ? "O Firebase recusou a consulta do catálogo. Publique as regras Firestore atualizadas e tente novamente."
            : "Não foi possível confirmar quais lojas têm produtos disponíveis. Tente novamente."
        );
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
    const termo = pesquisa.trim().toLocaleLowerCase("pt-AO");
    if (!termo) return lojas;
    return lojas.filter((loja) =>
      `${loja.nome || ""} ${loja.provincia || ""} ${loja.municipio || ""} ${loja.descricao || ""}`
        .toLocaleLowerCase("pt-AO")
        .includes(termo)
    );
  }, [lojas, pesquisa]);

  return (
    <main className="mf-client-content">
      <div className="mf-client-page-heading">
        <div>
          <span className="mf-client-eyebrow">COMÉRCIO LOCAL</span>
          <h1>Lojas e comerciantes</h1>
          <p>Encontre mini mercados e comerciantes com loja configurada no Fresko.</p>
        </div>
        <span className="mf-client-page-heading-icon"><Store size={27} /></span>
      </div>

      <label className="mf-client-store-search">
        <Search size={18} />
        <input
          type="search"
          value={pesquisa}
          onChange={(event) => setPesquisa(event.target.value)}
          placeholder="Pesquisar por loja, município ou província"
          aria-label="Pesquisar lojas"
        />
      </label>

      {erro && <div className="mf-client-alert" role="alert">{erro}</div>}
      {carregando || carregandoProdutos ? (
        <div className="mf-client-empty" role="status"><span className="mf-client-spinner" /><p>A carregar lojas...</p></div>
      ) : erro ? null : lojasFiltradas.length === 0 ? (
        <div className="mf-client-empty">
          <span className="mf-client-empty-icon"><Store size={26} /></span>
          <h2>{pesquisa ? "Nenhuma loja corresponde à pesquisa." : "Ainda não há lojas com produtos disponíveis."}</h2>
          <p>{pesquisa ? "Experimente outro nome ou localização." : "As lojas com produtos publicados e em stock aparecerão aqui."}</p>
          <Link to="/produtos">Ver produtos disponíveis <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="mf-client-store-directory">
          {lojasFiltradas.map((loja) => (
            <article className="mf-client-store-directory-card" key={loja.id}>
              <span className="mf-client-store-directory-logo">
                {loja.logoUrl ? <img src={loja.logoUrl} alt="" loading="lazy" /> : <Store size={27} />}
              </span>
              <div className="mf-client-store-directory-info">
                <span className="mf-client-store-type">Loja local</span>
                <h2>{loja.nome || "Comerciante local"}</h2>
                <p><MapPin size={15} />{[loja.municipio, loja.provincia].filter(Boolean).join(", ") || "Angola"}</p>
                <span className="mf-client-store-description">
                  {loja.descricao || "Descubra os produtos disponíveis nesta loja."}
                </span>
                {loja.endereco && <small>{loja.endereco}</small>}
              </div>
              <Link to={`/produtos?loja=${encodeURIComponent(loja.id)}`}>
                Ver produtos da loja <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
