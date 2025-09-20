#!/usr/bin/env node

/**
 * entropy-analyzer.js
 *
 * Implementação alternativa em Node.js da Seção 5.3
 * Análise de entropia de Shannon para fingerprints coletados
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class EntropyAnalyzer {
    constructor(logPath = './data/fingerprints.log') {
        this.logPath = logPath;
        this.fingerprints = [];
        this.statistics = {
            totalEntries: 0,
            uniqueFingerprints: new Set(),
            uniqueSessions: new Set(),
            componentFrequencies: {
                canvas: new Map(),
                webgl: new Map(),
                audio: new Map(),
                portContention: new Map()
            },
            timestamps: []
        };
    }

    /**
     * Carrega e parseia o arquivo de log
     */
    async loadFingerprints() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.logPath)) {
                reject(new Error(`Arquivo não encontrado: ${this.logPath}`));
                return;
            }

            const rl = readline.createInterface({
                input: fs.createReadStream(this.logPath),
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                if (line.trim()) {
                    try {
                        const entry = JSON.parse(line);
                        this.fingerprints.push(entry);
                        this.updateStatistics(entry);
                    } catch (error) {
                        console.warn('Erro ao parsear linha:', error.message);
                    }
                }
            });

            rl.on('close', () => {
                resolve(this.fingerprints.length);
            });

            rl.on('error', reject);
        });
    }

    /**
     * Atualiza estatísticas incrementalmente
     */
    updateStatistics(entry) {
        this.statistics.totalEntries++;
        this.statistics.uniqueFingerprints.add(entry.id);
        this.statistics.uniqueSessions.add(entry.sessionId);
        this.statistics.timestamps.push(entry.serverTimestamp);

        // Componentes da Proposta A
        if (entry.data?.proposalA) {
            const { canvas, webgl, audio } = entry.data.proposalA;
            if (canvas) this.incrementFrequency('canvas', canvas);
            if (webgl) this.incrementFrequency('webgl', webgl);
            if (audio?.hash) this.incrementFrequency('audio', audio.hash);
        }

        // Componentes da Proposta B
        if (entry.data?.proposalB?.portContention) {
            this.incrementFrequency('portContention', entry.data.proposalB.portContention);
        }
    }

    /**
     * Incrementa frequência de um componente
     */
    incrementFrequency(component, value) {
        const freq = this.statistics.componentFrequencies[component];
        freq.set(value, (freq.get(value) || 0) + 1);
    }

    /**
     * Calcula entropia de Shannon
     * H(X) = -Σ p(xi) * log2(p(xi))
     */
    calculateShannonEntropy(frequencies, total) {
        if (total === 0) return 0;

        let entropy = 0;
        for (const count of frequencies.values()) {
            const probability = count / total;
            if (probability > 0) {
                entropy -= probability * Math.log2(probability);
            }
        }
        return entropy;
    }

    /**
     * Calcula entropia dos fingerprints completos
     */
    calculateFingerprintEntropy() {
        const frequencies = new Map();
        for (const fp of this.fingerprints) {
            frequencies.set(fp.id, (frequencies.get(fp.id) || 0) + 1);
        }
        return this.calculateShannonEntropy(frequencies, this.statistics.totalEntries);
    }

    /**
     * Analisa e gera relatório
     */
    analyze() {
        const fingerprintEntropy = this.calculateFingerprintEntropy();
        const maxPossibleEntropy = Math.log2(this.statistics.totalEntries);

        // Calcula entropia por componente
        const componentEntropies = {};
        for (const [component, frequencies] of Object.entries(this.statistics.componentFrequencies)) {
            const nonZeroCount = Array.from(frequencies.values())
                .filter(count => count > 0).length;
            if (nonZeroCount > 0) {
                componentEntropies[component] = this.calculateShannonEntropy(
                    frequencies,
                    this.statistics.totalEntries
                );
            }
        }

        const results = {
            summary: {
                totalEntries: this.statistics.totalEntries,
                uniqueFingerprints: this.statistics.uniqueFingerprints.size,
                uniqueSessions: this.statistics.uniqueSessions.size,
                uniquenessRate: this.statistics.uniqueFingerprints.size / this.statistics.totalEntries,
            },
            entropy: {
                shannonEntropy: fingerprintEntropy,
                normalizedEntropy: fingerprintEntropy / maxPossibleEntropy,
                maxPossibleEntropy: maxPossibleEntropy,
                distinguishableUsers: Math.pow(2, fingerprintEntropy),
                bitsOfEntropy: fingerprintEntropy
            },
            componentEntropies,
            temporal: this.analyzeTemporalDistribution(),
            interpretation: this.interpretResults(fingerprintEntropy)
        };

        return results;
    }

    /**
     * Analisa distribuição temporal
     */
    analyzeTemporalDistribution() {
        const hourlyBuckets = new Map();

        for (const timestamp of this.statistics.timestamps) {
            const hour = timestamp.substring(0, 13); // YYYY-MM-DDTHH
            hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
        }

        const distribution = Array.from(hourlyBuckets.entries())
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        return {
            hourlyDistribution: distribution,
            peakHour: distribution.reduce((max, curr) =>
                curr.count > max.count ? curr : max, distribution[0]),
            averagePerHour: this.statistics.totalEntries / distribution.length
        };
    }

    /**
     * Interpreta os resultados
     */
    interpretResults(entropy) {
        const interpretations = [];

        // Interpretação da entropia
        if (entropy < 10) {
            interpretations.push({
                level: 'LOW',
                message: 'Entropia baixa: Sistema tem capacidade limitada de distinguir usuários.',
                recommendation: 'Adicione mais vetores de fingerprinting para melhorar a unicidade.'
            });
        } else if (entropy < 20) {
            interpretations.push({
                level: 'MODERATE',
                message: 'Entropia moderada: Sistema pode distinguir milhares de usuários.',
                recommendation: 'Adequado para aplicações de médio porte.'
            });
        } else {
            interpretations.push({
                level: 'HIGH',
                message: 'Entropia alta: Sistema pode distinguir milhões de usuários.',
                recommendation: 'Excelente capacidade de identificação única.'
            });
        }

        // Taxa de unicidade
        const uniquenessRate = this.statistics.uniqueFingerprints.size / this.statistics.totalEntries;
        if (uniquenessRate < 0.5) {
            interpretations.push({
                level: 'WARNING',
                message: `Taxa de unicidade baixa (${(uniquenessRate * 100).toFixed(1)}%)`,
                recommendation: 'Muitas colisões detectadas. Revise a implementação.'
            });
        } else if (uniquenessRate > 0.9) {
            interpretations.push({
                level: 'EXCELLENT',
                message: `Taxa de unicidade excelente (${(uniquenessRate * 100).toFixed(1)}%)`,
                recommendation: 'Sistema está funcionando muito bem.'
            });
        }

        return interpretations;
    }

    /**
     * Imprime relatório formatado
     */
    printReport(results) {
        console.log('\n' + '='.repeat(70));
        console.log('📊 ANÁLISE DE ENTROPIA DE FINGERPRINTS');
        console.log('='.repeat(70));

        console.log('\n📈 ESTATÍSTICAS BÁSICAS');
        console.log('─'.repeat(40));
        console.log(`  Total de entradas: ${results.summary.totalEntries}`);
        console.log(`  Fingerprints únicos: ${results.summary.uniqueFingerprints}`);
        console.log(`  Sessões únicas: ${results.summary.uniqueSessions}`);
        console.log(`  Taxa de unicidade: ${(results.summary.uniquenessRate * 100).toFixed(2)}%`);

        console.log('\n🔬 ANÁLISE DE ENTROPIA');
        console.log('─'.repeat(40));
        console.log(`  Entropia de Shannon: ${results.entropy.shannonEntropy.toFixed(4)} bits`);
        console.log(`  Entropia normalizada: ${results.entropy.normalizedEntropy.toFixed(4)}`);
        console.log(`  Entropia máxima possível: ${results.entropy.maxPossibleEntropy.toFixed(4)} bits`);
        console.log(`  Usuários distinguíveis: 2^${results.entropy.bitsOfEntropy.toFixed(1)} ≈ ${Math.floor(results.entropy.distinguishableUsers).toLocaleString()}`);

        if (Object.keys(results.componentEntropies).length > 0) {
            console.log('\n🧩 ENTROPIA POR COMPONENTE');
            console.log('─'.repeat(40));
            for (const [component, entropy] of Object.entries(results.componentEntropies)) {
                console.log(`  ${component}: ${entropy.toFixed(4)} bits`);
            }
        }

        console.log('\n⏰ DISTRIBUIÇÃO TEMPORAL');
        console.log('─'.repeat(40));
        if (results.temporal.peakHour) {
            console.log(`  Horário de pico: ${results.temporal.peakHour.hour} (${results.temporal.peakHour.count} entradas)`);
        }
        console.log(`  Média por hora: ${results.temporal.averagePerHour.toFixed(1)} entradas`);

        console.log('\n💡 INTERPRETAÇÃO');
        console.log('─'.repeat(40));
        for (const interp of results.interpretation) {
            const icon = interp.level === 'HIGH' || interp.level === 'EXCELLENT' ? '✅' :
                         interp.level === 'MODERATE' ? '✓' : '⚠️';
            console.log(`  ${icon} ${interp.message}`);
            if (interp.recommendation) {
                console.log(`     → ${interp.recommendation}`);
            }
        }

        console.log('\n' + '='.repeat(70));
    }

    /**
     * Salva relatório em arquivo JSON
     */
    saveReport(results, outputPath = null) {
        const reportPath = outputPath || this.logPath.replace('.log', '_analysis.json');
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 Relatório salvo em: ${reportPath}`);
    }
}

// Função principal
async function main() {
    const args = process.argv.slice(2);
    const logPath = args[0] || './data/fingerprints.log';
    const outputPath = args[1] || null;

    console.log(`\n🔍 Analisando arquivo: ${logPath}`);

    const analyzer = new EntropyAnalyzer(logPath);

    try {
        const count = await analyzer.loadFingerprints();
        console.log(`✅ ${count} fingerprints carregados`);

        const results = analyzer.analyze();
        analyzer.printReport(results);
        analyzer.saveReport(results, outputPath);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

// Exportar para uso como módulo
module.exports = EntropyAnalyzer;