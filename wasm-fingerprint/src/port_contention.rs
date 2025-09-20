use wasm_bindgen::prelude::*;
use crate::utils::performance_now;

/// Módulo de Fingerprinting Microarquitetural baseado em Contenção Sequencial de Portas
///
/// Esta implementação é baseada na pesquisa sobre "Sequential Port Contention"
/// que explora as características de agendamento de instruções das CPUs modernas
/// para criar fingerprints únicos e estáveis do hardware.

#[wasm_bindgen]
pub struct PortContentionFingerprint;

/// Estrutura para armazenar resultados de contenção
#[derive(Debug, Clone)]
pub struct ContentionResult {
    pub instruction_pair: String,
    pub grouped_time: f64,
    pub interleaved_time: f64,
    pub ratio_rho: f64,  // ρ = time(interleaved) / time(grouped)
}

impl PortContentionFingerprint {
    /// Número de iterações para cada medição (ajustável para precisão vs velocidade)
    const ITERATIONS: u32 = 100_000;
    const WARMUP_ITERATIONS: u32 = 1_000;
    const NUM_MEASUREMENTS: u32 = 10;

    /// Coleta o fingerprint microarquitetural completo
    pub fn collect() -> Result<String, JsValue> {
        let mut results = Vec::new();

        // Aquecimento do JIT/WASM runtime
        Self::warmup()?;

        // Teste diferentes pares de instruções que competem por diferentes portas
        // Cada par revela informações sobre a microarquitetura específica

        // Par 1: Multiplicação de inteiros vs Adição de inteiros
        // Diferentes CPUs agendam essas operações de forma diferente
        results.push(Self::measure_contention_pair(
            "mul_add",
            Self::execute_mul_grouped,
            Self::execute_mul_add_interleaved,
        )?);

        // Par 2: Divisão vs Multiplicação
        // Divisão geralmente usa uma porta específica com maior latência
        results.push(Self::measure_contention_pair(
            "div_mul",
            Self::execute_div_grouped,
            Self::execute_div_mul_interleaved,
        )?);

        // Par 3: Shift vs XOR
        // Operações lógicas que podem usar portas diferentes
        results.push(Self::measure_contention_pair(
            "shift_xor",
            Self::execute_shift_grouped,
            Self::execute_shift_xor_interleaved,
        )?);

        // Par 4: Operações de ponto flutuante vs inteiros
        // Revela a arquitetura das unidades de execução
        results.push(Self::measure_contention_pair(
            "float_int",
            Self::execute_float_grouped,
            Self::execute_float_int_interleaved,
        )?);

        // Par 5: Operações de branch prediction stress
        // Testa o preditor de branches da CPU
        results.push(Self::measure_contention_pair(
            "branch_stress",
            Self::execute_branch_grouped,
            Self::execute_branch_pattern_interleaved,
        )?);

        // Par 6: Memory fence operations
        // Testa barreiras de memória e ordenação
        results.push(Self::measure_contention_pair(
            "memory_fence",
            Self::execute_memory_pattern_grouped,
            Self::execute_memory_fence_interleaved,
        )?);

        // Gera o fingerprint baseado nos ratios de contenção
        Ok(Self::generate_fingerprint(&results))
    }

    /// Aquecimento para estabilizar as medições
    fn warmup() -> Result<(), JsValue> {
        let mut dummy = 1u32;
        for _ in 0..Self::WARMUP_ITERATIONS {
            dummy = dummy.wrapping_mul(7).wrapping_add(13);
            dummy = dummy.rotate_left(3);
        }
        // Previne otimização
        if dummy == 0 {
            return Err(JsValue::from_str("Warmup failed"));
        }
        Ok(())
    }

