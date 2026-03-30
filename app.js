//URL DO APPS SCRIPT:
const API_URL = "https://script.google.com/macros/s/AKfycbyNnRWfd2OZsJDH6kJTLBonPAh1CFtzgIJY368IOzjwK8enF1ku_oHnLhIuahpWBt0z/exec"; 
const LOGGED_USER = "Saymon";
const TEMPO_ATUALIZACAO_MS = 60000; 
let vozAtivada = false;
let meuGrafico = null; 

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
    setInterval(loadDashboardData, TEMPO_ATUALIZACAO_MS);
});

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}?action=getDashboard&user=${LOGGED_USER}`);
        const data = await response.json();
        
        if (data.erro) { console.error("Erro do servidor:", data.erro); return; }

        atualizarUI(data);
        renderizarPodio(data.podio);
        
        if (data.user.historico) renderizarGrafico(data.user.historico);
        
        processarVoz(data.glicemia, data.trend, data.user.status, data.mensagem);
    } catch (error) { console.error("Erro ao conectar:", error); }
}

function mudarAba(idAba, elementoBotao) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.getElementById(idAba).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    elementoBotao.classList.add('active');
}

function atualizarUI(data) {
    const user = data.user;

    document.getElementById('user-name').innerText = user.nome;
    document.getElementById('coin-balance').innerText = user.coins;
    
    // ==========================================
    // O MOTOR DE IMAGENS DO AVATAR PRINCIPAL
    // ==========================================
    const avatarDiv = document.getElementById('avatar');
    const skinAtual = user.avatar || '😎';
    
    // Se a skin salva na planilha for um link (http) ou tiver extensão (.png), renderiza como IMAGEM
    if (skinAtual.includes('http') || skinAtual.includes('.')) {
        avatarDiv.innerHTML = `<img src="${skinAtual}" class="avatar-real" alt="Avatar">`;
    } else {
        // Se for só um texto/emoji antigo, renderiza como TEXTO
        avatarDiv.innerHTML = `<span class="avatar-emoji">${skinAtual}</span>`;
    }

    document.getElementById('bg-value').innerText = data.glicemia;
    document.getElementById('trend').innerText = data.trend;
    document.getElementById('message').innerText = `"${data.mensagem}"`;

    if(document.getElementById('streak-count')) document.getElementById('streak-count').innerText = user.ofensiva || 0;

    if(document.getElementById('xp-value')) {
        const xpTotal = user.xp || 0;
        const xpLevel = xpTotal % 100; 
        document.getElementById('xp-value').innerText = xpLevel;
        document.getElementById('xp-bar').style.width = `${xpLevel}%`;
    }

    document.body.className = `glow-${user.status}`; 
    document.getElementById('glucotchi-card').className = `neu-card dashboard-card status-${user.status}`;
}

function renderizarGrafico(historicoData) {
    if (!historicoData || historicoData.length === 0) return;
    const labels = historicoData.map(item => item.hora);
    const valores = historicoData.map(item => item.valor);
    const ctx = document.getElementById('glicemiaChart').getContext('2d');
    
    if (meuGrafico) meuGrafico.destroy(); 
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.5)'); 
    gradient.addColorStop(1, 'rgba(46, 204, 113, 0.0)'); 

    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Glicemia', data: valores, borderColor: '#2ecc71', borderWidth: 3,
                backgroundColor: gradient, fill: true, tension: 0.4,
                pointBackgroundColor: '#fff', pointBorderColor: '#2ecc71', pointRadius: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: {
                y: { min: 40, max: 300, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888', maxTicksLimit: 6 } }
            }
        }
    });
}

function toggleStore() {
    const modal = document.getElementById('store-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
}

async function buyItem(avatarId, custo) {
    const currentCoins = parseInt(document.getElementById('coin-balance').innerText);
    if (currentCoins < custo) { alert("Glucocoins insuficientes!"); return; }
    if (!confirm(`Comprar esta skin por ${custo} 🔥?`)) return;

    try {
        const response = await fetch(`${API_URL}?action=buyAvatar&user=${LOGGED_USER}&avatarId=${encodeURIComponent(avatarId)}&custo=${custo}`);
        const result = await response.json();
        if (result.sucesso) {
            alert("Skin Equipada!");
            loadDashboardData(); 
            toggleStore(); 
        } else { alert("Erro: " + result.erro); }
    } catch (e) { alert("Falha na loja."); }
}

function renderizarPodio(jogadores) {
    const container = document.getElementById('podium-container');
    if (!container) return;
    container.innerHTML = '';
    
    jogadores.forEach((jogador, index) => {
        let icon = index === 0 ? '👑' : `${index + 1}º`;
        const activeBars = Math.round((jogador.tir / 100) * 5);
        let barsHtml = '';
        for(let i = 0; i < 5; i++) barsHtml += `<div class="bar ${i < activeBars ? 'active' : ''}"></div>`;

        // ==========================================
        // O MOTOR DE IMAGENS DO PÓDIO
        // ==========================================
        let avatarTag = (jogador.avatar.includes('http') || jogador.avatar.includes('.'))
            ? `<img src="${jogador.avatar}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: contain; background: rgba(255,255,255,0.05);">` 
            : `<span style="font-size: 1.2rem;">${jogador.avatar}</span>`;

        container.innerHTML += `
            <div class="podium-item">
                <div class="pilot-info">
                    <span style="font-weight: bold; color: var(--gold); width: 25px; display: inline-block;">${icon}</span>
                    <span style="margin-right: 10px; display: flex; align-items: center; justify-content: center; width: 35px; height: 35px;">${avatarTag}</span>
                    <span class="pilot-name">${jogador.nome}</span>
                </div>
                <div class="tir-container">
                    <div class="tir-bars">${barsHtml}</div>
                    <span class="tir-value">${jogador.tir}%</span>
                </div>
            </div>`;
    });
}

function alternarVoz() {
    vozAtivada = !vozAtivada;
    const btn = document.getElementById('btn-voz');
    if (vozAtivada) {
        btn.innerText = "🔊"; btn.style.background = "#2ecc71"; 
        falar("Sistemas ligados. Olá, Saymon.");
    } else {
        btn.innerText = "🔇"; btn.style.background = "#3498db"; 
        window.speechSynthesis.cancel();
    }
}

function falar(texto) {
    if (!vozAtivada || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR'; mensagem.rate = 1.05; 
    window.speechSynthesis.speak(mensagem);
}

function processarVoz(glicemia, trend, status, mensagemIA) {
    if (isNaN(glicemia)) return;
    let alertaFisico = "";
    if (["↓", "⇊", "↘"].includes(trend)) alertaFisico = "Atenção piloto, energia em queda. ";
    else if (["↑", "⇈", "↗"].includes(trend)) alertaFisico = "Aviso, calor subindo. ";
    falar(`Glicemia em ${glicemia}. ${alertaFisico} ${mensagemIA}`);
}

// =========================================================================
// DIÁRIO DE BORDO NARRATIVO (TEMA DRAGON BALL Z)
// =========================================================================
function gerarNarrativa(historico) {
    const logContainer = document.getElementById('narrativa-log');
    if (!logContainer || !historico || historico.length === 0) return;

    logContainer.innerHTML = ""; // Limpa para atualizar

    // Pegamos os últimos 8 eventos para mostrar no pergaminho
    const eventos = historico.slice(-8); 

    eventos.forEach((ponto) => {
        let acao = "";
        let icone = "";
        const valor = ponto.valor;
        const hora = ponto.hora;

        // --- MÁGICA DO SORTEIO (MATH.RANDOM) PARA NÃO FICAR REPETITIVO ---

        if (valor > 180) { // ALTA (Inimigos)
            const frasesHigh = [
                `Freeza lançou um ataque de Hiperglicemia (${valor})! Prepare a contra-ofensiva!`,
                `O poder do inimigo passou de 180! (Está em ${valor}). Beba água e mantenha a calma para o combate.`,
                `Alerta do Radar do Dragão: Anomalia de Ki detectada (${valor}). Hora de usar sua técnica especial!`
            ];
            acao = frasesHigh[Math.floor(Math.random() * frasesHigh.length)];
            icone = "🔥";

        } else if (valor < 70) { // BAIXA (Perigo de vida/Semente dos Deuses)
            const frasesLow = [
                `Energia vital caindo para ${valor}! Coma uma Semente dos Deuses (carboidrato) agora!`,
                `Atenção! Ki quase esgotado (${valor}). Rápido, precisamos de recarga de ação rápida!`,
                `O inimigo drenou sua energia! Alerta vermelho (${valor}), coma algo urgente para não cair em batalha!`
            ];
            acao = frasesLow[Math.floor(Math.random() * frasesLow.length)];
            icone = "❄️";

        } else if (valor >= 70 && valor <= 140) { // ALVO PERFEITO (Super Saiyajin)
            const frasesTarget = [
                `Incrível! Controle de Ki perfeito em ${valor}. É o poder do Super Saiyajin!`,
                `Radar limpo. Glicemia cravada em ${valor}. Até o Senhor Bills está impressionado!`,
                `Equilíbrio mestre de energia (${valor}). Você está dominando o Instinto Superior!`
            ];
            acao = frasesTarget[Math.floor(Math.random() * frasesTarget.length)];
            icone = "⚡";

        } else { // 141 a 180 (Atenção / Oscilação normal)
            const frasesBorder = [
                `Ki subindo levemente (${valor}). Mantenha a guarda alta e observe o radar!`,
                `Pequena oscilação de poder detectada (${valor}). O treino está fazendo efeito, continue focando!`,
                `Tudo sob controle (${valor}), mas não baixe a guarda, Guerreiro Z!`
            ];
            acao = frasesBorder[Math.floor(Math.random() * frasesBorder.length)];
            icone = "🟢";
        }

        const itemHTML = `
            <div class="narrativa-item">
                <small style="color: var(--text-muted)">[${hora}]</small><br>
                ${icone} ${acao}
            </div>
        `;
        logContainer.innerHTML += itemHTML;
    });

    // Faz a barra de rolagem descer automaticamente para a mensagem mais recente
    logContainer.scrollTop = logContainer.scrollHeight;
}
