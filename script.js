// Configuração do Supabase - SUBSTITUA COM SUAS CREDENCIAIS
const SUPABASE_URL = 'https://xvxrxzjunbeuajpzazhl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eHJ4emp1bmJldWFqcHphemhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzU0MzYsImV4cCI6MjA3MjA1MTQzNn0.ckHqVnUgieW6xIEm9k0XxtD4B9D_qnPcFs2G-FuUmiU';

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
    
    // Salvar sessão no Supabase
    supabase
        .from('sessoes_compartilhamento')
        .insert([
            { 
                id: sessaoCompartilhamento,
                criador: true,
                ativa: true,
                data_criacao: new Date().toISOString()
            }
        ])
        .then(({ error }) => {
            if (error) {
                console.error('Erro ao criar sessão:', error);
                showNotification('Erro ao iniciar compartilhamento', 'error');
                sessaoCompartilhamento = null;
                return;
            }
            
            // Gerar link de compartilhamento
            const link = `${window.location.origin}${window.location.pathname}?sessao=${sessaoCompartilhamento}`;
            
            // Mostrar link para compartilhamento
            const linkInput = document.getElementById('link-compartilhamento');
            if (linkInput) {
                linkInput.value = link;
                document.getElementById('compartilhamento-container').style.display = 'block';
            }
            
            showNotification('Sessão de compartilhamento criada! Compartilhe o link.', 'success');
            
            // Iniciar verificação de votos recebidos
            verificarVotosRecebidos();
        });
}

// Parar compartilhamento
function pararCompartilhamento() {
    if (!sessaoCompartilhamento) return;
    
    // Marcar sessão como inativa no Supabase
    supabase
        .from('sessoes_compartilhamento')
        .update({ ativa: false })
        .eq('id', sessaoCompartilhamento)
        .then(({ error }) => {
            if (error) {
                console.error('Erro ao finalizar sessão:', error);
            }
        });
    
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
    
    // Verificar se a sessão existe e está ativa
    supabase
        .from('sessoes_compartilhamento')
        .select('*')
        .eq('id', sessaoId)
        .eq('ativa', true)
        .single()
        .then(({ data, error }) => {
            if (error || !data) {
                showNotification('Sessão não encontrada ou inativa', 'error');
                return;
            }
            
            sessaoCompartilhamento = sessaoId;
            isReceiving = true;
            
            // Registrar participação na sessão
            supabase
                .from('participantes_sessao')
                .insert([
                    { 
                        sessao_id: sessaoId,
                        participante_id: gerarIdSessao().substr(0, 8),
                        data_ingresso: new Date().toISOString()
                    }
                ])
                .then(({ error }) => {
                    if (error) {
                        console.error('Erro ao registrar participação:', error);
                    }
                });
            
            showNotification('Conectado à sessão de compartilhamento!', 'success');
            
            // Iniciar verificação de votos recebidos
            verificarVotosRecebidos();
            
            // Esconder UI de convite se estiver visível
            const conviteContainer = document.getElementById('convite-container');
            if (conviteContainer) {
                conviteContainer.style.display = 'none';
            }
        });
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
        const { error } = await supabase
            .from('votos_compartilhados')
            .insert([
                {
                    sessao_id: sessaoCompartilhamento,
                    cargo: votoData.cargo,
                    numero: votoData.numero,
                    candidato: votoData.candidato,
                    timestamp: votoData.timestamp
                }
            ]);
            
        if (error) {
            console.error('Erro ao compartilhar voto:', error);
        }
    } catch (e) {
        console.error('Exceção ao compartilhar voto:', e);
    }
}

// Verificar votos recebidos da sessão
function verificarVotosRecebidos() {
    if (!sessaoCompartilhamento) return;
    
    // Configurar subscription para novos votos
    const subscription = supabase
        .channel('votos-compartilhados')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'votos_compartilhados',
                filter: `sessao_id=eq.${sessaoCompartilhamento}`
            },
            (payload) => {
                // Evitar processar próprio voto
                if (payload.new.timestamp && 
                    (Date.now() - new Date(payload.new.timestamp).getTime()) > 5000) {
                    
                    const votoRecebido = payload.new;
                    console.log('Voto recebido:', votoRecebido);
                    
                    // Salvar voto recebido localmente
                    salvarVotoLocal(votoRecebido);
                    
                    showNotification(`Voto recebido: ${votoRecebido.candidato}`, 'info');
                }
            }
        )
        .subscribe();
    
    // Também verificar votos existentes periodicamente
    setInterval(() => {
        if (!sessaoCompartilhamento || !navigator.onLine) return;
        
        buscarVotosDaSessao();
    }, 10000); // Verificar a cada 10 segundos
}

