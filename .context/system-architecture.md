# Sistema de Browser Fingerprinting - Arquitetura e Pipeline

[← Voltar ao README principal](../README.md) | [🌐 Live Demo](https://wasm-fingerprint-78aae8be269e.herokuapp.com/)

Este documento apresenta a arquitetura completa do sistema de browser fingerprinting com diagramas detalhados em Mermaid, incluindo fluxo de dados, pipeline de deployment e correções implementadas.

## Índice

- [Arquitetura Completa](#diagrama-da-arquitetura-completa)
- [Pipeline de Coleta](#pipeline-de-coleta-de-fingerprint)
- [Fluxo de Dados](#fluxo-de-dados-detalhado)
- [Estrutura de Dados](#estrutura-de-dados-do-fingerprint)
- [Sistema de Comparação](#sistema-de-comparação-inteligente)
- [Deployment e DevOps](#deployment-e-devops)
- [Correções Implementadas](#correções-e-melhorias-recentes)

## Diagrama da Arquitetura Completa

```mermaid
graph TB
    %% Frontend Components
    subgraph "Frontend (Browser)"
        UI["`🖥️ **Web Interface**
        - index.html
        - help.html
        - CSS/JS Assets`"]

        WASM["`⚡ **WebAssembly Module**
        - Rust-based fingerprinting
        - Hardware benchmarks
        - Port contention analysis`"]

        JS["`📜 **JavaScript Client**
        - DOM manipulation
        - API communication
        - Results visualization`"]

        FP_ENGINES["`🔍 **Fingerprinting Engines**
        - Canvas Fingerprint
        - WebGL Fingerprint
        - Audio Fingerprint
        - Browser Info Collection`"]
    end

    %% Backend Components
    subgraph "Backend (Node.js)"
        SERVER["`🚀 **Express Server**
        - server.js
        - API endpoints
        - Middleware stack`"]

        CONFIG["`⚙️ **Configuration**
        - config/index.js
        - Environment variables
        - Feature flags`"]

        DB_LAYER["`💾 **Database Layer**
        - database/database.js
        - SQLite abstraction
        - Schema management`"]

        API_ENDPOINTS["`🔌 **API Endpoints**
        - /api/fingerprint
        - /api/stats
        - /api/analytics
        - /api/compare
        - /health`"]
    end

    %% Data Storage
    subgraph "Data Persistence"
        SQLITE["`🗄️ **SQLite Database**
        - fingerprints.db
        - 8 related tables
        - ACID transactions`"]

        BACKUP["`📄 **File Backup**
        - data/fingerprints.log
        - JSON format
        - Compatibility layer`"]

        SCHEMA["`🏗️ **Database Schema**
        - schema.sql
        - Foreign keys
        - Indices & triggers`"]
    end

    %% WASM Build Process
    subgraph "Build Pipeline"
        RUST["`🦀 **Rust Source**
        - wasm-fingerprint/src/
        - Cargo.toml
        - Multiple modules`"]

        WASM_PACK["`📦 **wasm-pack**
        - Rust → WASM compilation
        - JavaScript bindings
        - TypeScript definitions`"]

        PKG["`📁 **Generated Package**
        - public/pkg/
        - .wasm files
        - JS/TS bindings`"]
    end

    %% Data Flow Connections
    UI --> JS
    JS --> WASM
    JS --> FP_ENGINES
    WASM --> FP_ENGINES

    JS -.->|HTTP Requests| API_ENDPOINTS
    API_ENDPOINTS --> SERVER
    SERVER --> CONFIG
    SERVER --> DB_LAYER

    DB_LAYER --> SQLITE
    DB_LAYER --> BACKUP
    SQLITE --> SCHEMA

    RUST --> WASM_PACK
    WASM_PACK --> PKG
    PKG --> WASM

    %% Styling - Optimized for both light and dark modes
    classDef frontend fill:#4a90e2,stroke:#2e5c8a,stroke-width:2px,color:#fff
    classDef backend fill:#7b68ee,stroke:#5a4bc4,stroke-width:2px,color:#fff
    classDef storage fill:#50c878,stroke:#3a9b5c,stroke-width:2px,color:#fff
    classDef build fill:#ff8c42,stroke:#cc6a2a,stroke-width:2px,color:#fff

    class UI,WASM,JS,FP_ENGINES frontend
    class SERVER,CONFIG,DB_LAYER,API_ENDPOINTS backend
    class SQLITE,BACKUP,SCHEMA storage
    class RUST,WASM_PACK,PKG build
```

## Pipeline de Coleta de Fingerprint

```mermaid
sequenceDiagram
    participant B as 🌐 Browser
    participant UI as 🖥️ Web Interface
    participant W as ⚡ WASM Module
    participant API as 🔌 API Server
    participant DB as 🗄️ SQLite DB
    participant F as 📄 File Backup

    Note over B,F: Processo de Coleta de Fingerprint

    B->>UI: 1. Usuário acessa aplicação
    UI->>UI: 2. Carrega interface e assets

    Note over UI,W: Inicialização dos Motores
    UI->>W: 3. Inicializa módulo WASM
    W-->>UI: 4. Módulo carregado

    Note over UI,W: Coleta de Dados
    UI->>W: 5. Inicia coleta Canvas
    W->>B: 6. Renderiza Canvas invisível
    B-->>W: 7. Dados Canvas

    UI->>W: 8. Inicia coleta WebGL
    W->>B: 9. Query informações GPU
    B-->>W: 10. Vendor/Renderer info

    UI->>W: 11. Inicia coleta Audio
    W->>B: 12. Cria contexto de áudio
    B-->>W: 13. Hash de áudio

    UI->>W: 14. Executa benchmarks
    W->>W: 15. Testes de performance
    W-->>UI: 16. Resultados de hardware

    Note over UI,API: Envio para Servidor
    UI->>API: 17. POST /api/fingerprint

    Note over API,F: Persistência de Dados
    API->>DB: 18. Armazena em SQLite
    DB-->>API: 19. Confirma storage

    API->>F: 20. Backup em arquivo
    F-->>API: 21. Confirma backup

    Note over API,UI: Resposta Final
    API-->>UI: 22. Retorna fingerprint ID
    UI->>UI: 23. Exibe resultados
```

## Fluxo de Dados Detalhado

```mermaid
flowchart TD
    %% Input Data Collection
    START([👤 Usuário inicia coleta]) --> LOAD_WASM[⚡ Carregar WASM]
    LOAD_WASM --> PARALLEL{🔀 Coleta Paralela}

    %% Parallel Collection Engines
    PARALLEL --> CANVAS[🎨 Canvas Fingerprint]
    PARALLEL --> WEBGL[🎮 WebGL Fingerprint]
    PARALLEL --> AUDIO[🔊 Audio Fingerprint]
    PARALLEL --> BROWSER[🌐 Browser Info]
    PARALLEL --> HARDWARE[💻 Hardware Benchmarks]

    %% Canvas Processing
    CANVAS --> CANVAS_RENDER[Renderizar shapes invisíveis]
    CANVAS_RENDER --> CANVAS_HASH[SHA-256 do canvas]

    %% WebGL Processing
    WEBGL --> WEBGL_QUERY[Query vendor/renderer]
    WEBGL_QUERY --> WEBGL_HASH[Hash das informações]

    %% Audio Processing
    AUDIO --> AUDIO_CTX[Criar AudioContext]
    AUDIO_CTX --> AUDIO_OSC[Oscillator + Compressor]
    AUDIO_OSC --> AUDIO_HASH[Hash do sinal]

    %% Browser Info
    BROWSER --> BROWSER_DATA[User-agent, screen, timezone]

    %% Hardware Benchmarks
    HARDWARE --> MATH_BENCH[Benchmark matemático]
    HARDWARE --> MEMORY_BENCH[Benchmark de memória]
    HARDWARE --> CRYPTO_BENCH[Benchmark criptográfico]
    HARDWARE --> PORT_TEST[Port contention test]

    %% Data Combination
    CANVAS_HASH --> COMBINE[🔗 Combinar todos os dados]
    WEBGL_HASH --> COMBINE
    AUDIO_HASH --> COMBINE
    BROWSER_DATA --> COMBINE
    MATH_BENCH --> COMBINE
    MEMORY_BENCH --> COMBINE
    CRYPTO_BENCH --> COMBINE
    PORT_TEST --> COMBINE

    %% Final Processing
    COMBINE --> MASTER_HASH[🔐 SHA-256 Master Hash]
    MASTER_HASH --> SEND_API[📤 POST /api/fingerprint]

    %% Server Processing
    SEND_API --> VALIDATE[✅ Validar payload]
    VALIDATE --> SESSION_ID[🆔 Gerar/usar session ID]
    SESSION_ID --> STORE_SQLITE[💾 Armazenar em SQLite]
    STORE_SQLITE --> STORE_FILE[📄 Backup em arquivo]

    %% Database Storage Detail
    STORE_SQLITE --> DB_MAIN[Tabela fingerprints]
    STORE_SQLITE --> DB_BROWSER[Tabela browser_info]
    STORE_SQLITE --> DB_CANVAS[Tabela canvas_fingerprints]
    STORE_SQLITE --> DB_WEBGL[Tabela webgl_fingerprints]
    STORE_SQLITE --> DB_AUDIO[Tabela audio_fingerprints]
    STORE_SQLITE --> DB_HARDWARE[Tabela hardware_profiles]
    STORE_SQLITE --> DB_BENCH[Tabela hardware_benchmarks]
    STORE_SQLITE --> DB_META[Tabela session_metadata]

    %% Response
    STORE_FILE --> RESPONSE[📨 Resposta JSON]
    RESPONSE --> DISPLAY[🖥️ Exibir resultados]

    %% Error Handling
    VALIDATE -->|❌ Erro| ERROR[⚠️ Retorna erro 400]
    STORE_SQLITE -->|❌ Falha DB| FALLBACK[🔄 Apenas arquivo]

    %% Styling - Optimized for both light and dark modes
    classDef process fill:#5e92f3,stroke:#3d6bb3,stroke-width:2px,color:#fff
    classDef storage fill:#66bb6a,stroke:#4a8f4e,stroke-width:2px,color:#fff
    classDef error fill:#ef5350,stroke:#c62828,stroke-width:2px,color:#fff
    classDef decision fill:#ffa726,stroke:#f57c00,stroke-width:2px,color:#fff

    class CANVAS,WEBGL,AUDIO,BROWSER,HARDWARE process
    class STORE_SQLITE,STORE_FILE,DB_MAIN,DB_BROWSER,DB_CANVAS,DB_WEBGL,DB_AUDIO,DB_HARDWARE,DB_BENCH,DB_META storage
    class ERROR,FALLBACK error
    class PARALLEL,VALIDATE decision
```

## Estrutura de Dados do Fingerprint

```mermaid
erDiagram
    fingerprints {
        string fingerprint_id PK
        string fingerprint_hash
        string session_id
        datetime client_timestamp
        datetime server_timestamp
        json raw_data
    }

    browser_info {
        string fingerprint_id PK,FK
        string user_agent
        string language
        string platform
        int hardware_concurrency
        int device_memory
        int screen_width
        int screen_height
        string screen_resolution
        int color_depth
        int timezone_offset
        int plugins_count
    }

    canvas_fingerprints {
        string fingerprint_id PK,FK
        string canvas_hash
        string data_url
        datetime created_at
    }

    webgl_fingerprints {
        string fingerprint_id PK,FK
        string webgl_hash
        string vendor
        string renderer
        datetime created_at
    }

    audio_fingerprints {
        string fingerprint_id PK,FK
        string audio_hash
        int sample_rate
        datetime created_at
    }

    hardware_profiles {
        string fingerprint_id PK,FK
        int cores
        int memory
        int concurrency
        datetime created_at
    }

    hardware_benchmarks {
        string fingerprint_id PK,FK
        real math_ops
        real string_ops
        real array_ops
        real crypto_ops
        real cpu_benchmark
        real memory_benchmark
        real crypto_benchmark
        string instruction_timing
        string port_contention_hash
        datetime created_at
    }

    session_metadata {
        string fingerprint_id PK,FK
        string ip_address
        string user_agent
        string referer
        string accept_language
        datetime created_at
    }

    fingerprints ||--|| browser_info : has
    fingerprints ||--|| canvas_fingerprints : has
    fingerprints ||--|| webgl_fingerprints : has
    fingerprints ||--|| audio_fingerprints : has
    fingerprints ||--|| hardware_profiles : has
    fingerprints ||--|| hardware_benchmarks : has
    fingerprints ||--|| session_metadata : has
```

## Tecnologias e Componentes

### Frontend Stack
- **HTML5/CSS3**: Interface moderna e responsiva
- **Vanilla JavaScript**: Lógica de cliente sem frameworks
- **WebAssembly (Rust)**: Computação de alta performance
- **Web APIs**: Canvas, WebGL, Web Audio, Performance

### Backend Stack
- **Node.js**: Runtime JavaScript no servidor
- **Express.js**: Framework web minimalista
- **SQLite**: Banco de dados embarcado
- **Body Parser/CORS**: Middleware de segurança

### Build Tools
- **Rust/Cargo**: Compilação do código WASM
- **wasm-pack**: Geração de bindings JavaScript
- **npm**: Gerenciamento de dependências Node.js

### Recursos de Segurança
- **COOP/COEP Headers**: Isolamento de origem cruzada
- **Rate Limiting**: Proteção contra spam
- **CORS**: Controle de acesso cross-origin
- **Input Validation**: Sanitização de dados

### Estrutura de Arquivos
```
wasm-finger/
├── 📁 public/              # Assets estáticos
│   ├── 📄 index.html       # Interface principal
│   ├── 📄 help.html        # Documentação
│   └── 📁 pkg/             # WASM gerado
├── 📁 wasm-fingerprint/    # Código Rust
│   ├── 📄 Cargo.toml       # Dependências Rust
│   └── 📁 src/             # Módulos fingerprinting
├── 📁 database/            # Camada de dados
│   ├── 📄 schema.sql       # Estrutura do DB
│   └── 📄 database.js      # Abstração SQLite
├── 📁 config/              # Configurações
│   └── 📄 index.js         # Config centralizada
├── 📁 scripts/             # Scripts de automação
│   └── 📄 deploy-heroku.sh # Deploy automatizado
├── 📁 data/                # Backup em arquivos
├── 📄 server.js            # Servidor Express
├── 📄 .env.production      # Variáveis produção
├── 📄 Procfile             # Config Heroku
├── 📄 app.json             # Heroku app config
└── 📄 package.json         # Dependências Node.js
```

## Sistema de Comparação Inteligente

### Algoritmo de Tolerância para Hardware Benchmarks

O sistema implementa um algoritmo avançado de comparação que considera as variações naturais nos benchmarks de hardware:

```mermaid
flowchart TD
    START[🔄 Comparar Fingerprints] --> RECEIVE[📥 Receber FP1 e FP2]
    RECEIVE --> VALIDATE[✅ Validar estrutura]
    VALIDATE --> EXACT_COMPARE[🎯 Comparação Exata]

    subgraph "Comparação Exata (100% precisão)"
        EXACT_COMPARE --> CANVAS_CMP[🎨 Canvas Hash]
        EXACT_COMPARE --> WEBGL_CMP[🎮 WebGL Hash]
        EXACT_COMPARE --> AUDIO_CMP[🔊 Audio Hash]
        EXACT_COMPARE --> BROWSER_CMP[🌐 Browser Info]
    end

    subgraph "Comparação com Tolerância (15%)"
        EXACT_COMPARE --> HARDWARE_CMP[💻 Hardware Benchmarks]
        HARDWARE_CMP --> THRESHOLD[🎚️ Aplicar Threshold 15%]
        THRESHOLD --> MATH_TOL[➕ Math Operations]
        THRESHOLD --> MEMORY_TOL[💾 Memory Benchmark]
        THRESHOLD --> CRYPTO_TOL[🔐 Crypto Benchmark]
        THRESHOLD --> CPU_TOL[⚡ CPU Performance]
    end

    CANVAS_CMP --> WEIGHTED[⚖️ Score Ponderado]
    WEBGL_CMP --> WEIGHTED
    AUDIO_CMP --> WEIGHTED
    BROWSER_CMP --> WEIGHTED
    MATH_TOL --> WEIGHTED
    MEMORY_TOL --> WEIGHTED
    CRYPTO_TOL --> WEIGHTED
    CPU_TOL --> WEIGHTED

    WEIGHTED --> CONFIDENCE[📊 Calcular Confiança]
    CONFIDENCE --> DECISION{🤔 Mesmo Device?}

    DECISION -->|Confiança > 80%| MATCH[✅ Dispositivos Idênticos]
    DECISION -->|Confiança 50-80%| SIMILAR[⚠️ Dispositivos Similares]
    DECISION -->|Confiança < 50%| DIFFERENT[❌ Dispositivos Diferentes]

    MATCH --> RESPONSE[📤 Retornar Resultado]
    SIMILAR --> RESPONSE
    DIFFERENT --> RESPONSE

    classDef exact fill:#42a5f5,stroke:#1976d2,stroke-width:2px,color:#fff
    classDef tolerance fill:#ffa726,stroke:#f57c00,stroke-width:2px,color:#fff
    classDef result fill:#66bb6a,stroke:#388e3c,stroke-width:2px,color:#fff
    classDef decision fill:#ec407a,stroke:#c2185b,stroke-width:2px,color:#fff

    class CANVAS_CMP,WEBGL_CMP,AUDIO_CMP,BROWSER_CMP exact
    class HARDWARE_CMP,THRESHOLD,MATH_TOL,MEMORY_TOL,CRYPTO_TOL,CPU_TOL tolerance
    class MATCH,SIMILAR,DIFFERENT,RESPONSE result
    class DECISION decision
```

### Endpoint de Comparação Inteligente

**POST /api/compare-fingerprints**

```json
{
  "fingerprint1": { /* dados do primeiro fingerprint */ },
  "fingerprint2": { /* dados do segundo fingerprint */ }
}
```

**Resposta:**
```json
{
  "success": true,
  "isMatch": true,
  "confidence": 92.5,
  "details": {
    "canvas": { "match": true, "score": 1.0 },
    "webgl": { "match": true, "score": 1.0 },
    "audio": { "match": true, "score": 1.0 },
    "browser": { "match": true, "score": 1.0 },
    "hardware": {
      "math_operations": { "match": true, "score": 0.87 },
      "memory_benchmark": { "match": true, "score": 0.91 },
      "crypto_benchmark": { "match": true, "score": 0.94 }
    }
  }
}
```

## Deployment e DevOps

### Pipeline de Deploy no Heroku

```mermaid
flowchart LR
    subgraph "Desenvolvimento Local"
        DEV[👨‍💻 Desenvolvimento] --> BUILD[🔨 Build WASM]
        BUILD --> TEST[🧪 Testes Locais]
    end

    subgraph "Controle de Versão"
        TEST --> GIT[📝 Git Commit]
        GIT --> PUSH[⬆️ Git Push]
    end

    subgraph "Heroku Deployment"
        PUSH --> HEROKU_BUILD[🏗️ Heroku Build]
        HEROKU_BUILD --> ENV_CONFIG[⚙️ Configurar ENV]
        ENV_CONFIG --> WASM_SKIP[⏭️ Skip WASM Build]
        WASM_SKIP --> NODE_BUILD[📦 Build Node.js]
        NODE_BUILD --> DEPLOY[🚀 Deploy App]
    end

    subgraph "Produção"
        DEPLOY --> HEALTH[💓 Health Check]
        HEALTH --> LIVE[✅ App Live]
    end

    classDef dev fill:#4fc3f7,stroke:#0277bd,stroke-width:2px,color:#fff
    classDef git fill:#9575cd,stroke:#512da8,stroke-width:2px,color:#fff
    classDef heroku fill:#ff7043,stroke:#d84315,stroke-width:2px,color:#fff
    classDef prod fill:#81c784,stroke:#2e7d32,stroke-width:2px,color:#fff

    class DEV,BUILD,TEST dev
    class GIT,PUSH git
    class HEROKU_BUILD,ENV_CONFIG,WASM_SKIP,NODE_BUILD,DEPLOY heroku
    class HEALTH,LIVE prod
```

### Configuração de Ambiente

**Arquivos de Configuração:**
- `.env.production` - Documentação completa das variáveis
- `Procfile` - Configuração de processo Heroku
- `app.json` - Metadata da aplicação
- `scripts/deploy-heroku.sh` - Script automatizado de deploy

**Comandos de Deploy:**
```bash
# Deploy automático
npm run deploy:heroku

# Deploy manual
heroku config:set $(grep -v '^#' .env.production | grep -v '^$' | tr '\n' ' ')
git push heroku main
```

## Correções e Melhorias Recentes

### ✅ Bug Fixes Implementados

1. **Compare Sessions Button Fix**
   - Problema: `event.target` undefined em chamadas programáticas
   - Solução: Parâmetro opcional `targetElement` na função `switchTab()`
   - Status: ✅ Resolvido

2. **Heroku Deployment Issues**
   - Problema: H20 "App boot timeout"
   - Causa: Server binding em `localhost` instead de `0.0.0.0`
   - Solução: Configuração dinâmica de host baseada em `NODE_ENV`
   - Status: ✅ Resolvido

3. **WASM Build na Produção**
   - Problema: `wasm-pack` não disponível no Heroku
   - Solução: Pre-built WASM files incluídos no repositório
   - Script: `build:wasm:heroku` que pula compilação
   - Status: ✅ Resolvido

4. **Session Recognition Issue**
   - Problema: Mesmas sessões detectadas como diferentes
   - Causa: Variações naturais em hardware benchmarks
   - Solução: Sistema de tolerância de 15% para benchmarks
   - Status: ✅ Resolvido

### 🚀 Melhorias de Performance

1. **Intelligent Comparison System**
   - Endpoint `/api/compare-fingerprints` com análise detalhada
   - Scoring ponderado com diferentes pesos por componente
   - Níveis de confiança: Idêntico (>80%), Similar (50-80%), Diferente (<50%)

2. **Database Optimization**
   - Schema normalizado com 8 tabelas relacionadas
   - Índices para queries frequentes
   - Foreign keys para integridade referencial

3. **Configuration Management**
   - Sistema centralizado em `config/index.js`
   - Feature flags para desenvolvimento/produção
   - Validação automática de configuração

### 📊 Analytics e Monitoramento

- Health check endpoint: `/health`
- Estatísticas em tempo real: `/api/stats`
- Logging estruturado em JSON
- Métricas de performance dos benchmarks