    /// Mede a contenção para um par de instruções específico
    fn measure_contention_pair<F1, F2>(
        name: &str,
        grouped_fn: F1,
        interleaved_fn: F2,
    ) -> Result<ContentionResult, JsValue>
    where
        F1: Fn(u32) -> u32,
        F2: Fn(u32) -> u32,
    {
        let mut grouped_times = Vec::new();
        let mut interleaved_times = Vec::new();

        // Múltiplas medições para estabilidade estatística
        for _ in 0..Self::NUM_MEASUREMENTS {
            // Medição agrupada
            let start = performance_now();
            let _ = grouped_fn(Self::ITERATIONS);
            let grouped_time = performance_now() - start;
            grouped_times.push(grouped_time);

            // Pequeno delay para evitar interferência
            Self::cpu_pause();

            // Medição intercalada
            let start = performance_now();
            let _ = interleaved_fn(Self::ITERATIONS);
            let interleaved_time = performance_now() - start;
            interleaved_times.push(interleaved_time);

            Self::cpu_pause();
        }

        // Calcula medianas para robustez contra outliers
        let grouped_median = Self::median(&mut grouped_times);
        let interleaved_median = Self::median(&mut interleaved_times);

        // Calcula o ratio ρ
        let ratio = if grouped_median > 0.0 {
            interleaved_median / grouped_median
        } else {
            1.0
        };

        Ok(ContentionResult {
            instruction_pair: name.to_string(),
            grouped_time: grouped_median,
            interleaved_time: interleaved_median,
            ratio_rho: ratio,
        })
    }

    /// Execução agrupada: AAAA...BBBB...
    fn execute_mul_grouped(iterations: u32) -> u32 {
        let mut result = 1u32;

        // Primeiro executa todas as multiplicações
        for _ in 0..iterations/2 {
            result = result.wrapping_mul(7);
            result = result.wrapping_mul(13);
        }

        // Depois executa todas as adições
        for _ in 0..iterations/2 {
            result = result.wrapping_add(17);
            result = result.wrapping_add(23);
        }

        result
    }

    /// Execução intercalada: ABAB...
    fn execute_mul_add_interleaved(iterations: u32) -> u32 {
        let mut result = 1u32;

        for _ in 0..iterations/2 {
            result = result.wrapping_mul(7);  // A
            result = result.wrapping_add(17); // B
            result = result.wrapping_mul(13); // A
            result = result.wrapping_add(23); // B
        }

        result
    }

    /// Execução agrupada: Divisões seguidas de multiplicações
    fn execute_div_grouped(iterations: u32) -> u32 {
        let mut result = u32::MAX / 2;

        for _ in 0..iterations/2 {
            result = result.wrapping_div(3).max(2);
            result = result.wrapping_div(5).max(2);
        }

        for _ in 0..iterations/2 {
            result = result.wrapping_mul(7);
            result = result.wrapping_mul(11);
        }

        result
    }

    /// Execução intercalada: Divisão-Multiplicação alternadas
    fn execute_div_mul_interleaved(iterations: u32) -> u32 {
        let mut result = u32::MAX / 2;

        for _ in 0..iterations/2 {
            result = result.wrapping_div(3).max(2);  // Divisão
            result = result.wrapping_mul(7);         // Multiplicação
            result = result.wrapping_div(5).max(2);  // Divisão
            result = result.wrapping_mul(11);        // Multiplicação
        }

        result
    }

    /// Execução agrupada: Shifts seguidos de XORs
    fn execute_shift_grouped(iterations: u32) -> u32 {
        let mut result = 0xDEADBEEF_u32;

        for _ in 0..iterations/2 {
            result = result.rotate_left(3);
            result = result.rotate_right(5);
        }

        for _ in 0..iterations/2 {
            result ^= 0xCAFEBABE;
            result ^= 0x12345678;
        }

        result
    }

    /// Execução intercalada: Shift-XOR alternados
    fn execute_shift_xor_interleaved(iterations: u32) -> u32 {
        let mut result = 0xDEADBEEF_u32;

        for _ in 0..iterations/2 {
            result = result.rotate_left(3);   // Shift
            result ^= 0xCAFEBABE;             // XOR
            result = result.rotate_right(5);  // Shift
            result ^= 0x12345678;             // XOR
        }

        result
    }

    /// Execução agrupada: Operações de ponto flutuante
    fn execute_float_grouped(iterations: u32) -> u32 {
        let mut float_result = 1.0_f32;
        let mut int_result = 1_u32;

        // Todas as operações float primeiro
        for _ in 0..iterations/2 {
            float_result *= 1.000001;
            float_result += 0.000001;
        }

        // Depois todas as operações int
        for _ in 0..iterations/2 {
            int_result = int_result.wrapping_mul(3);
            int_result = int_result.wrapping_add(7);
        }

        (float_result as u32).wrapping_add(int_result)
    }

