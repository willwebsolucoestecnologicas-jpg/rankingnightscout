// A mesma API do seu painel principal!
const API_URL = "https://script.google.com/macros/s/AKfycbyNnRWfd2OZsJDH6kJTLBonPAh1CFtzgIJY368IOzjwK8enF1ku_oHnLhIuahpWBt0z/exec"; 
const LOGGED_USER = "Saymon";

const personagem = document.getElementById("kalango-personagem");
const obstaculo = document.getElementById("obstaculo");
const overlay = document.getElementById("tela-overlay");
const btnIniciar = document.getElementById("btn-iniciar");
const textoOverlay = document.getElementById("texto-overlay");
const htmlRoot = document.documentElement;

let jogoRodando = false;
let score = 0;
let loopColisao;
let loopScore;

// 1. Ao abrir a página, busca os dados da glicemia
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch(`${API_URL}?action=getDashboard&user=${LOGGED_USER}`);
        const data = await response.json();
        prepararJogo(data);
    } catch (error) {
        console.error("Erro na API", error);
        textoOverlay.innerText = "ERRO DE CONEXÃO";
    }
});

// 2. Aplica as regras de Glicemia e a Skin
function prepararJogo(data) {
    const glicemia = data.glicemia;
    const skin = data.user.avatar || '😎'; // Pega a skin do Saymon

    // Injeta a Skin no boneco
    if (skin.includes('http') || skin.includes('.')) {
        personagem.style.backgroundImage = `url('${skin}')`;
    } else {
        personagem.innerHTML = `<span style="font-size: 40px;">${skin}</span>`;
    }

    // Atualiza os textos da tela
    document.getElementById("hud-glicemia").innerText = glicemia;
    const hudStatus = document.getElementById("hud-status");

    // A MÁGICA DA FÍSICA ACONTECE AQUI:
    if (glicemia >= 70 && glicemia <= 140) {
        // NA META: O jogo fica com tempo de reação perfeito
        hudStatus.innerText = "⚡ FOCO TOTAL";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '1.8s'); // Velocidade normal
        htmlRoot.style.setProperty('--velocidade-pulo', '0.6s');      // Pulo flutuante e seguro
    } else if (glicemia > 140) {
        // ALTA: O obstáculo vem mais devagar, mas o pulo é pesado (cai rápido)
        hudStatus.innerText = "🔥 PESADO/FADIGA";
        hudStatus.style.color = "var(--high-color)";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '2.2s');
        htmlRoot.style.setProperty('--velocidade-pulo', '0.4s'); // Pulo rápido/curto
    } else {
        // BAIXA: O obstáculo vem muito rápido (difícil reagir)
        hudStatus.innerText = "❄️ VISÃO TURVA";
        hudStatus.style.color = "var(--low-color)";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '1.2s'); // Obstáculo veloz
        htmlRoot.style.setProperty('--velocidade-pulo', '0.5s');
    }

    // Libera o botão de jogar
    textoOverlay.innerText = "SISTEMAS PRONTOS";
    btnIniciar.style.display = "block";
}

// 3. Inicia a corrida
function iniciarJogo() {
    overlay.style.display = "none";
    jogoRodando = true;
    score = 0;
    document.getElementById("pontuacao").innerText = score;
    
    // Liga a animação do obstáculo vindo
    obstaculo.classList.add("animar-obstaculo");

    // Inicia os loops de verificação
    loopScore = setInterval(() => {
        score += 10;
        document.getElementById("pontuacao").innerText = score;
    }, 500);

    loopColisao = setInterval(verificarColisao, 10);
}

// 4. Mecânica do Pulo
function pular() {
    if (!jogoRodando) return;
    
    if (personagem.classList != "animar-pulo") {
        personagem.classList.add("animar-pulo");
        // Remove a classe quando a animação acaba para poder pular de novo
        setTimeout(() => {
            personagem.classList.remove("animar-pulo");
        }, 600); // 600ms é o tempo máximo de um pulo
    }
}

// 5. Verifica a batida (Colisão DOM)
function verificarColisao() {
    // Pega a posição exata das divs na tela
    let personagemRect = personagem.getBoundingClientRect();
    let obstaculoRect = obstaculo.getBoundingClientRect();

    // Lógica simples de colisão (se a caixa de um sobrepõe a caixa do outro)
    if (
        personagemRect.right > obstaculoRect.left + 10 && // Bateu na frente
        personagemRect.left < obstaculoRect.right - 10 && // Bateu atrás
        personagemRect.bottom > obstaculoRect.top + 10    // Bateu em cima
    ) {
        // GAME OVER
        obstaculo.classList.remove("animar-obstaculo");
        clearInterval(loopColisao);
        clearInterval(loopScore);
        jogoRodando = false;

        textoOverlay.innerText = "BATIDA! Score: " + score;
        btnIniciar.innerText = "TENTAR NOVAMENTE";
        overlay.style.display = "flex";
    }
}

// Adiciona evento de teclado para quem jogar no PC (Barra de espaço)
document.addEventListener('keydown', (event) => {
    if(event.code === 'Space') { pular(); }
});