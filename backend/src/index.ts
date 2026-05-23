import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configurar o CORS para permitir requisições do frontend React
app.use(cors({
  origin: '*' // Permite todas as origens para facilidade no plano free, ajustar em produção
}));

// Processar corpos JSON
app.use(express.json());

// Adicionar rotas da API
app.use('/api', apiRouter);

// Rota de status básica
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor de PDV e Estoque rodando.' });
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend rodando em http://localhost:${port}`);
});
