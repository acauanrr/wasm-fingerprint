use wasm_bindgen::prelude::*;
use crate::utils::performance_now;
use crate::HardwareProfile;

pub struct HardwareBenchmarks;

impl HardwareBenchmarks {
    pub fn new() -> Self {
        HardwareBenchmarks
    }

    pub fn run_all_benchmarks(&self) -> Result<HardwareProfile, JsValue> {
        Ok(HardwareProfile {
            cpu_benchmark: self.cpu_intensive_benchmark()?,
            memory_benchmark: self.memory_access_benchmark()?,
            crypto_benchmark: self.crypto_operations_benchmark()?,
            instruction_timing: self.instruction_timing_profile()?,
            port_contention_hash: String::new(), // Will be filled by PortContentionFingerprint
        })
    }

    fn cpu_intensive_benchmark(&self) -> Result<f64, JsValue> {
        let iterations = 1_000_000;
        let start = performance_now();

        // CPU-intensive operations
        let mut result = 1.0f64;
        for i in 0..iterations {
            result = result * 1.000001 + (i as f64).sin();
            result = result.sqrt() * 2.0 - 1.0;
            if i % 1000 == 0 {
                result = result.abs();
            }
        }

        let end = performance_now();
        let duration = end - start;

        // Prevent optimization
        if result.is_nan() {
            return Err(JsValue::from_str("Benchmark failed"));
        }

        Ok(duration)
    }

    fn memory_access_benchmark(&self) -> Result<f64, JsValue> {
        let size = 1024 * 1024; // 1MB
        let mut data = vec![0u32; size];

        // Initialize with pattern
        for i in 0..size {
            data[i] = (i * 31) as u32;
        }

        let start = performance_now();

        // Random memory access pattern
        let mut sum = 0u64;
        let mut index = 0usize;

        for _ in 0..100_000 {
            index = ((index * 1103515245 + 12345) % size as usize) as usize;
            sum += data[index] as u64;
            data[index] = (sum & 0xFFFFFFFF) as u32;

            // Stride access
            let stride_index = (index + 64) % size;
            sum += data[stride_index] as u64;
        }

        let end = performance_now();

        // Prevent optimization
        if sum == 0 {
            return Err(JsValue::from_str("Benchmark optimized away"));
        }

        Ok(end - start)
    }

    fn crypto_operations_benchmark(&self) -> Result<f64, JsValue> {
        let iterations = 10_000;
        let start = performance_now();

        let mut hash = 0x811c9dc5u32; // FNV-1a init

        for i in 0..iterations {
            // Simple hash function (FNV-1a variant)
            let bytes = (i as u32).to_le_bytes();
            for byte in bytes.iter() {
                hash ^= *byte as u32;
                hash = hash.wrapping_mul(0x01000193);
            }

            // Additional mixing
            hash ^= hash >> 16;
            hash = hash.wrapping_mul(0x85ebca6b);
            hash ^= hash >> 13;
            hash = hash.wrapping_mul(0xc2b2ae35);
            hash ^= hash >> 16;
        }

        let end = performance_now();

        // Prevent optimization
        if hash == 0 {
            return Err(JsValue::from_str("Hash computation failed"));
        }

        Ok(end - start)
    }

    fn instruction_timing_profile(&self) -> Result<Vec<f64>, JsValue> {
        let mut timings = Vec::new();

        // Test 1: Integer arithmetic
        let timing = self.measure_instruction_sequence(|| {
            let mut acc = 1i32;
            for i in 1..1000 {
                acc = acc.wrapping_mul(i);
                acc = acc.wrapping_add(i * 2);
                acc = acc.wrapping_sub(i / 2);
                acc = acc ^ (i << 3);
            }
            acc
        })?;
        timings.push(timing);

        // Test 2: Floating point operations
        let timing = self.measure_instruction_sequence(|| {
            let mut acc = 1.0f64;
            for i in 1..1000 {
                let f = i as f64;
                acc = acc * 1.0001 + f.sin();
                acc = (acc * f).sqrt();
                acc = acc.ln() + f.cos();
            }
            acc as i32
        })?;
        timings.push(timing);

        // Test 3: Branch prediction stress
        let timing = self.measure_instruction_sequence(|| {
            let mut acc = 0i32;
            let mut pattern = 0b10110010u8;
            for i in 0..1000 {
                pattern = pattern.rotate_left(1);
                if pattern & 1 == 1 {
                    acc += i;
                } else {
                    acc -= i / 2;
                }
                if pattern & 2 == 2 {
                    acc *= 2;
                }
                if pattern & 4 == 4 {
                    acc = acc.wrapping_add(pattern as i32);
                }
            }
            acc
        })?;
        timings.push(timing);

        // Test 4: Memory fence operations (simulated)
        let timing = self.measure_instruction_sequence(|| {
            let mut data = vec![0i32; 256];
            let mut sum = 0i32;
            for i in 0..256 {
                data[i] = i as i32;
                // Simulate memory barrier with volatile-like access
                sum += data[i];
                data[(i + 128) % 256] = sum;
            }
            sum
        })?;
        timings.push(timing);

        // Test 5: Division and modulo (typically slower)
        let timing = self.measure_instruction_sequence(|| {
            let mut acc = 1000000i32;
            for i in 1..500 {
                acc = acc / i;
                acc = acc * i + (acc % i);
                acc = acc.wrapping_add(1000000 / i);
            }
            acc
        })?;
        timings.push(timing);

        Ok(timings)
    }

    fn measure_instruction_sequence<F>(&self, f: F) -> Result<f64, JsValue>
    where
        F: Fn() -> i32,
    {
        // Warm up
        for _ in 0..10 {
            let _ = f();
        }

        // Actual measurement
        let iterations = 100;
        let start = performance_now();

        let mut prevent_opt = 0i32;
        for _ in 0..iterations {
            prevent_opt ^= f();
        }

        let end = performance_now();

        // Prevent optimization
        if prevent_opt == i32::MAX {
            return Err(JsValue::from_str("Sequence optimized away"));
        }

        Ok((end - start) / iterations as f64)
    }
}