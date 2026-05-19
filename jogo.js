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

// ==========================================
// 🔊 MOTOR DE ÁUDIO 8-BIT
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
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (tipo === 'ponto') {
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (tipo === 'batida') {
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// ==========================================
// 🗣️ MOTOR DE VOZ
// ==========================================
let loopVoz;
let glicemiaAtualVoz = "--";

function falarGlicemia() {
    if (glicemiaAtualVoz === "--" || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    const mensagem = new SpeechSynthesisUtterance(`Atenção, Saymon. Sua glicemia está em ${glicemiaAtualVoz}.`);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.1; 
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
    glicemiaAtualVoz = glicemia; 
    const skin = data.user.avatar || '😎';

    // Garante que o GIF vai ficar com o tamanho certo injetando a classe avatar-real se for imagem
    if (skin.includes('http') || skin.includes('.')) {
        personagem.innerHTML = `<img src="${skin}" class="avatar-real" style="width:100%; height:100%; object-fit:contain; filter:none; animation:none;">`;
        personagem.style.backgroundImage = 'none'; // Limpa o background antigo
    } else {
        personagem.innerHTML = `<span style="font-size: 40px;">${skin}</span>`;
    }

    document.getElementById("hud-glicemia").innerText = glicemia;
    const hudStatus = document.getElementById("hud-status");

    // LÓGICA DE FÍSICA CORRIGIDA
    if (glicemia >= 70 && glicemia <= 140) {
        // 🎯 NA META: O pulo tem tempo perfeito de hangtime e o obstáculo tem velocidade normal
        hudStatus.innerText = "⚡ FOCO TOTAL";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '2s'); 
        htmlRoot.style.setProperty('--velocidade-pulo', '0.65s');      
    } else if (glicemia > 140) {
        // 🔥 ALTA (PESADO): Pulo é mais curto (peso), mas o obstáculo passa RÁPIDO para dar tempo de desviar
        hudStatus.innerText = "🔥 PESADO/FADIGA";
        hudStatus.style.color = "var(--high-color)";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '1.5s'); 
        htmlRoot.style.setProperty('--velocidade-pulo', '0.5s'); 
    } else {
        // ❄️ BAIXA (TURVA): Obstáculo incrivelmente rápido, pulo errático
        hudStatus.innerText = "❄️ VISÃO TURVA";
        hudStatus.style.color = "var(--low-color)";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '1.2s'); 
        htmlRoot.style.setProperty('--velocidade-pulo', '0.55s');
    }

    textoOverlay.innerText = "SISTEMAS PRONTOS";
    btnIniciar.style.display = "block";
}

function iniciarJogo() {
    overlay.style.display = "none";
    jogoRodando = true;
    score = 0;
    document.getElementById("pontuacao").innerText = score;
    
    // Remove a classe e adiciona de novo para resetar a animação do cacto
    obstaculo.classList.remove("animar-obstaculo");
    void obstaculo.offsetWidth; 
    obstaculo.classList.add("animar-obstaculo");

    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    clearInterval(loopScore);
    clearInterval(loopColisao);
    clearInterval(loopVoz);

    loopScore = setInterval(() => {
        score += 10;
        document.getElementById("pontuacao").innerText = score;
        
        if (score > 0 && score % 100 === 0) {
            tocarSom('ponto');
        }
    }, 500);

    loopColisao = setInterval(verificarColisao, 10);

    falarGlicemia();
    loopVoz = setInterval(falarGlicemia, 60000); 
}

function pular(e) {
    if (!jogoRodando) return;
    if (e) e.preventDefault(); 
    
    if (!personagem.classList.contains("animar-pulo")) {
        personagem.classList.add("animar-pulo");
        tocarSom('pulo'); 
        
        // Pega a variável CSS atual para saber quando remover a classe
        const tempoPulo = parseFloat(getComputedStyle(htmlRoot).getPropertyValue('--velocidade-pulo')) * 1000;
        
        setTimeout(() => {
            personagem.classList.remove("animar-pulo");
        }, tempoPulo);
    }
}

document.getElementById("game-wrapper").addEventListener('touchstart', pular, {passive: false});
document.getElementById("game-wrapper").addEventListener('mousedown', pular);
document.addEventListener('keydown', (event) => {
    if(event.code === 'Space') { pular(); }
});

function verificarColisao() {
    let personagemRect = personagem.getBoundingClientRect();
    let obstaculoRect = obstaculo.getBoundingClientRect();

    // HITBOX MAIS PERDOADORA PARA CELULAR
    let margemErroX = 18; // Aumentado para o jogador não bater "no vento"
    let margemErroY = 15;

    if (
        personagemRect.right - margemErroX > obstaculoRect.left && 
        personagemRect.left + margemErroX < obstaculoRect.right && 
        personagemRect.bottom > obstaculoRect.top + margemErroY    
    ) {
        obstaculo.classList.remove("animar-obstaculo");
        clearInterval(loopColisao);
        clearInterval(loopScore);
        clearInterval(loopVoz); 
        tocarSom('batida');     
        jogoRodando = false;

        textoOverlay.innerText = "BATIDA! Score: " + score;
        btnIniciar.innerText = "TENTAR NOVAMENTE";
        overlay.style.display = "flex";
    }
}
