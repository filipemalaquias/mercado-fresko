import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { ArrowRight, Heart, ShoppingBasket, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase/config";

function formatarPreco(valor) {
  return `${Number(valor || 0).toLocaleString("pt-AO", {
    maximumFractionDigits: 2,
  })} Kz`;
}

export default function ClienteFavoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aRemover, setARemover] = useState("");

  useEffect(() => {
    let ativo = true;
    let cancelarFavoritos = () => {};

    const cancelarAuth = onAuthStateChanged(auth, (user) => {
      cancelarFavoritos();
      setFavoritos([]);
      if (!user) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      cancelarFavoritos = onSnapshot(
        collection(db, "usuarios", user.uid, "favoritos"),
        async (snapshot) => {
          setErro("");
          try {
            const produtos = await Promise.all(
              snapshot.docs.map(async (favorito) => {
                try {
                  const produtoSnap = await getDoc(
                    doc(db, "produtos", favorito.id)
                  );
                  return produtoSnap.exists()
                    ? { id: produtoSnap.id, ...produtoSnap.data() }
                    : { id: favorito.id, indisponivel: true };
                } catch (error) {
                  console.warn("Um produto favorito deixou de estar disponível:", error);
                  return { id: favorito.id, indisponivel: true };
                }
              })
            );
            if (ativo) {
              setFavoritos(produtos);
              setCarregando(false);
            }
          } catch (error) {
            console.error("Não foi possível carregar os favoritos:", error);
            if (ativo) {
              setErro("Não foi possível carregar os favoritos. Tente novamente.");
              setCarregando(false);
            }
          }
        },
        (error) => {
          console.error("Não foi possível observar os favoritos:", error);
          if (ativo) {
            setErro(
              error.code === "permission-denied"
                ? "O Firebase recusou o acesso aos favoritos. Publique as regras Firestore atualizadas para esta funcionalidade."
                : "Não foi possível carregar os favoritos. Verifique a ligação e tente novamente."
            );
            setCarregando(false);
          }
        }
      );
    });

    return () => {
      ativo = false;
      cancelarAuth();
      cancelarFavoritos();
    };
  }, []);

  async function removerFavorito(produtoId) {
    const uid = auth.currentUser?.uid;
    if (!uid || aRemover) return;
    setARemover(produtoId);
    setErro("");
    try {
      await deleteDoc(doc(db, "usuarios", uid, "favoritos", produtoId));
    } catch (error) {
      console.error("Não foi possível remover o favorito:", error);
      setErro("Não foi possível remover este favorito. Tente novamente.");
    } finally {
      setARemover("");
    }
  }

  return (
    <main className="mf-client-content">
      <div className="mf-client-page-heading">
        <div>
          <span className="mf-client-eyebrow">GUARDADOS PARA SI</span>
          <h1>Os meus favoritos</h1>
          <p>Produtos guardados para encontrar facilmente mais tarde.</p>
        </div>
        <span className="mf-client-page-heading-icon">
          <Heart size={27} />
        </span>
      </div>

      {erro && <div className="mf-client-alert" role="alert">{erro}</div>}

      {carregando ? (
        <div className="mf-client-empty" role="status">
          <span className="mf-client-spinner" />
          <p>A carregar os seus favoritos...</p>
        </div>
      ) : favoritos.length === 0 ? (
        <div className="mf-client-empty">
          <span className="mf-client-empty-icon"><Heart size={26} /></span>
          <h2>Ainda não guardou produtos</h2>
          <p>Use o botão de favorito no catálogo para guardar produtos nesta conta.</p>
          <Link to="/produtos">Explorar produtos <ArrowRight size={17} /></Link>
        </div>
      ) : (
        <div className="mf-client-favorites-grid">
          {favoritos.map((produto) => (
            <article className="mf-client-favorite-card" key={produto.id}>
              {produto.imagemUrl ? (
                <img src={produto.imagemUrl} alt="" loading="lazy" />
              ) : (
                <span className="mf-client-favorite-placeholder">
                  <ShoppingBasket size={28} />
                </span>
              )}
              <div className="mf-client-favorite-info">
                {produto.indisponivel ? (
                  <>
                    <span className="mf-client-unavailable">Indisponível</span>
                    <h2>Produto removido ou já não publicado</h2>
                    <p>Remova-o dos favoritos ou explore o catálogo atual.</p>
                  </>
                ) : (
                  <>
                    <span>{produto.categoria || "Produto local"}</span>
                    <h2>{produto.nome}</h2>
                    <p>{produto.lojaNome || "Comerciante local"}</p>
                    <strong>{formatarPreco(produto.preco)}</strong>
                  </>
                )}
              </div>
              <div className="mf-client-favorite-actions">
                <button
                  type="button"
                  className="mf-client-remove-favorite"
                  onClick={() => removerFavorito(produto.id)}
                  disabled={aRemover === produto.id}
                >
                  <Trash2 size={16} />
                  {aRemover === produto.id ? "A remover..." : "Remover"}
                </button>
                {!produto.indisponivel && (
                  <Link to="/produtos">
                    Ver produto <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
