// Configuração do Supabase - SUBSTITUA COM SUAS CREDENCIAIS
const SUPABASE_URL = 'https://xvxrxzjunbeuajpzazhl.supabase.co';
const SUPABASE_ANON_KEY = 'xvxrxzjunbeuajpzazhl';

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        font-weight: bold;
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
    `;
    
    // Cores baseadas no tipo
    if (type === 'success') {
        notification.style.background = '#4CAF50';
    } else if (type === 'error') {
        notification.style.background = '#f44336';
    } else if (type === 'warning') {
        notification.style.background = '#ff9800';
    } else if (type === 'info') {
        notification.style.background = '#2196F3';
    }
    
    document.body.appendChild(notification);
    
    // Mostra a notificação
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
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

// Controle de sincronização
let isSyncing = false;

// Inicialização
async function inicializar() {
    carregarConfiguracao();
    carregarCandidatos();
    atualizarDisplay();
    atualizarInterfaceAdmin();
    aplicarTemaSalvo();
    atualizarDisplayEleicao();
    
    // Verificar se há votos offline para sincronizar
    setTimeout(() => {
        verificarVotosPendentes();
    }, 2000);
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
    
    if (timerElement) {
        timerElement.textContent = tempoVotacao;
    }
    
    if (timerContainer) {
        timerContainer.classList.remove('warning', 'danger');
        if (tempoVotacao <= 10) {
            timerContainer.classList.add('danger');
        } else if (tempoVotacao <= 20) {
            timerContainer.classList.add('warning');
        }
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
    if (!lista) return;
    
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
    const tituloDisplay = document.getElementById('titulo-eleicao-display');
    const cargoDisplay = document.getElementById('cargo-display');
    
    if (tituloDisplay) tituloDisplay.textContent = configuracao.titulo;
    if (cargoDisplay) cargoDisplay.textContent = configuracao.cargo;
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
    
    if (candidato && nomeElemento && partidoElemento) {
        nomeElemento.textContent = candidato.nome;
        partidoElemento.textContent = candidato.partido;
    } else if (nomeElemento && partidoElemento) {
        nomeElemento.textContent = 'VOTO NULO';
        partidoElemento.textContent = '';
    }
}

function branco() {
    if (!timerAtivo) iniciarTimer();
    
    votoAtual = 'BR';
    const nomeElemento = document.getElementById('nome-candidato-display');
    const partidoElemento = document.getElementById('partido-display');
    
    if (nomeElemento) nomeElemento.textContent = 'VOTO EM BRANCO';
    if (partidoElemento) partidoElemento.textContent = '';
    atualizarDisplay();
}

function corrige() {
    if (!timerAtivo) iniciarTimer();
    
    votoAtual = '';
    const nomeElemento = document.getElementById('nome-candidato-display');
    const partidoElemento = document.getElementById('partido-display');
    
    if (nomeElemento) nomeElemento.textContent = 'NOME DO CANDIDATO';
    if (partidoElemento) partidoElemento.textContent = 'PARTIDO/CHAPA';
    atualizarDisplay();
}

async function confirma() {
    if (votoAtual === '') {
        showNotification('Digite um voto primeiro!', 'warning');
        return;
    }
    
    const votoData = {
        cargo: configuracao.cargo,
        numero: votoAtual,
        timestamp: new Date().toISOString(),
        candidato: configuracao.candidatos[votoAtual] ? 
                  configuracao.candidatos[votoAtual].nome : 
                  (votoAtual === 'BR' ? 'BRANCO' : 'NULO')
    };
    
    await salvarVoto(votoData);
    
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
        
        // Tentar salvar no Supabase (não bloqueante)
        salvarVotoOnline(voto);
        
    } catch (e) {
        console.error('Erro ao salvar voto:', e);
        // Salva na fila de sincronização mesmo com erro
        adicionarParaSincronizacao(voto);
    }
}

// Salvar online de forma não bloqueante
async function salvarVotoOnline(voto) {
    try {
        const { error } = await supabase
            .from('votos')
            .insert([
                { 
                    cargo: voto.cargo, 
                    numero: voto.numero, 
                    candidato: voto.candidato
                    // O campo created_at será preenchido automaticamente pelo Supabase
                }
            ]);
            
        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            adicionarParaSincronizacao(voto);
        } else {
            console.log('Voto salvo com sucesso no Supabase');
        }
    } catch (e) {
        console.error('Exceção ao salvar online:', e);
        adicionarParaSincronizacao(voto);
    }
}

// Adicionar voto para sincronização posterior
function adicionarParaSincronizacao(voto) {
    let pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    pendentes.push(voto);
    localStorage.setItem('votosPendentes', JSON.stringify(pendentes));
    showNotification('Voto salvo localmente (sem conexão)', 'info');
}

// Verificar votos pendentes
function verificarVotosPendentes() {
    const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    if (pendentes.length > 0) {
        showNotification(`${pendentes.length} votos pendentes para sincronizar`, 'info');
    }
}

// Sincronizar votos offline com Supabase - VERSÃO CORRIGIDA
async function sincronizarVotosOffline() {
    if (isSyncing) {
        showNotification('Sincronização já em andamento...', 'info');
        return;
    }
    
    const votosPendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    
    if (votosPendentes.length === 0) {
        showNotification('Nenhum voto pendente para sincronizar.', 'info');
        return;
    }
    
    isSyncing = true;
    const syncButton = document.querySelector('.btn-sync');
    const originalText = syncButton?.innerHTML;
    
    try {
        if (syncButton) {
            syncButton.innerHTML = '⏳ Sincronizando...';
            syncButton.disabled = true;
        }
        
        showNotification(`Sincronizando ${votosPendentes.length} votos...`, 'info');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Criar uma cópia para trabalhar
        const votosParaSincronizar = [...votosPendentes];
        
        for (let i = 0; i < votosParaSincronizar.length; i++) {
            const voto = votosParaSincronizar[i];
            
            if (!navigator.onLine) {
                showNotification('Conexão perdida durante a sincronização', 'error');
                break;
            }
            
            try {
                const { error } = await supabase
                    .from('votos')
                    .insert([{
                        cargo: voto.cargo,
                        numero: voto.numero,
                        candidato: voto.candidato
                    }]);
                
                if (error) {
                    console.error('Erro ao sincronizar voto:', error);
                    errorCount++;
                } else {
                    successCount++;
                    // Remove o voto sincronizado da lista original
                    votosPendentes.splice(votosPendentes.findIndex(v => 
                        v.cargo === voto.cargo && 
                        v.numero === voto.numero && 
                        v.timestamp === voto.timestamp
                    ), 1);
                    
                    localStorage.setItem('votosPendentes', JSON.stringify(votosPendentes));
                }
                
                // Pequena pausa para não sobrecarregar o servidor
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('Erro no voto individual:', error);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            showNotification(`Sincronização concluída! ${successCount} votos sincronizados.`, 'success');
        }
        
        if (errorCount > 0) {
            showNotification(`${errorCount} votos não puderam ser sincronizados.`, 'warning');
        }
        
    } catch (error) {
        console.error('Erro geral na sincronização:', error);
        showNotification('Erro na sincronização: ' + error.message, 'error');
    } finally {
        isSyncing = false;
        if (syncButton) {
            syncButton.innerHTML = originalText;
            syncButton.disabled = false;
        }
    }
}

// Gerenciamento de dados
async function exportarResultados() {
    try {
        const votos = JSON.parse(localStorage.getItem('votos')) || [];
        const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
        const todosVotos = [...votos, ...pendentes];
        
        if (todosVotos.length === 0) {
            showNotification('Nenhum voto registrado ainda!', 'warning');
            return;
        }
        
        const resultados = calcularResultados(todosVotos);
        const dados = {
            configuracao: configuracao,
            votos: todosVotos,
            resultados: resultados,
            totalVotos: todosVotos.length,
            exportadoEm: new Date().toISOString()
        };
        
        // Salvar no Supabase na tabela resultados_exportados
        const { error } = await supabase
            .from('resultados_exportados')
            .insert([{ dados: dados }]);
            
        if (error) {
            console.error('Erro ao salvar resultados no Supabase:', error);
            showNotification('Erro ao exportar para o Supabase', 'error');
        } else {
            showNotification('Resultados exportados para o Supabase!', 'success');
        }
        
        // Também fazer download do JSON localmente
        fazerDownload(JSON.stringify(dados, null, 2), 'resultados-eleicao.json');
        showNotification(`Resultados exportados! Total: ${todosVotos.length} votos`);
        
    } catch (error) {
        console.error('Erro ao exportar resultados:', error);
        showNotification('Erro ao exportar resultados', 'error');
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
    const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    const todosVotos = [...votos, ...pendentes];
    
    if (todosVotos.length === 0) {
        showNotification('Nenhum voto registrado ainda!', 'warning');
        return;
    }
    
    const resultados = calcularResultados(todosVotos);
    let mensagem = `RESULTADOS - ${configuracao.titulo}\n\n`;
    mensagem += `Total de votos: ${todosVotos.length}\n`;
    mensagem += `(${votos.length} confirmados, ${pendentes.length} pendentes)\n\n`;
    
    resultados.forEach((resultado, index) => {
        const percentual = ((resultado.votos / todosVotos.length) * 100).toFixed(1);
        mensagem += `${index + 1}. ${resultado.candidato}: ${resultado.votos} votos (${percentual}%)\n`;
    });
    
    alert(mensagem);
}

function limparVotos() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os votos registrados. Tem certeza?')) {
        localStorage.removeItem('votos');
        localStorage.removeItem('votosPendentes');
        showNotification('Todos os votos foram apagados!', 'warning');
    }
}

function limparTudo() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados (candidatos, votos e configuração). Tem certeza?')) {
        localStorage.removeItem('configuracaoEleicao');
        localStorage.removeItem('votos');
        localStorage.removeItem('votosPendentes');
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

// Verificar conexão periodicamente
setInterval(() => {
    if (navigator.onLine) {
        const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
        if (pendentes.length > 0 && !isSyncing) {
            sincronizarVotosOffline();
        }
    }
}, 30000); // Verifica a cada 30 segundos