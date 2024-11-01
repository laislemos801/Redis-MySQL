import { ResultSetHeader } from "mysql2"; // Importa o tipo ResultSetHeader do pacote mysql2
import { conn } from "./db"; // Importa a conexão com o banco de dados
import { Product } from "./product"; // Importa a definição da interface Product
import { createClient } from "redis"; // Importa a função para criar um cliente Redis

// Configuração do Redis
const redisClient = createClient(); // Cria um cliente Redis
redisClient.connect(); // Conecta ao cliente Redis

// Classe que representa o repositório de produtos
export class ProductsRepository {
  constructor() {
    
    console.log("Inicializando ProductsRepository..."); // Mensagem de inicialização
    // Carregar cache no Redis quando o servidor inicia
    this.loadCache();
  }

  // Método para carregar os produtos do banco de dados para o Redis
  async loadCache(): Promise<void> {
    console.log("Carregando produtos do banco de dados para o Redis..."); // Log de carregamento
    const products = await this.getAll(); // Função para carregar os produtos diretamente do banco
    products.forEach((product) => {
      if (product.ID) { // Usando 'ID' em vez de 'id'
        redisClient.hSet(`product:${product.ID}`, { // Armazena o produto no Redis
          id: product.ID.toString(), // Armazena ID como string
          name: product.NAME, // Armazena o nome do produto
          price: product.PRICE, // Armazena o preço do produto
          description: product.DESCRIPTION, // Armazena a descrição do produto
        }); // Armazenar cada produto no Redis
        console.log(`Produto ${product.ID} adicionado ao cache Redis.`); // Log do produto adicionado
      } else {
        console.warn(`Produto sem ID encontrado: ${JSON.stringify(product)}`); // Aviso para produtos sem ID
      }
    });
    console.log("Cache carregado com sucesso."); // Mensagem de sucesso
  }

  // Método para buscar todos os produtos do banco de dados
  public getAll(): Promise<Product[]> {
    console.log("Buscando todos os produtos do banco de dados..."); // Log de busca
    return new Promise((resolve, reject) => {
      conn.query<Product[]>("SELECT * FROM PRODUCTS", (err, res) => {
        if (err) {
          console.error("Erro ao buscar produtos:", err);  // Log de erro
          reject(err); // Rejeita a promessa em caso de erro
        } else {
          console.log(`Total de produtos encontrados: ${res.length}`); // Log do total de produtos
          resolve(res); // Resolve a promessa com os produtos encontrados
        }
      });
    });
  }

  // Método para buscar um produto por ID
  async getById(product_id: number): Promise<Product | undefined> {
    const cachedProduct = await redisClient.hGetAll(`product:${product_id}`); // Busca produto no cache Redis
    if (Object.keys(cachedProduct).length) {
        // Converta os valores de string de volta para um objeto Product
        return {
            ID: parseInt(cachedProduct.id), // Converte ID para número
            NAME: cachedProduct.name, // Obtém o nome do produto
            PRICE: parseFloat(cachedProduct.price), // Converte o preço para número
            DESCRIPTION: cachedProduct.description, // Obtém a descrição do produto
        } as Product; // Retorna o produto do cache
    } else {
        // Busca no banco e armazena no cache se não estiver no Redis
        return new Promise((resolve, reject) => {
            conn.query<Product[]>( // Realiza a consulta no banco
                "SELECT * FROM PRODUCTS WHERE ID = ?",
                [product_id], // Passa o ID como parâmetro
                (err, res) => {
                    if (err) reject(err); // Rejeita em caso de erro
                    else {
                        const product = res?.[0]; // Obtém o primeiro produto da resposta
                        if (product) {
                          // Armazena no Redis
                            redisClient.hSet(`product:${product.ID}`, {
                                id: product.ID.toString(),
                                name: product.NAME,
                                price: product.PRICE.toString(), // Certifique-se de que o preço é uma string
                                description: product.DESCRIPTION,
                            }); // Armazena no Redis
                        }
                        resolve(product); // Resolve com o produto encontrado
                    }
                }
            );
        });
    }
}

  // Método para criar um novo produto
  async create(p: Product): Promise<Product> {
    console.log("Tentando inserir produto:", p); // Log de tentativa de inserção
    return new Promise((resolve, reject) => {
        conn.query<ResultSetHeader>( // Realiza a consulta para inserir o produto
            "INSERT INTO PRODUCTS (NAME, PRICE, DESCRIPTION) VALUES(?,?,?)",
            [p.name, p.price, p.description],
            async (err, res) => {
                if (err) {
                    console.error("Erro ao inserir produto:", err); // Log de erro
                    reject(err); // Rejeita a promessa em caso de erro
                } else {
                    console.log("Produto inserido com sucesso, ID:", res.insertId); // Log de sucesso
                    try {
                        const product = await this.getById(res.insertId); // Busca o produto recém-inserido
                        console.log("Produto recuperado do banco de dados:", product); // Log do produto recuperado

                        // Verificação para garantir que `product` não é undefined
                        if (product && product.ID) {
                            await redisClient.hSet(`product:${product.ID}`, { // Armazena no Redis
                                id: product.ID.toString(),
                                name: product.NAME,
                                price: product.PRICE,
                                description: product.DESCRIPTION,
                            });
                            console.log("Produto adicionado ao Redis com chave:", `product:${product.ID}`, "com dados:", product); // Log do produto adicionado ao Redis
                            resolve(product); // Resolve com o produto
                        } else {
                            console.error(`Produto com ID ${res.insertId} não encontrado após inserção.`); // Log de erro se não encontrado
                            reject(new Error(`Produto com ID ${res.insertId} não encontrado após inserção.`)); // Rejeita a promessa
                        }
                    } catch (error) {
                        console.error("Erro ao recuperar produto após inserção:", error); // Log de erro
                        reject(error); // Rejeita em caso de erro
                    }
                }
            }
        );
    });
  }

