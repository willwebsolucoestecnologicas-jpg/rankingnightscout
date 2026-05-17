const API_URL = "https://script.google.com/macros/s/AKfycbyNnRWfd2OZsJDH6kJTLBonPAh1CFtzgIJY368IOzjwK8enF1ku_oHnLhIuahpWBt0z/exec"; 
const LOGGED_USER = "Saymon";

const wrapper = document.getElementById("flappy-wrapper");
const bird = document.getElementById("flappy-bird");
const pipeTop = document.getElementById("pipe-top");
const pipeBottom = document.getElementById("pipe-bottom");
const overlay = document.getElementById("tela-overlay-flappy");
const btnIniciar = document.getElementById("btn-iniciar-flappy");
const textoOverlay = document.getElementById("texto-overlay-flappy");
const placar = document.getElementById("pontuacao-flappy");

let jogoRodando = false;
let score = 0;
let loopJogo;

// Variáveis de Física (Elas mudam conforme a glicemia)
let birdY = 200;
let velocity = 0;
let gravity = 0.5;
let jumpStrength = -8;
let pipeX = window.innerWidth;
let pipeSpeed = 4;
let pipeGap = 150; // Espaço do buraco entre os tubos

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch(`${API_URL}?action=getDashboard&user=${LOGGED_USER}`);
        const data = await response.json();
        prepararJogo(data);
    } catch (error) {
        textoOverlay.innerText = "ERRO DE CONEXÃO";
    }
});

function prepararJogo(data) {
    if (data.erro) {
        textoOverlay.innerText = "ERRO: " + data.erro;
        return;
    }

    const glicemia = data.glicemia;
    const skin = data.user.avatar || '😎';

    if (skin.includes('http') || skin.includes('.')) {
        bird.style.backgroundImage = `url('${skin}')`;
    } else {
        bird.innerHTML = `<span style="font-size: 40px;">${skin}</span>`;
    }

    document.getElementById("hud-glicemia").innerText = glicemia;
    const hudStatus = document.getElementById("hud-status");

    // LÓGICA DA GLICEMIA (Mudando a Física do Flappy Bird)
    if (glicemia >= 70 && glicemia <= 140) {
        hudStatus.innerText = "⚡ VOO PERFEITO";
        gravity = 0.5;
        jumpStrength = -8;
        pipeSpeed = 4.5;
        pipeGap = 160;
    } else if (glicemia > 140) {
        hudStatus.innerText = "🔥 PESADO/CAINDO RÁPIDO";
        hudStatus.style.color = "var(--high-color)";
        gravity = 0.8; // Gravidade muito forte (cai igual pedra)
        jumpStrength = -10; // Pulo tem que ser forte para compensar
        pipeSpeed = 4;
        pipeGap = 180; // Buraco maior para não ficar impossível
    } else {
        hudStatus.innerText = "❄️ FRAQUEZA/SEM FORÇA";
        hudStatus.style.color = "var(--low-color)";
        gravity = 0.4;
        jumpStrength = -6; // Pulo fraco (sobe pouco a cada toque)
        pipeSpeed = 6; // Tubos vêm mais rápido (simula desespero)
        pipeGap = 150;
    }

    textoOverlay.innerText = "TUDO PRONTO!";
    btnIniciar.style.display = "block";
}

function iniciarFlappy() {
    overlay.style.display = "none";
    jogoRodando = true;
    score = 0;
    placar.innerText = score;
    
    // Posições Iniciais
    birdY = wrapper.offsetHeight / 2;
    velocity = 0;
    pipeX = window.innerWidth;
    posicionarCanos();

    // Inicia o motor a 50 frames por segundo
    clearInterval(loopJogo);
    loopJogo = setInterval(atualizarJogo, 20);
}

function posicionarCanos() {
    // Sorteia a altura do buraco
    let minHoleY = 100;
    let maxHoleY = wrapper.offsetHeight - pipeGap - 100;
    let holeY = Math.floor(Math.random() * (maxHoleY - minHoleY + 1)) + minHoleY;

    pipeTop.style.height = holeY + "px";
    pipeBottom.style.height = (wrapper.offsetHeight - holeY - pipeGap) + "px";
}

// Mecânica do Toque na Tela
function pular(e) {
    if (!jogoRodando) return;
    if(e) e.preventDefault(); // Evita dar zoom na tela sem querer
    
    velocity = jumpStrength;
    bird.style.transform = "rotate(-20deg)"; // Bico pra cima ao pular
}

wrapper.addEventListener('touchstart', pular);
wrapper.addEventListener('mousedown', pular);

function atualizarJogo() {
    // 1. FÍSICA DO PÁSSARO (Gravidade agindo)
    velocity += gravity;
    birdY += velocity;
    bird.style.top = birdY + "px";

    // Suaviza a rotação do bico caindo
    if (velocity > 0) {
        bird.style.transform = `rotate(${Math.min(velocity * 3, 90)}deg)`;
    }

    // 2. MOVIMENTO DOS CANOS
    pipeX -= pipeSpeed;
    
    // Se o cano passou da tela, reseta ele lá na direita e marca o gol
    if (pipeX < -60) { // 60 é a largura do cano
        pipeX = window.innerWidth;
        posicionarCanos();
        score++;
        placar.innerText = score;
    }
    
    pipeTop.style.left = pipeX + "px";
    pipeBottom.style.left = pipeX + "px";

    // 3. COLISÕES FATAAAAIS
    verificarColisao();
}

function verificarColisao() {
    let birdRect = bird.getBoundingClientRect();
    let topRect = pipeTop.getBoundingClientRect();
    let bottomRect = pipeBottom.getBoundingClientRect();
    let wrapperRect = wrapper.getBoundingClientRect();

    // Bateu no teto ou caiu no chão
    if (birdRect.top <= wrapperRect.top || birdRect.bottom >= wrapperRect.bottom) {
        gameOver();
        return;
    }

    // Bateu nos canos de cima ou de baixo
    if (
        (birdRect.right > topRect.left && birdRect.left < topRect.right && birdRect.top < topRect.bottom) ||
        (birdRect.right > bottomRect.left && birdRect.left < bottomRect.right && birdRect.bottom > bottomRect.top)
    ) {
        gameOver();
    }
}

function gameOver() {
    jogoRodando = false;
    clearInterval(loopJogo);
    textoOverlay.innerText = "BATIDA! Score: " + score;
    btnIniciar.innerText = "TENTAR DE NOVO";
    overlay.style.display = "flex";
}