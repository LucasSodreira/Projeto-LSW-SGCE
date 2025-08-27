# SGCE - Sistema de Gerenciamento de Competições de Esportes

## 📋 Sobre o Projeto

O **SGCE** é um sistema web para gerenciamento e visualização de competições esportivas no IFRN. Permite: registro/edição de partidas (admin), consulta pública de resultados e estatísticas, exportação de relatórios e filtros avançados. Quando a API (json-server) não está acessível, o sistema entra em modo fallback usando `dados.json`.


## 📄 Páginas do Sistema

### 🏠 **Página Inicial** (`index.html`)
- Apresentação do sistema
- Navegação principal
- Acesso rápido às funcionalidades

### ⚽ **Partidas** (`matches/matches.html`)
- Lista de todas as partidas
- Filtros por modalidade, status e data
- Detalhes completos de cada jogo
- Edição de resultados (apenas administradores)

### 📊 **Estatísticas** (`templates/statistics.html`)
- Resumo geral das competições
- Ranking de clubes por desempenho
- Estatísticas individuais de jogadores
- Exportação de relatórios em PDF

### 🔑 **Login** (`templates/login.html`)
- Autenticação de usuários
- Controle de acesso ao sistema

### ⚙️ **Painel Admin** (`templates/admin.html`)
- Importação de dados de competições
- Gerenciamento de competições
- Controle administrativo (apenas administradores)

## 👥 Usuários do Sistema

### **Usuário Comum**
- **Login:** `usuario`
- **Senha:** `user123`
- **Permissões:** Visualizar partidas e estatísticas

### **Administrador**
- **Login:** `admin`
- **Senha:** `admin123`
- **Permissões:** Todas as funcionalidades + edição de dados

## 🚀 Como usar (Frontend)

1. Abra o arquivo `index.html` em seu navegador
2. Navegue pelas diferentes seções usando o menu
3. Para funções administrativas, faça login com as credenciais de admin
4. Importe dados de competições através do Painel Admin
5. Visualize partidas e estatísticas através dos filtros disponíveis

## 📁 Estrutura do Projeto

```
📦 Projeto-LSW-SGCE
├── 📄 index.html              # Página inicial
├── 📄 dados.json              # Dados de exemplo
├── 📁 css/                    # Estilos do sistema
├── 📁 js/                     # Scripts JavaScript
├── 📁 images/                 # Imagens e ícones
├── 📁 matches/                # Página de partidas
└── 📁 templates/              # Páginas do sistema
    ├── 📄 admin.html          # Painel administrativo
    ├── 📄 login.html          # Página de login
    └── 📄 statistics.html     # Estatísticas
```

---

## 🔌 Backend Mock (json-server)

O projeto usa `json-server` para servir dados REST a partir de um arquivo JSON. Se a API falhar, o frontend usa `dados.json` (badge vermelho). API ativa = badge verde.

### Instalar & Rodar
```bash
npm install --save-dev json-server
# Usando dados.json (port 3000)
npx json-server --watch dados.json --port 3000 --delay 300
# Ou usando db.json
npx json-server --watch db.json --port 3000
```

### Estrutura de Dados (Português)
```json
{
    "competicoes": [ { "id": 1, "name": "Competição Geral", "season": "2024-2025" } ],
    "partidas": [ { "id": 1, "equipeA": "Dragões FC", "equipeB": "Águias United", "modalidade": "Futebol", "data": "2024-03-15", "placar": "3-1", "status": "Finalizado", "competitionId": 1 } ],
    "times": [ { "id": "Dragões FC", "nome": "Dragões FC", "jogadores": ["Gabriel Silva"], "tecnico": "Professor X" } ]
}
```

### Aliases de Rotas Suportadas
| Entidade     | Rotas tentadas                              |
|--------------|---------------------------------------------|
| Partidas     | /matches, /partidas, /jogos, /partida, /jogo |
| Times        | /teams, /times, /equipes, /equipe, /clubes, /clube |
| Competições  | /competitions, /competicoes, /competicao, /torneios, /torneio |

A camada `api.js` resolve automaticamente a primeira rota existente.

### Fallback
Se a API não responder (offline/404), carrega `dados.json` (sem persistência de alterações de edição/delete).

---

## 🧪 Exemplos (fetch)
Listar partidas:
```js
fetch('http://localhost:3000/partidas').then(r=>r.json()).then(console.log);
```
Criar partida:
```js
fetch('http://localhost:3000/partidas', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ equipeA:'Lobos FC', equipeB:'Falcões FC', modalidade:'Futebol', data:'2025-09-01', placar:'-', status:'Agendado', competitionId:1 })
});
```
Atualizar (PATCH):
```js
fetch('http://localhost:3000/partidas/19', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ placar:'2-1', status:'Finalizado' })});
```
Excluir:
```js
fetch('http://localhost:3000/partidas/19', { method:'DELETE' });
```

### Queries Úteis
| Objetivo                | Exemplo                                             |
|-------------------------|------------------------------------------------------|
| Ordenar por data desc   | /partidas?_sort=data&_order=desc                    |
| Filtrar por modalidade  | /partidas?modalidade=Futebol                        |
| Filtrar por competição  | /partidas?competitionId=1                           |
| Paginação               | /partidas?_page=1&_limit=10                         |
| Busca parcial equipe A  | /partidas?equipeA_like=Drag                         |

Combinação:
```
/partidas?competitionId=1&modalidade=Futebol&_sort=data&_order=asc
```

---

## 🧾 Principais Chamadas da API

Partidas:
- GET /partidas
- GET /partidas/:id
- POST /partidas
- PATCH /partidas/:id
- PUT /partidas/:id
- DELETE /partidas/:id

Times:
- GET /times
- GET /times/:id
- POST /times
- PATCH /times/:id
- DELETE /times/:id

Competições:
- GET /competicoes
- GET /competicoes/:id

Aliases em inglês também funcionam se as chaves do JSON estiverem em inglês.

---

*Desenvolvido para facilitar o acompanhamento de competições esportivas no IFRN* 🏫⚽

---

## ℹ️ Estado Atual do Painel Admin

O painel **Admin** atualmente funciona em modo **offline/local**: as ações (importar, adicionar, renomear e excluir competições) afetam somente o `localStorage` do navegador e NÃO são enviadas à API (`json-server`).

Impactos:
* Competições criadas no painel não aparecem nas páginas de Partidas/Estatísticas (estas leem apenas API + fallback `dados.json`).
* Edição de resultados de partidas (na página de Partidas) usa a API quando disponível; no fallback (`dados.json`) as mudanças não persistem.

Roadmap de melhoria sugerido:
1. Integrar criação/edição de competições via endpoints (`POST /competicoes`).
2. Permitir criar partidas diretamente no painel admin (`POST /partidas`).
3. Sincronizar exportação/importação para também atualizar a API quando online.

## 🟢 / 🔴 Badge de Fonte de Dados

As páginas exibem um badge indicando a origem dos dados:
* 🟢 **API (json-server)** ativa: leitura e escrita persistentes (partidas e agora competições pelo painel admin).
* 🔴 **Fallback local (dados.json)**: somente leitura para partidas/estatísticas; painel admin pode operar offline via `localStorage` (competição não sincroniza automaticamente).
* 🟡 Página inicial pode mostrar estado "indisponível" se nem API nem `dados.json` forem acessíveis.

> Abra o projeto via um servidor estático (ou Live Server) e suba o `json-server` para usufruir de todas as funcionalidades.
