// Configuração do Supabase
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-publica';

// Inicializar o cliente Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sistema de notificação
function showNotification(message, type = 'success') {
    // Remove notificação anterior se existir
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Mostra a notificação
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Configuração da eleição
let configuracao = {
    titulo: 'Eleição Universal',
    cargo: 'Representante',
    candidatos: {}
};

let votoAtual = '';
let modoAdmin = false;
let tempoVotacao = 30;
let timerInterval;
let timerAtivo = false;
const ADMIN_PASSWORD = "admin123";

// Inicialização
async function inicializar() {
    carregarConfiguracao();
    carregarCandidatos();
    atualizarDisplay();
    atualizarInterfaceAdmin();
    aplicarTemaSalvo();
    
    // Verificar se há votos offline para sincronizar
    setTimeout(sincronizarVotosOffline, 2000);
}

// Timer de votação
function iniciarTimer() {
    pararTimer();
    
    tempoVotacao = 30;
    timerAtivo = true;
    
    atualizarTimer();
    
    timerInterval = setInterval(() => {
        tempoVotacao--;
        atualizarTimer();
        
        if (tempoVotacao <= 0) {
            pararTimer();
            showNotification('Tempo esgotado! Voto em branco registrado.', 'warning');
            brancoAutomatico();
        }
    }, 1000);
}

function pararTimer() {
    clearInterval(timerInterval);
    timerAtivo = false;
}

function atualizarTimer() {
    const timerElement = document.getElementById('timer');
    const timerContainer = document.querySelector('.timer-container');
    
    timerElement.textContent = tempoVotacao;
    
    timerContainer.classList.remove('warning', 'danger');
    if (tempoVotacao <= 10) {
        timerContainer.classList.add('danger');
    } else if (tempoVotacao <= 20) {
        timerContainer.classList.add('warning');
    }
}

function brancoAutomatico() {
    salvarVoto({
        cargo: configuracao.cargo,
        numero: 'BR',
        timestamp: new Date().toISOString(),
        candidato: 'BRANCO (automático)'
    });
    
    corrige();
    
    setTimeout(() => {
        iniciarTimer();
    }, 2000);
}

// Tema claro/escuro
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
        localStorage.setItem('tema', 'escuro');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('tema', 'claro');
    }
}

function aplicarTemaSalvo() {
    const temaSalvo = localStorage.getItem('tema');
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (temaSalvo === 'escuro') {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('tema', 'claro');
    }
}

// Modo Admin
function toggleAdmin() {
    if (!modoAdmin) {
        const senha = prompt("🔐 Digite a senha de administrador:");
        if (senha !== ADMIN_PASSWORD) {
            showNotification("Senha incorreta!", "error");
            return;
        }
    }
    
    modoAdmin = !modoAdmin;
    const adminPanel = document.getElementById('admin-panel');
    const votingPanel = document.getElementById('voting-panel');
    
    if (modoAdmin) {
        adminPanel.style.display = 'block';
        votingPanel.style.display = 'none';
        pararTimer();
        preencherFormularioAdmin();
    } else {
        adminPanel.style.display = 'none';
        votingPanel.style.display = 'block';
        iniciarTimer();
        atualizarDisplayEleicao();
    }
}

function preencherFormularioAdmin() {
    document.getElementById('titulo-eleicao').value = configuracao.titulo;
    document.getElementById('cargo-eleicao').value = configuracao.cargo;
    atualizarListaCandidatos();
}

function adicionarCandidato() {
    const numero = document.getElementById('numero-candidato').value.padStart(2, '0');
    const nome = document.getElementById('nome-candidato').value.trim();
    const partido = document.getElementById('partido-candidato').value.trim();
    
    if (!numero || !nome || !partido) {
        showNotification('Preencha todos os campos!', 'error');
        return;
    }
    
    if (numero.length !== 2) {
        showNotification('O número deve ter 2 dígitos!', 'error');
        return;
    }
    
    if (configuracao.candidatos[numero]) {
        showNotification('Já existe um candidato com este número!', 'error');
        return;
    }
    
    configuracao.candidatos[numero] = {
        nome: nome.toUpperCase(),
        partido: partido.toUpperCase()
    };
    
    document.getElementById('numero-candidato').value = '';
    document.getElementById('nome-candidato').value = '';
    document.getElementById('partido-candidato').value = '';
    
    atualizarListaCandidatos();
    salvarConfiguracao();
    showNotification('Candidato adicionado com sucesso!');
}

