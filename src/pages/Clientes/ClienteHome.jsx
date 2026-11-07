import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MapPin,
  PackageSearch,
  Search,
  ShoppingBasket,
  X,
  Apple,
  Fish,
  Milk,
  Wheat,
  Carrot,
  Beef,
  Coffee,
  ShieldCheck,
  Truck,
  Clock,
  CreditCard,
  Sparkles,
  Droplet, // Para Cosméticos
  Box,     // Para Diversos
  Wine     // Para Bebidas
} from "lucide-react";

import MenuCliente from "../../components/MenuCliente";
import Footer from "../../components/Footer";
import { auth, db } from "../../firebase/config";
import { useCarrinho } from "../../context/CarrinhoContext";
import imagemProduto from "../../assets/hero.png";
import "./cliente.css";

const obterNomeProduto = (p) => p?.nome ?? p?.nomeProduto ?? "Produto sem nome";
const obterPrecoProduto = (p) => Number(p?.preco ?? p?.precoVenda ?? 0);
const obterImagemProduto = (p) => p?.imagemURL || p?.imagemUrl || p?.imagem || p?.foto || imagemProduto;
const obterNomeLoja = (l) => l?.nome ?? l?.nomeLoja ?? l?.nomeEmpresa ?? "Loja";
const obterImagemLoja = (l) => l?.logoURL || l?.logoUrl || l?.logo || l?.imagemURL || imagemProduto;
const formatarPreco = (valor) => valor.toLocaleString("pt-AO", { style: "currency", currency: "AOA" });

const categoriasRapidas = [
  { nome: "Frutas", icone: Apple },
  { nome: "Legumes", icone: Carrot },
  { nome: "Carnes", icone: Beef },
  { nome: "Pescados", icone: Fish },
  { nome: "Laticínios", icone: Milk },
  { nome: "Mercearia", icone: Wheat },
  { nome: "Cosméticos", icone: Droplet },
  { nome: "Bebidas", icone: Wine },
  { nome: "Café", icone: Coffee },
  { nome: "Diversos", icone: Box },
];

