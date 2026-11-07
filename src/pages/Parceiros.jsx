import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    ArrowRight,
    CheckCircle2,
    LoaderCircle,
    MapPin,
    Send,
    Store,
    Users,
    ShieldCheck,
    ShoppingBag,
    TrendingUp,
    Sparkles,
} from "lucide-react";

import {
    addDoc,
    collection,
    onSnapshot,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";

import { db } from "../firebase/config";
import "../styles/parceiros.css";
import Header from "../components/Header";

const formularioInicial = {
    nomeResponsavel: "",
    nomeLoja: "",
    email: "",
    telefone: "",
    categoria: "",
    municipio: "",
    mensagem: "",
};

const categorias = [
    "Alimentação",
    "Supermercado",
    "Moda e acessórios",
    "Beleza e cuidados",
    "Casa e decoração",
    "Eletrónica",
    "Tecnologia",
    "Papelaria e livros",
    "Desporto e lazer",
    "Outros",
];

export default function Parceiros() {
    const [parceiros, setParceiros] = useState([]);
    const [carregandoParceiros, setCarregandoParceiros] = useState(true);
    const [formulario, setFormulario] = useState(formularioInicial);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [erroParceiros, setErroParceiros] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    useEffect(() => {
        let ativo = true;

        const consulta = query(
            collection(db, "lojas"),
            where("configurada", "==", true)
        );

        const cancelar = onSnapshot(
            consulta,
            (snapshot) => {
                if (!ativo) return;

                const lista = snapshot.docs.map((documento) => ({
                    id: documento.id,
                    ...documento.data(),
                }));

                setParceiros(lista);
                setErroParceiros(false);
                setCarregandoParceiros(false);
            },
            (error) => {
                console.error("Erro ao carregar parceiros:", error);

                if (!ativo) return;

                setParceiros([]);
                setErroParceiros(true);
                setCarregandoParceiros(false);
            }
        );

        return () => {
            ativo = false;
            cancelar();
        };
    }, []);

    const atualizarCampo = (event) => {
        const { name, value } = event.target;

        setFormulario((atual) => ({
            ...atual,
            [name]: value,
        }));

        if (erro) setErro("");
        if (sucesso) setSucesso(false);
    };

    const irParaFormulario = () => {
        document
            .getElementById("formulario-parceria")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
    };

    const enviarFormulario = async (event) => {
        event.preventDefault();

        setErro("");
        setSucesso(false);
        setEnviando(true);

        try {
            await addDoc(collection(db, "solicitacoes_parceria"), {
                ...formulario,
                estado: "pendente",
                origem: "site_mercado_fresko",
                criadoEm: serverTimestamp(),
            });

            setFormulario({ ...formularioInicial });
            setSucesso(true);
        } catch (error) {
            console.error(
                "Erro ao enviar pedido de parceria:",
                error
            );

            if (error.code === "permission-denied") {
                setErro(
                    "Não foi possível enviar o pedido devido às permissões do Firebase."
                );
            } else {
                setErro(
                    "Não foi possível enviar o pedido. Verifique a ligação à Internet e tente novamente."
                );
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            <Header />

            <main className="parceiros-page">
                {/* HERO */}
                <section className="parceiros-hero">
                    <div className="parceiros-container parceiros-hero-grid">
                        <div className="parceiros-hero-content">
                            <span className="parceiros-eyebrow">
                                <Sparkles size={15} />
                                A NOSSA REDE DE PARCEIROS
                            </span>

                            <h1>
                                O seu negócio
                                <br />
                                merece ser
                                <span> descoberto.</span>
                            </h1>

                            <p className="parceiros-hero-description">
                                Aproximamos comerciantes e consumidores numa
                                plataforma digital pensada para valorizar o
                                comércio local e facilitar a descoberta de
                                novos negócios.
                            </p>

                            <div className="parceiros-hero-actions">
                                <button
                                    type="button"
                                    className="parceiros-button parceiros-button-primary"
                                    onClick={irParaFormulario}
                                >
                                    Quero ser parceiro
                                    <ArrowRight size={18} />
                                </button>

                                <a
                                    href="#lista-parceiros"
                                    className="parceiros-button parceiros-button-light"
                                >
                                    Conhecer parceiros
                                </a>
                            </div>

                            <div className="parceiros-hero-note">
                                <span className="parceiros-note-icon">
                                    <Users size={17} />
                                </span>
                                <span>
                                    Juntos, damos mais visibilidade ao comércio
                                    local.
                                </span>
                            </div>
                        </div>

                        <div className="parceiros-hero-art">
                            <div className="parceiros-art-orbit parceiros-art-orbit-one" />
                            <div className="parceiros-art-orbit parceiros-art-orbit-two" />

                            <div className="parceiros-art-main">
                                <div className="parceiros-art-top">
                                    <span className="parceiros-art-logo">
                                        <Store size={27} />
                                    </span>

                                    <span className="parceiros-art-status">
                                        <span />
                                        Rede de parceiros
                                    </span>
                                </div>

                                <div className="parceiros-art-store">
                                    <div className="parceiros-store-illustration">
                                        <div className="parceiros-store-roof" />

                                        <div className="parceiros-store-awning">
                                            <span />
                                            <span />
                                            <span />
                                            <span />
                                        </div>

                                        <div className="parceiros-store-body">
                                            <div className="parceiros-store-window" />
                                            <div className="parceiros-store-door" />
                                        </div>
                                    </div>

                                    <h3>O comércio local</h3>
                                    <p>Mais perto de quem procura.</p>
                                </div>

                                <div className="parceiros-art-footer">
                                    <div className="parceiros-art-footer-icon">
                                        <CheckCircle2 size={20} />
                                    </div>

                                    <div>
                                        <strong>
                                            O seu negócio tem lugar aqui.
                                        </strong>
                                        <span>
                                            Faça parte desta comunidade.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="parceiros-floating-card parceiros-floating-top">
                                <span className="parceiros-floating-icon">
                                    <TrendingUp size={20} />
                                </span>

                                <div>
                                    <strong>Mais visibilidade</strong>
                                    <span>Para o seu negócio</span>
                                </div>
                            </div>

                            <div className="parceiros-floating-card parceiros-floating-bottom">
                                <span className="parceiros-floating-icon parceiros-floating-icon-orange">
                                    <ShoppingBag size={20} />
                                </span>

                                <div>
                                    <strong>Novas oportunidades</strong>
                                    <span>Comércio em destaque</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* INDICADORES */}
                <section className="parceiros-highlights">
                    <div className="parceiros-container parceiros-highlights-grid">
                        <div className="parceiros-highlight">
                            <span className="parceiros-highlight-icon">
                                <Store size={22} />
                            </span>

                            <div>
                                <strong>
                                    {carregandoParceiros
                                        ? "—"
                                        : parceiros.length}
                                </strong>
                                <span>
                                    {parceiros.length === 1
                                        ? "Parceiro na plataforma"
                                        : "Parceiros na plataforma"}
                                </span>
                            </div>
                        </div>

                        <div className="parceiros-highlight">
                            <span className="parceiros-highlight-icon">
                                <MapPin size={22} />
                            </span>

                            <div>
                                <strong>Local</strong>
                                <span>Valorizamos a sua região</span>
                            </div>
                        </div>

                        <div className="parceiros-highlight">
                            <span className="parceiros-highlight-icon">
                                <Users size={22} />
                            </span>

                            <div>
                                <strong>Comunidade</strong>
                                <span>Crescemos em conjunto</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* LISTA DE PARCEIROS */}
                <section
                    className="parceiros-section"
                    id="lista-parceiros"
                >
                    <div className="parceiros-container">
                        <div className="parceiros-section-heading">
                            <div>
                                <span className="parceiros-eyebrow">
                                    QUEM CAMINHA CONNOSCO
                                </span>

                                <h2>
                                    Conheça os nossos
                                    <span> parceiros.</span>
                                </h2>

                                <p>
                                    Descubra os negócios que já fazem parte da
                                    comunidade Mercado Fresko.
                                </p>
                            </div>

                            <div className="parceiros-heading-decoration">
                                <Store size={34} />
                            </div>
                        </div>

                        {carregandoParceiros ? (
                            <div className="parceiros-state">
                                <LoaderCircle
                                    className="parceiros-spin"
                                    size={32}
                                />
                                <h3>A carregar parceiros</h3>
                                <p>
                                    Estamos a preparar a lista de negócios
                                    disponíveis.
                                </p>
                            </div>
                        ) : erroParceiros ? (
                            <div className="parceiros-state">
                                <Store size={32} />
                                <h3>Não foi possível carregar os parceiros</h3>
                                <p>
                                    Verifique a ligação ao Firebase e as regras
                                    de leitura da coleção lojas.
                                </p>
                            </div>
                        ) : parceiros.length > 0 ? (
                            <div className="parceiros-grid">
                                {parceiros.map((parceiro) => {
                                    const nome =
                                        parceiro.nome ||
                                        parceiro.nomeLoja ||
                                        parceiro.nomeEmpresa ||
                                        "Comércio parceiro";

                                    const imagem =
                                        parceiro.logo ||
                                        parceiro.fotoPerfil ||
                                        parceiro.fotoCapa ||
                                        "";

                                    const categoria =
                                        parceiro.categoria ||
                                        parceiro.tipoNegocio ||
                                        "";

                                    const localizacao = [
                                        parceiro.municipio,
                                        parceiro.provincia,
                                    ]
                                        .filter(Boolean)
                                        .join(", ");

                                    return (
                                        <article
                                            className="parceiros-card"
                                            key={parceiro.id}
                                        >
                                            <div className="parceiros-card-image">
                                                {imagem ? (
                                                    <img
                                                        src={imagem}
                                                        alt={`Imagem de ${nome}`}
                                                        loading="lazy"
                                                        onError={(event) => {
                                                            event.currentTarget.style.display =
                                                                "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="parceiros-card-placeholder">
                                                        <Store size={42} />
                                                    </div>
                                                )}

                                                <span className="parceiros-card-badge">
                                                    <CheckCircle2 size={14} />
                                                    Parceiro
                                                </span>
                                            </div>

                                            <div className="parceiros-card-content">
                                                {categoria && (
                                                    <span className="parceiros-card-category">
                                                        {categoria}
                                                    </span>
                                                )}

                                                <h3>{nome}</h3>

                                                {localizacao && (
                                                    <p className="parceiros-card-location">
                                                        <MapPin size={16} />
                                                        {localizacao}
                                                    </p>
                                                )}

                                                {parceiro.descricao && (
                                                    <p className="parceiros-card-description">
                                                        {parceiro.descricao}
                                                    </p>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="parceiros-empty">
                                <div className="parceiros-empty-icon">
                                    <Store size={34} />
                                </div>

                                <span className="parceiros-eyebrow">
                                    A REDE ESTÁ A CRESCER
                                </span>

                                <h3>
                                    Seja um dos nossos primeiros parceiros.
                                </h3>

                                <p>
                                    Estamos a preparar a nossa comunidade de
                                    comerciantes. A sua loja pode ser uma das
                                    primeiras a marcar presença no Mercado
                                    Fresko.
                                </p>

                                <button
                                    type="button"
                                    className="parceiros-button parceiros-button-primary"
                                    onClick={irParaFormulario}
                                >
                                    Registar o meu negócio
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* BENEFÍCIOS */}
                <section className="parceiros-benefits-section">
                    <div className="parceiros-container parceiros-benefits-grid">
                        <div className="parceiros-benefits-copy">
                            <span className="parceiros-eyebrow">
                                PORQUÊ MERCADO FRESKO?
                            </span>

                            <h2>
                                Mais do que uma loja online.
                                <span>
                                    {" "}Uma oportunidade para crescer.
                                </span>
                            </h2>

                            <p>
                                Queremos tornar mais simples a descoberta dos
                                negócios locais e ajudar os comerciantes a
                                apresentar os seus produtos a mais pessoas.
                            </p>

                            <button
                                type="button"
                                className="parceiros-text-link"
                                onClick={irParaFormulario}
                            >
                                Faça parte da rede
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        <div className="parceiros-benefit-list">
                            <article className="parceiros-benefit">
                                <span className="parceiros-benefit-icon">
                                    <TrendingUp size={23} />
                                </span>

                                <div>
                                    <h3>Mais visibilidade</h3>
                                    <p>
                                        Apresente o seu negócio num espaço
                                        digital acessível aos consumidores.
                                    </p>
                                </div>
                            </article>

                            <article className="parceiros-benefit">
                                <span className="parceiros-benefit-icon">
                                    <Users size={23} />
                                </span>

                                <div>
                                    <h3>
                                        Mais oportunidades de descoberta
                                    </h3>
                                    <p>
                                        Facilite a descoberta da sua loja por
                                        pessoas interessadas nos seus produtos.
                                    </p>
                                </div>
                            </article>

                            <article className="parceiros-benefit">
                                <span className="parceiros-benefit-icon">
                                    <ShieldCheck size={23} />
                                </span>

                                <div>
                                    <h3>Uma presença digital organizada</h3>
                                    <p>
                                        Disponibilize informações sobre o seu
                                        negócio num só lugar.
                                    </p>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>

                {/* FORMULÁRIO */}
                <section
                    className="parceiros-form-section"
                    id="formulario-parceria"
                >
                    <div className="parceiros-container parceiros-form-grid">
                        <div className="parceiros-form-intro">
                            <span className="parceiros-eyebrow">
                                VAMOS COMEÇAR?
                            </span>

                            <h2>
                                O próximo parceiro pode ser
                                <span> você.</span>
                            </h2>

                            <p>
                                Conte-nos um pouco sobre a sua loja. Envie o seu
                                pedido e a nossa equipa poderá analisar as
                                informações e entrar em contacto consigo.
                            </p>

                            <div className="parceiros-form-promise">
                                <span>
                                    <Send size={22} />
                                </span>

                                <div>
                                    <strong>
                                        Um primeiro passo simples.
                                    </strong>
                                    <p>
                                        Preencha os dados essenciais para
                                        manifestar o seu interesse.
                                    </p>
                                </div>
                            </div>

                            <div className="parceiros-form-tip">
                                <CheckCircle2 size={18} />
                                Não precisa de ter uma grande empresa para
                                manifestar interesse.
                            </div>
                        </div>

                        <form
                            className="parceiros-form"
                            onSubmit={enviarFormulario}
                        >
                            <div className="parceiros-form-heading">
                                <div>
                                    <span>FORMULÁRIO</span>
                                    <h3>Pedido de parceria</h3>
                                </div>

                                <span className="parceiros-form-heading-icon">
                                    <Store size={23} />
                                </span>
                            </div>

                            <p className="parceiros-form-required">
                                Os campos com * são obrigatórios.
                            </p>

                            {sucesso && (
                                <div
                                    className="parceiros-feedback parceiros-feedback-success"
                                    role="status"
                                >
                                    <CheckCircle2 size={21} />
                                    <div>
                                        <strong>Pedido enviado!</strong>
                                        <p>
                                            Obrigado pelo interesse. A sua
                                            solicitação foi registada com
                                            sucesso.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {erro && (
                                <div
                                    className="parceiros-feedback parceiros-feedback-error"
                                    role="alert"
                                >
                                    {erro}
                                </div>
                            )}

                            <div className="parceiros-form-fields">
                                <label>
                                    Nome do responsável *
                                    <input
                                        type="text"
                                        name="nomeResponsavel"
                                        value={formulario.nomeResponsavel}
                                        onChange={atualizarCampo}
                                        placeholder="Nome completo"
                                        autoComplete="name"
                                        required
                                        maxLength={120}
                                    />
                                </label>

                                <label>
                                    Nome da loja ou negócio *
                                    <input
                                        type="text"
                                        name="nomeLoja"
                                        value={formulario.nomeLoja}
                                        onChange={atualizarCampo}
                                        placeholder="Nome comercial"
                                        required
                                        maxLength={150}
                                    />
                                </label>

                                <label>
                                    E-mail *
                                    <input
                                        type="email"
                                        name="email"
                                        value={formulario.email}
                                        onChange={atualizarCampo}
                                        placeholder="nome@exemplo.com"
                                        autoComplete="email"
                                        required
                                        maxLength={254}
                                    />
                                </label>

                                <label>
                                    Telefone *
                                    <input
                                        type="tel"
                                        name="telefone"
                                        value={formulario.telefone}
                                        onChange={atualizarCampo}
                                        placeholder="+244 9XX XXX XXX"
                                        autoComplete="tel"
                                        required
                                        maxLength={30}
                                    />
                                </label>

                                <label>
                                    Categoria do negócio *
                                    <select
                                        name="categoria"
                                        value={formulario.categoria}
                                        onChange={atualizarCampo}
                                        required
                                    >
                                        <option value="">
                                            Selecione uma categoria
                                        </option>

                                        {categorias.map((categoria) => (
                                            <option
                                                key={categoria}
                                                value={categoria}
                                            >
                                                {categoria}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Município *
                                    <input
                                        type="text"
                                        name="municipio"
                                        value={formulario.municipio}
                                        onChange={atualizarCampo}
                                        placeholder="Ex.: Moçâmedes"
                                        required
                                        maxLength={100}
                                    />
                                </label>

                                <label className="parceiros-field-full">
                                    Conte-nos sobre o seu negócio
                                    <textarea
                                        name="mensagem"
                                        value={formulario.mensagem}
                                        onChange={atualizarCampo}
                                        placeholder="Que produtos vende? O que gostaria de partilhar sobre a sua loja?"
                                        rows={4}
                                        maxLength={1500}
                                    />
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="parceiros-button parceiros-button-primary parceiros-submit"
                                disabled={enviando}
                            >
                                {enviando ? (
                                    <>
                                        <LoaderCircle
                                            className="parceiros-spin"
                                            size={19}
                                        />
                                        A enviar pedido...
                                    </>
                                ) : (
                                    <>
                                        Enviar pedido de parceria
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <p className="parceiros-privacy">
                                Os dados fornecidos serão utilizados para dar
                                seguimento ao seu pedido de parceria.
                            </p>
                        </form>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="parceiros-final-cta">
                    <div className="parceiros-container parceiros-final-cta-inner">
                        <div className="parceiros-final-cta-icon">
                            <Store size={28} />
                        </div>

                        <div className="parceiros-final-cta-copy">
                            <span className="parceiros-eyebrow">
                                MERCADO FRESKO
                            </span>

                            <h2>
                                O comércio local tem muito para oferecer.
                            </h2>

                            <p>
                                Conheça a nossa missão e descubra o que nos
                                inspira a aproximar negócios e consumidores.
                            </p>
                        </div>

                        <Link
                            to="/sobre"
                            className="parceiros-button parceiros-button-white"
                        >
                            Sobre nós
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </section>
            </main>
        </>
    );
}