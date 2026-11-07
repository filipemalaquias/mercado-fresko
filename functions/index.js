
// const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
// const { defineSecret } = require("firebase-functions/params"); // 👈 Adicionar
// const axios = require("axios"); // 👈 Adicionar

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");
const bcrypt = require("bcryptjs");
const { createHash } = require("crypto");




initializeApp();

const auth = getAuth();
const db = getFirestore();

function hashIndice(valor) {
  return createHash("sha256").update(valor).digest("hex");
}

function normalizarTelefone(valor) {
  return String(valor || "").replace(/[\s()-]/g, "");
}

function normalizarNif(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, "");
}

function passwordValida(valor) {
  return typeof valor === "string" &&
    valor.length >= 8 &&
    valor.length <= 72;
}

function validarEmail(valor) {
  return !valor ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

exports.finalizarRegisto = onCall(
  { region: "europe-west1", enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Confirma o telefone antes de concluir o registo."
      );
    }

    const uid = request.auth.uid;
    const telefone = normalizarTelefone(
      request.auth.token.phone_number
    );

    const dados = request.data || {};
    const nome = String(dados.nome || "").trim();
    const tipo = dados.tipo;
    const negocio = String(dados.negocio || "").trim();
    const nif = normalizarNif(dados.nif);
    const email = String(dados.email || "").trim().toLowerCase();
    const password = dados.password;

    if (!/^\+2449\d{8}$/.test(telefone)) {
      throw new HttpsError(
        "invalid-argument",
        "O telefone não é um número móvel angolano válido."
      );
    }

    if (!nome || nome.length > 120) {
      throw new HttpsError(
        "invalid-argument",
        "Introduz um nome válido."
      );
    }

    if (!["cliente", "comerciante"].includes(tipo)) {
      throw new HttpsError(
        "invalid-argument",
        "Tipo de conta inválido."
      );
    }

    if (!passwordValida(password)) {
      throw new HttpsError(
        "invalid-argument",
        "A palavra-passe deve ter entre 8 e 72 caracteres."
      );
    }

    if (!validarEmail(email)) {
      throw new HttpsError(
        "invalid-argument",
        "O endereço de e-mail não é válido."
      );
    }

    if (
      tipo === "comerciante" &&
      (!negocio || negocio.length > 150 || !nif || nif.length > 40)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "O nome do negócio e o NIF são obrigatórios."
      );
    }

    const perfilRef = db.collection("usuarios").doc(uid);
    const credRef = db.collection("credenciais").doc(uid);

    const telefoneRef = db.collection("telefoneIndex")
      .doc(hashIndice(telefone));

    const nifRef = tipo === "comerciante"
      ? db.collection("nifIndex").doc(hashIndice(nif))
      : null;

    // O hash é calculado no servidor, nunca no navegador.
    const passwordHash = await bcrypt.hash(password, 12);

    await db.runTransaction(async (tx) => {
      // Todas as leituras da transacção acontecem antes das escritas.
      const perfilExistente = await tx.get(perfilRef);
      const credExistente = await tx.get(credRef);
      const telefoneExistente = await tx.get(telefoneRef);

      if (
        perfilExistente.exists ||
        credExistente.exists ||
        telefoneExistente.exists
      ) {
        throw new HttpsError(
          "already-exists",
          "Este telefone já está registado."
        );
      }

      if (nifRef) {
        const nifExistente = await tx.get(nifRef);

        if (nifExistente.exists) {
          throw new HttpsError(
            "already-exists",
            "Este NIF já está associado a uma conta."
          );
        }
      }

      const perfil = {
        uid,
        nome,
        telefone,
        email: email || null,
        tipo,
        criadoEm: FieldValue.serverTimestamp()
      };

      if (tipo === "comerciante") {
        perfil.negocio = negocio;
        perfil.nif = nif;
        perfil.estadoComerciante = "pendente";
      }

      tx.set(perfilRef, perfil);
      tx.set(credRef, {
        passwordHash,
        atualizadoEm: FieldValue.serverTimestamp()
      });
      tx.set(telefoneRef, { uid });

      if (nifRef) {
        tx.set(nifRef, { uid });
      }
    });

    return {
      sucesso: true,
      mensagem: "Registo concluído."
    };
  }
);

