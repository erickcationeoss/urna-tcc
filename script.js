// Configuração do Supabase - SUBSTITUA COM SUAS CREDENCIAIS
const SUPABASE_URL = 'https://xvxrxzjunbeuajpzazhl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eHJ4emp1bmJldWFqcHphemhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzU0MzYsImV4cCI6MjA3MjA1MTQzNn0.ckHqVnUgieW6xIEm9k0XxtD4B9D_qnPcFs2G-FuUmiU';

// Inicializar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ... (mantenha todo o código anterior de notificações, configuração, timer, etc.) ...

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

// Modificar a função salvarVoto para incluir compartilhamento
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

// Inicialização com verificação de parâmetros de sessão
document.addEventListener('DOMContentLoaded', function() {
    inicializar();
    iniciarTimer();
    verificarParametroSessao(); // Verificar se há parâmetro de sessão na URL
});

// ... (mantenha o restante do código existente) ...