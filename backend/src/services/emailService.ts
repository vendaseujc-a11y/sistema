import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface ReceiptItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

export interface ReceiptData {
  vendaId: string;
  total: number;
  data: string;
  itens: ReceiptItem[];
}

export async function sendReceiptEmail(to: string, receipt: ReceiptData): Promise<boolean> {
  if (!resend) {
    console.warn('Resend não está configurado. Simulação de envio de e-mail ativa.');
    console.log(`[E-mail simulado para ${to}]: Comprovante da Venda #${receipt.vendaId} no valor de R$ ${receipt.total.toFixed(2)}.`);
    return true;
  }

  try {
    const itemsHtml = receipt.itens
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.nome}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantidade}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${item.precoUnitario.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${(item.quantidade * item.precoUnitario).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center; margin-bottom: 20px;">Comprovante de Compra</h2>
        <p>Olá,</p>
        <p>Agradecemos pela sua preferência! Aqui estão os detalhes da sua compra realizada em <strong>${receipt.data}</strong>.</p>
        
        <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #6B7280;">ID da Venda:</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; font-family: monospace; color: #111827;">${receipt.vendaId}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #F3F4F6;">
              <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Qtd</th>
              <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Preço Unit.</th>
              <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 10px 8px; font-weight: bold; text-align: right;">Total Geral:</td>
              <td colspan="2" style="padding: 10px 8px; font-weight: bold; text-align: right; color: #4F46E5; font-size: 18px;">R$ ${receipt.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 30px;">
          Este é um e-mail automático. Por favor, não responda diretamente.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to: [to],
      subject: `Comprovante de Compra - Venda #${receipt.vendaId.substring(0, 8)}`,
      html: htmlContent
    });

    if (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
      return false;
    }

    console.log('E-mail enviado com sucesso. ID:', data?.id);
    return true;
  } catch (err) {
    console.error('Erro inesperado no serviço de e-mail:', err);
    return false;
  }
}