    /// Execução intercalada: Float-Int alternados
    fn execute_float_int_interleaved(iterations: u32) -> u32 {
        let mut float_result = 1.0_f32;
        let mut int_result = 1_u32;

        for _ in 0..iterations/2 {
            float_result *= 1.000001;                    // Float
            int_result = int_result.wrapping_mul(3);     // Int
            float_result += 0.000001;                    // Float
            int_result = int_result.wrapping_add(7);     // Int
        }

        (float_result as u32).wrapping_add(int_result)
    }

    /// Execução agrupada: Stress de predição de branches
    fn execute_branch_grouped(iterations: u32) -> u32 {
        let mut result = 0_u32;
        let mut counter = 0_u32;

        // Padrão previsível
        for _ in 0..iterations/2 {
            if counter % 2 == 0 {
                result = result.wrapping_add(1);
            } else {
                result = result.wrapping_add(2);
            }
            counter += 1;
        }

        // Padrão aleatório (usando operações determinísticas)
        for i in 0..iterations/2 {
            if (i.wrapping_mul(2654435761) >> 16) & 1 == 0 {
                result = result.wrapping_add(3);
            } else {
                result = result.wrapping_add(5);
            }
        }

        result
    }

    /// Execução intercalada: Padrões de branch alternados
    fn execute_branch_pattern_interleaved(iterations: u32) -> u32 {
        let mut result = 0_u32;

        for i in 0..iterations/2 {
            // Branch previsível
            if i % 2 == 0 {
                result = result.wrapping_add(1);
            } else {
                result = result.wrapping_add(2);
            }

            // Branch "aleatório"
            if (i.wrapping_mul(2654435761) >> 16) & 1 == 0 {
                result = result.wrapping_add(3);
            } else {
                result = result.wrapping_add(5);
            }
        }

        result
    }

    /// Execução agrupada: Padrões de acesso à memória
    fn execute_memory_pattern_grouped(iterations: u32) -> u32 {
        let mut result = 0_u32;
        let mut buffer = [0_u32; 64];

        // Acesso sequencial
        for i in 0..iterations/2 {
            let idx = (i % 64) as usize;
            buffer[idx] = buffer[idx].wrapping_add(i);
            result = result.wrapping_add(buffer[idx]);
        }

        // Acesso "aleatório" (pseudo-random determinístico)
        for i in 0..iterations/2 {
            let idx = ((i.wrapping_mul(2654435761)) % 64) as usize;
            buffer[idx] = buffer[idx].wrapping_add(i);
            result = result.wrapping_add(buffer[idx]);
        }

        result
    }

    /// Execução intercalada: Padrões de memória com fence
    fn execute_memory_fence_interleaved(iterations: u32) -> u32 {
        let mut result = 0_u32;
        let mut buffer = [0_u32; 64];

        for i in 0..iterations/2 {
            // Acesso sequencial
            let seq_idx = (i % 64) as usize;
            buffer[seq_idx] = buffer[seq_idx].wrapping_add(i);
            result = result.wrapping_add(buffer[seq_idx]);

            // Simula memory fence com operação volátil
            core::sync::atomic::fence(core::sync::atomic::Ordering::SeqCst);

            // Acesso "aleatório"
            let rand_idx = ((i.wrapping_mul(2654435761)) % 64) as usize;
            buffer[rand_idx] = buffer[rand_idx].wrapping_add(i);
            result = result.wrapping_add(buffer[rand_idx]);
        }

        result
    }

    /// Pequena pausa para separar medições
    fn cpu_pause() {
        // Simula uma pausa usando operações leves
        let mut dummy = 1u32;
        for _ in 0..100 {
            dummy = dummy.wrapping_add(1);
        }
        // Previne otimização
        if dummy == 0 {
            panic!("Should never happen");
        }
    }

    /// Calcula a mediana de um vetor (modifica o vetor)
    fn median(values: &mut Vec<f64>) -> f64 {
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let len = values.len();
        if len % 2 == 0 {
            (values[len / 2 - 1] + values[len / 2]) / 2.0
        } else {
            values[len / 2]
        }
    }

