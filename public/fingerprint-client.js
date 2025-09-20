/**
 * fingerprint-client.js
 *
 * Cliente para coleta, serialização e transmissão de fingerprints
 * Implementa a Seção 5.1: Serialização e Transmissão de Dados
 */

class FingerprintClient {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.collectedData = {
            sessionId: this.sessionId,
            timestamp: null,
            proposalA: {},
            proposalB: {},
            browserAttributes: {},
            performanceMetrics: {}
        };
    }

    /**
     * Gera um identificador único de sessão
     */
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Coleta todos os dados de fingerprinting
     */
    async collectAllData(wasmModule) {
        console.log('Iniciando coleta completa de fingerprint...');

        // Timestamp de início
        this.collectedData.timestamp = new Date().toISOString();
        const startTime = performance.now();

        try {
            // Proposta A: APIs Tradicionais
            await this.collectProposalA(wasmModule);

            // Proposta B: Microbenchmarks
            await this.collectProposalB(wasmModule);

            // Atributos do navegador
            this.collectBrowserAttributes();

            // Métricas de performance
            const endTime = performance.now();
            this.collectedData.performanceMetrics = {
                collectionTime: endTime - startTime,
                timestamp: Date.now()
            };

            console.log('Coleta concluída:', this.collectedData);
            return this.collectedData;

        } catch (error) {
            console.error('Erro durante coleta:', error);
            throw error;
        }
    }

    /**
     * Coleta dados da Proposta A (APIs tradicionais)
     */
    async collectProposalA(wasmModule) {
        console.log('Coletando Proposta A...');

        // Canvas fingerprint
        try {
            const canvasHash = await wasmModule.get_canvas_fingerprint();
            this.collectedData.proposalA.canvas = canvasHash;
        } catch (error) {
            console.error('Erro em canvas fingerprint:', error);
            this.collectedData.proposalA.canvas = null;
        }

        // WebGL fingerprint
        try {
            const webglData = await wasmModule.get_webgl_fingerprint();
            this.collectedData.proposalA.webgl = webglData;
        } catch (error) {
            console.error('Erro em WebGL fingerprint:', error);
            this.collectedData.proposalA.webgl = null;
        }

        // Audio fingerprint
        try {
            const audioHash = await wasmModule.get_audio_fingerprint_hash();
            const audioValue = await wasmModule.get_audio_fingerprint();
            this.collectedData.proposalA.audio = {
                hash: audioHash,
                value: audioValue
            };
        } catch (error) {
            console.error('Erro em audio fingerprint:', error);
            this.collectedData.proposalA.audio = null;
        }
    }

    /**
     * Coleta dados da Proposta B (microbenchmarks)
     */
    async collectProposalB(wasmModule) {
        console.log('Coletando Proposta B...');

        // Port contention fingerprint
        try {
            if (wasmModule.get_port_contention_fingerprint) {
                const contentionHash = await wasmModule.get_port_contention_fingerprint();
                this.collectedData.proposalB.portContention = contentionHash;
            }
        } catch (error) {
            console.error('Erro em port contention:', error);
        }

        // WASM benchmarks detalhados
        try {
            if (wasmModule.get_wasm_benchmark_results) {
                const benchmarkResults = await wasmModule.get_wasm_benchmark_results();
                const parsedResults = JSON.parse(benchmarkResults);

                // Extrai distinguidores
                this.collectedData.proposalB.distinguishers = parsedResults.map(result => ({
                    pair: result.instruction_pair.split('_'),
                    ratio: parseFloat(result.ratio.toFixed(2)),
                    category: result.category
                }));
            }
        } catch (error) {
            console.error('Erro em WASM benchmarks:', error);
        }

        // Hardware benchmarks
        try {
            const collector = new wasmModule.FingerprintCollector();
            const fullFingerprint = await collector.collect_fingerprint();
            const parsed = JSON.parse(fullFingerprint);

            if (parsed.hardware_profile) {
                this.collectedData.proposalB.hardwareProfile = {
                    cpuBenchmark: parsed.hardware_profile.cpu_benchmark,
                    memoryBenchmark: parsed.hardware_profile.memory_benchmark,
                    cryptoBenchmark: parsed.hardware_profile.crypto_benchmark,
                    instructionTiming: parsed.hardware_profile.instruction_timing
                };
            }
        } catch (error) {
            console.error('Erro em hardware benchmarks:', error);
        }
    }

    /**
     * Coleta atributos do navegador
     */
    collectBrowserAttributes() {
        this.collectedData.browserAttributes = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            timezoneOffset: new Date().getTimezoneOffset(),
            doNotTrack: navigator.doNotTrack,
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine,
            plugins: this.getPluginsList(),
            mimeTypes: this.getMimeTypesList()
        };
    }

    /**
     * Obtém lista de plugins
     */
    getPluginsList() {
        const plugins = [];
        for (let i = 0; i < navigator.plugins.length && i < 10; i++) {
            plugins.push({
                name: navigator.plugins[i].name,
                filename: navigator.plugins[i].filename
            });
        }
        return plugins;
    }

    /**
     * Obtém lista de MIME types
     */
    getMimeTypesList() {
        const mimeTypes = [];
        for (let i = 0; i < navigator.mimeTypes.length && i < 10; i++) {
            mimeTypes.push(navigator.mimeTypes[i].type);
        }
        return mimeTypes;
    }

    /**
     * Envia fingerprint para o servidor
     */
    async submitFingerprint(fingerprintData = null) {
        const dataToSubmit = fingerprintData || this.collectedData;

        // Valida dados antes de enviar
        if (!dataToSubmit || !dataToSubmit.sessionId) {
            throw new Error('Dados de fingerprint inválidos');
        }

        try {
            console.log('Enviando fingerprint para servidor...');

            const response = await fetch('/api/fingerprint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSubmit),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Fingerprint enviado com sucesso:', result);

            // Exibe resultado para o usuário
            this.displayResult(result);

            return result;

        } catch (error) {
            console.error('Erro ao enviar fingerprint:', error);
            this.displayError(error);
            throw error;
        }
    }

    /**
     * Exibe resultado para o usuário
     */
    displayResult(result) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <h3>✓ Fingerprint Enviado com Sucesso</h3>
                    <p>Session ID: ${result.sessionId || this.sessionId}</p>
                    <p>Fingerprint ID: ${result.fingerprintId || 'N/A'}</p>
                    <p>É usuário recorrente: ${result.isReturningUser ? 'Sim' : 'Não'}</p>
                    <p>Sessões com este fingerprint: ${result.sessionsCount || 1}</p>
                </div>
            `;
        }
    }

    /**
     * Exibe erro para o usuário
     */
    displayError(error) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="error-message">
                    <h3>✗ Erro ao Enviar Fingerprint</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Método de conveniência para coletar e enviar
     */
    async collectAndSubmit(wasmModule) {
        try {
            const data = await this.collectAllData(wasmModule);
            const result = await this.submitFingerprint(data);
            return result;
        } catch (error) {
            console.error('Erro em collectAndSubmit:', error);
            throw error;
        }
    }

    /**
     * Exporta dados coletados como JSON
     */
    exportAsJSON() {
        const dataStr = JSON.stringify(this.collectedData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `fingerprint-${this.sessionId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FingerprintClient;
}