import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  updateDoc 
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useCarrinho } from "../../context/CarrinhoContext";
import MenuCliente from "../../components/MenuCliente";
import Footer from "../../components/Footer";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  CreditCard,
  Smartphone,
  Barcode,
  ShieldCheck
} from "lucide-react";
import "./FinalizarEncomenda.css";

const moeda = (valor) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(valor);

const localizacoes = {
  "Namibe": ["Moçâmedes", "Tômbwa", "Bibala", "Camucuio", "Virei"],
  "Huíla (Lubango)": ["Lubango", "Matala", "Chibia", "Humpata", "Cacula", "Quipungo", "Caconda"]
};

const metodosPagamento = [
  { id: "GPO", nome: "Multicaixa Express", icon: Smartphone, descricao: "Pague com o seu telemóvel via Multicaixa Express" },
  { id: "REF", nome: "Referência", icon: Barcode, descricao: "Gere uma referência para pagar em qualquer ATM" },
  { id: "UMM", nome: "Unitel Money", icon: CreditCard, descricao: "Pague com a sua carteira Unitel Money" },
];

export default function FinalizarEncomenda() {
  const navigate = useNavigate();
  const auth = getAuth();
  const { itens, subtotal, limpar } = useCarrinho();

  const [perfil, setPerfil] = useState(null);
  const [formulario, setFormulario] = useState({
    nome: "",
    telefone: "",
    provincia: "",
    municipio: "",
    endereco: "",
    observacoes: "",
  });

  const [metodoSelecionado, setMetodoSelecionado] = useState("GPO");
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      getDoc(doc(db, "usuarios", user.uid)).then((snap) => {
        if (snap.exists()) {
          const dados = snap.data();
          setPerfil(dados);
          setFormulario((atual) => ({
            ...atual,
            nome: dados.nome || "",
            telefone: dados.telefone || "",
          }));
        }
        setCarregandoPerfil(false);
      });
    } else {
      setCarregandoPerfil(false);
    }
  }, [auth]);

  function atualizarCampo(evento) {
    const { name, value } = evento.target;
    if (name === "provincia") {
      setFormulario((atual) => ({ ...atual, provincia: value, municipio: "" }));
    } else {
      setFormulario((atual) => ({ ...atual, [name]: value }));
    }
  }

  async function concluirPedido(evento) {
    evento.preventDefault();
    setErro("");
    const utilizador = auth.currentUser;

    if (!utilizador) {
      navigate("/login", { state: { returnTo: "/finalizar-encomenda" } });
      return;
    }

    if (!itens.length) {
      setErro("O carrinho está vazio.");
      return;
    }

    if (!formulario.nome.trim() || !formulario.telefone.trim() || !formulario.provincia || !formulario.municipio || !formulario.endereco.trim()) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    setAEnviar(true);

    try {
      // 1. Criar encomenda no Firestore
      const encomendaData = {
        clienteUid: utilizador.uid,
        clienteNome: formulario.nome.trim(),
        clienteTelefone: formulario.telefone.trim(),
        provincia: formulario.provincia,
        municipio: formulario.municipio,
        endereco: formulario.endereco.trim(),
        observacoes: formulario.observacoes.trim(),
        comercianteId: itens[0].lojaId || itens[0].comercianteId,
        nomeLoja: itens[0].lojaNome || "Loja",
        itens: itens.map(i => ({
          produtoId: i.produtoId || i.id,
          nome: i.nome,
          preco: i.preco,
          quantidade: i.quantidade,
          subtotal: i.preco * i.quantidade
        })),
        total: subtotal,
        estado: "pendente",
        pagamentoEstado: "pendente",
        criadoEm: serverTimestamp(),
      };

      const encomendaRef = await addDoc(collection(db, "encomendas"), encomendaData);
      const encomendaId = encomendaRef.id;

      // 2. Autenticar na AppyPay (VIA PROXY DO FIREBASE HOSTING)
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", import.meta.env.VITE_APPYPAY_CLIENT_ID);
      params.append("client_secret", import.meta.env.VITE_APPYPAY_CLIENT_SECRET);

      const authResponse = await axios.post(
        "/api/appypay/auth", // 👈 Caminho do Proxy
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      
      const token = authResponse.data.access_token;

      // 3. Criar a cobrança (VIA PROXY DO FIREBASE HOSTING)
      const pagamentoResponse = await axios.post(
        "/api/appypay/charges", // 👈 Caminho do Proxy
        {
          merchantTransactionId: encomendaId.substring(0, 15),
          amount: Number(subtotal),
          description: `Encomenda ${encomendaId}`,
          paymentMethod: metodoSelecionado,
          customerPhone: formulario.telefone,
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );

      const dadosPagamento = pagamentoResponse.data;

      // 4. Atualizar a encomenda
      await updateDoc(doc(db, "encomendas", encomendaId), {
        pagamentoEstado: "pendente",
        pagamentoMetodo: metodoSelecionado,
        pagamentoTransacaoId: dadosPagamento.id || encomendaId,
        pagamentoReferencia: dadosPagamento.reference || null,
        pagamentoEntidade: dadosPagamento.entity || null,
      });

      limpar();
      setSucesso({
        encomendaId,
        ...dadosPagamento
      });

    } catch (error) {
      console.error("Erro ao finalizar:", error);
      const mensagemErro = error.response?.data?.message || error.message || "Não foi possível processar a encomenda.";
      setErro(mensagemErro);
    } finally {
      setAEnviar(false);
    }
  }

  if (carregandoPerfil) {
    return <div style={{ minHeight: "100vh", background: "#fafaf7" }} />;
  }

  if (sucesso) {
    return (
      <>
        {perfil ? <MenuCliente usuario={perfil} onLogout={() => auth.signOut()} /> : null}
        <main className="mf-finalizar">
          <section className="mf-finalizar-sucesso">
            <CheckCircle2 size={54} className="mf-sucesso-icon" />
            <h1>Pedido registado!</h1>
            <p>A sua encomenda foi criada com sucesso.</p>
            
            <div className="mf-pagamento-info">
              <h3>Conclua o pagamento</h3>
              <p>Método: <strong>{metodosPagamento.find(m => m.id === metodoSelecionado)?.nome}</strong></p>
              
              {metodoSelecionado === "GPO" && (
                <p>Verifique a aplicação <strong>Multicaixa Express</strong> no seu telemóvel e aprove o pagamento.</p>
              )}
              
              {metodoSelecionado === "REF" && sucesso.referencia && (
                <div className="mf-referencia-box">
                  <span>Entidade: {sucesso.entidade || "00000"}</span>
                  <span>Referência: {sucesso.referencia}</span>
                  <span>Valor: {moeda(subtotal)}</span>
                </div>
              )}
              
              {metodoSelecionado === "UMM" && (
                <p>Verifique a aplicação <strong>Unitel Money</strong> e confirme o pagamento.</p>
              )}
              
              <p className="mf-aviso-pagamento">Após o pagamento, a sua encomenda será processada pelo comerciante.</p>
            </div>

            <Link to="/cliente/pedidos" className="mf-finalizar-botao">
              Ver meus pedidos
            </Link>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (!itens.length) {
    return (
      <>
        {perfil ? <MenuCliente usuario={perfil} onLogout={() => auth.signOut()} /> : null}
        <main className="mf-finalizar">
          <section className="mf-finalizar-vazio">
            <h1>Não existem produtos no carrinho</h1>
            <Link to="/cliente/produtos" className="mf-finalizar-botao">Explorar produtos</Link>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      {perfil ? <MenuCliente usuario={perfil} onLogout={() => auth.signOut()} /> : null}
      
      <main className="mf-finalizar">
        <Link to="/carrinho" className="mf-finalizar-voltar">
          <ArrowLeft size={18} /> Voltar ao carrinho
        </Link>

        <header className="mf-finalizar-cabecalho">
          <span>MERCADO FRESKO</span>
          <h1>Finalizar encomenda</h1>
          <p>Confirme os dados e escolha como quer pagar.</p>
        </header>

        <div className="mf-finalizar-layout">
          <form className="mf-finalizar-formulario" onSubmit={concluirPedido}>
            <h2>Dados de entrega</h2>
            
            <label>Nome completo * 
              <input name="nome" value={formulario.nome} onChange={atualizarCampo} required />
            </label>
            <label>Telefone * 
              <input name="telefone" type="tel" value={formulario.telefone} onChange={atualizarCampo} required />
            </label>
            
            <div className="mf-finalizar-duas-colunas">
              <label>Província * 
                <select name="provincia" value={formulario.provincia} onChange={atualizarCampo} required>
                  <option value="">Selecione...</option>
                  {Object.keys(localizacoes).map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </label>
              <label>Município * 
                <select name="municipio" value={formulario.municipio} onChange={atualizarCampo} required disabled={!formulario.provincia}>
                  <option value="">Selecione...</option>
                  {formulario.provincia && localizacoes[formulario.provincia].map((mun) => (
                    <option key={mun} value={mun}>{mun}</option>
                  ))}
                </select>
              </label>
            </div>
            
            <label>Endereço * 
              <textarea name="endereco" value={formulario.endereco} onChange={atualizarCampo} rows={3} required placeholder="Bairro, rua, casa ou ponto de referência" />
            </label>
            <label>Observações 
              <textarea name="observacoes" value={formulario.observacoes} onChange={atualizarCampo} rows={2} />
            </label>

            <h2>Método de pagamento</h2>
            <div className="mf-metodos-pagamento">
              {metodosPagamento.map((metodo) => {
                const Icon = metodo.icon;
                return (
                  <label key={metodo.id} className={`mf-metodo-card ${metodoSelecionado === metodo.id ? "selecionado" : ""}`}>
                    <input
                      type="radio"
                      name="metodoPagamento"
                      value={metodo.id}
                      checked={metodoSelecionado === metodo.id}
                      onChange={(e) => setMetodoSelecionado(e.target.value)}
                    />
                    <div className="mf-metodo-icon"><Icon size={24} /></div>
                    <div className="mf-metodo-info">
                      <strong>{metodo.nome}</strong>
                      <span>{metodo.descricao}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {erro && <div className="mf-finalizar-erro">{erro}</div>}

            <button type="submit" className="mf-finalizar-botao mf-finalizar-botao-largo" disabled={aEnviar}>
              {aEnviar ? <><LoaderCircle size={18} className="mf-a-girar" /> A processar...</> : "Confirmar e Pagar"}
            </button>
          </form>

          <aside className="mf-finalizar-resumo">
            <h2>Resumo do pedido</h2>
            {itens.map((item) => (
              <div className="mf-finalizar-item" key={item.produtoId || item.id}>
                <div><strong>{item.nome}</strong><span>{item.quantidade} × {moeda(item.preco)}</span></div>
                <strong>{moeda(item.quantidade * item.preco)}</strong>
              </div>
            ))}
            <div className="mf-finalizar-total">
              <span>Total</span>
              <strong>{moeda(subtotal)}</strong>
            </div>
            <p className="mf-finalizar-nota"><ShieldCheck size={14} /> Pagamento seguro via AppyPay.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}