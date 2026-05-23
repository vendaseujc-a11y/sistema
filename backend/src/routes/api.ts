import { Router } from 'express';
import { getQuickReport } from '../controllers/reportController.js';
import { sendSaleReceipt } from '../controllers/emailController.js';

const router = Router();

// Endpoint de Relatório Rápido utilizando agregados do banco de dados
router.get('/report', getQuickReport);

// Endpoint para envio de comprovante de venda via Resend
router.post('/send-receipt', sendSaleReceipt);

export default router;
