import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  AlertCircle,
  Box,
  CheckCircle2,
  Download,
  Eye,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { auth, db, storage } from "../../firebase/config";
import MenuComerciante from "./menu";
import "./produtos.css";

const CATEGORIAS = [
  "Frutas e verduras",
  "Carnes e peixe",
  "Mercearia",
  "Bebidas",
  "Laticínios e ovos",
  "Padaria e pastelaria",
  "Congelados",
  "Higiene e limpeza",
  "Casa e cozinha",
  "Moda e acessórios",
  "Eletrónicos",
  "Outros",
];

const UNIDADES = [
  { valor: "unidade", label: "Unidade (un.)" },
  { valor: "kg", label: "Quilograma (kg)" },
  { valor: "g", label: "Grama (g)" },
  { valor: "litro", label: "Litro (L)" },
  { valor: "ml", label: "Mililitro (ml)" },
  { valor: "embalagem", label: "Embalagem" },
  { valor: "duzia", label: "Dúzia" },
  { valor: "saco", label: "Saco" },
  { valor: "caixa", label: "Caixa" },
  { valor: "metro", label: "Metro (m)" },
];

const PROVINCIAS = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando",
  "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo",
  "Huíla", "Icolo e Bengo", "Luanda", "Lunda Norte",
  "Lunda Sul", "Malanje", "Moxico", "Moxico Leste",
  "Namibe", "Uíge", "Zaire", "Cubango",
];

const FORM_INICIAL = {
  nome: "",
  categoria: "",
  descricao: "",
  quantidade: "0",
  stockMinimo: "5",
  unidade: "unidade",
  preco: "",
  valorAfiliado: "0",
  provinciaOrigem: "",
};

function formatarKz(valor) {
  return `${Number(valor || 0).toLocaleString("pt-AO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Kz`;
}

function obterEstadoStock(produto) {
  const quantidade = Number(produto.quantidade || 0);
  const minimo = Number(produto.stockMinimo || 0);

  if (quantidade <= 0) {
    return { texto: "Sem stock", classe: "mf-produto-stock-zero" };
  }

  if (quantidade <= minimo) {
    return { texto: "Stock baixo", classe: "mf-produto-stock-baixo" };
  }

  return { texto: "Disponível", classe: "mf-produto-stock-ok" };
}

