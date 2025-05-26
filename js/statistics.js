document.addEventListener('DOMContentLoaded', function() {
    // Recuperar dados das competições do localStorage
    let competitionsData = JSON.parse(localStorage.getItem('competitionsData')) || { competitions: [] };
    
    // Se não há dados no localStorage, tentar carregar do arquivo dados.json
    if (competitionsData.competitions.length === 0) {
        loadDefaultData();
    } else {
        initializePage();
    }

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
                initializePage(); // Inicializar mesmo sem dados
            });
    }

    function initializePage() {
        setupNavigation();
        populateFilters();
        calculateStatistics();
        setupEventListeners();
    }

    // Navegação entre seções
    function setupNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const sections = document.querySelectorAll('.stats-section');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetSection = this.getAttribute('data-section');
                
                // Remover classe active de todas as abas e seções
                navTabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                // Adicionar classe active na aba clicada e seção correspondente
                this.classList.add('active');
                document.getElementById(targetSection + '-section').classList.add('active');
                
                // Renderizar conteúdo específico da seção
                if (targetSection === 'clubs') {
                    renderClubStatistics();
                } else if (targetSection === 'players') {
                    renderPlayerStatistics();
                } else if (targetSection === 'summary') {
                    renderSummaryStatistics();
                }
            });
        });
    }

    // Popular filtros
    function populateFilters() {
        const competitionFilter = document.getElementById('competitionFilter');
        const sportFilter = document.getElementById('sportFilter');
        
        if (!competitionFilter || !sportFilter) return;
        
        // Limpar filtros
        competitionFilter.innerHTML = '<option value="">Todas as Competições</option>';
        sportFilter.innerHTML = '<option value="">Todos os Esportes</option>';
        
        const competitions = new Set();
        const sports = new Set();
          competitionsData.competitions.forEach(comp => {
            competitions.add(comp.name);
            sports.add(comp.sport || comp.modalidade);
        });
        
        competitions.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp;
            option.textContent = comp;
            competitionFilter.appendChild(option);
        });
        
        sports.forEach(sport => {
            const option = document.createElement('option');
            option.value = sport;
            option.textContent = sport;
            sportFilter.appendChild(option);
        });
    }

    // Calcular estatísticas gerais
    function calculateStatistics() {
        const stats = {
            totalCompetitions: 0,
            totalTeams: 0,
            totalPlayers: 0,
            totalMatches: 0,
            totalGoals: 0,
            teamStats: {},
            playerStats: {},
            recentMatches: [],
            upcomingMatches: []
        };

        const allTeams = new Set();
        const allMatches = [];
        const now = new Date();

        competitionsData.competitions.forEach(competition => {
            stats.totalCompetitions++;
            
            // Processar times
            if (competition.teams) {
                competition.teams.forEach(team => {
                    const teamId = team.id || team.nome;
                    allTeams.add(teamId);
                    
                    if (team.jogadores) {
                        stats.totalPlayers += team.jogadores.length;
                          // Processar estatísticas de jogadores
                        team.jogadores.forEach(player => {
                            const playerId = player.id || player.nome || player;
                            const playerName = player.nome || player;
                            if (!stats.playerStats[playerId]) {
                                stats.playerStats[playerId] = {
                                    name: playerName,
                                    team: team.nome || team.id,
                                    goals: Math.floor(Math.random() * 5), // Dados simulados para demonstração
                                    assists: Math.floor(Math.random() * 3),
                                    matches: Math.floor(Math.random() * 10) + 1,
                                    position: player.posicao || 'N/A'
                                };
                            }
                        });
                    }
                    
                    // Inicializar estatísticas do time
                    if (!stats.teamStats[teamId]) {
                        stats.teamStats[teamId] = {
                            name: team.nome || teamId,
                            matches: 0,
                            victories: 0,
                            defeats: 0,
                            draws: 0,
                            goalsFor: 0,
                            goalsAgainst: 0,
                            goalDifference: 0
                        };
                    }
                });
            }
            
            // Processar partidas
            if (competition.matches) {
                competition.matches.forEach(match => {
                    stats.totalMatches++;
                    allMatches.push({
                        ...match,
                        competitionName: competition.name
                    });
                    
                    // Contar gols totais
                    if (match.placar && typeof match.placar === 'string') {
                        const scores = match.placar.split('-').map(s => parseInt(s.trim()) || 0);
                        stats.totalGoals += scores.reduce((a, b) => a + b, 0);
                          // Atualizar estatísticas dos times
                        const homeTeam = match.timeA || match.home || match.equipeA;
                        const awayTeam = match.timeB || match.away || match.equipeB;
                        
                        if (stats.teamStats[homeTeam] && stats.teamStats[awayTeam]) {
                            stats.teamStats[homeTeam].matches++;
                            stats.teamStats[awayTeam].matches++;
                            stats.teamStats[homeTeam].goalsFor += scores[0];
                            stats.teamStats[homeTeam].goalsAgainst += scores[1];
                            stats.teamStats[awayTeam].goalsFor += scores[1];
                            stats.teamStats[awayTeam].goalsAgainst += scores[0];
                            
                            if (scores[0] > scores[1]) {
                                stats.teamStats[homeTeam].victories++;
                                stats.teamStats[awayTeam].defeats++;
                            } else if (scores[0] < scores[1]) {
                                stats.teamStats[awayTeam].victories++;
                                stats.teamStats[homeTeam].defeats++;
                            } else {
                                stats.teamStats[homeTeam].draws++;
                                stats.teamStats[awayTeam].draws++;
                            }
                        }
                    }
                    
                    // Separar partidas recentes e próximas
                    if (match.data) {
                        const matchDate = new Date(match.data);
                        if (matchDate < now) {
                            stats.recentMatches.push(match);
                        } else {
                            stats.upcomingMatches.push(match);
                        }
                    }
                });
            }
        });

        stats.totalTeams = allTeams.size;
        
        // Ordenar partidas por data
        stats.recentMatches.sort((a, b) => new Date(b.data) - new Date(a.data));
        stats.upcomingMatches.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        // Calcular saldo de gols para cada time
        Object.values(stats.teamStats).forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });

        // Atualizar display das estatísticas
        updateStatisticsDisplay(stats);
        
        // Salvar estatísticas globalmente para uso nas outras seções
        window.currentStats = stats;
    }

    function updateStatisticsDisplay(stats) {
        // Atualizar contadores principais
        const elements = {
            'totalCompetitions': stats.totalCompetitions,
            'totalTeams': stats.totalTeams,
            'totalPlayers': stats.totalPlayers,
            'totalMatches': stats.totalMatches,
            'totalGoals': stats.totalGoals
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Calcular estatísticas adicionais
        const avgGoalsPerMatch = stats.totalMatches > 0 ? (stats.totalGoals / stats.totalMatches).toFixed(1) : '0';
        const element = document.getElementById('avgGoalsPerMatch');
        if (element) {
            element.textContent = avgGoalsPerMatch;
        }
    }

    // Renderizar estatísticas de clubes
    function renderClubStatistics() {
        const container = document.getElementById('clubs-content');
        if (!container || !window.currentStats) return;

        const teams = Object.values(window.currentStats.teamStats)
            .filter(team => team.matches > 0)
            .sort((a, b) => {
                // Ordenar por pontos (vitórias * 3 + empates)
                const pointsA = a.victories * 3 + a.draws;
                const pointsB = b.victories * 3 + b.draws;
                return pointsB - pointsA;
            });

        let html = `
            <div class="clubs-grid">
                <div class="ranking-section">
                    <h3>Ranking de Clubes</h3>
                    <div class="ranking-table">
                        <div class="table-header">
                            <span>Pos</span>
                            <span>Clube</span>
                            <span>J</span>
                            <span>V</span>
                            <span>E</span>
                            <span>D</span>
                            <span>GP</span>
                            <span>GC</span>
                            <span>SG</span>
                            <span>Pts</span>
                        </div>
        `;

        teams.slice(0, 10).forEach((team, index) => {
            const points = team.victories * 3 + team.draws;
            html += `
                <div class="table-row">
                    <span class="position">${index + 1}</span>
                    <span class="team-name">${team.name}</span>
                    <span>${team.matches}</span>
                    <span>${team.victories}</span>
                    <span>${team.draws}</span>
                    <span>${team.defeats}</span>
                    <span>${team.goalsFor}</span>
                    <span>${team.goalsAgainst}</span>
                    <span class="${team.goalDifference >= 0 ? 'positive' : 'negative'}">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</span>
                    <span class="points">${points}</span>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
                <div class="stats-cards">
                    <div class="stat-card">
                        <h4>Melhor Ataque</h4>
                        <div class="stat-value">${teams[0]?.name || 'N/A'}</div>
                        <div class="stat-detail">${teams[0]?.goalsFor || 0} gols</div>
                    </div>
                    <div class="stat-card">
                        <h4>Melhor Defesa</h4>
                        <div class="stat-value">${teams.sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0]?.name || 'N/A'}</div>
                        <div class="stat-detail">${teams.sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0]?.goalsAgainst || 0} gols sofridos</div>
                    </div>
                    <div class="stat-card">
                        <h4>Maior Saldo</h4>
                        <div class="stat-value">${teams.sort((a, b) => b.goalDifference - a.goalDifference)[0]?.name || 'N/A'}</div>
                        <div class="stat-detail">${teams.sort((a, b) => b.goalDifference - a.goalDifference)[0]?.goalDifference > 0 ? '+' : ''}${teams.sort((a, b) => b.goalDifference - a.goalDifference)[0]?.goalDifference || 0}</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Renderizar estatísticas de jogadores
    function renderPlayerStatistics() {
        const container = document.getElementById('players-content');
        if (!container || !window.currentStats) return;

        const players = Object.values(window.currentStats.playerStats)
            .sort((a, b) => b.goals - a.goals);

        let html = `
            <div class="players-grid">
                <div class="top-scorers">
                    <h3>Artilheiros</h3>
                    <div class="players-list">
        `;

        players.slice(0, 10).forEach((player, index) => {
            html += `
                <div class="player-item">
                    <span class="position">${index + 1}</span>
                    <div class="player-info">
                        <div class="player-name">${player.name}</div>
                        <div class="player-team">${player.team}</div>
                    </div>
                    <div class="player-stats">
                        <span class="goals">${player.goals} gols</span>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
                <div class="players-stats">
                    <div class="stat-card">
                        <h4>Total de Jogadores</h4>
                        <div class="stat-value">${window.currentStats.totalPlayers}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Artilheiro</h4>
                        <div class="stat-value">${players[0]?.name || 'N/A'}</div>
                        <div class="stat-detail">${players[0]?.goals || 0} gols</div>
                    </div>
                    <div class="stat-card">
                        <h4>Média de Gols</h4>
                        <div class="stat-value">${window.currentStats.totalMatches > 0 ? (window.currentStats.totalGoals / window.currentStats.totalMatches).toFixed(1) : '0'}</div>
                        <div class="stat-detail">por partida</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Renderizar resumo das estatísticas
    function renderSummaryStatistics() {
        const container = document.getElementById('summary-content');
        if (!container || !window.currentStats) return;

        const stats = window.currentStats;
        const recentMatches = stats.recentMatches.slice(0, 5);
        const upcomingMatches = stats.upcomingMatches.slice(0, 5);

        let html = `
            <div class="summary-grid">
                <div class="tournament-overview">
                    <h3>Resumo Geral</h3>
                    <div class="overview-stats">
                        <div class="overview-item">
                            <span class="label">Competições</span>
                            <span class="value">${stats.totalCompetitions}</span>
                        </div>
                        <div class="overview-item">
                            <span class="label">Times</span>
                            <span class="value">${stats.totalTeams}</span>
                        </div>
                        <div class="overview-item">
                            <span class="label">Atletas</span>
                            <span class="value">${stats.totalPlayers}</span>
                        </div>
                        <div class="overview-item">
                            <span class="label">Partidas</span>
                            <span class="value">${stats.totalMatches}</span>
                        </div>
                        <div class="overview-item">
                            <span class="label">Gols</span>
                            <span class="value">${stats.totalGoals}</span>
                        </div>
                    </div>
                </div>
                
                <div class="matches-section">
                    <div class="recent-matches">
                        <h3>Últimas Partidas</h3>
                        <div class="matches-list">
        `;        recentMatches.forEach(match => {
            html += `
                <div class="match-item">
                    <div class="teams">
                        <span class="home-team">${match.timeA || match.home || match.equipeA}</span>
                        <span class="score">${match.placar || 'vs'}</span>
                        <span class="away-team">${match.timeB || match.away || match.equipeB}</span>
                    </div>
                    <div class="match-date">${formatDate(match.data)}</div>
                </div>
            `;
        });

        html += `
                        </div>
                    </div>
                    
                    <div class="upcoming-matches">
                        <h3>Próximas Partidas</h3>
                        <div class="matches-list">
        `;        upcomingMatches.forEach(match => {
            html += `
                <div class="match-item">
                    <div class="teams">
                        <span class="home-team">${match.timeA || match.home || match.equipeA}</span>
                        <span class="vs">vs</span>
                        <span class="away-team">${match.timeB || match.away || match.equipeB}</span>
                    </div>
                    <div class="match-date">${formatDate(match.data)}</div>
                </div>
            `;
        });

        html += `
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Função auxiliar para formatar data
    function formatDate(dateString) {
        if (!dateString) return 'Data não definida';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Filtros
        const competitionFilter = document.getElementById('competitionFilter');
        const sportFilter = document.getElementById('sportFilter');
        
        if (competitionFilter) {
            competitionFilter.addEventListener('change', function() {
                // Implementar filtro por competição
                filterData();
            });
        }
        
        if (sportFilter) {
            sportFilter.addEventListener('change', function() {
                // Implementar filtro por esporte
                filterData();
            });
        }

        // Botão de exportar
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportStatistics);
        }

        // Botão de atualizar
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                calculateStatistics();
                // Re-renderizar seção ativa
                const activeTab = document.querySelector('.nav-tab.active');
                if (activeTab) {
                    const section = activeTab.getAttribute('data-section');
                    if (section === 'clubs') {
                        renderClubStatistics();
                    } else if (section === 'players') {
                        renderPlayerStatistics();
                    } else if (section === 'summary') {
                        renderSummaryStatistics();
                    }
                }
            });
        }
    }

    // Filtrar dados com base nos filtros selecionados
    function filterData() {
        const competitionFilter = document.getElementById('competitionFilter');
        const sportFilter = document.getElementById('sportFilter');
        
        const selectedCompetition = competitionFilter ? competitionFilter.value : '';
        const selectedSport = sportFilter ? sportFilter.value : '';
        
        // Aplicar filtros e recalcular estatísticas
        const filteredData = {competitions: competitionsData.competitions.filter(comp => {
                const matchesCompetition = !selectedCompetition || comp.name === selectedCompetition;
                const matchesSport = !selectedSport || comp.sport === selectedSport || comp.modalidade === selectedSport;
                return matchesCompetition && matchesSport;
            })
        };
        
        // Temporariamente substituir os dados para recálculo
        const originalData = competitionsData;
        competitionsData = filteredData;
        calculateStatistics();
        competitionsData = originalData;
    }

    // Exportar estatísticas em PDF
    function exportStatistics() {
        if (typeof jsPDF === 'undefined') {
            alert('Biblioteca jsPDF não encontrada. Verifique se está carregada.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(18);
        doc.text('SGCE - Relatório de Estatísticas', 20, 30);
        
        // Data do relatório
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
        
        // Estatísticas gerais
        doc.setFontSize(14);
        doc.text('Resumo Geral:', 20, 65);
        
        doc.setFontSize(12);
        const stats = window.currentStats;
        if (stats) {
            doc.text(`Competições: ${stats.totalCompetitions}`, 20, 80);
            doc.text(`Times: ${stats.totalTeams}`, 20, 95);
            doc.text(`Atletas: ${stats.totalPlayers}`, 20, 110);
            doc.text(`Partidas: ${stats.totalMatches}`, 20, 125);
            doc.text(`Gols: ${stats.totalGoals}`, 20, 140);
        }
        
        // Salvar PDF
        doc.save('sgce-estatisticas.pdf');
    }

    // Inicializar seção padrão (resumo)
    setTimeout(() => {
        const summaryTab = document.querySelector('[data-section="summary"]');
        if (summaryTab) {
            summaryTab.click();
        }
    }, 100);
});
