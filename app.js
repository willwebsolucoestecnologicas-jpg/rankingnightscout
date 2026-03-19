// Substitua por sua URL gerada ao publicar o Apps Script como Web App
const API_URL = "https://script.google.com/macros/s/AKfycbyNnRWfd2OZsJDH6kJTLBonPAh1CFtzgIJY368IOzjwK8enF1ku_oHnLhIuahpWBt0z/exec"; 
const LOGGED_USER = "Saymon"; // Em um sistema real, isso viria do Login
// =========================================================================
const TEMPO_ATUALIZACAO_MS = 60000; // Atualiza a cada 1 minuto (60.000 ms)
let vozAtivada = false;

// =========================================================================
// INICIALIZAÇÃO E LOOP DE ATUALIZAÇÃO AUTOMÁTICA
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("Iniciando Motor do Glucotchi...");
    
    // 1. Faz a primeira busca imediatamente ao abrir a página
    loadDashboardData();

    // 2. Configura o loop infinito (O "coração" do app rodando no fundo)
    setInterval(() => {
        console.log("Buscando dados atualizados do Nightscout...");
        loadDashboardData();
    }, TEMPO_ATUALIZACAO_MS);
});

// =========================================================================
// COMUNICAÇÃO COM O BACK-END (Apps Script)
// =========================================================================
async function loadDashboardData() {
    const bgElement = document.getElementById('bg-value');
    if(bgElement) bgElement.style.opacity = '0.5'; // Efeito de "carregando"

    try {
        const response = await fetch(`${API_URL}?action=getDashboard&user=${LOGGED_USER}`);
        const data = await response.json();
        
        if (data.erro) {
            console.error("Erro do servidor:", data.erro);
            document.getElementById("message").innerText = "Erro na base de dados.";
            return;
        }

        // Chama as funções para desenhar a tela
        atualizarUI(data);
        renderizarPodio(data.podio);
        
        // Dispara o J.A.R.V.I.S (Voice Coach)
        processarVoz(data.glicemia, data.trend, data.user.status, data.mensagem);

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        document.getElementById("message").innerText = "Reconectando aos satélites...";
    } finally {
        if(bgElement) bgElement.style.opacity = '1';
    }
}

// =========================================================================
// ATUALIZAÇÃO DA INTERFACE VISUAL (Neumorfismo, Neon, XP)
// =========================================================================
function atualizarUI(data) {
    const user = data.user;

    // 1. Textos Básicos e Moedas
    document.getElementById('user-name').innerText = user.nome;
    document.getElementById('coin-balance').innerText = user.coins;
    document.getElementById('avatar').innerText = user.avatar; 
    
    // 2. Glicemia, Tendência e Mensagem da IA
    const bgValueElement = document.getElementById('bg-value');
    bgValueElement.innerText = data.glicemia;
    document.getElementById('trend').innerText = data.trend;
    document.getElementById('message').innerText = `"${data.mensagem}"`;

    // 3. Efeito de Animação de Pulso ao receber novo dado
    bgValueElement.classList.add('changed');
    setTimeout(() => bgValueElement.classList.remove('changed'), 500);

    // 4. Atualiza Ofensiva (Foguinhos) - Se o HTML existir
    const streakElement = document.getElementById('streak-count');
    if(streakElement) streakElement.innerText = user.ofensiva || 0;

    // 5. Atualiza a Barra Dinâmica de XP
    const xpValueElement = document.getElementById('xp-value');
    const xpBarElement = document.getElementById('xp-bar');
    if(xpValueElement && xpBarElement) {
        const xpTotal = user.xp || 0;
        const xpLevel = xpTotal % 100; // Resto da divisão (Ex: 125 XP vira 25% da barra)
        
        xpValueElement.innerText = xpLevel;
        
        // Preenche a barra com suavidade
        setTimeout(() => {
            xpBarElement.style.width = `${xpLevel}%`;
        }, 100);
    }

    // 6. Altera as Cores Dinâmicas (Glassmorphism / Glow)
    document.body.className = `glow-${user.status}`; // Controla as partículas de fundo
    const card = document.getElementById('glucotchi-card');
    card.className = `neu-card dashboard-card status-${user.status}`;
}

