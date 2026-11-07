const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Obter Token de Acesso da AppyPay
async function getAppyPayToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.APPYPAY_CLIENT_ID);
  params.append('client_secret', process.env.APPYPAY_CLIENT_SECRET);

  const response = await axios.post(process.env.APPYPAY_TOKEN_URL, params);
  return response.data.access_token;
}

app.post('/api/appypay/criar-cobranca', async (req, res) => {
  try {
    const { encomendaId, valor, metodo, telefone, descricao } = req.body;
    const token = await getAppyPayToken();

    // Exemplo para GPO (Multicaixa Express)
    if (metodo === 'GPO') {
      const response = await axios.post(
        `${process.env.APPYPAY_BASE_URL}/charges`,
        {
          merchantTransactionId: encomendaId,
          amount: valor,
          description: descricao,
          paymentMethod: 'GPO', // O ID específico pode variar, consulta a documentação [citation:1][citation:22]
          customerPhone: telefone,
          // ... outros campos obrigatórios
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.json({ status: 'pending', id: response.data.id });
    }

    // Exemplo para REF (Referência)
    if (metodo === 'REF') {
      const response = await axios.post(
        `${process.env.APPYPAY_BASE_URL}/charges`,
        {
          merchantTransactionId: encomendaId,
          amount: valor,
          description: descricao,
          paymentMethod: 'REF',
          // ...
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // A resposta da REF deve conter a entidade e referência
      return res.json({ referencia: response.data.reference, entidade: response.data.entity });
    }

    // ... outros métodos

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ mensagem: 'Erro ao criar cobrança na AppyPay.' });
  }
});

app.listen(3001, () => console.log('Backend a correr na porta 3001'));