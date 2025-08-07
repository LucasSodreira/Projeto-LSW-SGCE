document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário é administrador, se não, redirecionar
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }
    
    // Manipulação de arquivos
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const importButton = document.getElementById('importButton');
    
    fileInput.addEventListener('change', function(e) {
        if (fileInput.files.length > 0) {
            fileName.textContent = fileInput.files[0].name;
            importButton.disabled = false;
        } else {
            fileName.textContent = 'Nenhum arquivo selecionado';
            importButton.disabled = true;
        }
    });
    
    importButton.addEventListener('click', function() {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                // Tentar parsear como JSON
                const data = JSON.parse(event.target.result);
                processImportedData(data);
            } catch (e) {
                // Se falhar, considerar como TXT e tentar parsear
                try {
                    const textData = event.target.result;
                    const parsedData = parseTextData(textData);
                    processImportedData(parsedData);
                } catch (err) {
                    alert('Erro ao processar o arquivo. Verifique o formato.');
                    console.error(err);
                }
            }
        };
        
        reader.onerror = function() {
            alert('Erro ao ler o arquivo.');
        };
        
        reader.readAsText(file);
    });
    
    // Função para processar os dados importados
    function processImportedData(data) {
        // Verificar o formato dos dados e normalizar se necessário
        const normalizedData = normalizeData(data);
        
        // Salvar no localStorage
        localStorage.setItem('competitionsData', JSON.stringify(normalizedData));
        alert('Dados importados com sucesso!');
        
        // Atualizar a lista de competições
        updateCompetitionsList();
    }
    
    // Função para normalizar dados em diferentes formatos para um formato padrão
    function normalizeData(data) {
        // Se o formato já inclui partidas e times diretamente
        if (data.partidas || data.times) {
            return {
                competitions: [
                    {
                        name: "Competição Importada",
                        matches: data.partidas || [],
                        teams: data.times || []
                    }
                ]
            };
        } 
        // Se o formato já está no padrão esperado (com competitions)
        else if (data.competitions) {
            return data;
        }
        // Caso seja um array de partidas ou outro formato não reconhecido
        else if (Array.isArray(data)) {
            // Tentar determinar se são partidas ou times
            if (data.length > 0 && data[0].equipeA) {
                return {
                    competitions: [
                        {
                            name: "Competição Importada",
                            matches: data,
                            teams: extrairTimes(data)
                        }
                    ]
                };
            }
            // Se parecem ser times
            else if (data.length > 0 && data[0].jogadores) {
                return {
                    competitions: [
                        {
                            name: "Competição Importada",
                            teams: data,
                            matches: []
                        }
                    ]
                };
            }
        }
        
        // Se não conseguir determinar o formato, retorna um objeto vazio
        return { competitions: [] };
    }
    
    // Função para extrair informações de times a partir de partidas
    function extrairTimes(partidas) {
        const timesMap = new Map();
        
        partidas.forEach(partida => {
            if (partida.equipeA && !timesMap.has(partida.equipeA)) {
                timesMap.set(partida.equipeA, {
                    id: partida.equipeA,
                    nome: partida.equipeA,
                    jogadores: [],
                    tecnico: ""
                });
            }
            
            if (partida.equipeB && !timesMap.has(partida.equipeB)) {
                timesMap.set(partida.equipeB, {
                    id: partida.equipeB,
                    nome: partida.equipeB,
                    jogadores: [],
                    tecnico: ""
                });
            }
        });
        
        return Array.from(timesMap.values());
    }
    
    // Função para parsear dados de texto
    function parseTextData(text) {
        const lines = text.split('\n');
        const partidas = [];
        const times = [];
        
        let currentObject = null;
        let collectingPartida = false;
        let collectingTime = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === '' || line === 'Dados da partida' || line === 'Dados do time') {
                // Salva o objeto atual se estiver coletando dados
                if (collectingPartida && currentObject) {
                    partidas.push(currentObject);
                    currentObject = null;
                    collectingPartida = false;
                } else if (collectingTime && currentObject) {
                    times.push(currentObject);
                    currentObject = null;
                    collectingTime = false;
                }
                
                // Inicia um novo objeto se necessário
                if (line === 'Dados da partida') {
                    collectingPartida = true;
                    currentObject = {};
                } else if (line === 'Dados do time') {
                    collectingTime = true;
                    currentObject = {};
                }
                
                continue;
            }
            
            // Se estiver coletando um objeto e a linha parece uma abertura de JSON
            if ((collectingPartida || collectingTime) && line === '{') {
                let jsonContent = '';
                let braceCount = 1;
                let j = i + 1;
                
                // Coleta todas as linhas até o fechamento do JSON
                while (j < lines.length && braceCount > 0) {
                    const jsonLine = lines[j].trim();
                    
                    if (jsonLine === '{') braceCount++;
                    if (jsonLine === '}') braceCount--;
                    
                    jsonContent += jsonLine;
                    j++;
                }
                
                i = j - 1; // Atualiza o índice
                
                try {
                    // Tenta parsear o JSON
                    const jsonObject = JSON.parse(jsonContent);
                    currentObject = jsonObject;
                } catch (e) {
                    console.error('Erro ao parsear JSON:', e);
                }
            }
        }
        
        // Adiciona o último objeto se ele existir
        if (collectingPartida && currentObject) {
            partidas.push(currentObject);
        } else if (collectingTime && currentObject) {
            times.push(currentObject);
        }
        
        return {
            competitions: [
                {
                    name: "Competição Importada",
                    matches: partidas,
                    teams: times
                }
            ]
        };
    }
    
    // Função para atualizar a lista de competições
    function updateCompetitionsList() {
        const competitionsList = document.getElementById('competitionsList');
        const data = JSON.parse(localStorage.getItem('competitionsData'));
        
        if (!data || !data.competitions || data.competitions.length === 0) {
            competitionsList.innerHTML = '<p>Nenhuma competição encontrada.</p>';
            return;
        }
        
        let html = '<ul>';
        data.competitions.forEach((comp, index) => {
            html += `<li data-id="${index}"><strong>${comp.name}</strong>`;
            
            // Adiciona detalhes sobre times
            if (comp.teams && comp.teams.length > 0) {
                html += `<br>Times (${comp.teams.length}): `;
                html += comp.teams.slice(0, 3).map(team => team.nome || team.name || team.id).join(', ');
                if (comp.teams.length > 3) {
                    html += `, ...`;
                }
            }
            
            // Adiciona detalhes sobre partidas
            if (comp.matches && comp.matches.length > 0) {
                html += `<br>Partidas (${comp.matches.length}): `;
                html += comp.matches.slice(0, 2).map(match => {
                    const equipeA = match.equipeA || match.team1;
                    const equipeB = match.equipeB || match.team2;
                    const placar = match.placar || match.score || '0-0';
                    return `${equipeA} vs ${equipeB} (${placar})`;
                }).join(', ');
                
                if (comp.matches.length > 2) {
                    html += `, ...`;
                }
            }
            
            html += `</li>`;
        });
        html += '</ul>';
        
        competitionsList.innerHTML = html;
    }
    
    // Inicializar a lista de competições
    updateCompetitionsList();
    
    // Adicionar handlers para os botões de gerenciamento
    document.getElementById('addCompetition').addEventListener('click', function() {
        const name = prompt('Nome da nova competição:');
        if (!name) return;
        
        const data = JSON.parse(localStorage.getItem('competitionsData')) || { competitions: [] };
        
        data.competitions.push({
            name: name,
            teams: [],
            matches: []
        });
        
        localStorage.setItem('competitionsData', JSON.stringify(data));
        updateCompetitionsList();
    });
    
    // Implementar edição e exclusão de competições
    document.getElementById('editCompetition').addEventListener('click', function() {
        const selectedItems = document.querySelectorAll('#competitionsList li.selected');
        if (selectedItems.length !== 1) {
            alert('Selecione exatamente uma competição para editar.');
            return;
        }
        
        const index = selectedItems[0].getAttribute('data-id');
        const data = JSON.parse(localStorage.getItem('competitionsData'));
        const competition = data.competitions[index];
        
        const newName = prompt('Novo nome para a competição:', competition.name);
        if (newName && newName !== competition.name) {
            competition.name = newName;
            localStorage.setItem('competitionsData', JSON.stringify(data));
            updateCompetitionsList();
        }
    });
    
    document.getElementById('deleteCompetition').addEventListener('click', function() {
        const selectedItems = document.querySelectorAll('#competitionsList li.selected');
        if (selectedItems.length !== 1) {
            alert('Selecione exatamente uma competição para excluir.');
            return;
        }
        
        if (!confirm('Tem certeza que deseja excluir esta competição?')) {
            return;
        }
        
        const index = selectedItems[0].getAttribute('data-id');
        const data = JSON.parse(localStorage.getItem('competitionsData'));
        
        data.competitions.splice(index, 1);
        localStorage.setItem('competitionsData', JSON.stringify(data));
        updateCompetitionsList();
    });
    
    // Adicionar seleção de itens na lista
    document.addEventListener('click', function(e) {
        if (e.target && e.target.parentElement && e.target.parentElement.id === 'competitionsList') {
            const items = document.querySelectorAll('#competitionsList li');
            items.forEach(item => item.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });
});