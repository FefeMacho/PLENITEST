# 📚 Leitura Crente - Controle de Pedidos

Sistema Full Stack desenvolvido para o teste prático de TI Interno da Plenitude.

## 🚀 Tecnologias Utilizadas
- **Frontend:** React + Vite + Tailwind CSS (UI inspirada no e-commerce Plenitude).
- **Backend:** Node.js + Express.
- **Banco de Dados:** SQLite (persistência de dados local).
- **E-mail:** Nodemailer (integração para avisos de status).

## 🧠 Regras de Negócio Implementadas
- **Imutabilidade de Status:** Um pedido com status 'Finalizado' não pode retornar para estados anteriores.
- **Validação de Dados:** Bloqueio de pedidos sem identificação do cliente ou sem produtos.
- **Feedback ao Usuário:** Notificações em tempo real (Toast) sem o uso de popups intrusivos.

## 🛠️ Como rodar o projeto
1. No terminal do servidor (`/server`): `npm install` e `node server.js`.
2. No terminal do cliente (`/client`): `npm install` e `npm run dev`.