// =========================================================================
// PÓDIO E BARRAS DE TIR (Tempo no Alvo)
// =========================================================================
function renderizarPodio(jogadores) {
    const container = document.getElementById('podium-container');
    if (!container) return;
    
    container.innerHTML = '';

    jogadores.forEach((jogador, index) => {
        const rank = index + 1;
        let icon = rank === 1 ? '👑' : `${rank}º`;
        
        // Lógica das Barrinhas Verdes (Máximo 5)
        const totalBars = 5;
        const activeBars = Math.round((jogador.tir / 100) * totalBars);
        
        let barsHtml = '';
        for(let i = 0; i < totalBars; i++) {
            barsHtml += `<div class="bar ${i < activeBars ? 'active' : ''}"></div>`;
        }

        const html = `
            <div class="podium-item">
                <div class="pilot-info">
                    <span style="font-weight: bold; color: var(--gold); width: 25px; display: inline-block;">${icon}</span>
                    <span style="font-size: 1.2rem; margin-right: 10px;">${jogador.avatar}</span>
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

// =========================================================================
// LOJA DE AVATARES (Modal e Integração)
// =========================================================================
function toggleStore() {
    const modal = document.getElementById('store-modal');
    if (!modal) return;
    
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

async function buyItem(avatarId, custo) {
    const currentCoins = parseInt(document.getElementById('coin-balance').innerText);
    
    if (currentCoins < custo) {
        alert("Glucocoins insuficientes! Mantenha os níveis estáveis para ganhar mais.");
        return;
    }

    const confirmacao = confirm(`Deseja comprar a skin ${avatarId} por ${custo} 🔥?`);
    if (!confirmacao) return;

    try {
        const response = await fetch(`${API_URL}?action=buyAvatar&user=${LOGGED_USER}&avatarId=${avatarId}&custo=${custo}`);
        const result = await response.json();

        if (result.sucesso) {
            alert("Skin equipada com sucesso!");
            loadDashboardData(); // Recarrega os dados imediatamente
            toggleStore(); // Fecha a janela da loja
        } else {
            alert("Falha na compra: " + result.erro);
        }
    } catch (error) {
        alert("Falha de conexão com a loja.");
    }
}

// =========================================================================
// MOTOR DE VOZ DO DRONE (Web Speech API)
// =========================================================================
function alternarVoz() {
    vozAtivada = !vozAtivada;
    const btn = document.getElementById('btn-voz');
    
    if (!btn) return;

    if (vozAtivada) {
        btn.innerText = "🔊 Voz Ativada";
        btn.style.background = "#2ecc71"; // Verde neon
        falar("Sistemas de comunicação ligados. Pronto para o voo, Saymon.");
    } else {
        btn.innerText = "🔇 Voz Desativada";
        btn.style.background = "#3498db"; // Azul escuro
        window.speechSynthesis.cancel();
    }
}

function falar(texto) {
    if (!vozAtivada || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); // Limpa a fila de falas antigas

    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.05; // Velocidade gamer
    mensagem.pitch = 1.1; // Tom levemente robótico
    
    window.speechSynthesis.speak(mensagem);
}

function processarVoz(glicemia, trend, status, mensagemIA) {
    // Evita ler os traços "--" antes de carregar
    if (isNaN(glicemia)) return;

    let alertaFisico = "";

    // Mapeamento crítico de voz para antecipar quedas/altas
    if (trend === "↓" || trend === "⇊" || trend === "↘") {
        alertaFisico = "Atenção piloto, energia em queda. ";
    } else if (trend === "↑" || trend === "⇈" || trend === "↗") {
        alertaFisico = "Aviso, calor dos motores subindo. ";
    }

    const textoFinal = `Glicemia atual: ${glicemia}. ${alertaFisico} ${mensagemIA}`;
    falar(textoFinal);
}
