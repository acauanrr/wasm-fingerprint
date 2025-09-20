use wasm_bindgen::prelude::*;
use crate::utils::performance_now;

/// Implementação específica do benchmark de contenção de portas para instruções Wasm
/// Baseado na Seção 4.2: Implementando o Benchmark em Wasm
///
/// Este módulo implementa os benchmarks exatos descritos no artigo,
/// usando instruções Wasm específicas que compilam de forma previsível.

#[wasm_bindgen]
pub struct WasmPortBenchmark;

/// Resultado de um benchmark específico (estrutura interna)
pub struct WasmBenchmarkResult {
    pub instruction_pair: String,
    pub grouped_time: f64,
    pub interleaved_time: f64,
    pub ratio: f64,
    pub iterations: u32,
}

impl WasmPortBenchmark {
    const DEFAULT_ITERATIONS: u32 = 100_000;
    const NUM_RUNS: u32 = 5;
}

// ============================================================================
// Implementação Principal: POPCNT vs OR (como no artigo)
// ============================================================================

/// Execução AGRUPADA: Primeiro todas as instruções POPCNT, depois todas as OR
/// Esta função gera as instruções Wasm i64.popcnt e i64.or em loops separados
#[wasm_bindgen]
pub fn grouped_execution_popcnt_or(iterations: u32) -> u32 {
    let mut val: u64 = 1;

    // Loop 1: Apenas instruções POPCNT (count_ones compila para i64.popcnt)
    for _ in 0..iterations {
        // Instrução A: i64.popcnt (contagem de bits '1')
        val = val.count_ones() as u64;
    }

    // Loop 2: Apenas instruções OR
    for _ in 0..iterations {
        // Instrução B: i64.or (operação OU bit a bit)
        val = val | 0xDEADBEEF;
    }

    val as u32
}

/// Execução INTERCALADA: Instruções POPCNT e OR alternadas
/// Esta função gera as instruções alternadas dentro de um único loop
#[wasm_bindgen]
pub fn interleaved_execution_popcnt_or(iterations: u32) -> u32 {
    let mut val: u64 = 1;

    // Loop único com instruções alternadas
    for _ in 0..iterations {
        // Instrução A: i64.popcnt
        val = val.count_ones() as u64;
        // Instrução B: i64.or
        val = val | 0xDEADBEEF;
    }

    val as u32
}

// ============================================================================
// Pares de Instruções Adicionais para Fingerprinting Robusto
// ============================================================================

/// Par 2: CLZ (Count Leading Zeros) vs AND
#[wasm_bindgen]
pub fn grouped_execution_clz_and(iterations: u32) -> u32 {
    let mut val: u64 = 0xFFFFFFFF;

    // Loop 1: CLZ (leading_zeros compila para i64.clz)
    for _ in 0..iterations {
        val = val.leading_zeros() as u64;
        val = val.max(1); // Previne zero
    }

    // Loop 2: AND
    for _ in 0..iterations {
        val = val & 0xCAFEBABE;
        val = val.max(1); // Previne zero
    }

    val as u32
}

#[wasm_bindgen]
pub fn interleaved_execution_clz_and(iterations: u32) -> u32 {
    let mut val: u64 = 0xFFFFFFFF;

    for _ in 0..iterations {
        val = val.leading_zeros() as u64;
        val = val.max(1);
        val = val & 0xCAFEBABE;
        val = val.max(1);
    }

    val as u32
}

/// Par 3: CTZ (Count Trailing Zeros) vs XOR
#[wasm_bindgen]
pub fn grouped_execution_ctz_xor(iterations: u32) -> u32 {
    let mut val: u64 = 0x12345678;

    // Loop 1: CTZ (trailing_zeros compila para i64.ctz)
    for _ in 0..iterations {
        val = val.trailing_zeros() as u64;
        val = val.max(1);
    }

    // Loop 2: XOR
    for _ in 0..iterations {
        val = val ^ 0xABCDEF01;
    }

    val as u32
}