exports.loginTelefone = onCall(
  { region: "europe-west1", enforceAppCheck: true },
  async (request) => {
    const telefone = normalizarTelefone(request.data?.telefone);
    const password = request.data?.password;

    if (
      !/^\+2449\d{8}$/.test(telefone) ||
      !passwordValida(password)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Telefone ou palavra-passe inválidos."
      );
    }

    const telefoneRef = db.collection("telefoneIndex")
      .doc(hashIndice(telefone));

    const telefoneDoc = await telefoneRef.get();

    if (!telefoneDoc.exists) {
      throw new HttpsError(
        "unauthenticated",
        "Telefone ou palavra-passe incorrectos."
      );
    }

    const uid = telefoneDoc.data().uid;

    const [perfilDoc, credDoc] = await Promise.all([
      db.collection("usuarios").doc(uid).get(),
      db.collection("credenciais").doc(uid).get()
    ]);

    if (!perfilDoc.exists || !credDoc.exists) {
      throw new HttpsError(
        "unauthenticated",
        "Telefone ou palavra-passe incorrectos."
      );
    }

    const hashGuardado = credDoc.data().passwordHash;
    const coincide = await bcrypt.compare(password, hashGuardado);

    if (!coincide) {
      throw new HttpsError(
        "unauthenticated",
        "Telefone ou palavra-passe incorrectos."
      );
    }

    // O Firebase Authentication cria o token de sessão.
    const token = await auth.createCustomToken(uid);

    return {
      token,
      perfil: perfilDoc.data()
    };
  }
);

