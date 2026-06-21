/// <reference lib="webworker" />
import { pipeline, env } from '@huggingface/transformers';

// Configurar Transformers.js para optimizar ejecución en el navegador
env.allowLocalModels = false; 
env.useBrowserCache = true; // Activa caché automática en IndexedDB
// Aumentar los hilos de WASM para aprovechar procesadores multi-núcleo si WebGPU falla
env.backends.onnx.wasm.numThreads = 4; 

let synthesizer: any = null;

addEventListener('message', async ({ data }) => {
  const { type, text, voiceModel } = data;

  if (type === 'INIT') {
    try {
      if (!synthesizer) {
        // Si no se pasa modelo, usar piper por defecto
        const modelToLoad = voiceModel ? voiceModel : 'Xenova/piper-es_ES-sharvard-medium';
        postMessage({ type: 'STATUS', message: `Descargando/Cargando modelo ${modelToLoad} desde IndexedDB...` });
        
        // Forzamos WASM siempre para TTS. WebGPU en celulares a menudo genera NaNs (sonido 'lelelele')
        const deviceType = 'wasm';

        synthesizer = await pipeline('text-to-speech', modelToLoad, {
          progress_callback: (progress: any) => {
            postMessage({ type: 'PROGRESS', progress });
          },
          device: deviceType,
          quantized: false // Se mantiene unquantized debido al error SafeIntOnOverflow
        });
      }
      postMessage({ type: 'INIT_SUCCESS' });
    } catch (err) {
      postMessage({ type: 'INIT_ERROR', error: (err as Error).message });
    }
  }

  if (type === 'GENERATE') {
    try {
      const wordCount = text.trim().split(/\s+/).length;
      const startTime = performance.now();
      console.log(`[Piper Worker] ⏳ Iniciando generación para fragmento de ${wordCount} palabras (${text.length} caracteres). Texto: "${text.substring(0, 30)}..."`);
      
      postMessage({ type: 'STATUS', message: 'Generando audio...' });
      
      const result = await synthesizer(text);
      
      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`[Piper Worker] ✅ Audio generado en ${timeTaken}s para ${wordCount} palabras.`);
      // result contiene { audio: Float32Array, sampling_rate: 22050 }
      
      postMessage({
        type: 'AUDIO_READY',
        audio: result.audio,
        sampleRate: result.sampling_rate
      }); // No transferimos el buffer aquí si hay problemas, pero Float32Array se clona rápido
    } catch (err) {
      postMessage({ type: 'ERROR', error: (err as Error).message });
    }
  }
});
