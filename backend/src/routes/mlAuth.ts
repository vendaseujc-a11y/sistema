import { Router, Request, Response } from 'express';
import {
  getMLAuthUrl,
  exchangeCodeForTokens,
  saveMLTokens,
  getValidMLToken,
} from '../services/mercadoLivreService.js';

const router = Router();

// ============================================================
// GET /auth/mercadolivre
// Redireciona o usuário para a tela de autorização do ML
// ============================================================
router.get('/mercadolivre', (_req: Request, res: Response) => {
  if (!process.env.ML_CLIENT_ID) {
    return res.status(503).json({
      error: 'Integração com Mercado Livre não configurada.',
      detail: 'Configure ML_CLIENT_ID e ML_CLIENT_SECRET no arquivo .env do backend.',
    });
  }

  const authUrl = getMLAuthUrl();
  console.log(`🔗 Redirecionando para autorização ML: ${authUrl}`);
  res.redirect(authUrl);
});

// ============================================================
// GET /auth/callback
// Recebe o "code" do ML e troca pelo access_token + refresh_token
// ============================================================
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error: mlError, error_description } = req.query;

  // Usuário negou a autorização
  if (mlError) {
    console.error('❌ Autorização ML negada:', mlError, error_description);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/integracoes?status=error&reason=${encodeURIComponent(String(mlError))}`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Parâmetro "code" ausente na callback.' });
  }

  try {
    console.log('🔑 Trocando code por tokens ML...');
    const tokens = await exchangeCodeForTokens(code);
    await saveMLTokens(tokens);

    console.log(`✅ ML conectado! Usuário ML ID: ${tokens.user_id}`);

    // Redirecionar de volta para o frontend com status de sucesso
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?tab=integracoes&status=connected`);
  } catch (err: any) {
    console.error('❌ Erro na callback ML:', err.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?tab=integracoes&status=error&reason=${encodeURIComponent(err.message)}`);
  }
});

// ============================================================
// GET /auth/ml-status (helper para o frontend verificar conexão)
// ============================================================
router.get('/ml-status', async (_req: Request, res: Response) => {
  try {
    const tokenData = await getValidMLToken();
    if (!tokenData) {
      return res.json({ connected: false });
    }
    res.json({ connected: true, seller_id: tokenData.seller_id });
  } catch {
    res.json({ connected: false });
  }
});

export default router;