#[wasm_bindgen]
pub fn interleaved_execution_ctz_xor(iterations: u32) -> u32 {
    let mut val: u64 = 0x12345678;

    for _ in 0..iterations {
        val = val.trailing_zeros() as u64;
        val = val.max(1);
        val = val ^ 0xABCDEF01;
    }

    val as u32
}

/// Par 4: ROTL (Rotate Left) vs SHL (Shift Left)
#[wasm_bindgen]
pub fn grouped_execution_rotl_shl(iterations: u32) -> u32 {
    let mut val: u64 = 0xDEADBEEF;

    // Loop 1: ROTL
    for _ in 0..iterations {
        val = val.rotate_left(7);
    }

    // Loop 2: SHL
    for _ in 0..iterations {
        val = (val << 3) | 1; // OR com 1 para evitar zeros
    }

    val as u32
}

#[wasm_bindgen]
pub fn interleaved_execution_rotl_shl(iterations: u32) -> u32 {
    let mut val: u64 = 0xDEADBEEF;

    for _ in 0..iterations {
        val = val.rotate_left(7);
        val = (val << 3) | 1;
    }

    val as u32
}

/// Par 5: MUL vs ADD (Multiplicação vs Adição)
#[wasm_bindgen]
pub fn grouped_execution_mul_add(iterations: u32) -> u32 {
    let mut val: u64 = 1;

    // Loop 1: MUL
    for _ in 0..iterations {
        val = val.wrapping_mul(3);
    }

    // Loop 2: ADD
    for _ in 0..iterations {
        val = val.wrapping_add(7);
    }

    val as u32
}

#[wasm_bindgen]
pub fn interleaved_execution_mul_add(iterations: u32) -> u32 {
    let mut val: u64 = 1;

    for _ in 0..iterations {
        val = val.wrapping_mul(3);
        val = val.wrapping_add(7);
    }

    val as u32
}

// ============================================================================
// Função Principal de Medição
// ============================================================================

/// Mede o tempo de execução de um par de funções (agrupada vs intercalada)
/// Retorna uma string JSON com os resultados
#[wasm_bindgen]
pub fn measure_wasm_port_contention(
    pair_name: &str,
    iterations: u32,
) -> Result<String, JsValue> {
    let (grouped_fn, interleaved_fn) = match pair_name {
        "popcnt_or" => (
            grouped_execution_popcnt_or as fn(u32) -> u32,
            interleaved_execution_popcnt_or as fn(u32) -> u32,
        ),
        "clz_and" => (
            grouped_execution_clz_and as fn(u32) -> u32,
            interleaved_execution_clz_and as fn(u32) -> u32,
        ),
        "ctz_xor" => (
            grouped_execution_ctz_xor as fn(u32) -> u32,
            interleaved_execution_ctz_xor as fn(u32) -> u32,
        ),
        "rotl_shl" => (
            grouped_execution_rotl_shl as fn(u32) -> u32,
            interleaved_execution_rotl_shl as fn(u32) -> u32,
        ),
        "mul_add" => (
            grouped_execution_mul_add as fn(u32) -> u32,
            interleaved_execution_mul_add as fn(u32) -> u32,
        ),
        _ => return Err(JsValue::from_str("Invalid instruction pair name")),
    };

    // Aquecimento
    for _ in 0..10 {
        grouped_fn(100);
        interleaved_fn(100);
    }

    // Medições múltiplas para estabilidade
    let mut grouped_times = Vec::new();
    let mut interleaved_times = Vec::new();

    for _ in 0..WasmPortBenchmark::NUM_RUNS {
        // Medir execução agrupada
        let start = performance_now();
        let _ = grouped_fn(iterations);
        let grouped_time = performance_now() - start;
        grouped_times.push(grouped_time);

        // Pequeno delay
        let mut dummy = 0u32;
        for i in 0..100 {
            dummy = dummy.wrapping_add(i);
        }
        if dummy == u32::MAX { // Previne otimização
            return Err(JsValue::from_str("Unexpected"));
        }

        // Medir execução intercalada
        let start = performance_now();
        let _ = interleaved_fn(iterations);
        let interleaved_time = performance_now() - start;
        interleaved_times.push(interleaved_time);
    }

    // Calcular medianas
    grouped_times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    interleaved_times.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let grouped_median = grouped_times[grouped_times.len() / 2];
    let interleaved_median = interleaved_times[interleaved_times.len() / 2];

    let ratio = if grouped_median > 0.0 {
        interleaved_median / grouped_median
    } else {
        1.0
    };

    let result = WasmBenchmarkResult {
        instruction_pair: pair_name.to_string(),
        grouped_time: grouped_median,
        interleaved_time: interleaved_median,
        ratio,
        iterations,
    };

    // Retornar como JSON string
    Ok(format!(
        r#"{{"instruction_pair":"{}","grouped_time":{},"interleaved_time":{},"ratio":{},"iterations":{}}}"#,
        result.instruction_pair,
        result.grouped_time,
        result.interleaved_time,
        result.ratio,
        result.iterations
    ))
}