  // Método para atualizar um produto
  async update(id: number, data: Partial<Product>): Promise<Product | undefined> {
    console.log("Tentando atualizar produto com ID:", id, "Novos dados:", data); // Log de atualização

    // Se não houver campos para atualizar, rejeitar a operação.
    if (!data.name && !data.price && !data.description) {
        throw new Error("Pelo menos um campo deve ser fornecido para atualização."); // Lança erro se não houver dados
    }

    return new Promise((resolve, reject) => {
        // Construir a query dinâmica com os campos que foram fornecidos
        const updates: string[] = []; // Array para armazenar as atualizações
        const values: (string | number)[] = []; // Array para armazenar os valores

        if (data.name) {
            updates.push("NAME = ?"); // Adiciona a atualização do nome
            values.push(data.name); // Adiciona o valor do nome
        }
        if (data.price) {
            updates.push("PRICE = ?"); // Adiciona a atualização do preço
            values.push(data.price); // Adiciona o valor do preço
        }
        if (data.description) {
            updates.push("DESCRIPTION = ?"); // Adiciona a atualização da descrição
            values.push(data.description); // Adiciona o valor da descrição
        }
        
        // Adicionar o ID no final da lista de valores
        values.push(id);

        const query = `UPDATE PRODUCTS SET ${updates.join(", ")} WHERE ID = ?`; // Cria a query de atualização

        conn.query<ResultSetHeader>(query, values, async (err, res) => {
            if (err) {
                console.error("Erro ao atualizar produto:", err); // Log de erro
                reject(err); // Rejeita em caso de erro
            } else {
                console.log(`Produto com ID ${id} atualizado com sucesso.`); // Log de sucesso
                const product = await this.getById(id); // Busca o produto atualizado
                if (product) {
                  // Armazena no Redis
                    redisClient.hSet(`product:${product.ID}`, {
                        id: product.ID.toString(),
                        name: product.NAME,
                        price: product.PRICE,
                        description: product.DESCRIPTION,
                    });
                    console.log(`Produto ${product.ID} atualizado no cache Redis.`); // Log da atualização no Redis
                }
                resolve(product); // Resolve com o produto
            }
        });
    });
  }

  // Método para deletar um produto
  async delete(product_id: number): Promise<number> {
    console.log(`Tentando deletar produto com ID: ${product_id}...`); // Log de tentativa de deleção
    return new Promise((resolve, reject) => {
      conn.query<ResultSetHeader>( // Realiza a consulta para deletar o produto
        "DELETE FROM PRODUCTS WHERE ID = ?",
        [product_id],
        async (err, res) => {
          if (err) {
            console.error("Erro ao deletar produto:", err); // Log de erro
            reject(err); // Rejeita em caso de erro
          } else {
            console.log(`Produto com ID ${product_id} deletado com sucesso.`); // Log de sucesso
            await redisClient.del(`product:${product_id}`); // Remove o produto do cache Redis
            console.log(`Produto com ID ${product_id} removido do cache Redis.`); // Log da remoção do Redis
            resolve(res.affectedRows); // Resolve com o número de linhas afetadas
          }
        }
      );
    });
  }

  async syncRedisWithDatabase(): Promise<void> { // Transformado em método da classe
    console.log("Sincronizando Redis com o banco de dados...");
    const products = await this.getAll(); // Obtém todos os produtos do banco de dados

    // Armazenar IDs de produtos que existem no banco de dados
    const existingProductIds = new Set(products.map(product => product.ID));

    // Atualizar o Redis com produtos existentes
    for (const product of products) {
      await redisClient.hSet(`product:${product.ID}`, {
        id: product.ID.toString(),
        name: product.NAME,
        price: product.PRICE.toString(),
        description: product.DESCRIPTION,
      });
      console.log(`Produto ${product.ID} sincronizado no cache Redis.`);
    }

    // Obter todos os IDs dos produtos armazenados no Redis
    const redisKeys = await redisClient.keys('product:*');
    for (const key of redisKeys) {
      const productId = key.split(':')[1]; // Extrai o ID do produto da chave
      // Se o ID do produto não está mais no banco de dados, removê-lo do Redis
      if (!existingProductIds.has(parseInt(productId))) {
        await redisClient.del(key);
        console.log(`Produto ${productId} removido do cache Redis.`);
      }
    }

    console.log("Sincronização concluída.");
  }
}