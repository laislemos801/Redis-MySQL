import { ProductsRepository } from "./ProductsRepository";
import cors from 'cors';
import express, { Request, Response, Router } from 'express';

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

routes.delete('/deleteProduct/:ID', async (req: Request, res: Response) => {
    const productId = parseInt(req.params.ID, 10);
    
    try {
        await productsRepo.delete(productId);
        res.status(200).json({ message: 'Item deletado com sucesso' });
      } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar o item' });
      }
});

routes.put('/updateProduct/:ID', async (req: Request, res: Response) => {
    const productId = parseInt(req.params.ID, 10);
    const productData = req.body; // Supondo que os novos dados venham no corpo da requisição

    try {
        await productsRepo.update(productId, productData); // Você precisa implementar o método update no seu repositório
        res.status(200).json({ message: 'Produto atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar o produto' });
    }
});

// Rota para sincronização
routes.get('/sync', async (req: Request, res: Response) => {
    try {
        await productsRepo.syncRedisWithDatabase(); // Chama a função de sincronização
        res.status(200).json({ message: 'Sincronização concluída com sucesso' });
    } catch (error) {
        console.error("Erro durante a sincronização:", error);
        res.status(500).json({ error: 'Erro ao sincronizar os dados' });
    }
});


// Aplicar as rotas na aplicação web backend
app.use('/api', routes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
