use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{
    CanvasRenderingContext2d, HtmlCanvasElement,
};
use sha2::{Sha256, Digest};
use crate::dom_utils::get_document;

/// Função exportada para JavaScript - Canvas Fingerprinting
#[wasm_bindgen]
pub fn get_canvas_fingerprint() -> Result<String, JsValue> {
    CanvasFingerprint::collect()
}

pub struct CanvasFingerprint;

impl CanvasFingerprint {
    pub fn collect() -> Result<String, JsValue> {
        let document = get_document()?;

        // Create hidden canvas
        let canvas = document.create_element("canvas")?
            .dyn_into::<HtmlCanvasElement>()?;

        canvas.set_width(280);
        canvas.set_height(60);
        // Note: style() method not available, need to use different approach
        // canvas.style().set_property("display", "none")?;

        let ctx = canvas
            .get_context("2d")?
            .ok_or("Failed to get 2d context")?
            .dyn_into::<CanvasRenderingContext2d>()?;

        // Draw complex scene for fingerprinting
        Self::draw_fingerprint_scene(&ctx)?;

        // Get canvas data
        let data_url = canvas.to_data_url()?;

        // Calculate SHA-256 hash of the data URL
        let mut hasher = Sha256::new();
        hasher.update(data_url.as_bytes());
        let hash_result = hasher.finalize();

        Ok(format!("{:x}", hash_result))
    }

    fn draw_fingerprint_scene(ctx: &CanvasRenderingContext2d) -> Result<(), JsValue> {
        // Text with special unicode characters
        ctx.set_text_baseline("alphabetic");
        ctx.set_fill_style_str("#f60");
        ctx.fill_rect(125.0, 1.0, 62.0, 20.0);

        ctx.set_fill_style_str("#069");
        ctx.set_font("11pt Arial");
        ctx.fill_text("Cwm fjordbank glyphs vext quiz, 😃", 2.0, 15.0)?;

        // Complex gradient - create_linear_gradient not available in current web-sys
        ctx.set_fill_style_str("rgba(100, 150, 200, 0.5)");
        ctx.fill_rect(0.0, 20.0, 280.0, 20.0);

        // Bezier curves
        ctx.set_stroke_style_str("rgb(120, 186, 176)");
        ctx.begin_path();
        ctx.move_to(20.0, 40.0);
        ctx.bezier_curve_to(20.0, 50.0, 200.0, 50.0, 200.0, 40.0);
        ctx.stroke();

        // Arc with transparency
        ctx.set_global_composite_operation("multiply")?;
        ctx.set_fill_style_str("rgba(255, 125, 0, 0.5)");
        ctx.begin_path();
        ctx.arc(50.0, 50.0, 20.0, 0.0, std::f64::consts::PI * 2.0)?;
        ctx.fill();

        // Pattern
        ctx.set_global_composite_operation("source-over")?;

        // Draw text with various fonts
        let fonts = vec![
            "10pt no-real-font-123",
            "11pt Arial",
            "20pt Arial",
            "12pt 'Courier New'",
        ];

        for (i, font) in fonts.iter().enumerate() {
            ctx.set_font(font);
            ctx.set_fill_style_str(&format!("rgba({}, {}, {}, 0.8)",
                i * 50, 255 - i * 50, (i * 30) % 255));
            ctx.fill_text(&format!("Test {}", i), 10.0 + (i as f64 * 70.0), 55.0)?;
        }

        Ok(())
    }
}