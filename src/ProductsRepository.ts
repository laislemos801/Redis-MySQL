import { ResultSetHeader } from "mysql2";
import { conn } from "./db";
import { Product } from "./product";
import { createClient } from "redis";

// Configuração do Redis
const redisClient = createClient();
redisClient.connect();

export class ProductsRepository {
  constructor() {
    
    console.log("Inicializando ProductsRepository...");
    // Carregar cache no Redis quando o servidor inicia
    this.loadCache();
  }

  async loadCache(): Promise<void> {
    console.log("Carregando produtos do banco de dados para o Redis...");
    const products = await this.getAll(); // Função para carregar os produtos diretamente do banco
    products.forEach((product) => {
      if (product.ID) { // Usando 'ID' em vez de 'id'
        redisClient.hSet(`product:${product.ID}`, {
          id: product.ID.toString(), // Armazenando como string
          name: product.NAME, // Usando 'NAME'
          price: product.PRICE, // Usando 'PRICE'
          description: product.DESCRIPTION, // Usando 'DESCRIPTION'
        }); // Armazenar cada produto no Redis
        console.log(`Produto ${product.ID} adicionado ao cache Redis.`);
      } else {
        console.warn(`Produto sem ID encontrado: ${JSON.stringify(product)}`);
      }
    });
    console.log("Cache carregado com sucesso.");
  }

  public getAll(): Promise<Product[]> {
    console.log("Buscando todos os produtos do banco de dados...");
    return new Promise((resolve, reject) => {
      conn.query<Product[]>("SELECT * FROM PRODUCTS", (err, res) => {
        if (err) {
          console.error("Erro ao buscar produtos:", err);
          reject(err);
        } else {
          console.log(`Total de produtos encontrados: ${res.length}`);
          resolve(res);
        }
      });
    });
  }

  async getById(product_id: number): Promise<Product | undefined> {
    const cachedProduct = await redisClient.hGetAll(`product:${product_id}`);
    if (Object.keys(cachedProduct).length) {
        // Converta os valores de string de volta para um objeto Product
        return {
            ID: parseInt(cachedProduct.id),
            NAME: cachedProduct.name,
            PRICE: parseFloat(cachedProduct.price),
            DESCRIPTION: cachedProduct.description,
        } as Product; // Retorna o produto do cache
    } else {
        // Busca no banco e armazena no cache
        return new Promise((resolve, reject) => {
            conn.query<Product[]>(
                "SELECT * FROM PRODUCTS WHERE ID = ?",
                [product_id],
                (err, res) => {
                    if (err) reject(err);
                    else {
                        const product = res?.[0];
                        if (product) {
                            redisClient.hSet(`product:${product.ID}`, {
                                id: product.ID.toString(),
                                name: product.NAME,
                                price: product.PRICE.toString(), // Certifique-se de que o preço é uma string
                                description: product.DESCRIPTION,
                            }); // Armazena no Redis
                        }
                        resolve(product);
                    }
                }
            );
        });
    }
}

  async create(p: Product): Promise<Product> {
    console.log("Tentando inserir produto:", p);
    return new Promise((resolve, reject) => {
        conn.query<ResultSetHeader>(
            "INSERT INTO PRODUCTS (NAME, PRICE, DESCRIPTION) VALUES(?,?,?)",
            [p.name, p.price, p.description],
            async (err, res) => {
                if (err) {
                    console.error("Erro ao inserir produto:", err);
                    reject(err);
                } else {
                    console.log("Produto inserido com sucesso, ID:", res.insertId);
                    try {
                        const product = await this.getById(res.insertId);
                        console.log("Produto recuperado do banco de dados:", product);

                        // Verificação para garantir que `product` não é undefined
                        if (product && product.ID) {
                            await redisClient.hSet(`product:${product.ID}`, {
                                id: product.ID.toString(),
                                name: product.NAME,
                                price: product.PRICE,
                                description: product.DESCRIPTION,
                            });
                            console.log("Produto adicionado ao Redis com chave:", `product:${product.ID}`, "com dados:", product);
                            resolve(product);
                        } else {
                            console.error(`Produto com ID ${res.insertId} não encontrado após inserção.`);
                            reject(new Error(`Produto com ID ${res.insertId} não encontrado após inserção.`));
                        }
                    } catch (error) {
                        console.error("Erro ao recuperar produto após inserção:", error);
                        reject(error);
                    }
                }
            }
        );
    });
  }

  async update(id: number, data: Partial<Product>): Promise<Product | undefined> {
    console.log("Tentando atualizar produto com ID:", id, "Novos dados:", data);

    // Se não houver campos para atualizar, rejeitar a operação.
    if (!data.name && !data.price && !data.description) {
        throw new Error("Pelo menos um campo deve ser fornecido para atualização.");
    }

    return new Promise((resolve, reject) => {
        // Construir a query dinâmica com os campos que foram fornecidos
        const updates: string[] = [];
        const values: (string | number)[] = [];

        if (data.name) {
            updates.push("NAME = ?");
            values.push(data.name);
        }
        if (data.price) {
            updates.push("PRICE = ?");
            values.push(data.price);
        }
        if (data.description) {
            updates.push("DESCRIPTION = ?");
            values.push(data.description);
        }
        
        // Adicionar o ID no final da lista de valores
        values.push(id);

        const query = `UPDATE PRODUCTS SET ${updates.join(", ")} WHERE ID = ?`;

        conn.query<ResultSetHeader>(query, values, async (err, res) => {
            if (err) {
                console.error("Erro ao atualizar produto:", err);
                reject(err);
            } else {
                console.log(`Produto com ID ${id} atualizado com sucesso.`);
                const product = await this.getById(id); // Usar o ID diretamente
                if (product) {
                    redisClient.hSet(`product:${product.ID}`, {
                        id: product.ID.toString(),
                        name: product.NAME,
                        price: product.PRICE,
                        description: product.DESCRIPTION,
                    });
                    console.log(`Produto ${product.ID} atualizado no cache Redis.`);
                }
                resolve(product);
            }
        });
    });
  }

  async delete(product_id: number): Promise<number> {
    console.log(`Tentando deletar produto com ID: ${product_id}...`);
    return new Promise((resolve, reject) => {
      conn.query<ResultSetHeader>(
        "DELETE FROM PRODUCTS WHERE ID = ?",
        [product_id],
        async (err, res) => {
          if (err) {
            console.error("Erro ao deletar produto:", err);
            reject(err);
          } else {
            console.log(`Produto com ID ${product_id} deletado com sucesso.`);
            await redisClient.del(`product:${product_id}`);
            console.log(`Produto com ID ${product_id} removido do cache Redis.`);
            resolve(res.affectedRows);
          }
        }
      );
    });
  }
}
