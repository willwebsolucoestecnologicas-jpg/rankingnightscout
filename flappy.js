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

// Variáveis de Física Suavizadas
let birdY = 200;
let velocity = 0;
let gravity = 0.25;       
let jumpStrength = -5.5;  
let pipeX = window.innerWidth;
let pipeSpeed = 3.5;      
let pipeGap = 180;        

// ==========================================
// 🔊 MOTOR DE ÁUDIO 8-BIT (Sintetizador JS)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarSom(tipo) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (tipo === 'pulo') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Volume baixo
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (tipo === 'ponto') {
        osc.type = 'sine'; // Som de moedinha aguda
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (tipo === 'batida') {
        osc.type = 'sawtooth'; // Som rasgado/explosão
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// ==========================================
// 🗣️ MOTOR DE VOZ (Leitor de Glicemia)
// ==========================================
let loopVoz;
let glicemiaAtualVoz = "--";

function falarGlicemia() {
    if (glicemiaAtualVoz === "--" || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Corta falas encavaladas
    const mensagem = new SpeechSynthesisUtterance(`Atenção, Saymon. Sua glicemia está em ${glicemiaAtualVoz}.`);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.1; // Velocidade da fala
    window.speechSynthesis.speak(mensagem);
}


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
    glicemiaAtualVoz = glicemia; // Salva o valor para a voz
    const skin = data.user.avatar || '😎';

    if (skin.includes('http') || skin.includes('.')) {
        bird.style.backgroundImage = `url('${skin}')`;
    } else {
        bird.innerHTML = `<span style="font-size: 40px;">${skin}</span>`;
    }

    document.getElementById("hud-glicemia").innerText = glicemia;
    const hudStatus = document.getElementById("hud-status");

    if (glicemia >= 70 && glicemia <= 140) {
        hudStatus.innerText = "⚡ VOO PERFEITO";
        gravity = 0.25; jumpStrength = -5.5; pipeSpeed = 3.5; pipeGap = 180;
    } else if (glicemia > 140) {
        hudStatus.innerText = "🔥 PESADO/CAINDO";
        hudStatus.style.color = "var(--high-color)";
        gravity = 0.4; jumpStrength = -7; pipeSpeed = 3; pipeGap = 210;
    } else {
        hudStatus.innerText = "❄️ FRAQUEZA";
        hudStatus.style.color = "var(--low-color)";
        gravity = 0.2; jumpStrength = -4.5; pipeSpeed = 4.5; pipeGap = 170;
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

    // Inicia os loops do jogo e da voz
    clearInterval(loopJogo);
    clearInterval(loopVoz);
    
    loopJogo = setInterval(atualizarJogo, 20);
    
    // Configura a fala: Fala agora, e depois a cada 60.000 ms (1 minuto)
    falarGlicemia();
    loopVoz = setInterval(falarGlicemia, 60000); 
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
    tocarSom('pulo'); // TOCA SOM AO PULAR!
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
        tocarSom('ponto'); // TOCA SOM DE MOEDA AO PASSAR!
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
    clearInterval(loopVoz); // Para de falar a glicemia se o jogo acabar
    tocarSom('batida'); // TOCA SOM DE EXPLOSÃO!
    
    textoOverlay.innerText = "BATIDA! Score: " + score;
    btnIniciar.innerText = "TENTAR DE NOVO";
    overlay.style.display = "flex";
}
