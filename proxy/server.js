const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/appypay/auth', async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.APPYPAY_CLIENT_ID);
    params.append('client_secret', process.env.APPYPAY_CLIENT_SECRET);

    const response = await axios.post('https://auth.appypay.co.ao/connect/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Erro auth:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha na autenticação' });
  }
});

app.post('/api/appypay/charges', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.post('https://gwy-api.appypay.co.ao/v2.0/charges', req.body, {
      headers: { Authorization: token }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Erro charges:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao criar cobrança' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy a correr na porta ${PORT}`));