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
    
    // 👇 O resource é obrigatório segundo a documentação oficial
    params.append('resource', '2aed7612-de64-46b5-9e59-1f48f8902d14');

    // 👇 URL oficial de autenticação (Microsoft Azure AD)
    const response = await axios.post(
      'https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token', 
      params, 
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
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
    // O token vem no header Authorization que o React envia
    const token = req.headers.authorization;
    
    // Log para debug (podes remover depois)
    console.log('A enviar para AppyPay:', req.body);

    const response = await axios.post(
      'https://gwy-api.appypay.co.ao/v2.0/charges', 
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