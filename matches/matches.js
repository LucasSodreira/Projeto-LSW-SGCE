document.addEventListener('DOMContentLoaded', function() {
    let apiState = { competitions: [], teams: [], matches: [] };
    let currentEditingMatch = null; // objeto da partida carregada
    let dataSource = 'api'; // 'api' | 'fallback'
    let dataSourceError = '';

    async function initializePage() {
        // Garantir que api.js foi carregado
        if(!window.API || !window.API.loadAll){
            try {
                await new Promise((resolve,reject)=>{
                    const s=document.createElement('script');
                    s.src='../js/api.js';
                    s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
                });
            } catch(e){ console.error('Falha ao injetar api.js dinamicamente', e); }
        }
        try {
            showLoading(true);
            apiState = await window.API.loadAll();
            dataSource = 'api';
            dataSourceError = '';
        } catch (e) {
            console.error('Falha ao carregar API:', e);
            dataSourceError = e && e.message ? e.message : 'Falha desconhecida';
            // fallback: tentar dados locais
            await loadFallback();
            dataSource = 'fallback';
        } finally {
            showLoading(false);
        }
        populateFilters();
        renderMatches();
        setupEventListeners();
        restoreFilters();
        applyFilters();
        showDataSourceBadge();
    }

    async function loadFallback(){
        const candidatePaths = ['../dados.json','./dados.json','/dados.json'];
        for (const path of candidatePaths){
            try {
                const res = await fetch(path, { cache: 'no-cache' });
                if(!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                apiState = {
                    competitions: [{ id:1, name:'Competição Padrão', matches: data.partidas||[] }],
                    teams: data.times || [],
                    matches: data.partidas || []
                };
                return true;
            } catch(err){
                // tenta próxima rota
            }
        }
        console.warn('Sem fallback disponível (dados.json não acessível em caminhos testados).');
        return false;
    }

    function showLoading(flag){
        let el = document.getElementById('loadingBar');
        if(!el){
            el = document.createElement('div');
            el.id='loadingBar';
            el.style.position='fixed';
            el.style.top='0';
            el.style.left='0';
            el.style.width='100%';
            el.style.padding='6px 12px';
            el.style.background='#222';
            el.style.color='#fff';
            el.style.fontSize='14px';
            el.style.zIndex='9999';
            el.style.fontFamily='sans-serif';
            el.textContent='Carregando...';
            document.body.appendChild(el);
        }
        el.style.display = flag ? 'block' : 'none';
    }

    function showDataSourceBadge(){
        let badge = document.getElementById('dataSourceBadge');
        if(!badge){
            badge = document.createElement('div');
            badge.id = 'dataSourceBadge';
            badge.style.position = 'fixed';
            badge.style.bottom = '10px';
            badge.style.left = '10px';
            badge.style.padding = '6px 10px';
            badge.style.borderRadius = '6px';
            badge.style.fontSize = '12px';
            badge.style.fontFamily = 'system-ui, sans-serif';
            badge.style.boxShadow = '0 2px 6px rgba(0,0,0,.25)';
            badge.style.zIndex = '9999';
            badge.style.cursor = 'default';
            document.body.appendChild(badge);
        }
        if(dataSource === 'api'){
            badge.textContent = 'Fonte de dados: API (json-server)';
            badge.style.background = '#0d5726';
            badge.style.color = '#fff';
        } else {
            badge.textContent = 'Fonte de dados: Fallback local (dados.json)';
            badge.style.background = '#7a0016';
            badge.style.color = '#fff';
        }
        badge.title = (dataSource === 'api') ?
            'Dados carregados do json-server.' :
            'Falha ao contatar API. Usando dados.json. Erro: ' + dataSourceError + '\nSe abriu o arquivo direto (file://) o fetch de dados.json pode falhar; use um servidor estático ou inicie o json-server.';
    }

    initializePage();
    
    function populateFilters() {
        const competitionFilter = document.getElementById('competitionFilter');
        const sportFilter = document.getElementById('sportFilter');
        if (!competitionFilter || !sportFilter) return;
        
        // Limpar opções existentes (exceto "Todas as competições")
        competitionFilter.innerHTML = '<option value="all">Todas as competições</option>';
        // Modalidades dinâmicas
        sportFilter.innerHTML = '<option value="all">Todas as modalidades</option>';
        
        // Adicionar cada competição como opção
        apiState.competitions.forEach((competition) => {
            const option = document.createElement('option');
            option.value = competition.id;
            option.textContent = competition.name;
            competitionFilter.appendChild(option);
        });

        // Coletar modalidades únicas a partir das partidas
        const sportCounts = {};
        apiState.competitions.forEach(competition => {
            const compMatches = apiState.matches.filter(m => m.competitionId === competition.id) || competition.matches || [];
            (compMatches).forEach(match => {
                const mSport = (match.modalidade || match.sport || '').trim();
                if (mSport) {
                    sportCounts[mSport] = (sportCounts[mSport] || 0) + 1;
                }
            });
        });
        Object.entries(sportCounts)
            .sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0],'pt-BR'))
            .forEach(([s,count]) => {
                const opt = document.createElement('option');
                opt.value = s.toLowerCase();
                opt.textContent = `${s} (${count})`;
                sportFilter.appendChild(opt);
            });
    }
    
    function renderMatches() {
        const matchesGrid = document.getElementById('matchesGrid');
        matchesGrid.innerHTML = '';
        
    const matches = getAllMatches();
        
        if (matches.length === 0) {
            matchesGrid.innerHTML = '<p class="no-data">Nenhuma partida encontrada.</p>';
            return;
        }
        
        matches.forEach(matchData => {
            const card = createMatchCard(matchData);
            matchesGrid.appendChild(card);
        });
    }
    
    function getAllMatches() {
        const allMatches = [];
        
        apiState.competitions.forEach((competition) => {
            const compMatches = apiState.matches.filter(m => m.competitionId === competition.id) || [];
            compMatches.forEach(match => {
                allMatches.push({
                    ...match,
                    competitionName: competition.name,
                    competitionId: competition.id
                });
            });
        });
        
        // Ordenar por data (mais recentes primeiro)
        return allMatches.sort((a, b) => new Date(b.data) - new Date(a.data));
    }
    
    function createMatchCard(matchData) {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.setAttribute('data-sport', (matchData.modalidade || '').toLowerCase());
        card.setAttribute('data-status', (matchData.status || '').toLowerCase().replace(' ', '_'));
        card.setAttribute('data-competition', matchData.competitionId);
        card.setAttribute('data-date', matchData.data);
        
        // Determinar classe do status
        let statusClass = 'status-scheduled';
        if (matchData.status) {
            const status = matchData.status.toLowerCase();
            if (status.includes('finalizado') || status.includes('concluído')) {
                statusClass = 'status-completed';
            } else if (status.includes('andamento')) {
                statusClass = 'status-ongoing';
            }
        }
        
        // Extrair placar
        let scoreA = '0', scoreB = '0';
        if (matchData.placar) {
            const scores = matchData.placar.split('-').map(s => s.trim());
            scoreA = scores[0] || '0';
            scoreB = scores[1] || '0';
        }
        
        card.innerHTML = `
            <div class="match-header">
                <span class="match-competition">${matchData.competitionName}</span>
                <span class="match-phase">${matchData.fase || 'Fase Regular'}</span>
            </div>
            <div class="match-content">
                <div class="match-teams">
                    <div class="team">
                        <span class="team-name">${matchData.equipeA || 'TBD'}</span>
                        <span class="team-score">${scoreA}</span>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team">
                        <span class="team-name">${matchData.equipeB || 'TBD'}</span>
                        <span class="team-score">${scoreB}</span>
                    </div>
                </div>
                <div class="match-info">
                    <div class="match-date">${formatDate(matchData.data)}</div>
                    <div class="match-sport">${matchData.modalidade || 'N/A'}</div>
                    <div class="match-status ${statusClass}">${matchData.status || 'Agendado'}</div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => openMatchDetails(matchData));
        
        return card;
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'Data não definida';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    }
    
    function openMatchDetails(matchData) {
        const modal = document.getElementById('matchModal');
        
        // Preencher informações do modal
        document.getElementById('modalMatchTitle').textContent = `${matchData.equipeA} x ${matchData.equipeB}`;
        document.getElementById('teamAName').textContent = matchData.equipeA || 'TBD';
        document.getElementById('teamBName').textContent = matchData.equipeB || 'TBD';
        document.getElementById('matchDate').textContent = formatDate(matchData.data);
        document.getElementById('matchSport').textContent = matchData.modalidade || 'N/A';
        document.getElementById('matchPhase').textContent = matchData.fase || 'Fase Regular';
        document.getElementById('matchStatus').textContent = matchData.status || 'Agendado';
        document.getElementById('matchCompetition').textContent = matchData.competitionName;
        
        // Preencher placar
        let scoreA = '0', scoreB = '0';
        if (matchData.placar) {
            const scores = matchData.placar.split('-').map(s => s.trim());
            scoreA = scores[0] || '0';
            scoreB = scores[1] || '0';
        }
        document.getElementById('teamAScore').textContent = scoreA;
        document.getElementById('teamBScore').textContent = scoreB;
        
        // Configurar status badge
        const statusElement = document.getElementById('matchStatus');
        statusElement.className = 'status-badge';
        if (matchData.status) {
            const status = matchData.status.toLowerCase();
            if (status.includes('finalizado') || status.includes('concluído')) {
                statusElement.classList.add('status-completed');
            } else if (status.includes('andamento')) {
                statusElement.classList.add('status-ongoing');
            } else {
                statusElement.classList.add('status-scheduled');
            }
        }
        
        // Salvar informações para edição
        currentEditingMatch = matchData;
    // competitionId já presente no objeto matchData
        
        modal.style.display = 'block';
    }
    
    function setupEventListeners() {
        // Filtros
        document.getElementById('filterButton').addEventListener('click', applyFilters);
        document.getElementById('clearFilters').addEventListener('click', clearFilters);

        // Persistir seleção ao mudar
        ['competitionFilter','sportFilter','statusFilter','dateFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', persistFilters);
            }
        });
        
        // Modais
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close-button');
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
        });
        
        window.addEventListener('click', function(event) {
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Botões de administração (apenas se for admin)
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.role === 'admin') {
        document.getElementById('editMatchBtn').addEventListener('click', openEditModal);
        document.getElementById('deleteMatchBtn').addEventListener('click', deleteMatch);
        document.getElementById('editMatchForm').addEventListener('submit', saveMatchEdit);
            document.getElementById('cancelEditBtn').addEventListener('click', () => {
                document.getElementById('editMatchModal').style.display = 'none';
            });
        }
    }
    
    function applyFilters() {
        const competitionFilter = document.getElementById('competitionFilter').value;
        const sportFilter = document.getElementById('sportFilter').value; // já vem em lowercase se dinâmico
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;

    persistFilters();
        
        const cards = document.querySelectorAll('.match-card');
        
        cards.forEach(card => {
            const cardCompetition = card.getAttribute('data-competition');
            const cardSport = normalizeStr(card.getAttribute('data-sport'));
            const cardStatus = card.getAttribute('data-status');
            const cardDate = card.getAttribute('data-date');
            
            const competitionMatch = competitionFilter === 'all' || cardCompetition === competitionFilter;
            const sportMatch = sportFilter === 'all' || cardSport === normalizeStr(sportFilter);
            const statusMatch = statusFilter === 'all' || cardStatus === statusFilter.toLowerCase().replace(' ', '_');
            const dateMatch = !dateFilter || cardDate === dateFilter;
            
            if (competitionMatch && sportMatch && statusMatch && dateMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function persistFilters(){
        const data = {
            competition: document.getElementById('competitionFilter').value,
            sport: document.getElementById('sportFilter').value,
            status: document.getElementById('statusFilter').value,
            date: document.getElementById('dateFilter').value
        };
        localStorage.setItem('matchesFilters', JSON.stringify(data));
    }

    function restoreFilters(){
        try {
            const saved = JSON.parse(localStorage.getItem('matchesFilters'));
            if (!saved) return;
            if (saved.competition && document.querySelector(`#competitionFilter option[value="${saved.competition}"]`)) {
                document.getElementById('competitionFilter').value = saved.competition;
            }
            if (saved.sport && document.querySelector(`#sportFilter option[value="${saved.sport}"]`)) {
                document.getElementById('sportFilter').value = saved.sport;
            }
            if (saved.status) document.getElementById('statusFilter').value = saved.status;
            if (saved.date) document.getElementById('dateFilter').value = saved.date;
        } catch(e) { /* ignore */ }
    }

    function normalizeStr(str){
        return (str||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
    }
    
    function clearFilters() {
        document.getElementById('competitionFilter').value = 'all';
        document.getElementById('sportFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('dateFilter').value = '';
        
        const cards = document.querySelectorAll('.match-card');
        cards.forEach(card => card.style.display = 'block');
    }
    
    function openEditModal() {
        if (!currentEditingMatch) return;
        
        const modal = document.getElementById('editMatchModal');
        
        // Preencher formulário com dados atuais
        let scoreA = '0', scoreB = '0';
        if (currentEditingMatch.placar) {
            const scores = currentEditingMatch.placar.split('-').map(s => s.trim());
            scoreA = scores[0] || '0';
            scoreB = scores[1] || '0';
        }
        
        document.getElementById('editTeamAScore').value = scoreA;
        document.getElementById('editTeamBScore').value = scoreB;
        document.getElementById('editMatchStatus').value = currentEditingMatch.status || 'Agendado';
        document.getElementById('editMatchDate').value = currentEditingMatch.data || '';
        
        modal.style.display = 'block';
    }
    
    function saveMatchEdit(event) {
        event.preventDefault();
        
        if (!currentEditingMatch) return;
        const scoreA = document.getElementById('editTeamAScore').value;
        const scoreB = document.getElementById('editTeamBScore').value;
        const status = document.getElementById('editMatchStatus').value;
        const date = document.getElementById('editMatchDate').value;
        const payload = {
            ...currentEditingMatch,
            placar: `${scoreA}-${scoreB}`,
            status,
            data: date
        };
        ;(async ()=>{
            try {
                showLoading(true);
                // Usar PATCH para atualizar apenas campos alterados
                await window.API.MatchesAPI.patch(payload.id, { placar: payload.placar, status, data: date });
                // Atualizar em memória
                apiState.matches = apiState.matches.map(m => m.id === payload.id ? payload : m);
                document.getElementById('editMatchModal').style.display = 'none';
                document.getElementById('matchModal').style.display = 'none';
                renderMatches();
                alert('Partida atualizada com sucesso!');
            } catch(err){
                console.error(err);
                alert('Erro ao salvar partida');
            } finally { showLoading(false); }
        })();
    }
    
    function deleteMatch() {
        if (!confirm('Tem certeza que deseja excluir esta partida?')) return;
        
        if (!currentEditingMatch) return;
        (async ()=>{
            try {
                showLoading(true);
                if(dataSource === 'fallback') {
                    // Não há como persistir em dados.json via frontend; apenas remover em memória
                    apiState.matches = apiState.matches.filter(m => m.id !== currentEditingMatch.id);
                    document.getElementById('matchModal').style.display = 'none';
                    renderMatches();
                    alert('Partida removida somente na visualização (fallback local). Rode o json-server para exclusão persistente.');
                } else {
                    await window.API.MatchesAPI.remove(currentEditingMatch.id);
                    apiState.matches = apiState.matches.filter(m => m.id !== currentEditingMatch.id);
                    document.getElementById('matchModal').style.display = 'none';
                    renderMatches();
                    alert('Partida excluída com sucesso!');
                }
            } catch(err){
                console.error(err);
                alert('Erro ao excluir partida');
            } finally { showLoading(false); }
        })();
    }
    
    // Função global para recarregar dados (pode ser chamada de outras páginas)
    window.reloadMatchesData = async function() {
        try {
            showLoading(true);
            apiState = await window.API.loadAll();
            populateFilters();
            renderMatches();
        } finally { showLoading(false); }
    };
});
