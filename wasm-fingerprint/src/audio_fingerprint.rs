use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use web_sys::{OfflineAudioContext, AudioBuffer};
use sha2::{Sha256, Digest};

/// Função exportada para JavaScript - Audio Fingerprinting conforme o guia
#[wasm_bindgen]
pub async fn get_audio_fingerprint() -> Result<f32, JsValue> {
    AudioFingerprint::collect_simple().await
}

/// Função exportada para JavaScript - Audio Fingerprinting com hash SHA-256
#[wasm_bindgen]
pub async fn get_audio_fingerprint_hash() -> Result<String, JsValue> {
    AudioFingerprint::collect().await
}

pub struct AudioFingerprint;

impl AudioFingerprint {
    /// Implementação completa com hash SHA-256
    pub async fn collect() -> Result<String, JsValue> {
        // Configuração conforme o guia: 1 canal, 5000 amostras, 44100 Hz
        let context = OfflineAudioContext::new_with_number_of_channels_and_length_and_sample_rate(
            1, 5000, 44100.0
        )?;

        // Criar oscilador
        let oscillator = context.create_oscillator()?;

        // Configurar tipo triangular e frequência 10kHz
        oscillator.set_type(web_sys::OscillatorType::Triangle);
        oscillator.frequency().set_value(10000.0);

        // Criar compressor dinâmico com parâmetros específicos
        let compressor = context.create_dynamics_compressor()?;
        compressor.threshold().set_value(-50.0);
        compressor.knee().set_value(40.0);
        compressor.ratio().set_value(12.0);
        compressor.attack().set_value(0.0);
        compressor.release().set_value(0.25);

        // Conectar grafo de áudio
        // Note: OfflineAudioContext doesn't have destination() in web-sys
        // We connect directly to the compressor which is the final node
        oscillator.connect_with_audio_node(&compressor)?;

        // For OfflineAudioContext, the compressor is effectively our destination
        // No need to explicitly connect to destination

        // Iniciar e renderizar
        oscillator.start_with_when(0.0)?;
        let promise = context.start_rendering()?;
        let result = JsFuture::from(promise).await?;
        let buffer = result.dyn_into::<AudioBuffer>()?;

        // Processar buffer para criar fingerprint
        let channel_data = buffer.get_channel_data(0)?;

        // Calcular métricas detalhadas
        let sum: f32 = channel_data.iter().map(|x| x.abs()).sum();
        let avg = sum / channel_data.len() as f32;
        let max_val = channel_data.iter().fold(0.0f32, |acc, &x| acc.max(x.abs()));
        let min_val = channel_data.iter().fold(0.0f32, |acc, &x| acc.min(x.abs()));

        // Amostrar pontos específicos para maior entropia
        let samples: Vec<i32> = vec![100, 500, 1000, 2000, 3000, 4000]
            .iter()
            .filter_map(|&idx| {
                if idx < channel_data.len() {
                    Some((channel_data[idx] * 1000000.0) as i32)
                } else {
                    None
                }
            })
            .collect();

        // Análise de frequência simplificada
        let mut frequency_bins = vec![0.0f32; 10];
        for (i, &sample) in channel_data.iter().enumerate() {
            let bin_idx = (i * 10) / channel_data.len();
            if bin_idx < frequency_bins.len() {
                frequency_bins[bin_idx] += sample.abs();
            }
        }

        // Criar string detalhada para hash
        let fingerprint_data = format!(
            "sum:{:.6},avg:{:.6},max:{:.6},min:{:.6},samples:{:?},freq_bins:{:?},len:{}",
            sum, avg, max_val, min_val, samples, frequency_bins, channel_data.len()
        );

        // Gerar hash SHA-256
        let mut hasher = Sha256::new();
        hasher.update(fingerprint_data.as_bytes());
        let hash_result = hasher.finalize();

        Ok(format!("{:x}", hash_result))
    }

    /// Implementação simples que retorna apenas a soma (conforme guia original)
    pub async fn collect_simple() -> Result<f32, JsValue> {
        let context = OfflineAudioContext::new_with_number_of_channels_and_length_and_sample_rate(
            1, 5000, 44100.0
        )?;

        let oscillator = context.create_oscillator()?;
        oscillator.set_type(web_sys::OscillatorType::Triangle);
        oscillator.frequency().set_value(10000.0);

        let compressor = context.create_dynamics_compressor()?;
        compressor.threshold().set_value(-50.0);
        compressor.knee().set_value(40.0);
        compressor.ratio().set_value(12.0);
        compressor.attack().set_value(0.0);
        compressor.release().set_value(0.25);

        // Connect audio nodes (compressor is final node for OfflineAudioContext)
        oscillator.connect_with_audio_node(&compressor)?;

        oscillator.start_with_when(0.0)?;
        let promise = context.start_rendering()?;
        let result = JsFuture::from(promise).await?;
        let buffer = result.dyn_into::<AudioBuffer>()?;

        let channel_data = buffer.get_channel_data(0)?;
        let sum: f32 = channel_data.iter().map(|x| x.abs()).sum();

        Ok(sum)
    }


}