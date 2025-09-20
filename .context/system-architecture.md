# Sistema de Browser Fingerprinting - Arquitetura e Pipeline

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

    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef storage fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef build fill:#fff3e0,stroke:#e65100,stroke-width:2px

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

    %% Styling
    classDef process fill:#bbdefb,stroke:#1976d2
    classDef storage fill:#c8e6c9,stroke:#388e3c
    classDef error fill:#ffcdd2,stroke:#d32f2f
    classDef decision fill:#fff9c4,stroke:#f57f17

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
├── 📁 data/                # Backup em arquivos
├── 📄 server.js            # Servidor Express
└── 📄 package.json         # Dependências Node.js
```