function removerCandidato(numero) {
    if (confirm(`Tem certeza que deseja remover o candidato ${numero}?`)) {
        delete configuracao.candidatos[numero];
        atualizarListaCandidatos();
        salvarConfiguracao();
        showNotification('Candidato removido com sucesso!');
    }
}

function atualizarListaCandidatos() {
    const lista = document.getElementById('lista-candidatos');
    lista.innerHTML = '';
    
    Object.entries(configuracao.candidatos).forEach(([numero, candidato]) => {
        const div = document.createElement('div');
        div.className = 'candidato-item';
        div.innerHTML = `
            <span><strong>${numero}</strong></span>
            <span>${candidato.nome}</span>
            <span>${candidato.partido}</span>
            <button onclick="removerCandidato('${numero}')" class="btn-remover">Remover</button>
        `;
        lista.appendChild(div);
    });
}

function salvarConfiguracao() {
    configuracao.titulo = document.getElementById('titulo-eleicao').value;
    configuracao.cargo = document.getElementById('cargo-eleicao').value;
    localStorage.setItem('configuracaoEleicao', JSON.stringify(configuracao));
    showNotification('Configuração salva com sucesso!');
    atualizarDisplayEleicao();
}

function carregarConfiguracao() {
    const saved = localStorage.getItem('configuracaoEleicao');
    if (saved) {
        configuracao = JSON.parse(saved);
    }
}

function atualizarDisplayEleicao() {
    document.getElementById('titulo-eleicao-display').textContent = configuracao.titulo;
    document.getElementById('cargo-display').textContent = configuracao.cargo;
}

// Funções de votação
function pressionarTecla(numero) {
    if (!timerAtivo) iniciarTimer();
    
    if (votoAtual.length < 2) {
        votoAtual += numero;
        atualizarDisplay();
        
        if (votoAtual.length === 2) {
            mostrarCandidato();
        }
    }
}

function atualizarDisplay() {
    for (let i = 0; i < 2; i++) {
        const elemento = document.getElementById(`numero${i + 1}`);
        if (elemento) {
            elemento.textContent = votoAtual[i] || '_';
        }
    }
}

function mostrarCandidato() {
    const candidato = configuracao.candidatos[votoAtual];
    const nomeElemento = document.getElementById('nome-candidato-display');
    const partidoElemento = document.getElementById('partido-display');
    
    if (candidato) {
        nomeElemento.textContent = candidato.nome;
        partidoElemento.textContent = candidato.partido;
    } else {
        nomeElemento.textContent = 'VOTO NULO';
        partidoElemento.textContent = '';
    }
}

function branco() {
    if (!timerAtivo) iniciarTimer();
    
    votoAtual = 'BR';
    document.getElementById('nome-candidato-display').textContent = 'VOTO EM BRANCO';
    document.getElementById('partido-display').textContent = '';
    atualizarDisplay();
}

function corrige() {
    if (!timerAtivo) iniciarTimer();
    
    votoAtual = '';
    document.getElementById('nome-candidato-display').textContent = 'NOME DO CANDIDATO';
    document.getElementById('partido-display').textContent = 'PARTIDO/CHAPA';
    atualizarDisplay();
}

async function confirma() {
    if (votoAtual === '') {
        showNotification('Digite um voto primeiro!', 'warning');
        return;
    }
    
    await salvarVoto({
        cargo: configuracao.cargo,
        numero: votoAtual,
        timestamp: new Date().toISOString(),
        candidato: configuracao.candidatos[votoAtual] ? configuracao.candidatos[votoAtual].nome : (votoAtual === 'BR' ? 'BRANCO' : 'NULO')
    });
    
    showNotification('Voto confirmado com sucesso!');
    pararTimer();
    
    setTimeout(() => {
        corrige();
        iniciarTimer();
    }, 2000);
}

// Função para salvar voto (local e Supabase)
async function salvarVoto(voto) {
    try {
        // Salvar no localStorage (para funcionamento offline)
        let votos = JSON.parse(localStorage.getItem('votos')) || [];
        votos.push(voto);
        localStorage.setItem('votos', JSON.stringify(votos));
        
        // Tentar salvar no Supabase
        const { data, error } = await supabase
            .from('votos')
            .insert([
                { 
                    cargo: voto.cargo, 
                    numero: voto.numero, 
                    candidato: voto.candidato 
                }
            ]);
            
        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            // Não mostra erro para o usuário para não interromper a votação
        }
    } catch (e) {
        console.error('Exceção ao salvar voto:', e);
    }
}