exports.criarEncomenda = onCall(
  { region: "europe-west1", maxInstances: 10, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Inicie sessão para enviar um pedido."
      );
    }

    const uid = request.auth.uid;
    const itensRecebidos = request.data?.itens;

    if (
      !Array.isArray(itensRecebidos) ||
      itensRecebidos.length < 1 ||
      itensRecebidos.length > 50
    ) {
      throw new HttpsError(
        "invalid-argument",
        "O pedido deve conter entre 1 e 50 produtos."
      );
    }

    const itens = itensRecebidos.map((item) => ({
      produtoId: String(item?.produtoId || ""),
      quantidade: Number(item?.quantidade)
    }));

    if (
      itens.some((item) =>
        !/^[A-Za-z0-9_-]{1,128}$/.test(item.produtoId) ||
        !Number.isInteger(item.quantidade) ||
        item.quantidade < 1 ||
        item.quantidade > 100
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Verifique os produtos e as quantidades do pedido."
      );
    }

    if (new Set(itens.map((item) => item.produtoId)).size !== itens.length) {
      throw new HttpsError(
        "invalid-argument",
        "Remova os produtos repetidos do pedido."
      );
    }

    const perfilRef = db.collection("usuarios").doc(uid);
    const perfilSnap = await perfilRef.get();

    if (!perfilSnap.exists || perfilSnap.data().tipo !== "cliente") {
      throw new HttpsError(
        "permission-denied",
        "Apenas uma conta de cliente pode enviar pedidos."
      );
    }

    const perfil = perfilSnap.data();
    const encomendaRef = db.collection("encomendas").doc();
    const afiliadoUidRecebido = String(request.data?.afiliadoUid || "");
    const afiliadoUid =
      /^[A-Za-z0-9_-]{1,128}$/.test(afiliadoUidRecebido) &&
      afiliadoUidRecebido !== uid
        ? afiliadoUidRecebido
        : "";
    const afiliadoRef = afiliadoUid
      ? db.collection("usuarios").doc(afiliadoUid)
      : null;
    const comissaoRef = afiliadoUid
      ? db
          .collection("usuarios")
          .doc(afiliadoUid)
          .collection("comissoes")
          .doc(encomendaRef.id)
      : null;
    const produtoRefs = itens.map((item) =>
      db.collection("produtos").doc(item.produtoId)
    );

    try {
      return await db.runTransaction(async (transacao) => {
        const produtosSnapshot = [];

        for (const referencia of produtoRefs) {
          produtosSnapshot.push(await transacao.get(referencia));
        }
        const afiliadoSnap = afiliadoRef
          ? await transacao.get(afiliadoRef)
          : null;
        const afiliadoUidValido =
          afiliadoUid &&
          afiliadoSnap?.exists &&
          afiliadoSnap.data().tipo === "cliente" &&
          afiliadoSnap.data().afiliadoAtivo === true
            ? afiliadoUid
            : "";

        const produtos = produtosSnapshot.map((snapshot, index) => {
          const quantidadePedida = itens[index].quantidade;

          if (!snapshot.exists) {
            throw new HttpsError(
              "not-found",
              "Um dos produtos já não está disponível."
            );
          }

          const produto = snapshot.data();
          const valorAfiliado = produto.valorAfiliado ?? 0;
          const stockMinimo = Number(produto.stockMinimo ?? 0);

          if (
            produto.publicado !== true ||
            !Number.isFinite(produto.preco) ||
            produto.preco <= 0 ||
            produto.preco > 1000000000000 ||
            !Number.isFinite(valorAfiliado) ||
            valorAfiliado < 0 ||
            valorAfiliado > produto.preco ||
            !Number.isInteger(produto.quantidade) ||
            produto.quantidade < 0 ||
            produto.quantidade > 1000000 ||
            !Number.isInteger(stockMinimo) ||
            stockMinimo < 0 ||
            stockMinimo > 1000000
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Um dos produtos já não está disponível."
            );
          }

          if (
            !Number.isInteger(quantidadePedida) ||
            quantidadePedida > Number(produto.quantidade || 0)
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Stock insuficiente para ${produto.nome || "um produto"}.`
            );
          }

          return {
            id: snapshot.id,
            referencia: snapshot.ref,
            dados: produto,
            quantidade: quantidadePedida
          };
        });

        const comercianteId = produtos[0].dados.comercianteId;

        if (
          !comercianteId ||
          produtos.some(
            (produto) => produto.dados.comercianteId !== comercianteId
          )
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Cada pedido deve incluir produtos de uma única loja."
          );
        }

        const lojaRef = db.collection("lojas").doc(comercianteId);
        const lojaSnap = await transacao.get(lojaRef);

        if (!lojaSnap.exists || lojaSnap.data().configurada !== true) {
          throw new HttpsError(
            "failed-precondition",
            "A loja não está disponível para receber pedidos."
          );
        }

        const loja = lojaSnap.data();
        const linhas = produtos.map((produto) => ({
          produtoId: produto.id,
          nome: produto.dados.nome,
          imagemUrl: produto.dados.imagemUrl || "",
          unidade: produto.dados.unidade || "unidade",
          quantidade: produto.quantidade,
          preco: produto.dados.preco,
          valorAfiliado: Number(produto.dados.valorAfiliado) || 0
        }));
        const comissaoAfiliado = afiliadoUidValido
          ? Math.round(
              linhas.reduce(
                (soma, linha) =>
                  soma + linha.valorAfiliado * linha.quantidade,
                0
              ) * 100
            ) / 100
          : 0;
        const total = Math.round(
          linhas.reduce(
            (soma, linha) => soma + linha.preco * linha.quantidade,
            0
          ) * 100
        ) / 100;
        const quantidadeItens = linhas.reduce(
          (soma, linha) => soma + linha.quantidade,
          0
        );
        const nomeCliente = String(perfil.nome || "Cliente").slice(0, 120);
        const telefoneCliente = String(perfil.telefone || "").slice(0, 30);

        if (!telefoneCliente) {
          throw new HttpsError(
            "failed-precondition",
            "Adicione um telefone ao seu perfil antes de enviar o pedido."
          );
        }

        for (const produto of produtos) {
          transacao.update(produto.referencia, {
            quantidade: Number(produto.dados.quantidade) - produto.quantidade,
            atualizadoEm: FieldValue.serverTimestamp()
          });
        }

        transacao.create(encomendaRef, {
          clienteUid: uid,
          clienteNome: nomeCliente,
          clienteTelefone: telefoneCliente,
          cliente: {
            nome: nomeCliente,
            telefone: telefoneCliente
          },
          comercianteId,
          nomeLoja: String(loja.nome || "Loja").slice(0, 100),
          numeroEncomenda: encomendaRef.id.slice(0, 8).toUpperCase(),
          itens: linhas,
          quantidadeItens,
          total,
          ...(comissaoAfiliado > 0
            ? {
                afiliadoUid: afiliadoUidValido,
                comissaoAfiliado,
                estadoComissao: "aguarda_pagamento"
              }
            : {}),
          estado: "pendente",
          status: "pendente",
          pagamento: "a combinar com o comerciante",
          criadoEm: FieldValue.serverTimestamp(),
          atualizadoEm: FieldValue.serverTimestamp()
        });

        if (comissaoAfiliado > 0 && comissaoRef) {
          transacao.create(comissaoRef, {
            encomendaId: encomendaRef.id,
            numeroEncomenda: encomendaRef.id.slice(0, 8).toUpperCase(),
            nomeLoja: String(loja.nome || "Loja").slice(0, 100),
            valor: comissaoAfiliado,
            moeda: "AOA",
            estado: "aguarda_pagamento",
            itens: linhas
              .filter((linha) => linha.valorAfiliado > 0)
              .map((linha) => ({
                nome: String(linha.nome || "Produto").slice(0, 120),
                quantidade: linha.quantidade,
                valorUnitario: linha.valorAfiliado
              })),
            criadoEm: FieldValue.serverTimestamp()
          });
        }

        return {
          encomendaId: encomendaRef.id,
          numeroEncomenda: encomendaRef.id.slice(0, 8).toUpperCase(),
          total
        };
      });
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Erro ao criar encomenda:", error);
      throw new HttpsError(
        "internal",
        "Não foi possível enviar o pedido. Tente novamente."
      );
    }
  }
);

exports.atualizarEstadoEncomenda = onCall(
  { region: "europe-west1", maxInstances: 10, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Inicie sessão para atualizar esta encomenda."
      );
    }

    const uid = request.auth.uid;
    const encomendaId = String(request.data?.encomendaId || "");
    const novoEstado = String(request.data?.estado || "");
    const transicoes = {
      pendente: ["verificado", "cancelada"],
      verificado: ["empacotado"],
      empacotado: ["em_delivery", "entregue"],
      em_delivery: ["entregue"],
      entregue: [],
      cancelada: []
    };

    if (!/^[A-Za-z0-9_-]{1,128}$/.test(encomendaId)) {
      throw new HttpsError(
        "invalid-argument",
        "A encomenda indicada não é válida."
      );
    }

    const perfilSnap = await db.collection("usuarios").doc(uid).get();

    if (
      !perfilSnap.exists ||
      !["comerciante", "cliente"].includes(perfilSnap.data().tipo)
    ) {
      throw new HttpsError(
        "permission-denied",
        "A conta não pode atualizar encomendas."
      );
    }

    const encomendaRef = db.collection("encomendas").doc(encomendaId);

    try {
      await db.runTransaction(async (transacao) => {
        const encomendaSnap = await transacao.get(encomendaRef);

        if (!encomendaSnap.exists) {
          throw new HttpsError("not-found", "Encomenda não encontrada.");
        }

        const encomenda = encomendaSnap.data();

        const estadoAtual = encomenda.estado || encomenda.status || "pendente";
        const ehComercianteDono =
          perfilSnap.data().tipo === "comerciante" &&
          encomenda.comercianteId === uid &&
          Object.prototype.hasOwnProperty.call(transicoes, estadoAtual) &&
          transicoes[estadoAtual].includes(novoEstado);
        const ehClienteCancelandoPedidoPendente =
          perfilSnap.data().tipo === "cliente" &&
          encomenda.clienteUid === uid &&
          estadoAtual === "pendente" &&
          novoEstado === "cancelada";

        if (!ehComercianteDono && !ehClienteCancelandoPedidoPendente) {
          throw new HttpsError(
            encomenda.comercianteId !== uid && encomenda.clienteUid !== uid
              ? "permission-denied"
              : "failed-precondition",
            encomenda.comercianteId !== uid && encomenda.clienteUid !== uid
              ? "Não tem permissão para atualizar esta encomenda."
              : "Esta alteração de estado não é permitida."
          );
        }

        let produtosARepor = [];

        if (novoEstado === "cancelada") {
          let comissaoParaCancelar = null;
          const itens = Array.isArray(encomenda.itens)
            ? encomenda.itens
            : [];
          const referencias = itens
            .filter((item) => item.produtoId)
            .map((item) => ({
              item,
              referencia: db
                .collection("produtos")
                .doc(String(item.produtoId))
            }));
          const snapshots = [];

          for (const { referencia } of referencias) {
            snapshots.push(await transacao.get(referencia));
          }

          if (encomenda.afiliadoUid) {
            const comissaoRef = db
              .collection("usuarios")
              .doc(String(encomenda.afiliadoUid))
              .collection("comissoes")
              .doc(encomendaSnap.id);
            const comissaoSnap = await transacao.get(comissaoRef);
            if (comissaoSnap.exists) {
              comissaoParaCancelar = {
                snapshot: comissaoSnap,
                referencia: comissaoRef
              };
            }
          }

          produtosARepor = snapshots
            .map((snapshot, index) => ({
              tipo: "stock",
              snapshot,
              quantidade: Number(referencias[index].item.quantidade) || 0
            }))
            .filter(({ snapshot, quantidade }) =>
              snapshot.exists && quantidade > 0
            );

          if (comissaoParaCancelar) {
            produtosARepor.push({
              tipo: "comissao",
              ...comissaoParaCancelar
            });
          }
        }

        for (const item of produtosARepor) {
          if (item.tipo === "comissao") {
            transacao.update(item.referencia, {
              estado: "cancelada",
              atualizadoEm: FieldValue.serverTimestamp()
            });
          } else {
            transacao.update(item.snapshot.ref, {
              quantidade:
                Number(item.snapshot.data().quantidade || 0) +
                item.quantidade,
              atualizadoEm: FieldValue.serverTimestamp()
            });
          }
        }

        transacao.update(encomendaRef, {
          estado: novoEstado,
          status: novoEstado,
          atualizadoEm: FieldValue.serverTimestamp(),
          atualizadoPor: uid
        });
      });

      return { sucesso: true, estado: novoEstado };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Erro ao atualizar encomenda:", error);
      throw new HttpsError(
        "internal",
        "Não foi possível atualizar a encomenda. Tente novamente."
      );
    }
  }
);

exports.ativarAfiliado = onCall(
  { region: "europe-west1", enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Inicie sessão para aderir ao programa de afiliados."
      );
    }
    if (request.data?.aceite !== true) {
      throw new HttpsError(
        "invalid-argument",
        "Confirme que leu as condições do programa."
      );
    }

    const perfilRef = db.collection("usuarios").doc(request.auth.uid);
    const perfilSnap = await perfilRef.get();
    if (!perfilSnap.exists || perfilSnap.data().tipo !== "cliente") {
      throw new HttpsError(
        "permission-denied",
        "O programa de afiliados está disponível para contas de cliente."
      );
    }

    if (perfilSnap.data().afiliadoAtivo !== true) {
      await perfilRef.update({
        afiliadoAtivo: true,
        afiliadoDesde: FieldValue.serverTimestamp()
      });
    }

    return { sucesso: true };
  }
);

exports.atualizarPerfilCliente = onCall(
  { region: "europe-west1", enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Inicie sessão para atualizar o seu perfil."
      );
    }

    const nome = String(request.data?.nome || "").trim();
    if (!nome || nome.length > 120) {
      throw new HttpsError(
        "invalid-argument",
        "O nome deve ter entre 1 e 120 caracteres."
      );
    }

    const perfilRef = db.collection("usuarios").doc(request.auth.uid);
    const perfilSnap = await perfilRef.get();
    if (!perfilSnap.exists || perfilSnap.data().tipo !== "cliente") {
      throw new HttpsError(
        "permission-denied",
        "Apenas clientes podem atualizar este perfil."
      );
    }

    await perfilRef.update({
      nome,
      atualizadoEm: FieldValue.serverTimestamp()
    });

    return { sucesso: true };
  }
);

// =========================================================
// INTEGRAÇÃO APPYPAY (Pagamento) - Usando .env
// =========================================================

// exports.criarPagamentoAppyPay = onCall(
//   {
//     region: "europe-west1",
//     // Removemos a linha "secrets" porque estamos no plano gratuito
//     enforceAppCheck: true,
//   },
//   async (request) => {
//     if (!request.auth) {
//       throw new HttpsError("unauthenticated", "Inicie sessão para pagar.");
//     }

//     const { encomendaId, valor, telefone, metodo } = request.data || {};

//     if (!encomendaId || !valor || !telefone) {
//       throw new HttpsError("invalid-argument", "Faltam dados para o pagamento.");
//     }

//     // 1. Verificar se a encomenda existe e pertence ao utilizador
//     const encomendaRef = db.collection("encomendas").doc(encomendaId);
//     const encomendaSnap = await encomendaRef.get();

//     if (!encomendaSnap.exists) {
//       throw new HttpsError("not-found", "Encomenda não encontrada.");
//     }

//     const encomenda = encomendaSnap.data();
//     if (encomenda.clienteUid !== request.auth.uid) {
//       throw new HttpsError("permission-denied", "Sem permissão para esta encomenda.");
//     }

//     if (encomenda.pagamentoEstado === "pago") {
//       throw new HttpsError("already-exists", "Esta encomenda já foi paga.");
//     }

//     try {
//       // 2. Autenticar na AppyPay (Lendo do ficheiro .env)
//       const params = new URLSearchParams();
//       params.append("grant_type", "client_credentials");
//       params.append("client_id", process.env.APPYPAY_CLIENT_ID);
//       params.append("client_secret", process.env.APPYPAY_CLIENT_SECRET);

//       const authResponse = await axios.post(
//         "https://auth.appypay.co.ao/connect/token",
//         params
//       );
//       const token = authResponse.data.access_token;

//       // 3. Criar a cobrança na AppyPay
//       const pagamentoResponse = await axios.post(
//         "https://gwy-api.appypay.co.ao/v2.0/charges",
//         {
//           merchantTransactionId: encomendaId.substring(0, 15),
//           amount: Number(valor),
//           description: `Encomenda ${encomendaId}`,
//           paymentMethod: metodo || "GPO",
//           customerPhone: telefone,
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       const dadosPagamento = pagamentoResponse.data;

//       // 4. Atualizar a encomenda com os dados da transação
//       await encomendaRef.update({
//         pagamentoEstado: "pendente",
//         pagamentoMetodo: metodo || "GPO",
//         pagamentoTransacaoId: dadosPagamento.id || encomendaId,
//         pagamentoReferencia: dadosPagamento.reference || null,
//         pagamentoEntidade: dadosPagamento.entity || null,
//         pagamentoAtualizadoEm: FieldValue.serverTimestamp(),
//       });

//       // 5. Devolver os dados ao React
//       return {
//         sucesso: true,
//         transacaoId: dadosPagamento.id,
//         referencia: dadosPagamento.reference || null,
//         entidade: dadosPagamento.entity || null,
//         status: dadosPagamento.status || "pending",
//       };

//     } catch (error) {
//       console.error("Erro na AppyPay:", error.response?.data || error.message);
//       throw new HttpsError(
//         "internal",
//         error.response?.data?.message || "Falha ao comunicar com a AppyPay."
//       );
//     }
//   }
// );