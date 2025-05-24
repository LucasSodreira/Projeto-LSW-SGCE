// Usuários padrão para o sistema
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'usuario', password: 'user123', role: 'user' }
];

// Verifica se já existe usuários salvos no localStorage
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Verifica se o usuário já está logado e redireciona se necessário
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isLoginPage = window.location.pathname.includes('/templates/login.html');
    
    if (currentUser && isLoginPage) {
        window.location.href = '../index.html'; // Corrigido: volta um nível para acessar index.html
    }
}

// Função para realizar o login
function login(username, password) {
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Não guarda a senha no localStorage por segurança
        const userInfo = {
            username: user.username,
            role: user.role
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userInfo));
        return true;
    }
    
    return false;
}

// Função para realizar logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '../index.html'; // Corrija também aqui se esta função for chamada de dentro de templates/
}

// Verifica se o usuário é admin
function isAdmin() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    return currentUser && currentUser.role === 'admin';
}

// Inicializa os listeners quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Se estiver na página de login, configura o formulário
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            if (login(username, password)) {
                // Verifica se estamos na pasta templates
                if (window.location.pathname.includes('/templates/')) {
                    window.location.href = '../index.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                errorMessage.textContent = 'Usuário ou senha inválidos!';
            }
        });
    }
    
    // Botões de login/logout no navbar
    const loginButtons = document.querySelectorAll('a[href="#"]');
    if (loginButtons) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        loginButtons.forEach(button => {
            if (currentUser) {
                button.textContent = `Sair (${currentUser.username})`;
                button.href = "javascript:void(0)";
                button.onclick = logout;
            } else {
                button.textContent = "Entrar";
                // Corrija o caminho para login.html
                if (window.location.pathname.includes('/templates/')) {
                    button.href = "login.html";
                } else {
                    button.href = "templates/login.html"; // Sem a barra inicial
                }
            }
        });
    }
    
    // Mostrar/esconder elementos de administrador
    const adminElements = document.querySelectorAll('.admin-only');
    if (adminElements.length > 0) {
        adminElements.forEach(el => {
            el.style.display = isAdmin() ? 'block' : 'none';
        });
    }
});