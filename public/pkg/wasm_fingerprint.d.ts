/* tslint:disable */
/* eslint-disable */
/**
 * Função exportada para JavaScript - Canvas Fingerprinting
 */
export function get_canvas_fingerprint(): string;
/**
 * Função exportada para JavaScript - WebGL Fingerprinting
 */
export function get_webgl_fingerprint(): string;
/**
 * Função exportada para JavaScript - Audio Fingerprinting conforme o guia
 */
export function get_audio_fingerprint(): Promise<number>;
/**
 * Função exportada para JavaScript - Audio Fingerprinting com hash SHA-256
 */
export function get_audio_fingerprint_hash(): Promise<string>;
/**
 * Função exportada para JavaScript
 */
export function get_port_contention_fingerprint(): string;
/**
 * Função exportada para obter dados detalhados
 */
export function get_port_contention_detailed(): string;
/**
 * Execução AGRUPADA: Primeiro todas as instruções POPCNT, depois todas as OR
 * Esta função gera as instruções Wasm i64.popcnt e i64.or em loops separados
 */
export function grouped_execution_popcnt_or(iterations: number): number;
/**
 * Execução INTERCALADA: Instruções POPCNT e OR alternadas
 * Esta função gera as instruções alternadas dentro de um único loop
 */
export function interleaved_execution_popcnt_or(iterations: number): number;
/**
 * Par 2: CLZ (Count Leading Zeros) vs AND
 */
export function grouped_execution_clz_and(iterations: number): number;
export function interleaved_execution_clz_and(iterations: number): number;
/**
 * Par 3: CTZ (Count Trailing Zeros) vs XOR
 */
export function grouped_execution_ctz_xor(iterations: number): number;
export function interleaved_execution_ctz_xor(iterations: number): number;
/**
 * Par 4: ROTL (Rotate Left) vs SHL (Shift Left)
 */
export function grouped_execution_rotl_shl(iterations: number): number;
export function interleaved_execution_rotl_shl(iterations: number): number;
/**
 * Par 5: MUL vs ADD (Multiplicação vs Adição)
 */
export function grouped_execution_mul_add(iterations: number): number;
export function interleaved_execution_mul_add(iterations: number): number;
/**
 * Mede o tempo de execução de um par de funções (agrupada vs intercalada)
 * Retorna uma string JSON com os resultados
 */
export function measure_wasm_port_contention(pair_name: string, iterations: number): string;
/**
 * Executa todos os benchmarks de contenção de portas Wasm
 */
export function run_all_wasm_benchmarks(): string;
/**
 * Gera um fingerprint baseado nos ratios de contenção Wasm
 */
export function generate_wasm_fingerprint(): string;
export function log_window_details(): void;
export class FingerprintCollector {
  free(): void;
  constructor();
  run_hardware_benchmarks(): string;
  collect_fingerprint(): Promise<string>;
  get_composite_hash(): string;
  send_to_server(endpoint: string): Promise<void>;
}
/**
 * Módulo de Fingerprinting Microarquitetural baseado em Contenção Sequencial de Portas
 *
 * Esta implementação é baseada na pesquisa sobre "Sequential Port Contention"
 * que explora as características de agendamento de instruções das CPUs modernas
 * para criar fingerprints únicos e estáveis do hardware.
 */
export class PortContentionFingerprint {
  private constructor();
  free(): void;
}
/**
 * Implementação específica do benchmark de contenção de portas para instruções Wasm
 * Baseado na Seção 4.2: Implementando o Benchmark em Wasm
 *
 * Este módulo implementa os benchmarks exatos descritos no artigo,
 * usando instruções Wasm específicas que compilam de forma previsível.
 */
export class WasmPortBenchmark {
  private constructor();
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly get_canvas_fingerprint: (a: number) => void;
  readonly get_webgl_fingerprint: (a: number) => void;
  readonly get_audio_fingerprint: () => number;
  readonly get_audio_fingerprint_hash: () => number;
  readonly __wbg_portcontentionfingerprint_free: (a: number, b: number) => void;
  readonly get_port_contention_fingerprint: (a: number) => void;
  readonly get_port_contention_detailed: (a: number) => void;
  readonly grouped_execution_popcnt_or: (a: number) => number;
  readonly interleaved_execution_popcnt_or: (a: number) => number;
  readonly grouped_execution_clz_and: (a: number) => number;
  readonly interleaved_execution_clz_and: (a: number) => number;
  readonly grouped_execution_ctz_xor: (a: number) => number;
  readonly interleaved_execution_ctz_xor: (a: number) => number;
  readonly grouped_execution_rotl_shl: (a: number) => number;
  readonly interleaved_execution_rotl_shl: (a: number) => number;
  readonly grouped_execution_mul_add: (a: number) => number;
  readonly interleaved_execution_mul_add: (a: number) => number;
  readonly measure_wasm_port_contention: (a: number, b: number, c: number, d: number) => void;
  readonly run_all_wasm_benchmarks: (a: number) => void;
  readonly generate_wasm_fingerprint: (a: number) => void;
  readonly __wbg_fingerprintcollector_free: (a: number, b: number) => void;
  readonly fingerprintcollector_new: (a: number) => void;
  readonly fingerprintcollector_run_hardware_benchmarks: (a: number, b: number) => void;
  readonly fingerprintcollector_collect_fingerprint: (a: number) => number;
  readonly fingerprintcollector_get_composite_hash: (a: number, b: number) => void;
  readonly fingerprintcollector_send_to_server: (a: number, b: number, c: number) => number;
  readonly log_window_details: () => void;
  readonly __wbg_wasmportbenchmark_free: (a: number, b: number) => void;
  readonly __wbindgen_export_0: (a: number) => void;
  readonly __wbindgen_export_1: (a: number, b: number) => number;
  readonly __wbindgen_export_2: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_5: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_6: (a: number, b: number, c: number, d: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
