# Sistema de Matching Inteligente - Documentação Visual

## 1. Visão Geral do Sistema de Matching

```mermaid
graph TB
    subgraph "🎯 Objetivo Principal"
        GOAL[Identificar Usuários Únicos<br/>através de Fingerprints<br/>NÃO por Session IDs]
    end

    subgraph "📥 Entrada"
        FP1[Fingerprint 1]
        FP2[Fingerprint 2]
    end

    subgraph "⚙️ Processamento"
        FP1 --> MATCH[Sistema de<br/>Matching Inteligente]
        FP2 --> MATCH

        MATCH --> COMP[Análise de<br/>Componentes]
        COMP --> WEIGHT[Aplicação de<br/>Pesos]
        WEIGHT --> TOL[Tolerância a<br/>Variações]
        TOL --> SCORE[Score de<br/>Similaridade]
    end

    subgraph "📊 Saída"
        SCORE --> THRESH{Aplicar<br/>Thresholds}
        THRESH -->|≥85%| SAME[✅ Mesmo Dispositivo]
        THRESH -->|75-85%| LIKELY[🟡 Provavelmente Mesmo]
        THRESH -->|65-75%| POSSIBLY[🟠 Possivelmente Mesmo]
        THRESH -->|<65%| DIFF[❌ Dispositivo Diferente]
    end

    style GOAL fill:#e1f5fe,stroke:#0277bd,stroke-width:3px
    style SAME fill:#c8e6c9,stroke:#2e7d32
    style LIKELY fill:#fff9c4,stroke:#f57f17
    style POSSIBLY fill:#ffe0b2,stroke:#ef6c00
    style DIFF fill:#ffcdd2,stroke:#c62828
```

## 2. Componentes e Seus Pesos

```mermaid
pie title "Distribuição de Pesos no Matching (Total: 100%)"
    "Canvas (30%)" : 30
    "WebGL (20%)" : 20
    "Audio (20%)" : 20
    "Browser Info (20%)" : 20
    "Hardware Estável (7%)" : 7
    "Hardware Dinâmico (3%)" : 3
```

```mermaid
graph LR
    subgraph "🎨 Canvas - 30%"
        C1[Renderização Gráfica]
        C2[Hash Único por GPU]
        C3[Muito Estável]
        C1 --> C4[Peso: 0.30]
        C2 --> C4
        C3 --> C4
    end

    subgraph "🎮 WebGL - 20%"
        W1[Vendor da GPU]
        W2[Renderer Info]
        W3[Capacidades 3D]
        W1 --> W4[Peso: 0.20]
        W2 --> W4
        W3 --> W4
    end

    subgraph "🔊 Audio - 20%"
        A1[Audio Context]
        A2[Sample Rate]
        A3[Processing Stack]
        A1 --> A4[Peso: 0.20]
        A2 --> A4
        A3 --> A4
    end

    subgraph "🌐 Browser - 20%"
        B1[User Agent]
        B2[Resolução]
        B3[Timezone/Language]
        B1 --> B4[Peso: 0.20]
        B2 --> B4
        B3 --> B4
    end

    subgraph "💻 Hardware Estável - 7%"
        H1[CPU Cores]
        H2[Memory Size]
        H3[Concurrency]
        H1 --> H4[Peso: 0.07]
        H2 --> H4
        H3 --> H4
    end

    subgraph "⚡ Hardware Dinâmico - 3%"
        D1[Math Benchmarks]
        D2[String Operations]
        D3[Crypto Operations]
        D1 --> D4[Peso: 0.03]
        D2 --> D4
        D3 --> D4
    end

    C4 --> TOTAL[Score Total<br/>0.0 - 1.0]
    W4 --> TOTAL
    A4 --> TOTAL
    B4 --> TOTAL
    H4 --> TOTAL
    D4 --> TOTAL

    style C4 fill:#e3f2fd
    style W4 fill:#f3e5f5
    style A4 fill:#fce4ec
    style B4 fill:#e8f5e9
    style H4 fill:#fff3e0
    style D4 fill:#ffeeff
    style TOTAL fill:#263238,color:#fff
```

## 3. Sistema de Thresholds

```mermaid
graph LR
    subgraph "Score de Similaridade"
        S[0% ────────── 100%]
    end

    subgraph "Zonas de Decisão"
        Z1[0-64%<br/>❌ Diferente]
        Z2[65-74%<br/>🟠 Possivelmente]
        Z3[75-84%<br/>🟡 Provavelmente]
        Z4[85-100%<br/>✅ Mesmo Device]
    end

    S --> Z1
    S --> Z2
    S --> Z3
    S --> Z4

    Z1 --> D1[Dispositivos<br/>Diferentes]
    Z2 --> D2[Investigar<br/>Mais]
    Z3 --> D3[Alta<br/>Probabilidade]
    Z4 --> D4[Confirmado<br/>Mesmo]

    style Z1 fill:#ffcdd2
    style Z2 fill:#ffe0b2
    style Z3 fill:#fff9c4
    style Z4 fill:#c8e6c9
```

