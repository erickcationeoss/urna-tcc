// Configuração da eleição
let configuracao = {
    titulo: 'Eleição Universal',
    cargo: 'Representante',
    candidatos: {}
};

let votoAtual = '';
let modoAdmin = false;

// Inicialização
function inicializar() {
    carregarConfiguracao();
    carregarCandidatos();
    atualizarDisplay();
    atualizarInterfaceAdmin();
}

// Modo Admin
function toggleAdmin() {
    modoAdmin = !modoAdmin;
    const adminPanel = document.getElementById('admin-panel');
    const votingPanel = document.getElementById('voting-panel');
    
    if (modoAdmin) {
        adminPanel.style.display = 'block';
        votingPanel.style.display = 'none';
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
        alert('Preencha todos os campos!');
        return;
    }
    
    if (numero.length !== 2) {
        alert('O número deve ter 2 dígitos!');
        return;
    }
    
    if (configuracao.candidatos[numero]) {
        alert('Já existe um candidato com este número!');
        return;
    }
    
    configuracao.candidatos[numero] = {
        nome: nome.toUpperCase(),
        partido: partido.toUpperCase()
    };
    
    // Limpar formulário
    document.getElementById('numero-candidato').value = '';
    document.getElementById('nome-candidato').value = '';
    document.getElementById('partido-candidato').value = '';
    
    atualizarListaCandidatos();
    salvarConfiguracao();
}

function removerCandidato(numero) {
    if (confirm(`Tem certeza que deseja remover o candidato ${numero}?`)) {
        delete configuracao.candidatos[numero];
        atualizarListaCandidatos();
        salvarConfiguracao();
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
    alert('Configuração salva com sucesso!');
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
    votoAtual = 'BR';
    document.getElementById('nome-candidato-display').textContent = 'VOTO EM BRANCO';
    document.getElementById('partido-display').textContent = '';
    atualizarDisplay();
}

function corrige() {
    votoAtual = '';
    document.getElementById('nome-candidato-display').textContent = 'NOME DO CANDIDATO';
    document.getElementById('partido-display').textContent = 'PARTIDO/CHAPA';
    atualizarDisplay();
}

function confirma() {
    if (votoAtual === '') {
        alert('Digite um voto primeiro!');
        return;
    }

    salvarVoto({
        cargo: configuracao.cargo,
        numero: votoAtual,
        timestamp: new Date().toISOString(),
        candidato: configuracao.candidatos[votoAtual] ? 
                  configuracao.candidatos[votoAtual].nome : 
                  (votoAtual === 'BR' ? 'BRANCO' : 'NULO')
    });

    alert('Voto confirmado com sucesso!');
    corrige();
}

function salvarVoto(voto) {
    let votos = JSON.parse(localStorage.getItem('votos')) || [];
    votos.push(voto);
    localStorage.setItem('votos', JSON.stringify(votos));
}

// Gerenciamento de dados
function exportarResultados() {
    const votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    if (votos.length === 0) {
        alert('Nenhum voto registrado ainda!');
        return;
    }

    const resultados = calcularResultados(votos);
    
    const dados = JSON.stringify({
        configuracao: configuracao,
        votos: votos,
        resultados: resultados,
        totalVotos: votos.length,
        exportadoEm: new Date().toISOString()
    }, null, 2);

    fazerDownload(dados, 'resultados-eleicao.json');
    alert(`Resultados exportados! Total de votos: ${votos.length}`);
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
        alert('Nenhum voto registrado ainda!');
        return;
    }

    const resultados = calcularResultados(votos);
    let mensagem = `RESULTADOS - ${configuracao.titulo}\n\n`;
    mensagem += `Total de votos: ${votos.length}\n\n`;
    
    resultados.forEach((resultado, index) => {
        const percentual = ((resultado.votos / votos.length) * 100).toFixed(1);
        mensagem += `${index + 1}º - ${resultado.candidato} (${resultado.numero}): ${resultado.votos} votos (${percentual}%)\n`;
    });

    alert(mensagem);
}

function limparVotos() {
    if (confirm('Tem certeza que deseja limpar TODOS os votos? Esta ação não pode ser desfeita!')) {
        localStorage.removeItem('votos');
        alert('Votos limpos com sucesso!');
    }
}

function limparTudo() {
    if (confirm('⚠️ ATENÇÃO! Isso irá limpar TODOS os dados (configuração e votos). Tem certeza?')) {
        localStorage.removeItem('configuracaoEleicao');
        localStorage.removeItem('votos');
        configuracao = {
            titulo: 'Eleição Universal',
            cargo: 'Representante',
            candidatos: {}
        };
        alert('Todos os dados foram limpos!');
        location.reload();
    }
}

function carregarCandidatos() {
    // Candidatos padrão para exemplo
    if (Object.keys(configuracao.candidatos).length === 0) {
        configuracao.candidatos = {
            '12': { nome: 'JOÃO SILVA', partido: 'CHAPA A' },
            '15': { nome: 'MARIA SANTOS', partido: 'CHAPA B' },
            '18': { nome: 'PEDRO COSTA', partido: 'CHAPA C' }
        };
    }
}

// Inicializar a urna
document.addEventListener('DOMContentLoaded', inicializar);