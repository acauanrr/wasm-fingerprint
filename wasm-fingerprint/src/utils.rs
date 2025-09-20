pub fn set_panic_hook() {
    // Panic hook can be enabled by adding console_error_panic_hook to Cargo.toml features
    // For now, using a no-op to avoid warnings
}

pub fn performance_now() -> f64 {
    web_sys::window()
        .expect("no global window")
        .performance()
        .expect("no performance object")
        .now()
}