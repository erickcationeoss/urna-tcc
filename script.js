// Configuração do Supabase - SUBSTITUA COM SUAS CREDENCIAIS REAIS
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-aqui';

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

// SISTEMA DE COMPARTILHAMENTO DE VOTOS
let sessaoCompartilhamento = null;
let isReceiving = false;

// Gerar ID único para sessão
function gerarIdSessao() {
    return 'sessao_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Iniciar sessão de compartilhamento
function iniciarCompartilhamento() {
    if (!navigator.onLine) {
        showNotification('É necessário estar online para compartilhar votos', 'error');
        return;
    }
    
    sessaoCompartilhamento = gerarIdSessao();
    
    // Salvar sessão no localStorage (já que o Supabase pode estar com problemas)
    const sessoes = JSON.parse(localStorage.getItem('sessoes_compartilhamento')) || {};
    sessoes[sessaoCompartilhamento] = {
        id: sessaoCompartilhamento,
        criador: true,
        ativa: true,
        data_criacao: new Date().toISOString()
    };
    localStorage.setItem('sessoes_compartilhamento', JSON.stringify(sessoes));
    
    // Gerar link de compartilhamento
    const link = `${window.location.origin}${window.location.pathname}?sessao=${sessaoCompartilhamento}`;
    
    // Mostrar link para compartilhamento
    const linkInput = document.getElementById('link-compartilhamento');
    if (linkInput) {
        linkInput.value = link;
        document.getElementById('compartilhamento-container').style.display = 'block';
    }
    
    showNotification('Sessão de compartilhamento criada! Compartilhe o link.', 'success');
}

// Parar compartilhamento
function pararCompartilhamento() {
    if (!sessaoCompartilhamento) return;
    
    // Marcar sessão como inativa no localStorage
    const sessoes = JSON.parse(localStorage.getItem('sessoes_compartilhamento')) || {};
    if (sessoes[sessaoCompartilhamento]) {
        sessoes[sessaoCompartilhamento].ativa = false;
        localStorage.setItem('sessoes_compartilhamento', JSON.stringify(sessoes));
    }
    
    sessaoCompartilhamento = null;
    isReceiving = false;
    
    document.getElementById('compartilhamento-container').style.display = 'none';
    showNotification('Compartilhamento encerrado', 'info');
}

// Copiar link para área de transferência
function copiarLink() {
    const linkInput = document.getElementById('link-compartilhamento');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        showNotification('Link copiado para a área de transferência!', 'success');
    }
}

// Participar de uma sessão existente
function participarSessao(sessaoId) {
    if (!navigator.onLine) {
        showNotification('É necessário estar online para participar de sessão', 'error');
        return;
    }
    
    // Verificar se a sessão existe no localStorage
    const sessoes = JSON.parse(localStorage.getItem('sessoes_compartilhamento')) || {};
    if (!sessoes[sessaoId] || !sessoes[sessaoId].ativa) {
        showNotification('Sessão não encontrada ou inativa', 'error');
        return;
    }
    
    sessaoCompartilhamento = sessaoId;
    isReceiving = true;
    
    // Registrar participação na sessão (localStorage)
    const participantes = JSON.parse(localStorage.getItem('participantes_sessao')) || {};
    const participanteId = gerarIdSessao().substr(0, 8);
    participantes[participanteId] = {
        sessao_id: sessaoId,
        participante_id: participanteId,
        data_ingresso: new Date().toISOString()
    };
    localStorage.setItem('participantes_sessao', JSON.stringify(participantes));
    
    showNotification('Conectado à sessão de compartilhamento!', 'success');
    
    // Esconder UI de convite se estiver visível
    const conviteContainer = document.getElementById('convite-container');
    if (conviteContainer) {
        conviteContainer.style.display = 'none';
    }
}

// Verificar se há parâmetro de sessão na URL
function verificarParametroSessao() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessaoParam = urlParams.get('sessao');
    
    if (sessaoParam) {
        // Mostrar UI de convite para participar
        const conviteContainer = document.getElementById('convite-container');
        if (conviteContainer) {
            conviteContainer.style.display = 'block';
            document.getElementById('sessao-id').textContent = sessaoParam;
            
            // Adicionar evento ao botão de participar
            document.getElementById('btn-participar-sessao').onclick = function() {
                participarSessao(sessaoParam);
            };
        }
    }
}

// Compartilhar voto com a sessão
async function compartilharVoto(votoData) {
    if (!sessaoCompartilhamento || !navigator.onLine) return;
    
    try {
        // Salvar no localStorage para compartilhamento
        const votosCompartilhados = JSON.parse(localStorage.getItem('votos_compartilhados')) || [];
        votoData.sessao_id = sessaoCompartilhamento;
        votosCompartilhados.push(votoData);
        localStorage.setItem('votos_compartilhados', JSON.stringify(votosCompartilhados));
        
        showNotification('Voto compartilhado na sessão!', 'success');
    } catch (e) {
        console.error('Exceção ao compartilhar voto:', e);
    }
}

