import express from "express";
import { Request, Response, Router } from "express";
import { ProductsRepository } from "./ProductsRepository";
import cors from 'cors';

const app = express();
const port = 3000;
const routes = Router();

const productsRepo = new ProductsRepository();

app.use(cors());
app.use(express.json());

routes.get('/', (req: Request, res: Response) => {
    res.status(200).send("Funcionando...");
});

routes.get('/getAllProducts', async (req: Request, res: Response) => {
    const products = await productsRepo.getAll();
    res.status(200).type('application/json').send(products);
});

// Rotas de adição de produtos
routes.post('/addProduct', async (req: Request, res: Response) => {
    try {
        const product = await productsRepo.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        res.status(500).json({ error: "Erro ao adicionar produto." });
    }
});

// Rota para deletar produto
routes.delete('/deleteProduct/:ID', async (req: Request, res: Response) => {
    const productId = parseInt(req.params.ID, 10); // Corrigido para acessar o parâmetro corretamente
    if (isNaN(productId)) {
        return res.status(400).json({ message: 'ID do produto inválido.' });
    }

    try {
        const result = await productsRepo.delete(productId);
        if (result === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(204).send(); // Deletado com sucesso
    } catch (error) {
        console.error("Erro ao deletar produto:", error);
        res.status(500).json({ message: 'Erro ao deletar produto.' });
    }
});

// Aplicar as rotas na aplicação web backend
app.use('/api', routes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
