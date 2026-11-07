import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { CheckCircle2, CircleUserRound, LoaderCircle, Save } from "lucide-react";
import { auth, db, functions } from "../../firebase/config";

export default function ClientePerfil() {
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    let ativo = true;
    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro("");
      try {
        const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (!ativo) return;
        if (!perfilSnap.exists() || perfilSnap.data().tipo !== "cliente") {
          setErro("Não foi possível encontrar o perfil de cliente desta conta.");
          return;
        }
        setPerfil(perfilSnap.data());
        setNome(perfilSnap.data().nome || "");
      } catch (error) {
        console.error("Não foi possível carregar o perfil:", error);
        if (ativo) setErro("Não foi possível carregar o seu perfil. Tente novamente.");
      } finally {
        if (ativo) setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      cancelar();
    };
  }, []);

  async function guardarPerfil(event) {
    event.preventDefault();
    const nomeAtualizado = nome.trim();
    if (!nomeAtualizado || nomeAtualizado.length > 120) {
      setErro("Introduza um nome com até 120 caracteres.");
      return;
    }

    setAGuardar(true);
    setErro("");
    setSucesso("");
    try {
      await httpsCallable(functions, "atualizarPerfilCliente")({
        nome: nomeAtualizado,
      });
      setPerfil((anterior) => ({ ...anterior, nome: nomeAtualizado }));
      setSucesso("O seu nome foi atualizado.");
    } catch (error) {
      console.error("Não foi possível atualizar o perfil:", error);
      setErro(error.message || "Não foi possível atualizar o perfil. Tente novamente.");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <main className="mf-client-content">
      <div className="mf-client-page-heading">
        <div>
          <span className="mf-client-eyebrow">A SUA CONTA</span>
          <h1>Perfil</h1>
          <p>Consulte os seus dados e mantenha o nome da conta atualizado.</p>
        </div>
        <span className="mf-client-page-heading-icon">
          <CircleUserRound size={27} />
        </span>
      </div>

      {erro && <div className="mf-client-alert" role="alert">{erro}</div>}
      {sucesso && (
        <div className="mf-client-notice" role="status">
          <CheckCircle2 size={17} /> {sucesso}
        </div>
      )}

      {carregando ? (
        <div className="mf-client-empty" role="status">
          <span className="mf-client-spinner" />
          <p>A carregar o seu perfil...</p>
        </div>
      ) : perfil ? (
        <section className="mf-client-profile-card">
          <div className="mf-client-profile-intro">
            <span className="mf-client-profile-avatar">
              {(perfil.nome || "C").charAt(0).toUpperCase()}
            </span>
            <div>
              <h2>Dados pessoais</h2>
              <p>O nome será utilizado nos próximos pedidos.</p>
            </div>
          </div>

          <form className="mf-client-profile-form" onSubmit={guardarPerfil}>
            <label htmlFor="nomeCliente">Nome completo</label>
            <input
              id="nomeCliente"
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              maxLength={120}
              autoComplete="name"
              required
            />

            <label htmlFor="emailCliente">E-mail</label>
            <input
              id="emailCliente"
              type="email"
              value={perfil.email || auth.currentUser?.email || ""}
              readOnly
            />

            <label htmlFor="telefoneCliente">Telefone</label>
            <input
              id="telefoneCliente"
              type="tel"
              value={perfil.telefone || ""}
              readOnly
            />
            <p className="mf-client-profile-note">
              O e-mail e o telefone associados à conta não podem ser alterados nesta página.
              Contacte o suporte se precisar de ajuda com esses dados.
            </p>
            <button
              type="submit"
              className="mf-client-primary-button"
              disabled={aGuardar || nome.trim() === perfil.nome}
            >
              {aGuardar ? <LoaderCircle size={17} className="mf-client-spin" /> : <Save size={17} />}
              {aGuardar ? "A guardar..." : "Guardar alterações"}
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
