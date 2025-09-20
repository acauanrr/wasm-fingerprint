/**
 * entropy-analyzer/src/main.rs
 *
 * Implementação da Seção 5.3: Quantificando a Unicidade com Entropia de Shannon
 * Análise de fingerprints coletados para medir eficácia do sistema
 */

use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::Path;
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use serde_json;

/// Estrutura para representar um fingerprint do log
#[derive(Debug, Deserialize, Serialize)]
struct FingerprintEntry {
    id: String,
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "clientTimestamp")]
    client_timestamp: Option<String>,
    #[serde(rename = "serverTimestamp")]
    server_timestamp: String,
    data: FingerprintData,
    metadata: Option<Metadata>,
}

#[derive(Debug, Deserialize, Serialize)]
struct FingerprintData {
    #[serde(rename = "sessionId")]
    session_id: String,
    timestamp: Option<String>,
    #[serde(rename = "proposalA")]
    proposal_a: Option<ProposalA>,
    #[serde(rename = "proposalB")]
    proposal_b: Option<ProposalB>,
    #[serde(rename = "browserAttributes")]
    browser_attributes: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ProposalA {
    canvas: Option<String>,
    webgl: Option<String>,
    audio: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ProposalB {
    #[serde(rename = "portContention")]
    port_contention: Option<String>,
    distinguishers: Option<Vec<Distinguisher>>,
    #[serde(rename = "hardwareProfile")]
    hardware_profile: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Distinguisher {
    pair: Vec<String>,
    ratio: f64,
    category: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Metadata {
    ip: Option<String>,
    #[serde(rename = "userAgent")]
    user_agent: Option<String>,
}

/// Estrutura para estatísticas de análise
#[derive(Debug, Serialize)]
struct AnalysisResults {
    total_entries: usize,
    unique_fingerprints: usize,
    unique_sessions: usize,
    shannon_entropy: f64,
    normalized_entropy: f64,
    max_possible_entropy: f64,
    uniqueness_rate: f64,
    component_analysis: ComponentAnalysis,
    temporal_distribution: Vec<TemporalBucket>,
}

#[derive(Debug, Serialize)]
struct ComponentAnalysis {
    canvas_entropy: f64,
    webgl_entropy: f64,
    audio_entropy: f64,
    port_contention_entropy: f64,
    combined_entropy: f64,
}

#[derive(Debug, Serialize)]
struct TemporalBucket {
    timestamp: String,
    count: usize,
}

/// Parser de argumentos de linha de comando
#[derive(Parser)]
#[command(name = "entropy-analyzer")]
#[command(about = "Análise de entropia para fingerprints de navegador", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analisa arquivo de log de fingerprints
    Analyze {
        /// Caminho para o arquivo de log
        #[arg(short, long, default_value = "../data/fingerprints.log")]
        file: String,

        /// Gera relatório detalhado
        #[arg(short, long)]
        verbose: bool,
    },

    /// Compara dois conjuntos de fingerprints
    Compare {
        /// Primeiro arquivo de log
        #[arg(short = 'a', long)]
        file_a: String,

        /// Segundo arquivo de log
        #[arg(short = 'b', long)]
        file_b: String,
    },

    /// Gera estatísticas resumidas
    Stats {
        /// Caminho para o arquivo de log
        #[arg(short, long, default_value = "../data/fingerprints.log")]
        file: String,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Analyze { file, verbose } => {
            analyze_fingerprints(&file, verbose)?;
        }
        Commands::Compare { file_a, file_b } => {
            compare_datasets(&file_a, &file_b)?;
        }
        Commands::Stats { file } => {
            print_statistics(&file)?;
        }
    }

    Ok(())
}

/// Analisa fingerprints e calcula entropia
fn analyze_fingerprints(filepath: &str, verbose: bool) -> Result<(), Box<dyn std::error::Error>> {
    println!("📊 Analisando fingerprints de: {}", filepath);
    println!("─".repeat(60));

    let entries = read_fingerprints(Path::new(filepath))?;

    if entries.is_empty() {
        println!("⚠️  Nenhum fingerprint encontrado no arquivo.");
        return Ok(());
    }

    let results = calculate_analysis(&entries);

    // Imprime resultados
    println!("\n📈 RESULTADOS DA ANÁLISE");
    println!("═".repeat(60));

    println!("\n📝 Estatísticas Básicas:");
    println!("  • Total de entradas: {}", results.total_entries);
    println!("  • Fingerprints únicos: {}", results.unique_fingerprints);
    println!("  • Sessões únicas: {}", results.unique_sessions);
    println!("  • Taxa de unicidade: {:.2}%", results.uniqueness_rate * 100.0);

    println!("\n🔬 Análise de Entropia:");
    println!("  • Entropia de Shannon: {:.4} bits", results.shannon_entropy);
    println!("  • Entropia normalizada: {:.4}", results.normalized_entropy);
    println!("  • Entropia máxima possível: {:.4} bits", results.max_possible_entropy);
    println!("  • Capacidade de distinção: 2^{:.1} ≈ {} usuários",
             results.shannon_entropy,
             (2_f64.powf(results.shannon_entropy)) as u64);

    if verbose {
        println!("\n🧩 Análise por Componente:");
        println!("  • Canvas entropy: {:.4} bits", results.component_analysis.canvas_entropy);
        println!("  • WebGL entropy: {:.4} bits", results.component_analysis.webgl_entropy);
        println!("  • Audio entropy: {:.4} bits", results.component_analysis.audio_entropy);
        println!("  • Port Contention entropy: {:.4} bits", results.component_analysis.port_contention_entropy);
        println!("  • Combined entropy: {:.4} bits", results.component_analysis.combined_entropy);

        // Interpretação dos resultados
        println!("\n💡 Interpretação:");
        interpret_results(&results);
    }

    // Salva relatório JSON
    let report_path = filepath.replace(".log", "_analysis.json");
    save_report(&results, &report_path)?;
    println!("\n💾 Relatório salvo em: {}", report_path);

    Ok(())
}

/// Lê fingerprints do arquivo de log
fn read_fingerprints(filepath: &Path) -> io::Result<Vec<FingerprintEntry>> {
    let file = File::open(filepath)?;
    let reader = BufReader::new(file);
    let mut entries = Vec::new();

    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<FingerprintEntry>(&line) {
            Ok(entry) => entries.push(entry),
            Err(e) => eprintln!("⚠️  Erro ao parsear linha: {}", e),
        }
    }

    Ok(entries)
}

/// Calcula análise completa dos fingerprints
fn calculate_analysis(entries: &[FingerprintEntry]) -> AnalysisResults {
    let total = entries.len();

    // Coleta fingerprints únicos
    let unique_fps: std::collections::HashSet<_> = entries.iter()
        .map(|e| &e.id)
        .collect();

    let unique_sessions: std::collections::HashSet<_> = entries.iter()
        .map(|e| &e.session_id)
        .collect();

    // Calcula entropia principal
    let shannon_entropy = calculate_shannon_entropy_from_ids(entries);
    let max_entropy = (total as f64).log2();

    // Análise por componente
    let component_analysis = analyze_components(entries);

    // Distribuição temporal (simplificada)
    let temporal_distribution = analyze_temporal_distribution(entries);

    AnalysisResults {
        total_entries: total,
        unique_fingerprints: unique_fps.len(),
        unique_sessions: unique_sessions.len(),
        shannon_entropy,
        normalized_entropy: if max_entropy > 0.0 { shannon_entropy / max_entropy } else { 0.0 },
        max_possible_entropy: max_entropy,
        uniqueness_rate: unique_fps.len() as f64 / total as f64,
        component_analysis,
        temporal_distribution,
    }
}

/// Calcula Entropia de Shannon dos IDs de fingerprint
fn calculate_shannon_entropy_from_ids(entries: &[FingerprintEntry]) -> f64 {
    let mut frequencies = HashMap::new();
    let total = entries.len() as f64;

    if total == 0.0 {
        return 0.0;
    }

    // Conta frequência de cada fingerprint único
    for entry in entries {
        *frequencies.entry(&entry.id).or_insert(0) += 1;
    }

    // Calcula entropia
    let mut entropy = 0.0;
    for &count in frequencies.values() {
        let probability = count as f64 / total;
        if probability > 0.0 {
            entropy -= probability * probability.log2();
        }
    }

    entropy
}

/// Analisa entropia de cada componente
fn analyze_components(entries: &[FingerprintEntry]) -> ComponentAnalysis {
    let canvas_values: Vec<_> = entries.iter()
        .filter_map(|e| e.data.proposal_a.as_ref()?.canvas.as_ref())
        .collect();

    let webgl_values: Vec<_> = entries.iter()
        .filter_map(|e| e.data.proposal_a.as_ref()?.webgl.as_ref())
        .collect();

    let port_contention_values: Vec<_> = entries.iter()
        .filter_map(|e| e.data.proposal_b.as_ref()?.port_contention.as_ref())
        .collect();

    ComponentAnalysis {
        canvas_entropy: calculate_entropy_from_values(&canvas_values),
        webgl_entropy: calculate_entropy_from_values(&webgl_values),
        audio_entropy: 0.0, // Simplificado para o exemplo
        port_contention_entropy: calculate_entropy_from_values(&port_contention_values),
        combined_entropy: calculate_shannon_entropy_from_ids(entries),
    }
}

/// Calcula entropia de uma lista de valores
fn calculate_entropy_from_values<T: std::hash::Hash + Eq>(values: &[T]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let mut frequencies = HashMap::new();
    let total = values.len() as f64;

    for value in values {
        *frequencies.entry(value).or_insert(0) += 1;
    }

    let mut entropy = 0.0;
    for &count in frequencies.values() {
        let probability = count as f64 / total;
        if probability > 0.0 {
            entropy -= probability * probability.log2();
        }
    }

    entropy
}

/// Analisa distribuição temporal
fn analyze_temporal_distribution(entries: &[FingerprintEntry]) -> Vec<TemporalBucket> {
    let mut buckets = HashMap::new();

    for entry in entries {
        // Agrupa por hora (simplificado)
        let timestamp = &entry.server_timestamp[..13]; // YYYY-MM-DDTHH
        *buckets.entry(timestamp.to_string()).or_insert(0) += 1;
    }

    let mut result: Vec<_> = buckets.into_iter()
        .map(|(timestamp, count)| TemporalBucket { timestamp, count })
        .collect();

    result.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
    result
}

/// Interpreta os resultados da análise
fn interpret_results(results: &AnalysisResults) {
    if results.shannon_entropy < 10.0 {
        println!("  ⚠️  Entropia baixa: Sistema pode ter dificuldade em distinguir usuários únicos.");
        println!("     Considere adicionar mais vetores de fingerprinting.");
    } else if results.shannon_entropy < 20.0 {
        println!("  ✓ Entropia moderada: Sistema pode distinguir milhares de usuários.");
        println!("     Adequado para aplicações de médio porte.");
    } else {
        println!("  ✅ Entropia alta: Sistema pode distinguir milhões de usuários únicos.");
        println!("     Excelente capacidade de identificação.");
    }

    if results.uniqueness_rate < 0.5 {
        println!("\n  ⚠️  Taxa de unicidade baixa ({:.1}%)", results.uniqueness_rate * 100.0);
        println!("     Muitas colisões de fingerprints detectadas.");
    } else if results.uniqueness_rate < 0.9 {
        println!("\n  ✓ Taxa de unicidade razoável ({:.1}%)", results.uniqueness_rate * 100.0);
    } else {
        println!("\n  ✅ Taxa de unicidade excelente ({:.1}%)", results.uniqueness_rate * 100.0);
    }
}

/// Compara dois conjuntos de dados
fn compare_datasets(file_a: &str, file_b: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 Comparando datasets:");
    println!("  Dataset A: {}", file_a);
    println!("  Dataset B: {}", file_b);
    println!("─".repeat(60));

    let entries_a = read_fingerprints(Path::new(file_a))?;
    let entries_b = read_fingerprints(Path::new(file_b))?;

    let results_a = calculate_analysis(&entries_a);
    let results_b = calculate_analysis(&entries_b);

    println!("\n📊 COMPARAÇÃO DE ENTROPIA");
    println!("═".repeat(60));
    println!("{:<30} {:>10} {:>10}", "Métrica", "Dataset A", "Dataset B");
    println!("─".repeat(60));
    println!("{:<30} {:>10} {:>10}", "Total de entradas", results_a.total_entries, results_b.total_entries);
    println!("{:<30} {:>10} {:>10}", "Fingerprints únicos", results_a.unique_fingerprints, results_b.unique_fingerprints);
    println!("{:<30} {:>10.4} {:>10.4}", "Entropia de Shannon (bits)", results_a.shannon_entropy, results_b.shannon_entropy);
    println!("{:<30} {:>10.2}% {:>10.2}%", "Taxa de unicidade", results_a.uniqueness_rate * 100.0, results_b.uniqueness_rate * 100.0);

    // Calcula diferença
    let entropy_diff = results_b.shannon_entropy - results_a.shannon_entropy;
    let uniqueness_diff = results_b.uniqueness_rate - results_a.uniqueness_rate;

    println!("\n📈 Análise de Mudança:");
    if entropy_diff > 0.0 {
        println!("  ✅ Entropia aumentou em {:.4} bits ({:.1}%)",
                 entropy_diff,
                 (entropy_diff / results_a.shannon_entropy) * 100.0);
    } else if entropy_diff < 0.0 {
        println!("  ⚠️  Entropia diminuiu em {:.4} bits ({:.1}%)",
                 entropy_diff.abs(),
                 (entropy_diff.abs() / results_a.shannon_entropy) * 100.0);
    } else {
        println!("  → Entropia permaneceu constante");
    }

    if uniqueness_diff > 0.0 {
        println!("  ✅ Taxa de unicidade aumentou em {:.2}%", uniqueness_diff * 100.0);
    } else if uniqueness_diff < 0.0 {
        println!("  ⚠️  Taxa de unicidade diminuiu em {:.2}%", uniqueness_diff.abs() * 100.0);
    }

    Ok(())
}

/// Imprime estatísticas resumidas
fn print_statistics(filepath: &str) -> Result<(), Box<dyn std::error::Error>> {
    let entries = read_fingerprints(Path::new(filepath))?;
    let results = calculate_analysis(&entries);

    // Formato compacto para uso em scripts
    println!("{}", serde_json::to_string_pretty(&results)?);

    Ok(())
}

/// Salva relatório de análise em JSON
fn save_report(results: &AnalysisResults, filepath: &str) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(results)?;
    std::fs::write(filepath, json)?;
    Ok(())
}