function escaparCampoCsv(valor) {
  let texto = String(valor ?? "");
  if (/^[\s]*[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}

export default function Produtos() {
  const inputImagemRef = useRef(null);
  const [utilizador, setUtilizador] = useState(auth.currentUser);
  const [authPronto, setAuthPronto] = useState(false);

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [imagem, setImagem] = useState(null);
  const [imagemPreview, setImagemPreview] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroStock, setFiltroStock] = useState("todos");
  const [filtroPublicacao, setFiltroPublicacao] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [produtoEliminar, setProdutoEliminar] = useState(null);
  const [aPublicar, setAPublicar] = useState("");

  // Aguarda o Firebase confirmar a sessão.
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      setUtilizador(user);
      setAuthPronto(true);
    });

    return cancelar;
  }, []);

  // Escuta em tempo real os produtos do comerciante autenticado.
  useEffect(() => {
    if (!authPronto) return undefined;

    if (!utilizador) {
      setProdutos([]);
      setCarregando(false);
      setErro("Inicia sessão para gerir os teus produtos.");
      return undefined;
    }

    setCarregando(true);
    setErro("");

    const consultaProdutos = query(
      collection(db, "produtos"),
      where("comercianteId", "==", utilizador.uid)
    );

    const cancelar = onSnapshot(
      consultaProdutos,
      (snapshot) => {
        setProdutos(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setCarregando(false);
      },
      (error) => {
        console.error(
          "Erro ao carregar produtos:",
          error.code,
          error.message
        );
        setErro(`Erro ao carregar produtos: ${error.code || error.message}`);
        setCarregando(false);
      }
    );

    return cancelar;
  }, [utilizador?.uid, authPronto]);

  useEffect(() => {
    if (!sucesso) return undefined;
    const temporizador = setTimeout(() => setSucesso(""), 3500);
    return () => clearTimeout(temporizador);
  }, [sucesso]);

  // Liberta a memória das pré-visualizações locais.
  useEffect(() => {
    return () => {
      if (imagemPreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagemPreview);
      }
    };
  }, [imagemPreview]);

  const produtosFiltrados = useMemo(() => {
    let lista = [...produtos];
    const termo = pesquisa.trim().toLocaleLowerCase("pt");

    if (termo) {
      lista = lista.filter((produto) =>
        `${produto.nome || ""} ${produto.categoria || ""} ${produto.provinciaOrigem || ""}`
          .toLocaleLowerCase("pt")
          .includes(termo)
      );
    }

    if (filtroCategoria !== "todas") {
      lista = lista.filter((p) => p.categoria === filtroCategoria);
    }

    if (filtroStock === "baixo") {
      lista = lista.filter((p) => {
        const qtd = Number(p.quantidade || 0);
        return qtd > 0 && qtd <= Number(p.stockMinimo || 0);
      });
    }

    if (filtroStock === "sem") {
      lista = lista.filter((p) => Number(p.quantidade || 0) <= 0);
    }

    if (filtroStock === "disponivel") {
      lista = lista.filter(
        (p) => Number(p.quantidade || 0) > Number(p.stockMinimo || 0)
      );
    }

    if (filtroPublicacao === "publicados") {
      lista = lista.filter((produto) => produto.publicado === true);
    } else if (filtroPublicacao === "nao-publicados") {
      lista = lista.filter((produto) => produto.publicado !== true);
    }

    if (ordenacao === "nome") {
      lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt"));
    } else if (ordenacao === "preco-menor") {
      lista.sort((a, b) => Number(a.preco || 0) - Number(b.preco || 0));
    } else if (ordenacao === "stock-menor") {
      lista.sort(
        (a, b) => Number(a.quantidade || 0) - Number(b.quantidade || 0)
      );
    } else {
      lista.sort((a, b) => {
        const dataA =
          a.atualizadoEm?.toMillis?.() || a.criadoEm?.toMillis?.() || 0;
        const dataB =
          b.atualizadoEm?.toMillis?.() || b.criadoEm?.toMillis?.() || 0;
        return dataB - dataA;
      });
    }

    return lista;
  }, [produtos, pesquisa, filtroCategoria, filtroStock, filtroPublicacao, ordenacao]);

  function exportarProdutos() {
    const colunas = [
      "Produto",
      "Categoria",
      "Origem",
      "Unidade",
      "Preço (AOA)",
      "Comissão de afiliado (AOA)",
      "Quantidade",
      "Stock mínimo",
      "Estado",
      "Publicação",
    ];
    const linhas = produtosFiltrados.map((produto) => [
      produto.nome,
      produto.categoria,
      produto.provinciaOrigem,
      produto.unidade,
      produto.preco,
      produto.valorAfiliado,
      produto.quantidade,
      produto.stockMinimo,
      obterEstadoStock(produto).texto,
      produto.publicado === true ? "Publicado" : "Não publicado",
    ]);
    const csv = [colunas, ...linhas]
      .map((linha) => linha.map(escaparCampoCsv).join(";"))
      .join("\r\n");
    const ficheiro = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(ficheiro);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produtos-mercado-fresko-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const estatisticas = useMemo(
    () => ({
      total: produtos.length,
      disponiveis: produtos.filter(
        (p) => Number(p.quantidade || 0) > Number(p.stockMinimo || 0)
      ).length,
      stockBaixo: produtos.filter((p) => {
        const qtd = Number(p.quantidade || 0);
        return qtd > 0 && qtd <= Number(p.stockMinimo || 0);
      }).length,
      semStock: produtos.filter((p) => Number(p.quantidade || 0) <= 0)
        .length,
    }),
    [produtos]
  );

  function atualizarCampo(evento) {
    const { name, value } = evento.target;
    setForm((anterior) => ({ ...anterior, [name]: value }));
  }

  function abrirNovoProduto() {
    setErro("");
    setProdutoEditando(null);
    setForm({ ...FORM_INICIAL });
    setImagem(null);
    setImagemPreview("");
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setErro("");
    setProdutoEditando(produto);
    setForm({
      nome: produto.nome || "",
      categoria: produto.categoria || "",
      descricao: produto.descricao || "",
      quantidade: String(produto.quantidade ?? 0),
      stockMinimo: String(produto.stockMinimo ?? 5),
      unidade: produto.unidade || "unidade",
      preco: String(produto.preco ?? ""),
      valorAfiliado: String(produto.valorAfiliado ?? 0),
      provinciaOrigem: produto.provinciaOrigem || "",
    });
    setImagem(null);
    setImagemPreview(produto.imagemUrl || "");
    setModalAberto(true);
  }

  function fecharModal() {
    if (aGuardar) return;
    setModalAberto(false);
    setProdutoEditando(null);
    setForm({ ...FORM_INICIAL });
    setImagem(null);
    setImagemPreview("");
    setErro("");
  }

  function selecionarImagem(evento) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(ficheiro.type)) {
      setErro("Seleciona uma imagem JPG, PNG ou WEBP.");
      evento.target.value = "";
      return;
    }

    if (ficheiro.size > 5 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 5 MB.");
      evento.target.value = "";
      return;
    }

    setErro("");
    setImagem(ficheiro);
    setImagemPreview(URL.createObjectURL(ficheiro));
  }

  async function carregarImagem(ficheiro, produtoId) {
    if (!ficheiro) {
      return {
        imagemUrl: produtoEditando?.imagemUrl || "",
        imagemPath: produtoEditando?.imagemPath || "",
      };
    }

    const extensoes = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extensao = extensoes[ficheiro.type];
    const caminho =
      `produtos/${utilizador.uid}/${produtoId}/imagem-${Date.now()}.${extensao}`;

    const referencia = ref(storage, caminho);

    await uploadBytes(referencia, ficheiro, {
      contentType: ficheiro.type,
    });

    const url = await getDownloadURL(referencia);
    return { imagemUrl: url, imagemPath: caminho };
  }

  async function guardarProduto(evento) {
    evento.preventDefault();
    setErro("");
    setSucesso("");

    if (!utilizador) {
      setErro("Inicia sessão para cadastrar produtos.");
      return;
    }

    if (
      !form.nome.trim() ||
      !form.categoria ||
      !form.provinciaOrigem ||
      !form.preco
    ) {
      setErro("Preenche o nome, a categoria, o preço e a província de origem.");
      return;
    }

    const preco = Number(form.preco);
    const quantidade = Number(form.quantidade);
    const stockMinimo = Number(form.stockMinimo);
    const valorAfiliado = Number(form.valorAfiliado);

    if (
      !Number.isFinite(preco) ||
      preco <= 0 ||
      preco > 1000000000000 ||
      !Number.isFinite(quantidade) ||
      !Number.isInteger(quantidade) ||
      quantidade < 0 ||
      quantidade > 1000000 ||
      !Number.isFinite(stockMinimo) ||
      !Number.isInteger(stockMinimo) ||
      stockMinimo < 0 ||
      stockMinimo > 1000000 ||
      !Number.isFinite(valorAfiliado) ||
      valorAfiliado < 0
    ) {
      setErro(
        "O preço deve ser positivo e o stock e o limite devem ser números inteiros entre 0 e 1 000 000."
      );
      return;
    }

    if (valorAfiliado > preco) {
      setErro("O valor do afiliado não pode superar o preço de venda.");
      return;
    }

    setAGuardar(true);
    let caminhoImagemNova = "";

    try {
      const lojaSnap = await getDoc(doc(db, "lojas", utilizador.uid));

      if (!lojaSnap.exists() || !lojaSnap.data().configurada) {
        throw new Error("Configure os dados da loja antes de publicar produtos.");
      }

      const dadosBase = {
        nome: form.nome.trim(),
        nomePesquisa: form.nome.trim().toLocaleLowerCase("pt"),
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        quantidade,
        stockMinimo,
        unidade: form.unidade,
        preco,
        valorAfiliado,
        provinciaOrigem: form.provinciaOrigem,
        comercianteId: utilizador.uid,
        lojaNome: lojaSnap.data().nome,
        publicado: true,
        atualizadoEm: serverTimestamp(),
      };

      if (produtoEditando) {
        let dadosImagem = {
          imagemUrl: produtoEditando.imagemUrl || "",
          imagemPath: produtoEditando.imagemPath || "",
        };

        if (imagem) {
          dadosImagem = await carregarImagem(imagem, produtoEditando.id);
          caminhoImagemNova = dadosImagem.imagemPath;
        }

        await updateDoc(doc(db, "produtos", produtoEditando.id), {
          ...dadosBase,
          ...dadosImagem,
        });

        if (
          imagem &&
          produtoEditando.imagemPath &&
          produtoEditando.imagemPath !== dadosImagem.imagemPath
        ) {
          try {
            await deleteObject(ref(storage, produtoEditando.imagemPath));
          } catch (error) {
            console.warn("Não foi possível eliminar a imagem anterior:", error);
          }
        }

        setSucesso("Produto atualizado com sucesso.");
      } else {
        // Primeiro cria o documento para obter um ID estável.
        const novoProduto = await addDoc(collection(db, "produtos"), {
          ...dadosBase,
          imagemUrl: "",
          imagemPath: "",
          criadoEm: serverTimestamp(),
        });

        if (imagem) {
          try {
            const dadosImagem = await carregarImagem(imagem, novoProduto.id);
            caminhoImagemNova = dadosImagem.imagemPath;

            await updateDoc(doc(db, "produtos", novoProduto.id), dadosImagem);
          } catch (erroImagem) {
            // O produto já foi criado; não o apresentamos como perdido.
            console.error("Produto criado, mas falhou o upload da imagem:", erroImagem);
            setSucesso("Produto cadastrado, mas não foi possível carregar a imagem.");
            setErro(
              `O produto foi criado, mas a imagem falhou: ${erroImagem.code || erroImagem.message}`
            );
            setModalAberto(false);
            return;
          }
        }

        setSucesso("Produto cadastrado com sucesso.");
      }

      setModalAberto(false);
      setProdutoEditando(null);
      setForm({ ...FORM_INICIAL });
      setImagem(null);
      setImagemPreview("");
    } catch (error) {
      console.error("Erro ao guardar produto:", error.code, error.message);
      setErro(`Não foi possível guardar o produto: ${error.code || error.message}`);

      if (caminhoImagemNova) {
        try {
          await deleteObject(ref(storage, caminhoImagemNova));
        } catch (erroImagem) {
          console.warn("Não foi possível limpar a imagem enviada:", erroImagem);
        }
      }
    } finally {
      setAGuardar(false);
    }
  }

  async function publicarProduto(produto) {
    if (!utilizador || produto.comercianteId !== utilizador.uid) {
      setErro("Não tens permissão para publicar este produto.");
      return;
    }

    const quantidade = Number(produto.quantidade ?? 0);
    const stockMinimo = Number(produto.stockMinimo ?? 0);
    const preco = Number(produto.preco);
    const valorAfiliado = Number(produto.valorAfiliado ?? 0);
    if (
      !produto.nome?.trim() ||
      !produto.categoria ||
      !produto.provinciaOrigem ||
      !Number.isInteger(quantidade) ||
      quantidade < 0 ||
      quantidade > 1000000 ||
      !Number.isInteger(stockMinimo) ||
      stockMinimo < 0 ||
      stockMinimo > 1000000 ||
      !Number.isFinite(preco) ||
      preco <= 0 ||
      !Number.isFinite(valorAfiliado) ||
      valorAfiliado < 0 ||
      valorAfiliado > preco
    ) {
      setErro(
        `Edite "${produto.nome || "este produto"}" e corrija os campos obrigatórios antes de o publicar.`
      );
      return;
    }

    setAPublicar(produto.id);
    setErro("");
    setSucesso("");
    try {
      const lojaSnap = await getDoc(doc(db, "lojas", utilizador.uid));
      if (!lojaSnap.exists() || lojaSnap.data().configurada !== true) {
        throw new Error("Configure a loja antes de publicar produtos.");
      }

      await updateDoc(doc(db, "produtos", produto.id), {
        nome: produto.nome.trim(),
        nomePesquisa: produto.nome.trim().toLocaleLowerCase("pt"),
        categoria: produto.categoria,
        descricao: String(produto.descricao || ""),
        quantidade,
        stockMinimo,
        unidade: String(produto.unidade || "unidade"),
        preco,
        valorAfiliado,
        provinciaOrigem: String(produto.provinciaOrigem),
        imagemUrl: String(produto.imagemUrl || ""),
        imagemPath: String(produto.imagemPath || ""),
        publicado: true,
        lojaNome: lojaSnap.data().nome,
        atualizadoEm: serverTimestamp(),
      });
      setSucesso(
        quantidade > 0
          ? `"${produto.nome}" foi publicado e ficará visível no catálogo.`
          : `"${produto.nome}" foi publicado, mas precisa de stock para permitir compras.`
      );
    } catch (error) {
      console.error("Não foi possível publicar o produto:", error);
      setErro(
        error.code === "permission-denied"
          ? "O Firebase recusou a publicação. Confirme as regras Firestore e se esta conta é proprietária da loja."
          : error.message || "Não foi possível publicar o produto."
      );
    } finally {
      setAPublicar("");
    }
  }

  async function eliminarProduto() {
    if (!produtoEliminar || !utilizador) return;

    setErro("");
    setSucesso("");
    let erroImagem = false;

    try {
      if (produtoEliminar.comercianteId !== utilizador.uid) {
        setErro("Não tens permissão para eliminar este produto.");
        return;
      }

      await deleteDoc(doc(db, "produtos", produtoEliminar.id));

      if (produtoEliminar.imagemPath) {
        try {
          await deleteObject(ref(storage, produtoEliminar.imagemPath));
        } catch (error) {
          erroImagem = true;
          console.error(
            "Produto eliminado, mas a imagem no Storage não pôde ser removida:",
            error
          );
        }
      }

      setProdutoEliminar(null);
      if (erroImagem) {
        setSucesso("O produto foi eliminado do catálogo.");
        setErro(
          "Não foi possível remover a imagem associada do armazenamento. Verifique as regras do Storage."
        );
      } else {
        setSucesso("Produto eliminado com sucesso.");
      }
    } catch (error) {
      console.error("Erro ao eliminar produto:", error.code, error.message);
      setErro(`Não foi possível eliminar o produto: ${error.code || error.message}`);
    }
  }

  if (!authPronto) {
    return (
      <div className="mf-produtos-page">
        <div className="mf-produtos-loading">
          <LoaderCircle size={30} className="mf-produtos-spin" />
          <span>A verificar a sessão...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mf-produtos-page">
      <MenuComerciante />

      <main className="mf-produtos-main">
        <div className="mf-produtos-content">
          <header className="mf-produtos-heading">
            <div>
              <span className="mf-produtos-eyebrow">GESTÃO DA LOJA</span>
              <h1>Os meus produtos</h1>
              <p>Organiza o teu catálogo, controla o stock e gere os preços da tua loja.</p>
            </div>
            <button type="button" className="mf-produtos-primary" onClick={abrirNovoProduto}>
              <Plus size={19} /> <span>Novo produto</span>
            </button>
          </header>

          {erro && !modalAberto && (
            <div className="mf-produtos-alert mf-produtos-alert-error" role="alert">
              <AlertCircle size={19} />
              <span>{erro}</span>
              <button type="button" onClick={() => setErro("")} aria-label="Fechar alerta">
                <X size={17} />
              </button>
            </div>
          )}

          {sucesso && (
            <div className="mf-produtos-alert mf-produtos-alert-success" role="status">
              <CheckCircle2 size={19} />
              <span>{sucesso}</span>
            </div>
          )}

          <section className="mf-produtos-stats" aria-label="Resumo do stock">
            <article className="mf-produtos-stat">
              <span className="mf-produtos-stat-icon mf-stat-green"><Package size={21} /></span>
              <div><span className="mf-produtos-stat-label">Total de produtos</span><strong>{estatisticas.total}</strong><small>Produtos cadastrados</small></div>
            </article>
            <article className="mf-produtos-stat">
              <span className="mf-produtos-stat-icon mf-stat-blue"><ShoppingBasket size={21} /></span>
              <div><span className="mf-produtos-stat-label">Disponíveis</span><strong>{estatisticas.disponiveis}</strong><small>Stock acima do mínimo</small></div>
            </article>
            <article className="mf-produtos-stat">
              <span className="mf-produtos-stat-icon mf-stat-orange"><AlertCircle size={21} /></span>
              <div><span className="mf-produtos-stat-label">Stock baixo</span><strong>{estatisticas.stockBaixo}</strong><small>Precisam de reposição</small></div>
            </article>
            <article className="mf-produtos-stat">
              <span className="mf-produtos-stat-icon mf-stat-red"><Box size={21} /></span>
              <div><span className="mf-produtos-stat-label">Sem stock</span><strong>{estatisticas.semStock}</strong><small>Indisponíveis para venda</small></div>
            </article>
          </section>

          <section className="mf-produtos-catalog">
            <div className="mf-produtos-catalog-heading">
              <div><h2>Catálogo de produtos</h2><p>Consulta e administra os produtos da tua loja.</p></div>
              <div className="mf-produtos-catalog-actions">
                <span className="mf-produtos-total-badge">{produtosFiltrados.length} de {produtos.length} produto(s)</span>
                <button type="button" className="mf-produtos-export" onClick={exportarProdutos} disabled={!produtosFiltrados.length}>
                  <Download size={16} /> Exportar CSV
                </button>
              </div>
            </div>

            <div className="mf-produtos-toolbar">
              <label className="mf-produtos-search">
                <Search size={18} />
                <input type="search" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar produto, categoria ou origem..." aria-label="Pesquisar produtos" />
                {pesquisa && <button type="button" onClick={() => setPesquisa("")} aria-label="Limpar pesquisa"><X size={16} /></button>}
              </label>

              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} aria-label="Filtrar por categoria">
                <option value="todas">Todas as categorias</option>
                {CATEGORIAS.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
              </select>

              <select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)} aria-label="Filtrar por stock">
                <option value="todos">Todos os estados</option>
                <option value="disponivel">Disponível</option>
                <option value="baixo">Stock baixo</option>
                <option value="sem">Sem stock</option>
              </select>

              <select value={filtroPublicacao} onChange={(e) => setFiltroPublicacao(e.target.value)} aria-label="Filtrar por publicação">
                <option value="todos">Todos os estados de publicação</option>
                <option value="publicados">Publicados</option>
                <option value="nao-publicados">Não publicados</option>
              </select>

              <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} aria-label="Ordenar produtos">
                <option value="recentes">Mais recentes</option>
                <option value="nome">Nome A–Z</option>
                <option value="preco-menor">Menor preço</option>
                <option value="stock-menor">Menor stock</option>
              </select>
            </div>

            {carregando ? (
              <div className="mf-produtos-loading"><LoaderCircle size={30} className="mf-produtos-spin" /><span>A carregar os teus produtos...</span></div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="mf-produtos-empty">
                <span className="mf-produtos-empty-icon"><Package size={31} /></span>
                <h3>{produtos.length === 0 ? "Ainda não tens produtos" : "Nenhum produto encontrado"}</h3>
                <p>{produtos.length === 0 ? "Começa a criar o teu catálogo adicionando o primeiro produto." : "Experimenta alterar a pesquisa ou os filtros selecionados."}</p>
                {produtos.length === 0 && <button type="button" className="mf-produtos-primary" onClick={abrirNovoProduto}><Plus size={18} /> Adicionar primeiro produto</button>}
              </div>
            ) : (
              <div className="mf-produtos-table-wrap">
                <table className="mf-produtos-table">
                  <thead>
                    <tr><th>Produto</th><th>Categoria / Origem</th><th>Preço de venda</th><th>Valor afiliado</th><th>Stock</th><th>Estado do stock</th><th>Publicação</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map((produto) => {
                      const estado = obterEstadoStock(produto);
                      return (
                        <tr key={produto.id}>
                          <td>
                            <div className="mf-produto-cell">
                              <div className="mf-produto-thumb">{produto.imagemUrl ? <img src={produto.imagemUrl} alt={produto.nome} /> : <Package size={23} />}</div>
                              <div className="mf-produto-name"><strong>{produto.nome}</strong><small>Por {UNIDADES.find((u) => u.valor === produto.unidade)?.label || produto.unidade || "Unidade"}</small></div>
                            </div>
                          </td>
                          <td><div className="mf-produto-category"><span>{produto.categoria || "Sem categoria"}</span><small>{produto.provinciaOrigem || "Origem não indicada"}</small></div></td>
                          <td><strong className="mf-produto-price">{formatarKz(produto.preco)}</strong><small className="mf-produto-cell-sub">por {produto.unidade || "unidade"}</small></td>
                          <td><strong className="mf-produto-affiliate">{formatarKz(produto.valorAfiliado)}</strong><small className="mf-produto-cell-sub">por venda</small></td>
                          <td><strong className="mf-produto-stock-number">{produto.quantidade ?? 0}</strong><small className="mf-produto-cell-sub">{produto.unidade || "unidade"}</small></td>
                          <td><span className={`mf-produto-stock-badge ${estado.classe}`}><span /> {estado.texto}</span></td>
                          <td>
                            {produto.publicado === true ? (
                              <span className="mf-produto-published">Publicado</span>
                            ) : (
                              <button
                                type="button"
                                className="mf-produto-publish"
                                disabled={aPublicar === produto.id}
                                onClick={() => publicarProduto(produto)}
                              >
                                <Eye size={15} />
                                {aPublicar === produto.id ? "A publicar..." : "Publicar"}
                              </button>
                            )}
                          </td>
                          <td>
                            <div className="mf-produto-actions">
                              <button type="button" className="mf-produto-action-edit" onClick={() => abrirEdicao(produto)} aria-label={`Editar ${produto.nome}`} title="Editar produto"><Pencil size={17} /></button>
                              <button type="button" className="mf-produto-action-delete" onClick={() => setProdutoEliminar(produto)} aria-label={`Eliminar ${produto.nome}`} title="Eliminar produto"><Trash2 size={17} /></button>
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

          <footer className="mf-produtos-footer">Mercado Fresko · Gestão de produtos</footer>
        </div>
      </main>

      {modalAberto && (
        <div className="mf-produtos-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
          <section className="mf-produtos-modal" role="dialog" aria-modal="true" aria-labelledby="mf-produto-form-title">
            <header className="mf-produtos-modal-header">
              <div className="mf-produtos-modal-title-icon"><Tag size={22} /></div>
              <div><h2 id="mf-produto-form-title">{produtoEditando ? "Editar produto" : "Cadastrar produto"}</h2><p>Preenche os dados para manter o catálogo atualizado.</p></div>
              <button type="button" className="mf-produtos-modal-close" onClick={fecharModal} disabled={aGuardar} aria-label="Fechar formulário"><X size={21} /></button>
            </header>

            <form className="mf-produtos-form" onSubmit={guardarProduto}>
              {erro && <div className="mf-produtos-alert mf-produtos-alert-error" role="alert"><AlertCircle size={18} /><span>{erro}</span></div>}

              <div className="mf-produtos-form-section">
                <h3>Informações gerais</h3><p>Identificação e descrição do produto.</p>
                <div className="mf-produtos-form-grid">
                  <label className="mf-produtos-field mf-field-full"><span>Nome do produto <b>*</b></span><input name="nome" value={form.nome} onChange={atualizarCampo} maxLength={120} required placeholder="Ex.: Banana, arroz, óleo alimentar..." /></label>
                  <label className="mf-produtos-field"><span>Categoria <b>*</b></span><select name="categoria" value={form.categoria} onChange={atualizarCampo} required><option value="">Selecionar categoria</option>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
                  <label className="mf-produtos-field"><span>Província de origem <b>*</b></span><select name="provinciaOrigem" value={form.provinciaOrigem} onChange={atualizarCampo} required><option value="">Selecionar província</option>{PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
                  <label className="mf-produtos-field mf-field-full"><span>Descrição <small>(opcional)</small></span><textarea name="descricao" value={form.descricao} onChange={atualizarCampo} rows={4} maxLength={1500} placeholder="Descreve as características e informações úteis..." /><small>{form.descricao.length}/1500 caracteres</small></label>
                </div>
              </div>

              <div className="mf-produtos-form-section">
                <h3>Imagem do produto</h3><p>Usa uma fotografia nítida. Tamanho máximo: 5 MB.</p>
                <input ref={inputImagemRef} className="mf-sr-only" type="file" accept="image/*" onChange={selecionarImagem} />
                <div className="mf-produtos-image-uploader">
                  <div className="mf-produtos-image-preview">{imagemPreview ? <img src={imagemPreview} alt="Pré-visualização" /> : <div><ImagePlus size={32} /><span>Sem imagem</span></div>}</div>
                  <div className="mf-produtos-image-info">
                    <strong>Fotografia do produto</strong>
                    <p>A imagem será carregada no Firebase Storage.</p>
                    <button type="button" className="mf-produtos-upload-button" onClick={() => inputImagemRef.current?.click()}><UploadCloud size={17} /> Selecionar imagem</button>
                    {imagemPreview && <button type="button" className="mf-produtos-remove-image" onClick={() => { setImagem(null); setImagemPreview(""); if (inputImagemRef.current) inputImagemRef.current.value = ""; }}>Remover imagem</button>}
                  </div>
                </div>
              </div>

              <div className="mf-produtos-form-section">
                <h3>Preço e unidade de venda</h3><p>Define o preço cobrado ao cliente.</p>
                <div className="mf-produtos-form-grid">
                  <label className="mf-produtos-field"><span>Unidade de venda <b>*</b></span><select name="unidade" value={form.unidade} onChange={atualizarCampo} required>{UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.label}</option>)}</select></label>
                  <label className="mf-produtos-field"><span>Preço de venda (Kz) <b>*</b></span><input type="number" name="preco" value={form.preco} onChange={atualizarCampo} min="0.01" step="0.01" required placeholder="Ex.: 1500" /></label>
                  <label className="mf-produtos-field"><span>Comissão do afiliado por unidade (Kz)</span><input type="number" name="valorAfiliado" value={form.valorAfiliado} onChange={atualizarCampo} min="0" step="0.01" /><small>Definida pela loja; só fica confirmada depois de o pagamento ser validado.</small></label>
                </div>
              </div>

              <div className="mf-produtos-form-section">
                <h3>Controlo de stock</h3><p>Define a quantidade disponível e o limite de reposição.</p>
                <div className="mf-produtos-form-grid">
                  <label className="mf-produtos-field"><span>Quantidade em stock <b>*</b></span><input type="number" name="quantidade" value={form.quantidade} onChange={atualizarCampo} min="0" max="1000000" step="1" required /></label>
                  <label className="mf-produtos-field"><span>Alerta de stock baixo</span><input type="number" name="stockMinimo" value={form.stockMinimo} onChange={atualizarCampo} min="0" max="1000000" step="1" required /></label>
                </div>
              </div>

              <div className="mf-produtos-form-actions">
                <button type="button" className="mf-produtos-cancel" onClick={fecharModal} disabled={aGuardar}>Cancelar</button>
                <button type="submit" className="mf-produtos-primary" disabled={aGuardar}>{aGuardar ? <><LoaderCircle size={18} className="mf-produtos-spin" /> A guardar...</> : <><CheckCircle2 size={18} /> {produtoEditando ? "Guardar alterações" : "Cadastrar produto"}</>}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {produtoEliminar && (
        <div className="mf-produtos-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setProdutoEliminar(null); }}>
          <section className="mf-produtos-confirm" role="alertdialog" aria-modal="true" aria-labelledby="mf-delete-title">
            <span className="mf-produtos-confirm-icon"><Trash2 size={25} /></span>
            <h2 id="mf-delete-title">Eliminar produto?</h2>
            <p>Tens a certeza de que pretendes eliminar <strong>{produtoEliminar.nome}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="mf-produtos-confirm-actions">
              <button type="button" className="mf-produtos-cancel" onClick={() => setProdutoEliminar(null)}>Cancelar</button>
              <button type="button" className="mf-produtos-delete-confirm" onClick={eliminarProduto}><Trash2 size={17} /> Eliminar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}