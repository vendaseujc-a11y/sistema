import { Router } from 'express';
import { getQuickReport } from '../controllers/reportController.js';
import { sendSaleReceipt } from '../controllers/emailController.js';
import mlWebhookRouter from './mlWebhook.js';

const router = Router();

// Endpoint de Relatório Rápido utilizando agregados do banco de dados
router.get('/report', getQuickReport);

// Endpoint para envio de comprovante de venda via Resend
router.post('/send-receipt', sendSaleReceipt);

// Endpoints Mercado Livre: /api/ml/sync e /api/ml/status
router.use('/', mlWebhookRouter);

export default router;