/// Executa todos os benchmarks de contenção de portas Wasm
#[wasm_bindgen]
pub fn run_all_wasm_benchmarks() -> Result<String, JsValue> {
    let pairs = vec!["popcnt_or", "clz_and", "ctz_xor", "rotl_shl", "mul_add"];
    let iterations = WasmPortBenchmark::DEFAULT_ITERATIONS;

    let mut results = String::from("WASM Port Contention Benchmark Results\n");
    results.push_str("=" .repeat(50).as_str());
    results.push_str("\n\n");

    for pair in pairs {
        let result_json = measure_wasm_port_contention(pair, iterations)?;

        // Parse JSON result
        let parts: Vec<&str> = result_json.split(',').collect();
        let ratio = parts.iter()
            .find(|p| p.contains("ratio"))
            .and_then(|p| p.split(':').nth(1))
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(1.0);

        results.push_str(&format!("Instruction Pair: {}\n", pair));
        results.push_str(&format!("  Raw JSON: {}\n", result_json));
        results.push_str(&format!("  Ratio (ρ): {:.4}\n", ratio));

        let interpretation = if ratio > 1.15 {
            "✓ High parallelism (different execution ports)"
        } else if ratio > 0.85 && ratio < 1.15 {
            "≈ No significant contention"
        } else {
            "↓ Grouped faster (cache effects or optimization)"
        };

        results.push_str(&format!("  Interpretation: {}\n\n", interpretation));
    }

    Ok(results)
}

/// Gera um fingerprint baseado nos ratios de contenção Wasm
#[wasm_bindgen]
pub fn generate_wasm_fingerprint() -> Result<String, JsValue> {
    use sha2::{Sha256, Digest};

    let pairs = vec!["popcnt_or", "clz_and", "ctz_xor", "rotl_shl", "mul_add"];
    let iterations = WasmPortBenchmark::DEFAULT_ITERATIONS;

    let mut fingerprint_data = String::new();

    for pair in pairs {
        let result_json = measure_wasm_port_contention(pair, iterations)?;

        // Parse JSON result for ratio
        let parts: Vec<&str> = result_json.split(',').collect();
        let ratio = parts.iter()
            .find(|p| p.contains("ratio"))
            .and_then(|p| p.split(':').nth(1))
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(1.0);

        // Categorizar o ratio
        let category = if ratio > 1.15 {
            "parallel"
        } else if ratio > 0.85 && ratio < 1.15 {
            "neutral"
        } else {
            "sequential"
        };

        fingerprint_data.push_str(&format!(
            "{}:{}:{:.4}|",
            pair,
            category,
            ratio
        ));
    }

    // Gerar hash SHA-256
    let mut hasher = Sha256::new();
    hasher.update(fingerprint_data.as_bytes());
    let hash_result = hasher.finalize();

    Ok(format!("{:x}", hash_result))
}