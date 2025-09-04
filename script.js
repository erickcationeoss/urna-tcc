// ==============================================
// CONFIGURAÇÃO DO SUPABASE
// ==============================================
const SUPABASE_URL = 'https://xvxrxzjunbeuajpzazhl.supabase.co'; // SUBSTITUA pela sua URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eHJ4emp1bmJldWFqcHphemhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzU0MzYsImV4cCI6MjA3MjA1MTQzNn0.ckHqVnUgieW6xIEm9k0XxtD4B9D_qnPcFs2G-FuUmiU'; // SUBSTITUA pela sua chave

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==============================================
// CONFIGURAÇÃO DA ELEIÇÃO
// ==============================================
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

// Controles de sincronização
let isSyncing = false;
let sessaoCompartilhamento = null;
let isReceiving = false;

// ==============================================
// SISTEMA DE NOTIFICAÇÃO
// ==============================================
function showNotification(message, type = 'success') {
    // Remove notificação anterior se existir
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 20px;
        border-radius: 5px; color: white; z-index: 10000; font-weight: bold;
        transition: all 0.3s ease; transform: translateX(100%); opacity: 0;
        background: ${type === 'success' ? '#4CAF50' : 
                   type === 'error' ? '#f44336' : 
                   type === 'warning' ? '#ff9800' : '#2196F3'};
    `;
    
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
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==============================================
// TESTE DE CONEXÃO COM SUPABASE
// ==============================================
async function testarConexaoSupabase() {
    try {
        const { error } = await supabase
            .from('candidatos')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('Erro na conexão com Supabase:', error);
            showNotification('Usando armazenamento local', 'warning');
            return false;
        }
        
        console.log('Conexão com Supabase estabelecida com sucesso');
        return true;
    } catch (e) {
        console.error('Erro ao testar conexão:', e);
        showNotification('Usando armazenamento local', 'info');
        return false;
    }
}

// ==============================================
// GERENCIAMENTO DE CANDIDATOS
// ==============================================
async function carregarCandidatos() {
    try {
        const { data, error } = await supabase
            .from('candidatos')
            .select('numero, nome, partido')
            .order('numero', { ascending: true });
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            configuracao.candidatos = {};
            data.forEach(candidato => {
                configuracao.candidatos[candidato.numero] = {
                    nome: candidato.nome,
                    partido: candidato.partido
                };
            });
            
            localStorage.setItem('candidatos', JSON.stringify(configuracao.candidatos));
            showNotification('Candidatos carregados do servidor!', 'success');
        } else {
            const saved = localStorage.getItem('candidatos');
            if (saved) {
                configuracao.candidatos = JSON.parse(saved);
                showNotification('Candidatos carregados localmente', 'info');
            }
        }
    } catch (e) {
        console.error('Erro ao carregar candidatos:', e);
        const saved = localStorage.getItem('candidatos');
        if (saved) configuracao.candidatos = JSON.parse(saved);
    }
}

async function salvarCandidatoSupabase(numero, nome, partido) {
    try {
        const { error } = await supabase
            .from('candidatos')
            .insert([{ numero, nome: nome.toUpperCase(), partido: partido.toUpperCase() }]);
            
        return !error;
    } catch (e) {
        console.error('Erro ao salvar candidato:', e);
        return false;
    }
}

async function removerCandidatoSupabase(numero) {
    try {
        const { error } = await supabase
            .from('candidatos')
            .delete()
            .eq('numero', numero);
            
        return !error;
    } catch (e) {
        console.error('Erro ao remover candidato:', e);
        return false;
    }
}

// ==============================================
// TIMER DE VOTAÇÃO
// ==============================================
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
    
    if (timerElement) timerElement.textContent = tempoVotacao;
    if (timerContainer) {
        timerContainer.classList.remove('warning', 'danger');
        if (tempoVotacao <= 10) timerContainer.classList.add('danger');
        else if (tempoVotacao <= 20) timerContainer.classList.add('warning');
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
}

// ==============================================
// TEMA CLARO/ESCURO
// ==============================================
function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.contains('light-theme');
    
    body.classList.remove(isLight ? 'light-theme' : 'dark-theme');
    body.classList.add(isLight ? 'dark-theme' : 'light-theme');
    
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('tema', isLight ? 'escuro' : 'claro');
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
    }
}

// ==============================================
// MODO ADMINISTRADOR
// ==============================================
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
        atualizarDisplayEleicao();
    }
}

function preencherFormularioAdmin() {
    document.getElementById('titulo-eleicao').value = configuracao.titulo;
    document.getElementById('cargo-eleicao').value = configuracao.cargo;
    atualizarListaCandidatos();
}

async function adicionarCandidato() {
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
    
    // Tentar salvar no Supabase
    const sucessoOnline = await salvarCandidatoSupabase(numero, nome, partido);
    
    // Salvar localmente de qualquer forma
    configuracao.candidatos[numero] = {
        nome: nome.toUpperCase(),
        partido: partido.toUpperCase()
    };
    
    localStorage.setItem('candidatos', JSON.stringify(configuracao.candidatos));
    
    document.getElementById('numero-candidato').value = '';
    document.getElementById('nome-candidato').value = '';
    document.getElementById('partido-candidato').value = '';
    
    atualizarListaCandidatos();
    salvarConfiguracao();
    
    if (sucessoOnline) {
        showNotification('Candidato adicionado com sucesso!');
    } else {
        showNotification('Candidato salvo localmente (sem conexão)', 'warning');
    }
}

async function removerCandidato(numero) {
    if (!confirm(`Tem certeza que deseja remover o candidato ${numero}?`)) return;
    
    // Tentar remover do Supabase
    await removerCandidatoSupabase(numero);
    
    // Remover localmente
    delete configuracao.candidatos[numero];
    localStorage.setItem('candidatos', JSON.stringify(configuracao.candidatos));
    
    atualizarListaCandidatos();
    salvarConfiguracao();
    showNotification('Candidato removido com sucesso!');
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
    if (saved) configuracao = JSON.parse(saved);
}

function atualizarDisplayEleicao() {
    const tituloDisplay = document.getElementById('titulo-eleicao-display');
    const cargoDisplay = document.getElementById('cargo-display');
    
    if (tituloDisplay) tituloDisplay.textContent = configuracao.titulo;
    if (cargoDisplay) cargoDisplay.textContent = configuracao.cargo;
}

// ==============================================
// FUNÇÕES DE VOTAÇÃO
// ==============================================
function pressionarTecla(numero) {
    if (!timerAtivo) iniciarTimer();
    
    if (votoAtual.length < 2) {
        votoAtual += numero;
        atualizarDisplay();
        if (votoAtual.length === 2) mostrarCandidato();
    }
}

function atualizarDisplay() {
    for (let i = 0; i < 2; i++) {
        const elemento = document.getElementById(`numero${i + 1}`);
        if (elemento) elemento.textContent = votoAtual[i] || '_';
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
    }, 2000);
}

// ==============================================
// SALVAR VOTOS NO SUPABASE
// ==============================================
async function salvarVoto(votoData) {
    try {
        // Salvar no localStorage
        let votos = JSON.parse(localStorage.getItem('votos')) || [];
        votos.push(votoData);
        localStorage.setItem('votos', JSON.stringify(votos));
        
        // Tentar salvar no Supabase
        const { error } = await supabase
            .from('votos')
            .insert([{
                cargo: votoData.cargo,
                numero: votoData.numero,
                candidato: votoData.candidato
            }]);
            
        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            
            // Adicionar para sincronização posterior
            let pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
            pendentes.push(votoData);
            localStorage.setItem('votosPendentes', JSON.stringify(pendentes));
            
            showNotification('Voto salvo localmente (sem conexão)', 'info');
            return false;
        }
        
        showNotification('Voto salvo com sucesso!', 'success');
        return true;
        
    } catch (e) {
        console.error('Erro ao salvar voto:', e);
        showNotification('Erro ao salvar voto', 'error');
        return false;
    }
}

// ==============================================
// SINCRONIZAÇÃO DE VOTOS OFFLINE
// ==============================================
async function sincronizarVotosOffline() {
    const votosPendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    
    if (votosPendentes.length === 0) {
        showNotification('Nenhum voto pendente para sincronizar.', 'info');
        return;
    }
    
    isSyncing = true;
    showNotification(`Sincronizando ${votosPendentes.length} votos...`, 'info');
    
    let successCount = 0;
    const novosPendentes = [];
    
    for (const voto of votosPendentes) {
        try {
            const { error } = await supabase
                .from('votos')
                .insert([{
                    cargo: voto.cargo,
                    numero: voto.numero,
                    candidato: voto.candidato
                }]);
                
            if (error) {
                novosPendentes.push(voto);
                continue;
            }
            
            successCount++;
            
        } catch (e) {
            novosPendentes.push(voto);
        }
        
        // Pequena pausa para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Atualizar lista de pendentes
    localStorage.setItem('votosPendentes', JSON.stringify(novosPendentes));
    isSyncing = false;
    
    if (successCount > 0) {
        showNotification(`${successCount} votos sincronizados com sucesso!`, 'success');
    }
    
    if (novosPendentes.length > 0) {
        showNotification(`${novosPendentes.length} votos não puderam ser sincronizados`, 'warning');
    }
}

// ==============================================
// EXPORTAR E VISUALIZAR RESULTADOS
// ==============================================
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
        
        // Salvar no Supabase
        const { error } = await supabase
            .from('resultados_exportados')
            .insert([{ dados: dados }]);
            
        if (error) {
            console.error('Erro ao salvar resultados:', error);
        }
        
        // Fazer download
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
    mostrarResultadosModal(resultados, todosVotos.length);
}

function mostrarResultadosModal(resultados, totalVotos) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center;
        align-items: center; z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: white; padding: 20px; border-radius: 10px;
            max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
        ">
            <div class="modal-header" style="
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px;
            ">
                <h2 style="margin: 0;">Resultados da Eleição</h2>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: none; border: none; font-size: 24px; cursor: pointer;
                ">×</button>
            </div>
            <div class="modal-body">
                <p><strong>Total de votos:</strong> ${totalVotos}</p>
                <div class="results-list">
                    ${resultados.map((resultado, index) => `
                        <div class="result-item" style="
                            padding: 10px; margin: 10px 0; border-radius: 5px;
                            background: ${index === 0 ? '#e8f5e9' : '#f5f5f5'};
                            border-left: 4px solid ${index === 0 ? '#4CAF50' : '#9e9e9e'};
                        ">
                            <div><strong>${resultado.numero} - ${resultado.candidato}</strong></div>
                            <div>${resultado.votos} votos (${((resultado.votos / totalVotos) * 100).toFixed(1)}%)</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==============================================
// LIMPEZA DE DADOS
// ==============================================
function limparVotos() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os votos registrados. Tem certeza?')) {
        localStorage.removeItem('votos');
        localStorage.removeItem('votosPendentes');
        showNotification('Todos os votos foram apagados!', 'warning');
    }
}

function limparTudo() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados. Tem certeza?')) {
        localStorage.removeItem('configuracaoEleicao');
        localStorage.removeItem('votos');
        localStorage.removeItem('votosPendentes');
        localStorage.removeItem('candidatos');
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

// ==============================================
// INICIALIZAÇÃO
// ==============================================
async function inicializar() {
    await testarConexaoSupabase();
    carregarConfiguracao();
    await carregarCandidatos();
    atualizarDisplay();
    atualizarInterfaceAdmin();
    aplicarTemaSalvo();
    atualizarDisplayEleicao();
    
    // Verificar votos pendentes
    setTimeout(() => {
        const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
        if (pendentes.length > 0) {
            showNotification(`${pendentes.length} votos pendentes para sincronizar`, 'info');
        }
    }, 2000);
}

// ==============================================
// EVENT LISTENERS
// ==============================================
document.addEventListener('DOMContentLoaded', inicializar);

// Teclado numérico físico
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
}, 30000);