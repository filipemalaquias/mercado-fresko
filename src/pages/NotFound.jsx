
import { Link } from "react-router-dom";

function NotFound() {
    return (
        <main>
            <h1>Página não encontrada</h1>
            <p>A página que procura não existe.</p>
            <Link to="/">Voltar ao início</Link>
        </main>
    );
}

export default NotFound;