// Verificar votos recebidos da sessão
function verificarVotosRecebidos() {
    if (!sessaoCompartilhamento) return;
    
    // Verificar votos compartilhados no localStorage periodicamente
    setInterval(() => {
        if (!sessaoCompartilhamento) return;
        
        const votosCompartilhados = JSON.parse(localStorage.getItem('votos_compartilhados')) || [];
        const votosDaSessao = votosCompartilhados.filter(voto => voto.sessao_id === sessaoCompartilhamento);
        
        if (votosDaSessao.length > 0) {
            votosDaSessao.forEach(voto => {
                // Evitar processar próprio voto
                if (voto.timestamp && (Date.now() - new Date(voto.timestamp).getTime()) > 5000) {
                    // Salvar voto recebido localmente
                    salvarVotoLocal(voto);
                    showNotification(`Voto recebido: ${voto.candidato}`, 'info');
                }
            });
        }
    }, 5000); // Verificar a cada 5 segundos
}

// Salvar voto recebido localmente
function salvarVotoLocal(votoData) {
    let votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    // Verificar se voto já existe
    const votoExiste = votos.some(v => 
        v.cargo === votoData.cargo && 
        v.numero === votoData.numero && 
        v.timestamp === votoData.timestamp
    );
    
    if (!votoExiste) {
        votos.push(votoData);
        localStorage.setItem('votos', JSON.stringify(votos));
    }
}

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
    
    // Verificar parâmetros de sessão na URL
    verificarParametroSessao();
}

// Timer de votação - MODIFICADO: não inicia automaticamente
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
    localStorage.setItem('candidatos', JSON.stringify(configuracao.candidatos));
    showNotification('Configuração salva com sucesso!');
    atualizarDisplayEleicao();
}

function carregarConfiguracao() {
    const saved = localStorage.getItem('configuracaoEleicao');
    if (saved) {
        configuracao = JSON.parse(saved);
    }
}

function carregarCandidatos() {
    const saved = localStorage.getItem('candidatos');
    if (saved) {
        configuracao.candidatos = JSON.parse(saved);
    }
}

function atualizarDisplayEleicao() {
    const tituloDisplay = document.getElementById('titulo-eleicao-display');
    const cargoDisplay = document.getElementById('cargo-display');
    
    if (tituloDisplay) tituloDisplay.textContent = configuracao.titulo;
    if (cargoDisplay) cargoDisplay.textContent = configuracao.cargo;
}

// Funções de votação - MODIFICADO: timer inicia apenas ao pressionar tecla
function pressionarTecla(numero) {
    // Iniciar timer apenas se não estiver ativo
    if (!timerAtivo) {
        iniciarTimer();
    }
    
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
    // Iniciar timer apenas se não estiver ativo
    if (!timerAtivo) {
        iniciarTimer();
    }
    
    votoAtual = 'BR';
    const nomeElemento = document.getElementById('nome-candidato-display');
    const partidoElemento = document.getElementById('partido-display');
    
    if (nomeElemento) nomeElemento.textContent = 'VOTO EM BRANCO';
    if (partidoElemento) partidoElemento.textContent = '';
    atualizarDisplay();
}

function corrige() {
    // Iniciar timer apenas se não estiver ativo
    if (!timerAtivo) {
        iniciarTimer();
    }
    
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

// Função para salvar voto (local apenas, já que o Supabase está com problemas)
async function salvarVoto(votoData) {
    try {
        // Salvar no localStorage
        let votos = JSON.parse(localStorage.getItem('votos')) || [];
        votos.push(votoData);
        localStorage.setItem('votos', JSON.stringify(votos));
        
        // Compartilhar voto se estiver em sessão
        if (sessaoCompartilhamento) {
            await compartilharVoto(votoData);
        }
        
        showNotification('Voto salvo com sucesso!', 'success');
        
    } catch (e) {
        console.error('Erro ao salvar voto:', e);
        showNotification('Erro ao salvar voto', 'error');
    }
}

// Verificar votos pendentes
function verificarVotosPendentes() {
    const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    if (pendentes.length > 0) {
        showNotification(`${pendentes.length} votos pendentes para sincronizar`, 'info');
    }
}

// Sincronizar votos offline com Supabase (função placeholder)
async function sincronizarVotosOffline() {
    showNotification('Funcionalidade de sincronização com Supabase temporariamente desativada', 'info');
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
        
        // Fazer download do JSON localmente
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
    
    // Mostrar em modal
    mostrarResultadosModal(resultados, todosVotos.length);
}

function mostrarResultadosModal(resultados, totalVotos) {
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div class="modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
            ">
                <h2 style="margin: 0;">Resultados da Eleição</h2>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                ">×</button>
            </div>
            <div class="modal-body">
                <p><strong>Total de votos:</strong> ${totalVotos}</p>
                <div class="results-list">
                    ${resultados.map((resultado, index) => `
                        <div class="result-item" style="
                            padding: 10px;
                            margin: 10px 0;
                            border-radius: 5px;
                            background: ${index === 0 ? '#e8f5e9' : '#f5f5f5'};
                            border-left: 4px solid ${index === 0 ? '#4CAF50' : '#9e9e9e'};
                        ">
                            <div>
                                <strong>${resultado.numero} - ${resultado.candidato}</strong>
                            </div>
                            <div>
                                ${resultado.votos} votos (${((resultado.votos / totalVotos) * 100).toFixed(1)}%)
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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

function atualizarInterfaceAdmin() {
    // Atualiza a interface quando necessário
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializar();
    // Timer não inicia mais automaticamente
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