    /// Gera o fingerprint final baseado nos resultados de contenção
    fn generate_fingerprint(results: &[ContentionResult]) -> String {
        use sha2::{Sha256, Digest};

        // Cria uma representação estruturada dos resultados
        let mut fingerprint_data = String::new();

        for result in results {
            // Usa o ratio ρ como componente principal do fingerprint
            // Valores > 1 indicam que intercalado foi mais rápido (paralelismo efetivo)
            // Valores ≈ 1 indicam sem diferença (mesmas portas ou sem paralelismo)
            // Valores < 1 indicam que agrupado foi mais rápido (cache effects)

            let category = if result.ratio_rho > 1.15 {
                "high_parallelism"
            } else if result.ratio_rho > 0.85 && result.ratio_rho < 1.15 {
                "no_contention"
            } else {
                "cache_beneficial"
            };

            fingerprint_data.push_str(&format!(
                "{}:{}:{:.4}|",
                result.instruction_pair,
                category,
                result.ratio_rho
            ));
        }

        // Adiciona informações de timing absoluto (normalizado)
        let min_time = results.iter()
            .map(|r| r.grouped_time.min(r.interleaved_time))
            .fold(f64::INFINITY, f64::min);

        for result in results {
            let normalized_grouped = result.grouped_time / min_time;
            let normalized_interleaved = result.interleaved_time / min_time;

            fingerprint_data.push_str(&format!(
                "norm_{}:{:.2}:{:.2}|",
                result.instruction_pair,
                normalized_grouped,
                normalized_interleaved
            ));
        }

        // Gera hash SHA-256 do fingerprint
        let mut hasher = Sha256::new();
        hasher.update(fingerprint_data.as_bytes());
        let hash_result = hasher.finalize();

        format!("{:x}", hash_result)
    }

    /// Retorna os resultados detalhados para análise
    pub fn collect_detailed() -> Result<Vec<ContentionResult>, JsValue> {
        let mut results = Vec::new();

        Self::warmup()?;

        results.push(Self::measure_contention_pair(
            "mul_add",
            Self::execute_mul_grouped,
            Self::execute_mul_add_interleaved,
        )?);

        results.push(Self::measure_contention_pair(
            "div_mul",
            Self::execute_div_grouped,
            Self::execute_div_mul_interleaved,
        )?);

        results.push(Self::measure_contention_pair(
            "shift_xor",
            Self::execute_shift_grouped,
            Self::execute_shift_xor_interleaved,
        )?);

        results.push(Self::measure_contention_pair(
            "float_int",
            Self::execute_float_grouped,
            Self::execute_float_int_interleaved,
        )?);

        results.push(Self::measure_contention_pair(
            "branch_stress",
            Self::execute_branch_grouped,
            Self::execute_branch_pattern_interleaved,
        )?);

        results.push(Self::measure_contention_pair(
            "memory_fence",
            Self::execute_memory_pattern_grouped,
            Self::execute_memory_fence_interleaved,
        )?);

        Ok(results)
    }
}

/// Função exportada para JavaScript
#[wasm_bindgen]
pub fn get_port_contention_fingerprint() -> Result<String, JsValue> {
    PortContentionFingerprint::collect()
}

/// Função exportada para obter dados detalhados
#[wasm_bindgen]
pub fn get_port_contention_detailed() -> Result<String, JsValue> {
    let results = PortContentionFingerprint::collect_detailed()?;

    let mut output = String::from("Port Contention Analysis:\n");
    output.push_str("=" .repeat(50).as_str());
    output.push_str("\n");

    for result in results {
        output.push_str(&format!(
            "\nInstruction Pair: {}\n",
            result.instruction_pair
        ));
        output.push_str(&format!(
            "  Grouped Time: {:.3} ms\n",
            result.grouped_time
        ));
        output.push_str(&format!(
            "  Interleaved Time: {:.3} ms\n",
            result.interleaved_time
        ));
        output.push_str(&format!(
            "  Ratio ρ: {:.4}\n",
            result.ratio_rho
        ));

        let interpretation = if result.ratio_rho > 1.15 {
            "✓ High parallelism detected (different execution ports)"
        } else if result.ratio_rho > 0.85 && result.ratio_rho < 1.15 {
            "≈ No significant contention (same ports or no ILP benefit)"
        } else {
            "↓ Grouped execution faster (cache locality benefits)"
        };

        output.push_str(&format!("  Interpretation: {}\n", interpretation));
    }

    Ok(output)
}