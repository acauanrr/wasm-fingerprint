use wasm_bindgen::prelude::*;
use web_sys::window;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

mod canvas_fingerprint;
mod webgl_fingerprint;
mod audio_fingerprint;
mod hardware_benchmarks;
mod port_contention;
mod wasm_port_benchmark;
mod utils;
mod dom_utils;

use crate::canvas_fingerprint::CanvasFingerprint;
use crate::webgl_fingerprint::WebGLFingerprint;
use crate::audio_fingerprint::AudioFingerprint;
use crate::hardware_benchmarks::HardwareBenchmarks;
use crate::port_contention::PortContentionFingerprint;
use crate::dom_utils::get_window;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Funções auxiliares movidas para dom_utils.rs

#[derive(Serialize, Deserialize, Debug)]
pub struct FingerprintData {
    pub fingerprint_hash: String,
    pub canvas_fingerprint: CanvasFingerprintData,
    pub webgl_fingerprint: WebGLFingerprintData,
    pub audio_fingerprint: AudioFingerprintData,
    pub hardware_profile: HardwareProfile,
    pub browser_info: BrowserAttributes,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CanvasFingerprintData {
    pub hash: String,
    pub data_url: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WebGLFingerprintData {
    pub hash: String,
    pub vendor: String,
    pub renderer: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AudioFingerprintData {
    pub hash: String,
    pub sample_rate: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HardwareProfile {
    pub cores: i32,
    pub memory: f64,
    pub concurrency: i32,
    pub benchmarks: Option<BenchmarkResults>,
    pub cpu_benchmark: f64,
    pub memory_benchmark: f64,
    pub crypto_benchmark: f64,
    pub instruction_timing: Vec<f64>,
    pub port_contention_hash: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BenchmarkResults {
    pub math_ops: f64,
    pub string_ops: f64,
    pub array_ops: f64,
    pub crypto_ops: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BrowserAttributes {
    pub user_agent: String,
    pub language: String,
    pub platform: String,
    pub hardware_concurrency: i32,
    pub device_memory: Option<f64>,
    pub screen_width: i32,
    pub screen_height: i32,
    pub screen_resolution: String,
    pub color_depth: i32,
    pub timezone_offset: i32,
    pub plugins_count: u32,
}

#[wasm_bindgen]
pub struct FingerprintCollector {
    data: FingerprintData,
}

#[wasm_bindgen]
impl FingerprintCollector {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<FingerprintCollector, JsValue> {
        utils::set_panic_hook();

        let window = get_window()?;
        let navigator = window.navigator();
        let screen = window.screen().map_err(|_| JsValue::from_str("No screen object"))?;

        let screen_width = screen.width().unwrap_or(1920);
        let screen_height = screen.height().unwrap_or(1080);
        let color_depth = screen.color_depth().unwrap_or(24);

        let browser_attrs = BrowserAttributes {
            user_agent: navigator.user_agent().unwrap_or("Unknown".to_string()),
            language: navigator.language().unwrap_or("en-US".to_string()),
            platform: navigator.platform().unwrap_or("Unknown".to_string()),
            hardware_concurrency: navigator.hardware_concurrency() as i32,
            device_memory: Some(8.0), // Default value, will try to get real value
            screen_width,
            screen_height,
            screen_resolution: format!("{}x{}", screen_width, screen_height),
            color_depth,
            timezone_offset: js_sys::Date::new_0().get_timezone_offset() as i32,
            plugins_count: 0, // plugins() not available in current web-sys
        };

        Ok(FingerprintCollector {
            data: FingerprintData {
                fingerprint_hash: String::new(),
                canvas_fingerprint: CanvasFingerprintData {
                    hash: String::new(),
                    data_url: String::new(),
                },
                webgl_fingerprint: WebGLFingerprintData {
                    hash: String::new(),
                    vendor: String::new(),
                    renderer: String::new(),
                },
                audio_fingerprint: AudioFingerprintData {
                    hash: String::new(),
                    sample_rate: 44100,
                },
                hardware_profile: HardwareProfile {
                    cores: navigator.hardware_concurrency() as i32,
                    memory: 8.0, // Default value
                    concurrency: navigator.hardware_concurrency() as i32,
                    benchmarks: None,
                    cpu_benchmark: 0.0,
                    memory_benchmark: 0.0,
                    crypto_benchmark: 0.0,
                    instruction_timing: Vec::new(),
                    port_contention_hash: String::new(),
                },
                browser_info: browser_attrs,
                timestamp: js_sys::Date::now(),
            }
        })
    }

    #[wasm_bindgen]
    pub fn run_hardware_benchmarks(&mut self) -> Result<String, JsValue> {
        console_log!("Running hardware benchmarks only...");
        let hw_benchmarks = HardwareBenchmarks::new();
        self.data.hardware_profile = hw_benchmarks.run_all_benchmarks()?;

        // Return just the hardware profile as JSON
        serde_json::to_string(&self.data.hardware_profile)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn collect_fingerprint(&mut self) -> Result<String, JsValue> {
        console_log!("Starting fingerprint collection...");

        // Proposta A: Collect traditional API-based fingerprints
        console_log!("Collecting Canvas fingerprint...");
        let canvas_fp = CanvasFingerprint::collect()?;
        self.data.canvas_fingerprint.hash = self.hash_data(&canvas_fp);
        self.data.canvas_fingerprint.data_url = canvas_fp;

        console_log!("Collecting WebGL fingerprint...");
        let webgl_fp = WebGLFingerprint::collect()?;
        let webgl_parts: Vec<&str> = webgl_fp.split('|').collect();
        self.data.webgl_fingerprint.hash = self.hash_data(&webgl_fp);
        self.data.webgl_fingerprint.vendor = webgl_parts.get(0).unwrap_or(&"Unknown").to_string();
        self.data.webgl_fingerprint.renderer = webgl_parts.get(1).unwrap_or(&"Unknown").to_string();

        console_log!("Collecting Audio fingerprint...");
        let audio_fp = AudioFingerprint::collect().await?;
        self.data.audio_fingerprint.hash = self.hash_data(&audio_fp);
        // Default sample rate (will be extracted in audio_fingerprint module)
        self.data.audio_fingerprint.sample_rate = 44100;

        // Proposta B: Hardware microbenchmarks
        console_log!("Running hardware benchmarks...");
        let hw_benchmarks = HardwareBenchmarks::new();
        let hw_profile = hw_benchmarks.run_all_benchmarks()?;

        // Update hardware profile with benchmark results
        self.data.hardware_profile.cpu_benchmark = hw_profile.cpu_benchmark;
        self.data.hardware_profile.memory_benchmark = hw_profile.memory_benchmark;
        self.data.hardware_profile.crypto_benchmark = hw_profile.crypto_benchmark;
        self.data.hardware_profile.instruction_timing = hw_profile.instruction_timing;

        // Set benchmark results
        self.data.hardware_profile.benchmarks = Some(BenchmarkResults {
            math_ops: hw_profile.cpu_benchmark,
            string_ops: hw_profile.memory_benchmark,
            array_ops: hw_profile.crypto_benchmark,
            crypto_ops: hw_profile.cpu_benchmark * 1.2, // Simulated
        });

        // Proposta B Avançada: Port Contention fingerprinting
        console_log!("Collecting Port Contention fingerprint...");
        let port_contention_fp = PortContentionFingerprint::collect()?;
        self.data.hardware_profile.port_contention_hash = port_contention_fp;

        // Generate final composite hash
        let composite = format!(
            "{}:{}:{}:{:?}",
            self.data.canvas_fingerprint.hash,
            self.data.webgl_fingerprint.hash,
            self.data.audio_fingerprint.hash,
            self.data.hardware_profile
        );
        self.data.fingerprint_hash = self.hash_data(&composite);

        // Serialize the complete fingerprint
        let json = serde_json::to_string(&self.data)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;

        console_log!("Fingerprint collection complete");
        Ok(json)
    }

    #[wasm_bindgen]
    pub fn get_composite_hash(&self) -> String {
        let composite = format!(
            "{}:{}:{}:{:?}",
            self.data.canvas_fingerprint.hash,
            self.data.webgl_fingerprint.hash,
            self.data.audio_fingerprint.hash,
            self.data.hardware_profile
        );
        self.hash_data(&composite)
    }

    fn hash_data(&self, data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    #[wasm_bindgen]
    pub async fn send_to_server(&self, endpoint: &str) -> Result<(), JsValue> {
        let window = window().ok_or("No window object")?;

        let json = serde_json::to_string(&self.data)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;

        let opts = web_sys::RequestInit::new();
        opts.set_method("POST");
        opts.set_body(&JsValue::from_str(&json));

        let headers = web_sys::Headers::new()?;
        headers.set("Content-Type", "application/json")?;
        opts.set_headers(&headers);

        let request = web_sys::Request::new_with_str_and_init(endpoint, &opts)?;

        let resp_value = wasm_bindgen_futures::JsFuture::from(
            window.fetch_with_request(&request)
        ).await?;

        let resp: web_sys::Response = resp_value.dyn_into()?;

        if resp.ok() {
            console_log!("Fingerprint sent successfully");
            Ok(())
        } else {
            Err(JsValue::from_str(&format!("Server error: {}", resp.status())))
        }
    }
}

// Função de exemplo exportada para JavaScript demonstrando acesso ao window
#[wasm_bindgen]
pub fn log_window_details() {
    if let Ok(window) = get_window() {
        let width = window.inner_width().unwrap_or(JsValue::from(-1));
        let height = window.inner_height().unwrap_or(JsValue::from(-1));

        web_sys::console::log_1(&format!("Largura da janela: {:?}", width).into());
        web_sys::console::log_1(&format!("Altura da janela: {:?}", height).into());

        // Informações adicionais do navegador
        if let Ok(navigator) = window.navigator().user_agent() {
            web_sys::console::log_1(&format!("User Agent: {}", navigator).into());
        }
    }
}

// Funções exportadas para obter fingerprints diretamente
pub use crate::canvas_fingerprint::get_canvas_fingerprint;
pub use crate::webgl_fingerprint::get_webgl_fingerprint;

// Funções exportadas para obter fingerprint de Audio diretamente
pub use crate::audio_fingerprint::{get_audio_fingerprint, get_audio_fingerprint_hash};

// Funções exportadas para obter fingerprint de Port Contention
pub use crate::port_contention::{get_port_contention_fingerprint, get_port_contention_detailed};

// Funções exportadas para benchmarks Wasm específicos
pub use crate::wasm_port_benchmark::{
    grouped_execution_popcnt_or,
    interleaved_execution_popcnt_or,
    grouped_execution_clz_and,
    interleaved_execution_clz_and,
    grouped_execution_ctz_xor,
    interleaved_execution_ctz_xor,
    grouped_execution_rotl_shl,
    interleaved_execution_rotl_shl,
    grouped_execution_mul_add,
    interleaved_execution_mul_add,
    measure_wasm_port_contention,
    run_all_wasm_benchmarks,
    generate_wasm_fingerprint,
};
