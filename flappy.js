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

// ==========================================
// VARIÁVEIS DE FÍSICA (AGORA SUAVIZADAS!)
// ==========================================
let birdY = 200;
let velocity = 0;
let gravity = 0.25;       // Era 0.5 (Agora cai bem mais devagar)
let jumpStrength = -5.5;  // Era -8 (Pulo mais curto e controlado)
let pipeX = window.innerWidth;
let pipeSpeed = 3.5;      // Era 4 (Canos vêm um pouco mais lentos)
let pipeGap = 180;        // Era 150 (Buraco maior para facilitar a passagem)

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

    // LÓGICA DA GLICEMIA (Física Balanceada)
    if (glicemia >= 70 && glicemia <= 140) {
        hudStatus.innerText = "⚡ VOO PERFEITO";
        gravity = 0.25;
        jumpStrength = -5.5;
        pipeSpeed = 3.5;
        pipeGap = 180;
    } else if (glicemia > 140) {
        hudStatus.innerText = "🔥 PESADO/CAINDO RÁPIDO";
        hudStatus.style.color = "var(--high-color)";
        gravity = 0.4;        // Ainda é mais pesado, mas controlável
        jumpStrength = -7;    // Pulo compensa o peso extra
        pipeSpeed = 3;        // Mais devagar para dar tempo de pensar
        pipeGap = 210;        // Buraco bem largo pra não ser impossível
    } else {
        hudStatus.innerText = "❄️ FRAQUEZA/SEM FORÇA";
        hudStatus.style.color = "var(--low-color)";
        gravity = 0.2;        // Quase flutuando
        jumpStrength = -4.5;  // Sobe bem pouquinho (tem que bater asa rápido)
        pipeSpeed = 4.5;      // Canos velozes
        pipeGap = 170;
    }

    textoOverlay.innerText = "TUDO PRONTO!";
    btnIniciar.style.display = "block";
}

function iniciarFlappy() {
    overlay.style.display = "none";
    jogoRodando = true;
    score = 0;
    placar.innerText = score;
    
    birdY = wrapper.offsetHeight / 2;
    velocity = 0;
    pipeX = window.innerWidth;
    posicionarCanos();

    clearInterval(loopJogo);
    loopJogo = setInterval(atualizarJogo, 20);
}

function posicionarCanos() {
    let minHoleY = 80;
    let maxHoleY = wrapper.offsetHeight - pipeGap - 80;
    let holeY = Math.floor(Math.random() * (maxHoleY - minHoleY + 1)) + minHoleY;

    pipeTop.style.height = holeY + "px";
    pipeBottom.style.height = (wrapper.offsetHeight - holeY - pipeGap) + "px";
}

function pular(e) {
    if (!jogoRodando) return;
    if(e) e.preventDefault(); 
    
    velocity = jumpStrength;
    bird.style.transform = "rotate(-20deg)"; 
}

wrapper.addEventListener('touchstart', pular, {passive: false});
wrapper.addEventListener('mousedown', pular);

function atualizarJogo() {
    velocity += gravity;
    birdY += velocity;
    bird.style.top = birdY + "px";

    if (velocity > 0) {
        bird.style.transform = `rotate(${Math.min(velocity * 4, 90)}deg)`;
    }

    pipeX -= pipeSpeed;
    
    if (pipeX < -60) { 
        pipeX = window.innerWidth;
        posicionarCanos();
        score++;
        placar.innerText = score;
    }
    
    pipeTop.style.left = pipeX + "px";
    pipeBottom.style.left = pipeX + "px";

    verificarColisao();
}

function verificarColisao() {
    let birdRect = bird.getBoundingClientRect();
    let topRect = pipeTop.getBoundingClientRect();
    let bottomRect = pipeBottom.getBoundingClientRect();
    let wrapperRect = wrapper.getBoundingClientRect();

    // Uma leve "colher de chá" na colisão pra não bater na pontinha da asa
    let margemErro = 8; 

    if (birdRect.top <= wrapperRect.top || birdRect.bottom >= wrapperRect.bottom) {
        gameOver();
        return;
    }

    if (
        (birdRect.right - margemErro > topRect.left && birdRect.left + margemErro < topRect.right && birdRect.top + margemErro < topRect.bottom) ||
        (birdRect.right - margemErro > bottomRect.left && birdRect.left + margemErro < bottomRect.right && birdRect.bottom - margemErro > bottomRect.top)
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
