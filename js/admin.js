document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') { window.location.href = '../index.html'; return; }

    let dataSource = 'api'; // 'api' | 'offline'
    let dataSourceError = '';
    let competitionsCache = [];

    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const importButton = document.getElementById('importButton');

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) { fileName.textContent = fileInput.files[0].name; importButton.disabled = false; }
        else { fileName.textContent = 'Nenhum arquivo selecionado'; importButton.disabled = true; }
    });

    importButton.addEventListener('click', () => {
        const file = fileInput.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try { processImportedData(JSON.parse(e.target.result)); }
            catch(err){
                try { processImportedData(parseTextData(e.target.result)); }
                catch(inner){ alert('Erro ao processar o arquivo.'); console.error(inner); }
            }
        };
        reader.onerror = () => alert('Erro ao ler o arquivo.');
        reader.readAsText(file);
    });

    async function initData(){
        try {
            if(!window.API || !window.API.CompetitionsAPI) throw new Error('Camada API indisponível');
            competitionsCache = await window.API.CompetitionsAPI.list();
            dataSource = 'api';
        } catch(e){ dataSource='offline'; dataSourceError=e.message || 'Falha desconhecida'; }
        updateCompetitionsList();
        showDataSourceBadge();
    }
    initData();

    function processImportedData(data){
        try {
            const validation = validateImportedData(data);
            if(!validation.valid){ alert('Erro na validação: '+validation.error); return; }
            const normalized = normalizeData(data);
            localStorage.setItem('competitionsData', JSON.stringify(normalized));
            if(dataSource==='offline') updateCompetitionsList();
            alert('Dados importados com sucesso! (Modo offline)');
        } catch(e){ alert('Erro ao processar importação: '+e.message); }
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
    
    function updateCompetitionsList(){
        const el = document.getElementById('competitionsList');
        let comps;
        if(dataSource==='api'){ comps = competitionsCache; }
        else {
            const local = JSON.parse(localStorage.getItem('competitionsData'));
            comps = local && local.competitions ? local.competitions : [];
        }
        if(!comps || comps.length===0){ el.innerHTML='<p>Nenhuma competição encontrada.</p>'; return; }
        let html='<ul>';
        comps.forEach((c,i)=>{ html += `<li data-id="${i}"><strong>${c.name || c.nome}</strong></li>`; });
        html+='</ul>';
        el.innerHTML=html;
    }
    
    // Adicionar handlers para os botões de gerenciamento
    document.getElementById('addCompetition').addEventListener('click', async () => {
        const name = prompt('Nome da nova competição:'); if(!name) return;
        if(dataSource==='api'){
            try { const created = await window.API.CompetitionsAPI.create({ name }); competitionsCache.push(created); updateCompetitionsList(); alert('Competição criada na API.'); }
            catch(e){ alert('Falha ao criar competição na API: '+e.message); }
        } else {
            const local = JSON.parse(localStorage.getItem('competitionsData')) || { competitions: [] };
            local.competitions.push({ name, teams:[], matches:[] });
            localStorage.setItem('competitionsData', JSON.stringify(local));
            updateCompetitionsList();
        }
    });
    
    // Implementar edição e exclusão de competições
    document.getElementById('editCompetition').addEventListener('click', async () => {
        const selected = document.querySelectorAll('#competitionsList li.selected');
        if(selected.length!==1){ alert('Selecione exatamente uma competição.'); return; }
        const index = selected[0].getAttribute('data-id');
        let comp;
        if(dataSource==='api') comp = competitionsCache[index];
        else { const local = JSON.parse(localStorage.getItem('competitionsData')); comp = local.competitions[index]; }
        const newName = prompt('Novo nome da competição:', comp.name); if(!newName || newName===comp.name) return;
        if(dataSource==='api'){
            try { await window.API.CompetitionsAPI.patch(comp.id, { name:newName }); comp.name=newName; updateCompetitionsList(); }
            catch(e){ alert('Erro ao renomear na API: '+e.message); }
        } else {
            comp.name=newName; const local = JSON.parse(localStorage.getItem('competitionsData')); local.competitions[index]=comp; localStorage.setItem('competitionsData', JSON.stringify(local)); updateCompetitionsList();
        }
    });
    
    document.getElementById('deleteCompetition').addEventListener('click', async () => {
        const selected = document.querySelectorAll('#competitionsList li.selected');
        if(selected.length!==1){ alert('Selecione exatamente uma competição para excluir.'); return; }
        if(!confirm('Confirmar exclusão?')) return;
        const index = selected[0].getAttribute('data-id');
        if(dataSource==='api'){
            const comp = competitionsCache[index];
            try { await window.API.CompetitionsAPI.remove(comp.id); competitionsCache.splice(index,1); updateCompetitionsList(); alert('Competição removida da API.'); }
            catch(e){ alert('Erro ao remover na API: '+e.message); }
        } else {
            const local = JSON.parse(localStorage.getItem('competitionsData'));
            local.competitions.splice(index,1);
            localStorage.setItem('competitionsData', JSON.stringify(local));
            updateCompetitionsList();
        }
    });
    
    // Adicionar seleção de itens na lista
    document.addEventListener('click', e => {
        if(e.target && e.target.closest('#competitionsList li')){
            document.querySelectorAll('#competitionsList li').forEach(li=>li.classList.remove('selected'));
            e.target.closest('#competitionsList li').classList.add('selected');
        }
    });

    // Adicionar funcionalidade de exportar dados
    document.getElementById('exportData').addEventListener('click', () => {
        const local = JSON.parse(localStorage.getItem('competitionsData')) || { competitions: [] };
        if(local.competitions.length===0){ alert('Nenhum dado local para exportar. (Exporta somente modo offline)'); return; }
        const blob = new Blob([ JSON.stringify(local, null, 2) ], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=`sgce-dados-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        alert('Exportação concluída.');
    });

    // Adicionar funcionalidade de limpar todos os dados
    document.getElementById('clearAllData').addEventListener('click', () => {
        if(!confirm('Excluir TODOS os dados locais?')) return;
        localStorage.removeItem('competitionsData');
        if(dataSource==='offline') updateCompetitionsList();
        alert('Dados locais limpos.');
    });
    
    // Função para validar dados importados
    function validateImportedData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Dados inválidos ou vazios.' };
        }

        // Verificar se tem competições
        if (data.competitions && Array.isArray(data.competitions)) {
            for (let i = 0; i < data.competitions.length; i++) {
                const comp = data.competitions[i];
                if (!comp.name || typeof comp.name !== 'string') {
                    return { valid: false, error: `Competição ${i + 1} não tem nome válido.` };
                }
            }
        }

        // Verificar se tem partidas diretamente
        if (data.partidas && Array.isArray(data.partidas)) {
            for (let i = 0; i < data.partidas.length; i++) {
                const partida = data.partidas[i];
                if (!partida.equipeA || !partida.equipeB) {
                    return { valid: false, error: `Partida ${i + 1} não tem equipes válidas.` };
                }
            }
        }

        // Verificar se tem times diretamente
        if (data.times && Array.isArray(data.times)) {
            for (let i = 0; i < data.times.length; i++) {
                const time = data.times[i];
                if (!time.nome && !time.name) {
                    return { valid: false, error: `Time ${i + 1} não tem nome válido.` };
                }
            }
        }

        return { valid: true };
    }

    function showDataSourceBadge(){
        let badge = document.getElementById('dataSourceBadge');
        if(!badge){
            badge = document.createElement('div');
            badge.id='dataSourceBadge';
            badge.style.position='fixed';
            badge.style.bottom='10px';
            badge.style.left='10px';
            badge.style.padding='6px 10px';
            badge.style.borderRadius='6px';
            badge.style.fontSize='12px';
            badge.style.fontFamily='system-ui,sans-serif';
            badge.style.boxShadow='0 2px 6px rgba(0,0,0,.25)';
            badge.style.zIndex='9999';
            document.body.appendChild(badge);
        }
        if(dataSource==='api') { badge.textContent='Fonte de dados: API (json-server)'; badge.style.background='#0d5726'; badge.style.color='#fff'; }
        else { badge.textContent='Fonte de dados: Offline (localStorage)'; badge.style.background='#7a0016'; badge.style.color='#fff'; badge.title='Erro API: '+dataSourceError; }
    }
});