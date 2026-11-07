
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    Eye,
    EyeOff,
    ArrowLeft,
    Leaf,
    Mail,
    LockKeyhole,
    ArrowRight,
    ShieldCheck,
} from "lucide-react";

import { auth, db } from "../firebase/config";
import "../styles/login.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [recuperando, setRecuperando] = useState(false);

    const emailNormalizado = email.trim().toLowerCase();

    function limparMensagens() {
        setErro("");
        setSucesso("");
    }

    function mensagemErroLogin(error) {
        switch (error?.code) {
            case "auth/invalid-credential":
            case "auth/user-not-found":
            case "auth/wrong-password":
            case "auth/invalid-email":
            case "auth/invalid-login-credentials":
                return "E-mail ou palavra-passe incorrectos.";

            case "auth/too-many-requests":
                return "Demasiadas tentativas. Aguarde um pouco antes de tentar novamente.";

            case "auth/network-request-failed":
                return "Não foi possível estabelecer ligação. Verifique a sua Internet.";

            case "auth/user-disabled":
                return "Esta conta encontra-se desactivada. Contacte o suporte.";

            case "permission-denied":
            case "firestore/permission-denied":
                return "Não foi possível consultar o perfil. Verifique as permissões do Firestore.";

            default:
                return "Não foi possível iniciar a sessão. Tente novamente.";
        }
    }

    async function terminarSessao() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(
                "Erro ao terminar sessão:",
                error?.code || "erro desconhecido"
            );
        }
    }

    async function handleLogin(event) {
        event.preventDefault();

        if (carregando || recuperando) return;

        limparMensagens();

        if (!emailNormalizado || !password) {
            setErro("Preencha o e-mail e a palavra-passe.");
            return;
        }

        setCarregando(true);

        let autenticado = false;

        try {
            // 1. Autenticar o utilizador no Firebase Authentication.
            const credencial = await signInWithEmailAndPassword(
                auth,
                emailNormalizado,
                password
            );

            autenticado = true;

            // 2. Consultar o perfil do utilizador no Firestore.
            const perfilRef = doc(
                db,
                "usuarios",
                credencial.user.uid
            );

            const perfilSnap = await getDoc(perfilRef);

            if (!perfilSnap.exists()) {
                await terminarSessao();
                autenticado = false;

                setErro(
                    "O perfil desta conta não foi encontrado. Contacte o suporte."
                );
                return;
            }

            const dados = perfilSnap.data();

            // Compatibilidade com diferentes estruturas do documento.
            const tipoConta =
                dados?.perfil?.tipo ??
                dados?.tipo ??
                dados?.tipoConta;

            // 3. Permitir apenas destinos definidos pela aplicação.
            const destinos = {
                cliente: "/cliente",
                comerciante: "/comerciantes/dashboard",
                empresa: "/comerciantes/dashboard",
            };

            const destino = destinos[tipoConta];

            if (!destino) {
                await terminarSessao();
                autenticado = false;

                setErro(
                    "O tipo de conta não é válido. Contacte o suporte."
                );
                return;
            }

            // 4. Encaminhar para a página correspondente.
            navigate(destino, { replace: true });
        } catch (error) {
            console.error(
                "Falha no login:",
                error?.code || "erro desconhecido"
            );

            // Se o login ocorreu mas a validação do perfil falhou,
            // terminar a sessão para evitar manter uma sessão parcial.
            if (autenticado) {
                await terminarSessao();
            }

            setErro(mensagemErroLogin(error));
        } finally {
            setCarregando(false);
        }
    }

    async function recuperarPassword() {
        if (recuperando || carregando) return;

        limparMensagens();

        if (!emailNormalizado) {
            setErro(
                "Introduza o seu e-mail para recuperar a palavra-passe."
            );
            return;
        }

        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoEmail.test(emailNormalizado)) {
            setErro("Introduza um endereço de e-mail válido.");
            return;
        }

        setRecuperando(true);

        try {
            await sendPasswordResetEmail(auth, emailNormalizado);

            setSucesso(
                "Se existir uma conta associada a este e-mail, receberá instruções para redefinir a palavra-passe."
            );
        } catch (error) {
            console.error(
                "Erro na recuperação:",
                error?.code || "erro desconhecido"
            );

            if (error?.code === "auth/too-many-requests") {
                setErro(
                    "Foram feitos demasiados pedidos. Aguarde um pouco e tente novamente."
                );
            } else if (
                error?.code === "auth/network-request-failed"
            ) {
                setErro(
                    "Verifique a sua ligação à Internet e tente novamente."
                );
            } else if (error?.code === "auth/invalid-email") {
                setErro("Introduza um endereço de e-mail válido.");
            } else {
                setErro(
                    "Não foi possível processar o pedido. Tente novamente mais tarde."
                );
            }
        } finally {
            setRecuperando(false);
        }
    }

    return (
        <main className="mf-login-page">
            <section
                className="mf-login-visual"
                aria-label="Apresentação do Mercado Fresko"
            >
                <div className="mf-login-visual-overlay" />

                <Link
                    to="/"
                    className="mf-login-brand"
                    aria-label="Mercado Fresko - página inicial"
                >
                    <span className="mf-login-brand-icon">
                        <Leaf size={24} aria-hidden="true" />
                    </span>

                    <span>
                        <strong>Mercado Fresko</strong>
                        <small>Do produtor até si</small>
                    </span>
                </Link>

                <div className="mf-login-visual-content">
                    <span className="mf-login-eyebrow">
                        FRESCURA QUE SE SENTE
                    </span>

                    <h1>
                        Os melhores produtos,
                        <br />
                        <span>mais perto de si.</span>
                    </h1>

                    <p>
                        Descubra produtos frescos, valorize os
                        produtores locais e encontre tudo o que
                        precisa num só lugar.
                    </p>

                    <div className="mf-login-trust">
                        <ShieldCheck size={19} aria-hidden="true" />
                        <span>
                            Uma experiência simples e segura.
                        </span>
                    </div>
                </div>

                <div className="mf-login-image-caption">
                    Produtos locais. Mais frescura. Mais proximidade.
                </div>
            </section>

            <section className="mf-login-form-side">
                <Link to="/" className="mf-login-back">
                    <ArrowLeft size={17} aria-hidden="true" />
                    Voltar à página inicial
                </Link>

                <div className="mf-login-form-container">
                    <div className="mf-login-mobile-brand">
                        <span className="mf-login-brand-icon">
                            <Leaf size={22} aria-hidden="true" />
                        </span>

                        <strong>Mercado Fresko</strong>
                    </div>

                    <div className="mf-login-heading">
                        <span className="mf-login-welcome">
                            BEM-VINDO DE VOLTA
                        </span>

                        <h2>Inicie a sua sessão</h2>

                        <p>
                            Entre na sua conta para continuar a
                            explorar o Mercado Fresko.
                        </p>
                    </div>

                    <form
                        onSubmit={handleLogin}
                        className="mf-login-form"
                        noValidate
                    >
                        <div className="mf-login-field">
                            <label htmlFor="email">
                                Endereço de e-mail
                            </label>

                            <div className="mf-login-input-wrap">
                                <Mail size={19} aria-hidden="true" />

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="exemplo@email.com"
                                    value={email}
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        limparMensagens();
                                    }}
                                    autoComplete="username"
                                    inputMode="email"
                                    maxLength={254}
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    required
                                    disabled={carregando || recuperando}
                                    aria-invalid={Boolean(erro)}
                                    aria-describedby={
                                        erro ? "mf-login-error" : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="mf-login-field">
                            <div className="mf-login-password-label">
                                <label htmlFor="password">
                                    Palavra-passe
                                </label>

                                <button
                                    type="button"
                                    className="mf-login-forgot"
                                    onClick={recuperarPassword}
                                    disabled={recuperando || carregando}
                                >
                                    {recuperando
                                        ? "A processar..."
                                        : "Esqueceu-se?"}
                                </button>
                            </div>

                            <div className="mf-login-input-wrap">
                                <LockKeyhole
                                    size={19}
                                    aria-hidden="true"
                                />

                                <input
                                    id="password"
                                    name="password"
                                    type={
                                        mostrarPassword ? "text" : "password"
                                    }
                                    placeholder="Introduza a sua palavra-passe"
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(event.target.value);
                                        limparMensagens();
                                    }}
                                    autoComplete="current-password"
                                    required
                                    disabled={carregando || recuperando}
                                    aria-invalid={Boolean(erro)}
                                    aria-describedby={
                                        erro ? "mf-login-error" : undefined
                                    }
                                />

                                <button
                                    type="button"
                                    className="mf-login-toggle-password"
                                    onClick={() =>
                                        setMostrarPassword((anterior) => !anterior)
                                    }
                                    aria-label={
                                        mostrarPassword
                                            ? "Ocultar palavra-passe"
                                            : "Mostrar palavra-passe"
                                    }
                                    aria-pressed={mostrarPassword}
                                    disabled={carregando || recuperando}
                                >
                                    {mostrarPassword ? (
                                        <EyeOff size={19} aria-hidden="true" />
                                    ) : (
                                        <Eye size={19} aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {erro && (
                            <div
                                id="mf-login-error"
                                className="mf-login-message mf-login-error"
                                role="alert"
                                aria-live="assertive"
                            >
                                {erro}
                            </div>
                        )}

                        {sucesso && (
                            <div
                                className="mf-login-message mf-login-success"
                                role="status"
                                aria-live="polite"
                            >
                                {sucesso}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="mf-login-submit"
                            disabled={carregando || recuperando}
                        >
                            <span>
                                {carregando
                                    ? "A validar a sua conta..."
                                    : "Iniciar sessão"}
                            </span>

                            {!carregando && (
                                <ArrowRight size={19} aria-hidden="true" />
                            )}
                        </button>
                    </form>

                    <div className="mf-login-register">
                        Ainda não tem uma conta?{" "}
                        <Link to="/registar">Criar conta</Link>
                    </div>

                    <div className="mf-login-security">
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span>
                            Os seus dados são tratados com segurança.
                        </span>
                    </div>
                </div>

                <footer className="mf-login-footer">
                    <span>
                        © {new Date().getFullYear()} Mercado Fresko
                    </span>

                    <Link to="/sobre">
                        Sobre o Mercado Fresko
                    </Link>

                    <Link to="/registar">Criar conta</Link>
                </footer>
            </section>
        </main>
    );
}

export default Login;
