use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{
    HtmlCanvasElement, WebGlRenderingContext, WebGl2RenderingContext,
    WebGlProgram, WebGlShader
};
use sha2::{Sha256, Digest};
use crate::dom_utils::get_document;

// Constantes para os parâmetros WebGL
const UNMASKED_VENDOR_WEBGL: u32 = 0x9245;
const UNMASKED_RENDERER_WEBGL: u32 = 0x9246;

/// Função exportada para JavaScript - WebGL Fingerprinting
#[wasm_bindgen]
pub fn get_webgl_fingerprint() -> Result<String, JsValue> {
    WebGLFingerprint::collect()
}

pub struct WebGLFingerprint;

impl WebGLFingerprint {
    pub fn collect() -> Result<String, JsValue> {
        let document = get_document()?;

        let canvas = document.create_element("canvas")?
            .dyn_into::<HtmlCanvasElement>()?;

        canvas.set_width(256);
        canvas.set_height(256);

        // Tentar WebGL2 primeiro, fallback para WebGL1
        let mut fingerprint = String::new();

        // Tentar WebGL2
        if let Ok(Some(context)) = canvas.get_context("webgl2") {
            if let Ok(gl) = context.dyn_into::<WebGl2RenderingContext>() {
                fingerprint = Self::collect_webgl2_info(&gl)?;
            }
        } else if let Ok(Some(context)) = canvas.get_context("webgl") {
            // Fallback para WebGL1
            if let Ok(gl) = context.dyn_into::<WebGlRenderingContext>() {
                fingerprint = Self::collect_webgl1_info(&gl)?;
            }
        } else {
            return Err(JsValue::from_str("WebGL não suportado"));
        }

        // Gerar hash SHA-256 do fingerprint
        let mut hasher = Sha256::new();
        hasher.update(fingerprint.as_bytes());
        let hash_result = hasher.finalize();

        Ok(format!("{:x}", hash_result))
    }

    fn collect_webgl1_info(gl: &WebGlRenderingContext) -> Result<String, JsValue> {

        let mut fingerprint = String::new();

        // Collect renderer and vendor info
        let debug_info = gl.get_extension("WEBGL_debug_renderer_info")?;
        if debug_info.is_some() {
            let vendor = gl.get_parameter(UNMASKED_VENDOR_WEBGL)?;
            let renderer = gl.get_parameter(UNMASKED_RENDERER_WEBGL)?;

            fingerprint.push_str(&format!("vendor:{:?},renderer:{:?},",
                vendor.as_string().unwrap_or_default(),
                renderer.as_string().unwrap_or_default()));
        } else {
            // Fallback para parâmetros mascarados
            let vendor = gl.get_parameter(WebGlRenderingContext::VENDOR)?;
            let renderer = gl.get_parameter(WebGlRenderingContext::RENDERER)?;
            fingerprint.push_str(&format!("vendor_masked:{:?},renderer_masked:{:?},",
                vendor.as_string().unwrap_or_default(),
                renderer.as_string().unwrap_or_default()));
        }

        // Get supported extensions
        let ext_count = if let Some(extensions) = gl.get_supported_extensions() {
            extensions.length()
        } else {
            0
        };
        fingerprint.push_str(&format!("extensions:{},", ext_count));

        // Max texture size
        let max_texture = gl.get_parameter(WebGlRenderingContext::MAX_TEXTURE_SIZE)?;
        fingerprint.push_str(&format!("max_texture:{:?},", max_texture));

        // Max viewport dimensions
        let max_viewport = gl.get_parameter(WebGlRenderingContext::MAX_VIEWPORT_DIMS)?;
        fingerprint.push_str(&format!("viewport:{:?},", max_viewport));

        // Render a test scene
        let scene_data = Self::render_test_scene(&gl)?;
        fingerprint.push_str(&format!("scene:{}", scene_data));

        Ok(fingerprint)
    }

    fn render_test_scene(gl: &WebGlRenderingContext) -> Result<String, JsValue> {
        // Vertex shader
        let vert_shader = Self::compile_shader(
            &gl,
            WebGlRenderingContext::VERTEX_SHADER,
            r#"
            attribute vec2 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying highp vec2 vTextureCoord;

            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vTextureCoord = aVertexPosition;
            }
            "#,
        )?;

        // Fragment shader with precision-dependent calculations
        let frag_shader = Self::compile_shader(
            &gl,
            WebGlRenderingContext::FRAGMENT_SHADER,
            r#"
            precision mediump float;
            varying highp vec2 vTextureCoord;
            uniform float uTime;

            void main(void) {
                float r = abs(sin(vTextureCoord.x * 10.0 + uTime));
                float g = abs(cos(vTextureCoord.y * 10.0 + uTime));
                float b = abs(sin((vTextureCoord.x + vTextureCoord.y) * 5.0));
                gl_FragColor = vec4(r, g, b, 1.0);
            }
            "#,
        )?;

