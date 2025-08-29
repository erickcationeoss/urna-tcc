// Variáveis globais
let timeLeft = 30;
let countdownInterval;
let currentVote = '';
const candidates = {
    '12': { name: 'JOÃO SILVA', party: 'CHAPA A' },
    '15': { name: 'MARIA SANTOS', party: 'CHAPA B' },
    '18': { name: 'PEDRO COSTA', party: 'CHAPA C' },
    '21': { name: 'ANA OLIVEIRA', party: 'CHAPA D' },
    '27': { name: 'CARLOS PEREIRA', party: 'CHAPA E' }
};

// Elementos DOM
const startBtn = document.getElementById('startBtn');
const urnaScreen = document.getElementById('urnaScreen');
const countdownEl = document.getElementById('countdown');
const num1 = document.getElementById('num1');
const num2 = document.getElementById('num2');
const candidateName = document.getElementById('candidateName');
const candidateParty = document.getElementById('candidateParty');
const correctBtn = document.getElementById('correctBtn');
const confirmBtn = document.getElementById('confirmBtn');
const keyButtons = document.querySelectorAll('.key[data-key]');

// Iniciar a votação
startBtn.addEventListener('click', startVoting);

// Adicionar event listeners para as teclas numéricas
keyButtons.forEach(button => {
    button.addEventListener('click', () => {
        pressKey(button.getAttribute('data-key'));
    });
});

// Adicionar event listeners para os botões de função
correctBtn.addEventListener('click', correct);
confirmBtn.addEventListener('click', confirmVote);

function startVoting() {
    // Esconder botão e mostrar urna
    startBtn.style.display = 'none';
    urnaScreen.style.display = 'block';
    
    // Iniciar contagem regressiva
    timeLeft = 30;
    countdownEl.textContent = timeLeft;
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            // Tempo esgotado - voto nulo
            alert('Tempo esgotado! Seu voto foi considerado NULO.');
            resetUI();
        }
        
        // Mudar cor do timer quando estiver acabando o tempo
        if (timeLeft <= 10) {
            countdownEl.parentElement.style.borderColor = '#e74c3c';
            countdownEl.style.color = '#e74c3c';
        }
    }, 1000);
}

// Função para pressionar tecla
function pressKey(number) {
    if (currentVote.length < 2) {
        currentVote += number;
        updateDisplay();
        
        if (currentVote.length === 2) {
            showCandidate();
        }
    }
}

// Atualizar display
function updateDisplay() {
    num1.textContent = currentVote[0] || '_';
    num2.textContent = currentVote[1] || '_';
}

// Mostrar informações do candidato
function showCandidate() {
    const candidate = candidates[currentVote];
    if (candidate) {
        candidateName.textContent = candidate.name;
        candidateParty.textContent = candidate.party;
    } else {
        candidateName.textContent = 'VOTO NULO';
        candidateParty.textContent = '';
    }
}

// Corrigir voto
function correct() {
    currentVote = '';
    candidateName.textContent = 'NOME DO CANDIDATO';
    candidateParty.textContent = 'PARTIDO/CHAPA';
    updateDisplay();
}

// Confirmar voto
function confirmVote() {
    if (currentVote === '') {
        alert('Por favor, digite um número para votar!');
        return;
    }
    
    clearInterval(countdownInterval);
    
    const candidate = candidates[currentVote];
    if (candidate) {
        alert(`Voto confirmado para ${candidate.name} (${candidate.party})!`);
    } else {
        alert('Voto NULO confirmado!');
    }
    
    resetUI();
}

// Reiniciar a UI
function resetUI() {
    urnaScreen.style.display = 'none';
    startBtn.style.display = 'block';
    currentVote = '';
    countdownEl.parentElement.style.borderColor = '#3498db';
    countdownEl.style.color = '#2c3e50';
    correct();
}