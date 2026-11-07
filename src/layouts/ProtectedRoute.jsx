import { useEffect, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({
  tipo,
  requireStore = true,
  children,
}) {
  const [estado, setEstado] = useState({
    carregando: true,
    autorizado: false,
    redirecionar: "",
    erro: "",
  });

  useEffect(() => {
    let ativo = true;
    let sequenciaAuth = 0;
    let cancelarAuth = () => {};

    Promise.all([
      import("../firebase/config"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ])
      .then(([{ auth, db }, { onAuthStateChanged }, { doc, getDoc }]) => {
        if (!ativo) return;

        cancelarAuth = onAuthStateChanged(auth, async (utilizador) => {
          if (!ativo) return;
          const sequenciaAtual = ++sequenciaAuth;

          if (!utilizador) {
            setEstado({
              carregando: false,
              autorizado: false,
              redirecionar: "/login",
              erro: "",
            });
            return;
          }

          try {
            const perfilSnap = await getDoc(
              doc(db, "usuarios", utilizador.uid)
            );

            if (!ativo || sequenciaAtual !== sequenciaAuth) return;

            if (!perfilSnap.exists() || perfilSnap.data().tipo !== tipo) {
              setEstado({
                carregando: false,
                autorizado: false,
                redirecionar: tipo === "cliente" ? "/" : "/cliente",
                erro: "",
              });
              return;
            }

            if (tipo === "comerciante" && requireStore) {
              const lojaSnap = await getDoc(doc(db, "lojas", utilizador.uid));

              if (!ativo || sequenciaAtual !== sequenciaAuth) return;

              if (!lojaSnap.exists() || !lojaSnap.data().configurada) {
                setEstado({
                  carregando: false,
                  autorizado: false,
                  redirecionar: "/comerciantes/home",
                  erro: "",
                });
                return;
              }
            }

            setEstado({
              carregando: false,
              autorizado: true,
              redirecionar: "",
              erro: "",
            });
          } catch (error) {
            console.error("Não foi possível validar o acesso à conta:", error);
            if (ativo && sequenciaAtual === sequenciaAuth) {
              setEstado({
                carregando: false,
                autorizado: false,
                redirecionar: "",
                erro: "Não foi possível validar a sua conta. Verifique a ligação e tente novamente.",
              });
            }
          }
        });
      })
      .catch((error) => {
        console.error("Não foi possível iniciar a validação da conta:", error);
        if (ativo) {
          setEstado({
            carregando: false,
            autorizado: false,
            redirecionar: "",
            erro: "Não foi possível iniciar os serviços de autenticação. Tente novamente.",
          });
        }
      });

    return () => {
      ativo = false;
      cancelarAuth();
    };
  }, [tipo, requireStore]);

  if (estado.carregando) {
    return (
      <main className="mf-route-loading" role="status" aria-live="polite">
        <span className="mf-route-spinner" />
        <p>A validar o acesso à sua conta...</p>
      </main>
    );
  }

  if (estado.redirecionar) {
    return <Navigate to={estado.redirecionar} replace />;
  }

  if (estado.erro) {
    return (
      <main className="mf-route-error">
        <h1>Não foi possível abrir esta área</h1>
        <p role="alert">{estado.erro}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
        <Link to="/">Voltar ao início</Link>
      </main>
    );
  }

  return estado.autorizado ? children || <Outlet /> : null;
}
