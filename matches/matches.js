document.addEventListener('DOMContentLoaded', function() {
    // Recuperar dados das competições do localStorage
    let competitionsData = JSON.parse(localStorage.getItem('competitionsData')) || { competitions: [] };
    
    // Se não há dados no localStorage, tentar carregar do arquivo dados.json
    if (competitionsData.competitions.length === 0) {
        loadDefaultData();
    }
    
    let currentEditingMatch = null;
    let currentCompetitionIndex = null;
    let currentMatchIndex = null;
    
    // Inicializar a página
    initializePage();
    
    function loadDefaultData() {
        fetch('./dados.json')
            .then(response => response.json())
            .then(data => {
                competitionsData = data;
                localStorage.setItem('competitionsData', JSON.stringify(data));
                initializePage();
            })
            .catch(error => {
                console.error('Erro ao carregar dados padrão:', error);
            });
    }
    
    function initializePage() {
        populateFilters();
        renderMatches();
        setupEventListeners();
    }
    
    function populateFilters() {
        const competitionFilter = document.getElementById('competitionFilter');
        
        // Limpar opções existentes (exceto "Todas as competições")
        competitionFilter.innerHTML = '<option value="all">Todas as competições</option>';
        
        // Adicionar cada competição como opção
        competitionsData.competitions.forEach((competition, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = competition.name;
            competitionFilter.appendChild(option);
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
        
        competitionsData.competitions.forEach((competition, compIndex) => {
            if (competition.matches) {
                competition.matches.forEach((match, matchIndex) => {
                    allMatches.push({
                        ...match,
                        competitionName: competition.name,
                        competitionIndex: compIndex,
                        matchIndex: matchIndex
                    });
                });
            }
        });
        
        // Ordenar por data (mais recentes primeiro)
        return allMatches.sort((a, b) => new Date(b.data) - new Date(a.data));
    }
    
    function createMatchCard(matchData) {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.setAttribute('data-sport', (matchData.modalidade || '').toLowerCase());
        card.setAttribute('data-status', (matchData.status || '').toLowerCase().replace(' ', '_'));
        card.setAttribute('data-competition', matchData.competitionIndex);
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
        currentCompetitionIndex = matchData.competitionIndex;
        currentMatchIndex = matchData.matchIndex;
        
        modal.style.display = 'block';
    }
    
    function setupEventListeners() {
        // Filtros
        document.getElementById('filterButton').addEventListener('click', applyFilters);
        document.getElementById('clearFilters').addEventListener('click', clearFilters);
        
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
        const sportFilter = document.getElementById('sportFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
        const cards = document.querySelectorAll('.match-card');
        
        cards.forEach(card => {
            const cardCompetition = card.getAttribute('data-competition');
            const cardSport = card.getAttribute('data-sport');
            const cardStatus = card.getAttribute('data-status');
            const cardDate = card.getAttribute('data-date');
            
            const competitionMatch = competitionFilter === 'all' || cardCompetition === competitionFilter;
            const sportMatch = sportFilter === 'all' || cardSport.includes(sportFilter.toLowerCase());
            const statusMatch = statusFilter === 'all' || cardStatus === statusFilter.toLowerCase().replace(' ', '_');
            const dateMatch = !dateFilter || cardDate === dateFilter;
            
            if (competitionMatch && sportMatch && statusMatch && dateMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
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
        
        if (currentCompetitionIndex === null || currentMatchIndex === null) return;
        
        const scoreA = document.getElementById('editTeamAScore').value;
        const scoreB = document.getElementById('editTeamBScore').value;
        const status = document.getElementById('editMatchStatus').value;
        const date = document.getElementById('editMatchDate').value;
        
        // Atualizar os dados
        competitionsData.competitions[currentCompetitionIndex].matches[currentMatchIndex].placar = `${scoreA}-${scoreB}`;
        competitionsData.competitions[currentCompetitionIndex].matches[currentMatchIndex].status = status;
        competitionsData.competitions[currentCompetitionIndex].matches[currentMatchIndex].data = date;
        
        // Salvar no localStorage
        localStorage.setItem('competitionsData', JSON.stringify(competitionsData));
        
        // Fechar modal e atualizar visualização
        document.getElementById('editMatchModal').style.display = 'none';
        document.getElementById('matchModal').style.display = 'none';
        renderMatches();
        
        alert('Partida atualizada com sucesso!');
    }
    
    function deleteMatch() {
        if (!confirm('Tem certeza que deseja excluir esta partida?')) return;
        
        if (currentCompetitionIndex === null || currentMatchIndex === null) return;
        
        // Remover a partida
        competitionsData.competitions[currentCompetitionIndex].matches.splice(currentMatchIndex, 1);
        
        // Salvar no localStorage
        localStorage.setItem('competitionsData', JSON.stringify(competitionsData));
        
        // Fechar modal e atualizar visualização
        document.getElementById('matchModal').style.display = 'none';
        renderMatches();
        
        alert('Partida excluída com sucesso!');
    }
});
