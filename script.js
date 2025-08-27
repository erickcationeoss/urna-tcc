// Candidatos para prefeito
const candidatos = {
    '12': { nome: 'JOÃO SILVA', partido: 'PT' },
    '15': { nome: 'MARIA SANTOS', partido: 'PMDB' },
    '18': { nome: 'PEDRO COSTA', partido: 'PSDB' },
    '21': { nome: 'ANA OLIVEIRA', partido: 'PDT' },
    '27': { nome: 'CARLOS PEREIRA', partido: 'PSD' }
};

let votoAtual = '';
let cargoAtual = 'PREFEITO';

function pressionarTecla(numero) {
    if (votoAtual.length < 2) {
        votoAtual += numero;
        atualizarDisplay();
        
        // Se completou 2 dígitos, mostra o candidato
        if (votoAtual.length === 2) {
            mostrarCandidato();
        }
    }
}

function atualizarDisplay() {
    // Atualiza os números na tela
    for (let i = 0; i < 2; i++) {
        const elemento = document.getElementById(`numero${i + 1}`);
        if (elemento) {
            elemento.textContent = votoAtual[i] || '_';
        }
    }
}

function mostrarCandidato() {
    const candidato = candidatos[votoAtual];
    const nomeElemento = document.getElementById('nome-candidato');
    const partidoElemento = document.getElementById('partido');
    
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
    document.getElementById('nome-candidato').textContent = 'VOTO EM BRANCO';
    document.getElementById('partido').textContent = '';
    atualizarDisplay();
}

function corrige() {
    votoAtual = '';
    document.getElementById('nome-candidato').textContent = 'NOME DO CANDIDATO';
    document.getElementById('partido').textContent = 'PARTIDO';
    atualizarDisplay();
}

function confirma() {
    if (votoAtual === '') {
        alert('Digite um voto primeiro!');
        return;
    }

    // Salva o voto no localStorage
    salvarVoto({
        cargo: cargoAtual,
        numero: votoAtual,
        timestamp: new Date().toISOString(),
        candidato: candidatos[votoAtual] ? candidatos[votoAtual].nome : 'NULO/BRANCO'
    });

    alert('Voto confirmado com sucesso!');
    corrige(); // Limpa para o próximo voto
}

function salvarVoto(voto) {
    // Pega os votos existentes ou cria um array vazio
    let votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    // Adiciona o novo voto
    votos.push(voto);
    
    // Salva de volta no localStorage
    localStorage.setItem('votos', JSON.stringify(votos));
    
    console.log('Voto salvo:', voto);
    console.log('Total de votos:', votos.length);
}

function exportarResultados() {
    const votos = JSON.parse(localStorage.getItem('votos')) || [];
    
    if (votos.length === 0) {
        alert('Nenhum voto registrado ainda!');
        return;
    }

    // Cria um resumo dos resultados
    const resultados = {};
    votos.forEach(voto => {
        const key = `${voto.cargo}-${voto.numero}`;
        if (!resultados[key]) {
            resultados[key] = {
                cargo: voto.cargo,
                numero: voto.numero,
                candidato: voto.candidato,
                votos: 0
            };
        }
        resultados[key].votos++;
    });

    // Converte para JSON
    const dados = JSON.stringify({
        votos: votos,
        resultados: Object.values(resultados),
        total: votos.length,
        exportadoEm: new Date().toISOString()
    }, null, 2);

    // Cria um arquivo para download
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-urna-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Resultados exportados! Total de votos: ${votos.length}`);
}

function limparUrna() {
    if (confirm('Tem certeza que deseja limpar TODOS os votos? Esta ação não pode ser desfeita!')) {
        localStorage.removeItem('votos');
        alert('Urna limpa com sucesso!');
    }
}

// Inicializa a urna
atualizarDisplay();

// Log inicial para debug
console.log('Urna eletrônica iniciada!');
console.log('Candidatos disponíveis:', candidatos);