// Buscar votos existentes na sessão
async function buscarVotosDaSessao() {
    try {
        const { data, error } = await supabase
            .from('votos_compartilhados')
            .select('*')
            .eq('sessao_id', sessaoCompartilhamento)
            .order('timestamp', { ascending: true });
            
        if (error) {
            console.error('Erro ao buscar votos da sessão:', error);
            return;
        }
        
        if (data && data.length > 0) {
            // Processar votos recebidos
            data.forEach(voto => {
                // Verificar se já temos este voto
                const votosExistentes = JSON.parse(localStorage.getItem('votos')) || [];
                const votoJaExiste = votosExistentes.some(v => 
                    v.cargo === voto.cargo && 
                    v.numero === voto.numero && 
                    v.timestamp === voto.timestamp
                );
                
                if (!votoJaExiste) {
                    salvarVotoLocal(voto);
                }
            });
        }
    } catch (e) {
        console.error('Erro ao processar votos da sessão:', e);
    }
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
async function salvarVoto(votoData) {
    try {
        // Salvar no localStorage (para funcionamento offline)
        let votos = JSON.parse(localStorage.getItem('votos')) || [];
        votos.push(votoData);
        localStorage.setItem('votos', JSON.stringify(votos));
        
        // Compartilhar voto se estiver em sessão
        if (sessaoCompartilhamento) {
            await compartilharVoto(votoData);
        }
        
        // Tentar salvar no Supabase (não bloqueante)
        salvarVotoOnline(votoData);
        
    } catch (e) {
        console.error('Erro ao salvar voto:', e);
        adicionarParaSincronizacao(votoData);
    }
}

// Salvar online de forma não bloqueante
async function salvarVotoOnline(votoData) {
    try {
        const { error } = await supabase
            .from('votos')
            .insert([
                { 
                    cargo: votoData.cargo, 
                    numero: votoData.numero, 
                    candidato: votoData.candidato
                    // O campo created_at será preenchido automaticamente pelo Supabase
                }
            ]);
            
        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            adicionarParaSincronizacao(votoData);
        } else {
            console.log('Voto salvo com sucesso no Supabase');
        }
    } catch (e) {
        console.error('Exceção ao salvar online:', e);
        adicionarParaSincronizacao(votoData);
    }
}

