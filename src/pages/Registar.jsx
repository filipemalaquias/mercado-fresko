
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import {
  UserRound,
  Store,
  Eye,
  EyeOff,
  ArrowRight
} from "lucide-react";
import "../styles/registar.css";

export default function Registar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    nome: "",
    tipo: searchParams.get("tipo") === "comerciante" ? "comerciante" : "cliente",
    negocio: "",
    nif: "",
    telefone: "",
    email: "",
    password: "",
    confirmarPassword: ""
  });

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function alterarCampo(e) {
    const { name, value } = e.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: value
    }));
  }

  async function registar(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    const nome = form.nome.trim();
    const email = form.email.trim().toLowerCase();
    const telefone = form.telefone.replace(/\D/g, "");
    const negocio = form.negocio.trim();
    const nif = form.nif.trim().toUpperCase();

    if (!nome || !email || !telefone || !form.password) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!/^9\d{8}$/.test(telefone)) {
      setErro("Introduza um número angolano válido com 9 dígitos.");
      return;
    }

    if (form.password.length < 8) {
      setErro("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (form.password !== form.confirmarPassword) {
      setErro("As palavras-passe não coincidem.");
      return;
    }

    if (
      form.tipo === "comerciante" &&
      (!negocio || !nif)
    ) {
      setErro("Indique o nome do negócio e o NIF.");
      return;
    }

    setCarregando(true);

    let utilizadorCriado = null;

    try {
      const credencial = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password
      );

      utilizadorCriado = credencial.user;

      await updateProfile(utilizadorCriado, {
        displayName: nome
      });

      const perfil = {
        uid: utilizadorCriado.uid,
        nome,
        email,
        telefone: `+244${telefone}`,
        tipo: form.tipo,
        criadoEm: serverTimestamp()
      };

      if (form.tipo === "comerciante") {
        perfil.negocio = negocio;
        perfil.nif = nif;
        perfil.estadoComerciante = "pendente";
      }

      await setDoc(
        doc(db, "usuarios", utilizadorCriado.uid),
        perfil
      );

      setSucesso("Conta criada com sucesso!");

      navigate(form.tipo === "comerciante" ? "/comerciante" : "/cliente", {
        replace: true,
      });
    } catch (error) {
      console.error("Erro no registo:", error);

      if (utilizadorCriado) {
        setErro(
          "A conta de autenticação foi criada, mas não foi possível guardar o perfil. Contacte o suporte antes de tentar registar novamente."
        );
      } else {
        switch (error.code) {
          case "auth/email-already-in-use":
            setErro("Este email já está associado a uma conta.");
            break;
          case "auth/invalid-email":
            setErro("O endereço de email não é válido.");
            break;
          case "auth/weak-password":
            setErro("Escolha uma palavra-passe mais segura.");
            break;
          case "auth/operation-not-allowed":
            setErro(
              "Active o método Email/Palavra-passe no Firebase Authentication."
            );
            break;
          default:
            setErro(
              "Não foi possível criar a conta. Verifique a ligação e as configurações do Firebase."
            );
        }
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mf-register-page">
      <section className="mf-register-container">
        <div className="mf-register-panel">
          <Link to="/" className="mf-register-logo">
            Mercado Fresko
          </Link>

          <div className="mf-register-intro">
            <span className="mf-register-eyebrow">
              Faça parte do nosso mercado
            </span>

            <h1>Produtos frescos, oportunidades para todos.</h1>

            <p>
              Crie a sua conta para descobrir produtos locais
              ou começar a vender no Mercado Fresko.
            </p>
          </div>
        </div>

        <div className="mf-register-form-container">
          <div className="mf-register-heading">
            <h2>Criar conta</h2>
            <p>Preencha os seus dados para começar.</p>
          </div>

          {erro && (
            <div className="mf-register-message mf-register-error" role="alert">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mf-register-message mf-register-success" role="status">
              {sucesso}
            </div>
          )}

          <form onSubmit={registar} className="mf-register-form">

            <label>Tipo de conta *</label>
            <div className="mf-register-types">
              <button
                type="button"
                className={`mf-register-type ${
                  form.tipo === "cliente" ? "active" : ""
                }`}
                onClick={() =>
                  setForm((f) => ({ ...f, tipo: "cliente" }))
                }
                aria-pressed={form.tipo === "cliente"}
              >
                <UserRound size={20} />
                <span>Cliente</span>
                <small>Comprar produtos</small>
              </button>

              <button
                type="button"
                className={`mf-register-type ${
                  form.tipo === "comerciante" ? "active" : ""
                }`}
                onClick={() =>
                  setForm((f) => ({ ...f, tipo: "comerciante" }))
                }
                aria-pressed={form.tipo === "comerciante"}
              >
                <Store size={20} />
                <span>Comerciante</span>
                <small>Vender produtos</small>
              </button>
            </div>

            <label htmlFor="nome">Nome completo *</label>
            <input
              id="nome"
              name="nome"
              value={form.nome}
              onChange={alterarCampo}
              placeholder="O seu nome completo"
              autoComplete="name"
              maxLength={120}
              required
            />

            

            {form.tipo === "comerciante" && (
              <div className="mf-register-business-fields">
                <label htmlFor="negocio">Nome do negócio *</label>
                <input
                  id="negocio"
                  name="negocio"
                  value={form.negocio}
                  onChange={alterarCampo}
                  placeholder="Nome da empresa ou negócio"
                  maxLength={150}
                  required
                />

                <label htmlFor="nif">NIF *</label>
                <input
                  id="nif"
                  name="nif"
                  value={form.nif}
                  onChange={alterarCampo}
                  placeholder="Número de identificação fiscal"
                  maxLength={40}
                  required
                />
              </div>
            )}

            <label htmlFor="telefone">Telefone angolano *</label>
            <div className="mf-register-phone">
              <span>+244</span>
              <input
                id="telefone"
                name="telefone"
                value={form.telefone}
                onChange={(e) => {
                  const valor = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 9);

                  setForm((f) => ({ ...f, telefone: valor }));
                }}
                placeholder="923456789"
                inputMode="numeric"
                autoComplete="tel-national"
                required
              />
            </div>

            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={alterarCampo}
              placeholder="exemplo@email.com"
              autoComplete="email"
              required
            />

            <label htmlFor="password">Palavra-passe *</label>
            <div className="mf-register-password">
              <input
                id="password"
                name="password"
                type={mostrarPassword ? "text" : "password"}
                value={form.password}
                onChange={alterarCampo}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                aria-label={
                  mostrarPassword
                    ? "Ocultar palavra-passe"
                    : "Mostrar palavra-passe"
                }
              >
                {mostrarPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <label htmlFor="confirmarPassword">
              Confirmar palavra-passe *
            </label>
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type={mostrarPassword ? "text" : "password"}
              value={form.confirmarPassword}
              onChange={alterarCampo}
              placeholder="Repita a palavra-passe"
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              className="mf-register-submit"
              disabled={carregando}
            >
              {carregando ? "A criar conta..." : "Criar conta"}
              {!carregando && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="mf-register-login-link">
            Já tem uma conta? <Link to="/login">Inicie sessão</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
