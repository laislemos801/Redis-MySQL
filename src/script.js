// URL da API local
const apiUrl = 'http://localhost:3000/api';

// Adiciona um ouvinte de evento para o botão de sincronização
document.getElementById('syncButton').addEventListener('click', async () => {
    try {
        // Faz uma requisição GET para sincronizar dados
        const response = await fetch('http://127.0.0.1:3000/api/sync', { method: 'GET' });

         // Verifica se a resposta foi bem-sucedida
        if (!response.ok) throw new Error('Erro ao sincronizar');
        // Converte a resposta em JSON
        const data = await response.json();
        alert(data.message);  // Mostra a mensagem de sucesso
        fetchProducts();  // Atualiza a lista de produtos após a sincronização
    } catch (error) {
        // Trata erros e exibe mensagem ao usuário
        console.error("Erro durante a sincronização:", error);
        alert("Ocorreu um erro durante a sincronização. Confira o console para mais detalhes.");
    }
});

// Função para criar um novo produto
async function createProduct() {
    // Obtém os valores dos campos de entrada
    const name = document.getElementById('productName').value.trim();
    const price = document.getElementById('productPrice').value.trim();
    const description = document.getElementById('productDescription').value.trim();

    // Valida os campos de entrada
    if (!name || !price || !description) {
        alert('Por favor, preencha todos os campos.'); // Mensagem de erro
        return;
    }

    // Verifica se o preço é um número válido
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
        alert('Por favor, insira um preço válido.'); // Mensagem de erro para preço inválido
        return;
    }

    // Faz uma requisição POST para adicionar o produto
    const response = await fetch(`http://127.0.0.1:3000/api/addProduct`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Define o tipo de conteúdo como JSON
        },
        // Converte os dados do produto em JSON
        body: JSON.stringify({ name, price: parseFloat(price), description }),
    });

    // Verifica se a criação do produto foi bem-sucedida
    if (response.ok) {
        alert('Produto criado com sucesso!'); // Mensagem de sucesso
        // Limpa os campos de entrada
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productDescription').value = '';
        fetchProducts(); // Atualiza a lista de produtos
    } else {
        alert('Erro ao criar produto.'); // Mensagem de erro
    }
}

// Função para buscar todos os produtos
async function fetchProducts() {
    // Faz uma requisição GET para obter todos os produtos
    const response = await fetch(`http://127.0.0.1:3000/api/getAllProducts`);
    const products = await response.json(); // Converte a resposta em JSON

    const productList = document.getElementById('productList'); // Obtém o elemento da lista de produtos
    productList.innerHTML = ''; // Limpa a lista de produtos

    // Itera sobre os produtos e os adiciona à lista
    products.forEach(product => {
        const li = document.createElement('li'); // Cria um novo elemento de lista
    
        // Adiciona uma classe para estilização do item de lista
        li.classList.add('product-item');
    
        // Define o conteúdo do elemento em uma linha
        li.innerHTML = `
            <span><strong>ID:</strong> ${product.ID}</span> | 
            <span><strong>Nome:</strong> ${product.NAME}</span> | 
            <span><strong>Preço:</strong> R$ ${product.PRICE}</span> | 
            <span><strong>Descrição:</strong> ${product.DESCRIPTION}</span>
        `;
    
        // Adiciona o item à lista
        productList.appendChild(li);
    });    
}

// Função para excluir um produto
async function deleteProduct() {
    const productId = document.getElementById('productIdToDelete').value.trim(); // Obtém o ID do produto a ser excluído

    // Verifica se o ID é válido
    if (!productId) {
        alert('Por favor, insira um ID de produto válido.');
        return;
    }

    try {
        // Faz uma requisição DELETE para excluir o produto
        const response = await fetch(`http://127.0.0.1:3000/api/deleteProduct/${productId}`, {
            method: 'DELETE',
        });

        // Verifica se a exclusão foi bem-sucedida
        if (response.ok) {
            alert('Produto excluído com sucesso!'); // Mensagem de sucesso
            fetchProducts(); // Atualiza a lista de produtos
            document.getElementById('productIdToDelete').value = ''; // Limpa o campo de entrada
        } else {
            const errorData = await response.json(); // Converte a resposta de erro em JSON
            alert(`Erro ao excluir produto: ${errorData.message || 'Erro desconhecido.'}`); // Mensagem de erro
        }
    } catch (error) {
        // Trata erros e exibe mensagem ao usuário
        console.error("Erro na requisição:", error);
        alert('Erro ao excluir produto: ' + error.message);
    }
}

// Função para atualizar um produto
async function updateProduct() {
    const id = document.getElementById('productIdToUpdate').value.trim(); // Obtém o ID do produto a ser atualizado
    const name = document.getElementById('newProductName').value;  // Obtém o novo nome do produto
    const price = document.getElementById('newProductPrice').value; // Obtém o novo preço do produto
    const description = document.getElementById('newProductDescription').value; // Obtém a nova descrição do produto

     // Verifica se todos os campos foram preenchidos
    if (!id || !name || !price || !description) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    try {
        // Faz uma requisição PUT para atualizar o produto
        const response = await fetch(`http://127.0.0.1:3000/api/updateProduct/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json', // Define o tipo de conteúdo como JSON
            },
            // Converte os dados atualizados do produto em JSON
            body: JSON.stringify({
                name,
                price: parseFloat(price),
                description
            }),
        });

        // Verifica se a atualização foi bem-sucedida
        if (response.ok) {
            alert('Produto alterado com sucesso!'); // Mensagem de sucesso
            fetchProducts(); // Atualiza a lista de produtos
            // Limpa os campos de entrada
            document.getElementById('productIdToUpdate').value = '';
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductPrice').value = '';
            document.getElementById('newProductDescription').value = '';
        } else if (response.status === 404) {
            alert('Erro: Produto não encontrado.');
        } else {
            const errorData = await response.json(); // Converte a resposta de erro em JSON
            alert(`Erro ao alterar produto: ${errorData.message || 'Erro desconhecido.'}`); // Mensagem de erro
        }
    } catch (error) {
        // Trata erros e exibe mensagem ao usuário
        console.error("Erro na requisição:", error);
        alert('Erro ao alterar produto: ' + error.message);
    }
}

// Carrega produtos ao iniciar a página
window.onload = fetchProducts; // Chama a função para buscar produtos ao carregar a página