// Adicionar voto para sincronização posterior
function adicionarParaSincronizacao(votoData) {
    let pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    pendentes.push(votoData);
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

// Sincronizar votos offline com Supabase
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
// Modal para resultados
function mostrarResultadosModal(resultados, totalVotos) {
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Resultados da Eleição</h2>
                <button class="close-modal" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="modal-body">
                <p><strong>Total de votos:</strong> ${totalVotos}</p>
                <div class="results-list">
                    ${resultados.map((resultado, index) => `
                        <div class="result-item ${index === 0 ? 'result-winner' : ''}">
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
            modal.style.display = 'none';
        }
    });
}

// Modificar a função visualizarResultados
function visualizarResultados() {
    const votos = JSON.parse(localStorage.getItem('votos')) || [];
    const pendentes = JSON.parse(localStorage.getItem('votosPendentes')) || [];
    const todosVotos = [...votos, ...pendentes];
    
    if (todosVotos.length === 0) {
        showNotification('Nenhum voto registrado ainda!', 'warning');
        return;
    }
    
    const resultados = calcularResultados(todosVotos);
    
    // Mostrar em modal ao invés de alert
    mostrarResultadosModal(resultados, todosVotos.length);
}
// Adicione estas funções após a inicialização do Supabase

// Carregar candidatos do Supabase
async function carregarCandidatos() {
    try {
        const { data, error } = await supabase
            .from('candidatos')
            .select('*')
            .order('numero', { ascending: true });
            
        if (error) {
            console.error('Erro ao carregar candidatos:', error);
            // Fallback para candidatos locais
            const saved = localStorage.getItem('candidatos');
            if (saved) {
                configuracao.candidatos = JSON.parse(saved);
            }
            return;
        }
        
        if (data && data.length > 0) {
            // Converter array de candidatos para objeto
            configuracao.candidatos = {};
            data.forEach(candidato => {
                configuracao.candidatos[candidato.numero] = {
                    nome: candidato.nome,
                    partido: candidato.partido
                };
            });
            
            // Também salvar localmente como backup
            localStorage.setItem('candidatos', JSON.stringify(configuracao.candidatos));
        } else {
            // Carregar do localStorage se não houver candidatos no Supabase
            const saved = localStorage.getItem('candidatos');
            if (saved) {
                configuracao.candidatos = JSON.parse(saved);
            }
        }
    } catch (e) {
        console.error('Erro ao carregar candidatos:', e);
        const saved = localStorage.getItem('candidatos');
        if (saved) {
            configuracao.candidatos = JSON.parse(saved);
        }
    }
}

// Salvar candidato no Supabase
async function salvarCandidatoNoSupabase(numero, nome, partido) {
    try {
        const { error } = await supabase
            .from('candidatos')
            .insert([
                { 
                    numero: numero,
                    nome: nome.toUpperCase(),
                    partido: partido.toUpperCase()
                }
            ]);
            
        if (error) {
            console.error('Erro ao salvar candidato no Supabase:', error);
            // Salvar apenas localmente em caso de erro
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Exceção ao salvar candidato:', e);
        return false;
    }
}

// Remover candidato do Supabase
async function removerCandidatoDoSupabase(numero) {
    try {
        const { error } = await supabase
            .from('candidatos')
            .delete()
            .eq('numero', numero);
            
        if (error) {
            console.error('Erro ao remover candidato do Supabase:', error);
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Exceção ao remover candidato:', e);
        return false;
    }
}

// Modifique a função adicionarCandidato para salvar no Supabase
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
    
    // Tentar salvar no Supabase primeiro
    const sucessoOnline = await salvarCandidatoNoSupabase(numero, nome, partido);
    
    // Salvar localmente de qualquer forma
    configuracao.candidatos[numero] = {
        nome: nome.toUpperCase(),
        partido: partido.toUpperCase()
    };
    
    // Salvar backup local
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

// Modifique a função removerCandidato para remover do Supabase
async function removerCandidato(numero) {
    if (confirm(`Tem certeza que deseja remover o candidato ${numero}?`)) {
        // Tentar remover do Supabase
        await removerCandidatoDoSupabase(numero);
        
        // Remover localmente de qualquer forma
        delete configuracao.candidatos[numero];
        
        // Atualizar backup local
        localStorage.setItem('candidatos', JSON.stringify(configuracao.candidatos));
        
        atualizarListaCandidatos();
        salvarConfiguracao();
        showNotification('Candidato removido com sucesso!');
    }
}

// Adicione esta função para sincronizar candidatos locais com o Supabase
async function sincronizarCandidatos() {
    const candidatosLocais = JSON.parse(localStorage.getItem('candidatos') || '{}');
    
    if (Object.keys(candidatosLocais).length === 0) return;
    
    try {
        for (const [numero, candidato] of Object.entries(candidatosLocais)) {
            // Verificar se o candidato já existe no Supabase
            const { data, error } = await supabase
                .from('candidatos')
                .select('numero')
                .eq('numero', numero)
                .single();
                
            if (error || !data) {
                // Candidato não existe, vamos adicionar
                await salvarCandidatoNoSupabase(numero, candidato.nome, candidato.partido);
            }
        }
        
        // Limpar candidatos locais após sincronização bem-sucedida
        localStorage.removeItem('candidatos');
        showNotification('Candidatos sincronizados com o Supabase!', 'success');
    } catch (e) {
        console.error('Erro ao sincronizar candidatos:', e);
    }
}

// Modifique a função inicializar para carregar candidatos corretamente
async function inicializar() {
    carregarConfiguracao();
    await carregarCandidatos(); // Agora é async
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
    
    // Sincronizar candidatos locais se houver conexão
    if (navigator.onLine) {
        setTimeout(sincronizarCandidatos, 3000);
    }
}