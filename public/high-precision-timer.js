/**
 * high-precision-timer.js
 *
 * Implementação de timer de alta precisão usando SharedArrayBuffer
 * Baseado na Seção 4.3 do artigo de pesquisa sobre contenção de portas
 *
 * Este timer contorna as limitações de precisão do performance.now()
 * usando um Web Worker que incrementa um contador em thread separada.
 */

class HighPrecisionTimer {
    constructor() {
        this.worker = null;
        this.sharedBuffer = null;
        this.counter = null;
        this.isInitialized = false;
        this.calibrationRate = 0; // Incrementos por segundo
    }

    /**
     * Verifica se SharedArrayBuffer está disponível
     */
    static isAvailable() {
        return typeof SharedArrayBuffer !== 'undefined' &&
               typeof Atomics !== 'undefined' &&
               typeof Worker !== 'undefined';
    }

    /**
     * Verifica se os headers de segurança estão configurados
     */
    static async checkSecurityHeaders() {
        try {
            // Tenta criar um SharedArrayBuffer pequeno
            const test = new SharedArrayBuffer(4);
            return true;
        } catch (e) {
            console.error('SharedArrayBuffer não disponível. Headers COOP/COEP necessários:', e);
            return false;
        }
    }

    /**
     * Inicializa o timer
     */
    async initialize() {
        if (!HighPrecisionTimer.isAvailable()) {
            throw new Error('High-precision timer requer SharedArrayBuffer e Web Workers');
        }

        if (!(await HighPrecisionTimer.checkSecurityHeaders())) {
            throw new Error('Headers de segurança COOP/COEP não configurados corretamente');
        }

        // Cria SharedArrayBuffer com 2 posições Int32:
        // [0]: contador do timer
        // [1]: flag de controle (0 = rodando, 1 = parar)
        this.sharedBuffer = new SharedArrayBuffer(8); // 2 * 4 bytes
        this.counter = new Int32Array(this.sharedBuffer);

        // Inicializa valores
        Atomics.store(this.counter, 0, 0); // contador = 0
        Atomics.store(this.counter, 1, 0); // flag = 0 (rodando)

        // Cria e inicializa o worker
        this.worker = new Worker('./timer-worker.js');

        // Aguarda o worker estar pronto
        return new Promise((resolve, reject) => {
            this.worker.onmessage = (e) => {
                if (e.data.status === 'running') {
                    this.isInitialized = true;
                    resolve();
                }
            };

            this.worker.onerror = (error) => {
                reject(error);
            };

            // Envia o SharedArrayBuffer para o worker
            this.worker.postMessage({
                cmd: 'start',
                sab: this.sharedBuffer
            });

            // Timeout de segurança
            setTimeout(() => {
                if (!this.isInitialized) {
                    reject(new Error('Timer worker initialization timeout'));
                }
            }, 5000);
        });
    }

    /**
     * Calibra o timer para obter a taxa de incrementos por segundo
     */
    async calibrate() {
        if (!this.isInitialized) {
            throw new Error('Timer não inicializado. Chame initialize() primeiro.');
        }

        // Para o timer atual
        await this.stop();

        // Cria novo buffer para calibração
        const calibrationBuffer = new SharedArrayBuffer(8);
        const calibrationCounter = new Int32Array(calibrationBuffer);

        // Cria worker temporário para calibração
        const calibrationWorker = new Worker('./timer-worker.js');

        return new Promise((resolve, reject) => {
            calibrationWorker.onmessage = (e) => {
                if (e.data.status === 'calibrated') {
                    this.calibrationRate = e.data.rate;
                    calibrationWorker.terminate();

                    // Reinicia o timer principal
                    this.initialize().then(() => {
                        resolve({
                            rate: e.data.rate,
                            increments: e.data.increments,
                            elapsed: e.data.elapsed
                        });
                    });
                }
            };

            calibrationWorker.postMessage({
                cmd: 'calibrate',
                sab: calibrationBuffer
            });

            setTimeout(() => {
                calibrationWorker.terminate();
                reject(new Error('Calibration timeout'));
            }, 5000);
        });
    }

    /**
     * Lê o valor atual do contador
     */
    now() {
        if (!this.isInitialized) {
            throw new Error('Timer não inicializado');
        }
        return Atomics.load(this.counter, 0);
    }

    /**
     * Mede o tempo de execução de uma função
     */
    async measure(fn, ...args) {
        if (!this.isInitialized) {
            throw new Error('Timer não inicializado');
        }

        const start = this.now();
        const result = await fn(...args);
        const end = this.now();

        return {
            result: result,
            time: end - start,
            timeMs: this.calibrationRate > 0 ? ((end - start) / this.calibrationRate) * 1000 : 0
        };
    }

    /**
     * Mede múltiplas execuções e retorna estatísticas
     */
    async measureMultiple(fn, iterations, ...args) {
        const measurements = [];

        for (let i = 0; i < iterations; i++) {
            const measurement = await this.measure(fn, ...args);
            measurements.push(measurement.time);
        }

        // Calcula estatísticas
        measurements.sort((a, b) => a - b);
        const median = measurements[Math.floor(measurements.length / 2)];
        const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const min = measurements[0];
        const max = measurements[measurements.length - 1];

        return {
            median: median,
            mean: mean,
            min: min,
            max: max,
            measurements: measurements
        };
    }

    /**
     * Para o timer
     */
    async stop() {
        if (this.worker && this.counter) {
            // Seta flag de parada
            Atomics.store(this.counter, 1, 1);

            // Aguarda confirmação
            await new Promise(resolve => setTimeout(resolve, 100));

            // Termina o worker
            this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }

    /**
     * Reinicia o timer zerando o contador
     */
    reset() {
        if (!this.isInitialized) {
            throw new Error('Timer não inicializado');
        }
        Atomics.store(this.counter, 0, 0);
    }
}

// Exporta a classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighPrecisionTimer;
}