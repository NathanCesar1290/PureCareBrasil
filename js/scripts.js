// Função para carregar dados JSON
async function loadData(file) {
    try {
        const response = await fetch(`data/${file}`);
        return await response.json();
    } catch (error) {
        console.error(`Erro ao carregar ${file}:`, error);
        return [];
    }
}

// Carregar produtos, categorias, etc., ao iniciar a página
window.onload = async () => {
    const products = await loadData('products.json');
    const categories = await loadData('categories.json');
    renderProducts(products);
    renderCategories(categories);
};

// Função para renderizar produtos (exemplo para a seção de Ofertas)
function renderProducts(products) {
    const offersContainer = document.querySelector('#offers .grid');
    if (offersContainer) {
        offersContainer.innerHTML = products.map(p => `
            <div class="product-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300">
                <div class="relative">
                    <img src="${p.image}" alt="${p.name}" class="w-full h-48 object-cover">
                    <div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-${p.discount}%</div>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-1">${p.name}</h3>
                    <div class="flex items-center mb-2">
                        <div class="flex text-yellow-400">
                            ${getStars(p.rating)}
                        </div>
                        <span class="text-gray-600 text-sm ml-2">(${p.reviews})</span>
                    </div>
                    <div class="flex items-center">
                        <span class="text-red-500 font-bold text-xl">R$ ${p.price.toFixed(2)}</span>
                        <span class="text-gray-500 text-sm line-through ml-2">R$ ${p.oldPrice.toFixed(2)}</span>
                    </div>
                    <button class="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded add-to-cart" 
                            data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image}">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Função para renderizar categorias (exemplo)
function renderCategories(categories) {
    const categoriesContainer = document.querySelector('#categories .grid');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = categories.map(c => `
            <div class="category_CARD bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                <div class="relative h-48 overflow-hidden">
                    <img src="${c.image}" alt="${c.name}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black bg-opacity-30 flex items-end p-4">
                        <h3 class="text-white text-xl font-semibold">${c.name}</h3>
                    </div>
                </div>
                <div class="p-4">
                    <a href="#" class="text-blue-500 hover:text-blue-700 font-medium">Ver produtos →</a>
                </div>
            </div>
        `).join('');
    }
}

// Função auxiliar para estrelas de avaliação
function getStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - rating < 1) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}
