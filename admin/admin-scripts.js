// Função para carregar dados JSON
async function loadData(file) {
    try {
        const response = await fetch(`../data/${file}`);
        return await response.json();
    } catch (error) {
        console.error(`Erro ao carregar ${file}:`, error);
        return [];
    }
}

// Função para salvar dados JSON (simulação)
async function saveData(file, data) {
    console.log(`Salvando dados em ${file}:`, data);
    // No futuro, substituir por chamada API: fetch('/api/save', { method: 'POST', body: JSON.stringify(data) })
}
