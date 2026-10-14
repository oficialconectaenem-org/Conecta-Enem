import nodemailer from 'nodemailer'

/**
 * Serviço de Envio de E-mails Transacionais via Nodemailer (SMTP genérico)
 *
 * Variáveis de ambiente necessárias:
 *   SMTP_HOST      — servidor SMTP  (ex: smtp-relay.brevo.com)
 *   SMTP_PORT      — porta SMTP     (ex: 587)
 *   SMTP_USER      — login SMTP     (ex: seu e-mail Brevo)
 *   SMTP_PASS      — senha/chave SMTP
 *   EMAIL_FROM     — endereço remetente (ex: noreply@conectaenem.com.br)
 *   EMAIL_FROM_NAME — (opcional) nome exibido no remetente
 */

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error(
      'Credenciais de e-mail não configuradas. ' +
      'Defina SMTP_HOST, SMTP_USER e SMTP_PASS no arquivo .env'
    )
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })
}

export async function sendPasswordResetEmail({ to, name, resetUrl, role }) {
  const transporter = createTransporter()

  const fromName = process.env.EMAIL_FROM_NAME || 'Conecta Enem'
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER
  const roleLabel = role === 'TEACHER' ? 'Professor' : 'Aluno'
  const recipientName = name ? name.split(' ')[0] : (role === 'TEACHER' ? 'Professor(a)' : 'Estudante')

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha — Conecta Enem</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f0f12;
      color: #e4e4e7;
    }
    .wrapper {
      max-width: 580px;
      margin: 40px auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      padding: 36px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      color: #e0e7ff;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: rgba(124, 58, 237, 0.15);
      border: 1px solid rgba(124, 58, 237, 0.4);
      color: #c4b5fd;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #a1a1aa;
      margin-bottom: 28px;
    }
    .btn-container {
      text-align: center;
      margin: 36px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      color: #ffffff !important;
      padding: 16px 36px;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
      letter-spacing: 0.2px;
    }
    .link-fallback {
      background-color: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 14px;
      word-break: break-all;
      font-size: 12px;
      font-family: monospace;
      color: #c4b5fd;
      margin-bottom: 28px;
    }
    .warning {
      border-left: 3px solid #f59e0b;
      padding: 12px 16px;
      background-color: rgba(245, 158, 11, 0.1);
      border-radius: 0 12px 12px 0;
      font-size: 13px;
      color: #fbbf24;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #27272a;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #71717a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Conecta Enem</h1>
      <p>Laboratório Preparatório</p>
    </div>

    <div class="content">
      <div class="badge">Conta de ${roleLabel}</div>
      <h2 class="greeting">Olá, ${recipientName}!</h2>
      <p class="text">
        Recebemos uma solicitação para redefinir a senha de acesso da sua conta de <strong>${roleLabel}</strong> no <strong>Conecta Enem</strong>.
        Para cadastrar uma nova senha, clique no botão abaixo:
      </p>

      <div class="btn-container">
        <a href="${resetUrl}" target="_blank" class="btn">
          Redefinir Minha Senha
        </a>
      </div>

      <div class="warning">
        <strong>Atenção:</strong> Por motivos de segurança, este link expira em <strong>1 hora</strong>. Se você não solicitou a alteração, ignore este e-mail. Sua senha permanecerá inalterada e segura.
      </div>

      <p class="text" style="font-size: 13px; margin-bottom: 8px;">
        Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
      </p>
      <div class="link-fallback">${resetUrl}</div>
    </div>

    <div class="footer">
      Este é um e-mail automático enviado pelo sistema <strong>Conecta Enem</strong>.<br>
      © ${new Date().getFullYear()} Conecta Enem. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
  `

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject: 'Recuperação de Senha — Conecta Enem',
      html: htmlContent
    })

    console.log('[Email Service] E-mail enviado:', info.messageId)
    return { success: true, id: info.messageId }
  } catch (err) {
    console.error('[Email Service] Erro ao enviar e-mail:', err)
    throw new Error('Falha ao enviar e-mail. Verifique GMAIL_USER e GMAIL_APP_PASSWORD no .env')
  }
}