        let program = Self::link_program(&gl, &vert_shader, &frag_shader)?;
        gl.use_program(Some(&program));

        // Create vertex buffer
        let vertices: [f32; 8] = [
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ];

        let vertex_buffer = gl.create_buffer().ok_or("Failed to create buffer")?;
        gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(&vertex_buffer));

        unsafe {
            let vert_array = js_sys::Float32Array::view(&vertices);
            gl.buffer_data_with_array_buffer_view(
                WebGlRenderingContext::ARRAY_BUFFER,
                &vert_array,
                WebGlRenderingContext::STATIC_DRAW,
            );
        }

        // Set up attributes and uniforms
        let position_attr = gl.get_attrib_location(&program, "aVertexPosition") as u32;
        gl.vertex_attrib_pointer_with_i32(
            position_attr, 2, WebGlRenderingContext::FLOAT, false, 0, 0
        );
        gl.enable_vertex_attrib_array(position_attr);

        // Clear and draw
        gl.clear_color(0.0, 0.0, 0.0, 1.0);
        gl.clear(WebGlRenderingContext::COLOR_BUFFER_BIT);
        gl.draw_arrays(WebGlRenderingContext::TRIANGLE_STRIP, 0, 4);

        // Read pixels for fingerprinting
        let mut pixels = vec![0u8; 4 * 16 * 16]; // Sample 16x16 region
        gl.read_pixels_with_opt_u8_array(
            120, 120, 16, 16,
            WebGlRenderingContext::RGBA,
            WebGlRenderingContext::UNSIGNED_BYTE,
            Some(&mut pixels),
        )?;

        // Convert pixels to hash-like string
        let pixel_hash = pixels.iter()
            .take(64)
            .map(|p| format!("{:02x}", p))
            .collect::<String>();

        Ok(pixel_hash)
    }

    fn collect_webgl2_info(gl: &WebGl2RenderingContext) -> Result<String, JsValue> {
        let mut fingerprint = String::new();

        // WebGL version
        fingerprint.push_str("webgl2:true,");

        // Vendor e Renderer
        let debug_info = gl.get_extension("WEBGL_debug_renderer_info")?;
        if debug_info.is_some() {
            let vendor = gl.get_parameter(UNMASKED_VENDOR_WEBGL)?;
            let renderer = gl.get_parameter(UNMASKED_RENDERER_WEBGL)?;

            fingerprint.push_str(&format!("vendor:{:?},renderer:{:?},",
                vendor.as_string().unwrap_or_default(),
                renderer.as_string().unwrap_or_default()));
        }

        // Precisão de shaders (WebGL2 specific)
        if let Some(vertex_precision) = gl.get_shader_precision_format(
            WebGl2RenderingContext::VERTEX_SHADER,
            WebGl2RenderingContext::HIGH_FLOAT
        ) {
            fingerprint.push_str(&format!("vertex_precision:{},", vertex_precision.precision()));
        }

        if let Some(fragment_precision) = gl.get_shader_precision_format(
            WebGl2RenderingContext::FRAGMENT_SHADER,
            WebGl2RenderingContext::HIGH_FLOAT
        ) {
            fingerprint.push_str(&format!("fragment_precision:{},", fragment_precision.precision()));
        }

        // Parâmetros WebGL2 específicos
        let max_3d_texture = gl.get_parameter(WebGl2RenderingContext::MAX_3D_TEXTURE_SIZE)?;
        fingerprint.push_str(&format!("max_3d_texture:{:?},", max_3d_texture));

        let max_array_texture = gl.get_parameter(WebGl2RenderingContext::MAX_ARRAY_TEXTURE_LAYERS)?;
        fingerprint.push_str(&format!("max_array_layers:{:?},", max_array_texture));

        // Extensões
        let ext_count = gl.get_supported_extensions()
            .and_then(|x| Some(x))
            .unwrap_or_else(|| js_sys::Array::new())
            .length();
        fingerprint.push_str(&format!("extensions:{},", ext_count));

        // Renderizar cena de teste WebGL2
        let scene_data = Self::render_test_scene_gl2(&gl)?;
        fingerprint.push_str(&format!("scene:{}", scene_data));

        Ok(fingerprint)
    }


    fn compile_shader(
        gl: &WebGlRenderingContext,
        shader_type: u32,
        source: &str,
    ) -> Result<WebGlShader, JsValue> {
        let shader = gl
            .create_shader(shader_type)
            .ok_or("Unable to create shader")?;

        gl.shader_source(&shader, source);
        gl.compile_shader(&shader);

        if gl.get_shader_parameter(&shader, WebGlRenderingContext::COMPILE_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(shader)
        } else {
            Err(JsValue::from_str(
                &gl.get_shader_info_log(&shader)
                    .unwrap_or_else(|| "Unknown error".to_string()),
            ))
        }
    }

    fn link_program(
        gl: &WebGlRenderingContext,
        vert_shader: &WebGlShader,
        frag_shader: &WebGlShader,
    ) -> Result<WebGlProgram, JsValue> {
        let program = gl
            .create_program()
            .ok_or("Unable to create program")?;

        gl.attach_shader(&program, vert_shader);
        gl.attach_shader(&program, frag_shader);
        gl.link_program(&program);

        if gl.get_program_parameter(&program, WebGlRenderingContext::LINK_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(program)
        } else {
            Err(JsValue::from_str(
                &gl.get_program_info_log(&program)
                    .unwrap_or_else(|| "Unknown error".to_string()),
            ))
        }
    }

    // Helper functions for WebGL2
    fn compile_shader_gl2(
        gl: &WebGl2RenderingContext,
        shader_type: u32,
        source: &str,
    ) -> Result<WebGlShader, JsValue> {
        let shader = gl
            .create_shader(shader_type)
            .ok_or("Unable to create shader")?;

        gl.shader_source(&shader, source);
        gl.compile_shader(&shader);

        if gl.get_shader_parameter(&shader, WebGl2RenderingContext::COMPILE_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(shader)
        } else {
            Err(JsValue::from_str(
                &gl.get_shader_info_log(&shader)
                    .unwrap_or_else(|| "Unknown error".to_string()),
            ))
        }
    }

    fn link_program_gl2(
        gl: &WebGl2RenderingContext,
        vert_shader: &WebGlShader,
        frag_shader: &WebGlShader,
    ) -> Result<WebGlProgram, JsValue> {
        let program = gl
            .create_program()
            .ok_or("Unable to create program")?;

        gl.attach_shader(&program, vert_shader);
        gl.attach_shader(&program, frag_shader);
        gl.link_program(&program);

        if gl.get_program_parameter(&program, WebGl2RenderingContext::LINK_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(program)
        } else {
            Err(JsValue::from_str(
                &gl.get_program_info_log(&program)
                    .unwrap_or_else(|| "Unknown error".to_string()),
            ))
        }
    }

    fn render_test_scene_gl2(gl: &WebGl2RenderingContext) -> Result<String, JsValue> {
        // Use WebGL2-specific shaders with version declaration
        let vert_shader = Self::compile_shader_gl2(
            &gl,
            WebGl2RenderingContext::VERTEX_SHADER,
            r#"#version 300 es
            in vec2 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            out highp vec2 vTextureCoord;

            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vTextureCoord = aVertexPosition;
            }
            "#,
        )?;

        let frag_shader = Self::compile_shader_gl2(
            &gl,
            WebGl2RenderingContext::FRAGMENT_SHADER,
            r#"#version 300 es
            precision mediump float;
            in highp vec2 vTextureCoord;
            uniform float uTime;
            out vec4 fragColor;

            void main(void) {
                float r = abs(sin(vTextureCoord.x * 10.0 + uTime));
                float g = abs(cos(vTextureCoord.y * 10.0 + uTime));
                float b = abs(sin((vTextureCoord.x + vTextureCoord.y) * 5.0));
                fragColor = vec4(r, g, b, 1.0);
            }
            "#,
        )?;

        let program = Self::link_program_gl2(&gl, &vert_shader, &frag_shader)?;
        gl.use_program(Some(&program));

        // Create vertex buffer
        let vertices: [f32; 8] = [
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ];

        let vertex_buffer = gl.create_buffer().ok_or("Failed to create buffer")?;
        gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&vertex_buffer));

        unsafe {
            let vert_array = js_sys::Float32Array::view(&vertices);
            gl.buffer_data_with_array_buffer_view(
                WebGl2RenderingContext::ARRAY_BUFFER,
                &vert_array,
                WebGl2RenderingContext::STATIC_DRAW,
            );
        }

        let position_attr = gl.get_attrib_location(&program, "aVertexPosition") as u32;
        gl.vertex_attrib_pointer_with_i32(
            position_attr, 2, WebGl2RenderingContext::FLOAT, false, 0, 0
        );
        gl.enable_vertex_attrib_array(position_attr);

        // Clear and draw
        gl.clear_color(0.0, 0.0, 0.0, 1.0);
        gl.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);
        gl.draw_arrays(WebGl2RenderingContext::TRIANGLE_STRIP, 0, 4);

        // Read pixels
        let mut pixels = vec![0u8; 4 * 16 * 16];
        gl.read_pixels_with_opt_u8_array(
            120, 120, 16, 16,
            WebGl2RenderingContext::RGBA,
            WebGl2RenderingContext::UNSIGNED_BYTE,
            Some(&mut pixels),
        )?;

        let pixel_hash = pixels.iter()
            .take(64)
            .map(|p| format!("{:02x}", p))
            .collect::<String>();

        Ok(pixel_hash)
    }
}