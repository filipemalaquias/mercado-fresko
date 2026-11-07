import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom"; 
import ProtectedRoute from "./layouts/ProtectedRoute";
import { CarrinhoProvider } from "./context/CarrinhoContext";

// Páginas públicas
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Parceiros = lazy(() => import("./pages/Parceiros"));
const Registar = lazy(() => import("./pages/Registar"));
const Carrinho = lazy(() => import("./pages/Carrinho")); 

// Páginas públicas de detalhe
const ProdutoDetalhe = lazy(() => import("./pages/ProdutoDetalhe"));
const ComercianteDetalhe = lazy(() => import("./pages/ComercianteDetalhe"));

// Páginas do cliente
const ClienteHome = lazy(() => import("./pages/Clientes/ClienteHome"));
const ClienteProdutos = lazy(() => import("./pages/Clientes/ClienteProdutos"));
const ClientePedidos = lazy(() => import("./pages/Clientes/Pedidos"));
const ClientePerfil = lazy(() => import("./pages/Clientes/Perfil"));
const ClienteFavoritos = lazy(() => import("./pages/Clientes/Favoritos"));
const ClienteAjuda = lazy(() => import("./pages/Clientes/Ajuda"));
const ClienteLojas = lazy(() => import("./pages/Clientes/ClienteLojas"));
const ClienteAfiliado = lazy(() => import("./pages/Clientes/Afiliado"));
const FinalizarEncomenda = lazy(() => import("./pages/Clientes/FinalizarEncomenda"));

// Páginas do comerciante
const ComercianteHome = lazy(() => import("./pages/Comerciantes/Home"));
const ComercianteDashboard = lazy(() => import("./pages/Comerciantes/dashboard"));
const ProdutosComerciante = lazy(() => import("./pages/Comerciantes/produtos"));
const StockComerciante = lazy(() => import("./pages/Comerciantes/stock"));
const EncomendasComerciante = lazy(() => import("./pages/Comerciantes/encomendas"));

function RouteLoading() {
  return (
    <main
      className="mf-route-loading"
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "16px",
        color: "#123a4a",
      }}
    >
      <span
        className="mf-route-spinner"
        style={{
          width: "40px",
          height: "40px",
          border: "4px solid #eef0ec",
          borderTopColor: "#123a4a",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <p style={{ fontWeight: 600 }}>A preparar o Mercado Fresko...</p>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

function App() {
  return (
    <CarrinhoProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* ================= PÁGINAS PÚBLICAS ================= */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/parceiros" element={<Parceiros />} />
            <Route path="/registar" element={<Registar />} />
            
            {/* ROTA DO CARRINHO PROTEGIDA */}
            <Route
              path="/carrinho"
              element={
                <ProtectedRoute tipo="cliente">
                  <Carrinho />
                </ProtectedRoute>
              }
            />

            {/* ================= DETALHES PÚBLICOS ================= */}
            <Route path="/produto/:id" element={<ProdutoDetalhe />} />
            <Route path="/comerciante/:id" element={<ComercianteDetalhe />} />

            {/* ================= ÁREA DO CLIENTE ================= */}
            <Route
              path="/cliente"
              element={
                <ProtectedRoute tipo="cliente">
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClienteHome />} />
              <Route path="produtos" element={<ClienteProdutos />} />
              <Route path="pedidos" element={<ClientePedidos />} />
              <Route path="perfil" element={<ClientePerfil />} />
              <Route path="favoritos" element={<ClienteFavoritos />} />
              <Route path="ajuda" element={<ClienteAjuda />} />
              <Route path="lojas" element={<ClienteLojas />} />
              <Route path="afiliado" element={<ClienteAfiliado />} />
              <Route path="carrinho" element={<Navigate to="/carrinho" replace />} />
              <Route path="finalizar-encomenda" element={<FinalizarEncomenda />} />
            </Route>

            {/* ================= ÁREA DO COMERCIANTE ================= */}
            <Route
              path="/comerciante"
              element={
                <ProtectedRoute tipo="comerciante">
                  <ComercianteHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comerciantes/home"
              element={
                <ProtectedRoute tipo="comerciante">
                  <ComercianteHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comerciantes/configuracoes"
              element={
                <ProtectedRoute tipo="comerciante">
                  <ComercianteHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comerciantes/dashboard"
              element={
                <ProtectedRoute tipo="comerciante">
                  <ComercianteDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comerciantes/produtos"
              element={
                <ProtectedRoute tipo="comerciante">
                  <ProdutosComerciante />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comerciantes/encomendas"
              element={
                <ProtectedRoute tipo="comerciante">
                  <EncomendasComerciante />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comerciantes/stock"
              element={
                <ProtectedRoute tipo="comerciante">
                  <StockComerciante />
                </ProtectedRoute>
              }
            />

            {/* ================= 404 ================= */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CarrinhoProvider>
  );
}

export default App;