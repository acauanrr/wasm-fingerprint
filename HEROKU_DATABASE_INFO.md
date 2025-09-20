# Importante: Persistência de Dados no Heroku

## O Problema

O Heroku usa um **filesystem efêmero**, o que significa que:
- Arquivos criados em runtime são perdidos quando o dyno reinicia
- SQLite em `/tmp` funciona apenas temporariamente
- Os dados são perdidos a cada deploy ou restart

## Solução Temporária Implementada

O sistema agora usa `/tmp/fingerprints.db` no Heroku, que permite:
- ✅ Coletar fingerprints enquanto o dyno está ativo
- ✅ Consultar dados durante a sessão
- ❌ Mas os dados são perdidos quando o dyno reinicia (aproximadamente a cada 24h)

## Para Testar se está Funcionando

1. Acesse o site e faça uma coleta:
   ```
   https://wasm-fingerprint-78aae8be269e.herokuapp.com/
   ```

2. Verifique as estatísticas no admin:
   ```
   https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730
   ```

3. Se houver dados, baixe imediatamente:
   ```bash
   curl "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" -o fingerprints_temp.db
   ```

## Solução Permanente Recomendada

### Opção 1: PostgreSQL (Grátis no Heroku)

1. Adicionar PostgreSQL ao Heroku:
   ```bash
   heroku addons:create heroku-postgresql:mini --app wasm-fingerprint
   ```

2. Modificar o código para usar PostgreSQL quando disponível

### Opção 2: Serviço Externo de Banco de Dados

- **Supabase**: PostgreSQL grátis até 500MB
- **PlanetScale**: MySQL serverless grátis
- **Turso**: SQLite na nuvem grátis até 500MB

### Opção 3: Armazenamento em Arquivo Externo

- **AWS S3**: Para backups periódicos
- **Google Cloud Storage**: Alternativa ao S3
- **Cloudflare R2**: Storage compatível com S3

## Status Atual

⚠️ **IMPORTANTE**: Os dados coletados atualmente são temporários e serão perdidos quando o dyno reiniciar. Para não perder dados importantes:

1. Baixe o banco regularmente (a cada hora se possível)
2. Configure um banco de dados persistente o quanto antes
3. Considere implementar backup automático

## Comandos Úteis

```bash
# Ver logs em tempo real
heroku logs --tail --app wasm-fingerprint

# Verificar se o banco existe
heroku run "ls -la /tmp/*.db" --app wasm-fingerprint

# Fazer backup manual
curl "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" -o backup_$(date +%Y%m%d_%H%M%S).db
```