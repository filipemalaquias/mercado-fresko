
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  Store,
  MapPin,
  Phone,
  ImagePlus,
  Save,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Pencil,
  ExternalLink,
} from "lucide-react";

import { auth, db } from "../../firebase/config";
import { uploadLogoCloudinary } from "../../services/cloudinary";
import MenuComerciante from "./menu.jsx";

import "./home.css";

const FORMULARIO_INICIAL = {
  nome: "",
  descricao: "",
  telefone: "",
  provincia: "Namibe",
  municipio: "",
  endereco: "",
};

const TAMANHO_MAXIMO_LOGO = 5 * 1024 * 1024;

const TIPOS_LOGO_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ComercianteHome() {
  const navigate = useNavigate();

  const [utilizador, setUtilizador] = useState(null);
  const [loja, setLoja] = useState(null);

  const [formulario, setFormulario] = useState({
    ...FORMULARIO_INICIAL,
  });

  const [logoArquivo, setLogoArquivo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoRemovido, setLogoRemovido] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Autenticação e carregamento dos dados da loja.
  useEffect(() => {
    let ativo = true;

    const cancelarObservacao = onAuthStateChanged(
      auth,
      async (utilizadorAtual) => {
        if (!ativo) return;

        if (!utilizadorAtual) {
          navigate("/login", { replace: true });
          return;
        }

        setUtilizador(utilizadorAtual);
        setCarregando(true);
        setErro("");

        try {
          const lojaRef = doc(
            db,
            "lojas",
            utilizadorAtual.uid
          );

          const lojaSnap = await getDoc(lojaRef);

          if (!ativo) return;

          if (lojaSnap.exists()) {
            const dadosLoja = lojaSnap.data();

            setLoja(dadosLoja);

            setFormulario({
              nome: dadosLoja.nome || "",
              descricao: dadosLoja.descricao || "",
              telefone: dadosLoja.telefone || "",
              provincia: dadosLoja.provincia || "Namibe",
              municipio: dadosLoja.municipio || "",
              endereco: dadosLoja.endereco || "",
            });

            setLogoPreview(dadosLoja.logoUrl || "");
            setLogoRemovido(false);
            setMostrarFormulario(false);
          } else {
            setLoja(null);
            setFormulario({ ...FORMULARIO_INICIAL });
            setLogoPreview("");
            setLogoRemovido(false);
            setMostrarFormulario(true);
          }
        } catch (error) {
          console.error(
            "Erro ao carregar os dados da loja:",
            error
          );

          if (ativo) {
            setErro(
              "Não foi possível carregar a loja. Verifique as permissões do Firestore e tente novamente."
            );
          }
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }
    );

    return () => {
      ativo = false;
      cancelarObservacao();
    };
  }, [navigate]);

  // Pré-visualização temporária da imagem selecionada.
  useEffect(() => {
    if (!logoArquivo) return undefined;

    const urlTemporario = URL.createObjectURL(logoArquivo);

    setLogoPreview(urlTemporario);

    return () => {
      URL.revokeObjectURL(urlTemporario);
    };
  }, [logoArquivo]);

  function atualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function selecionarLogo(evento) {
    const ficheiro = evento.target.files?.[0];

    setErro("");
    setSucesso("");

    if (!ficheiro) return;

    if (!TIPOS_LOGO_PERMITIDOS.includes(ficheiro.type)) {
      setErro("Selecione uma imagem JPG, PNG ou WEBP.");
      evento.target.value = "";
      return;
    }

    if (ficheiro.size > TAMANHO_MAXIMO_LOGO) {
      setErro("O logótipo não pode ultrapassar 5 MB.");
      evento.target.value = "";
      return;
    }

    setLogoArquivo(ficheiro);
    setLogoRemovido(false);
  }

  function removerLogoSelecionado() {
    setLogoArquivo(null);
    setLogoPreview(loja?.logoUrl || "");
    setLogoRemovido(false);

    const input = document.getElementById("logoLoja");

    if (input) {
      input.value = "";
    }
  }

  function removerLogoLoja() {
    setLogoArquivo(null);
    setLogoPreview("");
    setLogoRemovido(true);

    const input = document.getElementById("logoLoja");
    if (input) input.value = "";
  }

  function restaurarLogoLoja() {
    setLogoRemovido(false);
    setLogoPreview(loja?.logoUrl || "");
  }

  function cancelarEdicao() {
    setFormulario({
      nome: loja?.nome || "",
      descricao: loja?.descricao || "",
      telefone: loja?.telefone || "",
      provincia: loja?.provincia || "Namibe",
      municipio: loja?.municipio || "",
      endereco: loja?.endereco || "",
    });

    setLogoArquivo(null);
    setLogoPreview(loja?.logoUrl || "");
    setLogoRemovido(false);
    setMostrarFormulario(false);
    setErro("");
    setSucesso("");
  }

  async function guardarLoja(evento) {
    evento.preventDefault();

    if (aGuardar) return;

    if (!utilizador) {
      setErro(
        "A sua sessão expirou. Inicie sessão novamente."
      );
      return;
    }

    const nome = formulario.nome.trim();
    const telefone = formulario.telefone.trim();
    const municipio = formulario.municipio.trim();

    if (!nome) {
      setErro("Introduza o nome da sua loja.");
      return;
    }

    if (!telefone) {
      setErro("Introduza o telefone de contacto da loja.");
      return;
    }

    if (!municipio) {
      setErro(
        "Introduza o município onde a loja está localizada."
      );
      return;
    }

    setAGuardar(true);
    setErro("");
    setSucesso("");

    try {
      let logoUrl = loja?.logoUrl || "";
      let logoPublicId = loja?.logoPublicId || "";

      if (logoArquivo) {
        const imagem = await uploadLogoCloudinary(
          logoArquivo,
          utilizador.uid
        );

        logoUrl = imagem.url;
        logoPublicId = imagem.publicId;
      } else if (logoRemovido) {
        logoUrl = "";
        logoPublicId = "";
      }

      const dadosLoja = {
        uid: utilizador.uid,
        nome,
        descricao: formulario.descricao.trim(),
        telefone,
        provincia: formulario.provincia,
        municipio,
        endereco: formulario.endereco.trim(),
        logoUrl,
        logoPublicId,
        configurada: true,
        atualizadoEm: serverTimestamp(),
      };

      const lojaRef = doc(
        db,
        "lojas",
        utilizador.uid
      );

      await setDoc(
        lojaRef,
        {
          ...dadosLoja,
          ...(!loja
            ? { criadoEm: serverTimestamp() }
            : {}),
        },
        { merge: true }
      );

      setLoja((anterior) => ({
        ...(anterior || {}),
        ...dadosLoja,
      }));

      setLogoArquivo(null);
      setLogoPreview(logoUrl);
      setLogoRemovido(false);
      setMostrarFormulario(false);

      setSucesso("Dados da loja guardados com sucesso!");

      // Ir para o dashboard depois de guardar no Firestore.
      navigate("/comerciantes/dashboard", {
        replace: true,
        state: { lojaGuardada: true },
      });
    } catch (error) {
      console.error("Erro ao guardar a loja:", error);

      if (error.code === "permission-denied") {
        setErro(
          "Não tem permissão para guardar os dados. Verifique as regras do Firestore."
        );
      } else {
        setErro(
          error.message ||
            "Não foi possível guardar a loja. Verifique o Cloudinary e o Firestore."
        );
      }
    } finally {
      setAGuardar(false);
    }
  }

  function abrirEdicao() {
    setErro("");
    setSucesso("");
    setMostrarFormulario(true);
  }

  if (carregando) {
    return (
      <>
        <MenuComerciante />

        <main className="mf-merchant-loading">
          <LoaderCircle className="mf-spin" size={32} />
          <p>A carregar a sua loja...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <MenuComerciante />

      <main className="mf-merchant-page">
        <section className="mf-merchant-content">
          <div className="mf-merchant-welcome">
            <div>
              <p className="mf-merchant-eyebrow">
                PAINEL DO COMERCIANTE
              </p>

              <h1>
                {loja?.configurada
                  ? `Bem-vindo à ${loja.nome}`
                  : "Configure a sua loja"}
              </h1>

              <p>
                {loja?.configurada
                  ? "Atualize os dados da sua loja ou aceda ao dashboard para gerir o seu negócio."
                  : "Preencha os dados da sua loja para começar a vender no Mercado Fresko."}
              </p>
            </div>

            <div className="mf-merchant-welcome-icon">
              <Store size={34} />
            </div>
          </div>

          {erro && (
            <div
              className="mf-merchant-alert mf-merchant-alert-error"
              role="alert"
            >
              <AlertCircle size={20} />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div
              className="mf-merchant-alert mf-merchant-alert-success"
              role="status"
            >
              <CheckCircle2 size={20} />
              <span>{sucesso}</span>
            </div>
          )}

          {!loja?.configurada || mostrarFormulario ? (
            <section className="mf-merchant-card">
              <div className="mf-merchant-card-heading">
                <div>
                  <h2>
                    {loja?.configurada
                      ? "Editar informações da loja"
                      : "Dados da loja"}
                  </h2>

                  <p>
                    Preencha os campos abaixo. O logótipo é opcional.
                  </p>
                </div>

                {loja?.configurada && (
                  <button
                    type="button"
                    className="mf-merchant-secondary-button"
                    onClick={cancelarEdicao}
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <form
                className="mf-merchant-form"
                onSubmit={guardarLoja}
              >
                <div className="mf-merchant-logo-field">
                  <label htmlFor="logoLoja">
                    Logótipo da loja{" "}
                    <span className="mf-merchant-optional">
                      (opcional)
                    </span>
                  </label>

                  <p>
                    Escolha uma imagem JPG, PNG ou WEBP, até 5 MB.
                  </p>

                  <div className="mf-merchant-logo-row">
                    <label
                      htmlFor="logoLoja"
                      className="mf-merchant-logo-upload"
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Pré-visualização do logótipo"
                          className="mf-merchant-logo-preview"
                        />
                      ) : (
                        <span className="mf-merchant-logo-placeholder">
                          <ImagePlus size={30} />
                          <span>Adicionar logótipo</span>
                        </span>
                      )}
                    </label>

                    <div className="mf-merchant-logo-actions">
                      <label
                        htmlFor="logoLoja"
                        className="mf-merchant-select-logo"
                      >
                        <ImagePlus size={16} />

                        {logoPreview
                          ? "Escolher outra imagem"
                          : "Selecionar imagem"}
                      </label>

                      {logoArquivo && (
                        <button
                          type="button"
                          className="mf-merchant-remove-logo"
                          onClick={removerLogoSelecionado}
                        >
                          Remover seleção
                        </button>
                      )}

                      {loja?.logoUrl && !logoArquivo && !logoRemovido && (
                        <button
                          type="button"
                          className="mf-merchant-remove-logo"
                          onClick={removerLogoLoja}
                        >
                          Remover logótipo da loja
                        </button>
                      )}

                      {logoRemovido && (
                        <button
                          type="button"
                          className="mf-merchant-select-logo"
                          onClick={restaurarLogoLoja}
                        >
                          Manter logótipo atual
                        </button>
                      )}

                      {logoRemovido && (
                        <span className="mf-merchant-logo-help">
                          O logótipo será removido da loja ao guardar.
                        </span>
                      )}

                      <span className="mf-merchant-logo-help">
                        Pode continuar sem adicionar uma imagem.
                      </span>
                    </div>
                  </div>

                  <input
                    id="logoLoja"
                    name="logoLoja"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={selecionarLogo}
                  />
                </div>

                <div className="mf-merchant-form-group">
                  <label htmlFor="nome">Nome da loja *</label>

                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    value={formulario.nome}
                    onChange={atualizarCampo}
                    placeholder="Ex.: Mini Mercado Fresko"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="mf-merchant-form-group">
                  <label htmlFor="descricao">
                    Descrição da loja
                  </label>

                  <textarea
                    id="descricao"
                    name="descricao"
                    value={formulario.descricao}
                    onChange={atualizarCampo}
                    placeholder="Descreva a loja e os produtos que vende."
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                <div className="mf-merchant-form-group">
                  <label htmlFor="telefone">
                    Telefone de contacto *
                  </label>

                  <input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    value={formulario.telefone}
                    onChange={atualizarCampo}
                    placeholder="Ex.: 923 000 000"
                    maxLength={30}
                    required
                  />
                </div>

                <div className="mf-merchant-form-group">
                  <label htmlFor="provincia">Província *</label>

                  <select
                    id="provincia"
                    name="provincia"
                    value={formulario.provincia}
                    onChange={atualizarCampo}
                    required
                  >
                    <option value="Bengo">Bengo</option>
                    <option value="Benguela">Benguela</option>
                    <option value="Bié">Bié</option>
                    <option value="Cabinda">Cabinda</option>
                    <option value="Cuando">Cuando</option>
                    <option value="Cuanza Norte">Cuanza Norte</option>
                    <option value="Cuanza Sul">Cuanza Sul</option>
                    <option value="Cunene">Cunene</option>
                    <option value="Cubango">Cubango</option>
                    <option value="Huambo">Huambo</option>
                    <option value="Huíla">Huíla</option>
                    <option value="Icolo e Bengo">Icolo e Bengo</option>
                    <option value="Luanda">Luanda</option>
                    <option value="Lunda Norte">Lunda Norte</option>
                    <option value="Lunda Sul">Lunda Sul</option>
                    <option value="Malanje">Malanje</option>
                    <option value="Moxico">Moxico</option>
                    <option value="Moxico Leste">Moxico Leste</option>
                    <option value="Namibe">Namibe</option>
                    <option value="Uíge">Uíge</option>
                    <option value="Zaire">Zaire</option>
                  </select>
                </div>

                <div className="mf-merchant-form-group">
                  <label htmlFor="municipio">Município *</label>

                  <input
                    id="municipio"
                    name="municipio"
                    type="text"
                    value={formulario.municipio}
                    onChange={atualizarCampo}
                    placeholder="Introduza o município"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="mf-merchant-form-group">
                  <label htmlFor="endereco">
                    Bairro ou endereço
                  </label>

                  <input
                    id="endereco"
                    name="endereco"
                    type="text"
                    value={formulario.endereco}
                    onChange={atualizarCampo}
                    placeholder="Ex.: bairro, rua..."
                    maxLength={200}
                  />
                </div>

                <div className="mf-merchant-form-actions">
                  <button
                    type="submit"
                    className="mf-merchant-primary-button"
                    disabled={aGuardar}
                  >
                    {aGuardar ? (
                      <>
                        <LoaderCircle
                          size={18}
                          className="mf-spin"
                        />
                        A guardar...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Guardar loja
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="mf-merchant-card">
              <div className="mf-merchant-store-heading">
                <div className="mf-merchant-store-logo">
                  {loja.logoUrl ? (
                    <img
                      src={loja.logoUrl}
                      alt={`Logótipo de ${loja.nome}`}
                    />
                  ) : (
                    <Store size={34} />
                  )}
                </div>

                <div className="mf-merchant-store-title">
                  <h2>{loja.nome}</h2>

                  <p>
                    <MapPin size={15} />

                    {[loja.municipio, loja.provincia]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <button
                  type="button"
                  className="mf-merchant-secondary-button"
                  onClick={abrirEdicao}
                >
                  <Pencil size={16} />
                  Editar loja
                </button>
              </div>

              <div className="mf-merchant-store-details">
                <div className="mf-merchant-detail">
                  <span className="mf-merchant-detail-label">
                    <Phone size={16} />
                    Telefone
                  </span>

                  <strong>
                    {loja.telefone || "Não indicado"}
                  </strong>
                </div>

                <div className="mf-merchant-detail">
                  <span className="mf-merchant-detail-label">
                    <MapPin size={16} />
                    Endereço
                  </span>

                  <strong>
                    {loja.endereco || "Não indicado"}
                  </strong>
                </div>

                <div className="mf-merchant-detail mf-merchant-detail-full">
                  <span className="mf-merchant-detail-label">
                    Descrição
                  </span>

                  <p>
                    {loja.descricao ||
                      "Ainda não adicionou uma descrição."}
                  </p>
                </div>
              </div>

              <div className="mf-merchant-dashboard-actions">
                <Link
                  to="/comerciantes/dashboard"
                  className="mf-merchant-primary-button"
                >
                  <Store size={18} />
                  Abrir dashboard
                </Link>

                <Link
                  to="/"
                  className="mf-merchant-secondary-button"
                >
                  <ExternalLink size={17} />
                  Ver página inicial
                </Link>
              </div>
            </section>
          )}

          <footer className="mf-merchant-footer">
            <p>
              Mercado Fresko · A sua loja, mais perto dos seus clientes.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}