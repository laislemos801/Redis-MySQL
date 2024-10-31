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
      return cachedProduct as Product; // Retorna o produto do cache
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
                  price: product.PRICE,
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

              if (product) {
                await redisClient.hSet(`product:${product.ID}`, {
                  id: product.ID.toString(),
                  name: product.NAME,
                  price: product.PRICE,
                  description: product.DESCRIPTION,
                });
                console.log("Produto adicionado ao Redis com chave:", `product:${product.ID}`, "com dados:", product);
              }
              resolve(product!);
            } catch (error) {
              console.error("Erro ao recuperar produto após inserção:", error);
              reject(error);
            }
          }
        }
      );
    });
  }

  async update(p: Product): Promise<Product | undefined> {
    console.log("Tentando atualizar produto:", p);
    return new Promise((resolve, reject) => {
      conn.query<ResultSetHeader>(
        "UPDATE PRODUCTS SET NAME = ?, PRICE = ?, DESCRIPTION = ? WHERE ID = ?",
        [p.name, p.price, p.description, p.id],
        async (err, res) => {
          if (err) {
            console.error("Erro ao atualizar produto:", err);
            reject(err);
          } else {
            console.log(`Produto com ID ${p.id} atualizado com sucesso.`);
            const product = await this.getById(p.id!);
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
        }
      );
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
