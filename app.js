// Substitua por sua URL gerada ao publicar o Apps Script como Web App
const API_URL = "https://script.google.com/macros/s/AKfycbyNnRWfd2OZsJDH6kJTLBonPAh1CFtzgIJY368IOzjwK8enF1ku_oHnLhIuahpWBt0z/exec"; 
const LOGGED_USER = "Saymon"; // Em um sistema real, isso viria do Login

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
});

// Função para buscar dados da API
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}?action=getDashboard&user=${LOGGED_USER}`);
        const data = await response.json();
        
        atualizarUI(data);
        renderizarPodio(data.podio);
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        document.getElementById("message").innerText = "Connection error. Retrying...";
    }
}

// Atualiza a tela principal
function atualizarUI(data) {
    const card = document.getElementById('glucotchi-card');
    
    document.getElementById('user-name').innerText = data.user.nome;
    document.getElementById('coin-balance').innerText = data.user.coins;
    document.getElementById('bg-value').innerText = data.glicemia;
    document.getElementById('trend').innerText = data.trend;
    document.getElementById('message').innerText = `"${data.mensagem}"`;
    
    // Atualiza o avatar e a cor do card
    const status = data.user.status; // 'target', 'high', 'low'
    card.className = `glass-card dashboard-card status-${status}`;
    
    // Expressões faciais baseadas no status combinadas com o avatar comprado
    let expression = data.user.avatar; 
    if (status === 'high') expression = '🥵'; 
    if (status === 'low') expression = '🥶'; 
    document.getElementById('avatar').innerText = expression;
}

// Renderiza o ranking na tela
function renderizarPodio(jogadores) {
    const container = document.getElementById('podium-container');
    container.innerHTML = '';

    jogadores.forEach((jogador, index) => {
        const rank = index + 1;
        let icon = rank === 1 ? '👑' : `${rank}º`;
        
        // Calcula quantas barrinhas pintar de verde (de 1 a 5)
        const totalBars = 5;
        const activeBars = Math.round((jogador.tir / 100) * totalBars);
        
        let barsHtml = '';
        for(let i = 0; i < totalBars; i++) {
            barsHtml += `<div class="bar ${i < activeBars ? 'active' : ''}"></div>`;
        }

        const html = `
            <div class="podium-item">
                <div class="pilot-info">
                    <span style="font-weight: bold; color: var(--gold);">${icon}</span>
                    <span style="font-size: 1.2rem;">${jogador.avatar}</span>
                    <span class="pilot-name">${jogador.nome}</span>
                </div>
                <div class="tir-container">
                    <div class="tir-bars">${barsHtml}</div>
                    <span class="tir-value">${jogador.tir}%</span>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}
// Controle da Loja
function toggleStore() {
    const modal = document.getElementById('store-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

// Função para comprar avatares
async function buyItem(avatarId, custo) {
    if(!confirm(`Do you want to buy this avatar for ${custo} Glucocoins?`)) return;

    try {
        const response = await fetch(`${API_URL}?action=buyAvatar&user=${LOGGED_USER}&avatarId=${avatarId}&custo=${custo}`);
        const result = await response.json();

        if (result.sucesso) {
            alert('Avatar purchased successfully!');
            document.getElementById('coin-balance').innerText = result.novasMoedas;
            toggleStore();
            loadDashboardData(); // Recarrega para aplicar o avatar
        } else {
            alert(result.erro);
        }
    } catch (error) {
        alert("Error processing transaction.");
    }
}
