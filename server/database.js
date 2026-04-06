const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setupDb() {
    const db = await open({
        filename: './pedidos.db',
        driver: sqlite3.Database
    });

    // 1. Tabela de PRODUTOS (Livros)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            preco REAL,
            imagem_url TEXT
        )
    `);

    // 2. Tabela de PEDIDOS (Cabeçalho)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT,
            status TEXT DEFAULT 'pendente',
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Tabela de ITENS_PEDIDO (O recheio do carrinho) - ESSA É A QUE DEVE ESTAR FALTANDO!
    await db.exec(`
        CREATE TABLE IF NOT EXISTS itens_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER,
            produto_nome TEXT,
            quantidade INTEGER,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
        )
    `);

    return db;
}

module.exports = { setupDb };