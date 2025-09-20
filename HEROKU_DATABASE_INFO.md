# Sistema de Persistência SQLite no Heroku

## Como Funciona

O sistema usa SQLite para armazenamento de dados, adaptado para funcionar no Heroku:

### Em Desenvolvimento (Local)
- Banco SQLite em: `./database/fingerprints.db`
- Logs JSON em: `./data/fingerprints.log`
- Dados persistem permanentemente

### Em Produção (Heroku)
- Banco SQLite em: `/tmp/fingerprints.db`
- Logs JSON em: `/tmp/data/fingerprints.log`
- **Dados são temporários** (reiniciam com o dyno ~24h)

## Características do Sistema

✅ **Funcionalidades Ativas:**
- Coleta de fingerprints funciona normalmente
- Dashboard admin com estatísticas em tempo real
- Download do banco de dados SQLite
- Consultas SQL pelo admin
- Logs em JSON como backup

⚠️ **Limitação do Heroku:**
- Os dados são mantidos apenas enquanto o dyno está ativo
- Após restart/deploy, o banco é recriado vazio
- Ideal para testes e demonstrações

## Como Usar

### 1. Coletar Fingerprints
```
https://wasm-fingerprint-78aae8be269e.herokuapp.com/
```

### 2. Acessar Admin Dashboard
```
https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730
```

### 3. Baixar Banco de Dados
```bash
# Download direto
curl "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" -o fingerprints.db

# Ou com autenticação
curl -u admin:SecureAdmin2025Prod https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download -o fingerprints.db
```

### 4. Analisar Dados Localmente
```bash
# Abrir com SQLite
sqlite3 fingerprints.db

# Consultas úteis
.tables
SELECT COUNT(*) FROM fingerprints;
SELECT * FROM fingerprints ORDER BY server_timestamp DESC LIMIT 5;
```

## Backup dos Dados

Como os dados são temporários no Heroku, faça backups regulares:

```bash
# Script de backup automático (executar localmente)
#!/bin/bash
while true; do
    timestamp=$(date +%Y%m%d_%H%M%S)
    curl -s "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" \
         -o "backup_${timestamp}.db"
    echo "Backup salvo: backup_${timestamp}.db"
    sleep 3600 # Aguarda 1 hora
done
```

## Monitoramento

```bash
# Ver logs em tempo real
heroku logs --tail --app wasm-fingerprint

# Verificar se o banco existe
heroku run "ls -la /tmp/*.db /tmp/data/*.log" --app wasm-fingerprint

# Status do sistema
curl https://wasm-fingerprint-78aae8be269e.herokuapp.com/health
```

## Por que SQLite?

Este é um **sistema experimental e de estudo**, onde:
- Simplicidade é prioridade
- SQLite é perfeito para prototipagem
- Não requer configuração de banco externo
- Facilita análise local dos dados
- Mantém o foco no estudo de fingerprinting

## Nota sobre Persistência

Para um sistema de produção real, considere:
- Executar localmente para persistência permanente
- Usar VPS próprio com volume persistente
- Implementar export/import automático dos dados

Este setup atual é ideal para:
- Demonstrações
- Testes de fingerprinting
- Coleta temporária de dados
- Estudos e experimentos