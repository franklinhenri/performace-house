const { MongoClient } = require('mongodb');

// URL de conexão do seu MongoDB Atlas (salva nas variáveis de ambiente da Vercel)
const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // Configura CORS para permitir acesso vindo do GitHub Pages
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('performance_house');
        const collection = db.collection('dashboard_data');

        if (req.method === 'GET') {
            // Busca o documento mais recente salvo no MongoDB
            const data = await collection.findOne({ type: 'latest_metrics' });
            return res.status(200).json(data || { data: [], lastUpdate: '' });
        }

        if (req.method === 'POST') {
            // Recebe os dados do Excel processados pelo frontend e salva no MongoDB
            const { data, lastUpdate, password } = req.body;

            // Proteção simples por senha no backend
            if (password !== 'mrv2026') {
                return res.status(401).json({ error: 'Senha incorreta!' });
            }

            await collection.updateOne(
                { type: 'latest_metrics' },
                { $set: { data, lastUpdate, updatedAt: new Date() } },
                { upsert: true }
            );

            return res.status(200).json({ success: true, message: 'Dados atualizados no MongoDB com sucesso!' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
}