// Componente auxiliar para os Sliders de Produtos
function ProductSlider({ title, subtitle, produtos, onAdicionar }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === "left" ? -300 : 300;
      current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!produtos || produtos.length === 0) return null;

  return (
    <section className="mfc-section">
      <div className="mfc-container">
        <div className="mfc-section-header">
          <div>
            {subtitle && <span className="mfc-eyebrow">{subtitle}</span>}
            <h2>{title}</h2>
          </div>
          <div className="mfc-slider-nav">
            <button onClick={() => scroll("left")} aria-label="Anterior"><ChevronLeft size={20}/></button>
            <button onClick={() => scroll("right")} aria-label="Próximo"><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="mfc-slider-container" ref={scrollRef}>
          {produtos.map((produto) => (
            <article className="mfc-card" key={produto.id}>
              <Link to={`/cliente/produtos/${produto.id}`} className="mfc-card-image">
                <img src={obterImagemProduto(produto)} alt={obterNomeProduto(produto)} />
              </Link>
              <div className="mfc-card-body">
                <span className="mfc-card-store">{produto.lojaNome || "Mercado Local"}</span>
                <Link to={`/cliente/produtos/${produto.id}`} className="mfc-card-title">
                  {obterNomeProduto(produto)}
                </Link>
                <div className="mfc-card-footer">
                  <strong>{formatarPreco(obterPrecoProduto(produto))}</strong>
                  <button type="button" className="mfc-add-btn" onClick={() => onAdicionar(produto)}>
                    <ShoppingBasket size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ClienteHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adicionar } = useCarrinho();

  const [perfil, setPerfil] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [feedbackCarrinho, setFeedbackCarrinho] = useState("");

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true, state: { from: location.pathname } });
        return;
      }
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          const dados = snap.data();
          setPerfil(dados);
          const tipo = dados.perfil?.tipo || dados.tipo;
          if (tipo === "comerciante" || tipo === "empresa") {
            navigate("/comerciantes/dashboard", { replace: true });
          }
        }
      } catch (err) { console.error(err); }
    });
    return () => cancelar();
  }, [navigate, location.pathname]);

  useEffect(() => {
    const qProdutos = query(collection(db, "produtos"), where("publicado", "==", true));
    const unsubProdutos = onSnapshot(qProdutos, (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => Number(p.quantidade ?? p.stock ?? 0) > 0);
      setProdutos(lista);
    });

    const qLojas = query(collection(db, "lojas"), where("configurada", "==", true));
    const unsubLojas = onSnapshot(qLojas, (snap) => {
      setLojas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCarregando(false);
    });

    return () => { unsubProdutos(); unsubLojas(); };
  }, []);

  const termo = pesquisa.trim().toLowerCase();
  const produtosFiltrados = useMemo(() => {
    if (!termo) return produtos;
    return produtos.filter((p) => 
      [p.nome, p.categoria, p.descricao].filter(Boolean).join(" ").toLowerCase().includes(termo)
    );
  }, [produtos, termo]);

  const tratarAdicionar = useCallback((produto) => {
    try {
      adicionar(produto);
      setFeedbackCarrinho(`${obterNomeProduto(produto)} adicionado!`);
      setTimeout(() => setFeedbackCarrinho(""), 2500);
    } catch (error) {
      setFeedbackCarrinho(error.message);
      setTimeout(() => setFeedbackCarrinho(""), 3000);
    }
  }, [adicionar]);

  const submeterPesquisa = (e) => {
    e.preventDefault();
    if (!pesquisa.trim()) return;
    navigate(`/cliente/produtos?pesquisa=${encodeURIComponent(pesquisa)}`);
  };

  // Dividir produtos para os sliders (sem backend de categorias real, dividimos por ordem/filtro)
  const destaques = produtosFiltrados.slice(0, 8);
  const maisVendidos = produtosFiltrados.slice(8, 16);
  const zonaFresca = produtosFiltrados.filter(p => ["fruta", "verdura", "legume", "peixe", "carne"].some(c => p.categoria?.toLowerCase().includes(c))).slice(0, 8);
  // Se não houver produtos da zona fresca, mostra os seguintes
  const novidades = produtosFiltrados.slice(16, 24);

  return (
    <>
      <MenuCliente usuario={perfil} onLogout={() => auth.signOut()} />

      <main className="mfc-main">
        <div className="mfc-top-banner">
          <span>🚚 Frete grátis em compras acima de 10.000 Kz</span>
          <span>🛍️ As melhores ofertas do comércio local</span>
        </div>

        <section className="mfc-hero-search">
          <div className="mfc-container">
            <div className="mfc-hero-content">
              <h1>Olá{perfil?.nome ? `, ${perfil.nome.split(" ")[0]}` : ""}.</h1>
              <p>O que precisa hoje? Pesquise entre centenas de produtos locais.</p>
              <form className="mfc-search-bar" onSubmit={submeterPesquisa}>
                <Search size={20} className="mfc-search-icon" />
                <input
                  type="search"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Pesquisar produtos, marcas ou lojas..."
                />
                {pesquisa && (
                  <button type="button" className="mfc-search-clear" onClick={() => setPesquisa("")}>
                    <X size={16} />
                  </button>
                )}
                <button type="submit" className="mfc-search-btn">Pesquisar</button>
              </form>
            </div>
          </div>
        </section>

        {/* CATEGORIAS */}
        <section className="mfc-categories-bar">
          <div className="mfc-container mfc-categories-scroll">
            {categoriasRapidas.map((cat, i) => {
              const Icon = cat.icone;
              return (
                <Link to={`/cliente/produtos?pesquisa=${encodeURIComponent(cat.nome)}`} key={i} className="mfc-cat-item">
                  <div className="mfc-cat-circle"><Icon size={26} strokeWidth={1.5} /></div>
                  <span>{cat.nome}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {feedbackCarrinho && (
          <div className="mfc-toast"><CheckCircle2 size={18} /> {feedbackCarrinho}</div>
        )}

        {/* 1. SLIDER: DESTAQUES */}
        {destaques.length > 0 && (
          <ProductSlider 
            title="Produtos em destaque" 
            subtitle="ESCOLHAS DO DIA" 
            produtos={destaques} 
            onAdicionar={tratarAdicionar} 
          />
        )}

        {/* BANNER 1: OFERTAS DA SEMANA */}
        <section className="mfc-middle-banner-section">
          <div className="mfc-container">
            <div className="mfc-banner">
              <div className="mfc-banner-text">
                <span className="mfc-banner-eyebrow">OFERTAS DA SEMANA</span>
                <h2>Compras do Mês com descontos exclusivos.</h2>
                <p>Abasteça a sua despensa com os melhores produtos locais.</p>
                <Link to="/cliente/produtos" className="mfc-banner-btn">
                  Aproveitar agora <ArrowRight size={18} />
                </Link>
              </div>
              <div className="mfc-banner-icon"><ShoppingBasket size={120} strokeWidth={1} /></div>
            </div>
          </div>
        </section>

        {/* 2. SLIDER: MAIS VENDIDOS */}
        {maisVendidos.length > 0 && (
          <ProductSlider 
            title="Produtos mais vendidos" 
            subtitle="OS FAVORITOS DOS CLIENTES" 
            produtos={maisVendidos} 
            onAdicionar={tratarAdicionar} 
          />
        )}

        {/* 3. SLIDER: ZONA FRESCA */}
        {zonaFresca.length > 0 && (
          <ProductSlider 
            title="Direto da horta" 
            subtitle="ZONA FRESCA" 
            produtos={zonaFresca} 
            onAdicionar={tratarAdicionar} 
          />
        )}

        {/* BANNER 2: NOVIDADES */}
        <section className="mfc-middle-banner-section">
          <div className="mfc-container">
            <div className="mfc-banner mfc-banner-alt">
              <div className="mfc-banner-text">
                <span className="mfc-banner-eyebrow">NOVIDADES</span>
                <h2>Chegaram novos produtos ao mercado.</h2>
                <p>Descubra o que os nossos comerciantes prepararam para si.</p>
                <Link to="/cliente/produtos" className="mfc-banner-btn">
                  Explorar novidades <ArrowRight size={18} />
                </Link>
              </div>
              <div className="mfc-banner-icon"><Sparkles size={120} strokeWidth={1} /></div>
            </div>
          </div>
        </section>

        {/* 4. SLIDER: NOVIDADES */}
        {novidades.length > 0 && (
          <ProductSlider 
            title="Acabados de chegar" 
            subtitle="NOVIDADES NA LOJA" 
            produtos={novidades} 
            onAdicionar={tratarAdicionar} 
          />
        )}

        {/* 5. COMO FUNCIONA (Vantagens) */}
        <section className="mfc-features-section">
          <div className="mfc-container">
            <div className="mfc-features-grid">
              <div className="mfc-feature-card">
                <div className="mfc-feature-icon"><Truck size={28} /></div>
                <h3>Entrega Rápida</h3>
                <p>Receba os seus produtos frescos no conforto da sua casa.</p>
              </div>
              <div className="mfc-feature-card">
                <div className="mfc-feature-icon"><ShieldCheck size={28} /></div>
                <h3>Compra Segura</h3>
                <p>Compre diretamente aos produtores locais com total confiança.</p>
              </div>
              <div className="mfc-feature-card">
                <div className="mfc-feature-icon"><Clock size={28} /></div>
                <h3>Poupança de Tempo</h3>
                <p>Encontre tudo o que precisa num só lugar, sem filas.</p>
              </div>
              <div className="mfc-feature-card">
                <div className="mfc-feature-icon"><CreditCard size={28} /></div>
                <h3>Pague como quiser</h3>
                <p>Várias opções de pagamento para sua comodidade.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. LOJAS PARCEIRAS */}
        <section className="mfc-section">
          <div className="mfc-container">
            <div className="mfc-section-header">
              <div>
                <span className="mfc-eyebrow">COMÉRCIO DA SUA REGIÃO</span>
                <h2>Lojas em destaque</h2>
              </div>
              <Link to="/cliente/lojas" className="mfc-link">Ver todas <ChevronRight size={16} /></Link>
            </div>
            
            <div className="mfc-store-grid">
              {lojas.slice(0, 4).map((loja) => {
                const capaUrl = loja.capaUrl || loja.bannerUrl || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80";
                const logoUrl = obterImagemLoja(loja);
                const avaliacao = loja.avaliacao || 4.8;
                const numAvaliacoes = loja.numAvaliacoes || 124;
                const estaAberto = loja.estaAberto !== false; 
                
                return (
                  <Link to={`/cliente/lojas/${loja.id}`} className="mfc-store-card-premium" key={loja.id}>
                    <div className="mfc-store-cover">
                      <img src={capaUrl} alt={`Capa de ${obterNomeLoja(loja)}`} loading="lazy" />
                      <span className={`mfc-status-badge ${estaAberto ? 'is-open' : 'is-closed'}`}>
                        <span className="mfc-status-dot"></span>
                        {estaAberto ? 'Aberto agora' : 'Fechado'}
                      </span>
                    </div>
                    <div className="mfc-store-content">
                      <div className="mfc-store-logo-overlap">
                        <img src={logoUrl} alt={`Logótipo de ${obterNomeLoja(loja)}`} />
                      </div>
                      <div className="mfc-store-details">
                        <h3>{obterNomeLoja(loja)}</h3>
                        <div className="mfc-store-meta">
                          <span className="mfc-store-rating">⭐ {avaliacao} <span className="mfc-rating-count">({numAvaliacoes})</span></span>
                          <span className="mfc-store-separator">•</span>
                          <span className="mfc-store-location-text"><MapPin size={12} /> {[loja.municipio, loja.provincia].filter(Boolean).join(", ")}</span>
                        </div>
                        <div className="mfc-store-footer-info">
                          <span>Ver loja <ArrowRight size={14} /></span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}