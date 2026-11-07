import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CarrinhoContext = createContext(null);

const STORAGE_KEY = "mf_carrinho_v1";

export function CarrinhoProvider({ children }) {
    const [itens, setItens] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    // Persistir sempre que o carrinho muda
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
        } catch {
            /* ignora */
        }
    }, [itens]);

    const adicionar = (produto, quantidade = 1) => {
        if (!produto?.id) return;

        const stock = Number(produto.quantidade) || 0;
        const qtd = Math.max(1, Number(quantidade) || 1);

        setItens((atuais) => {
            const existente = atuais.find((i) => i.id === produto.id);

            if (existente) {
                const novaQtd = Math.min(existente.quantidade + qtd, stock);
                return atuais.map((i) =>
                    i.id === produto.id ? { ...i, quantidade: novaQtd } : i
                );
            }

            return [
                ...atuais,
                {
                    id: produto.id,
                    nome: produto.nome || "Produto",
                    preco: Number(produto.preco) || 0,
                    unidade: produto.unidade || "unidade",
                    imagemUrl: produto.imagemUrl || "",
                    lojaNome: produto.lojaNome || "Comércio local",
                    comercianteId: produto.comercianteId || null,
                    quantidade: Math.min(qtd, stock),
                    stock,
                },
            ];
        });
    };

    const remover = (id) => {
        setItens((atuais) => atuais.filter((i) => i.id !== id));
    };

    const atualizarQuantidade = (id, quantidade) => {
        setItens((atuais) =>
            atuais.map((i) => {
                if (i.id !== id) return i;
                const q = Math.max(1, Math.min(Number(quantidade) || 1, i.stock || 1));
                return { ...i, quantidade: q };
            })
        );
    };

    const limpar = () => setItens([]);

    const totalItens = useMemo(
        () => itens.reduce((acc, i) => acc + i.quantidade, 0),
        [itens]
    );

    const subtotal = useMemo(
        () => itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0),
        [itens]
    );

    const value = useMemo(
        () => ({
            itens,
            totalItens,
            subtotal,
            adicionar,
            remover,
            atualizarQuantidade,
            limpar,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [itens, totalItens, subtotal]
    );

    return (
        <CarrinhoContext.Provider value={value}>
            {children}
        </CarrinhoContext.Provider>
    );
}

export function useCarrinho() {
    const ctx = useContext(CarrinhoContext);
    if (!ctx) {
        throw new Error("useCarrinho deve ser usado dentro de <CarrinhoProvider>");
    }
    return ctx;
}