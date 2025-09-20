/**
 * timer-worker.js
 *
 * Web Worker para implementação de timer de alta precisão
 * Baseado na Seção 4.3: Um Timer Robusto e de Alta Precisão
 *
 * Este worker executa em thread separada e incrementa continuamente
 * um contador atômico em SharedArrayBuffer, funcionando como um
 * relógio de alta frequência não afetado pelo throttling do browser.
 */

// Listener para mensagens da thread principal
self.onmessage = function(event) {
    if (event.data.cmd === 'start' && event.data.sab) {
        // Recebe o SharedArrayBuffer da thread principal
        const sharedBuffer = event.data.sab;
        const counter = new Int32Array(sharedBuffer);

        // Notifica a thread principal que o timer está pronto
        self.postMessage({ status: 'running' });

        // Loop infinito incrementando o contador atomicamente
        // Este loop roda em máxima velocidade na thread do worker
        while (true) {
            // Atomics.add retorna o valor anterior e adiciona 1
            Atomics.add(counter, 0, 1);

            // Opcional: verificar flag de parada (índice 1 do array)
            // Se o valor no índice 1 for diferente de 0, para o timer
            if (Atomics.load(counter, 1) !== 0) {
                break;
            }
        }

        // Notifica que o timer parou
        self.postMessage({ status: 'stopped' });
    }

    if (event.data.cmd === 'calibrate' && event.data.sab) {
        // Modo de calibração: mede quantos incrementos por segundo
        const sharedBuffer = event.data.sab;
        const counter = new Int32Array(sharedBuffer);

        const startTime = performance.now();
        const startCount = Atomics.load(counter, 0);

        // Roda por 100ms para calibração
        while (performance.now() - startTime < 100) {
            Atomics.add(counter, 0, 1);
        }

        const endCount = Atomics.load(counter, 0);
        const elapsed = performance.now() - startTime;
        const rate = (endCount - startCount) / (elapsed / 1000); // incrementos por segundo

        self.postMessage({
            status: 'calibrated',
            rate: rate,
            elapsed: elapsed,
            increments: endCount - startCount
        });
    }
};