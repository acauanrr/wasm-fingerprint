use wasm_bindgen::prelude::*;
use web_sys::{window, Document, Window};

/// Função auxiliar para obter o objeto `window` de forma segura
pub fn get_window() -> Result<Window, JsValue> {
    window().ok_or_else(|| JsValue::from_str("Objeto 'window' global não encontrado"))
}

/// Função auxiliar para obter o objeto `document` de forma segura
pub fn get_document() -> Result<Document, JsValue> {
    let window = get_window()?;
    window.document()
        .ok_or_else(|| JsValue::from_str("Window não contém um 'document'"))
}

