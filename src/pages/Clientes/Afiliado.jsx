import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clipboard,
  Clock3,
  LoaderCircle,
  Package,
  Share2,
  ShieldCheck,
  Store,
} from "lucide-react";
import { auth, db, functions } from "../../firebase/config";

function formatarValor(valor) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function erroFirebase(error, conteudo) {
  console.error(`Não foi possível carregar ${conteudo}:`, error);
  return error.code === "permission-denied"
    ? `O Firebase recusou o acesso a ${conteudo}. Publique as regras Firestore atualizadas para esta área.`
    : `Não foi possível carregar ${conteudo}. Verifique a ligação e tente novamente.`;
}

export default function ClienteAfiliado() {
  const [uid, setUid] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aAtivar, setAAtivar] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    let ativo = true;
    let cancelarPerfil = () => {};
    let cancelarProdutos = () => {};
    let cancelarComissoes = () => {};

    const cancelarAuth = onAuthStateChanged(auth, (user) => {
      cancelarPerfil();
      cancelarProdutos();
      cancelarComissoes();
      setPerfil(null);
      setProdutos([]);
      setComissoes([]);
      setErro("");

      if (!user) {
        setCarregando(false);
        return;
      }

      setUid(user.uid);
      setCarregando(true);
      cancelarPerfil = onSnapshot(
        doc(db, "usuarios", user.uid),
        (snapshot) => {
          if (!ativo) return;
          setPerfil(snapshot.exists() ? snapshot.data() : null);
          setCarregando(false);
        },
        (error) => {
          if (!ativo) return;
          setErro(erroFirebase(error, "o perfil de afiliado"));
          setCarregando(false);
        }
      );

      cancelarProdutos = onSnapshot(
        query(collection(db, "produtos"), where("publicado", "==", true)),
        (snapshot) => {
          if (!ativo) return;
          setProdutos(
            snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .filter(
                (produto) =>
                  Number(produto.quantidade) > 0 &&
                  Number(produto.valorAfiliado) > 0
              )
          );
        },
        (error) => {
          if (!ativo) return;
          setErro(erroFirebase(error, "os produtos com comissão"));
        }
      );

      cancelarComissoes = onSnapshot(
        collection(db, "usuarios", user.uid, "comissoes"),
        (snapshot) => {
          if (!ativo) return;
          const lista = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          lista.sort(
            (a, b) =>
              (b.criadoEm?.toMillis?.() || 0) -
              (a.criadoEm?.toMillis?.() || 0)
          );
          setComissoes(lista);
        },
        (error) => {
          if (!ativo) return;
          setErro(erroFirebase(error, "o histórico de comissões"));
        }
      );
    });

    return () => {
      ativo = false;
      cancelarAuth();
      cancelarPerfil();
      cancelarProdutos();
      cancelarComissoes();
    };
  }, []);

  const totais = useMemo(
    () =>
      comissoes.reduce(
        (resultado, item) => {
          if (item.estado === "cancelada") {
            resultado.canceladas += Number(item.valor) || 0;
            return resultado;
          }
          resultado.pendentes += Number(item.valor) || 0;
          return resultado;
        },
        { pendentes: 0, canceladas: 0 }
      ),
    [comissoes]
  );

  async function aderir() {
    setAAtivar(true);
    setErro("");
    setMensagem("");
    try {
      await httpsCallable(functions, "ativarAfiliado")({ aceite: true });
      setMensagem("A sua conta de afiliado foi ativada. Já pode partilhar os seus links.");
    } catch (error) {
      console.error("Não foi possível ativar a conta de afiliado:", error);
      setErro(
        error.message ||
          "Não foi possível ativar o programa de afiliados. Verifique o App Check e tente novamente."
      );
    } finally {
      setAAtivar(false);
    }
  }

  function criarLink(produto) {
    const url = new URL("/produtos", window.location.origin);
    url.searchParams.set("ref", uid);
    if (produto) {
      url.searchParams.set("loja", produto.comercianteId);
      url.searchParams.set("pesquisa", produto.nome || "");
    }
    return url.toString();
  }

  async function copiarLink(chave, produto) {
    setErro("");
    try {
      await navigator.clipboard.writeText(criarLink(produto));
      setCopiado(chave);
      window.setTimeout(() => setCopiado(""), 2500);
    } catch (error) {
      console.error("Não foi possível copiar o link:", error);
      setErro("O navegador não permitiu copiar o link. Copie-o pela caixa de texto.");
    }
  }

  return (
    <main className="mf-client-content mf-affiliate-page">
      <div className="mf-client-page-heading">
        <div>
          <span className="mf-client-eyebrow">PARTILHE O MERCADO LOCAL</span>
          <h1>Programa de afiliados</h1>
          <p>Recomende produtos, partilhe o seu link e acompanhe as comissões atribuídas.</p>
        </div>
        <span className="mf-client-page-heading-icon"><Share2 size={27} /></span>
      </div>

      {erro && <div className="mf-client-alert" role="alert"><AlertCircle size={17} />{erro}</div>}
      {mensagem && <div className="mf-client-notice" role="status"><CheckCircle2 size={17} />{mensagem}</div>}

      {carregando ? (
        <div className="mf-client-empty" role="status"><span className="mf-client-spinner" /><p>A carregar a área de afiliado...</p></div>
      ) : perfil?.tipo !== "cliente" ? (
        <div className="mf-client-alert" role="alert">Não foi possível validar uma conta de cliente para este programa.</div>
      ) : perfil.afiliadoAtivo !== true ? (
        <section className="mf-affiliate-join">
          <span className="mf-affiliate-join-icon"><Share2 size={27} /></span>
          <div>
            <h2>Torne-se afiliado do Mercado Fresko</h2>
            <p>
              Partilhe produtos com o seu link. Quando um pedido elegível for
              feito através dele, a comissão definida pelo comerciante ficará
              registada na sua área.
            </p>
          </div>
          <ul>
            <li><CheckCircle2 size={16} /> Link pessoal associado à sua conta</li>
            <li><CheckCircle2 size={16} /> Comissão definida no produto pelo comerciante</li>
            <li><Clock3 size={16} /> Comissão pendente até confirmação do pagamento</li>
          </ul>
          <label className="mf-affiliate-terms">
            <input type="checkbox" id="aceiteAfiliado" />
            <span>Li e aceito que as comissões dependem de pedidos elegíveis e só serão confirmadas após a futura integração/validação do pagamento.</span>
          </label>
          <button
            type="button"
            className="mf-client-primary-button"
            disabled={aAtivar}
            onClick={() => {
              if (!document.getElementById("aceiteAfiliado")?.checked) {
                setErro("Leia e aceite as condições antes de ativar.");
                return;
              }
              aderir();
            }}
          >
            {aAtivar ? <LoaderCircle size={17} className="mf-client-spin" /> : <Share2 size={17} />}
            {aAtivar ? "A ativar..." : "Tornar-me afiliado"}
          </button>
        </section>
      ) : (
        <>
          <section className="mf-affiliate-welcome">
            <div>
              <span className="mf-affiliate-active"><CheckCircle2 size={15} /> Conta de afiliado ativa</span>
              <h2>O seu link pessoal</h2>
              <p>Partilhe este link para recomendar produtos do Mercado Fresko.</p>
            </div>
            <div className="mf-affiliate-copy-row">
              <input readOnly value={criarLink()} aria-label="Link pessoal de afiliado" />
              <button type="button" onClick={() => copiarLink("geral")}>
                <Clipboard size={16} />{copiado === "geral" ? "Copiado" : "Copiar"}
              </button>
            </div>
          </section>

          <section className="mf-affiliate-summary">
            <article>
              <span className="mf-affiliate-stat-icon"><CircleDollarSign size={20} /></span>
              <div><span>Comissões pendentes</span><strong>{formatarValor(totais.pendentes)}</strong></div>
            </article>
            <article>
              <span className="mf-affiliate-stat-icon is-neutral"><Clock3 size={20} /></span>
              <div><span>Pedidos atribuídos</span><strong>{comissoes.filter((item) => item.estado !== "cancelada").length}</strong></div>
            </article>
            <article>
              <span className="mf-affiliate-stat-icon is-neutral"><ShieldCheck size={20} /></span>
              <div><span>Disponível para levantamento</span><strong>{formatarValor(0)}</strong></div>
            </article>
          </section>

          <div className="mf-affiliate-payout-note" role="status">
            <AlertCircle size={18} />
            <p>
              <strong>Levantamentos ainda desativados.</strong> O Appy Pay ainda
              não está integrado. As comissões ficam pendentes e não são dinheiro
              disponível para levantamento. Não pedimos nem guardamos dados
              bancários nesta fase.
            </p>
          </div>

          <section className="mf-affiliate-products-section">
            <div className="mf-client-market-section-heading">
              <div>
                <span className="mf-client-eyebrow">COMISSÃO DEFINIDA NO PRODUTO</span>
                <h2>Produtos para recomendar</h2>
                <p>O valor apresentado é por unidade; o servidor calcula a comissão no pedido.</p>
              </div>
            </div>

            {produtos.length === 0 ? (
              <div className="mf-client-empty">
                <Package size={26} />
                <h2>Ainda não há produtos com comissão ativa</h2>
                <p>Os produtos elegíveis aparecerão aqui quando os comerciantes publicarem o valor de afiliado.</p>
              </div>
            ) : (
              <div className="mf-affiliate-products">
                {produtos.map((produto) => (
                  <article className="mf-affiliate-product" key={produto.id}>
                    <div>
                      <span><Store size={14} />{produto.lojaNome || "Loja local"}</span>
                      <h3>{produto.nome}</h3>
                      <small>{formatarValor(produto.valorAfiliado)} de comissão por unidade</small>
                    </div>
                    <div className="mf-affiliate-product-actions">
                      <input readOnly value={criarLink(produto)} aria-label={`Link de afiliado para ${produto.nome}`} />
                      <button type="button" onClick={() => copiarLink(produto.id, produto)}>
                        <Clipboard size={15} />{copiado === produto.id ? "Copiado" : "Copiar link"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mf-affiliate-history">
            <div className="mf-client-market-section-heading">
              <div>
                <span className="mf-client-eyebrow">ACOMPANHAMENTO</span>
                <h2>Comissões e pedidos atribuídos</h2>
                <p>As comissões só serão confirmadas depois de o pagamento estar validado.</p>
              </div>
            </div>

            {comissoes.length === 0 ? (
              <div className="mf-client-empty">
                <Share2 size={25} />
                <h2>Ainda não há pedidos atribuídos</h2>
                <p>Partilhe um dos seus links. Os pedidos elegíveis aparecerão aqui.</p>
              </div>
            ) : (
              <div className="mf-affiliate-commission-list">
                {comissoes.map((comissao) => (
                  <article className="mf-affiliate-commission" key={comissao.id}>
                    <span className={`mf-affiliate-commission-icon${comissao.estado === "cancelada" ? " is-cancelled" : ""}`}>
                      {comissao.estado === "cancelada" ? <AlertCircle size={18} /> : <Clock3 size={18} />}
                    </span>
                    <div>
                      <strong>Pedido #{comissao.numeroEncomenda || comissao.encomendaId?.slice(0, 8).toUpperCase()}</strong>
                      <span>{comissao.nomeLoja || "Loja"} · {(comissao.itens || []).map((item) => `${item.quantidade} × ${item.nome}`).join(", ")}</span>
                    </div>
                    <span className={`mf-affiliate-commission-status${comissao.estado === "cancelada" ? " is-cancelled" : ""}`}>
                      {comissao.estado === "cancelada" ? "Cancelada" : "Pendente"}
                    </span>
                    <strong className="mf-affiliate-commission-value">{formatarValor(comissao.valor)}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
