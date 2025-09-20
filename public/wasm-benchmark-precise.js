/**
 * wasm-benchmark-precise.js
 *
 * Implementação de benchmark de contenção de portas com timer de alta precisão
 * Combina o timer SharedArrayBuffer com os benchmarks WASM
 */

class PreciseWasmBenchmark {
    constructor() {
        this.timer = null;
        this.wasmModule = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa o sistema de benchmark
     */
    async initialize(wasmModule) {
        // Armazena referência ao módulo WASM
        this.wasmModule = wasmModule;

        // Inicializa o timer de alta precisão
        this.timer = new HighPrecisionTimer();
        await this.timer.initialize();

        // Calibra o timer
        console.log('Calibrando timer de alta precisão...');
        const calibration = await this.timer.calibrate();
        console.log(`Timer calibrado: ${calibration.rate.toFixed(0)} incrementos/segundo`);

        this.isInitialized = true;
    }

    /**
     * Executa benchmark de um par de instruções
     */
    async runBenchmark(instructionPair, iterations = 100000) {
        if (!this.isInitialized) {
            throw new Error('Benchmark não inicializado');
        }

        // Mapeia os nomes para as funções WASM
        const functionMap = {
            'popcnt_or': {
                grouped: this.wasmModule.grouped_execution_popcnt_or,
                interleaved: this.wasmModule.interleaved_execution_popcnt_or
            },
            'clz_and': {
                grouped: this.wasmModule.grouped_execution_clz_and,
                interleaved: this.wasmModule.interleaved_execution_clz_and
            },
            'ctz_xor': {
                grouped: this.wasmModule.grouped_execution_ctz_xor,
                interleaved: this.wasmModule.interleaved_execution_ctz_xor
            },
            'rotl_shl': {
                grouped: this.wasmModule.grouped_execution_rotl_shl,
                interleaved: this.wasmModule.interleaved_execution_rotl_shl
            },
            'mul_add': {
                grouped: this.wasmModule.grouped_execution_mul_add,
                interleaved: this.wasmModule.interleaved_execution_mul_add
            }
        };

        const functions = functionMap[instructionPair];
        if (!functions) {
            throw new Error(`Par de instruções desconhecido: ${instructionPair}`);
        }

        // Aquecimento
        console.log(`Aquecendo benchmark ${instructionPair}...`);
        for (let i = 0; i < 10; i++) {
            functions.grouped(1000);
            functions.interleaved(1000);
        }

        // Medições com timer de alta precisão
        console.log(`Executando benchmark ${instructionPair} com ${iterations} iterações...`);

        // Medição AGRUPADA
        const groupedMeasurements = [];
        for (let i = 0; i < 5; i++) {
            const start = this.timer.now();
            functions.grouped(iterations);
            const end = this.timer.now();
            groupedMeasurements.push(end - start);

            // Pequena pausa entre medições
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Medição INTERCALADA
        const interleavedMeasurements = [];
        for (let i = 0; i < 5; i++) {
            const start = this.timer.now();
            functions.interleaved(iterations);
            const end = this.timer.now();
            interleavedMeasurements.push(end - start);

            // Pequena pausa entre medições
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Calcula medianas
        groupedMeasurements.sort((a, b) => a - b);
        interleavedMeasurements.sort((a, b) => a - b);

        const groupedMedian = groupedMeasurements[2]; // Mediana de 5 valores
        const interleavedMedian = interleavedMeasurements[2];

        // Calcula ratio ρ
        const ratio = interleavedMedian / groupedMedian;

        return {
            instructionPair: instructionPair,
            iterations: iterations,
            groupedCounts: groupedMedian,
            interleavedCounts: interleavedMedian,
            groupedTime: this.timer.calibrationRate > 0 ?
                (groupedMedian / this.timer.calibrationRate) * 1000 : 0,
            interleavedTime: this.timer.calibrationRate > 0 ?
                (interleavedMedian / this.timer.calibrationRate) * 1000 : 0,
            ratio: ratio,
            interpretation: this.interpretRatio(ratio),
            rawMeasurements: {
                grouped: groupedMeasurements,
                interleaved: interleavedMeasurements
            }
        };
    }

    /**
     * Interpreta o valor do ratio
     */
    interpretRatio(ratio) {
        if (ratio > 1.15) {
            return {
                category: 'high_parallelism',
                description: 'Alta paralelização detectada - instruções usam portas diferentes'
            };
        } else if (ratio > 0.85 && ratio < 1.15) {
            return {
                category: 'no_contention',
                description: 'Sem contenção significativa - mesmas portas ou sem benefício ILP'
            };
        } else {
            return {
                category: 'cache_beneficial',
                description: 'Execução agrupada mais rápida - benefícios de cache locality'
            };
        }
    }

    /**
     * Executa todos os benchmarks e gera perfil completo
     */
    async runFullProfile() {
        const pairs = ['popcnt_or', 'clz_and', 'ctz_xor', 'rotl_shl', 'mul_add'];
        const results = [];

        for (const pair of pairs) {
            console.log(`\n--- Benchmark: ${pair.toUpperCase()} ---`);
            const result = await this.runBenchmark(pair);
            results.push(result);

            // Log resultado
            console.log(`Tempo agrupado: ${result.groupedTime.toFixed(3)} ms`);
            console.log(`Tempo intercalado: ${result.interleavedTime.toFixed(3)} ms`);
            console.log(`Ratio ρ: ${result.ratio.toFixed(4)}`);
            console.log(`Interpretação: ${result.interpretation.description}`);
        }

        return results;
    }

    /**
     * Gera fingerprint baseado no perfil de contenção
     */
    generateFingerprint(results) {
        // Cria vetor de distinguidores
        const distinguishers = results.map(r => ({
            pair: r.instructionPair,
            ratio: r.ratio.toFixed(4),
            category: r.interpretation.category
        }));

        // Serializa e hasheia
        const fingerprintData = JSON.stringify(distinguishers);
        return this.sha256(fingerprintData);
    }

    /**
     * Implementação simples de SHA-256 (ou use uma biblioteca)
     */
    async sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Para e limpa o timer
     */
    async cleanup() {
        if (this.timer) {
            await this.timer.stop();
        }
    }
}