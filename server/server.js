const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { setupDb } = require('./database');
const { enviarEmailPedido } = require('./mailer');

const app = express();
const PORT = 3001;

// --- CONFIGURAÇÃO DE UPLOAD ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let db;

// --- INICIALIZAÇÃO DO SERVIDOR ---
async function startServer() {
    db = await setupDb();
    app.listen(PORT, () => {
        console.log(`
        ##############################################
        🚀 LEITURA CRENTE - BACKEND v2.0 ONLINE
        📡 Porta: ${PORT}
        📂 Uploads: /uploads
        🗄️ Banco: SQLite (pedidos.db)
        🤖 IA de Rastreio: BUSCA POR NOME OU ID
        ##############################################
        `);
    });
}

// ==========================================
// ROTAS DE PRODUTOS (ESTOQUE)
// ==========================================

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await db.all('SELECT * FROM produtos');
        res.json(produtos);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar produtos" });
    }
});

app.post('/api/produtos', upload.single('foto'), async (req, res) => {
    const { nome, preco } = req.body;
    const imagem_url = req.file 
        ? `http://localhost:3001/uploads/${req.file.filename}` 
        : 'https://via.placeholder.com/400';

    try {
        await db.run(
            'INSERT INTO produtos (nome, preco, imagem_url) VALUES (?, ?, ?)',
            [nome, parseFloat(preco), imagem_url]
        );
        res.status(201).json({ message: "Produto cadastrado!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao cadastrar produto" });
    }
});

app.put('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { preco } = req.body;
    try {
        await db.run('UPDATE produtos SET preco = ? WHERE id = ?', [preco, id]);
        res.json({ message: "Preço atualizado!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar" });
    }
});

app.delete('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.run('DELETE FROM produtos WHERE id = ?', [id]);
        res.json({ message: "Produto removido com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir produto" });
    }
});

// ==========================================
// ROTAS DE PEDIDOS (CARRINHO E ADM)
// ==========================================

// Listar Pedidos (Painel ADM)
app.get('/api/pedidos', async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id, 
                p.cliente, 
                p.status, 
                p.data_criacao,
                GROUP_CONCAT(i.produto_nome || ' (x' || i.quantidade || ')', ', ') as itens_resumo
            FROM pedidos p
            LEFT JOIN itens_pedido i ON p.id = i.pedido_id
            GROUP BY p.id
            ORDER BY p.data_criacao DESC
        `;
        const pedidos = await db.all(sql);
        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ error: "Erro ao carregar pedidos" });
    }
});

// FAZER PEDIDO (Com suporte a Quantidades e Protocolo ID)
app.post('/api/pedidos', async (req, res) => {
    const { cliente, email, telefone, produtos } = req.body;

    if (!cliente || !produtos || produtos.length === 0) {
        return res.status(400).json({ error: "Dados incompletos para processar o pedido" });
    }

    try {
        // Inicia Transação para garantir que não crie pedido sem itens
        await db.run('BEGIN TRANSACTION');

        // 1. Cria o pedido principal (O ID será gerado aqui)
        const result = await db.run(
            'INSERT INTO pedidos (cliente, status) VALUES (?, ?)', 
            [cliente, 'pendente']
        );
        const pedidoId = result.lastID;

        // 2. Insere os itens com a quantidade correta vinda do carrinho
        for (const item of produtos) {
            await db.run(
                'INSERT INTO itens_pedido (pedido_id, produto_nome, quantidade) VALUES (?, ?, ?)', 
                [pedidoId, item.nome, item.quantidade]
            );
        }

        await db.run('COMMIT');

        // Tenta enviar e-mail de confirmação
        if (typeof enviarEmailPedido === 'function') {
            enviarEmailPedido(cliente, pedidoId, 'pendente');
        }
        
        // Retornamos o ID (Protocolo) para o Front exibir
        res.status(201).json({ 
            id: pedidoId, 
            message: "Pedido processado com sucesso!",
            protocolo: pedidoId 
        });

    } catch (err) {
        await db.run('ROLLBACK');
        console.error("Erro no checkout:", err);
        res.status(500).json({ error: "Erro interno ao criar pedido" });
    }
});

app.put('/api/pedidos/:id/status', async (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body;

    try {
        const pedido = await db.get('SELECT status, cliente FROM pedidos WHERE id = ?', [id]);
        if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });
        
        await db.run('UPDATE pedidos SET status = ? WHERE id = ?', [novoStatus, id]);
        
        if (typeof enviarEmailPedido === 'function') {
            enviarEmailPedido(pedido.cliente, id, novoStatus);
        }
        
        res.json({ message: "Status atualizado!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar status" });
    }
});

// ==========================================
// ROTA DA IA (RASTREIO POR NOME OU ID)
// ==========================================

app.get('/api/rastreio/:busca', async (req, res) => {
    const { busca } = req.params;
    try {
        const sql = `
            SELECT p.*, GROUP_CONCAT(i.produto_nome || ' (x' || i.quantidade || ')', ', ') as itens
            FROM pedidos p
            LEFT JOIN itens_pedido i ON p.id = i.pedido_id
            WHERE p.cliente LIKE ? OR p.id = ?
            GROUP BY p.id
            ORDER BY p.data_criacao DESC
        `;
        // Procura por parte do nome OU pelo número exato do pedido
        const pedidos = await db.all(sql, [`%${busca}%`, busca]);
        res.json(pedidos);
    } catch (err) {
        console.error("Erro na busca da IA:", err);
        res.status(500).json({ error: "Erro na consulta de rastreio" });
    }
});

startServer();