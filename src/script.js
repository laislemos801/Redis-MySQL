const apiUrl = 'http://localhost:3000/api';

document.getElementById('syncButton').addEventListener('click', async () => {
    try {
        const response = await fetch('http://127.0.0.1:3000/api/sync', { method: 'GET' });

        if (!response.ok) throw new Error('Erro ao sincronizar');
        const data = await response.json();
        alert(data.message);  // Mostra a mensagem de sucesso
        fetchProducts();
    } catch (error) {
        console.error("Erro durante a sincronização:", error);
        alert("Ocorreu um erro durante a sincronização. Confira o console para mais detalhes.");
    }
});

async function createProduct() {
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const description = document.getElementById('productDescription').value;

    const response = await fetch(`http://127.0.0.1:3000/api/addProduct`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, price: parseFloat(price), description }),
    });

    if (response.ok) {
        alert('Produto criado com sucesso!');
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productDescription').value = '';
        fetchProducts(); // Atualiza a lista de produtos
    } else {
        alert('Erro ao criar produto.');
    }
}

async function fetchProducts() {
    const response = await fetch(`http://127.0.0.1:3000/api/getAllProducts`);
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
    const productId = document.getElementById('productIdToDelete').value.trim();

    if (!productId) {
        alert('Por favor, insira um ID de produto válido.');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:3000/api/deleteProduct/${productId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            alert('Produto excluído com sucesso!');
            fetchProducts(); // Atualiza a lista de produtos
            document.getElementById('productIdToDelete').value = ''; // Limpa o campo de entrada
        } else if (response.status === 404) {
            alert('Produto não encontrado.');
        } else {
            const errorData = await response.json();
            alert(`Erro ao excluir produto: ${errorData.message || 'Erro desconhecido.'}`);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert('Erro ao excluir produto: ' + error.message);
    }
}

async function updateProduct() {
    const id = document.getElementById('productIdToUpdate').value.trim();
    const name = document.getElementById('newProductName').value;
    const price = document.getElementById('newProductPrice').value;
    const description = document.getElementById('newProductDescription').value;

    if (!id || !name || !price || !description) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:3000/api/updateProduct/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                price: parseFloat(price),
                description
            }),
        });

        if (response.ok) {
            alert('Produto alterado com sucesso!');
            fetchProducts(); // Atualiza a lista de produtos
            document.getElementById('productIdToUpdate').value = ''; // Limpa o campo de entrada
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductPrice').value = '';
            document.getElementById('newProductDescription').value = '';
        } else {
            const errorData = await response.json();
            alert(`Erro ao alterar produto: ${errorData.message || 'Erro desconhecido.'}`);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert('Erro ao alterar produto: ' + error.message);
    }
}

// Carrega produtos ao iniciar a página
window.onload = fetchProducts;