```mermaid
flowchart TB
    INPUT[Score Calculado: X%]

    INPUT --> Q1{X ≥ 85%?}
    Q1 -->|Sim| R1[✅ MESMO DISPOSITIVO<br/>Alta Confiança]
    Q1 -->|Não| Q2{X ≥ 75%?}

    Q2 -->|Sim| R2[🟡 PROVAVELMENTE MESMO<br/>Média-Alta Confiança]
    Q2 -->|Não| Q3{X ≥ 65%?}

    Q3 -->|Sim| R3[🟠 POSSIVELMENTE MESMO<br/>Média Confiança]
    Q3 -->|Não| R4[❌ DISPOSITIVO DIFERENTE<br/>Baixa/Nenhuma Confiança]

    style R1 fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style R2 fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style R3 fill:#ffe0b2,stroke:#ef6c00,stroke-width:2px
    style R4 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

## 4. Tolerância a Variações (±20%)

```mermaid
graph TD
    subgraph "Benchmark Original"
        V1[Valor: 100ms]
    end

    subgraph "Zona de Tolerância ±20%"
        MIN[Mínimo: 80ms]
        MAX[Máximo: 120ms]
    end

    subgraph "Novos Valores Coletados"
        N1[95ms ✅]
        N2[110ms ✅]
        N3[85ms ✅]
        N4[130ms ❌]
        N5[75ms ❌]
    end

    V1 --> CALC[Cálculo de Ratio]
    MIN --> ZONE[80-120ms<br/>Zona Aceita]
    MAX --> ZONE

    N1 --> CHECK{Dentro da<br/>Tolerância?}
    N2 --> CHECK
    N3 --> CHECK
    N4 --> CHECK
    N5 --> CHECK

    CHECK -->|Sim| MATCH[Score: 1.0<br/>Match Perfeito]
    CHECK -->|Parcial| PARTIAL[Score: 0.5-0.9<br/>Match Parcial]
    CHECK -->|Não| NOMATCH[Score: 0.3<br/>Sem Match]

    style N1 fill:#c8e6c9
    style N2 fill:#c8e6c9
    style N3 fill:#c8e6c9
    style N4 fill:#ffcdd2
    style N5 fill:#ffcdd2
    style ZONE fill:#e1f5fe
```

## 5. Funcionalidades do Sistema

```mermaid
mindmap
  root((Sistema de<br/>Matching<br/>Inteligente))
    Agrupamento
      Por Dispositivo Real
      Não por Session ID
      Clustering Automático
    Detecção
      Usuários Novos
      Usuários Retornando
      Dispositivos Múltiplos
    Estatísticas
      Total de Fingerprints
      Dispositivos Únicos
      Taxa de Retorno
      Média por Dispositivo
    API
      Comparação Detalhada
      Scores por Componente
      Confidence Level
      Threshold Info
```

## 6. Fluxo de Agrupamento por Dispositivo

```mermaid
flowchart TD
    START[Nova Coleta<br/>de Fingerprint]

    START --> LOAD[Carregar Todos<br/>os Fingerprints<br/>Existentes]

    LOAD --> LOOP{Para Cada<br/>Grupo Existente}

    LOOP --> COMP[Comparar com<br/>Primeiro FP<br/>do Grupo]

    COMP --> SIM[Calcular<br/>Similaridade]

    SIM --> CHECK{Similaridade<br/>≥ 85%?}

    CHECK -->|Sim| ADD[Adicionar ao<br/>Grupo Existente]
    CHECK -->|Não| NEXT[Próximo<br/>Grupo]

    NEXT --> LOOP

    LOOP -->|Nenhum Match| NEW[Criar Novo<br/>Grupo de<br/>Dispositivo]

    ADD --> UPDATE[Atualizar<br/>Estatísticas]
    NEW --> UPDATE

    UPDATE --> RETURN[Retornar ID<br/>do Dispositivo]

    style START fill:#e1f5fe
    style ADD fill:#c8e6c9
    style NEW fill:#fff9c4
    style RETURN fill:#f3e5f5
```

## 7. API de Comparação

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as API Endpoint
    participant M as Matcher
    participant R as Response

    C->>API: POST /api/compare-fingerprints
    Note right of C: {fingerprint1, fingerprint2}

    API->>M: new FingerprintMatcher()

    M->>M: calculateSimilarity(fp1, fp2)
    Note right of M: Analisa cada componente

    M->>M: compareCanvas()
    M->>M: compareWebGL()
    M->>M: compareAudio()
    M->>M: compareBrowserInfo()
    M->>M: compareHardwareStable()
    M->>M: compareHardwareDynamic()

    M->>M: applyWeights()
    Note right of M: Aplica pesos 30/20/20/20/7/3

    M->>M: getMatchConfidence()
    Note right of M: Determina nível de confiança

    M-->>API: {similarity: 87.5%, confidence: "high"}

    API-->>R: Formata Resposta

    R-->>C: JSON Response
    Note right of R: {<br/>  isMatch: true,<br/>  similarity: "87.5%",<br/>  confidence: "high",<br/>  details: {...},<br/>  thresholds: {...}<br/>}
```

