;; benchmark.wat
;; Implementação de baixo nível em WebAssembly Text Format
;; Para controle máximo sobre a sequência de instruções

(module
  ;; ============================================================================
  ;; Benchmark Principal: POPCNT vs OR
  ;; ============================================================================

  ;; Função de execução AGRUPADA
  (func $grouped_popcnt_or (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    ;; Inicializar valor
    (local.set $val (i64.const 1))
    (local.set $i (i32.const 0))

    ;; Loop 1: Apenas instruções POPCNT
    (loop $loop1
      (local.set $val (i64.popcnt (local.get $val)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop1 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    ;; Reset contador
    (local.set $i (i32.const 0))

    ;; Loop 2: Apenas instruções OR
    (loop $loop2
      (local.set $val (i64.or (local.get $val) (i64.const 0xDEADBEEF)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop2 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  ;; Função de execução INTERCALADA
  (func $interleaved_popcnt_or (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    ;; Inicializar valor
    (local.set $val (i64.const 1))
    (local.set $i (i32.const 0))

    ;; Loop único com instruções alternadas
    (loop $loop
      ;; Instrução A: POPCNT
      (local.set $val (i64.popcnt (local.get $val)))
      ;; Instrução B: OR
      (local.set $val (i64.or (local.get $val) (i64.const 0xDEADBEEF)))

      ;; Incrementar e verificar contador
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  ;; ============================================================================
  ;; Benchmark 2: CLZ vs AND
  ;; ============================================================================

  (func $grouped_clz_and (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 0xFFFFFFFF))
    (local.set $i (i32.const 0))

    ;; Loop 1: CLZ
    (loop $loop1
      (local.set $val (i64.clz (local.get $val)))
      ;; Evitar zero
      (if (i64.eqz (local.get $val))
        (then (local.set $val (i64.const 1)))
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop1 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.set $i (i32.const 0))

    ;; Loop 2: AND
    (loop $loop2
      (local.set $val (i64.and (local.get $val) (i64.const 0xCAFEBABE)))
      ;; Evitar zero
      (if (i64.eqz (local.get $val))
        (then (local.set $val (i64.const 1)))
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop2 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  (func $interleaved_clz_and (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 0xFFFFFFFF))
    (local.set $i (i32.const 0))

    (loop $loop
      ;; CLZ
      (local.set $val (i64.clz (local.get $val)))
      (if (i64.eqz (local.get $val))
        (then (local.set $val (i64.const 1)))
      )
      ;; AND
      (local.set $val (i64.and (local.get $val) (i64.const 0xCAFEBABE)))
      (if (i64.eqz (local.get $val))
        (then (local.set $val (i64.const 1)))
      )

      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  ;; ============================================================================
  ;; Benchmark 3: CTZ vs XOR
  ;; ============================================================================

  (func $grouped_ctz_xor (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 0x12345678))
    (local.set $i (i32.const 0))

    ;; Loop 1: CTZ
    (loop $loop1
      (local.set $val (i64.ctz (local.get $val)))
      (if (i64.eqz (local.get $val))
        (then (local.set $val (i64.const 1)))
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop1 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.set $i (i32.const 0))

    ;; Loop 2: XOR
    (loop $loop2
      (local.set $val (i64.xor (local.get $val) (i64.const 0xABCDEF01)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop2 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  (func $interleaved_ctz_xor (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 0x12345678))
    (local.set $i (i32.const 0))

    (loop $loop
      ;; CTZ
      (local.set $val (i64.ctz (local.get $val)))
      (if (i64.eqz (local.get $val))
        (then (local.set $val (i64.const 1)))
      )
      ;; XOR
      (local.set $val (i64.xor (local.get $val) (i64.const 0xABCDEF01)))

      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  ;; ============================================================================
  ;; Benchmark 4: ROTL vs SHL
  ;; ============================================================================

  (func $grouped_rotl_shl (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 0xDEADBEEF))
    (local.set $i (i32.const 0))

    ;; Loop 1: ROTL
    (loop $loop1
      (local.set $val (i64.rotl (local.get $val) (i64.const 7)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop1 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.set $i (i32.const 0))

    ;; Loop 2: SHL
    (loop $loop2
      (local.set $val (i64.shl (local.get $val) (i64.const 3)))
      (local.set $val (i64.or (local.get $val) (i64.const 1))) ;; Evitar zeros
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop2 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  (func $interleaved_rotl_shl (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 0xDEADBEEF))
    (local.set $i (i32.const 0))

    (loop $loop
      ;; ROTL
      (local.set $val (i64.rotl (local.get $val) (i64.const 7)))
      ;; SHL
      (local.set $val (i64.shl (local.get $val) (i64.const 3)))
      (local.set $val (i64.or (local.get $val) (i64.const 1)))

      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  ;; ============================================================================
  ;; Benchmark 5: MUL vs ADD
  ;; ============================================================================

  (func $grouped_mul_add (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 1))
    (local.set $i (i32.const 0))

    ;; Loop 1: MUL
    (loop $loop1
      (local.set $val (i64.mul (local.get $val) (i64.const 3)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop1 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.set $i (i32.const 0))

    ;; Loop 2: ADD
    (loop $loop2
      (local.set $val (i64.add (local.get $val) (i64.const 7)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop2 (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  (func $interleaved_mul_add (param $iterations i32) (result i64)
    (local $val i64)
    (local $i i32)

    (local.set $val (i64.const 1))
    (local.set $i (i32.const 0))

    (loop $loop
      ;; MUL
      (local.set $val (i64.mul (local.get $val) (i64.const 3)))
      ;; ADD
      (local.set $val (i64.add (local.get $val) (i64.const 7)))

      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $loop (i32.lt_u (local.get $i) (local.get $iterations)))
    )

    (local.get $val)
  )

  ;; ============================================================================
  ;; Exports
  ;; ============================================================================

  (export "grouped_popcnt_or" (func $grouped_popcnt_or))
  (export "interleaved_popcnt_or" (func $interleaved_popcnt_or))

  (export "grouped_clz_and" (func $grouped_clz_and))
  (export "interleaved_clz_and" (func $interleaved_clz_and))

  (export "grouped_ctz_xor" (func $grouped_ctz_xor))
  (export "interleaved_ctz_xor" (func $interleaved_ctz_xor))

  (export "grouped_rotl_shl" (func $grouped_rotl_shl))
  (export "interleaved_rotl_shl" (func $interleaved_rotl_shl))

  (export "grouped_mul_add" (func $grouped_mul_add))
  (export "interleaved_mul_add" (func $interleaved_mul_add))
)