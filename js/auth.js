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
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (currentUser && isLoginPage) {
        // Redirecionar baseado na localização atual
        if (window.location.pathname.includes('/templates/')) {
            window.location.href = '../index.html';
        } else if (window.location.pathname.includes('/matches/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
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
    updateAuthUI(); // Atualizar interface imediatamente
    
    // Pequeno delay para garantir que a UI foi atualizada antes do redirect
    setTimeout(() => {
        // Verificar de onde está sendo chamado para redirecionar corretamente
        if (window.location.pathname.includes('/templates/')) {
            window.location.href = '../index.html';
        } else if (window.location.pathname.includes('/matches/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 100);
}

// Verifica se o usuário é admin
function isAdmin() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    return currentUser && currentUser.role === 'admin';
}

// Função para atualizar o estado da interface baseado na autenticação
function updateAuthUI() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Atualizar links de "Entrar" no navbar
    const navbarLoginLinks = document.querySelectorAll('li a[href*="login.html"], li a[href="javascript:void(0)"]');
    navbarLoginLinks.forEach(link => {
        if (currentUser) {
            link.textContent = `Sair (${currentUser.username})`;
            link.href = "javascript:void(0)";
            link.onclick = function(e) {
                e.preventDefault();
                logout();
            };
        } else {
            link.textContent = "Entrar";
            link.onclick = null;
            // Definir href correto baseado na localização
            if (window.location.pathname.includes('/templates/')) {
                link.href = "login.html";
            } else if (window.location.pathname.includes('/matches/')) {
                link.href = "../templates/login.html";
            } else {
                link.href = "templates/login.html";
            }
        }
    });
    
    // Atualizar link de perfil no header
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        if (currentUser) {
            profileLink.title = `Logado como: ${currentUser.username} - Clique para ${currentUser.role === 'admin' ? 'ir ao painel admin' : 'sair'}`;
            profileLink.onclick = function(e) {
                e.preventDefault();
                if (currentUser.role === 'admin') {
                    if (window.location.pathname.includes('/templates/')) {
                        window.location.href = 'admin.html';
                    } else if (window.location.pathname.includes('/matches/')) {
                        window.location.href = '../templates/admin.html';
                    } else {
                        window.location.href = 'templates/admin.html';
                    }
                } else {
                    logout();
                }
            };
        } else {
            profileLink.title = "Fazer login";
            profileLink.onclick = null;
        }
    }
    
    // Mostrar/esconder elementos de administrador
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = isAdmin() ? 'block' : 'none';
    });
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
                // Redirecionar baseado na localização atual
                if (window.location.pathname.includes('/templates/')) {
                    window.location.href = '../index.html';
                } else if (window.location.pathname.includes('/matches/')) {
                    window.location.href = '../index.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                errorMessage.textContent = 'Usuário ou senha inválidos!';
            }
        });
    }
    
    // Atualizar interface baseada na autenticação
    updateAuthUI();
});