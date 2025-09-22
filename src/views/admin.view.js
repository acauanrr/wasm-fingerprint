const renderDashboard = (adminToken) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Fingerprint System</title>
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
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .card h2 {
            color: #764ba2;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .stat {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .stat:last-child {
            border-bottom: none;
        }
        .stat-label {
            color: #666;
        }
        .stat-value {
            font-weight: bold;
            color: #333;
        }
        .actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .btn {
            display: inline-block;
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            transition: transform 0.2s;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(118, 75, 162, 0.3);
        }
        .btn-danger {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        }
        .results {
            background: #f5f5f5;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
            max-height: 400px;
            overflow: auto;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .loading {
            text-align: center;
            color: #666;
            padding: 20px;
        }
        .error {
            background: #fee;
            color: #c00;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .success {
            background: #efe;
            color: #060;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" style="position: relative;">
            <div>
                <h1>🔐 Admin Dashboard</h1>
                <div class="subtitle">Fingerprint System Management (JSON Log Based)</div>
            </div>
            <button onclick="handleLogout()" class="btn-logout" style="position: absolute; top: 30px; right: 30px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 500; transition: transform 0.2s, box-shadow 0.2s;">
                🚪 Logout
            </button>
        </div>

        <div class="grid">
            <div class="card">
                <h2>📊 Statistics</h2>
                <div id="stats">
                    <div class="loading">Loading statistics...</div>
                </div>
            </div>

            <div class="card">
                <h2>📥 Data Management</h2>
                <div class="actions">
                    <a href="/admin/logs/download?token=${adminToken}" class="btn">Download Logs</a>
                    <button onclick="viewLogs()" class="btn">View Recent Logs</button>
                    <button onclick="resetLogs()" class="btn btn-danger">🗑️ Reset All Logs</button>
                </div>
            </div>
        </div>

        <div class="card" id="logsCard" style="display:none;">
            <h2>📝 Recent Logs</h2>
            <div id="logs" class="results">
                <div class="loading">Loading logs...</div>
            </div>
        </div>
    </div>

    <script>
        // Get auth from sessionStorage
        const adminAuth = sessionStorage.getItem('adminAuth');
        const token = '${adminToken}';

        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();

                document.getElementById('stats').innerHTML = \`
                    <div class="stat">
                        <span class="stat-label">Total Fingerprints</span>
                        <span class="stat-value">\${stats.totalFingerprints || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Unique Fingerprints</span>
                        <span class="stat-value">\${stats.uniqueFingerprints || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Returning Users</span>
                        <span class="stat-value">\${stats.returningUsers || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Avg Sessions/User</span>
                        <span class="stat-value">\${stats.averageSessionsPerFingerprint || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Last 24h Activity</span>
                        <span class="stat-value">\${stats.recentActivity || 0}</span>
                    </div>
                \`;
            } catch (error) {
                document.getElementById('stats').innerHTML = '<div class="error">Failed to load statistics</div>';
            }
        }

        async function viewLogs() {
            document.getElementById('logsCard').style.display = 'block';
            try {
                const headers = {};
                if (adminAuth) {
                    headers['Authorization'] = 'Basic ' + adminAuth;
                }
                const response = await fetch('/admin/logs/view?limit=20', { headers });
                const data = await response.json();

                if (data.success) {
                    const logsHtml = data.logs.map(log => \`
                        <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px;">
                            <strong>ID:</strong> \${log.id?.substring(0, 16)}...<br>
                            <strong>Time:</strong> \${new Date(log.serverTimestamp).toLocaleString()}<br>
                            <strong>Session:</strong> \${log.sessionId}<br>
                            <strong>Hash:</strong> \${log.data?.fingerprint_hash?.substring(0, 16) || 'N/A'}...
                        </div>
                    \`).join('');

                    document.getElementById('logs').innerHTML = logsHtml || '<div class="error">No logs found</div>';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                document.getElementById('logs').innerHTML = '<div class="error">Failed to load logs: ' + error.message + '</div>';
            }
        }

        async function resetLogs() {
            const confirmMessage = '⚠️ WARNING: Reset All Logs\\n\\nThis action will permanently delete all collected fingerprint logs.\\n\\nType \\'RESET\\' to confirm:';
            const userInput = prompt(confirmMessage);

            if (userInput !== 'RESET') {
                alert('Reset cancelled. Logs were not modified.');
                return;
            }

            const secondConfirm = confirm('Final confirmation: Delete all logs?');
            if (!secondConfirm) {
                alert('Reset cancelled. Logs were not modified.');
                return;
            }

            try {
                const headers = {};
                if (adminAuth) {
                    headers['Authorization'] = 'Basic ' + adminAuth;
                }
                const response = await fetch('/admin/reset', {
                    method: 'POST',
                    headers
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ Logs reset successfully!\\n\\nAll data has been cleared.');
                    loadStats();
                    document.getElementById('logs').innerHTML = '<div class="loading">No logs - system is empty</div>';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error resetting logs: ' + error.message);
            }
        }

        // Logout function
        async function handleLogout() {
            if (!confirm('Tem certeza que deseja sair?')) {
                return;
            }

            try {
                const response = await fetch('/admin/logout', {
                    method: 'POST',
                    credentials: 'same-origin'
                });

                if (response.ok) {
                    // Clear session storage
                    sessionStorage.removeItem('adminAuth');
                    sessionStorage.removeItem('adminToken');

                    // Redirect to login
                    window.location.href = '/admin/login';
                } else {
                    alert('Erro ao fazer logout. Tente novamente.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            }
        }

        // Add hover effect for logout button
        const style = document.createElement('style');
        style.textContent = \`
            .btn-logout:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
            }
        \`;
        document.head.appendChild(style);

        // Load stats on page load
        loadStats();
        setInterval(loadStats, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>
`;
};

module.exports = {
    renderDashboard
};