
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./assets/css/global.css";
import { CarrinhoProvider } from "./context/CarrinhoContext";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <CarrinhoProvider>
            <App />
        </CarrinhoProvider>
    </StrictMode>
);