// Sincronizar votos offline com Supabase
async function sincronizarVotosOffline() {
    const votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    if (votos.length === 0) {
        showNotification('Nenhum voto offline para sincronizar.', 'info');
        return;
    }
    
    showNotification(`Sincronizando ${votos.length} voto(s) offline...`, 'info');
    
    try {
        for (const voto of votos) {
            const { data, error } = await supabase
                .from('votos')
                .insert([
                    { 
                        cargo: voto.cargo, 
                        numero: voto.numero, 
                        candidato: voto.candidato 
                    }
                ]);
                
            if (!error) {
                // Remove o voto do localStorage após sincronizar com sucesso
                const novosVotos = votos.filter(v => v.timestamp !== voto.timestamp);
                localStorage.setItem('votos', JSON.stringify(novosVotos));
            } else {
                console.error('Erro ao sincronizar voto:', error);
                break; // Para de tentar sincronizar se houver erro
            }
        }
        
        showNotification('Votos offline sincronizados com sucesso!');
    } catch (e) {
        console.error('Erro ao sincronizar votos offline:', e);
        showNotification('Erro ao sincronizar votos. Tente novamente.', 'error');
    }
}

// Gerenciamento de dados
async function exportarResultados() {
    const votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    if (votos.length === 0) {
        showNotification('Nenhum voto registrado ainda!', 'warning');
        return;
    }
    
    const resultados = calcularResultados(votos);
    const dados = {
        configuracao: configuracao,
        votos: votos,
        resultados: resultados,
        totalVotos: votos.length,
        exportadoEm: new Date().toISOString()
    };
    
    // Salvar no Supabase
    try {
        const { data, error } = await supabase
            .from('resultados_exportados')
            .insert([
                { dados: dados }
            ]);
            
        if (error) {
            console.error('Erro ao salvar resultados no Supabase:', error);
            showNotification('Erro ao exportar resultados!', 'error');
        } else {
            showNotification(`Resultados exportados! Total: ${votos.length} votos`);
            
            // Também fazer download do JSON
            fazerDownload(JSON.stringify(dados, null, 2), 'resultados-eleicao.json');
        }
    } catch (e) {
        console.error('Exceção ao exportar resultados:', e);
        showNotification('Erro ao exportar resultados!', 'error');
    }
}

function calcularResultados(votos) {
    const resultados = {};
    
    votos.forEach(voto => {
        const key = voto.numero;
        if (!resultados[key]) {
            resultados[key] = {
                numero: key,
                candidato: voto.candidato,
                votos: 0
            };
        }
        resultados[key].votos++;
    });
    
    return Object.values(resultados).sort((a, b) => b.votos - a.votos);
}

function fazerDownload(dados, filename) {
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function visualizarResultados() {
    const votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    if (votos.length === 0) {
        showNotification('Nenhum voto registrado ainda!', 'warning');
        return;
    }
    
    const resultados = calcularResultados(votos);
    let mensagem = `RESULTADOS - ${configuracao.titulo}\n\n`;
    mensagem += `Total de votos: ${votos.length}\n\n`;
    
    resultados.forEach((resultado, index) => {
        const percentual = ((resultado.votos / votos.length) * 100).toFixed(1);
        mensagem += `${index + 1}. ${resultado.candidato}: ${resultado.votos} votos (${percentual}%)\n`;
    });
    
    alert(mensagem);
}

function limparVotos() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os votos registrados. Tem certeza?')) {
        localStorage.removeItem('votos');
        showNotification('Todos os votos foram apagados!', 'warning');
    }
}

function limparTudo() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados (candidatos, votos e configuração). Tem certeza?')) {
        localStorage.removeItem('configuracaoEleicao');
        localStorage.removeItem('votos');
        configuracao = {
            titulo: 'Eleição Universal',
            cargo: 'Representante',
            candidatos: {}
        };
        atualizarListaCandidatos();
        document.getElementById('titulo-eleicao').value = '';
        document.getElementById('cargo-eleicao').value = '';
        showNotification('Todos os dados foram apagados!', 'warning');
    }
}

function carregarCandidatos() {
    // Já carregado no carregarConfiguracao()
}

function atualizarInterfaceAdmin() {
    // Atualiza a interface quando necessário
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializar();
    iniciarTimer();
});

// Teclado numérico físico também funciona
document.addEventListener('keydown', function(event) {
    if (event.key >= '0' && event.key <= '9') {
        pressionarTecla(parseInt(event.key));
    } else if (event.key === 'Enter') {
        confirma();
    } else if (event.key === 'Escape') {
        corrige();
    } else if (event.key === ' ' || event.key === 'b') {
        branco();
    }
});