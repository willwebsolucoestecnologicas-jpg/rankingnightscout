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
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (tipo === 'ponto') {
        osc.type = 'sine'; // Som de level up / moeda
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (tipo === 'batida') {
        osc.type = 'sawtooth'; // Som rasgado de colisão
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
    window.speechSynthesis.cancel(); 
    const mensagem = new SpeechSynthesisUtterance(`Atenção, Saymon. Sua glicemia está em ${glicemiaAtualVoz}.`);
    mensagem.lang = 'pt-BR';
    mensagem.rate = 1.1; 
    window.speechSynthesis.speak(mensagem);
}

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
    if (data.erro) {
        textoOverlay.innerText = "ERRO: " + data.erro;
        return;
    }

    const glicemia = data.glicemia;
    glicemiaAtualVoz = glicemia; // Salva o valor para a voz
    const skin = data.user.avatar || '😎';

    if (skin.includes('http') || skin.includes('.')) {
        personagem.style.backgroundImage = `url('${skin}')`;
    } else {
        personagem.innerHTML = `<span style="font-size: 40px;">${skin}</span>`;
    }

    document.getElementById("hud-glicemia").innerText = glicemia;
    const hudStatus = document.getElementById("hud-status");

    if (glicemia >= 70 && glicemia <= 140) {
        hudStatus.innerText = "⚡ FOCO TOTAL";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '1.8s'); 
        htmlRoot.style.setProperty('--velocidade-pulo', '0.6s');      
    } else if (glicemia > 140) {
        hudStatus.innerText = "🔥 PESADO/FADIGA";
        hudStatus.style.color = "var(--high-color)";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '2.2s');
        htmlRoot.style.setProperty('--velocidade-pulo', '0.4s'); 
    } else {
        hudStatus.innerText = "❄️ VISÃO TURVA";
        hudStatus.style.color = "var(--low-color)";
        htmlRoot.style.setProperty('--velocidade-obstaculo', '1.2s'); 
        htmlRoot.style.setProperty('--velocidade-pulo', '0.5s');
    }

    textoOverlay.innerText = "SISTEMAS PRONTOS";
    btnIniciar.style.display = "block";
}

// 3. Inicia a corrida
function iniciarJogo() {
    overlay.style.display = "none";
    jogoRodando = true;
    score = 0;
    document.getElementById("pontuacao").innerText = score;
    
    obstaculo.classList.add("animar-obstaculo");

    // DESBLOQUEIO DE ÁUDIO MOBILE: Acorda o motor de som no clique do botão!
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    clearInterval(loopScore);
    clearInterval(loopColisao);
    clearInterval(loopVoz);

    // Sistema de Pontuação e Som de Milestones
    loopScore = setInterval(() => {
        score += 10;
        document.getElementById("pontuacao").innerText = score;
        
        // Toca o som de "moeda/level up" a cada 100 pontos
        if (score > 0 && score % 100 === 0) {
            tocarSom('ponto');
        }
    }, 500);

    loopColisao = setInterval(verificarColisao, 10);

    // Inicia a voz
    falarGlicemia();
    loopVoz = setInterval(falarGlicemia, 60000); // Repete a cada 1 minuto
}

// 4. Mecânica do Pulo
function pular(e) {
    if (!jogoRodando) return;
    if (e) e.preventDefault(); // Evita scroll acidental na tela touch
    
    // Verificação para não bugar a animação tocando várias vezes rápido
    if (!personagem.classList.contains("animar-pulo")) {
        personagem.classList.add("animar-pulo");
        tocarSom('pulo'); // TOCA SOM DO PULO!
        
        setTimeout(() => {
            personagem.classList.remove("animar-pulo");
        }, 600);
    }
}

// Ouvintes de evento melhorados para celular
document.getElementById("game-wrapper").addEventListener('touchstart', pular, {passive: false});
document.getElementById("game-wrapper").addEventListener('mousedown', pular);
document.addEventListener('keydown', (event) => {
    if(event.code === 'Space') { pular(); }
});

// 5. Verifica a batida (Colisão DOM)
function verificarColisao() {
    let personagemRect = personagem.getBoundingClientRect();
    let obstaculoRect = obstaculo.getBoundingClientRect();

    // Margem de erro (hitbox perdoadora para não encostar pixels transparentes)
    let margemErroX = 10;
    let margemErroY = 10;

    if (
        personagemRect.right - margemErroX > obstaculoRect.left && 
        personagemRect.left + margemErroX < obstaculoRect.right && 
        personagemRect.bottom > obstaculoRect.top + margemErroY    
    ) {
        obstaculo.classList.remove("animar-obstaculo");
        clearInterval(loopColisao);
        clearInterval(loopScore);
        clearInterval(loopVoz); // Corta a IA falando
        tocarSom('batida');     // TOCA SOM DE BATIDA!
        jogoRodando = false;

        textoOverlay.innerText = "BATIDA! Score: " + score;
        btnIniciar.innerText = "TENTAR NOVAMENTE";
        overlay.style.display = "flex";
    }
}
