const renderLoginPage = () => {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Admin - Fingerprint System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .login-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .login-header h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .login-header p {
            color: #666;
            font-size: 14px;
        }
        .lock-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            color: #555;
            font-size: 14px;
            margin-bottom: 8px;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .btn-login {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(118, 75, 162, 0.4);
        }
        .btn-login:active {
            transform: translateY(0);
        }
        .error-message {
            background: #fee;
            color: #c00;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
            display: none;
        }
        .error-message.show {
            display: block;
        }
        .success-message {
            background: #efe;
            color: #060;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
            display: none;
        }
        .success-message.show {
            display: block;
        }
        .info-box {
            background: #f5f7fa;
            border-left: 4px solid #667eea;
            padding: 12px;
            margin-top: 20px;
            border-radius: 3px;
        }
        .info-box p {
            color: #555;
            font-size: 13px;
            margin: 0;
        }
        .spinner {
            display: none;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #764ba2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loading .spinner {
            display: block;
        }
        .loading .btn-text {
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <div class="lock-icon">🔐</div>
            <h1>Admin Dashboard</h1>
            <p>Faça login para acessar o painel de controle</p>
        </div>

        <div id="errorMessage" class="error-message"></div>
        <div id="successMessage" class="success-message"></div>

        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="username">Usuário</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    autocomplete="username"
                    placeholder="Digite seu usuário"
                />
            </div>

            <div class="form-group">
                <label for="password">Senha</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    autocomplete="current-password"
                    placeholder="Digite sua senha"
                />
            </div>

            <button type="submit" class="btn-login" id="loginBtn">
                <span class="btn-text">Entrar</span>
                <div class="spinner"></div>
            </button>
        </form>

        <div class="info-box">
            <p><strong>Nota:</strong> Use as credenciais configuradas no servidor para acessar o painel administrativo.</p>
        </div>
    </div>

    <script>
        async function handleLogin(event) {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('errorMessage');
            const successDiv = document.getElementById('successMessage');
            const loginBtn = document.getElementById('loginBtn');

            // Clear messages
            errorDiv.classList.remove('show');
            successDiv.classList.remove('show');

            // Show loading
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;

            try {
                // Send login request
                const response = await fetch('/admin/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin', // Important for cookies
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        successDiv.textContent = 'Login realizado com sucesso! Redirecionando...';
                        successDiv.classList.add('show');

                        // Simple redirect - cookie is already set by the server
                        setTimeout(() => {
                            window.location.href = '/admin/dashboard';
                        }, 1000);
                    } else {
                        throw new Error('Credenciais inválidas');
                    }
                } else if (response.status === 401) {
                    throw new Error('Usuário ou senha incorretos');
                } else {
                    throw new Error('Erro ao fazer login. Tente novamente.');
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.add('show');

                // Shake effect on error
                document.querySelector('.login-container').style.animation = 'shake 0.5s';
                setTimeout(() => {
                    document.querySelector('.login-container').style.animation = '';
                }, 500);
            } finally {
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        }

        // Add shake animation
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        \`;
        document.head.appendChild(style);

        // Focus on username field
        window.onload = () => {
            document.getElementById('username').focus();
        };
    </script>
</body>
</html>
    `;
};

module.exports = {
    renderLoginPage
};