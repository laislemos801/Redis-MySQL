// Importa a classe ProductsRepository, responsável por interagir com o banco de dados
import { ProductsRepository } from "./ProductsRepository";
// Importa o middleware cors para permitir requisições de diferentes origens
import cors from 'cors';
// Importa os módulos express, Request, Response e Router da biblioteca express
import express, { Request, Response, Router } from 'express';

const app = express(); // Cria uma instância do aplicativo Express
const port = 3000; // Define a porta em que o servidor irá escutar
const routes = Router(); // Cria um roteador para gerenciar as rotas da API

const productsRepo = new ProductsRepository(); // Instancia o repositório de produtos

// Configura o middleware CORS e o parser JSON para o Express
app.use(cors());
app.use(express.json());

// Rota padrão para verificar se o servidor está funcionando
routes.get('/', (req: Request, res: Response) => {
    res.status(200).send("Funcionando..."); // Responde com status 200 e mensagem
});

// Rota para obter todos os produtos
routes.get('/getAllProducts', async (req: Request, res: Response) => {
    const products = await productsRepo.getAll(); // Chama o método para obter todos os produtos
    res.status(200).type('application/json').send(products); // Retorna os produtos em formato JSON
});

// Rotas de adição de produtos
routes.post('/addProduct', async (req: Request, res: Response) => {
    try {
        const product = await productsRepo.create(req.body); // Adiciona um novo produto usando os dados do corpo da requisição
        res.status(201).json(product); // Responde com status 201 e o produto criado
    } catch (error) {
        console.error("Erro ao adicionar produto:", error); // Log de erro
        res.status(500).json({ error: "Erro ao adicionar produto." }); // Responde com status 500 e mensagem de erro
    }
});

// Rota para deletar um produto
routes.delete('/deleteProduct/:ID', async (req: Request, res: Response) => {
    const productId = parseInt(req.params.ID, 10); // Obtém o ID do produto a partir dos parâmetros da requisição
    
    try {
        await productsRepo.delete(productId); // Chama o método para deletar o produto pelo ID
        res.status(200).json({ message: 'Item deletado com sucesso' }); // Responde com status 200 e mensagem de sucesso
      } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar o item' }); // Responde com status 500 e mensagem de erro
      }
});

// Rota para atualizar um produto
routes.put('/updateProduct/:ID', async (req: Request, res: Response) => {
    const productId = parseInt(req.params.ID, 10); // Obtém o ID do produto a partir dos parâmetros da requisição
    const productData = req.body; // Supondo que os novos dados venham no corpo da requisição

    try {
        await productsRepo.update(productId, productData); // Chama o método para atualizar o produto com os novos dados
        res.status(200).json({ message: 'Produto atualizado com sucesso' }); // Responde com status 200 e mensagem de sucesso
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar o produto' }); // Responde com status 500 e mensagem de erro
    }
});

// Rota para sincronizar dados do Redis com o banco de dados
routes.get('/sync', async (req: Request, res: Response) => {
    try {
        await productsRepo.syncRedisWithDatabase(); // Chama a função de sincronização
        res.status(200).json({ message: 'Sincronização concluída com sucesso' }); // Responde com status 200 e mensagem de sucesso
    } catch (error) {
        console.error("Erro durante a sincronização:", error); // Log de erro
        res.status(500).json({ error: 'Erro ao sincronizar os dados' }); // Responde com status 500 e mensagem de erro
    }
});


// Aplica as rotas na aplicação web backend sob o prefixo /api
app.use('/api', routes);

// Inicia o servidor e escuta na porta definida
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`); 
});
