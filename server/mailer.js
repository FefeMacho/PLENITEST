const nodemailer = require('nodemailer');

// Configuração do transportador de e-mail
// Para o teste, vamos usar uma conta de teste (Ethereal)
// Mas aqui você explicaria que poderia ser Gmail, Outlook ou SendGrid
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'sua_conta_teste@ethereal.email', // Vamos gerar uma jajá
        pass: 'sua_senha_teste'
    }
});

async function enviarEmailPedido(cliente, pedidoId, status) {
    try {
        const info = await transporter.sendMail({
            from: '"Completude 📚" <contato@leituracrente.com>',
            to: "cliente@exemplo.com", // No mundo real, aqui seria o e-mail do cliente
            subject: `Atualização do seu Pedido #${pedidoId}`,
            text: `Olá ${cliente}, seu pedido na Completude agora está: ${status}!`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #2c3e50;">Completude - Livraria Cristã</h2>
                    <p>Olá <strong>${cliente}</strong>,</p>
                    <p>O status do seu pedido <strong>#${pedidoId}</strong> foi atualizado para:</p>
                    <div style="background: #f1f1f1; padding: 15px; border-radius: 5px; font-weight: bold; display: inline-block;">
                        ${status.toUpperCase()}
                    </div>
                    <p>Fique em paz e boa leitura!</p>
                </div>
            `
        });

        console.log("📧 E-mail de teste enviado: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("❌ Erro ao enviar e-mail:", error);
    }
}

module.exports = { enviarEmailPedido };