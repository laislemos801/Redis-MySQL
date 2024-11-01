const apiUrl = 'http://localhost:3000/api';

async function createProduct() {
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const description = document.getElementById('productDescription').value;

    const response = await fetch(`${apiUrl}/addProduct`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, price: parseFloat(price), description }),
    });

    if (response.ok) {
        alert('Produto criado com sucesso!');
        fetchProducts(); // Atualiza a lista de produtos
    } else {
        alert('Erro ao criar produto.');
    }
}

async function fetchProducts() {
    const response = await fetch(`${apiUrl}/getAllProducts`);
    const products = await response.json();

    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    products.forEach(product => {
        const li = document.createElement('li');
        li.textContent = `ID: ${product.ID}, Nome: ${product.NAME}, Preço: R$ ${product.PRICE}, Descrição: ${product.DESCRIPTION}`;
        productList.appendChild(li);
    });
}

async function deleteProduct() {
    const productId = document.getElementById('productIdToDelete').value.trim(); // Obtém o ID do produto e remove espaços

    // Validação do ID do produto
    if (!productId) {
        alert('Por favor, insira um ID de produto válido.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/deleteProduct/${productId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            alert('Produto excluído com sucesso!');
            fetchProducts(); // Atualiza a lista de produtos
            document.getElementById('productIdToDelete').value = ''; // Limpa o campo de entrada
        } else {
            const errorData = await response.json(); // Captura dados de erro, se disponíveis
            alert(`Erro ao excluir produto: ${errorData.message || 'Erro desconhecido.'}`);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert('Erro ao excluir produto: ' + error.message); // Mensagem de erro detalhada
    }
}

// Carrega produtos ao iniciar a página
window.onload = fetchProducts;
