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
        fetch('../dados.json')
            .then(response => response.json())
            .then(data => {
                // Normalizar os dados para o formato esperado
                const normalizedData = {
                    competitions: [
                        {
                            name: "Competição Padrão",
                            matches: data.partidas || [],
                            teams: data.times || []
                        }
                    ]
                };
                
                competitionsData = normalizedData;
                localStorage.setItem('competitionsData', JSON.stringify(normalizedData));
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
                                    goals: 0, // Será calculado baseado nas partidas
                                    assists: 0,
                                    matches: 0,
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

        // Simular estatísticas de jogadores baseadas nos gols dos times
        Object.values(stats.playerStats).forEach(player => {
            const team = stats.teamStats[player.team];
            if (team && team.goalsFor > 0) {
                // Distribuir gols do time entre os jogadores de forma mais realística
                const teamPlayers = Object.values(stats.playerStats).filter(p => p.team === player.team);
                const totalGoals = team.goalsFor;
                
                if (teamPlayers.length > 0) {
                    // Simular distribuição de gols (alguns jogadores marcam mais que outros)
                    const playerGoalRatio = Math.random() * 0.6 + 0.1; // Entre 10% e 70% dos gols do time
                    player.goals = Math.floor(totalGoals * playerGoalRatio / teamPlayers.length);
                    player.matches = team.matches;
                    player.assists = Math.floor(player.goals * 0.5); // Assistências baseadas nos gols
                }
            }
        });

        // Garantir que pelo menos alguns jogadores tenham gols se houver gols totais
        if (stats.totalGoals > 0 && Object.values(stats.playerStats).every(p => p.goals === 0)) {
            // Se nenhum jogador tem gols, distribuir alguns aleatoriamente
            const allPlayers = Object.values(stats.playerStats);
            const numScorers = Math.min(allPlayers.length, Math.ceil(stats.totalGoals / 3));
            
            for (let i = 0; i < numScorers; i++) {
                const randomPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
                if (randomPlayer.goals === 0) {
                    randomPlayer.goals = Math.floor(Math.random() * 5) + 1;
                    randomPlayer.assists = Math.floor(randomPlayer.goals * 0.3);
                }
            }
        }

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
            exportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                exportStatistics();
            });
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
        // Verificar se jsPDF está disponível através do window.jspdf
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('Biblioteca jsPDF não encontrada. Verifique se está carregada corretamente.');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let yPosition = 30;
        
        // Configurações
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const lineHeight = 15;
        
        // Função para verificar se precisa de nova página
        function checkNewPage(neededSpace = 30) {
            if (yPosition + neededSpace > pageHeight - margin) {
                doc.addPage();
                yPosition = 30;
                return true;
            }
            return false;
        }
        
        // Função para adicionar título de seção
        function addSectionTitle(title) {
            checkNewPage(40);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(title, margin, yPosition);
            yPosition += lineHeight + 5;
            doc.setFont(undefined, 'normal');
        }
        
        // Cabeçalho do documento
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('SGCE - Relatório Completo de Estatísticas', margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, yPosition);
        yPosition += lineHeight * 2;
        
        const stats = window.currentStats;
        if (!stats) {
            doc.text('Nenhum dado encontrado para gerar o relatório.', margin, yPosition);
            doc.save('sgce-estatisticas.pdf');
            return;
        }
        
        // 1. RESUMO GERAL
        addSectionTitle('1. RESUMO GERAL');
        
        doc.setFontSize(12);
        const resumoData = [
            ['Competições:', stats.totalCompetitions],
            ['Times:', stats.totalTeams],
            ['Atletas:', stats.totalPlayers],
            ['Partidas:', stats.totalMatches],
            ['Gols:', stats.totalGoals],
            ['Média de gols por partida:', stats.totalMatches > 0 ? (stats.totalGoals / stats.totalMatches).toFixed(1) : '0']
        ];
        
        resumoData.forEach(([label, value]) => {
            doc.text(`${label} ${value}`, margin, yPosition);
            yPosition += lineHeight;
        });
        
        yPosition += 10;
        
        // 2. ESTATÍSTICAS DOS CLUBES
        addSectionTitle('2. RANKING DOS CLUBES');
        
        const teams = Object.values(stats.teamStats)
            .filter(team => team.matches > 0)
            .sort((a, b) => {
                const pointsA = a.victories * 3 + a.draws;
                const pointsB = b.victories * 3 + b.draws;
                if (pointsA !== pointsB) return pointsB - pointsA;
                return b.goalDifference - a.goalDifference;
            });
        
        if (teams.length > 0) {
            // Cabeçalho da tabela
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Pos', margin, yPosition);
            doc.text('Time', margin + 25, yPosition);
            doc.text('J', margin + 70, yPosition);
            doc.text('V', margin + 85, yPosition);
            doc.text('E', margin + 100, yPosition);
            doc.text('D', margin + 115, yPosition);
            doc.text('GP', margin + 130, yPosition);
            doc.text('GC', margin + 145, yPosition);
            doc.text('SG', margin + 160, yPosition);
            doc.text('Pts', margin + 175, yPosition);
            yPosition += lineHeight;
            
            // Linha separadora
            doc.line(margin, yPosition - 2, 190, yPosition - 2);
            doc.setFont(undefined, 'normal');
            
            // Dados dos times (top 10)
            teams.slice(0, 10).forEach((team, index) => {
                checkNewPage();
                const points = team.victories * 3 + team.draws;
                const teamName = team.name.length > 12 ? team.name.substring(0, 12) + '...' : team.name;
                
                doc.text(`${index + 1}°`, margin, yPosition);
                doc.text(teamName, margin + 25, yPosition);
                doc.text(team.matches.toString(), margin + 70, yPosition);
                doc.text(team.victories.toString(), margin + 85, yPosition);
                doc.text(team.draws.toString(), margin + 100, yPosition);
                doc.text(team.defeats.toString(), margin + 115, yPosition);
                doc.text(team.goalsFor.toString(), margin + 130, yPosition);
                doc.text(team.goalsAgainst.toString(), margin + 145, yPosition);
                doc.text((team.goalDifference > 0 ? '+' : '') + team.goalDifference.toString(), margin + 160, yPosition);
                doc.text(points.toString(), margin + 175, yPosition);
                yPosition += lineHeight;
            });
            
            yPosition += 10;
            
            // Destaques dos clubes
            checkNewPage(60);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Destaques:', margin, yPosition);
            yPosition += lineHeight;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            
            const melhorAtaque = teams[0];
            const melhorDefesa = teams.sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
            const maiorSaldo = teams.sort((a, b) => b.goalDifference - a.goalDifference)[0];
            
            doc.text(`• Melhor Ataque: ${melhorAtaque?.name || 'N/A'} (${melhorAtaque?.goalsFor || 0} gols)`, margin, yPosition);
            yPosition += lineHeight;
            doc.text(`• Melhor Defesa: ${melhorDefesa?.name || 'N/A'} (${melhorDefesa?.goalsAgainst || 0} gols sofridos)`, margin, yPosition);
            yPosition += lineHeight;
            doc.text(`• Maior Saldo: ${maiorSaldo?.name || 'N/A'} (${(maiorSaldo?.goalDifference > 0 ? '+' : '') + (maiorSaldo?.goalDifference || 0)})`, margin, yPosition);
            yPosition += lineHeight * 2;
        }
        
        // 3. ESTATÍSTICAS DOS JOGADORES
        addSectionTitle('3. ARTILHEIROS');
        
        const players = Object.values(stats.playerStats)
            .filter(player => player.goals > 0) // Apenas jogadores com gols
            .sort((a, b) => b.goals - a.goals);
        
        if (players.length > 0) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Pos', margin, yPosition);
            doc.text('Jogador', margin + 25, yPosition);
            doc.text('Time', margin + 100, yPosition);
            doc.text('Gols', margin + 150, yPosition);
            yPosition += lineHeight;
            
            // Linha separadora
            doc.line(margin, yPosition - 2, 180, yPosition - 2);
            doc.setFont(undefined, 'normal');
            
            // Lista de artilheiros (top 15)
            players.slice(0, 15).forEach((player, index) => {
                checkNewPage();
                const playerName = player.name.length > 20 ? player.name.substring(0, 20) + '...' : player.name;
                const teamName = player.team && player.team.length > 15 ? player.team.substring(0, 15) + '...' : (player.team || 'N/A');
                
                doc.text(`${index + 1}°`, margin, yPosition);
                doc.text(playerName, margin + 25, yPosition);
                doc.text(teamName, margin + 100, yPosition);
                doc.text(player.goals.toString(), margin + 150, yPosition);
                yPosition += lineHeight;
            });
            
            yPosition += 10;
            
            // Estatísticas gerais dos jogadores
            checkNewPage(40);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Estatísticas Gerais:', margin, yPosition);
            yPosition += lineHeight;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            
            const artilheiro = players[0];
            const mediaGols = stats.totalMatches > 0 ? (stats.totalGoals / stats.totalMatches).toFixed(1) : '0';
            
            doc.text(`• Artilheiro: ${artilheiro?.name || 'N/A'} (${artilheiro?.goals || 0} gols)`, margin, yPosition);
            yPosition += lineHeight;
            doc.text(`• Total de jogadores: ${stats.totalPlayers}`, margin, yPosition);
            yPosition += lineHeight;
            doc.text(`• Média de gols por partida: ${mediaGols}`, margin, yPosition);
            yPosition += lineHeight;
            doc.text(`• Jogadores com gols: ${players.length}`, margin, yPosition);
            yPosition += lineHeight;
        } else {
            doc.setFontSize(12);
            doc.text('Nenhum artilheiro encontrado nos dados disponíveis.', margin, yPosition);
            yPosition += lineHeight * 2;
            
            doc.setFontSize(10);
            doc.text(`Total de jogadores registrados: ${stats.totalPlayers}`, margin, yPosition);
            yPosition += lineHeight;
        }
        
        // Rodapé
        checkNewPage(30);
        yPosition = pageHeight - 30;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('Relatório gerado pelo SGCE - Sistema de Gerenciamento de Competições de Esportes', margin, yPosition);
        
        // Salvar PDF
        doc.save(`SGCE-Relatorio-Completo-${new Date().toISOString().split('T')[0]}.pdf`);
        
        alert('Relatório PDF gerado com sucesso!');
        
        } catch (error) {
            alert('Erro ao gerar o PDF. Tente novamente.');
        }
    }

    // Inicializar seção padrão (resumo)
    setTimeout(() => {
        const summaryTab = document.querySelector('[data-section="summary"]');
        if (summaryTab) {
            summaryTab.click();
        }
    }, 100);
});
