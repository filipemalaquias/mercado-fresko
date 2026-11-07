const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de Autenticação
app.post('/api/appypay/auth', async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.APPYPAY_CLIENT_ID);
    params.append('client_secret', process.env.APPYPAY_CLIENT_SECRET);
    
    // O resource é obrigatório conforme a documentação oficial
    params.append('resource', '2aed7612-de64-46b5-9e59-1f48f8902d14');

    // 👇 Forçar o método POST e garantir o Content-Type
    const response = await axios({
      method: 'post',
      url: 'https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token', // URL de PRODUÇÃO
      data: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Erro auth:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Falha na autenticação',
      detalhe: error.response?.data || error.message 
    });
  }
});

// Rota de Cobrança
app.post('/api/appypay/charges', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    console.log('A enviar para AppyPay:', req.body);

    const response = await axios.post(
      'https://gwy-api.appypay.co.ao/v2.0/charges', // URL de PRODUÇÃO
      req.body, 
      {
        headers: { 
          Authorization: token,
          "Content-Type": "application/json"
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro charges:', error.response?.data || error.message);
    
    res.status(500).json({ 
      error: 'Falha ao criar cobrança',
      detalhe: error.response?.data || error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy a correr na porta ${PORT}`));