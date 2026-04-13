const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { setupDb } = require('./database');
const { enviarEmailPedido } = require('./mailer');

const app = express();
const PORT = 3001;

// --- GARANTIR QUE A PASTA DE UPLOADS EXISTA ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- CONFIGURAÇÃO DE UPLOAD (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
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
    await db.run('ALTER TABLE pedidos ADD COLUMN cpf TEXT;');
    app.listen(PORT, () => {
        console.log(`
        ##############################################
        🚀 LEITURA CRENTE - BACKEND v2.1 ONLINE
        📡 Porta: ${PORT}
        📂 Uploads: /uploads
        🗄️ Banco: SQLite (pedidos.db)
        🤖 IA de Rastreio: CPF OU ID HABILITADOS
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
        const precoNum = parseFloat(preco);
        if (isNaN(precoNum)) return res.status(400).json({ error: "Preço inválido" });

        await db.run(
            'INSERT INTO produtos (nome, preco, imagem_url) VALUES (?, ?, ?)',
            [nome, precoNum, imagem_url]
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

// Listar Pedidos (Painel ADM) - AJUSTADO COM COALESCE E CPF
app.get('/api/pedidos', async (req, res) => {
    try {
        const sql = `
    SELECT 
        p.id, 
        p.cliente, 
        p.cpf,
        p.status, 
        p.data_criacao,
        -- Troquei a vírgula por ' | ' para facilitar a leitura se o texto quebrar linha
        COALESCE(GROUP_CONCAT(i.produto_nome || ' (x' || i.quantidade || ')', ' | '), 'Sem itens') as itens_resumo
    FROM pedidos p
    LEFT JOIN itens_pedido i ON p.id = i.pedido_id
    GROUP BY p.id
    ORDER BY p.data_criacao DESC
`;
        const pedidos = await db.all(sql);
        res.json(pedidos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao carregar pedidos" });
    }
});

// FAZER PEDIDO (Ajustado para CPF)
app.post('/api/pedidos', async (req, res) => {
    const { cliente, cpf, produtos } = req.body;

    if (!cliente || !cpf || !produtos || produtos.length === 0) {
        return res.status(400).json({ error: "Dados incompletos (Nome, CPF e Produtos são obrigatórios)" });
    }

    try {
        await db.run('BEGIN TRANSACTION');

        // 1. Cria o pedido principal (Adicionado coluna cpf)
        const result = await db.run(
            'INSERT INTO pedidos (cliente, cpf, status) VALUES (?, ?, ?)', 
            [cliente, cpf, 'pendente']
        );
        const pedidoId = result.lastID;

        // 2. Insere os itens
        for (const item of produtos) {
            await db.run(
                'INSERT INTO itens_pedido (pedido_id, produto_nome, quantidade) VALUES (?, ?, ?)', 
                [pedidoId, item.nome, item.quantidade]
            );
        }

        await db.run('COMMIT');

        // Notificação por e-mail (opcional)
        if (typeof enviarEmailPedido === 'function') {
            enviarEmailPedido(cliente, pedidoId, 'pendente');
        }
        
        res.status(201).json({ id: pedidoId, message: "Pedido processado com sucesso!" });

    } catch (err) {
        await db.run('ROLLBACK');
        console.error("Erro no checkout:", err);
        res.status(500).json({ error: "Erro interno ao criar pedido" });
    }
});

// ATUALIZAR STATUS (Com Regra de Imutabilidade)
app.put('/api/pedidos/:id/status', async (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body;

    try {
        const pedido = await db.get('SELECT status, cliente FROM pedidos WHERE id = ?', [id]);
        if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });
        
        // Regra de Negócio: Finalizado é o estado final!
        if (pedido.status === 'finalizado') {
            return res.status(403).json({ error: "Pedidos finalizados não podem ser alterados." });
        }

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
// ROTA DA IA (RASTREIO POR CPF OU ID)
// ==========================================

app.get('/api/rastreio/:busca', async (req, res) => {
    const { busca } = req.params;
    try {
        const sql = `
            SELECT p.*, COALESCE(GROUP_CONCAT(i.produto_nome || ' (x' || i.quantidade || ')', ', '), 'Processando itens...') as itens
            FROM pedidos p
            LEFT JOIN itens_pedido i ON p.id = i.pedido_id
            WHERE p.cpf = ? OR p.id = ? OR p.cliente LIKE ?
            GROUP BY p.id
            ORDER BY p.data_criacao DESC
        `;
        // Busca exata por CPF ou ID, ou parcial por Nome
        const pedidos = await db.all(sql, [busca, busca, `%${busca}%`]);
        res.json(pedidos);
    } catch (err) {
        console.error("Erro na busca da IA:", err);
        res.status(500).json({ error: "Erro na consulta de rastreio" });
    }
});

startServer();