## 8. Casos de Uso Reais

```mermaid
graph TB
    subgraph "Cenário 1: Múltiplas Coletas - Mesmo Browser"
        U1[Usuário Acessa] --> C1[Coleta 1<br/>10:00h]
        U1 --> C2[Coleta 2<br/>10:15h]
        U1 --> C3[Coleta 3<br/>10:30h]

        C1 --> M1[Matching]
        C2 --> M1
        C3 --> M1

        M1 --> R1[Similaridade: ~100%<br/>✅ Mesmo Device]
    end

    subgraph "Cenário 2: Browsers Diferentes - Mesmo PC"
        U2[Mesmo PC] --> B1[Chrome]
        U2 --> B2[Edge]
        U2 --> B3[Firefox]

        B1 --> M2[Matching]
        B2 --> M2
        B3 --> M2

        M2 --> R2[Similaridade: 85-95%<br/>✅ Mesmo Device<br/>Canvas/WebGL Idênticos]
    end

    subgraph "Cenário 3: PCs Diferentes"
        PC1[PC Casa] --> F1[Fingerprint A]
        PC2[PC Trabalho] --> F2[Fingerprint B]

        F1 --> M3[Matching]
        F2 --> M3

        M3 --> R3[Similaridade: <65%<br/>❌ Devices Diferentes]
    end

    style R1 fill:#c8e6c9
    style R2 fill:#c8e6c9
    style R3 fill:#ffcdd2
```

## 9. Estatísticas Geradas

```mermaid
graph LR
    subgraph "Entrada: Logs JSON"
        L1[Log 1]
        L2[Log 2]
        L3[Log 3]
        L4[Log N...]
    end

    subgraph "Processamento"
        L1 --> MATCHER[FingerprintMatcher]
        L2 --> MATCHER
        L3 --> MATCHER
        L4 --> MATCHER

        MATCHER --> GROUPS[Agrupamento<br/>por Dispositivo]
    end

    subgraph "Saída: Estatísticas"
        GROUPS --> S1[Total Fingerprints: N]
        GROUPS --> S2[Unique Devices: X]
        GROUPS --> S3[Returning Devices: Y]
        GROUPS --> S4[Avg per Device: Z]
        GROUPS --> S5[Device Groups:<br/>Lista Detalhada]
    end

    style MATCHER fill:#263238,color:#fff
    style S1 fill:#e3f2fd
    style S2 fill:#f3e5f5
    style S3 fill:#fce4ec
    style S4 fill:#e8f5e9
    style S5 fill:#fff3e0
```

## 10. Vantagens do Sistema

```mermaid
graph TD
    subgraph "🎯 Objetivo Alcançado"
        OBJ[Identificação de Usuários<br/>sem Cookies ou IDs]
    end

    subgraph "✅ Vantagens"
        V1[Não depende de Session IDs]
        V2[Tolera variações naturais]
        V3[Identifica cross-browser]
        V4[Agrupa automaticamente]
        V5[Alta precisão 85%+]
    end

    subgraph "🔬 Aplicações"
        A1[Pesquisa Acadêmica]
        A2[Análise de Privacidade]
        A3[Estudos de Tracking]
        A4[Detecção de Fraude]
    end

    OBJ --> V1
    OBJ --> V2
    OBJ --> V3
    OBJ --> V4
    OBJ --> V5

    V1 --> A1
    V2 --> A2
    V3 --> A3
    V4 --> A4
    V5 --> A1

    style OBJ fill:#1976d2,color:#fff
    style V1 fill:#c8e6c9
    style V2 fill:#c8e6c9
    style V3 fill:#c8e6c9
    style V4 fill:#c8e6c9
    style V5 fill:#c8e6c9
```

---

## Resumo do Sistema

O **Sistema de Matching Inteligente** representa uma evolução significativa no campo de browser fingerprinting, implementando:

1. **Identificação por Fingerprint**: Não depende de Session IDs ou cookies
2. **Algoritmo Ponderado**: Pesos calibrados para cada componente (30/20/20/20/7/3)
3. **Tolerância Inteligente**: Aceita variações de ±20% em benchmarks
4. **Thresholds Claros**: 85%+ = mesmo device, <65% = diferente
5. **Agrupamento Automático**: Organiza fingerprints por dispositivo real
6. **API Rica**: Fornece detalhes completos de comparação

Este sistema cumpre o objetivo acadêmico de demonstrar como técnicas avançadas de fingerprinting podem identificar usuários únicos de forma confiável, mesmo com variações naturais nos dados coletados.