# SGCE - Sistema de Gerenciamento de Competições de Esportes

## 📋 Sobre o Projeto

O **SGCE** é um sistema web desenvolvido para facilitar o gerenciamento e visualização de dados de competições esportivas dentro do IFRN. O sistema permite que bolsistas e professores atualizem informações de partidas, enquanto alunos podem visualizar os dados das competições de forma organizada.

## ⚽ O que o sistema oferece

- **Visualização de partidas** com resultados em tempo real
- **Estatísticas completas** de times, jogadores e competições
- **Filtros avançados** por modalidade, status e data
- **Exportação de relatórios** em PDF
- **Painel administrativo** para gestão de dados
- **Sistema de autenticação** com diferentes níveis de acesso

## 🏆 Modalidades Suportadas

- Futebol
- Vôlei 
- Basquete
- Handebol

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

## 🚀 Como usar

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

## 💡 Principais Funcionalidades

- ✅ Sistema de login com diferentes níveis de acesso
- ✅ Visualização organizada de partidas por modalidade
- ✅ Filtros inteligentes para busca de jogos
- ✅ Estatísticas detalhadas de desempenho
- ✅ Exportação de relatórios em PDF
- ✅ Interface responsiva e intuitiva
- ✅ Importação de dados via JSON
- ✅ Gerenciamento de competições

---

*Desenvolvido para facilitar o acompanhamento de competições esportivas no IFRN* 🏫⚽
