// node_modules/chartgpu/dist/index.js
var cr = /* @__PURE__ */ Symbol("GPUContext.ownsDevice");
var Ws = (e) => e[cr] ?? true;
function ya(e) {
  return typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement;
}
function ga(e) {
  const t = e.clientWidth || e.width || 0, n = e.clientHeight || e.height || 0;
  if (!Number.isFinite(t) || !Number.isFinite(n))
    throw new Error(
      `GPUContext: Invalid canvas dimensions detected: width=${e.clientWidth || e.width}, height=${e.clientHeight || e.height}. Canvas must have finite dimensions. Ensure canvas is properly sized before initialization.`
    );
  return { width: t, height: n };
}
function Os(e, t) {
  const n = (t == null ? void 0 : t.devicePixelRatio) ?? (typeof window < "u" ? window.devicePixelRatio : 1), i = Number.isFinite(n) && n > 0 ? n : 1, r = (t == null ? void 0 : t.alphaMode) ?? "opaque", o = (t == null ? void 0 : t.powerPreference) ?? "high-performance", s = !!(t != null && t.device && (t != null && t.adapter)), a = s ? t.adapter : null, u = s ? t.device : null, f = !s;
  return {
    adapter: a,
    device: u,
    initialized: false,
    canvas: e || null,
    canvasContext: null,
    preferredFormat: null,
    devicePixelRatio: i,
    alphaMode: r,
    powerPreference: o,
    [cr]: f
  };
}
async function Xs(e) {
  var o, s, a;
  if (e.initialized)
    throw new Error("GPUContext: already initialized. Call destroyGPUContext() before reinitializing.");
  const t = Number.isFinite(e.devicePixelRatio) && e.devicePixelRatio > 0 ? e.devicePixelRatio : 1;
  if (!navigator.gpu)
    throw new Error(
      "WebGPU is not available in this browser. Please use a browser that supports WebGPU (Chrome 113+, Edge 113+, or Safari 18+). Ensure WebGPU is enabled in browser flags if needed."
    );
  let n = null, i = null, r = Ws(e);
  try {
    if (e.adapter && e.device) {
      if (i = e.adapter, n = e.device, r = false, typeof ((o = navigator.gpu) == null ? void 0 : o.getPreferredCanvasFormat) != "function")
        throw new Error(
          "GPUContext: Shared device requires navigator.gpu.getPreferredCanvasFormat() for canvas format selection, but it is not available in this environment. Use a browser with full WebGPU support."
        );
      const g = navigator.gpu.getPreferredCanvasFormat();
      if (g !== "bgra8unorm" && g !== "rgba8unorm")
        throw new Error(
          `GPUContext: Shared device preferred canvas format is not supported by ChartGPU. Received navigator.gpu.getPreferredCanvasFormat()="${g}". Supported formats: "bgra8unorm", "rgba8unorm".`
        );
      const c = n.limits.maxBufferSize;
      if (c < 33554432)
        throw new Error(
          `GPUContext: Injected device.limits.maxBufferSize is insufficient. Required >= 33554432 bytes, actual=${c} bytes.`
        );
      const h = n.limits.maxStorageBufferBindingSize;
      if (h < 33554432)
        throw new Error(
          `GPUContext: Injected device.limits.maxStorageBufferBindingSize is insufficient. Required >= 33554432 bytes, actual=${h} bytes.`
        );
    } else {
      const g = await navigator.gpu.requestAdapter({
        powerPreference: e.powerPreference
      });
      if (!g)
        throw new Error(
          "GPUContext: Failed to request WebGPU adapter. No compatible adapter found. This may occur if no GPU is available or WebGPU is disabled."
        );
      const c = await g.requestDevice();
      if (!c)
        throw new Error("GPUContext: Failed to request WebGPU device from adapter.");
      i = g, n = c, r = true, n.addEventListener("uncapturederror", (h) => {
        console.error("WebGPU uncaptured error:", h.error);
      });
    }
    let f = null, l = null;
    if (e.canvas) {
      const g = e.canvas.getContext("webgpu");
      if (!g) {
        if (r && n)
          try {
            n.destroy();
          } catch (v) {
            console.warn("Error destroying device during canvas setup failure:", v);
          }
        throw new Error("GPUContext: Failed to get WebGPU context from canvas.");
      }
      const { width: c, height: h } = ga(e.canvas), d = t, w = Math.floor(c * d), P = Math.floor(h * d), R = n.limits.maxTextureDimension2D;
      if (!r && (w > R || P > R)) {
        const v = Math.max(w, P);
        throw new Error(
          `GPUContext: Injected device.limits.maxTextureDimension2D is insufficient. Required >= ${v} (for ${w}x${P} at devicePixelRatio=${d}), actual=${R}.`
        );
      }
      const T = Math.max(1, Math.min(w, R)), C = Math.max(1, Math.min(P, R));
      e.canvas.width = T, e.canvas.height = C, l = ((a = (s = navigator.gpu).getPreferredCanvasFormat) == null ? void 0 : a.call(s)) || "bgra8unorm", g.configure({
        device: n,
        format: l,
        alphaMode: e.alphaMode
      }), f = g;
    }
    return {
      adapter: i,
      device: n,
      initialized: true,
      canvas: e.canvas,
      canvasContext: f,
      preferredFormat: l,
      devicePixelRatio: t,
      alphaMode: e.alphaMode,
      powerPreference: e.powerPreference,
      [cr]: r
    };
  } catch (u) {
    if (r && n)
      try {
        n.destroy();
      } catch (f) {
        console.warn("Error destroying device during initialization failure:", f);
      }
    throw u instanceof Error ? u : new Error(`Failed to initialize GPUContext: ${String(u)}`);
  }
}
function $s(e) {
  if (!e.canvas)
    throw new Error("GPUContext: Canvas is not configured. Provide a canvas element when creating the context.");
  if (!e.initialized || !e.canvasContext)
    throw new Error("GPUContext: not initialized. Call initializeGPUContext() first.");
  return e.canvasContext.getCurrentTexture();
}
function xa(e, t, n, i, r) {
  if (t < 0 || t > 1 || n < 0 || n > 1 || i < 0 || i > 1 || r < 0 || r > 1)
    throw new Error("GPUContext: Color components must be in the range [0.0, 1.0]");
  if (!e.canvas)
    throw new Error("GPUContext: Canvas is not configured. Provide a canvas element when creating the context.");
  if (!e.initialized || !e.device || !e.canvasContext)
    throw new Error("GPUContext: not initialized. Call initializeGPUContext() first.");
  const o = $s(e), s = e.device.createCommandEncoder();
  s.beginRenderPass({
    colorAttachments: [
      {
        view: o.createView(),
        clearValue: { r: t, g: n, b: i, a: r },
        loadOp: "clear",
        storeOp: "store"
      }
    ]
  }).end(), e.device.queue.submit([s.finish()]);
}
function ba(e) {
  if (e.canvasContext)
    try {
      e.canvasContext.unconfigure();
    } catch (t) {
      console.warn("Error unconfiguring GPU canvas context:", t);
    }
  if (Ws(e) !== false && e.device)
    try {
      e.device.destroy();
    } catch (t) {
      console.warn("Error destroying GPU device:", t);
    }
  return {
    adapter: null,
    device: null,
    initialized: false,
    canvas: e.canvas,
    canvasContext: null,
    preferredFormat: null,
    devicePixelRatio: e.devicePixelRatio,
    alphaMode: e.alphaMode,
    powerPreference: e.powerPreference,
    [cr]: false
  };
}
var to = class _to {
  /**
   * Gets the WebGPU adapter, or null if not initialized.
   */
  get adapter() {
    return this._state.adapter;
  }
  /**
   * Gets the WebGPU device, or null if not initialized.
   */
  get device() {
    return this._state.device;
  }
  /**
   * Checks if the context has been initialized.
   */
  get initialized() {
    return this._state.initialized;
  }
  /**
   * Gets the canvas element, or null if not provided.
   */
  get canvas() {
    return this._state.canvas;
  }
  /**
   * Gets the WebGPU canvas context, or null if canvas is not configured.
   */
  get canvasContext() {
    return this._state.canvasContext;
  }
  /**
   * Gets the preferred canvas format, or null if canvas is not configured.
   */
  get preferredFormat() {
    return this._state.preferredFormat;
  }
  /**
   * Gets the device pixel ratio used for canvas sizing.
   */
  get devicePixelRatio() {
    return this._state.devicePixelRatio;
  }
  /**
   * Gets the canvas alpha mode.
   */
  get alphaMode() {
    return this._state.alphaMode;
  }
  /**
   * Gets the GPU power preference.
   */
  get powerPreference() {
    return this._state.powerPreference;
  }
  /**
   * Creates a new GPUContext instance.
   * 
   * @param canvas - Optional canvas element (HTMLCanvasElement) to configure for WebGPU rendering
   * @param options - Optional configuration for device pixel ratio, alpha mode, and power preference
   */
  constructor(t, n) {
    this._state = Os(t, n);
  }
  /**
   * Initializes the WebGPU context by requesting an adapter and device.
   * 
   * @throws {Error} If WebGPU is not available in the browser
   * @throws {Error} If adapter request fails
   * @throws {Error} If device request fails
   * @throws {Error} If already initialized
   */
  async initialize() {
    this._state = await Xs(this._state);
  }
  /**
   * Static factory method to create and initialize a GPUContext instance.
   * 
   * @param canvas - Optional canvas element (HTMLCanvasElement) to configure for WebGPU rendering
   * @param options - Optional configuration for device pixel ratio, alpha mode, and power preference
   * @returns A fully initialized GPUContext instance
   * @throws {Error} If initialization fails
   * 
   * @example
   * ```typescript
   * const context = await GPUContext.create();
   * const device = context.device;
   * ```
   * 
   * @example
   * ```typescript
   * const canvas = document.querySelector('canvas');
   * const context = await GPUContext.create(canvas);
   * const texture = context.getCanvasTexture();
   * ```
   */
  static async create(t, n) {
    const i = new _to(t, n);
    return await i.initialize(), i;
  }
  /**
   * Gets the current texture from the canvas context.
   * 
   * @returns The current canvas texture
   * @throws {Error} If canvas is not configured or context is not initialized
   * 
   * @example
   * ```typescript
   * const texture = context.getCanvasTexture();
   * // Use texture in render pass
   * ```
   */
  getCanvasTexture() {
    return $s(this._state);
  }
  /**
   * Clears the canvas to a solid color.
   * Creates a command encoder, begins a render pass with the specified clear color,
   * ends the pass, and submits it to the queue.
   * 
   * @param r - Red component (0.0 to 1.0)
   * @param g - Green component (0.0 to 1.0)
   * @param b - Blue component (0.0 to 1.0)
   * @param a - Alpha component (0.0 to 1.0)
   * @throws {Error} If canvas is not configured or context is not initialized
   * @throws {Error} If device is not available
   * 
   * @example
   * ```typescript
   * // Clear to dark purple (#1a1a2e)
   * context.clearScreen(0x1a / 255, 0x1a / 255, 0x2e / 255, 1.0);
   * ```
   */
  clearScreen(t, n, i, r) {
    xa(this._state, t, n, i, r);
  }
  /**
   * Destroys the WebGPU device and cleans up resources.
   * After calling destroy(), the context must be reinitialized before use.
   */
  destroy() {
    this._state = ba(this._state);
  }
};
function Yn(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e) && "x" in e && "y" in e && typeof e.x == "object" && typeof e.y == "object" && "length" in e.x && "length" in e.y;
}
function Hn(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e) && ArrayBuffer.isView(e);
}
function hi(e) {
  return Array.isArray(e);
}
function Ie(e) {
  if (Yn(e))
    return Math.min(e.x.length, e.y.length);
  if (Hn(e)) {
    if (e instanceof DataView)
      throw new Error("DataView is not supported for InterleavedXYData. Use typed arrays (Float32Array, Float64Array, etc.).");
    return Math.floor(e.length / 2);
  }
  return e.length;
}
function Ae(e, t) {
  if (Yn(e))
    return e.x[t];
  if (Hn(e)) {
    if (e instanceof DataView)
      throw new Error("DataView is not supported for InterleavedXYData. Use typed arrays (Float32Array, Float64Array, etc.).");
    return e[t * 2];
  }
  const n = e[t];
  return n == null || typeof n != "object" ? NaN : hi(n) ? n[0] : n.x;
}
function Ue(e, t) {
  if (Yn(e))
    return e.y[t];
  if (Hn(e)) {
    if (e instanceof DataView)
      throw new Error("DataView is not supported for InterleavedXYData. Use typed arrays (Float32Array, Float64Array, etc.).");
    return e[t * 2 + 1];
  }
  const n = e[t];
  return n == null || typeof n != "object" ? NaN : hi(n) ? n[1] : n.y;
}
function at(e, t) {
  var i;
  if (Yn(e))
    return (i = e.size) == null ? void 0 : i[t];
  if (Hn(e))
    return;
  const n = e[t];
  if (!(n == null || typeof n != "object"))
    return hi(n) ? n[2] : n.size;
}
function hr(e, t, n, i, r, o) {
  const s = Ie(n) - i, a = Math.min(r, s);
  if (a <= 0) return;
  const u = t + a * 2;
  if (u > e.length)
    throw new Error(
      `packXYInto: output buffer too small (need ${u} floats, have ${e.length})`
    );
  if (Yn(n)) {
    for (let f = 0; f < a; f++) {
      const l = i + f, g = t + f * 2;
      e[g] = n.x[l] - o, e[g + 1] = n.y[l];
    }
    return;
  }
  if (Hn(n)) {
    if (n instanceof DataView)
      throw new Error("DataView is not supported for InterleavedXYData. Use typed arrays (Float32Array, Float64Array, etc.).");
    const f = n;
    for (let l = 0; l < a; l++) {
      const g = (i + l) * 2, c = t + l * 2;
      e[c] = f[g] - o, e[c + 1] = f[g + 1];
    }
    return;
  }
  for (let f = 0; f < a; f++) {
    const l = i + f, g = t + f * 2, c = n[l];
    if (c == null || typeof c != "object") {
      e[g] = NaN, e[g + 1] = NaN;
      continue;
    }
    const h = hi(c) ? c[0] : c.x, d = hi(c) ? c[1] : c.y;
    e[g] = h - o, e[g + 1] = d;
  }
}
function Vt(e) {
  let t = Number.POSITIVE_INFINITY, n = Number.NEGATIVE_INFINITY, i = Number.POSITIVE_INFINITY, r = Number.NEGATIVE_INFINITY;
  if (Yn(e)) {
    const o = Math.min(e.x.length, e.y.length);
    for (let s = 0; s < o; s++) {
      const a = e.x[s], u = e.y[s];
      !Number.isFinite(a) || !Number.isFinite(u) || (a < t && (t = a), a > n && (n = a), u < i && (i = u), u > r && (r = u));
    }
  } else if (Hn(e)) {
    if (e instanceof DataView)
      throw new Error("DataView is not supported for InterleavedXYData. Use typed arrays (Float32Array, Float64Array, etc.).");
    const o = e, s = Math.floor(o.length / 2);
    for (let a = 0; a < s; a++) {
      const u = o[a * 2], f = o[a * 2 + 1];
      !Number.isFinite(u) || !Number.isFinite(f) || (u < t && (t = u), u > n && (n = u), f < i && (i = f), f > r && (r = f));
    }
  } else {
    const o = e.length;
    for (let s = 0; s < o; s++) {
      const a = Ae(e, s), u = Ue(e, s);
      !Number.isFinite(a) || !Number.isFinite(u) || (a < t && (t = a), a > n && (n = a), u < i && (i = u), u > r && (r = u));
    }
  }
  return !Number.isFinite(t) || !Number.isFinite(n) || !Number.isFinite(i) || !Number.isFinite(r) ? null : (t === n && (n = t + 1), i === r && (r = i + 1), { xMin: t, xMax: n, yMin: i, yMax: r });
}
var tr = 4;
function Xr(e) {
  return e + 3 & -4;
}
function va(e) {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
}
function xo(e, t) {
  const n = Math.max(tr, Xr(t)), i = Math.max(tr, va(n));
  return Math.max(e, i);
}
function Ys(e, t) {
  let n = e >>> 0;
  for (let i = 0; i < t.length; i++)
    n ^= t[i], n = Math.imul(n, 16777619) >>> 0;
  return n >>> 0;
}
function bo(e) {
  const t = new Uint32Array(e.buffer, e.byteOffset, e.byteLength / 4);
  return Ys(2166136261, t);
}
function wa(e) {
  const t = /* @__PURE__ */ new Map();
  let n = false;
  const i = (c, h) => {
    const d = Ie(c);
    if (d === 0) return new Float32Array(0);
    const w = new ArrayBuffer(d * 2 * 4), P = new Float32Array(w);
    return hr(P, 0, c, 0, d, h), P;
  }, r = () => {
    if (n)
      throw new Error("DataStore is disposed.");
  }, o = (c) => {
    r();
    const h = t.get(c);
    if (!h)
      throw new Error(`Series ${c} has no data. Call setSeries(${c}, data) first.`);
    return h;
  };
  return {
    setSeries: (c, h, d) => {
      r();
      const w = (d == null ? void 0 : d.xOffset) ?? 0, P = Ie(h), R = i(h, w), T = bo(R), C = Xr(R.byteLength), v = Math.max(tr, C), m = t.get(c);
      if (m && m.pointCount === P && m.hash32 === T) return;
      let b = (m == null ? void 0 : m.buffer) ?? null, M = (m == null ? void 0 : m.capacityBytes) ?? 0;
      if (!b || v > M) {
        const A = e.limits.maxBufferSize;
        if (v > A)
          throw new Error(
            `DataStore.setSeries(${c}): required buffer size ${v} exceeds device.limits.maxBufferSize (${A}).`
          );
        if (b)
          try {
            b.destroy();
          } catch {
          }
        const S = xo(M, v);
        S > A ? M = v : M = S, b = e.createBuffer({
          size: M,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
      }
      R.byteLength > 0 && e.queue.writeBuffer(b, 0, R.buffer, R.byteOffset, R.byteLength);
      const I = new Float32Array(M / 4);
      I.set(R), t.set(c, {
        buffer: b,
        capacityBytes: M,
        pointCount: P,
        hash32: T,
        xOffset: w,
        stagingBuffer: I
      });
    },
    appendSeries: (c, h) => {
      r();
      const d = Ie(h);
      if (d === 0) return;
      const w = o(c), P = w.pointCount, R = P + d, T = Xr(R * 2 * 4), C = Math.max(tr, T);
      let v = w.buffer, m = w.capacityBytes, x = w.stagingBuffer;
      const b = e.limits.maxBufferSize;
      if (C > m) {
        if (C > b)
          throw new Error(
            `DataStore.appendSeries(${c}): required buffer size ${C} exceeds device.limits.maxBufferSize (${b}).`
          );
        try {
          v.destroy();
        } catch {
        }
        const S = xo(m, C);
        m = S > b ? C : S, v = e.createBuffer({
          size: m,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const p = new Float32Array(m / 4);
        p.set(x.subarray(0, P * 2)), hr(p, P * 2, h, 0, d, w.xOffset);
        const y = p.subarray(0, R * 2);
        y.byteLength > 0 && e.queue.writeBuffer(v, 0, y.buffer, y.byteOffset, y.byteLength), t.set(c, {
          buffer: v,
          capacityBytes: m,
          pointCount: R,
          hash32: bo(y),
          xOffset: w.xOffset,
          stagingBuffer: p
        });
        return;
      }
      hr(x, P * 2, h, 0, d, w.xOffset);
      const M = x.subarray(P * 2, R * 2);
      if (M.byteLength > 0) {
        const S = P * 2 * 4;
        e.queue.writeBuffer(v, S, M.buffer, M.byteOffset, M.byteLength);
      }
      const I = new Uint32Array(M.buffer, M.byteOffset, M.byteLength / 4), A = Ys(w.hash32, I);
      t.set(c, {
        buffer: v,
        capacityBytes: m,
        pointCount: R,
        hash32: A,
        xOffset: w.xOffset,
        stagingBuffer: x
      });
    },
    removeSeries: (c) => {
      r();
      const h = t.get(c);
      if (h) {
        try {
          h.buffer.destroy();
        } catch {
        }
        t.delete(c);
      }
    },
    getSeriesBuffer: (c) => o(c).buffer,
    getSeriesPointCount: (c) => o(c).pointCount,
    dispose: () => {
      if (!n) {
        n = true;
        for (const c of t.values())
          try {
            c.buffer.destroy();
          } catch {
          }
        t.clear();
      }
    }
  };
}
function un(e) {
  return Array.isArray(e);
}
function Ca(e, t) {
  const n = e.length >>> 1, i = n - 1;
  if (t <= 0 || n === 0) return new Int32Array(0);
  if (t === 1) return new Int32Array([0]);
  if (t === 2) return n >= 2 ? new Int32Array([0, i]) : new Int32Array([0]);
  if (n <= t) {
    const l = new Int32Array(n);
    for (let g = 0; g < n; g++) l[g] = g;
    return l;
  }
  const r = new Int32Array(t);
  r[0] = 0, r[t - 1] = i;
  const o = (n - 2) / (t - 2);
  let s = 0, a = 1;
  const u = e[i * 2 + 0], f = e[i * 2 + 1];
  for (let l = 0; l < t - 2; l++) {
    let g = Math.floor(o * l) + 1, c = Math.min(Math.floor(o * (l + 1)) + 1, i);
    g >= c && (g = Math.min(g, i - 1), c = Math.min(g + 1, i));
    const h = Math.floor(o * (l + 1)) + 1, d = Math.min(Math.floor(o * (l + 2)) + 1, i);
    let w = u, P = f;
    if (h < d) {
      let m = 0, x = 0, b = 0;
      for (let M = h; M < d; M++)
        m += e[M * 2 + 0], x += e[M * 2 + 1], b++;
      b > 0 && (w = m / b, P = x / b);
    }
    const R = e[s * 2 + 0], T = e[s * 2 + 1];
    let C = -1, v = g;
    for (let m = g; m < c; m++) {
      const x = e[m * 2 + 0], b = e[m * 2 + 1], M = (R - w) * (b - T) - (R - x) * (P - T), I = M < 0 ? -M : M;
      I > C && (C = I, v = m);
    }
    r[a++] = v, s = v;
  }
  return r;
}
function Ma(e, t) {
  const n = e.length, i = n - 1;
  if (t <= 0 || n === 0) return new Int32Array(0);
  if (t === 1) return new Int32Array([0]);
  if (t === 2) return n >= 2 ? new Int32Array([0, i]) : new Int32Array([0]);
  if (n <= t) {
    const g = new Int32Array(n);
    for (let c = 0; c < n; c++) g[c] = c;
    return g;
  }
  const r = new Int32Array(t);
  r[0] = 0, r[t - 1] = i;
  const o = (n - 2) / (t - 2);
  let s = 0, a = 1;
  const u = e[i], f = un(u) ? u[0] : u.x, l = un(u) ? u[1] : u.y;
  for (let g = 0; g < t - 2; g++) {
    let c = Math.floor(o * g) + 1, h = Math.min(Math.floor(o * (g + 1)) + 1, i);
    c >= h && (c = Math.min(c, i - 1), h = Math.min(c + 1, i));
    const d = Math.floor(o * (g + 1)) + 1, w = Math.min(Math.floor(o * (g + 2)) + 1, i);
    let P = f, R = l;
    if (d < w) {
      let b = 0, M = 0, I = 0;
      for (let A = d; A < w; A++) {
        const S = e[A], p = un(S) ? S[0] : S.x, y = un(S) ? S[1] : S.y;
        b += p, M += y, I++;
      }
      I > 0 && (P = b / I, R = M / I);
    }
    const T = e[s], C = un(T) ? T[0] : T.x, v = un(T) ? T[1] : T.y;
    let m = -1, x = c;
    for (let b = c; b < h; b++) {
      const M = e[b], I = un(M) ? M[0] : M.x, A = un(M) ? M[1] : M.y, S = (C - P) * (A - v) - (C - I) * (R - v), p = S < 0 ? -S : S;
      p > m && (m = p, x = b);
    }
    r[a++] = x, s = x;
  }
  return r;
}
function Ni(e, t) {
  const n = Math.floor(t);
  if (e instanceof Float32Array) {
    const s = e.length >>> 1;
    if (n <= 0 || s === 0) return new Float32Array(0);
    if (s <= n) return e;
    const a = Ca(e, n), u = new Float32Array(a.length * 2);
    for (let f = 0; f < a.length; f++) {
      const l = a[f];
      u[f * 2 + 0] = e[l * 2 + 0], u[f * 2 + 1] = e[l * 2 + 1];
    }
    return u;
  }
  const i = e.length;
  if (n <= 0 || i === 0) return [];
  if (i <= n) return e;
  const r = Ma(e, n), o = new Array(r.length);
  for (let s = 0; s < r.length; s++)
    o[s] = e[r[s]];
  return o;
}
function Hs(e) {
  const t = Math.floor(e);
  return Number.isFinite(t) ? t : 0;
}
function Sa(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e) && "x" in e && "y" in e && typeof e.x == "object" && typeof e.y == "object" && "length" in e.x && "length" in e.y;
}
function Fa(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e) && ArrayBuffer.isView(e);
}
function vo(e) {
  const t = Ie(e), n = new Float32Array(t * 2);
  for (let i = 0; i < t; i++)
    n[i * 2] = Ae(e, i), n[i * 2 + 1] = Ue(e, i);
  return n;
}
function yr(e, t, n) {
  const i = Ie(e), r = Hs(t);
  if (r <= 0 || i === 0) return [];
  if (r === 1) {
    const u = Ae(e, 0), f = Ue(e, 0), l = at(e, 0);
    return l !== void 0 ? [[u, f, l]] : [[u, f]];
  }
  if (r === 2)
    if (i >= 2) {
      const u = Ae(e, 0), f = Ue(e, 0), l = at(e, 0), g = Ae(e, i - 1), c = Ue(e, i - 1), h = at(e, i - 1);
      return [
        l !== void 0 ? [u, f, l] : [u, f],
        h !== void 0 ? [g, c, h] : [g, c]
      ];
    } else {
      const u = Ae(e, 0), f = Ue(e, 0), l = at(e, 0);
      return l !== void 0 ? [[u, f, l]] : [[u, f]];
    }
  const o = i - 1, s = new Array(r);
  {
    const u = Ae(e, 0), f = Ue(e, 0), l = at(e, 0);
    s[0] = l !== void 0 ? [u, f, l] : [u, f];
    const g = Ae(e, o), c = Ue(e, o), h = at(e, o);
    s[r - 1] = h !== void 0 ? [g, c, h] : [g, c];
  }
  const a = (i - 2) / (r - 2);
  for (let u = 0; u < r - 2; u++) {
    let f = Math.floor(a * u) + 1, l = Math.min(Math.floor(a * (u + 1)) + 1, o);
    f >= l && (f = Math.min(f, o - 1), l = Math.min(f + 1, o));
    let g = null;
    if (n === "average") {
      let c = 0, h = 0, d = 0, w = 0, P = 0;
      for (let R = f; R < l; R++) {
        const T = Ae(e, R), C = Ue(e, R);
        if (!Number.isFinite(T) || !Number.isFinite(C)) continue;
        c += T, h += C, w++;
        const v = at(e, R);
        typeof v == "number" && Number.isFinite(v) && (d += v, P++);
      }
      if (w > 0) {
        const R = c / w, T = h / w;
        P > 0 ? g = [R, T, d / P] : g = [R, T];
      }
    } else {
      let c = n === "max" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY, h = f;
      for (let R = f; R < l; R++) {
        const T = Ue(e, R);
        Number.isFinite(T) && (n === "max" ? T > c && (c = T, h = R) : T < c && (c = T, h = R));
      }
      const d = Ae(e, h), w = Ue(e, h), P = at(e, h);
      g = P !== void 0 ? [d, w, P] : [d, w];
    }
    if (g === null) {
      const c = Ae(e, f), h = Ue(e, f), d = at(e, f);
      g = d !== void 0 ? [c, h, d] : [c, h];
    }
    s[u + 1] = g;
  }
  return s;
}
function Gn(e, t, n) {
  const i = Hs(n), r = Ie(e);
  if (t === "none" || !(i > 0) || r <= i) return e;
  switch (t) {
    case "lttb": {
      if (e instanceof Float32Array)
        return Ni(e, i);
      if (Fa(e)) {
        const o = vo(e);
        return Ni(o, i);
      }
      if (Sa(e)) {
        const o = vo(e);
        return Ni(o, i);
      }
      return Ni(e, i);
    }
    case "average":
      return yr(e, i, "average");
    case "max":
      return yr(e, i, "max");
    case "min":
      return yr(e, i, "min");
    default:
      return e;
  }
}
function Na(e) {
  return Array.isArray(e);
}
function $r(e, t) {
  const n = Math.floor(t), i = e.length;
  if (n < 2 || i <= n) return e;
  const r = new Array(n);
  if (r[0] = e[0], r[n - 1] = e[i - 1], n === 2) return r;
  const o = Na(e[0]), s = (i - 2) / (n - 2);
  if (o) {
    const a = e;
    for (let u = 0; u < n - 2; u++) {
      let f = Math.floor(s * u) + 1, l = Math.min(Math.floor(s * (u + 1)) + 1, i - 1);
      f >= l && (f = Math.min(f, i - 2), l = Math.min(f + 1, i - 1));
      const g = a[f], c = a[l - 1], h = g[0], d = g[1], w = c[2];
      let P = -1 / 0, R = 1 / 0;
      for (let T = f; T < l; T++) {
        const C = a[T], v = C[3], m = C[4];
        m > P && (P = m), v < R && (R = v);
      }
      r[u + 1] = [h, d, w, R, P];
    }
  } else {
    const a = e;
    for (let u = 0; u < n - 2; u++) {
      let f = Math.floor(s * u) + 1, l = Math.min(Math.floor(s * (u + 1)) + 1, i - 1);
      f >= l && (f = Math.min(f, i - 2), l = Math.min(f + 1, i - 1));
      const g = a[f], c = a[l - 1], h = g.timestamp, d = g.open, w = c.close;
      let P = -1 / 0, R = 1 / 0;
      for (let T = f; T < l; T++) {
        const C = a[T], v = C.high, m = C.low;
        v > P && (P = v), m < R && (R = m);
      }
      r[u + 1] = { timestamp: h, open: d, close: w, low: R, high: P };
    }
  }
  return r;
}
function Ta(e) {
  return e ? e.clientWidth : 0;
}
function Aa(e) {
  return e ? e.clientHeight : 0;
}
function mn(e, t, n) {
  return Math.min(n, Math.max(t, e | 0));
}
function nr(e) {
  return Array.isArray(e);
}
var Ti = /* @__PURE__ */ new WeakMap();
var Ai = /* @__PURE__ */ new WeakMap();
function no(e) {
  const t = typeof e == "object" && e !== null ? e : null;
  if (t) {
    const r = Ti.get(t);
    if (r !== void 0) return r;
  }
  let n = Number.NEGATIVE_INFINITY;
  const i = Ie(e);
  for (let r = 0; r < i; r++) {
    const o = Ae(e, r);
    if (!Number.isFinite(o) || o < n)
      return t && Ti.set(t, false), false;
    n = o;
  }
  return t && Ti.set(t, true), true;
}
function Ia(e) {
  const t = Ai.get(e);
  if (t !== void 0) return t;
  let n = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < e.length; i++) {
    const r = e[i], o = nr(r) ? r[0] : r.timestamp;
    if (!Number.isFinite(o) || o < n)
      return Ai.set(e, false), false;
    n = o;
  }
  return Ai.set(e, true), true;
}
function qs(e, t) {
  let n = 0, i = Ie(e);
  for (; n < i; ) {
    const r = n + i >>> 1;
    Ae(e, r) < t ? n = r + 1 : i = r;
  }
  return n;
}
function Zs(e, t) {
  let n = 0, i = Ie(e);
  for (; n < i; ) {
    const r = n + i >>> 1;
    Ae(e, r) <= t ? n = r + 1 : i = r;
  }
  return n;
}
function Pa(e, t) {
  let n = 0, i = e.length;
  for (; n < i; ) {
    const r = n + i >>> 1;
    e[r][0] < t ? n = r + 1 : i = r;
  }
  return n;
}
function Ra(e, t) {
  let n = 0, i = e.length;
  for (; n < i; ) {
    const r = n + i >>> 1;
    e[r][0] <= t ? n = r + 1 : i = r;
  }
  return n;
}
function Da(e, t) {
  let n = 0, i = e.length;
  for (; n < i; ) {
    const r = n + i >>> 1;
    e[r].timestamp < t ? n = r + 1 : i = r;
  }
  return n;
}
function Ea(e, t) {
  let n = 0, i = e.length;
  for (; n < i; ) {
    const r = n + i >>> 1;
    e[r].timestamp <= t ? n = r + 1 : i = r;
  }
  return n;
}
function wo(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e) && "x" in e && "y" in e && typeof e.x == "object" && typeof e.y == "object" && "length" in e.x && "length" in e.y;
}
function Co(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e) && ArrayBuffer.isView(e);
}
function Ba(e, t, n) {
  const i = Ie(e), r = Math.max(0, Math.min(t, i)), o = Math.max(r, Math.min(n, i));
  if (r === 0 && o === i) return e;
  if (o <= r) {
    if (wo(e))
      return { x: [], y: [], ...e.size ? { size: [] } : {} };
    if (Co(e)) {
      if (e instanceof DataView)
        throw new Error("DataView is not supported for InterleavedXYData");
      const s = e.constructor;
      return new s(0);
    }
    return [];
  }
  if (wo(e)) {
    const s = Array.isArray(e.x) ? e.x.slice(r, o) : "subarray" in e.x ? e.x.subarray(r, o) : Array.from(e.x).slice(r, o), a = Array.isArray(e.y) ? e.y.slice(r, o) : "subarray" in e.y ? e.y.subarray(r, o) : Array.from(e.y).slice(r, o), u = { x: s, y: a };
    if (e.size) {
      const f = Array.isArray(e.size) ? e.size.slice(r, o) : "subarray" in e.size ? e.size.subarray(r, o) : Array.from(e.size).slice(r, o);
      u.size = f;
    }
    return u;
  }
  if (Co(e)) {
    if (e instanceof DataView)
      throw new Error("DataView is not supported for InterleavedXYData");
    return e.subarray(r * 2, o * 2);
  }
  return e.slice(r, o);
}
function Ii(e, t, n) {
  const i = Ie(e);
  if (i === 0 || !Number.isFinite(t) || !Number.isFinite(n)) return e;
  if (no(e)) {
    const s = qs(e, t), a = Zs(e, n);
    return s <= 0 && a >= i ? e : Ba(e, s, a);
  }
  const o = [];
  for (let s = 0; s < i; s++) {
    const a = Ae(e, s);
    if (Number.isFinite(a) && a >= t && a <= n) {
      const u = Ue(e, s);
      o.push([a, u]);
    }
  }
  return o;
}
function La(e, t, n) {
  const i = Ie(e);
  if (i === 0) return { start: 0, end: 0 };
  if (!Number.isFinite(t) || !Number.isFinite(n)) return { start: 0, end: i };
  if (!no(e))
    return { start: 0, end: i };
  const o = qs(e, t), s = Zs(e, n), a = mn(o, 0, i), u = mn(s, 0, i);
  return u <= a ? { start: a, end: a } : { start: a, end: u };
}
function Pi(e, t, n) {
  const i = e.length;
  if (i === 0 || !Number.isFinite(t) || !Number.isFinite(n)) return e;
  const r = Ia(e), o = i > 0 && nr(e[0]);
  if (r) {
    const a = o ? Pa(e, t) : Da(e, t), u = o ? Ra(e, n) : Ea(e, n);
    return a <= 0 && u >= i ? e : u <= a ? [] : e.slice(a, u);
  }
  const s = [];
  for (let a = 0; a < i; a++) {
    const u = e[a], f = nr(u) ? u[0] : u.timestamp;
    Number.isFinite(f) && f >= t && f <= n && s.push(u);
  }
  return s;
}
var Mo = (e) => Math.min(1, Math.max(0, e));
var So = (e) => Math.min(255, Math.max(0, e));
var wn = (e) => {
  const t = Number.parseInt(e, 16);
  return Number.isFinite(t) ? t : 0;
};
var Cn = (e) => {
  const t = Number.parseInt(e, 16);
  return Number.isFinite(t) ? t : 0;
};
var _a = (e) => {
  const t = e.trim();
  if (!t.startsWith("#")) return null;
  const n = t.slice(1);
  if (n.length === 3) {
    const i = wn(n[0]), r = wn(n[1]), o = wn(n[2]);
    return [i * 17 / 255, r * 17 / 255, o * 17 / 255, 1];
  }
  if (n.length === 4) {
    const i = wn(n[0]), r = wn(n[1]), o = wn(n[2]), s = wn(n[3]);
    return [i * 17 / 255, r * 17 / 255, o * 17 / 255, s * 17 / 255];
  }
  if (n.length === 6) {
    const i = Cn(n.slice(0, 2)), r = Cn(n.slice(2, 4)), o = Cn(n.slice(4, 6));
    return [i / 255, r / 255, o / 255, 1];
  }
  if (n.length === 8) {
    const i = Cn(n.slice(0, 2)), r = Cn(n.slice(2, 4)), o = Cn(n.slice(4, 6)), s = Cn(n.slice(6, 8));
    return [i / 255, r / 255, o / 255, s / 255];
  }
  return null;
};
var Dn = (e) => {
  const t = e.trim();
  if (t.length === 0) return null;
  if (t.endsWith("%")) {
    const i = Number.parseFloat(t.slice(0, -1));
    return Number.isFinite(i) ? So(i / 100 * 255) : null;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? So(n) : null;
};
var Ua = (e) => {
  const t = e.trim();
  if (t.length === 0) return null;
  if (t.endsWith("%")) {
    const i = Number.parseFloat(t.slice(0, -1));
    return Number.isFinite(i) ? Mo(i / 100) : null;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? Mo(n) : null;
};
var ka = (e) => {
  const t = e.trim(), n = /^(rgba?|RGBA?)\(\s*([^\)]*)\s*\)$/.exec(t);
  if (!n) return null;
  const i = n[1].toLowerCase(), o = n[2].split(",").map((s) => s.trim());
  if (i === "rgb") {
    if (o.length !== 3) return null;
    const s = Dn(o[0]), a = Dn(o[1]), u = Dn(o[2]);
    return s == null || a == null || u == null ? null : [s / 255, a / 255, u / 255, 1];
  }
  if (i === "rgba") {
    if (o.length !== 4) return null;
    const s = Dn(o[0]), a = Dn(o[1]), u = Dn(o[2]), f = Ua(o[3]);
    return s == null || a == null || u == null || f == null ? null : [s / 255, a / 255, u / 255, f];
  }
  return null;
};
var ht = (e) => {
  if (typeof e != "string") return null;
  const t = e.trim();
  if (t.length === 0) return null;
  const n = _a(t);
  if (n) return n;
  const i = ka(t);
  return i || null;
};
var Ga = (e, t = { r: 0, g: 0, b: 0, a: 1 }) => {
  const n = ht(e);
  if (!n) return t;
  const [i, r, o, s] = n;
  return { r: i, g: r, b: o, a: s };
};
var Ri = (e) => typeof e == "number" && Number.isFinite(e) ? e : void 0;
var Yr = (e) => {
  throw new Error(`RenderCoordinator: unreachable value: ${String(e)}`);
};
var za = (e) => Array.isArray(e);
var Va = (e) => za(e) ? { x: e[0], y: e[1] } : { x: e.x, y: e.y };
var Lt = (e) => Math.min(1, Math.max(0, e));
var Wa = (e) => {
  const { canvasWidth: t, canvasHeight: n, devicePixelRatio: i } = e, r = e.left * i, o = t - e.right * i, s = e.top * i, a = n - e.bottom * i, u = mn(Math.floor(r), 0, Math.max(0, t)), f = mn(Math.floor(s), 0, Math.max(0, n)), l = mn(Math.ceil(o), 0, Math.max(0, t)), g = mn(Math.ceil(a), 0, Math.max(0, n)), c = Math.max(0, l - u), h = Math.max(0, g - f);
  return { x: u, y: f, w: c, h };
};
var ri = (e, t) => (e + 1) / 2 * t;
var oi = (e, t) => (1 - e) / 2 * t;
var ir = 24 * 60 * 60 * 1e3;
var Oa = 30 * ir;
var Xa = 365 * ir;
var $a = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var gr = (e, t) => {
  if (typeof e == "number") return Number.isFinite(e) ? e : null;
  if (typeof e != "string") return null;
  const n = e.trim();
  if (n.length === 0) return null;
  if (n.endsWith("%")) {
    const r = Number.parseFloat(n.slice(0, -1));
    return Number.isFinite(r) ? r / 100 * t : null;
  }
  const i = Number.parseFloat(n);
  return Number.isFinite(i) ? i : null;
};
var Ya = (e) => Array.isArray(e);
var Ha = (e, t) => {
  if (e == null) return { inner: 0, outer: t * 0.7 };
  if (Ya(e)) {
    const r = gr(e[0], t), o = gr(e[1], t), s = Math.max(0, Number.isFinite(r) ? r : 0), a = Math.max(s, Number.isFinite(o) ? o : t * 0.7);
    return { inner: s, outer: Math.min(t, a) };
  }
  const n = gr(e, t), i = Math.max(0, Number.isFinite(n) ? n : t * 0.7);
  return { inner: 0, outer: Math.min(t, i) };
};
var qt = (e) => String(Math.trunc(e)).padStart(2, "0");
var qa = (e, t) => {
  if (!Number.isFinite(e)) return null;
  (!Number.isFinite(t) || t < 0) && (t = 0);
  const n = new Date(e);
  if (!Number.isFinite(n.getTime())) return null;
  const i = n.getFullYear(), r = n.getMonth() + 1, o = n.getDate(), s = n.getHours(), a = n.getMinutes();
  return t < ir ? `${qt(s)}:${qt(a)}` : t <= 7 * ir ? `${qt(r)}/${qt(o)} ${qt(s)}:${qt(a)}` : t < 3 * Oa ? `${qt(r)}/${qt(o)}` : t <= Xa ? `${$a[n.getMonth()] ?? qt(r)} ${qt(o)}` : `${i}/${qt(r)}`;
};
var Za = 8;
function ja(e, t = Za) {
  const n = Math.abs(e);
  if (!Number.isFinite(n) || n === 0) return 0;
  for (let i = 0; i <= t; i++) {
    const r = n * 10 ** i, o = Math.round(r), s = Math.abs(r - o), a = 1e-9 * Math.max(1, Math.abs(r));
    if (s <= a) return i;
  }
  return Math.max(0, Math.min(t, 1 - Math.floor(Math.log10(n)) + 1));
}
function Fo(e) {
  const t = ja(e);
  return new Intl.NumberFormat(void 0, { maximumFractionDigits: t });
}
function No(e, t) {
  if (!Number.isFinite(t)) return null;
  const n = Math.abs(t) < 1e-12 ? 0 : t, i = e.format(n);
  return i === "NaN" ? null : i;
}
function Ka(e) {
  return Math.max(
    e + 1,
    Math.round(e * 1.15)
  );
}
var To = 6;
var xr = 4;
var Ja = 5;
function br(e, t) {
  return (e + 1) / 2 * t;
}
function vr(e, t) {
  return (1 - e) / 2 * t;
}
function Di(e, t, n) {
  e.style.fontFamily = n.fontFamily, e.style.fontWeight = t ? "500" : "400", e.style.userSelect = "none", e.style.pointerEvents = "none";
}
function Qa(e, t, n) {
  var z, G, Y;
  const { gpuContext: i, currentOptions: r, xScale: o, yScale: s, xTickValues: a, plotClipRect: u, visibleXRangeMs: f } = n;
  if (!r.series.some((V) => V.type !== "pie") || !e || !t)
    return;
  const g = i.canvas;
  if (!g) return;
  const c = Ta(g), h = Aa(g);
  if (c <= 0 || h <= 0) return;
  const d = g.offsetLeft || 0, w = g.offsetTop || 0, P = br(u.left, c), R = br(u.right, c), T = vr(u.top, h), C = vr(u.bottom, h);
  e.clear();
  const v = r.xAxis.tickLength ?? To, m = C + v + xr + r.theme.fontSize * 0.5, x = r.xAxis.type === "time", b = (() => {
    if (x) return null;
    const V = Ri(r.xAxis.min) ?? o.invert(u.left), j = Ri(r.xAxis.max) ?? o.invert(u.right), K = a.length, J = K === 1 ? 0 : (j - V) / (K - 1);
    return Fo(J);
  })();
  for (let V = 0; V < a.length; V++) {
    const j = a[V], K = o.scale(j), J = br(K, c), oe = a.length === 1 ? "middle" : V === 0 ? "start" : V === a.length - 1 ? "end" : "middle", W = x ? qa(j, f) : No(b, j);
    if (W == null) continue;
    const fe = e.addLabel(W, d + J, w + m, {
      fontSize: r.theme.fontSize,
      color: r.theme.textColor,
      anchor: oe
    });
    Di(fe, false, r.theme);
  }
  const M = Ja, I = r.yAxis.tickLength ?? To, A = Ri(r.yAxis.min) ?? s.invert(u.bottom), S = Ri(r.yAxis.max) ?? s.invert(u.top), p = (S - A) / (M - 1), y = Fo(p), F = P - I - xr, N = [];
  for (let V = 0; V < M; V++) {
    const j = V / (M - 1), K = A + j * (S - A), J = s.scale(K), oe = vr(J, h), W = No(y, K);
    if (W == null) continue;
    const fe = e.addLabel(W, d + F, w + oe, {
      fontSize: r.theme.fontSize,
      color: r.theme.textColor,
      anchor: "end"
    });
    Di(fe, false, r.theme), N.push(fe);
  }
  const D = Ka(r.theme.fontSize), B = ((z = r.xAxis.name) == null ? void 0 : z.trim()) ?? "";
  if (B.length > 0) {
    const V = (P + R) / 2, j = m + r.theme.fontSize * 0.5, oe = ((G = r.dataZoom) == null ? void 0 : G.some((_) => (_ == null ? void 0 : _.type) === "slider")) ?? false ? h - 32 : h, W = (j + oe) / 2, fe = e.addLabel(B, d + V, w + W, {
      fontSize: D,
      color: r.theme.textColor,
      anchor: "middle"
    });
    Di(fe, true, r.theme);
  }
  const E = ((Y = r.yAxis.name) == null ? void 0 : Y.trim()) ?? "";
  if (E.length > 0) {
    const V = N.length === 0 ? 0 : N.reduce((W, fe) => Math.max(W, fe.getBoundingClientRect().width), 0), j = (T + C) / 2, J = F - V - xr - D * 0.5, oe = e.addLabel(E, d + J, w + j, {
      fontSize: D,
      color: r.theme.textColor,
      anchor: "middle",
      rotation: -90
    });
    Di(oe, true, r.theme);
  }
}
function Ao(e) {
  return "offsetLeft" in e;
}
function wr(e, t) {
  return (e + 1) / 2 * t;
}
function Cr(e, t) {
  return (1 - e) / 2 * t;
}
function ec(e, t) {
  const n = ht(e) ?? [0, 0, 0, 1], i = Lt(n[3] * Lt(t)), r = Math.round(Lt(n[0]) * 255), o = Math.round(Lt(n[1]) * 255), s = Math.round(Lt(n[2]) * 255);
  return `rgba(${r}, ${o}, ${s}, ${i})`;
}
function tc(e, t) {
  if (!Number.isFinite(e)) return "";
  if (t == null) return String(e);
  const n = Math.min(20, Math.max(0, Math.floor(t)));
  return e.toFixed(n);
}
var Io = /\{(x|y|value|name)\}/g;
function Po(e, t, n) {
  return Io.lastIndex = 0, e.replace(Io, (i, r) => {
    if (r === "name") return t.name ?? "";
    const o = t[r];
    return o == null ? "" : tc(o, n);
  });
}
function nc(e) {
  switch (e) {
    case "center":
      return "middle";
    case "end":
      return "end";
    case "start":
    default:
      return "start";
  }
}
function ic(e, t, n) {
  var R, T, C;
  const {
    currentOptions: i,
    xScale: r,
    yScale: o,
    canvasCssWidthForAnnotations: s,
    canvasCssHeightForAnnotations: a,
    plotLeftCss: u,
    plotTopCss: f,
    plotWidthCss: l,
    plotHeightCss: g,
    canvas: c
  } = n;
  if (!i.series.some((v) => v.type !== "pie") || !e || !t)
    return;
  if (!c || s <= 0 || a <= 0 || l <= 0 || g <= 0) {
    e.clear();
    return;
  }
  const d = Ao(c) ? c.offsetLeft : 0, w = Ao(c) ? c.offsetTop : 0;
  e.clear();
  const P = i.annotations ?? [];
  if (P.length !== 0)
    for (let v = 0; v < P.length; v++) {
      const m = P[v], x = m.label;
      if (!(x != null || m.type === "text")) continue;
      let M = null, I = null, A = { name: m.id ?? "" };
      switch (m.type) {
        case "lineX": {
          const W = r.scale(m.x);
          M = wr(W, s), I = f, A = { ...A, x: m.x, value: m.x };
          break;
        }
        case "lineY": {
          const W = o.scale(m.y), fe = Cr(W, a);
          M = u, I = fe - 8, A = { ...A, y: m.y, value: m.y };
          break;
        }
        case "point": {
          const W = r.scale(m.x), fe = o.scale(m.y), _ = wr(W, s), H = Cr(fe, a);
          M = _, I = H, A = { ...A, x: m.x, y: m.y, value: m.y };
          break;
        }
        case "text": {
          if (m.position.space === "data") {
            const W = r.scale(m.position.x), fe = o.scale(m.position.y), _ = wr(W, s), H = Cr(fe, a);
            M = _, I = H, A = { ...A, x: m.position.x, y: m.position.y, value: m.position.y };
          } else {
            const W = u + m.position.x * l, fe = f + m.position.y * g;
            M = W, I = fe, A = { ...A, x: m.position.x, y: m.position.y, value: m.position.y };
          }
          break;
        }
        default:
          Yr(m);
      }
      if (M == null || I == null || !Number.isFinite(M) || !Number.isFinite(I))
        continue;
      const S = 200;
      if (M < u - S || M > u + l + S || I < f - S || I > f + g + S)
        continue;
      const p = ((R = x == null ? void 0 : x.offset) == null ? void 0 : R[0]) ?? 0, y = ((T = x == null ? void 0 : x.offset) == null ? void 0 : T[1]) ?? 0, F = M + p, N = I + y, D = (x == null ? void 0 : x.text) ?? (x != null && x.template ? Po(x.template, A, x.decimals) : x ? (() => {
        const W = m.type === "lineX" ? "x={x}" : m.type === "lineY" ? "y={y}" : m.type === "point" ? "({x}, {y})" : m.type === "text" ? m.text : "";
        return W.includes("{") ? Po(W, A, x.decimals) : W;
      })() : m.type === "text" ? m.text : ""), B = typeof D == "string" ? D.trim() : "";
      if (B.length === 0) continue;
      const E = nc(x == null ? void 0 : x.anchor), z = ((C = m.style) == null ? void 0 : C.color) ?? i.theme.textColor, G = i.theme.fontSize, Y = x == null ? void 0 : x.background, V = (Y == null ? void 0 : Y.color) != null ? ec(Y.color, Y.opacity ?? 1) : void 0, j = (() => {
        const W = Y == null ? void 0 : Y.padding;
        return typeof W == "number" && Number.isFinite(W) ? [W, W, W, W] : Array.isArray(W) && W.length === 4 && W.every((fe) => typeof fe == "number" && Number.isFinite(fe)) ? [W[0], W[1], W[2], W[3]] : Y ? [2, 4, 2, 4] : void 0;
      })(), K = typeof (Y == null ? void 0 : Y.borderRadius) == "number" && Number.isFinite(Y.borderRadius) ? Y.borderRadius : void 0, J = {
        x: d + F,
        y: w + N,
        ...V ? {
          background: {
            backgroundColor: V,
            ...j ? { padding: j } : {},
            ...K != null ? { borderRadius: K } : {}
          }
        } : {}
      }, oe = e.addLabel(B, J.x, J.y, {
        fontSize: G,
        color: z,
        anchor: E
      });
      if (J.background) {
        if (oe.style.backgroundColor = J.background.backgroundColor, oe.style.display = "inline-block", oe.style.boxSizing = "border-box", J.background.padding) {
          const [W, fe, _, H] = J.background.padding;
          oe.style.padding = `${W}px ${fe}px ${_}px ${H}px`;
        }
        J.background.borderRadius != null && (oe.style.borderRadius = `${J.background.borderRadius}px`);
      }
    }
}
var Ro = 20;
var rc = 0.01;
var oc = 0.2;
var Mr = 4;
function sc(e, t) {
  let n = 0, i = Ie(e);
  for (; n < i; ) {
    const r = n + i >>> 1;
    Ae(e, r) < t ? n = r + 1 : i = r;
  }
  return n;
}
function ac(e, t, n) {
  return e >= n.left && e <= n.right && t >= n.top && t <= n.bottom;
}
var Sr = (e) => Math.min(1, Math.max(0, e));
var cc = (e) => {
  const t = e.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!t) return null;
  const n = Number(t[1]) / 100;
  return Number.isFinite(n) ? n : null;
};
var lc = (e) => {
  if (typeof e != "string") return "";
  const t = e.trim();
  return t.length > 0 ? t : "";
};
var js = (e) => Array.isArray(e);
var uc = (e) => {
  if (js(e)) {
    const n = e[2];
    return typeof n == "number" && Number.isFinite(n) ? n : null;
  }
  const t = e.size;
  return typeof t == "number" && Number.isFinite(t) ? t : null;
};
var fc = (e) => js(e) ? e : [e.x, e.y, e.size];
var dc = (e, t) => {
  try {
    const n = e(t);
    return typeof n == "number" && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};
var Fr = (e, t) => {
  const n = uc(t);
  if (n != null) return Math.max(0, n);
  const i = e.symbolSize;
  if (typeof i == "number")
    return Number.isFinite(i) ? Math.max(0, i) : Mr;
  if (typeof i == "function") {
    const r = dc(i, fc(t));
    return r == null ? Mr : Math.max(0, r);
  }
  return Mr;
};
function mc(e) {
  const t = /* @__PURE__ */ new Map(), n = new Array(e.length), i = new Array(e.length);
  let r = 0;
  for (let o = 0; o < e.length; o++) {
    const s = lc(e[o].stack);
    if (i[o] = s, s !== "") {
      const a = t.get(s);
      if (a !== void 0)
        n[o] = a;
      else {
        const u = r++;
        t.set(s, u), n[o] = u;
      }
    } else
      n[o] = r++;
  }
  return {
    clusterIndexBySeries: n,
    clusterCount: Math.max(1, r),
    stackIdBySeries: i
  };
}
function pc(e) {
  const t = [];
  for (let i = 0; i < e.length; i++) {
    const r = e[i].data, o = Ie(r);
    for (let s = 0; s < o; s++) {
      const a = Ae(r, s);
      Number.isFinite(a) && t.push(a);
    }
  }
  if (t.length < 2) return 1;
  t.sort((i, r) => i - r);
  let n = Number.POSITIVE_INFINITY;
  for (let i = 1; i < t.length; i++) {
    const r = t[i] - t[i - 1];
    r > 0 && r < n && (n = r);
  }
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function hc(e, t, n) {
  if (Number.isFinite(n) && n > 0) {
    const s = t.scale(0), a = t.scale(0 + n), u = Math.abs(a - s);
    if (Number.isFinite(u) && u > 0) return u;
  }
  const i = [];
  for (let o = 0; o < e.length; o++) {
    const s = e[o].data, a = Ie(s);
    for (let u = 0; u < a; u++) {
      const f = Ae(s, u);
      if (!Number.isFinite(f)) continue;
      const l = t.scale(f);
      Number.isFinite(l) && i.push(l);
    }
  }
  if (i.length < 2) return 0;
  i.sort((o, s) => o - s);
  let r = Number.POSITIVE_INFINITY;
  for (let o = 1; o < i.length; o++) {
    const s = i[o] - i[o - 1];
    s > 0 && s < r && (r = s);
  }
  return Number.isFinite(r) && r > 0 ? r : 0;
}
var yc = (e) => {
  let t, n, i;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    t === void 0 && o.barWidth !== void 0 && (t = o.barWidth), n === void 0 && o.barGap !== void 0 && (n = o.barGap), i === void 0 && o.barCategoryGap !== void 0 && (i = o.barCategoryGap);
  }
  return { barWidth: t, barGap: n, barCategoryGap: i };
};
function Ks(e, t) {
  const n = mc(e), i = n.clusterCount, r = pc(e), o = hc(e, t, r), s = yc(e), a = Sr(s.barGap ?? rc), u = Sr(s.barCategoryGap ?? oc), f = Math.max(0, o * (1 - u)), l = i + Math.max(0, i - 1) * a, g = l > 0 ? f / l : 0;
  let c = 0;
  const h = s.barWidth;
  if (typeof h == "number")
    c = Math.max(0, h), c = Math.min(c, g);
  else if (typeof h == "string") {
    const P = cc(h);
    c = P == null ? 0 : g * Sr(P);
  }
  c > 0 || (c = g);
  const d = c * a, w = i * c + Math.max(0, i - 1) * d;
  return {
    categoryStep: r,
    categoryWidthPx: o,
    barWidthPx: c,
    gapPx: d,
    clusterWidthPx: w,
    clusterSlots: n
  };
}
var Nr = (e) => {
  let t = Number.POSITIVE_INFINITY, n = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < e.length; i++) {
    const r = e[i].data, o = Ie(r);
    for (let s = 0; s < o; s++) {
      const a = Ue(r, s);
      Number.isFinite(a) && (a < t && (t = a), a > n && (n = a));
    }
  }
  return !Number.isFinite(t) || !Number.isFinite(n) || t <= 0 && 0 <= n ? 0 : Math.abs(t) < Math.abs(n) ? t : n;
};
function gc(e, t) {
  let n = 0;
  for (let i = 0; i < e.length; i++) {
    const r = e[i].data, o = Ie(r);
    for (let s = 0; s < o; s++) {
      const a = Ue(r, s);
      if (!Number.isFinite(a)) continue;
      const u = t.scale(a);
      Number.isFinite(u) && u > n && (n = u);
    }
  }
  return Math.max(0, n);
}
function xc(e, t, n) {
  const i = t.invert(n), r = t.invert(0), o = Math.min(i, r), s = Math.max(i, r);
  let a;
  !Number.isFinite(o) || !Number.isFinite(s) ? a = Nr(e) : o <= 0 && 0 <= s ? a = 0 : o > 0 ? a = o : s < 0 ? a = s : a = Nr(e);
  let u = t.scale(a);
  return Number.isFinite(u) || (a = Nr(e), u = t.scale(a)), Number.isFinite(u) || (a = 0, u = t.scale(0)), { baselineDomain: a, baselinePx: u };
}
function bc(e, t, n, i) {
  return Number.isFinite(t) && t > 0 && Number.isFinite(e) ? Math.round(e / t) : Number.isFinite(i) && i > 0 && Number.isFinite(n) ? Math.round(n / i) : Math.round(n * 1e6);
}
function rr(e, t, n, i, r, o = Ro) {
  var R;
  if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
  const s = Number.isFinite(o) ? Math.max(0, o) : Ro, a = s * s, u = i.invert(t);
  if (!Number.isFinite(u)) return null;
  let f = -1, l = -1, g = null, c = Number.POSITIVE_INFINITY;
  const h = [], d = [];
  for (let T = 0; T < e.length; T++) {
    const C = e[T];
    (C == null ? void 0 : C.type) === "bar" && C.visible !== false && (h.push(C), d.push(T));
  }
  if (h.length > 0) {
    const T = Ks(h, i);
    if (T.barWidthPx > 0 && T.clusterWidthPx >= 0) {
      const C = gc(h, r), { baselineDomain: v, baselinePx: m } = xc(h, r, C), { clusterSlots: x, barWidthPx: b, gapPx: M, clusterWidthPx: I, categoryWidthPx: A, categoryStep: S } = T, p = /* @__PURE__ */ new Map();
      let y = null;
      for (let F = 0; F < h.length; F++) {
        const N = h[F], D = d[F] ?? -1;
        if (D < 0) continue;
        const B = N.data, E = Ie(B), z = x.clusterIndexBySeries[F] ?? 0, G = x.stackIdBySeries[F] ?? "";
        for (let Y = 0; Y < E; Y++) {
          const V = Ae(B, Y), j = Ue(B, Y);
          if (!Number.isFinite(V) || !Number.isFinite(j)) continue;
          const K = i.scale(V);
          if (!Number.isFinite(K)) continue;
          const J = K - I / 2 + z * (b + M), oe = J + b;
          let W = v, fe = j;
          if (G !== "") {
            let ce = p.get(G);
            ce || (ce = /* @__PURE__ */ new Map(), p.set(G, ce));
            const me = bc(K, A, V, S);
            let q = ce.get(me);
            q || (q = { posSum: v, negSum: v }, ce.set(me, q)), j >= 0 ? (W = q.posSum, fe = W + j, q.posSum = fe) : (W = q.negSum, fe = W + j, q.negSum = fe);
          } else
            W = v, fe = j;
          const _ = G !== "" ? r.scale(W) : m, H = r.scale(fe);
          if (!Number.isFinite(_) || !Number.isFinite(H)) continue;
          const X = {
            left: J,
            right: oe,
            top: Math.min(_, H),
            bottom: Math.max(_, H)
          };
          if (!ac(t, n, X)) continue;
          (y === null || X.top < y.top || X.top === y.top && D > y.seriesIndex) && (y = { seriesIndex: D, dataIndex: Y, top: X.top });
        }
      }
      if (y) {
        const F = (R = e[y.seriesIndex]) == null ? void 0 : R.data;
        if (F) {
          const N = Ae(F, y.dataIndex), D = Ue(F, y.dataIndex), B = at(F, y.dataIndex), E = B !== void 0 ? [N, D, B] : [N, D];
          return {
            seriesIndex: y.seriesIndex,
            dataIndex: y.dataIndex,
            point: E,
            distance: 0
          };
        }
      }
    }
  }
  const w = [], P = [];
  for (let T = 0; T < e.length; T++) {
    const C = e[T];
    C.type === "pie" || C.type === "candlestick" || C.visible !== false && (w.push(C), P.push(T));
  }
  for (let T = 0; T < w.length; T++) {
    const C = w[T], v = P[T] ?? -1;
    if (v < 0) continue;
    const m = C.data, x = Ie(m);
    if (x === 0) continue;
    const M = C.type === "scatter" ? C : null;
    if (no(m)) {
      const A = sc(m, u);
      for (let S = A; S < x; S++) {
        const p = Ae(m, S), y = Ue(m, S);
        if (!Number.isFinite(p) || !Number.isFinite(y)) continue;
        const F = i.scale(p), N = r.scale(y);
        if (!Number.isFinite(F) || !Number.isFinite(N)) continue;
        const D = F - t, B = N - n, E = D * D + B * B;
        if (D * D > c) break;
        let G = a;
        if (M) {
          const V = at(m, S), K = Fr(M, V !== void 0 ? [p, y, V] : [p, y]), J = s + K;
          G = J * J;
        }
        if (E > G) continue;
        if (E < c || E === c && (g === null || v < f || v === f && S < l)) {
          c = E, f = v, l = S;
          const V = at(m, S);
          g = V !== void 0 ? [p, y, V] : [p, y];
        }
      }
      for (let S = A - 1; S >= 0; S--) {
        const p = Ae(m, S), y = Ue(m, S);
        if (!Number.isFinite(p) || !Number.isFinite(y)) continue;
        const F = i.scale(p), N = r.scale(y);
        if (!Number.isFinite(F) || !Number.isFinite(N)) continue;
        const D = F - t, B = N - n, E = D * D + B * B;
        if (D * D > c) break;
        let G = a;
        if (M) {
          const V = at(m, S), K = Fr(M, V !== void 0 ? [p, y, V] : [p, y]), J = s + K;
          G = J * J;
        }
        if (E > G) continue;
        if (E < c || E === c && (g === null || v < f || v === f && S < l)) {
          c = E, f = v, l = S;
          const V = at(m, S);
          g = V !== void 0 ? [p, y, V] : [p, y];
        }
      }
    } else
      for (let A = 0; A < x; A++) {
        const S = Ae(m, A), p = Ue(m, A);
        if (!Number.isFinite(S) || !Number.isFinite(p)) continue;
        const y = i.scale(S), F = r.scale(p);
        if (!Number.isFinite(y) || !Number.isFinite(F)) continue;
        const N = y - t, D = F - n, B = N * N + D * D;
        let E = a;
        if (M) {
          const G = at(m, A), V = Fr(M, G !== void 0 ? [S, p, G] : [S, p]), j = s + V;
          E = j * j;
        }
        if (B > E) continue;
        if (B < c || B === c && (g === null || v < f || v === f && A < l)) {
          c = B, f = v, l = A;
          const G = at(m, A);
          g = G !== void 0 ? [S, p, G] : [S, p];
        }
      }
  }
  return g === null || !Number.isFinite(c) ? null : {
    seriesIndex: f,
    dataIndex: l,
    point: g,
    distance: Math.sqrt(c)
  };
}
var vc = 5;
var wc = 1;
var Cc = 4;
function Mc(e, t) {
  var w;
  const {
    currentOptions: n,
    xScale: i,
    yScale: r,
    gridArea: o,
    xTickCount: s,
    hasCartesianSeries: a,
    effectivePointer: u,
    interactionScales: f,
    seriesForRender: l,
    withAlpha: g
  } = t, c = n.gridLines, h = c.show && c.horizontal.show ? c.horizontal.count : 0, d = c.show && c.vertical.show ? c.vertical.count : 0;
  if (h === 0 && d === 0)
    e.gridRenderer.prepare(o, { lineCount: { horizontal: 0, vertical: 0 } });
  else if (h > 0 && d > 0 && c.horizontal.color !== c.vertical.color)
    e.gridRenderer.prepare(o, {
      lineCount: { horizontal: h, vertical: 0 },
      color: c.horizontal.color
    }), e.gridRenderer.prepare(o, {
      lineCount: { horizontal: 0, vertical: d },
      color: c.vertical.color,
      append: true
    });
  else {
    const P = h > 0 ? c.horizontal.color : c.vertical.color;
    e.gridRenderer.prepare(o, {
      lineCount: { horizontal: h, vertical: d },
      color: P
    });
  }
  if (a && (e.xAxisRenderer.prepare(
    n.xAxis,
    i,
    "x",
    o,
    n.theme.axisLineColor,
    n.theme.axisTickColor,
    s
  ), e.yAxisRenderer.prepare(
    n.yAxis,
    r,
    "y",
    o,
    n.theme.axisLineColor,
    n.theme.axisTickColor,
    vc
  )), u.hasPointer && u.isInGrid) {
    const P = {
      showX: true,
      // Sync has no meaningful y, so avoid horizontal line.
      showY: u.source !== "sync",
      color: g(n.theme.axisLineColor, 0.6),
      lineWidth: wc
    };
    e.crosshairRenderer.prepare(u.x, u.y, o, P), e.crosshairRenderer.setVisible(true);
  } else
    e.crosshairRenderer.setVisible(false);
  if (u.source === "mouse" && u.hasPointer && u.isInGrid)
    if (f) {
      const P = rr(
        l,
        u.gridX,
        u.gridY,
        f.xScale,
        f.yScale
      );
      if (P) {
        const { x: R, y: T } = Va(P.point), C = f.xScale.scale(R), v = f.yScale.scale(T);
        if (Number.isFinite(C) && Number.isFinite(v)) {
          const m = o.left + C, x = o.top + v, b = Wa(o), M = {
            centerDeviceX: m * o.devicePixelRatio,
            centerDeviceY: x * o.devicePixelRatio,
            devicePixelRatio: o.devicePixelRatio,
            canvasWidth: o.canvasWidth,
            canvasHeight: o.canvasHeight,
            scissor: b
          }, I = ((w = n.series[P.seriesIndex]) == null ? void 0 : w.color) ?? "#888";
          e.highlightRenderer.prepare(M, I, Cc), e.highlightRenderer.setVisible(true);
        } else
          e.highlightRenderer.setVisible(false);
      } else
        e.highlightRenderer.setVisible(false);
    } else
      e.highlightRenderer.setVisible(false);
  else
    e.highlightRenderer.setVisible(false);
}
function Do(e, t, n) {
  const i = ht(e ?? n) ?? ht(n) ?? [1, 1, 1, 1], r = t == null ? 1 : Lt(t);
  return [Lt(i[0]), Lt(i[1]), Lt(i[2]), Lt(i[3] * r)];
}
function Sc(e, t) {
  const n = ht(e) ?? [0, 0, 0, 1], i = Lt(n[3] * Lt(t)), r = Math.round(Lt(n[0]) * 255), o = Math.round(Lt(n[1]) * 255), s = Math.round(Lt(n[2]) * 255);
  return `rgba(${r}, ${o}, ${s}, ${i})`;
}
function Fc(e, t) {
  if (!Number.isFinite(e)) return "";
  if (t == null) return String(e);
  const n = Math.min(20, Math.max(0, Math.floor(t)));
  return e.toFixed(n);
}
function Eo(e, t, n) {
  const i = /\{(x|y|value|name)\}/g;
  return e.replace(i, (r, o) => {
    if (o === "name") return t.name ?? "";
    const s = t[o];
    return s == null ? "" : Fc(s, n);
  });
}
function Nc(e) {
  switch (e) {
    case "center":
      return "middle";
    case "end":
      return "end";
    case "start":
    default:
      return "start";
  }
}
function Tc(e) {
  var C, v, m, x, b, M, I, A, S, p, y, F, N, D;
  const {
    annotations: t,
    xScale: n,
    yScale: i,
    plotBounds: r,
    canvasCssWidth: o,
    canvasCssHeight: s,
    theme: a,
    offsetX: u = 0,
    offsetY: f = 0
  } = e, { leftCss: l, topCss: g, widthCss: c, heightCss: h } = r, d = [], w = [], P = [], R = [], T = [];
  if (t.length === 0 || o <= 0 || s <= 0 || c <= 0 || h <= 0)
    return { linesBelow: d, linesAbove: w, markersBelow: P, markersAbove: R, labels: T };
  for (let B = 0; B < t.length; B++) {
    const E = t[B], z = E.layer ?? "aboveSeries", G = z === "belowSeries" ? d : w, Y = z === "belowSeries" ? P : R, V = (C = E.style) == null ? void 0 : C.color, j = (v = E.style) == null ? void 0 : v.opacity, K = typeof ((m = E.style) == null ? void 0 : m.lineWidth) == "number" && Number.isFinite(E.style.lineWidth) ? Math.max(0, E.style.lineWidth) : 1, J = (x = E.style) == null ? void 0 : x.lineDash, oe = Do(V, j, a.textColor);
    switch (E.type) {
      case "lineX": {
        const ve = n.scale(E.x), Te = ri(ve, o);
        if (!Number.isFinite(Te)) break;
        G.push({
          axis: "vertical",
          positionCssPx: Te,
          lineWidth: K,
          lineDash: J,
          rgba: oe
        });
        break;
      }
      case "lineY": {
        const ve = i.scale(E.y), Te = oi(ve, s);
        if (!Number.isFinite(Te)) break;
        G.push({
          axis: "horizontal",
          positionCssPx: Te,
          lineWidth: K,
          lineDash: J,
          rgba: oe
        });
        break;
      }
      case "point": {
        const ve = n.scale(E.x), Te = i.scale(E.y), Xe = ri(ve, o), He = oi(Te, s);
        if (!Number.isFinite(Xe) || !Number.isFinite(He)) break;
        const ke = typeof ((b = E.marker) == null ? void 0 : b.size) == "number" && Number.isFinite(E.marker.size) ? Math.max(1, E.marker.size) : 6, bt = ((I = (M = E.marker) == null ? void 0 : M.style) == null ? void 0 : I.color) ?? ((A = E.style) == null ? void 0 : A.color), vt = ((p = (S = E.marker) == null ? void 0 : S.style) == null ? void 0 : p.opacity) ?? ((y = E.style) == null ? void 0 : y.opacity), We = Do(bt, vt, a.textColor);
        Y.push({
          xCssPx: Xe,
          yCssPx: He,
          sizeCssPx: ke,
          fillRgba: We
        });
        break;
      }
      case "text":
        break;
      default:
        Yr(E);
    }
    const W = E.label;
    if (!(W != null || E.type === "text")) continue;
    let _ = null, H = null, X = { name: E.id ?? "" };
    switch (E.type) {
      case "lineX": {
        const ve = n.scale(E.x);
        _ = ri(ve, o), H = g, X = { ...X, x: E.x, value: E.x };
        break;
      }
      case "lineY": {
        const ve = i.scale(E.y), Te = oi(ve, s);
        _ = l, H = Te - 8, X = { ...X, y: E.y, value: E.y };
        break;
      }
      case "point": {
        const ve = n.scale(E.x), Te = i.scale(E.y), Xe = ri(ve, o), He = oi(Te, s);
        _ = Xe, H = He, X = { ...X, x: E.x, y: E.y, value: E.y };
        break;
      }
      case "text": {
        if (E.position.space === "data") {
          const ve = n.scale(E.position.x), Te = i.scale(E.position.y), Xe = ri(ve, o), He = oi(Te, s);
          _ = Xe, H = He, X = { ...X, x: E.position.x, y: E.position.y, value: E.position.y };
        } else {
          const ve = l + E.position.x * c, Te = g + E.position.y * h;
          _ = ve, H = Te, X = { ...X, x: E.position.x, y: E.position.y, value: E.position.y };
        }
        break;
      }
      default:
        Yr(E);
    }
    if (_ == null || H == null || !Number.isFinite(_) || !Number.isFinite(H))
      continue;
    const pe = 200;
    if (_ < r.leftCss - pe || _ > r.leftCss + r.widthCss + pe || H < r.topCss - pe || H > r.topCss + r.heightCss + pe)
      continue;
    const ce = ((F = W == null ? void 0 : W.offset) == null ? void 0 : F[0]) ?? 0, me = ((N = W == null ? void 0 : W.offset) == null ? void 0 : N[1]) ?? 0, q = _ + ce, se = H + me, te = (W == null ? void 0 : W.text) ?? (W != null && W.template ? Eo(W.template, X, W.decimals) : W ? (() => {
      const ve = E.type === "lineX" ? "x={x}" : E.type === "lineY" ? "y={y}" : E.type === "point" ? "({x}, {y})" : E.type === "text" ? E.text : "";
      return ve.includes("{") ? Eo(ve, X, W.decimals) : ve;
    })() : E.type === "text" ? E.text : ""), ee = typeof te == "string" ? te.trim() : "";
    if (ee.length === 0) continue;
    const be = Nc(W == null ? void 0 : W.anchor), le = ((D = E.style) == null ? void 0 : D.color) ?? a.textColor, ge = a.fontSize, ye = W == null ? void 0 : W.background, Be = (ye == null ? void 0 : ye.color) != null ? Sc(ye.color, ye.opacity ?? 1) : void 0, Le = (() => {
      const ve = ye == null ? void 0 : ye.padding;
      return typeof ve == "number" && Number.isFinite(ve) ? [ve, ve, ve, ve] : Array.isArray(ve) && ve.length === 4 && ve.every((Te) => typeof Te == "number" && Number.isFinite(Te)) ? [ve[0], ve[1], ve[2], ve[3]] : ye ? [2, 4, 2, 4] : void 0;
    })(), st = typeof (ye == null ? void 0 : ye.borderRadius) == "number" && Number.isFinite(ye.borderRadius) ? ye.borderRadius : void 0, rt = {
      text: ee,
      x: u + q,
      y: f + se,
      anchor: be,
      color: le,
      fontSize: ge,
      ...Be ? {
        background: {
          backgroundColor: Be,
          ...Le ? { padding: Le } : {},
          ...st != null ? { borderRadius: st } : {}
        }
      } : {}
    };
    T.push(rt);
  }
  return {
    linesBelow: d,
    linesAbove: w,
    markersBelow: P,
    markersAbove: R,
    labels: T
  };
}
function Js(e) {
  return Math.max(0, Math.min(1, e));
}
function Ac(e) {
  return e.type === "area" || e.type === "line" && !!e.areaStyle;
}
function Ic(e, t) {
  const {
    currentOptions: n,
    seriesForRender: i,
    xScale: r,
    yScale: o,
    gridArea: s,
    dataStore: a,
    appendedGpuThisFrame: u,
    gpuSeriesKindByIndex: f,
    zoomState: l,
    visibleXDomain: g,
    introPhase: c,
    introProgress01: h,
    withAlpha: d,
    maxRadiusCss: w
  } = t, P = n.yAxis.min ?? n.yAxis.min ?? 0, R = [], T = c === "running" ? Js(h) : 1;
  for (let m = 0; m < i.length; m++) {
    const x = i[m];
    switch (x.type) {
      case "area": {
        const b = x.baseline ?? P;
        e.areaRenderers[m].prepare(x, x.data, r, o, b);
        break;
      }
      case "line": {
        const b = (() => {
          if (n.xAxis.type !== "time") return 0;
          const S = x.data, p = Ie(S);
          for (let y = 0; y < p; y++) {
            const F = Ae(S, y);
            if (Number.isFinite(F)) return F;
          }
          return 0;
        })();
        u.has(m) || a.setSeries(m, x.data, { xOffset: b });
        const M = a.getSeriesBuffer(m);
        e.lineRenderers[m].prepare(
          x,
          M,
          r,
          o,
          b,
          s.devicePixelRatio,
          s.canvasWidth,
          s.canvasHeight
        );
        const I = (l == null ? void 0 : l.getRange()) ?? null;
        if ((I == null || Number.isFinite(I.start) && Number.isFinite(I.end) && I.start <= 0 && I.end >= 100) && x.sampling === "none" ? f[m] = "fullRawLine" : f[m] = "other", x.areaStyle) {
          const S = {
            type: "area",
            name: x.name,
            rawData: x.data,
            data: x.data,
            color: x.areaStyle.color,
            areaStyle: x.areaStyle,
            sampling: x.sampling,
            samplingThreshold: x.samplingThreshold
          };
          e.areaRenderers[m].prepare(S, S.data, r, o, P);
        }
        break;
      }
      case "bar": {
        R.push(x);
        break;
      }
      case "scatter": {
        if (x.mode === "density") {
          const b = x.rawData ?? x.data, M = La(b, g.min, g.max);
          u.has(m) || a.setSeries(m, b);
          const I = a.getSeriesBuffer(m), A = a.getSeriesPointCount(m);
          e.scatterDensityRenderers[m].prepare(
            x,
            I,
            A,
            M.start,
            M.end,
            r,
            o,
            s,
            x.rawBounds
          ), f[m] = "other";
        } else {
          const b = T < 1 ? { ...x, color: d(x.color, T) } : x;
          e.scatterRenderers[m].prepare(b, x.data, r, o, s);
        }
        break;
      }
      case "pie": {
        if (T < 1 && w > 0) {
          const b = Ha(x.radius, w), M = Math.max(0, b.inner) * T, I = Math.max(M, b.outer) * T, A = { ...x, radius: [M, I] };
          e.pieRenderers[m].prepare(A, s);
          break;
        }
        e.pieRenderers[m].prepare(x, s);
        break;
      }
      case "candlestick": {
        e.candlestickRenderers[m].prepare(x, x.data, r, o, s, n.theme.backgroundColor);
        break;
      }
      default: {
        const b = x;
        throw new Error(`Unhandled series type: ${b.type}`);
      }
    }
  }
  const C = i.map((m, x) => ({ series: m, originalIndex: x })).filter(({ series: m }) => m.visible !== false), v = R.filter((m) => m.visible !== false);
  return {
    visibleSeriesForRender: C,
    barSeriesConfigs: R,
    visibleBarSeriesConfigs: v
  };
}
function Pc(e, t, n) {
  for (let i = 0; i < t.length; i++) {
    const r = t[i];
    r.visible !== false && r.type === "scatter" && r.mode === "density" && e.scatterDensityRenderers[i].encodeCompute(n);
  }
}
function Rc(e, t, n, i) {
  const {
    hasCartesianSeries: r,
    gridArea: o,
    mainPass: s,
    plotScissor: a,
    introPhase: u,
    introProgress01: f,
    referenceLineBelowCount: l,
    markerBelowCount: g
  } = n, { visibleSeriesForRender: c } = i, h = u === "running" ? Js(f) : 1;
  for (let d = 0; d < c.length; d++) {
    const { series: w, originalIndex: P } = c[d];
    w.type === "pie" && e.pieRenderers[P].render(s);
  }
  r && a.w > 0 && a.h > 0 && (l > 0 || g > 0) && (s.setScissorRect(a.x, a.y, a.w, a.h), l > 0 && t.referenceLineRenderer.render(s, 0, l), g > 0 && t.annotationMarkerRenderer.render(s, 0, g), s.setScissorRect(0, 0, o.canvasWidth, o.canvasHeight));
  for (let d = 0; d < c.length; d++) {
    const { series: w, originalIndex: P } = c[d];
    if (Ac(w))
      if (h < 1) {
        const R = mn(Math.floor(a.w * h), 0, a.w);
        R > 0 && a.h > 0 && (s.setScissorRect(a.x, a.y, R, a.h), e.areaRenderers[P].render(s), s.setScissorRect(0, 0, o.canvasWidth, o.canvasHeight));
      } else
        s.setScissorRect(a.x, a.y, a.w, a.h), e.areaRenderers[P].render(s), s.setScissorRect(0, 0, o.canvasWidth, o.canvasHeight);
  }
  a.w > 0 && a.h > 0 && (s.setScissorRect(a.x, a.y, a.w, a.h), e.barRenderer.render(s), s.setScissorRect(0, 0, o.canvasWidth, o.canvasHeight));
  for (let d = 0; d < c.length; d++) {
    const { series: w, originalIndex: P } = c[d];
    w.type === "candlestick" && e.candlestickRenderers[P].render(s);
  }
  for (let d = 0; d < c.length; d++) {
    const { series: w, originalIndex: P } = c[d];
    w.type === "scatter" && (w.mode === "density" ? e.scatterDensityRenderers[P].render(s) : e.scatterRenderers[P].render(s));
  }
  for (let d = 0; d < c.length; d++) {
    const { series: w, originalIndex: P } = c[d];
    if (w.type === "line")
      if (h < 1) {
        const R = mn(Math.floor(a.w * h), 0, a.w);
        R > 0 && a.h > 0 && (s.setScissorRect(a.x, a.y, R, a.h), e.lineRenderers[P].render(s), s.setScissorRect(0, 0, o.canvasWidth, o.canvasHeight));
      } else
        s.setScissorRect(a.x, a.y, a.w, a.h), e.lineRenderers[P].render(s), s.setScissorRect(0, 0, o.canvasWidth, o.canvasHeight);
  }
}
function Dc(e, t) {
  const {
    hasCartesianSeries: n,
    gridArea: i,
    overlayPass: r,
    plotScissor: o,
    referenceLineBelowCount: s,
    referenceLineAboveCount: a,
    markerBelowCount: u,
    markerAboveCount: f
  } = t;
  if (n && o.w > 0 && o.h > 0 && (a > 0 || f > 0)) {
    const g = s, c = u;
    r.setScissorRect(o.x, o.y, o.w, o.h), a > 0 && e.referenceLineRendererMsaa.render(r, g, a), f > 0 && e.annotationMarkerRendererMsaa.render(r, c, f), r.setScissorRect(0, 0, i.canvasWidth, i.canvasHeight);
  }
}
var or = `// grid.wgsl
// Minimal grid line shader:
// - Vertex input: vec2<f32> position in clip-space coordinates
// - Uniforms: identity transform + solid RGBA color

struct VSUniforms {
  transform: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct FSUniforms {
  color: vec4<f32>,
};

@group(0) @binding(1) var<uniform> fsUniforms: FSUniforms;

struct VSIn {
  @location(0) position: vec2<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn) -> VSOut {
  var out: VSOut;
  out.clipPosition = vsUniforms.transform * vec4<f32>(in.position, 0.0, 1.0);
  return out;
}

@fragment
fn fsMain() -> @location(0) vec4<f32> {
  return fsUniforms.color;
}
`;
var Ec = "vsMain";
var Bc = "fsMain";
var Lc = (e) => Number.isInteger(e) && e > 0 && (e & e - 1) === 0;
var _c = (e, t) => {
  if (!Number.isFinite(e) || e < 0)
    throw new Error(`alignTo(value): value must be a finite non-negative number. Received: ${String(e)}`);
  if (!Lc(t))
    throw new Error(`alignTo(alignment): alignment must be a positive power of two. Received: ${String(t)}`);
  return Math.floor(e) + t - 1 & ~(t - 1);
};
var Bo = (e, t, n) => {
  if (n && n.device !== e)
    throw new Error("getStageModule(pipelineCache): cache.device must match the provided GPUDevice.");
  return "module" in t ? {
    module: t.module,
    entryPoint: t.entryPoint || "",
    constants: t.constants
  } : {
    module: Qs(e, t.code, t.label, n),
    entryPoint: t.entryPoint || "",
    constants: t.constants
  };
};
function Qs(e, t, n, i) {
  if (typeof t != "string" || t.length === 0)
    throw new Error("createShaderModule(code): WGSL code must be a non-empty string.");
  if (i) {
    if (i.device !== e)
      throw new Error("createShaderModule(pipelineCache): cache.device must match the provided GPUDevice.");
    return i.getOrCreateShaderModule(t, n);
  }
  return e.createShaderModule({ code: t, label: n });
}
function _t(e, t, n) {
  if (n && n.device !== e)
    throw new Error("createRenderPipeline(pipelineCache): cache.device must match the provided GPUDevice.");
  const i = Bo(e, t.vertex, n), r = i.entryPoint || Ec;
  let o;
  if (t.fragment) {
    const l = Bo(e, t.fragment, n), g = l.entryPoint || Bc;
    let c;
    if (t.fragment.targets)
      c = [...t.fragment.targets];
    else {
      const h = t.fragment.formats;
      if (!h)
        throw new Error(
          "createRenderPipeline(fragment): provide either `fragment.targets` or `fragment.formats` when a fragment stage is present."
        );
      if (typeof h == "string")
        c = [
          {
            format: h,
            blend: t.fragment.blend,
            writeMask: t.fragment.writeMask
          }
        ];
      else {
        c = new Array(h.length);
        for (let d = 0; d < h.length; d++)
          c[d] = {
            format: h[d],
            blend: t.fragment.blend,
            writeMask: t.fragment.writeMask
          };
      }
    }
    o = {
      module: l.module,
      entryPoint: g,
      targets: c,
      constants: l.constants
    };
  }
  const s = t.primitive ?? { topology: "triangle-list" }, a = t.multisample ?? { count: 1 };
  let u;
  t.layout != null ? u = t.layout : t.bindGroupLayouts ? u = e.createPipelineLayout({ bindGroupLayouts: [...t.bindGroupLayouts] }) : u = "auto";
  const f = {
    label: t.label,
    layout: u,
    vertex: {
      module: i.module,
      entryPoint: r,
      buffers: t.vertex.buffers ? [...t.vertex.buffers] : [],
      constants: i.constants
    },
    fragment: o,
    primitive: s,
    depthStencil: t.depthStencil,
    multisample: a
  };
  return n ? n.getOrCreateRenderPipeline(f) : e.createRenderPipeline(f);
}
function Lo(e, t, n) {
  if (n && n.device !== e)
    throw new Error("createComputePipeline(pipelineCache): cache.device must match the provided GPUDevice.");
  return n ? n.getOrCreateComputePipeline(t) : e.createComputePipeline(t);
}
function mt(e, t, n) {
  if (!Number.isFinite(t) || t <= 0)
    throw new Error(`createUniformBuffer(size): size must be a positive number. Received: ${String(t)}`);
  const i = (n == null ? void 0 : n.alignment) ?? 16, r = _c(t, Math.max(4, i)), o = e.limits.maxUniformBufferBindingSize;
  if (r > o)
    throw new Error(
      `createUniformBuffer(size): requested size ${r} exceeds device.limits.maxUniformBufferBindingSize (${o}).`
    );
  return e.createBuffer({
    label: n == null ? void 0 : n.label,
    size: r,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
}
function ft(e, t, n) {
  const i = n instanceof ArrayBuffer ? { arrayBuffer: n, offset: 0, size: n.byteLength } : { arrayBuffer: n.buffer, offset: n.byteOffset, size: n.byteLength };
  if (i.size !== 0) {
    if (i.offset & 3 || i.size & 3)
      throw new Error(
        `writeUniformBuffer(data): data byteOffset (${i.offset}) and byteLength (${i.size}) must be multiples of 4 for queue.writeBuffer().`
      );
    if (i.size > t.size)
      throw new Error(`writeUniformBuffer(data): data byteLength (${i.size}) exceeds buffer.size (${t.size}).`);
    e.queue.writeBuffer(t, 0, i.arrayBuffer, i.offset, i.size);
  }
}
var Uc = "bgra8unorm";
var kc = 5;
var Gc = 6;
var zc = [1, 1, 1, 0.8];
var Vc = () => {
  const e = new ArrayBuffer(64);
  return new Float32Array(e).set([
    1,
    0,
    0,
    0,
    // col0
    0,
    1,
    0,
    0,
    // col1
    0,
    0,
    1,
    0,
    // col2
    0,
    0,
    0,
    1
    // col3
  ]), e;
};
var Wc = (e) => Number.isFinite(e.left) && Number.isFinite(e.right) && Number.isFinite(e.top) && Number.isFinite(e.bottom) && Number.isFinite(e.canvasWidth) && Number.isFinite(e.canvasHeight);
var _o = (e) => typeof e == "number" && Number.isFinite(e) ? e : void 0;
var Oc = (e, t) => {
  let n = e, i = t;
  if ((!Number.isFinite(n) || !Number.isFinite(i)) && (n = 0, i = 1), n === i)
    i = n + 1;
  else if (n > i) {
    const r = n;
    n = i, i = r;
  }
  return { min: n, max: i };
};
var Xc = (e, t, n, i, r) => {
  const { left: o, right: s, top: a, bottom: u, canvasWidth: f, canvasHeight: l } = i, g = Number.isFinite(i.devicePixelRatio) && i.devicePixelRatio > 0 ? i.devicePixelRatio : 1;
  if (!Wc(i))
    throw new Error("AxisRenderer.prepare: gridArea dimensions must be finite numbers.");
  if (f <= 0 || l <= 0)
    throw new Error("AxisRenderer.prepare: canvas dimensions must be positive.");
  if (o < 0 || s < 0 || a < 0 || u < 0)
    throw new Error("AxisRenderer.prepare: gridArea margins must be non-negative.");
  const c = o * g, h = f - s * g, d = a * g, w = l - u * g, P = c / f * 2 - 1, R = h / f * 2 - 1, T = 1 - d / l * 2, C = 1 - w / l * 2, v = e.tickLength ?? Gc;
  if (!Number.isFinite(v) || v < 0)
    throw new Error("AxisRenderer.prepare: tickLength must be a finite non-negative number.");
  const m = r ?? kc, x = Math.max(1, Math.floor(m));
  if (!Number.isFinite(m) || x < 1)
    throw new Error("AxisRenderer.prepare: tickCount must be a finite number >= 1.");
  const b = v * g, M = b / f * 2, I = b / l * 2, A = _o(e.min) ?? (n === "x" ? t.invert(P) : t.invert(C)), S = _o(e.max) ?? (n === "x" ? t.invert(R) : t.invert(T)), p = Oc(A, S), y = p.min, F = p.max, N = 1 + x, D = new Float32Array(N * 2 * 2);
  let B = 0;
  if (n === "x") {
    D[B++] = P, D[B++] = C, D[B++] = R, D[B++] = C;
    const E = C, z = E - I;
    for (let G = 0; G < x; G++) {
      const Y = x === 1 ? 0.5 : G / (x - 1), V = y + Y * (F - y), j = t.scale(V);
      D[B++] = j, D[B++] = E, D[B++] = j, D[B++] = z;
    }
  } else {
    D[B++] = P, D[B++] = C, D[B++] = P, D[B++] = T;
    const E = P, z = E - M;
    for (let G = 0; G < x; G++) {
      const Y = x === 1 ? 0.5 : G / (x - 1), V = y + Y * (F - y), j = t.scale(V);
      D[B++] = E, D[B++] = j, D[B++] = z, D[B++] = j;
    }
  }
  return D;
};
function Uo(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Uc, r = (t == null ? void 0 : t.sampleCount) ?? 1, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
    ]
  }), u = mt(e, 64, { label: "axisRenderer/vsUniforms" }), f = mt(e, 16, { label: "axisRenderer/fsUniformsLine" }), l = mt(e, 16, { label: "axisRenderer/fsUniformsTick" }), g = e.createBindGroup({
    layout: a,
    entries: [
      { binding: 0, resource: { buffer: u } },
      { binding: 1, resource: { buffer: f } }
    ]
  }), c = e.createBindGroup({
    layout: a,
    entries: [
      { binding: 0, resource: { buffer: u } },
      { binding: 1, resource: { buffer: l } }
    ]
  }), h = _t(
    e,
    {
      label: "axisRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: or,
        label: "grid.wgsl",
        buffers: [
          {
            arrayStride: 8,
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }]
          }
        ]
      },
      fragment: {
        code: or,
        label: "grid.wgsl",
        formats: i,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "line-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let d = null, w = 0;
  const P = () => {
    if (n) throw new Error("AxisRenderer is disposed.");
  };
  return { prepare: (v, m, x, b, M, I, A) => {
    if (P(), x !== "x" && x !== "y")
      throw new Error("AxisRenderer.prepare: orientation must be 'x' or 'y'.");
    const S = Xc(v, m, x, b, A), p = S.byteLength, y = Math.max(4, p);
    if (!d || d.size < y) {
      if (d)
        try {
          d.destroy();
        } catch {
        }
      d = e.createBuffer({
        label: "axisRenderer/vertexBuffer",
        size: y,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    e.queue.writeBuffer(d, 0, S.buffer, 0, S.byteLength), w = S.length / 2, ft(e, u, Vc());
    const F = M ?? "rgba(255,255,255,0.8)", N = I ?? F, D = ht(F) ?? zc, B = ht(N) ?? D, E = new ArrayBuffer(4 * 4);
    new Float32Array(E).set([
      D[0],
      D[1],
      D[2],
      D[3]
    ]), ft(e, f, E);
    const z = new ArrayBuffer(4 * 4);
    new Float32Array(z).set([
      B[0],
      B[1],
      B[2],
      B[3]
    ]), ft(e, l, z);
  }, render: (v) => {
    P(), !(w === 0 || !d) && (v.setPipeline(h), v.setVertexBuffer(0, d), v.setBindGroup(0, g), v.draw(Math.min(2, w)), w > 2 && (v.setBindGroup(0, c), v.draw(w - 2, 1, 2, 0)));
  }, dispose: () => {
    if (!n) {
      n = true;
      try {
        u.destroy();
      } catch {
      }
      try {
        f.destroy();
      } catch {
      }
      try {
        l.destroy();
      } catch {
      }
      if (d)
        try {
          d.destroy();
        } catch {
        }
      d = null, w = 0;
    }
  } };
}
var $c = "bgra8unorm";
var Yc = 5;
var Hc = 6;
var qc = "rgba(255,255,255,0.15)";
var Zc = [1, 1, 1, 0.15];
var jc = () => {
  const e = new ArrayBuffer(64);
  return new Float32Array(e).set([
    1,
    0,
    0,
    0,
    // col0
    0,
    1,
    0,
    0,
    // col1
    0,
    0,
    1,
    0,
    // col2
    0,
    0,
    0,
    1
    // col3
  ]), e;
};
var Kc = (e, t, n) => {
  const { left: i, right: r, top: o, bottom: s, canvasWidth: a, canvasHeight: u } = e, f = Number.isFinite(e.devicePixelRatio) && e.devicePixelRatio > 0 ? e.devicePixelRatio : 1, l = i * f, g = a - r * f, c = o * f, h = u - s * f, d = g - l, w = h - c, P = t + n, R = new Float32Array(P * 2 * 2);
  let T = 0;
  for (let C = 0; C < t; C++) {
    const v = t === 1 ? 0.5 : C / (t - 1), m = c + v * w, x = l / a * 2 - 1, b = g / a * 2 - 1, M = 1 - m / u * 2;
    R[T++] = x, R[T++] = M, R[T++] = b, R[T++] = M;
  }
  for (let C = 0; C < n; C++) {
    const v = n === 1 ? 0.5 : C / (n - 1), x = (l + v * d) / a * 2 - 1, b = 1 - c / u * 2, M = 1 - h / u * 2;
    R[T++] = x, R[T++] = b, R[T++] = x, R[T++] = M;
  }
  return R;
};
function Jc(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? $c, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
    ]
  }), u = mt(e, 64, { label: "gridRenderer/vsUniforms" }), f = mt(e, 16, { label: "gridRenderer/fsUniforms" }), l = e.createBindGroup({
    layout: a,
    entries: [
      { binding: 0, resource: { buffer: u } },
      { binding: 1, resource: { buffer: f } }
    ]
  }), g = _t(
    e,
    {
      label: "gridRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: or,
        label: "grid.wgsl",
        buffers: [
          {
            arrayStride: 8,
            // vec2<f32> = 2 * 4 bytes
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }]
          }
        ]
      },
      fragment: {
        code: or,
        label: "grid.wgsl",
        formats: i,
        // Enable standard alpha blending so `fsUniforms.color.a` behaves as expected
        // (blends into the cleared background instead of making the canvas pixels transparent).
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "line-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let c = null, h = null, d = [];
  const w = () => {
    if (n) throw new Error("GridRenderer is disposed.");
  };
  return { prepare: (C, v) => {
    w();
    const m = v != null && typeof v == "object" && ("lineCount" in v || "color" in v || "append" in v), x = m ? v : void 0, b = m ? x == null ? void 0 : x.lineCount : v, M = (b == null ? void 0 : b.horizontal) ?? Yc, I = (b == null ? void 0 : b.vertical) ?? Hc, A = (x == null ? void 0 : x.color) ?? qc, S = (x == null ? void 0 : x.append) === true;
    if (M < 0 || I < 0)
      throw new Error("GridRenderer.prepare: line counts must be non-negative.");
    if (!Number.isFinite(C.left) || !Number.isFinite(C.right) || !Number.isFinite(C.top) || !Number.isFinite(C.bottom) || !Number.isFinite(C.canvasWidth) || !Number.isFinite(C.canvasHeight))
      throw new Error("GridRenderer.prepare: gridArea dimensions must be finite numbers.");
    if (C.canvasWidth <= 0 || C.canvasHeight <= 0)
      throw new Error("GridRenderer.prepare: canvas dimensions must be positive.");
    if (M === 0 && I === 0) {
      S || (h = null, d = []);
      return;
    }
    const p = Kc(C, M, I), y = (M + I) * 2, F = ht(A) ?? Zc;
    let N = 0;
    if (S && h && h.byteLength > 0 && d.length > 0) {
      N = h.byteLength;
      const z = new Float32Array(h.length + p.length);
      z.set(h, 0), z.set(p, h.length), h = z, d = d.concat([{ vertexOffsetBytes: N, vertexCount: y, rgba: F }]);
    } else
      h = p, d = [{ vertexOffsetBytes: 0, vertexCount: y, rgba: F }];
    const D = h.byteLength, B = Math.max(4, D);
    if (!c || c.size < B) {
      if (c)
        try {
          c.destroy();
        } catch {
        }
      c = e.createBuffer({
        label: "gridRenderer/vertexBuffer",
        size: B,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    e.queue.writeBuffer(c, 0, h.buffer, 0, h.byteLength);
    const E = jc();
    ft(e, u, E);
  }, render: (C) => {
    if (w(), !(d.length === 0 || !c)) {
      C.setPipeline(g), C.setBindGroup(0, l);
      for (const v of d) {
        const m = new ArrayBuffer(16);
        new Float32Array(m).set([v.rgba[0], v.rgba[1], v.rgba[2], v.rgba[3]]), ft(e, f, m), C.setVertexBuffer(0, c, v.vertexOffsetBytes), C.draw(v.vertexCount);
      }
    }
  }, dispose: () => {
    if (!n) {
      n = true;
      try {
        u.destroy();
      } catch {
      }
      try {
        f.destroy();
      } catch {
      }
      if (c)
        try {
          c.destroy();
        } catch {
        }
      c = null, h = null, d = [];
    }
  } };
}
var ko = `// area.wgsl
// Minimal area-fill shader (triangle-strip):
// - Vertex input: vec2<f32> position in data coords
// - Uniforms: clip-space transform + baseline value + solid RGBA color
// - Topology: triangle-strip
// - CPU duplicates vertices as p0,p0,p1,p1,... and we use vertex_index parity:
//   even index -> "top" vertex (original y)
//   odd index  -> "baseline" vertex (uniform baseline)

struct VSUniforms {
  transform: mat4x4<f32>,
  baseline: f32,
  // Pad to 16-byte multiple (uniform buffer layout requirements).
  _pad0: vec3<f32>,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct FSUniforms {
  color: vec4<f32>,
};

@group(0) @binding(1) var<uniform> fsUniforms: FSUniforms;

struct VSIn {
  @location(0) position: vec2<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn, @builtin(vertex_index) vertexIndex: u32) -> VSOut {
  var out: VSOut;
  let useBaseline = (vertexIndex & 1u) == 1u;
  let y = select(in.position.y, vsUniforms.baseline, useBaseline);
  let pos = vec2<f32>(in.position.x, y);
  out.clipPosition = vsUniforms.transform * vec4<f32>(pos, 0.0, 1.0);
  return out;
}

@fragment
fn fsMain() -> @location(0) vec4<f32> {
  return fsUniforms.color;
}

`;
var Qc = "bgra8unorm";
var Go = (e) => Math.min(1, Math.max(0, e));
var el = (e) => ht(e) ?? [0, 0, 0, 1];
var zo = (e, t, n) => {
  const i = e.scale(t), r = e.scale(n);
  if (!Number.isFinite(t) || !Number.isFinite(n) || t === n || !Number.isFinite(i) || !Number.isFinite(r))
    return { a: 0, b: Number.isFinite(i) ? i : 0 };
  const o = (r - i) / (n - t), s = i - o * t;
  return { a: Number.isFinite(o) ? o : 0, b: Number.isFinite(s) ? s : 0 };
};
var tl = (e, t, n, i, r) => {
  e[0] = t, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 0, e[5] = i, e[6] = 0, e[7] = 0, e[8] = 0, e[9] = 0, e[10] = 1, e[11] = 0, e[12] = n, e[13] = r, e[14] = 0, e[15] = 1;
};
var nl = (e) => {
  const t = Ie(e), n = new Float32Array(t * 2 * 2);
  let i = 0;
  for (let r = 0; r < t; r++) {
    const o = Ae(e, r), s = Ue(e, r);
    n[i++] = o, n[i++] = s, n[i++] = o, n[i++] = s;
  }
  return n;
};
function il(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Qc, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
    ]
  }), u = mt(e, 96, { label: "areaRenderer/vsUniforms" }), f = mt(e, 16, { label: "areaRenderer/fsUniforms" }), l = new ArrayBuffer(96), g = new Float32Array(l), c = new Float32Array(4), h = e.createBindGroup({
    layout: a,
    entries: [
      { binding: 0, resource: { buffer: u } },
      { binding: 1, resource: { buffer: f } }
    ]
  }), d = _t(
    e,
    {
      label: "areaRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: ko,
        label: "area.wgsl",
        buffers: [
          {
            arrayStride: 8,
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }]
          }
        ]
      },
      fragment: {
        code: ko,
        label: "area.wgsl",
        formats: i,
        // Enable standard alpha blending so `areaStyle.opacity` behaves correctly.
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-strip", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let w = null, P = 0;
  const R = () => {
    if (n) throw new Error("AreaRenderer is disposed.");
  }, T = (x, b, M, I, A) => {
    tl(g, x, b, M, I), g[16] = A, g[17] = 0, g[18] = 0, g[19] = 0, g[20] = 0, g[21] = 0, g[22] = 0, g[23] = 0, ft(e, u, l);
  };
  return { prepare: (x, b, M, I, A) => {
    R();
    const S = nl(b), p = S.byteLength, y = Math.max(4, p);
    if (!w || w.size < y) {
      if (w)
        try {
          w.destroy();
        } catch {
        }
      w = e.createBuffer({
        label: "areaRenderer/vertexBuffer",
        size: y,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    S.byteLength > 0 && e.queue.writeBuffer(w, 0, S.buffer, 0, S.byteLength), P = S.length / 2;
    const F = Vt(b), { xMin: N, xMax: D, yMin: B, yMax: E } = F ?? { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, { a: z, b: G } = zo(M, N, D), { a: Y, b: V } = zo(I, B, E), j = Number.isFinite(A ?? Number.NaN) ? A : Number.isFinite(B) ? B : 0;
    T(z, G, Y, V, j);
    const [K, J, oe, W] = el(x.areaStyle.color), fe = Go(x.areaStyle.opacity);
    c[0] = K, c[1] = J, c[2] = oe, c[3] = Go(W * fe), ft(e, f, c);
  }, render: (x) => {
    R(), !(!w || P < 4) && (x.setPipeline(d), x.setBindGroup(0, h), x.setVertexBuffer(0, w), x.draw(P));
  }, dispose: () => {
    if (!n) {
      if (n = true, w)
        try {
          w.destroy();
        } catch {
        }
      w = null, P = 0;
      try {
        u.destroy();
      } catch {
      }
      try {
        f.destroy();
      } catch {
      }
    }
  } };
}
var Vo = `// line.wgsl \u2014 Screen-space quad expansion with SDF-based anti-aliasing.
//
// Each "instance" draws one line segment (point[i] \u2192 point[i+1]).
// 6 vertices per instance (2 triangles = 1 quad per segment).
//
// The vertex shader:
//   1. Reads endpoints from a storage buffer.
//   2. Transforms both to clip space using the mat4x4 transform.
//   3. Converts clip\u2192screen (NDC * canvasSize * 0.5).
//   4. Computes the perpendicular direction in screen space.
//   5. Offsets vertices by \xB1(halfWidth + AA_PADDING) along the perpendicular.
//   6. Converts back to clip space.
//   7. Outputs \`acrossDevice\` varying for SDF-based AA.
//
// The fragment shader applies smoothstep AA on the distance-from-edge.

const AA_PADDING: f32 = 1.5;

struct VSUniforms {
  transform       : mat4x4<f32>,  // 64 bytes: data-coord \u2192 clip-space
  canvasSize      : vec2<f32>,     //  8 bytes: device pixels (width, height)
  devicePixelRatio: f32,           //  4 bytes
  lineWidthCssPx  : f32,           //  4 bytes: line width in CSS pixels
};
// Total: 80 bytes (aligned to 16).

@group(0) @binding(0) var<uniform> vsUniforms : VSUniforms;

struct FSUniforms {
  color : vec4<f32>,
};

@group(0) @binding(1) var<uniform> fsUniforms : FSUniforms;

@group(0) @binding(2) var<storage, read> points : array<vec2<f32>>;

struct VSOut {
  @builtin(position) clipPosition : vec4<f32>,
  @location(0) acrossDevice       : f32,
  @location(1) @interpolate(flat) widthDevice : f32,
};

// Returns UV for the 6 vertices of a quad (2 triangles):
//   uv.x: 0 \u2192 endpoint A, 1 \u2192 endpoint B
//   uv.y: 0 \u2192 +side, 1 \u2192 \u2212side
fn quadUv(vid : u32) -> vec2<f32> {
  switch (vid) {
    case 0u: { return vec2<f32>(0.0, 0.0); }
    case 1u: { return vec2<f32>(1.0, 0.0); }
    case 2u: { return vec2<f32>(0.0, 1.0); }
    case 3u: { return vec2<f32>(0.0, 1.0); }
    case 4u: { return vec2<f32>(1.0, 0.0); }
    default: { return vec2<f32>(1.0, 1.0); }
  }
}

@vertex
fn vsMain(
  @builtin(vertex_index) vid : u32,
  @builtin(instance_index) iid : u32,
) -> VSOut {
  let uv = quadUv(vid);

  // Read segment endpoints in data coordinates.
  let pA_data = points[iid];
  let pB_data = points[iid + 1u];

  // Transform to clip space.
  let clipA = vsUniforms.transform * vec4<f32>(pA_data, 0.0, 1.0);
  let clipB = vsUniforms.transform * vec4<f32>(pB_data, 0.0, 1.0);

  // Convert clip \u2192 screen (device pixels). 
  // screen = (ndc * 0.5 + 0.5) * canvasSize, but Y is flipped.
  let ndcA = clipA.xy / clipA.w;
  let ndcB = clipB.xy / clipB.w;
  let screenA = vec2<f32>(
    (ndcA.x * 0.5 + 0.5) * vsUniforms.canvasSize.x,
    (1.0 - (ndcA.y * 0.5 + 0.5)) * vsUniforms.canvasSize.y,
  );
  let screenB = vec2<f32>(
    (ndcB.x * 0.5 + 0.5) * vsUniforms.canvasSize.x,
    (1.0 - (ndcB.y * 0.5 + 0.5)) * vsUniforms.canvasSize.y,
  );

  // Segment direction and perpendicular in screen space.
  let delta = screenB - screenA;
  let segLen = length(delta);

  // Degenerate segment: collapse quad to a degenerate triangle.
  if (segLen < 1e-6) {
    var out : VSOut;
    out.clipPosition = clipA;
    out.acrossDevice = 0.0;
    out.widthDevice = 0.0;
    return out;
  }

  let dir = delta / segLen;
  // Perpendicular: rotate 90\xB0 CW \u2192 (dy, -dx).
  let perp = vec2<f32>(dir.y, -dir.x);

  // Compute line width in device pixels + AA padding.
  let dpr = max(vsUniforms.devicePixelRatio, 1e-6);
  let widthDevice = max(1.0, vsUniforms.lineWidthCssPx * dpr);
  let halfExtent = widthDevice * 0.5 + AA_PADDING;

  // Select endpoint: uv.x=0 \u2192 A, uv.x=1 \u2192 B.
  let baseScreen = mix(screenA, screenB, uv.x);

  // Offset perpendicular: uv.y selects +side (0) vs \u2212side (1).
  let side = mix(1.0, -1.0, uv.y);
  let screenPos = baseScreen + perp * halfExtent * side;

  // acrossDevice: 0 at \u2212side edge, widthDevice at +side edge.
  // Map from [\u2212halfExtent, +halfExtent] to [0, widthDevice + 2*AA_PADDING].
  let totalExtent = 2.0 * halfExtent;
  let acrossDevice = (side * halfExtent + halfExtent) / totalExtent * totalExtent;
  // Simplified: acrossDevice = halfExtent * (1 + side) = halfExtent + halfExtent * side
  // But for the fragment shader we want [0, totalExtent]:
  // Let's define it properly:
  // At side=+1: screenPos is at +halfExtent from center \u2192 acrossDevice = totalExtent
  // At side=-1: screenPos is at -halfExtent from center \u2192 acrossDevice = 0
  let acrossDeviceVal = halfExtent * (1.0 + side);

  // Convert screen \u2192 clip.
  let clipX = (screenPos.x / vsUniforms.canvasSize.x) * 2.0 - 1.0;
  let clipY = 1.0 - (screenPos.y / vsUniforms.canvasSize.y) * 2.0;

  var out : VSOut;
  out.clipPosition = vec4<f32>(clipX, clipY, 0.0, 1.0);
  out.acrossDevice = acrossDeviceVal;
  out.widthDevice = widthDevice;
  return out;
}

@fragment
fn fsMain(in : VSOut) -> @location(0) vec4<f32> {
  let totalExtent = in.widthDevice + 2.0 * AA_PADDING;
  let edgeDist = min(in.acrossDevice, totalExtent - in.acrossDevice);

  // Smooth step from 0 to AA zone for anti-aliased edges.
  let aa = max(fwidth(in.acrossDevice), 1e-3) * 1.25;
  let edgeCoverage = smoothstep(0.0, aa, edgeDist);

  // Also fade out in the AA_PADDING region (beyond the nominal half-width).
  // The padding zone is [0, AA_PADDING] at each edge.
  // Distance from the nominal edge = edgeDist - AA_PADDING (negative means inside).
  // Actually, remap: the nominal line occupies [AA_PADDING, AA_PADDING + widthDevice].
  let nominalDist = min(in.acrossDevice - AA_PADDING, (AA_PADDING + in.widthDevice) - in.acrossDevice);
  let paddingCoverage = smoothstep(0.0, aa, nominalDist);

  // Combine: paddingCoverage handles the SDF fade, edgeCoverage handles the outer trim.
  // For thin lines (< 1 device px), paddingCoverage alone provides the desired fade.
  let coverage = min(edgeCoverage, paddingCoverage);

  var color = fsUniforms.color;
  color = vec4<f32>(color.rgb, color.a * coverage);
  return color;
}
`;
var rl = "bgra8unorm";
var ol = 2;
var Wo = (e) => Math.min(1, Math.max(0, e));
var sl = (e) => ht(e) ?? [0, 0, 0, 1];
var Oo = (e, t, n) => {
  const i = e.scale(t), r = e.scale(n);
  if (!Number.isFinite(t) || !Number.isFinite(n) || t === n || !Number.isFinite(i) || !Number.isFinite(r))
    return { a: 0, b: Number.isFinite(i) ? i : 0 };
  const o = (r - i) / (n - t), s = i - o * t;
  return { a: Number.isFinite(o) ? o : 0, b: Number.isFinite(s) ? s : 0 };
};
var al = (e, t, n, i, r) => {
  e[0] = t, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 0, e[5] = i, e[6] = 0, e[7] = 0, e[8] = 0, e[9] = 0, e[10] = 1, e[11] = 0, e[12] = n, e[13] = r, e[14] = 0, e[15] = 1;
};
function cl(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? rl, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }
    ]
  }), u = mt(e, 80, { label: "lineRenderer/vsUniforms" }), f = mt(e, 16, { label: "lineRenderer/fsUniforms" }), l = new ArrayBuffer(80), g = new Float32Array(l), c = new Float32Array(4);
  let h = null;
  const d = _t(
    e,
    {
      label: "lineRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: Vo,
        label: "line.wgsl",
        buffers: []
        // No vertex buffers — points are read from storage buffer.
      },
      fragment: {
        code: Vo,
        label: "line.wgsl",
        formats: i,
        // Enable standard alpha blending so per-series `lineStyle.opacity` and AA transparency work.
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let w = 0;
  const P = () => {
    if (n) throw new Error("LineRenderer is disposed.");
  };
  return { prepare: (v, m, x, b, M = 0, I = 1, A = 1, S = 1) => {
    P(), w = Ie(v.data);
    const p = Vt(v.data), { xMin: y, xMax: F, yMin: N, yMax: D } = p ?? { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, { a: B, b: E } = Oo(x, y, F), { a: z, b: G } = Oo(b, N, D), Y = E + B * M;
    al(g, B, Y, z, G);
    const V = Number.isFinite(I) && I > 0 ? I : 1, j = Number.isFinite(A) && A > 0 ? A : 1, K = Number.isFinite(S) && S > 0 ? S : 1, J = Number.isFinite(v.lineStyle.width) && v.lineStyle.width > 0 ? v.lineStyle.width : ol;
    g[16] = j, g[17] = K, g[18] = V, g[19] = J, ft(e, u, l);
    const [oe, W, fe, _] = sl(v.color), H = Wo(v.lineStyle.opacity);
    c[0] = oe, c[1] = W, c[2] = fe, c[3] = Wo(_ * H), ft(e, f, c), h = e.createBindGroup({
      layout: a,
      entries: [
        { binding: 0, resource: { buffer: u } },
        { binding: 1, resource: { buffer: f } },
        { binding: 2, resource: { buffer: m } }
      ]
    });
  }, render: (v) => {
    P(), !(!h || w < 2) && (v.setPipeline(d), v.setBindGroup(0, h), v.draw(6, w - 1));
  }, dispose: () => {
    if (!n) {
      n = true, h = null, w = 0;
      try {
        u.destroy();
      } catch {
      }
      try {
        f.destroy();
      } catch {
      }
    }
  } };
}
var Xo = `// scatter.wgsl
// Instanced anti-aliased circle shader (SDF):
// - Per-instance vertex input:
//   - center   = vec2<f32> point center (transformed by VSUniforms.transform)
//   - radiusPx = f32 circle radius in pixels
// - Draw call: draw(6, instanceCount) using triangle-list expansion in VS
// - Uniforms:
//   - @group(0) @binding(0): VSUniforms { transform, viewportPx }
//   - @group(0) @binding(1): FSUniforms { color }
//
// Notes:
// - \`viewportPx\` is the current render target size in pixels (width, height).
// - The quad is expanded in clip space using \`radiusPx\` and \`viewportPx\`.

struct VSUniforms {
  transform: mat4x4<f32>,
  viewportPx: vec2<f32>,
  // Pad to 16-byte alignment (mat4x4 is 64B; vec2 adds 8B; pad to 80B).
  _pad0: vec2<f32>,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct FSUniforms {
  color: vec4<f32>,
};

@group(0) @binding(1) var<uniform> fsUniforms: FSUniforms;

struct VSIn {
  @location(0) center: vec2<f32>,
  @location(1) radiusPx: f32,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) localPx: vec2<f32>,
  @location(1) radiusPx: f32,
};

@vertex
fn vsMain(in: VSIn, @builtin(vertex_index) vertexIndex: u32) -> VSOut {
  // Fixed local corners for 2 triangles (triangle-list).
  // \`localNdc\` is a quad in [-1, 1]^2; we convert it to pixel offsets via radiusPx.
  let localNdc = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let corner = localNdc[vertexIndex];
  let localPx = corner * in.radiusPx;

  // Convert pixel offset to clip-space offset.
  // Clip space spans [-1, 1] across the viewport, so px -> clip is (2 / viewportPx).
  let localClip = localPx * (2.0 / vsUniforms.viewportPx);

  let centerClip = (vsUniforms.transform * vec4<f32>(in.center, 0.0, 1.0)).xy;

  var out: VSOut;
  out.clipPosition = vec4<f32>(centerClip + localClip, 0.0, 1.0);
  out.localPx = localPx;
  out.radiusPx = in.radiusPx;
  return out;
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4<f32> {
  // Signed distance to the circle boundary (negative inside).
  let dist = length(in.localPx) - in.radiusPx;

  // Analytic-ish AA: smooth edge based on derivative of dist in screen space.
  let w = fwidth(dist);
  let a = 1.0 - smoothstep(0.0, w, dist);

  // Discard fully outside to avoid unnecessary blending work.
  if (a <= 0.0) {
    discard;
  }

  return vec4<f32>(fsUniforms.color.rgb, fsUniforms.color.a * a);
}

`;
var ll = "bgra8unorm";
var Tr = 4;
var qi = 16;
var Ar = qi / 4;
var ul = (e) => Math.min(1, Math.max(0, e));
var Ei = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var fl = (e) => ht(e) ?? [0, 0, 0, 1];
var $o = (e) => {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
};
var Yo = (e, t, n) => {
  const i = e.scale(t), r = e.scale(n);
  if (!Number.isFinite(t) || !Number.isFinite(n) || t === n || !Number.isFinite(i) || !Number.isFinite(r))
    return { a: 0, b: Number.isFinite(i) ? i : 0 };
  const o = (r - i) / (n - t), s = i - o * t;
  return { a: Number.isFinite(o) ? o : 0, b: Number.isFinite(s) ? s : 0 };
};
var dl = (e, t, n, i, r) => {
  e[0] = t, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 0, e[5] = i, e[6] = 0, e[7] = 0, e[8] = 0, e[9] = 0, e[10] = 1, e[11] = 0, e[12] = n, e[13] = r, e[14] = 0, e[15] = 1;
};
var ml = (e) => {
  const { canvasWidth: t, canvasHeight: n, devicePixelRatio: i } = e, r = e.left * i, o = t - e.right * i, s = e.top * i, a = n - e.bottom * i, u = Ei(Math.floor(r), 0, Math.max(0, t)), f = Ei(Math.floor(s), 0, Math.max(0, n)), l = Ei(Math.ceil(o), 0, Math.max(0, t)), g = Ei(Math.ceil(a), 0, Math.max(0, n)), c = Math.max(0, l - u), h = Math.max(0, g - f);
  return { x: u, y: f, w: c, h };
};
function pl(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? ll, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
    ]
  }), u = mt(e, 80, { label: "scatterRenderer/vsUniforms" }), f = mt(e, 16, { label: "scatterRenderer/fsUniforms" }), l = new ArrayBuffer(80), g = new Float32Array(l), c = new Float32Array(4), h = e.createBindGroup({
    layout: a,
    entries: [
      { binding: 0, resource: { buffer: u } },
      { binding: 1, resource: { buffer: f } }
    ]
  }), d = _t(
    e,
    {
      label: "scatterRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: Xo,
        label: "scatter.wgsl",
        buffers: [
          {
            arrayStride: qi,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, format: "float32x2", offset: 0 },
              { shaderLocation: 1, format: "float32", offset: 8 }
            ]
          }
        ]
      },
      fragment: {
        code: Xo,
        label: "scatter.wgsl",
        formats: i,
        // Standard alpha blending (circle AA uses alpha, and series color may be translucent).
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let w = null, P = 0, R = new ArrayBuffer(0), T = new Float32Array(R), C = 0, v = 0, m = [1, 1], x = null;
  const b = () => {
    if (n) throw new Error("ScatterRenderer is disposed.");
  }, M = (y) => {
    if (y <= T.length) return;
    const F = Math.max(8, $o(y));
    R = new ArrayBuffer(F * 4), T = new Float32Array(R);
  }, I = (y, F, N, D, B, E) => {
    const z = Number.isFinite(B) && B > 0 ? B : 1, G = Number.isFinite(E) && E > 0 ? E : 1;
    dl(g, y, F, N, D), g[16] = z, g[17] = G, g[18] = 0, g[19] = 0, ft(e, u, l), m = [z, G];
  };
  return { prepare: (y, F, N, D, B) => {
    b();
    const E = Vt(F), { xMin: z, xMax: G, yMin: Y, yMax: V } = E ?? { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, { a: j, b: K } = Yo(N, z, G), { a: J, b: oe } = Yo(D, Y, V);
    B ? (C = B.canvasWidth, v = B.canvasHeight, I(j, K, J, oe, B.canvasWidth, B.canvasHeight), x = ml(B)) : (I(j, K, J, oe, m[0], m[1]), x = null);
    const [W, fe, _, H] = fl(y.color);
    c[0] = W, c[1] = fe, c[2] = _, c[3] = ul(H), ft(e, f, c);
    const X = (B == null ? void 0 : B.devicePixelRatio) ?? 1, pe = X > 0 && Number.isFinite(X), ce = y.symbolSize, me = [0, 0, void 0], q = typeof ce == "function" ? (le, ge, ye) => {
      me[0] = le, me[1] = ge, me[2] = ye;
      const Be = ce(me);
      return typeof Be == "number" && Number.isFinite(Be) ? Be : Tr;
    } : typeof ce == "number" && Number.isFinite(ce) ? (le, ge, ye) => ce : (le, ge, ye) => Tr, se = Ie(F);
    M(se * Ar);
    const te = T;
    let ee = 0;
    for (let le = 0; le < se; le++) {
      const ge = Ae(F, le), ye = Ue(F, le);
      if (!Number.isFinite(ge) || !Number.isFinite(ye)) continue;
      const Be = at(F, le), Le = Be ?? q(ge, ye, Be), st = Number.isFinite(Le) ? Math.max(0, Le) : Tr, rt = pe ? st * X : st;
      rt > 0 && (te[ee + 0] = ge, te[ee + 1] = ye, te[ee + 2] = rt, te[ee + 3] = 0, ee += Ar);
    }
    P = ee / Ar;
    const be = Math.max(4, P * qi);
    if (!w || w.size < be) {
      const le = Math.max(Math.max(4, $o(be)), w ? w.size : 0);
      if (w)
        try {
          w.destroy();
        } catch {
        }
      w = e.createBuffer({
        label: "scatterRenderer/instanceBuffer",
        size: le,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    w && P > 0 && e.queue.writeBuffer(w, 0, R, 0, P * qi);
  }, render: (y) => {
    b(), !(!w || P === 0) && (x && C > 0 && v > 0 && y.setScissorRect(x.x, x.y, x.w, x.h), y.setPipeline(d), y.setBindGroup(0, h), y.setVertexBuffer(0, w), y.draw(6, P), x && C > 0 && v > 0 && y.setScissorRect(0, 0, C, v));
  }, dispose: () => {
    if (!n) {
      if (n = true, w)
        try {
          w.destroy();
        } catch {
        }
      w = null, P = 0;
      try {
        u.destroy();
      } catch {
      }
      try {
        f.destroy();
      } catch {
      }
      C = 0, v = 0, m = [1, 1], x = null;
    }
  } };
}
var hl = `struct ComputeUniforms {
  transform: mat4x4<f32>,
  viewportPx: vec2f,
  _pad0: vec2f,
  plotOriginPx: vec2<u32>,
  plotSizePx: vec2<u32>,
  binSizePx: u32,
  binCountX: u32,
  binCountY: u32,
  visibleStart: u32,
  visibleEnd: u32,
  normalization: u32,
  _pad1: vec2<u32>,
};

@group(0) @binding(0) var<uniform> u: ComputeUniforms;
@group(0) @binding(1) var<storage, read> points: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> bins: array<atomic<u32>>;

struct MaxBuffer {
  value: atomic<u32>,
};
@group(0) @binding(3) var<storage, read_write> maxBuf: MaxBuffer;

fn clipToDevicePx(clip: vec2f) -> vec2f {
  // clip in [-1,1] -> device pixel in [0, viewport]
  return vec2f(
    (clip.x * 0.5 + 0.5) * u.viewportPx.x,
    (-clip.y * 0.5 + 0.5) * u.viewportPx.y
  );
}

@compute @workgroup_size(256)
fn binPoints(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = u.visibleStart + gid.x;
  if (idx >= u.visibleEnd) {
    return;
  }

  let p = points[idx];
  let clip4 = u.transform * vec4f(p.x, p.y, 0.0, 1.0);
  let clip = clip4.xy / max(1e-9, clip4.w);
  let px = clipToDevicePx(clip);

  // Scissor bounds in device px
  let left = f32(u.plotOriginPx.x);
  let top = f32(u.plotOriginPx.y);
  let right = left + f32(u.plotSizePx.x);
  let bottom = top + f32(u.plotSizePx.y);

  if (px.x < left || px.x >= right || px.y < top || px.y >= bottom) {
    return;
  }

  let localX = u32((px.x - left) / f32(u.binSizePx));
  let localY = u32((px.y - top) / f32(u.binSizePx));
  if (localX >= u.binCountX || localY >= u.binCountY) {
    return;
  }

  let binIndex = localY * u.binCountX + localX;
  atomicAdd(&bins[binIndex], 1u);
}

@compute @workgroup_size(256)
fn reduceMax(@builtin(global_invocation_id) gid: vec3<u32>) {
  let binTotal = u.binCountX * u.binCountY;
  let i = gid.x;
  if (i >= binTotal) {
    return;
  }

  let v = atomicLoad(&bins[i]);
  atomicMax(&maxBuf.value, v);
}

`;
var Ho = `struct RenderUniforms {
  plotOriginPx: vec2<u32>,
  plotSizePx: vec2<u32>,
  binSizePx: u32,
  binCountX: u32,
  binCountY: u32,
  normalization: u32,
  _pad: vec2<u32>,
};

@group(0) @binding(0) var<uniform> u: RenderUniforms;
@group(0) @binding(1) var<storage, read> bins: array<u32>;
@group(0) @binding(2) var<storage, read> maxBuf: array<u32>;
@group(0) @binding(3) var lutTex: texture_2d<f32>;

struct VsOut {
  @builtin(position) position: vec4f,
};

@vertex
fn vsMain(@builtin(vertex_index) vid: u32) -> VsOut {
  // Fullscreen triangle (covers clip space).
  // (0,0)->(-1,-1), (2,0)->(3,-1), (0,2)->(-1,3)
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var out: VsOut;
  out.position = vec4f(pos[vid], 0.0, 1.0);
  return out;
}

fn applyNormalization(count: f32, maxCount: f32, mode: u32) -> f32 {
  if (maxCount <= 0.0) {
    return 0.0;
  }
  let t = clamp(count / maxCount, 0.0, 1.0);
  if (mode == 1u) { // sqrt
    return sqrt(t);
  }
  if (mode == 2u) { // log
    // log1p(count) / log1p(max)
    return clamp(log(1.0 + count) / max(1e-9, log(1.0 + maxCount)), 0.0, 1.0);
  }
  return t; // linear
}

@fragment
fn fsMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // pos.xy is framebuffer pixel coords (device px) with origin top-left.
  let x = pos.x;
  let y = pos.y;

  let left = f32(u.plotOriginPx.x);
  let top = f32(u.plotOriginPx.y);
  // plot scissor also applied on CPU; keep a guard anyway.
  if (x < left || y < top) {
    return vec4f(0.0);
  }

  let localX = u32((x - left) / f32(u.binSizePx));
  let localY = u32((y - top) / f32(u.binSizePx));
  if (localX >= u.binCountX || localY >= u.binCountY) {
    return vec4f(0.0);
  }

  let idx = localY * u.binCountX + localX;
  let c = f32(bins[idx]);
  let maxC = f32(maxBuf[0]);

  let t = applyNormalization(c, maxC, u.normalization);
  let lutX = i32(round(t * 255.0));
  let lut = textureLoad(lutTex, vec2<i32>(lutX, 0), 0);
  return vec4f(lut.rgb, 1.0);
}

`;
var yl = "bgra8unorm";
var Bi = (e) => Math.min(1, Math.max(0, e));
var pn = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var gl = (e) => {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
};
var qo = (e, t, n) => {
  const i = e.scale(t), r = e.scale(n);
  if (!Number.isFinite(t) || !Number.isFinite(n) || t === n || !Number.isFinite(i) || !Number.isFinite(r))
    return { a: 0, b: Number.isFinite(i) ? i : 0 };
  const o = (r - i) / (n - t), s = i - o * t;
  return { a: Number.isFinite(o) ? o : 0, b: Number.isFinite(s) ? s : 0 };
};
var xl = (e, t, n, i, r) => {
  e[0] = t, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 0, e[5] = i, e[6] = 0, e[7] = 0, e[8] = 0, e[9] = 0, e[10] = 1, e[11] = 0, e[12] = n, e[13] = r, e[14] = 0, e[15] = 1;
};
var bl = (e) => {
  const { canvasWidth: t, canvasHeight: n, devicePixelRatio: i } = e, r = e.left * i, o = t - e.right * i, s = e.top * i, a = n - e.bottom * i, u = pn(Math.floor(r), 0, Math.max(0, t)), f = pn(Math.floor(s), 0, Math.max(0, n)), l = pn(Math.ceil(o), 0, Math.max(0, t)), g = pn(Math.ceil(a), 0, Math.max(0, n)), c = Math.max(0, l - u), h = Math.max(0, g - f);
  return { x: u, y: f, w: c, h };
};
var Li = (e, t, n) => e + (t - e) * n;
var vl = (e, t, n) => [Li(e[0], t[0], n), Li(e[1], t[1], n), Li(e[2], t[2], n), Li(e[3], t[3], n)];
var wl = (e) => ht(e) ?? [0, 0, 0, 1];
var Zo = (e) => e === "plasma" ? ["#0d0887", "#6a00a8", "#b12a90", "#e16462", "#fca636", "#f0f921"] : e === "inferno" ? ["#000004", "#420a68", "#932667", "#dd513a", "#fca50a", "#fcffa4"] : ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
var Cl = (e) => {
  const n = (typeof e == "string" ? Zo(e) : Array.isArray(e) && e.length > 0 ? e : Zo("viridis")).map(wl), i = Math.max(2, n.length), r = new Uint8Array(new ArrayBuffer(256 * 4));
  for (let o = 0; o < 256; o++) {
    const a = o / 255 * (i - 1), u = Math.min(i - 2, Math.max(0, Math.floor(a))), f = a - u, l = vl(n[u], n[u + 1], f);
    r[o * 4 + 0] = pn(Math.round(Bi(l[0]) * 255), 0, 255), r[o * 4 + 1] = pn(Math.round(Bi(l[1]) * 255), 0, 255), r[o * 4 + 2] = pn(Math.round(Bi(l[2]) * 255), 0, 255), r[o * 4 + 3] = pn(Math.round(Bi(l[3]) * 255), 0, 255);
  }
  return r;
};
var Ml = (e) => {
  if (typeof e == "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "custom";
  }
};
var Sl = (e) => e === "sqrt" ? 1 : e === "log" ? 2 : 0;
var Fl = new Uint32Array([0]).buffer;
function Nl(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? yl, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
    ]
  }), u = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      // `scatterDensityColormap.wgsl` declares these as `var<storage, read>`, so they must be read-only-storage.
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } }
    ]
  }), f = mt(e, 128, { label: "scatterDensity/computeUniforms" }), l = new ArrayBuffer(128), g = new Float32Array(l, 0, 20), c = new Uint32Array(l), h = mt(e, 48, { label: "scatterDensity/renderUniforms" }), d = new ArrayBuffer(48), w = new Uint32Array(d), P = Qs(
    e,
    hl,
    "scatterDensityBinning.wgsl",
    s
  ), R = e.createPipelineLayout({ bindGroupLayouts: [a] }), T = Lo(e, {
    label: "scatterDensity/binPointsPipeline",
    layout: R,
    compute: { module: P, entryPoint: "binPoints" }
  }, s), C = Lo(e, {
    label: "scatterDensity/reduceMaxPipeline",
    layout: R,
    compute: { module: P, entryPoint: "reduceMax" }
  }, s), v = _t(
    e,
    {
      label: "scatterDensity/renderPipeline",
      bindGroupLayouts: [u],
      vertex: { code: Ho, label: "scatterDensityColormap.wgsl" },
      fragment: {
        code: Ho,
        label: "scatterDensityColormap.wgsl",
        formats: i,
        blend: void 0
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let m = null, x = null, b = 0, M = null, I = null, A = "", S = null, p = null, y = null, F = -1, N = 0, D = 0, B = 0, E = 0, z = 0, G = null, Y = 0, V = 0, j = 2, K = true, J = false, oe = new Uint32Array(0);
  const W = () => {
    if (n) throw new Error("ScatterDensityRenderer is disposed.");
  }, fe = (q) => {
    const se = Ml(q.densityColormap);
    if (M || (M = e.createTexture({
      label: "scatterDensity/lutTexture",
      size: { width: 256, height: 1, depthOrArrayLayers: 1 },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    }), I = M.createView(), A = ""), se === A) return;
    const te = Cl(q.densityColormap);
    e.queue.writeTexture(
      { texture: M },
      te,
      { bytesPerRow: 256 * 4, rowsPerImage: 1 },
      { width: 256, height: 1, depthOrArrayLayers: 1 }
    ), A = se;
  }, _ = (q, se) => {
    const te = Math.max(1, q | 0) * Math.max(1, se | 0);
    if (m && x && te <= b) return;
    const ee = Math.max(1, te);
    if (b = Math.max(256, gl(ee)), m) {
      try {
        m.destroy();
      } catch {
      }
      m = null;
    }
    if (x) {
      try {
        x.destroy();
      } catch {
      }
      x = null;
    }
    m = e.createBuffer({
      label: "scatterDensity/binsBuffer",
      size: b * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    }), x = e.createBuffer({
      label: "scatterDensity/maxBuffer",
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    }), oe = new Uint32Array(b), S = null, p = null, K = true;
  }, H = () => {
    !m || !x || !I || !y || (S || (S = e.createBindGroup({
      label: "scatterDensity/computeBindGroup",
      layout: a,
      entries: [
        { binding: 0, resource: { buffer: f } },
        { binding: 1, resource: { buffer: y } },
        { binding: 2, resource: { buffer: m } },
        { binding: 3, resource: { buffer: x } }
      ]
    })), p || (p = e.createBindGroup({
      label: "scatterDensity/renderBindGroup",
      layout: u,
      entries: [
        { binding: 0, resource: { buffer: h } },
        { binding: 1, resource: { buffer: m } },
        { binding: 2, resource: { buffer: x } },
        { binding: 3, resource: I }
      ]
    })));
  };
  return { prepare: (q, se, te, ee, be, le, ge, ye, Be) => {
    W(), J = true;
    const Le = bl(ye), st = ye.devicePixelRatio, rt = Number.isFinite(q.binSize) ? Math.max(1e-6, q.binSize) : 2, ve = Math.max(1, Math.round(rt * (Number.isFinite(st) && st > 0 ? st : 1))), Te = Math.max(1, Math.ceil(Le.w / ve)), Xe = Math.max(1, Math.ceil(Le.h / ve));
    _(Te, Xe), fe(q);
    const He = Sl(q.densityNormalization);
    y !== se && (y = se, S = null, p = null, K = true), F !== te && (F = te, K = true), (N !== ee || D !== be) && (N = ee, D = be, K = true), (B !== ve || E !== Te || z !== Xe) && (B = ve, E = Te, z = Xe, K = true), (!G || G.x !== Le.x || G.y !== Le.y || G.w !== Le.w || G.h !== Le.h) && (G = Le, K = true), (Y !== ye.canvasWidth || V !== ye.canvasHeight) && (Y = ye.canvasWidth, V = ye.canvasHeight, K = true), j !== He && (j = He, K = true);
    const ke = Be, bt = (ke == null ? void 0 : ke.xMin) ?? 0, vt = (ke == null ? void 0 : ke.xMax) ?? 1, We = (ke == null ? void 0 : ke.yMin) ?? 0, nt = (ke == null ? void 0 : ke.yMax) ?? 1, { a: Rt, b: Wt } = qo(le, bt, vt), { a: Ft, b: Ut } = qo(ge, We, nt);
    xl(g, Rt, Wt, Ft, Ut), g[16] = ye.canvasWidth > 0 ? ye.canvasWidth : 1, g[17] = ye.canvasHeight > 0 ? ye.canvasHeight : 1, g[18] = 0, g[19] = 0, c[20] = Le.x >>> 0, c[21] = Le.y >>> 0, c[22] = Le.w >>> 0, c[23] = Le.h >>> 0, c[24] = ve >>> 0, c[25] = Te >>> 0, c[26] = Xe >>> 0, c[27] = (Math.max(0, ee) | 0) >>> 0, c[28] = (Math.max(0, be) | 0) >>> 0, c[29] = He >>> 0, ft(e, f, l), w[0] = Le.x >>> 0, w[1] = Le.y >>> 0, w[2] = Le.w >>> 0, w[3] = Le.h >>> 0, w[4] = ve >>> 0, w[5] = Te >>> 0, w[6] = Xe >>> 0, w[7] = He >>> 0, ft(e, h, d), H();
  }, encodeCompute: (q) => {
    if (W(), !J || !K) return;
    if (!m || !x || !S || F <= 0) {
      K = false;
      return;
    }
    if (!G || G.w <= 0 || G.h <= 0) {
      K = false;
      return;
    }
    e.queue.writeBuffer(m, 0, oe.buffer, 0, b * 4), e.queue.writeBuffer(x, 0, Fl);
    const se = E * z | 0, te = Math.max(0, D - N | 0), ee = q.beginComputePass({ label: "scatterDensity/computePass" });
    ee.setBindGroup(0, S), ee.setPipeline(T);
    const be = 256, le = Math.ceil(te / be);
    le > 0 && ee.dispatchWorkgroups(le), ee.setPipeline(C);
    const ge = Math.ceil(se / be);
    ge > 0 && ee.dispatchWorkgroups(ge), ee.end(), K = false;
  }, render: (q) => {
    W(), J && (!p || !G || !I || G.w <= 0 || G.h <= 0 || (q.setScissorRect(G.x, G.y, G.w, G.h), q.setPipeline(v), q.setBindGroup(0, p), q.draw(3), Y > 0 && V > 0 && q.setScissorRect(0, 0, Y, V)));
  }, dispose: () => {
    if (!n) {
      n = true;
      try {
        f.destroy();
      } catch {
      }
      try {
        h.destroy();
      } catch {
      }
      if (m)
        try {
          m.destroy();
        } catch {
        }
      if (x)
        try {
          x.destroy();
        } catch {
        }
      if (m = null, x = null, b = 0, M)
        try {
          M.destroy();
        } catch {
        }
      M = null, I = null, S = null, p = null, y = null;
    }
  } };
}
var jo = `// pie.wgsl
// Instanced anti-aliased pie-slice shader (instanced quad + SDF mask).
//
// - Per-instance vertex input:
//   - center        = vec2<f32> slice center (transformed by VSUniforms.transform)
//   - startAngleRad = f32 start angle in radians
//   - endAngleRad   = f32 end angle in radians
//   - radiiPx       = vec2<f32>(innerRadiusPx, outerRadiusPx) in *device pixels*
//   - color         = vec4<f32> RGBA color in [0..1]
//
// - Draw call: draw(6, instanceCount) using triangle-list expansion in VS
//
// - Uniforms:
//   - @group(0) @binding(0): VSUniforms { transform, viewportPx }
//
// Notes:
// - The quad is expanded in clip space using \`radiusPx\` and \`viewportPx\`.
// - Fragment uses an SDF mask for the circle boundary + an angular wedge mask.
// - Fully outside fragments are discarded to avoid unnecessary blending work.
//
// Conventions: matches other shaders in this repo (vsMain/fsMain, group 0 bindings,
// and explicit uniform padding/alignment where needed).

const PI: f32 = 3.141592653589793;
const TAU: f32 = 6.283185307179586; // 2*pi

struct VSUniforms {
  transform: mat4x4<f32>,
  viewportPx: vec2<f32>,
  // Pad to 16-byte alignment (mat4x4 is 64B; vec2 adds 8B; pad to 80B).
  _pad0: vec2<f32>,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct VSIn {
  @location(0) center: vec2<f32>,
  @location(1) startAngleRad: f32,
  @location(2) endAngleRad: f32,
  @location(3) radiiPx: vec2<f32>, // (innerPx, outerPx)
  @location(4) color: vec4<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) localPx: vec2<f32>,
  @location(1) startAngleRad: f32,
  @location(2) endAngleRad: f32,
  @location(3) radiiPx: vec2<f32>,
  @location(4) color: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn, @builtin(vertex_index) vertexIndex: u32) -> VSOut {
  // Fixed local corners for 2 triangles (triangle-list).
  // \`localNdc\` is a quad in [-1, 1]^2; we convert it to pixel offsets via radiusPx.
  let localNdc = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let corner = localNdc[vertexIndex];
  let outerPx = in.radiiPx.y;
  let localPx = corner * outerPx;

  // Convert pixel offset to clip-space offset.
  // Clip space spans [-1, 1] across the viewport, so px -> clip is (2 / viewportPx).
  let localClip = localPx * (2.0 / vsUniforms.viewportPx);

  let centerClip = (vsUniforms.transform * vec4<f32>(in.center, 0.0, 1.0)).xy;

  var out: VSOut;
  out.clipPosition = vec4<f32>(centerClip + localClip, 0.0, 1.0);
  out.localPx = localPx;
  out.startAngleRad = in.startAngleRad;
  out.endAngleRad = in.endAngleRad;
  out.radiiPx = in.radiiPx;
  out.color = in.color;
  return out;
}

fn wrapToTau(theta: f32) -> f32 {
  // Maps theta to [0, TAU). (Input often comes from atan2 in [-PI, PI].)
  return select(theta, theta + TAU, theta < 0.0);
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4<f32> {
  let p = in.localPx;
  let r = length(p);

  let innerPx = in.radiiPx.x;
  let outerPx = in.radiiPx.y;

  // --- Radial mask: ring between inner and outer radii (inner==0 => pie) ---
  // Positive inside the ring, negative outside.
  let radialDist = min(r - innerPx, outerPx - r);
  let radialW = fwidth(radialDist);
  let radialA = smoothstep(-radialW, radialW, radialDist);

  if (radialA <= 0.0) {
    discard;
  }

  // Compute fragment angle in [0, TAU).
  let angle = wrapToTau(atan2(p.y, p.x));

  // --- Angular mask: wedge between start/end angles with wrap ---
  let start = in.startAngleRad;
  let end = in.endAngleRad;

  // Compute span in [0, 2\u03C0) with wrap.
  var span = end - start;
  span = span + select(0.0, TAU, span < 0.0);

  // Compute rel in [0, 2\u03C0) with wrap.
  var rel = angle - start;
  rel = rel + select(0.0, TAU, rel < 0.0);

  let inside = rel <= span;

  // Signed angular distance (in radians) to nearest boundary.
  // - Inside: +min(rel, span-rel)
  // - Outside: -min(rel-span, 2\u03C0-rel)
  let dIn = min(rel, max(span - rel, 0.0));
  let dOutA = max(rel - span, 0.0);
  let dOutB = max(TAU - rel, 0.0);
  let dOut = min(dOutA, dOutB);

  let signedAngleDist = select(-dOut, dIn, inside);

  // Convert to approximate pixel distance to the boundary ray.
  // (For small angles, perpendicular distance to a ray \u2248 r * angle.)
  let angleDistPx = signedAngleDist * max(r, 1.0);

  let angW = fwidth(angleDistPx);
  let angularA = smoothstep(-angW, angW, angleDistPx);

  let aOut = radialA * angularA;
  if (aOut <= 0.0) {
    discard;
  }

  return vec4<f32>(in.color.rgb, in.color.a * aOut);
}

`;
var Tl = "bgra8unorm";
var Zi = 40;
var Ir = Zi / 4;
var zn = Math.PI * 2;
var Ko = (e) => Math.min(1, Math.max(0, e));
var _i = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var Jo = (e) => {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
};
var Pr = (e) => {
  if (!Number.isFinite(e)) return 0;
  const t = e % zn;
  return t < 0 ? t + zn : t;
};
var Al = (e, t) => {
  const n = ht(e);
  if (n) return [n[0], n[1], n[2], Ko(n[3])];
  const i = ht(t);
  return i ? [i[0], i[1], i[2], Ko(i[3])] : [0, 0, 0, 1];
};
var li = (e, t) => {
  if (typeof e == "number") return Number.isFinite(e) ? e : null;
  if (typeof e != "string") return null;
  const n = e.trim();
  if (n.length === 0) return null;
  if (n.endsWith("%")) {
    const r = Number.parseFloat(n.slice(0, -1));
    return Number.isFinite(r) ? r / 100 * t : null;
  }
  const i = Number.parseFloat(n);
  return Number.isFinite(i) ? i : null;
};
var Il = (e, t, n) => {
  const i = (e == null ? void 0 : e[0]) ?? "50%", r = (e == null ? void 0 : e[1]) ?? "50%", o = li(i, t), s = li(r, n);
  return {
    x: Number.isFinite(o) ? o : t * 0.5,
    y: Number.isFinite(s) ? s : n * 0.5
  };
};
var Pl = (e) => Array.isArray(e);
var Rl = (e, t) => {
  if (e == null) return { inner: 0, outer: t * 0.7 };
  if (Pl(e)) {
    const r = li(e[0], t), o = li(e[1], t), s = Math.max(0, Number.isFinite(r) ? r : 0), a = Math.max(s, Number.isFinite(o) ? o : t * 0.7);
    return { inner: s, outer: Math.min(t, a) };
  }
  const n = li(e, t), i = Math.max(0, Number.isFinite(n) ? n : t * 0.7);
  return { inner: 0, outer: Math.min(t, i) };
};
var Dl = (e) => {
  const { canvasWidth: t, canvasHeight: n, devicePixelRatio: i } = e, r = e.left * i, o = t - e.right * i, s = e.top * i, a = n - e.bottom * i, u = _i(Math.floor(r), 0, Math.max(0, t)), f = _i(Math.floor(s), 0, Math.max(0, n)), l = _i(Math.ceil(o), 0, Math.max(0, t)), g = _i(Math.ceil(a), 0, Math.max(0, n)), c = Math.max(0, l - u), h = Math.max(0, g - f);
  return { x: u, y: f, w: c, h };
};
var El = new Float32Array([
  1,
  0,
  0,
  0,
  // col0
  0,
  1,
  0,
  0,
  // col1
  0,
  0,
  1,
  0,
  // col2
  0,
  0,
  0,
  1
  // col3
]);
function Bl(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Tl, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }]
  }), u = mt(e, 80, { label: "pieRenderer/vsUniforms" }), f = new ArrayBuffer(80), l = new Float32Array(f), g = e.createBindGroup({
    layout: a,
    entries: [{ binding: 0, resource: { buffer: u } }]
  }), c = _t(
    e,
    {
      label: "pieRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: jo,
        label: "pie.wgsl",
        buffers: [
          {
            arrayStride: Zi,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, format: "float32x2", offset: 0 },
              // center
              { shaderLocation: 1, format: "float32", offset: 8 },
              // startAngleRad
              { shaderLocation: 2, format: "float32", offset: 12 },
              // endAngleRad
              { shaderLocation: 3, format: "float32x2", offset: 16 },
              // radiiPx
              { shaderLocation: 4, format: "float32x4", offset: 24 }
              // color
            ]
          }
        ]
      },
      fragment: {
        code: jo,
        label: "pie.wgsl",
        formats: i,
        // Standard alpha blending for AA edges and translucent slice colors.
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let h = null, d = 0, w = new ArrayBuffer(0), P = new Float32Array(w), R = 0, T = 0, C = null;
  const v = () => {
    if (n) throw new Error("PieRenderer is disposed.");
  }, m = (A) => {
    if (A <= P.length) return;
    const S = Math.max(8, Jo(A));
    w = new ArrayBuffer(S * 4), P = new Float32Array(w);
  }, x = (A, S) => {
    const p = Number.isFinite(A) && A > 0 ? A : 1, y = Number.isFinite(S) && S > 0 ? S : 1;
    l.set(El, 0), l[16] = p, l[17] = y, l[18] = 0, l[19] = 0, ft(e, u, f);
  };
  return { prepare: (A, S) => {
    v();
    const p = S.devicePixelRatio, y = p > 0 && Number.isFinite(p) ? p : 1;
    R = S.canvasWidth, T = S.canvasHeight, x(S.canvasWidth, S.canvasHeight), C = Dl(S);
    const F = S.canvasWidth / y, N = S.canvasHeight / y;
    if (!(F > 0) || !(N > 0)) {
      d = 0;
      return;
    }
    const D = F - S.left - S.right, B = N - S.top - S.bottom;
    if (!(D > 0) || !(B > 0)) {
      d = 0;
      return;
    }
    const E = 0.5 * Math.min(D, B);
    if (!(E > 0)) {
      d = 0;
      return;
    }
    const z = Il(A.center, D, B), G = S.left + z.x, Y = S.top + z.y, V = G / F * 2 - 1, j = 1 - Y / N * 2;
    if (!Number.isFinite(V) || !Number.isFinite(j)) {
      d = 0;
      return;
    }
    const K = Rl(A.radius, E), J = Math.max(0, Math.min(K.inner, K.outer)), oe = Math.max(J, K.outer), W = J * y, fe = oe * y;
    if (!(fe > 0)) {
      d = 0;
      return;
    }
    let _ = 0, H = 0;
    for (let ee = 0; ee < A.data.length; ee++) {
      const be = A.data[ee], le = be == null ? void 0 : be.value;
      typeof le == "number" && Number.isFinite(le) && le > 0 && be.visible !== false && (_ += le, H++);
    }
    if (!(_ > 0) || H === 0) {
      d = 0;
      return;
    }
    m(H * Ir);
    const X = P, pe = typeof A.startAngle == "number" && Number.isFinite(A.startAngle) ? A.startAngle : 90;
    let ce = Pr(pe * Math.PI / 180), me = 0, q = 0, se = 0;
    for (let ee = 0; ee < A.data.length; ee++) {
      const be = A.data[ee], le = be == null ? void 0 : be.value;
      if (typeof le != "number" || !Number.isFinite(le) || le <= 0 || be.visible === false) continue;
      se++;
      const ge = se === H;
      let Be = le / _ * zn;
      if (ge ? Be = Math.max(0, zn - me) : Be = Math.max(0, Math.min(zn, Be)), me += Be, !(Be > 0)) continue;
      const Le = ce, st = H === 1 ? ce + zn : Pr(ce + Be);
      ce = Pr(ce + Be);
      const [rt, ve, Te, Xe] = Al(be.color, A.color);
      X[q + 0] = V, X[q + 1] = j, X[q + 2] = Le, X[q + 3] = st, X[q + 4] = W, X[q + 5] = fe, X[q + 6] = rt, X[q + 7] = ve, X[q + 8] = Te, X[q + 9] = Xe, q += Ir;
    }
    d = q / Ir;
    const te = Math.max(4, d * Zi);
    if (!h || h.size < te) {
      const ee = Math.max(Math.max(4, Jo(te)), h ? h.size : 0);
      if (h)
        try {
          h.destroy();
        } catch {
        }
      h = e.createBuffer({
        label: "pieRenderer/instanceBuffer",
        size: ee,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    h && d > 0 && e.queue.writeBuffer(h, 0, w, 0, d * Zi);
  }, render: (A) => {
    v(), !(!h || d === 0) && (C && R > 0 && T > 0 && A.setScissorRect(C.x, C.y, C.w, C.h), A.setPipeline(c), A.setBindGroup(0, g), A.setVertexBuffer(0, h), A.draw(6, d), C && R > 0 && T > 0 && A.setScissorRect(0, 0, R, T));
  }, dispose: () => {
    if (!n) {
      if (n = true, h)
        try {
          h.destroy();
        } catch {
        }
      h = null, d = 0;
      try {
        u.destroy();
      } catch {
      }
      R = 0, T = 0, C = null;
    }
  } };
}
var Qo = `// candlestick.wgsl
// Instanced candlestick shader (bodies + wicks):
// - Per-instance vertex input:
//   - xClip, openClip, closeClip, lowClip, highClip, bodyWidthClip (6 floats)
//   - bodyColor rgba (4 floats)
// - Draw call: draw(18, instanceCount) using triangle-list expansion in VS
//   - vertices 0-5: body quad (2 triangles)
//   - vertices 6-11: upper wick (2 triangles)
//   - vertices 12-17: lower wick (2 triangles)
// - Uniforms:
//   - @group(0) @binding(0): VSUniforms { transform, wickWidthClip }

struct VSUniforms {
  transform: mat4x4<f32>,
  wickWidthClip: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct VSIn {
  @location(0) xClip: f32,
  @location(1) openClip: f32,
  @location(2) closeClip: f32,
  @location(3) lowClip: f32,
  @location(4) highClip: f32,
  @location(5) bodyWidthClip: f32,
  @location(6) bodyColor: vec4<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn, @builtin(vertex_index) vertexIndex: u32) -> VSOut {
  // Compute body bounds
  let bodyTop = max(in.openClip, in.closeClip);
  let bodyBottom = min(in.openClip, in.closeClip);
  let bodyLeft = in.xClip - in.bodyWidthClip * 0.5;
  let bodyRight = in.xClip + in.bodyWidthClip * 0.5;

  // Wick bounds
  let wickLeft = in.xClip - vsUniforms.wickWidthClip * 0.5;
  let wickRight = in.xClip + vsUniforms.wickWidthClip * 0.5;

  var pos: vec2<f32>;

  if (vertexIndex < 6u) {
    // Body quad (vertices 0-5)
    let corners = array<vec2<f32>, 6>(
      vec2<f32>(0.0, 0.0),
      vec2<f32>(1.0, 0.0),
      vec2<f32>(0.0, 1.0),
      vec2<f32>(0.0, 1.0),
      vec2<f32>(1.0, 0.0),
      vec2<f32>(1.0, 1.0)
    );
    let corner = corners[vertexIndex];
    let bodyMin = vec2<f32>(bodyLeft, bodyBottom);
    let bodyMax = vec2<f32>(bodyRight, bodyTop);
    pos = bodyMin + corner * (bodyMax - bodyMin);
  } else if (vertexIndex < 12u) {
    // Upper wick (vertices 6-11): from bodyTop to highClip
    let idx = vertexIndex - 6u;
    let corners = array<vec2<f32>, 6>(
      vec2<f32>(0.0, 0.0),
      vec2<f32>(1.0, 0.0),
      vec2<f32>(0.0, 1.0),
      vec2<f32>(0.0, 1.0),
      vec2<f32>(1.0, 0.0),
      vec2<f32>(1.0, 1.0)
    );
    let corner = corners[idx];
    let wickMin = vec2<f32>(wickLeft, bodyTop);
    let wickMax = vec2<f32>(wickRight, in.highClip);
    pos = wickMin + corner * (wickMax - wickMin);
  } else {
    // Lower wick (vertices 12-17): from lowClip to bodyBottom
    let idx = vertexIndex - 12u;
    let corners = array<vec2<f32>, 6>(
      vec2<f32>(0.0, 0.0),
      vec2<f32>(1.0, 0.0),
      vec2<f32>(0.0, 1.0),
      vec2<f32>(0.0, 1.0),
      vec2<f32>(1.0, 0.0),
      vec2<f32>(1.0, 1.0)
    );
    let corner = corners[idx];
    let wickMin = vec2<f32>(wickLeft, in.lowClip);
    let wickMax = vec2<f32>(wickRight, bodyBottom);
    pos = wickMin + corner * (wickMax - wickMin);
  }

  var out: VSOut;
  out.clipPosition = vsUniforms.transform * vec4<f32>(pos, 0.0, 1.0);
  out.color = in.bodyColor;
  return out;
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4<f32> {
  return in.color;
}
`;
var Ll = "bgra8unorm";
var _l = 1;
var Un = 40;
var Mn = Un / 4;
var Ul = (e) => Math.min(1, Math.max(0, e));
var Ui = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var si = (e) => ht(e) ?? [0, 0, 0, 1];
var ki = (e) => {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
};
var kl = (e) => {
  const t = e.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!t) return null;
  const n = Number(t[1]) / 100;
  return Number.isFinite(n) ? n : null;
};
var Gl = (e) => Array.isArray(e);
var ea = (e) => Gl(e) ? { timestamp: e[0], open: e[1], close: e[2], low: e[3], high: e[4] } : { timestamp: e.timestamp, open: e.open, close: e.close, low: e.low, high: e.high };
var zl = (e) => {
  const t = e.devicePixelRatio;
  if (!(t > 0)) return null;
  const n = e.canvasWidth / t, i = e.canvasHeight / t, r = n - e.left - e.right, o = i - e.top - e.bottom;
  return !(r > 0) || !(o > 0) ? null : { plotWidthCss: r, plotHeightCss: o };
};
var Vl = (e) => {
  const { left: t, right: n, top: i, bottom: r, canvasWidth: o, canvasHeight: s, devicePixelRatio: a } = e, u = t * a, f = o - n * a, l = i * a, g = s - r * a, c = u / o * 2 - 1, h = f / o * 2 - 1, d = 1 - l / s * 2, w = 1 - g / s * 2;
  return {
    left: c,
    right: h,
    top: d,
    bottom: w,
    width: h - c,
    height: d - w
  };
};
var Wl = (e) => {
  const { canvasWidth: t, canvasHeight: n, devicePixelRatio: i } = e, r = e.left * i, o = t - e.right * i, s = e.top * i, a = n - e.bottom * i, u = Ui(Math.floor(r), 0, Math.max(0, t)), f = Ui(Math.floor(s), 0, Math.max(0, n)), l = Ui(Math.ceil(o), 0, Math.max(0, t)), g = Ui(Math.ceil(a), 0, Math.max(0, n)), c = Math.max(0, l - u), h = Math.max(0, g - f);
  return { x: u, y: f, w: c, h };
};
var Ol = (e) => {
  const t = [];
  for (let i = 0; i < e.length; i++) {
    const { timestamp: r } = ea(e[i]);
    Number.isFinite(r) && t.push(r);
  }
  if (t.length < 2) return 1;
  t.sort((i, r) => i - r);
  let n = Number.POSITIVE_INFINITY;
  for (let i = 1; i < t.length; i++) {
    const r = t[i] - t[i - 1];
    r > 0 && r < n && (n = r);
  }
  return Number.isFinite(n) && n > 0 ? n : 1;
};
var Xl = (e, t, n, i) => {
  if (Number.isFinite(t) && t > 0) {
    const a = e.scale(0), u = e.scale(0 + t), f = Math.abs(u - a);
    if (Number.isFinite(f) && f > 0) return f;
  }
  const r = Math.abs(n.width);
  if (!(r > 0)) return 0;
  const o = Math.max(1, Math.floor(i));
  return r / o;
};
var $l = () => {
  const e = new ArrayBuffer(64);
  return new Float32Array(e).set([
    1,
    0,
    0,
    0,
    // col0
    0,
    1,
    0,
    0,
    // col1
    0,
    0,
    1,
    0,
    // col2
    0,
    0,
    0,
    1
    // col3
  ]), e;
};
function Yl(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Ll, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }]
  }), u = mt(e, 80, { label: "candlestickRenderer/vsUniforms" });
  ft(e, u, $l());
  const f = new ArrayBuffer(80), l = new Float32Array(f), g = e.createBindGroup({
    layout: a,
    entries: [{ binding: 0, resource: { buffer: u } }]
  }), c = _t(
    e,
    {
      label: "candlestickRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: Qo,
        label: "candlestick.wgsl",
        buffers: [
          {
            arrayStride: Un,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, format: "float32", offset: 0 },
              { shaderLocation: 1, format: "float32", offset: 4 },
              { shaderLocation: 2, format: "float32", offset: 8 },
              { shaderLocation: 3, format: "float32", offset: 12 },
              { shaderLocation: 4, format: "float32", offset: 16 },
              { shaderLocation: 5, format: "float32", offset: 20 },
              { shaderLocation: 6, format: "float32x4", offset: 24 }
            ]
          }
        ]
      },
      fragment: {
        code: Qo,
        label: "candlestick.wgsl",
        formats: i,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let h = null, d = 0, w = new ArrayBuffer(0), P = new Float32Array(w), R = 0, T = 0, C = null, v = false, m = null, x = 0, b = new ArrayBuffer(0), M = new Float32Array(b);
  const I = () => {
    if (n) throw new Error("CandlestickRenderer is disposed.");
  }, A = (N) => {
    if (N <= P.length) return;
    const D = Math.max(8, ki(N));
    w = new ArrayBuffer(D * 4), P = new Float32Array(w);
  }, S = (N) => {
    if (N <= M.length) return;
    const D = Math.max(8, ki(N));
    b = new ArrayBuffer(D * 4), M = new Float32Array(b);
  };
  return { prepare: (N, D, B, E, z, G) => {
    if (I(), D.length === 0) {
      d = 0, x = 0;
      return;
    }
    const Y = zl(z);
    if (!Y) {
      d = 0, x = 0;
      return;
    }
    const V = Vl(z), j = Y.plotWidthCss > 0 ? V.width / Y.plotWidthCss : 0;
    R = z.canvasWidth, T = z.canvasHeight, C = Wl(z);
    const K = Ol(D), J = Xl(B, K, V, D.length);
    let oe = 0;
    const W = N.barWidth;
    if (typeof W == "number")
      oe = Math.max(0, W) * j;
    else if (typeof W == "string") {
      const ye = kl(W);
      oe = ye == null ? 0 : J * Ul(ye);
    }
    const fe = N.barMinWidth * j, _ = N.barMaxWidth * j;
    oe = Math.min(Math.max(oe, fe), _);
    const H = N.itemStyle.borderWidth ?? _l, X = Math.max(0, H) * j;
    l.set([
      1,
      0,
      0,
      0,
      // col0
      0,
      1,
      0,
      0,
      // col1
      0,
      0,
      1,
      0,
      // col2
      0,
      0,
      0,
      1,
      // col3
      X,
      0,
      0,
      0
    ]), ft(e, u, f);
    const pe = si(N.itemStyle.upColor), ce = si(N.itemStyle.downColor), me = si(N.itemStyle.upBorderColor), q = si(N.itemStyle.downBorderColor), se = G ? si(G) : [0, 0, 0, 1];
    v = N.style === "hollow", A(D.length * Mn);
    const te = P;
    let ee = 0;
    v && S(D.length * Mn);
    const be = M;
    let le = 0;
    for (let ye = 0; ye < D.length; ye++) {
      const { timestamp: Be, open: Le, close: st, low: rt, high: ve } = ea(D[ye]);
      if (!Number.isFinite(Be) || !Number.isFinite(Le) || !Number.isFinite(st) || !Number.isFinite(rt) || !Number.isFinite(ve))
        continue;
      const Te = B.scale(Be), Xe = E.scale(Le), He = E.scale(st), ke = E.scale(rt), bt = E.scale(ve);
      if (!Number.isFinite(Te) || !Number.isFinite(Xe) || !Number.isFinite(He) || !Number.isFinite(ke) || !Number.isFinite(bt))
        continue;
      const vt = st > Le;
      if (v) {
        const We = vt ? me : q;
        if (te[ee + 0] = Te, te[ee + 1] = Xe, te[ee + 2] = He, te[ee + 3] = ke, te[ee + 4] = bt, te[ee + 5] = oe, te[ee + 6] = We[0], te[ee + 7] = We[1], te[ee + 8] = We[2], te[ee + 9] = We[3], ee += Mn, vt) {
          const nt = N.itemStyle.borderWidth * j, Rt = Math.max(0, oe - 2 * nt);
          be[le + 0] = Te, be[le + 1] = Xe, be[le + 2] = He, be[le + 3] = ke, be[le + 4] = bt, be[le + 5] = Rt, be[le + 6] = se[0], be[le + 7] = se[1], be[le + 8] = se[2], be[le + 9] = se[3], le += Mn;
        }
      } else {
        const We = vt ? pe : ce;
        te[ee + 0] = Te, te[ee + 1] = Xe, te[ee + 2] = He, te[ee + 3] = ke, te[ee + 4] = bt, te[ee + 5] = oe, te[ee + 6] = We[0], te[ee + 7] = We[1], te[ee + 8] = We[2], te[ee + 9] = We[3], ee += Mn;
      }
    }
    d = ee / Mn, x = le / Mn;
    const ge = Math.max(4, d * Un);
    if (!h || h.size < ge) {
      const ye = Math.max(Math.max(4, ki(ge)), h ? h.size : 0);
      if (h)
        try {
          h.destroy();
        } catch {
        }
      h = e.createBuffer({
        label: "candlestickRenderer/instanceBuffer",
        size: ye,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    if (d > 0 && e.queue.writeBuffer(h, 0, w, 0, d * Un), v && x > 0) {
      const ye = Math.max(4, x * Un);
      if (!m || m.size < ye) {
        const Be = Math.max(Math.max(4, ki(ye)), m ? m.size : 0);
        if (m)
          try {
            m.destroy();
          } catch {
          }
        m = e.createBuffer({
          label: "candlestickRenderer/hollowInstanceBuffer",
          size: Be,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
      }
      e.queue.writeBuffer(m, 0, b, 0, x * Un);
    }
  }, render: (N) => {
    I(), !(!h || d === 0) && (C && R > 0 && T > 0 && N.setScissorRect(C.x, C.y, C.w, C.h), N.setPipeline(c), N.setBindGroup(0, g), N.setVertexBuffer(0, h), N.draw(18, d), v && m && x > 0 && (N.setVertexBuffer(0, m), N.draw(6, x)), C && R > 0 && T > 0 && N.setScissorRect(0, 0, R, T));
  }, dispose: () => {
    if (!n) {
      if (n = true, h)
        try {
          h.destroy();
        } catch {
        }
      if (h = null, d = 0, m)
        try {
          m.destroy();
        } catch {
        }
      m = null, x = 0;
      try {
        u.destroy();
      } catch {
      }
      R = 0, T = 0, C = null;
    }
  } };
}
var es = `// bar.wgsl
// Instanced bar/rect shader:
// - Per-instance vertex input:
//   - rect  = vec4<f32>(x, y, width, height) in CLIP space
//   - color = vec4<f32>(r, g, b, a) in [0..1]
// - Draw call: draw(6, instanceCount) using triangle-list expansion in VS
// - Uniforms:
//   - @group(0) @binding(0): VSUniforms { transform }

struct VSUniforms {
  transform: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct VSIn {
  // rect.xy = origin, rect.zw = size (width, height)
  @location(0) rect: vec4<f32>,
  @location(1) color: vec4<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn, @builtin(vertex_index) vertexIndex: u32) -> VSOut {
  // Fixed local corners for 2 triangles (triangle-list).
  let corners = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(1.0, 1.0)
  );

  // Normalize negative width/height by computing min/max extents.
  let p0 = in.rect.xy;
  let p1 = in.rect.xy + in.rect.zw;
  let rectMin = min(p0, p1);
  let rectMax = max(p0, p1);
  let rectSize = rectMax - rectMin;

  let corner = corners[vertexIndex];
  let pos = rectMin + corner * rectSize;

  var out: VSOut;
  out.clipPosition = vsUniforms.transform * vec4<f32>(pos, 0.0, 1.0);
  out.color = in.color;
  return out;
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4<f32> {
  return in.color;
}

`;
var Hl = "bgra8unorm";
var ql = 0.01;
var Zl = 0.2;
var ji = 32;
var Rr = ji / 4;
var Dr = (e) => Math.min(1, Math.max(0, e));
var jl = (e) => ht(e) ?? [0, 0, 0, 1];
var ts = (e) => {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
};
var Kl = () => {
  const e = new ArrayBuffer(64);
  return new Float32Array(e).set([
    1,
    0,
    0,
    0,
    // col0
    0,
    1,
    0,
    0,
    // col1
    0,
    0,
    1,
    0,
    // col2
    0,
    0,
    0,
    1
    // col3
  ]), e;
};
var Jl = (e) => {
  const t = e.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!t) return null;
  const n = Number(t[1]) / 100;
  return Number.isFinite(n) ? n : null;
};
var ns = (e) => {
  if (typeof e != "string") return "";
  const t = e.trim();
  return t.length > 0 ? t : "";
};
var Ql = (e) => {
  const t = e.devicePixelRatio;
  if (!(t > 0)) return null;
  const n = e.canvasWidth / t, i = e.canvasHeight / t, r = n - e.left - e.right, o = i - e.top - e.bottom;
  return !(r > 0) || !(o > 0) ? null : { plotWidthCss: r, plotHeightCss: o };
};
var eu = (e) => {
  const { left: t, right: n, top: i, bottom: r, canvasWidth: o, canvasHeight: s, devicePixelRatio: a } = e, u = t * a, f = o - n * a, l = i * a, g = s - r * a, c = u / o * 2 - 1, h = f / o * 2 - 1, d = 1 - l / s * 2, w = 1 - g / s * 2;
  return { left: c, right: h, top: d, bottom: w };
};
var tu = (e, t, n, i) => {
  if (Number.isFinite(t) && t > 0) {
    const a = e.scale(0), u = e.scale(0 + t), f = Math.abs(u - a);
    if (Number.isFinite(f) && f > 0) return f;
  }
  const r = Math.abs(n.right - n.left);
  if (!(r > 0)) return 0;
  const o = Math.max(1, Math.floor(i));
  return r / o;
};
function nu(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Hl, r = t == null ? void 0 : t.sampleCount, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }
    ]
  }), u = mt(e, 64, { label: "barRenderer/vsUniforms" });
  ft(e, u, Kl());
  const f = e.createBindGroup({
    layout: a,
    entries: [
      { binding: 0, resource: { buffer: u } }
    ]
  }), l = _t(
    e,
    {
      label: "barRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: es,
        label: "bar.wgsl",
        buffers: [
          {
            arrayStride: ji,
            // rect vec4 + color vec4
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, format: "float32x4", offset: 0 },
              { shaderLocation: 1, format: "float32x4", offset: 16 }
            ]
          }
        ]
      },
      fragment: {
        code: es,
        label: "bar.wgsl",
        formats: i,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let g = null, c = 0, h = new ArrayBuffer(0), d = new Float32Array(h);
  const w = [], P = () => {
    if (n) throw new Error("BarRenderer is disposed.");
  }, R = (I) => {
    if (I <= d.length) return;
    const A = Math.max(8, ts(I));
    h = new ArrayBuffer(A * 4), d = new Float32Array(h);
  }, T = (I) => {
    w.length = 0;
    for (let S = 0; S < I.length; S++) {
      const p = I[S].data, y = Ie(p);
      for (let F = 0; F < y; F++) {
        const N = Ae(p, F);
        Number.isFinite(N) && w.push(N);
      }
    }
    if (w.length < 2) return 1;
    w.sort((S, p) => S - p);
    let A = Number.POSITIVE_INFINITY;
    for (let S = 1; S < w.length; S++) {
      const p = w[S] - w[S - 1];
      p > 0 && p < A && (A = p);
    }
    return Number.isFinite(A) && A > 0 ? A : 1;
  }, C = (I) => {
    let A, S, p;
    for (let y = 0; y < I.length; y++) {
      const F = I[y];
      A === void 0 && F.barWidth !== void 0 && (A = F.barWidth), S === void 0 && F.barGap !== void 0 && (S = F.barGap), p === void 0 && F.barCategoryGap !== void 0 && (p = F.barCategoryGap);
    }
    return { barWidth: A, barGap: S, barCategoryGap: p };
  }, v = (I) => {
    let A = Number.POSITIVE_INFINITY, S = Number.NEGATIVE_INFINITY;
    for (let p = 0; p < I.length; p++) {
      const y = I[p].data, F = Ie(y);
      for (let N = 0; N < F; N++) {
        const D = Ue(y, N);
        Number.isFinite(D) && (D < A && (A = D), D > S && (S = D));
      }
    }
    return !Number.isFinite(A) || !Number.isFinite(S) || A <= 0 && 0 <= S ? 0 : Math.abs(A) < Math.abs(S) ? A : S;
  }, m = (I, A, S) => {
    const p = A.invert(S.bottom), y = A.invert(S.top), F = Math.min(p, y), N = Math.max(p, y);
    return !Number.isFinite(F) || !Number.isFinite(N) ? v(I) : F <= 0 && 0 <= N ? 0 : F > 0 ? F : N < 0 ? N : v(I);
  };
  return { prepare: (I, A, S, p, y) => {
    if (P(), I.length === 0) {
      c = 0;
      return;
    }
    const F = Ql(y);
    if (!F) {
      c = 0;
      return;
    }
    const N = eu(y), D = N.right - N.left, B = F.plotWidthCss > 0 ? D / F.plotWidthCss : 0, E = /* @__PURE__ */ new Map(), z = new Array(I.length);
    let G = 0;
    for (let ge = 0; ge < I.length; ge++) {
      const ye = ns(I[ge].stack);
      if (ye !== "") {
        const Be = E.get(ye);
        if (Be !== void 0)
          z[ge] = Be;
        else {
          const Le = G++;
          E.set(ye, Le), z[ge] = Le;
        }
      } else
        z[ge] = G++;
    }
    G = Math.max(1, G);
    const Y = T(I), V = C(I), j = Dr(V.barGap ?? ql), K = Dr(V.barCategoryGap ?? Zl);
    let J = 1;
    for (let ge = 0; ge < I.length; ge++) {
      const ye = Ie(I[ge].data);
      J = Math.max(J, Math.floor(ye));
    }
    const oe = tu(S, Y, N, J), W = Math.max(0, oe * (1 - K)), fe = G + Math.max(0, G - 1) * j, _ = fe > 0 ? W / fe : 0;
    let H = 0;
    const X = V.barWidth;
    if (typeof X == "number")
      H = Math.max(0, X) * B, H = Math.min(H, _);
    else if (typeof X == "string") {
      const ge = Jl(X);
      H = ge == null ? 0 : _ * Dr(ge);
    }
    H > 0 || (H = _);
    const pe = H * j, ce = G * H + Math.max(0, G - 1) * pe;
    let me = m(I, p, N), q = p.scale(me);
    if (!Number.isFinite(q)) {
      const ge = v(I);
      if (me = ge, q = p.scale(ge), Number.isFinite(q) || (me = 0, q = p.scale(0)), !Number.isFinite(q)) {
        c = 0;
        return;
      }
    }
    let se = 0;
    for (let ge = 0; ge < I.length; ge++)
      se += Math.max(0, Ie(I[ge].data));
    R(se * Rr);
    const te = d;
    let ee = 0;
    const be = /* @__PURE__ */ new Map();
    for (let ge = 0; ge < I.length; ge++) {
      const ye = I[ge], Be = ye.data, [Le, st, rt, ve] = jl(ye.color), Te = ns(ye.stack), Xe = z[ge] ?? 0, He = Ie(Be);
      for (let ke = 0; ke < He; ke++) {
        const bt = Ae(Be, ke), vt = Ue(Be, ke), We = S.scale(bt);
        if (!Number.isFinite(We) || !Number.isFinite(vt)) continue;
        const nt = We - ce / 2 + Xe * (H + pe);
        let Rt = q, Wt = 0;
        if (Te !== "") {
          let Ft = be.get(Te);
          Ft || (Ft = /* @__PURE__ */ new Map(), be.set(Te, Ft));
          let Ut;
          Number.isFinite(oe) && oe > 0 && Number.isFinite(We) ? Ut = Math.round((We - N.left) / oe) : Number.isFinite(Y) && Y > 0 ? Ut = Math.round(bt / Y) : Ut = Math.round(bt * 1e6);
          let Ot = Ft.get(Ut);
          Ot || (Ot = { posSum: me, negSum: me }, Ft.set(Ut, Ot));
          let wt, Qe;
          vt >= 0 ? (wt = Ot.posSum, Qe = wt + vt, Ot.posSum = Qe) : (wt = Ot.negSum, Qe = wt + vt, Ot.negSum = Qe);
          const kt = p.scale(wt), Xt = p.scale(Qe);
          if (!Number.isFinite(kt) || !Number.isFinite(Xt)) continue;
          Rt = kt, Wt = Xt - kt;
        } else {
          const Ft = p.scale(vt);
          if (!Number.isFinite(Ft)) continue;
          Wt = Ft - q;
        }
        te[ee + 0] = nt, te[ee + 1] = Rt, te[ee + 2] = H, te[ee + 3] = Wt, te[ee + 4] = Le, te[ee + 5] = st, te[ee + 6] = rt, te[ee + 7] = ve, ee += Rr;
      }
    }
    c = ee / Rr;
    const le = Math.max(4, c * ji);
    if (!g || g.size < le) {
      const ge = Math.max(Math.max(4, ts(le)), g ? g.size : 0);
      if (g)
        try {
          g.destroy();
        } catch {
        }
      g = e.createBuffer({
        label: "barRenderer/instanceBuffer",
        size: ge,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    c > 0 && e.queue.writeBuffer(g, 0, h, 0, c * ji);
  }, render: (I) => {
    P(), !(!g || c === 0) && (I.setPipeline(l), I.setBindGroup(0, f), I.setVertexBuffer(0, g), I.draw(6, c));
  }, dispose: () => {
    if (!n) {
      if (n = true, g)
        try {
          g.destroy();
        } catch {
        }
      g = null, c = 0;
      try {
        u.destroy();
      } catch {
      }
    }
  } };
}
function iu(e) {
  const { device: t, targetFormat: n, pipelineCache: i, sampleCount: r } = e, o = [], s = [], a = [], u = [], f = [], l = [], g = nu(t, { targetFormat: n, pipelineCache: i, sampleCount: r });
  function c(m) {
    for (; o.length > m; ) {
      const x = o.pop();
      x == null || x.dispose();
    }
    for (; o.length < m; )
      o.push(il(t, { targetFormat: n, pipelineCache: i, sampleCount: r }));
  }
  function h(m) {
    for (; s.length > m; ) {
      const x = s.pop();
      x == null || x.dispose();
    }
    for (; s.length < m; )
      s.push(cl(t, { targetFormat: n, pipelineCache: i, sampleCount: r }));
  }
  function d(m) {
    for (; a.length > m; ) {
      const x = a.pop();
      x == null || x.dispose();
    }
    for (; a.length < m; )
      a.push(pl(t, { targetFormat: n, pipelineCache: i, sampleCount: r }));
  }
  function w(m) {
    for (; u.length > m; ) {
      const x = u.pop();
      x == null || x.dispose();
    }
    for (; u.length < m; )
      u.push(Nl(t, { targetFormat: n, pipelineCache: i, sampleCount: r }));
  }
  function P(m) {
    for (; f.length > m; ) {
      const x = f.pop();
      x == null || x.dispose();
    }
    for (; f.length < m; )
      f.push(Bl(t, { targetFormat: n, pipelineCache: i, sampleCount: r }));
  }
  function R(m) {
    for (; l.length > m; ) {
      const x = l.pop();
      x == null || x.dispose();
    }
    for (; l.length < m; )
      l.push(Yl(t, { targetFormat: n, pipelineCache: i, sampleCount: r }));
  }
  let T = null;
  function C() {
    return T || (T = {
      areaRenderers: o,
      lineRenderers: s,
      scatterRenderers: a,
      scatterDensityRenderers: u,
      pieRenderers: f,
      candlestickRenderers: l,
      barRenderer: g
    }), T;
  }
  function v() {
    for (let m = 0; m < o.length; m++)
      o[m].dispose();
    o.length = 0;
    for (let m = 0; m < s.length; m++)
      s[m].dispose();
    s.length = 0;
    for (let m = 0; m < a.length; m++)
      a[m].dispose();
    a.length = 0;
    for (let m = 0; m < u.length; m++)
      u[m].dispose();
    u.length = 0;
    for (let m = 0; m < f.length; m++)
      f[m].dispose();
    f.length = 0;
    for (let m = 0; m < l.length; m++)
      l[m].dispose();
    l.length = 0, g.dispose();
  }
  return {
    ensureAreaRendererCount: c,
    ensureLineRendererCount: h,
    ensureScatterRendererCount: d,
    ensureScatterDensityRendererCount: w,
    ensurePieRendererCount: P,
    ensureCandlestickRendererCount: R,
    getState: C,
    dispose: v
  };
}
var Vn = 4;
var ui = 4;
var is = `
struct VSOut { @builtin(position) pos: vec4f };

@vertex
fn vsMain(@builtin(vertex_index) i: u32) -> VSOut {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var o: VSOut;
  o.pos = vec4f(positions[i], 0.0, 1.0);
  return o;
}

// Using textureLoad (no filtering) for pixel-exact blit into the MSAA overlay pass.
@group(0) @binding(0) var srcTex: texture_2d<f32>;

@fragment
fn fsMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let xy = vec2<i32>(pos.xy);
  return textureLoad(srcTex, xy, 0);
}
`;
function En(e) {
  if (e)
    try {
      e.destroy();
    } catch {
    }
}
function ru(e) {
  const { device: t, targetFormat: n } = e, i = {
    mainColorTexture: null,
    mainColorView: null,
    mainResolveTexture: null,
    mainResolveView: null,
    overlayMsaaTexture: null,
    overlayMsaaView: null,
    overlayBlitBindGroup: null,
    overlayTargetsWidth: 0,
    overlayTargetsHeight: 0,
    overlayTargetsFormat: null
  }, r = t.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: "float", viewDimension: "2d" }
    }]
  }), o = _t(t, {
    label: "textureManager/overlayBlitPipeline",
    bindGroupLayouts: [r],
    vertex: { code: is, label: "textureManager/overlayBlit.wgsl" },
    fragment: { code: is, label: "textureManager/overlayBlit.wgsl", formats: n },
    primitive: { topology: "triangle-list", cullMode: "none" },
    multisample: { count: ui }
  }, e.pipelineCache);
  function s(l, g) {
    const c = Number.isFinite(l) ? Math.max(1, Math.floor(l)) : 1, h = Number.isFinite(g) ? Math.max(1, Math.floor(g)) : 1;
    i.mainColorTexture && i.mainResolveTexture && i.overlayMsaaTexture && i.overlayBlitBindGroup && i.overlayTargetsWidth === c && i.overlayTargetsHeight === h && i.overlayTargetsFormat === n || (En(i.mainColorTexture), En(i.mainResolveTexture), En(i.overlayMsaaTexture), i.mainColorTexture = t.createTexture({
      label: "textureManager/mainColorTexture",
      size: { width: c, height: h },
      sampleCount: Vn,
      format: n,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    }), i.mainColorView = i.mainColorTexture.createView(), i.mainResolveTexture = t.createTexture({
      label: "textureManager/mainResolveTexture",
      size: { width: c, height: h },
      format: n,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    }), i.mainResolveView = i.mainResolveTexture.createView(), i.overlayMsaaTexture = t.createTexture({
      label: "textureManager/annotationOverlayMsaaTexture",
      size: { width: c, height: h },
      sampleCount: ui,
      format: n,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    }), i.overlayMsaaView = i.overlayMsaaTexture.createView(), i.overlayBlitBindGroup = t.createBindGroup({
      label: "textureManager/overlayBlitBindGroup",
      layout: r,
      entries: [{ binding: 0, resource: i.mainResolveView }]
    }), i.overlayTargetsWidth = c, i.overlayTargetsHeight = h, i.overlayTargetsFormat = n, a = null);
  }
  let a = null;
  function u() {
    return a || (a = {
      mainColorView: i.mainColorView,
      mainResolveView: i.mainResolveView,
      overlayMsaaView: i.overlayMsaaView,
      overlayBlitBindGroup: i.overlayBlitBindGroup,
      overlayBlitPipeline: o,
      msaaSampleCount: ui,
      mainSceneMsaaSampleCount: Vn
    }), a;
  }
  function f() {
    En(i.mainColorTexture), En(i.mainResolveTexture), En(i.overlayMsaaTexture), i.mainColorTexture = null, i.mainColorView = null, i.mainResolveTexture = null, i.mainResolveView = null, i.overlayMsaaTexture = null, i.overlayMsaaView = null, i.overlayBlitBindGroup = null, i.overlayTargetsWidth = 0, i.overlayTargetsHeight = 0, i.overlayTargetsFormat = null, a = null;
  }
  return {
    ensureTextures: s,
    getState: u,
    dispose: f
  };
}
var rs = `// crosshair.wgsl
// Minimal crosshair line shader:
// - Vertex input: vec2<f32> position in clip-space coordinates
// - VS uniform: transform mat4 (identity)
// - FS uniform: solid RGBA color

struct VSUniforms {
  transform: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct FSUniforms {
  color: vec4<f32>,
};

@group(0) @binding(1) var<uniform> fsUniforms: FSUniforms;

struct VSIn {
  @location(0) position: vec2<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn) -> VSOut {
  var out: VSOut;
  out.clipPosition = vsUniforms.transform * vec4<f32>(in.position, 0.0, 1.0);
  return out;
}

@fragment
fn fsMain() -> @location(0) vec4<f32> {
  return fsUniforms.color;
}

`;
var ou = (e) => e + 3 & -4;
var su = 1024;
var au = 128;
var cu = 16384;
var lu = (e) => {
  if (e.byteOffset & 3)
    throw new Error("createStreamBuffer.write: data.byteOffset must be 4-byte aligned.");
  return new Uint32Array(e.buffer, e.byteOffset, e.byteLength >>> 2);
};
function uu(e, t) {
  if (!Number.isFinite(t) || t <= 0)
    throw new Error(`createStreamBuffer(maxSize): maxSize (bytes) must be a positive number. Received: ${String(t)}`);
  const n = Math.max(4, Math.floor(t)), i = ou(n), r = e.limits.maxBufferSize;
  if (i > r)
    throw new Error(
      `createStreamBuffer(maxSize): requested size ${i} bytes exceeds device.limits.maxBufferSize (${r}).`
    );
  const o = i >>> 2, s = (T) => ({
    buffer: e.createBuffer({
      label: T,
      size: i,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    }),
    mirror: new Uint32Array(o)
  }), a = [s("streamBuffer/a"), s("streamBuffer/b")];
  let u = false, f = 0, l = 0;
  const g = () => {
    if (u) throw new Error("createStreamBuffer: StreamBuffer is disposed.");
  }, c = (T, C, v) => {
    const m = a[T], x = m.mirror;
    if (v < 0 || v > C.length)
      throw new Error("createStreamBuffer.write: internal error (invalid usedWords).");
    if (v === 0) return;
    const b = v << 2;
    e.queue.writeBuffer(m.buffer, 0, C.buffer, C.byteOffset, b), x.set(C.subarray(0, v), 0);
  }, h = (T, C, v) => {
    const m = a[T], x = m.mirror;
    if (v < 0 || v > C.length)
      throw new Error("createStreamBuffer.write: internal error (invalid usedWords).");
    const b = v << 2;
    if (b > 0 && b <= su) {
      c(T, C, v);
      return;
    }
    const M = [];
    let I = 0, A = 0, S = 0;
    for (; S < v; ) {
      for (; S < v && x[S] === C[S]; ) S++;
      if (S >= v) break;
      const p = S;
      for (S++; S < v && x[S] !== C[S]; ) S++;
      const y = S;
      if (M.push([p, y]), I++, A += y - p, I > au || A > cu) {
        c(T, C, v);
        return;
      }
    }
    for (let p = 0; p < M.length; p++) {
      const [y, F] = M[p], N = y << 2, D = F - y << 2;
      e.queue.writeBuffer(m.buffer, N, C.buffer, C.byteOffset + N, D), x.set(C.subarray(y, F), y);
    }
  };
  return { write: (T) => {
    if (g(), T.length & 1)
      throw new Error("createStreamBuffer.write: data length must be even (vec2<f32> vertices).");
    const C = T.byteLength;
    if (C > i)
      throw new Error(
        `createStreamBuffer.write: data.byteLength (${C}) exceeds capacity (${i}). Increase maxSize.`
      );
    const v = T.length >>> 1;
    if (C === 0) {
      l = v;
      return;
    }
    const m = lu(T), x = 1 - f;
    h(x, m, m.length), f = x, l = v;
  }, getBuffer: () => (g(), a[f].buffer), getVertexCount: () => (g(), l), dispose: () => {
    if (!u) {
      u = true, l = 0;
      for (const T of a)
        try {
          T.buffer.destroy();
        } catch {
        }
    }
  } };
}
var fu = "bgra8unorm";
var du = [1, 1, 1, 0.8];
var mu = 8;
var pu = 6;
var hu = 4;
var ta = 8192;
var yu = () => {
  const e = new ArrayBuffer(64);
  return new Float32Array(e).set([
    1,
    0,
    0,
    0,
    // col0
    0,
    1,
    0,
    0,
    // col1
    0,
    0,
    1,
    0,
    // col2
    0,
    0,
    0,
    1
    // col3
  ]), e;
};
var gu = (e) => Number.isFinite(e.left) && Number.isFinite(e.right) && Number.isFinite(e.top) && Number.isFinite(e.bottom) && Number.isFinite(e.canvasWidth) && Number.isFinite(e.canvasHeight);
var Gi = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var xu = (e, t) => {
  if (!Number.isFinite(e) || e < 0)
    throw new Error("CrosshairRenderer.prepare: lineWidth must be a finite non-negative number.");
  if (e === 0) return [];
  const n = e * t, i = Math.max(1, Math.min(mu, Math.round(n))), r = (i - 1) / 2, o = [];
  for (let s = 0; s < i; s++) o.push(s - r);
  return o;
};
var Bn = (e, t) => e / t * 2 - 1;
var Ln = (e, t) => 1 - e / t * 2;
var zi = (e, t) => {
  e.push(t[0], t[1], t[2], t[3]);
};
var os = (e, t) => {
  if (!Number.isFinite(e) || !Number.isFinite(t)) return [];
  const n = Math.min(e, t), i = Math.max(e, t);
  if (i <= n) return [];
  const r = pu, s = r + hu;
  if (!Number.isFinite(s)) return [];
  const a = Math.ceil((i - n) / s);
  if (!Number.isFinite(a) || a <= 0) return [];
  const u = [];
  let f = n;
  for (; f < i; ) {
    const l = f, g = Math.min(f + r, i);
    g > l && u.push([l, g]), f += s;
  }
  return u;
};
var bu = (e, t, n, i) => {
  if (!Number.isFinite(e) || !Number.isFinite(t))
    throw new Error("CrosshairRenderer.prepare: x and y must be finite numbers.");
  if (!gu(n))
    throw new Error("CrosshairRenderer.prepare: gridArea dimensions must be finite numbers.");
  if (n.canvasWidth <= 0 || n.canvasHeight <= 0)
    throw new Error("CrosshairRenderer.prepare: canvas dimensions must be positive.");
  if (n.left < 0 || n.right < 0 || n.top < 0 || n.bottom < 0)
    throw new Error("CrosshairRenderer.prepare: gridArea margins must be non-negative.");
  const { canvasWidth: r, canvasHeight: o } = n, s = Number.isFinite(n.devicePixelRatio) && n.devicePixelRatio > 0 ? n.devicePixelRatio : 1, a = n.left * s, u = r - n.right * s, f = n.top * s, l = o - n.bottom * s, g = Gi(Math.floor(a), 0, Math.max(0, r)), c = Gi(Math.floor(f), 0, Math.max(0, o)), h = Gi(Math.ceil(u), 0, Math.max(0, r)), d = Gi(Math.ceil(l), 0, Math.max(0, o)), w = Math.max(0, h - g), P = Math.max(0, d - c), R = e * s, T = t * s, C = xu(i.lineWidth, s);
  if (C.length === 0 || !i.showX && !i.showY)
    return {
      vertices: new Float32Array(0),
      scissor: { x: g, y: c, w, h: P }
    };
  const v = [], m = i.showX ? os(f, l) : [], x = i.showY ? os(a, u) : [], M = ((i.showX ? m.length : 0) + (i.showY ? x.length : 0)) * C.length * 2, I = M > 0 && M <= ta, A = (y) => {
    const F = Bn(y, r), N = Ln(f, o), D = Ln(l, o);
    zi(v, [F, N, F, D]);
  }, S = (y) => {
    const F = Ln(y, o), N = Bn(a, r), D = Bn(u, r);
    zi(v, [N, F, D, F]);
  };
  if (i.showX)
    for (let y = 0; y < C.length; y++) {
      const F = R + C[y];
      if (!I) {
        A(F);
        continue;
      }
      const N = Bn(F, r);
      for (let D = 0; D < m.length; D++) {
        const [B, E] = m[D], z = Ln(B, o), G = Ln(E, o);
        zi(v, [N, z, N, G]);
      }
    }
  if (i.showY)
    for (let y = 0; y < C.length; y++) {
      const F = T + C[y];
      if (!I) {
        S(F);
        continue;
      }
      const N = Ln(F, o);
      for (let D = 0; D < x.length; D++) {
        const [B, E] = x[D], z = Bn(B, r), G = Bn(E, r);
        zi(v, [z, N, G, N]);
      }
    }
  return { vertices: new Float32Array(v), scissor: { x: g, y: c, w, h: P } };
};
function vu(e, t) {
  let n = false, i = true;
  const r = (t == null ? void 0 : t.targetFormat) ?? fu, o = (t == null ? void 0 : t.sampleCount) ?? 1, s = Number.isFinite(o) ? Math.max(1, Math.floor(o)) : 1, a = t == null ? void 0 : t.pipelineCache, u = e.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
    ]
  }), f = mt(e, 64, { label: "crosshairRenderer/vsUniforms" }), l = mt(e, 16, { label: "crosshairRenderer/fsUniforms" }), g = e.createBindGroup({
    layout: u,
    entries: [
      { binding: 0, resource: { buffer: f } },
      { binding: 1, resource: { buffer: l } }
    ]
  }), c = _t(
    e,
    {
      label: "crosshairRenderer/pipeline",
      bindGroupLayouts: [u],
      vertex: {
        code: rs,
        label: "crosshair.wgsl",
        buffers: [
          {
            arrayStride: 8,
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }]
          }
        ]
      },
      fragment: {
        code: rs,
        label: "crosshair.wgsl",
        formats: r,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "line-list", cullMode: "none" },
      multisample: { count: s }
    },
    a
  ), h = uu(e, ta * 8);
  let d = 0, w = 0, P = 0, R = { x: 0, y: 0, w: 0, h: 0 };
  const T = () => {
    if (n) throw new Error("CrosshairRenderer is disposed.");
  };
  return { prepare: (b, M, I, A) => {
    if (T(), typeof A.showX != "boolean" || typeof A.showY != "boolean")
      throw new Error("CrosshairRenderer.prepare: showX/showY must be boolean.");
    if (typeof A.color != "string")
      throw new Error("CrosshairRenderer.prepare: color must be a string.");
    if (!Number.isFinite(A.lineWidth) || A.lineWidth < 0)
      throw new Error("CrosshairRenderer.prepare: lineWidth must be a finite non-negative number.");
    const { vertices: S, scissor: p } = bu(b, M, I, A);
    S.byteLength === 0 ? d = 0 : (h.write(S), d = h.getVertexCount()), ft(e, f, yu());
    const y = ht(A.color) ?? du, F = new ArrayBuffer(4 * 4);
    new Float32Array(F).set([y[0], y[1], y[2], y[3]]), ft(e, l, F), w = I.canvasWidth, P = I.canvasHeight, R = p;
  }, render: (b) => {
    T(), i && d !== 0 && (w <= 0 || P <= 0 || (b.setScissorRect(R.x, R.y, R.w, R.h), b.setPipeline(c), b.setBindGroup(0, g), b.setVertexBuffer(0, h.getBuffer()), b.draw(d), b.setScissorRect(0, 0, w, P)));
  }, setVisible: (b) => {
    T(), i = !!b;
  }, dispose: () => {
    if (!n) {
      n = true;
      try {
        f.destroy();
      } catch {
      }
      try {
        l.destroy();
      } catch {
      }
      h.dispose(), d = 0, w = 0, P = 0, R = { x: 0, y: 0, w: 0, h: 0 };
    }
  } };
}
var ss = `// highlight.wgsl
// Draws an anti-aliased ring highlight around a point.
//
// Contract:
// - \`@builtin(position)\` in the fragment stage is framebuffer-space pixels.
// - The renderer supplies \`center\` and ring sizes in *device pixels*.

struct Uniforms {
  center: vec2<f32>,
  radius: f32,
  thickness: f32,
  color: vec4<f32>,
  outlineColor: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) position: vec4<f32>,
};

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VSOut {
  // Fullscreen triangle.
  // Covers clip-space [-1,1] with 3 verts: (-1,-1), (3,-1), (-1,3)
  let positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );

  var out: VSOut;
  out.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  return out;
}

fn ringCoverage(distancePx: f32, radiusPx: f32, thicknessPx: f32) -> f32 {
  let aa = 1.0; // ~1px antialias band (device pixels)
  let halfT = max(0.5, thicknessPx * 0.5);
  let a0 = smoothstep(radiusPx - halfT - aa, radiusPx - halfT + aa, distancePx);
  let a1 = smoothstep(radiusPx + halfT - aa, radiusPx + halfT + aa, distancePx);
  return clamp(a0 - a1, 0.0, 1.0);
}

@fragment
fn fsMain(@builtin(position) fragPos: vec4<f32>) -> @location(0) vec4<f32> {
  let d = distance(fragPos.xy, u.center);

  let ring = ringCoverage(d, u.radius, u.thickness);
  let outline = ringCoverage(d, u.radius, u.thickness + 2.0);

  let cover = max(ring, outline);
  if (cover <= 0.0) {
    discard;
  }

  // Blend between outline and ring color based on relative coverage,
  // then apply total coverage as alpha.
  let t = clamp(select(0.0, ring / cover, cover > 0.0), 0.0, 1.0);
  let rgb = mix(u.outlineColor.rgb, u.color.rgb, t);
  let a = mix(u.outlineColor.a, u.color.a, t) * cover;
  return vec4<f32>(rgb, a);
}

`;
var wu = "bgra8unorm";
var Cu = [1, 1, 1, 1];
var Vi = (e) => Math.min(1, Math.max(0, e));
var Wi = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var Mu = (e) => Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.w) && Number.isFinite(e.h);
var Su = (e, t) => {
  const n = Number.isFinite(t) ? t : 1;
  return [Vi(e[0] * n), Vi(e[1] * n), Vi(e[2] * n), Vi(e[3])];
};
var Fu = (e) => 0.2126 * e[0] + 0.7152 * e[1] + 0.0722 * e[2];
function Nu(e, t) {
  let n = false, i = true;
  const r = (t == null ? void 0 : t.targetFormat) ?? wu, o = (t == null ? void 0 : t.sampleCount) ?? 1, s = Number.isFinite(o) ? Math.max(1, Math.floor(o)) : 1, a = t == null ? void 0 : t.pipelineCache, u = e.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }]
  }), f = mt(e, 48, { label: "highlightRenderer/uniforms" }), l = e.createBindGroup({
    layout: u,
    entries: [{ binding: 0, resource: { buffer: f } }]
  }), g = _t(
    e,
    {
      label: "highlightRenderer/pipeline",
      bindGroupLayouts: [u],
      vertex: { code: ss, label: "highlight.wgsl" },
      fragment: {
        code: ss,
        label: "highlight.wgsl",
        formats: r,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: s }
    },
    a
  );
  let c = 0, h = 0, d = { x: 0, y: 0, w: 0, h: 0 }, w = false;
  const P = () => {
    if (n) throw new Error("HighlightRenderer is disposed.");
  };
  return { prepare: (m, x, b) => {
    if (P(), !Number.isFinite(m.centerDeviceX) || !Number.isFinite(m.centerDeviceY))
      throw new Error("HighlightRenderer.prepare: point center must be finite.");
    if (!Number.isFinite(m.canvasWidth) || !Number.isFinite(m.canvasHeight) || m.canvasWidth <= 0 || m.canvasHeight <= 0)
      throw new Error("HighlightRenderer.prepare: canvasWidth/canvasHeight must be positive finite numbers.");
    if (!Mu(m.scissor))
      throw new Error("HighlightRenderer.prepare: scissor must be finite.");
    if (!Number.isFinite(b) || b < 0)
      throw new Error("HighlightRenderer.prepare: size must be a finite non-negative number.");
    const M = m.devicePixelRatio, I = Number.isFinite(M) && M > 0 ? M : 1, A = b * I, S = Math.max(1, A * 1.5), p = Math.max(1, Math.round(Math.max(2, S * 0.25))), y = ht(x) ?? Cu, F = Su(y, 1.25), D = Fu(y) > 0.7 ? [0, 0, 0, 0.9] : [1, 1, 1, 0.9], B = new ArrayBuffer(12 * 4);
    new Float32Array(B).set([
      m.centerDeviceX,
      m.centerDeviceY,
      S,
      p,
      F[0],
      F[1],
      F[2],
      1,
      D[0],
      D[1],
      D[2],
      D[3]
    ]), ft(e, f, B), c = m.canvasWidth, h = m.canvasHeight;
    const E = Wi(Math.floor(m.scissor.x), 0, Math.max(0, m.canvasWidth)), z = Wi(Math.floor(m.scissor.y), 0, Math.max(0, m.canvasHeight)), G = Wi(Math.ceil(m.scissor.x + m.scissor.w), 0, Math.max(0, m.canvasWidth)), Y = Wi(Math.ceil(m.scissor.y + m.scissor.h), 0, Math.max(0, m.canvasHeight));
    d = { x: E, y: z, w: Math.max(0, G - E), h: Math.max(0, Y - z) }, w = true;
  }, render: (m) => {
    P(), i && w && (c <= 0 || h <= 0 || d.w === 0 || d.h === 0 || (m.setScissorRect(d.x, d.y, d.w, d.h), m.setPipeline(g), m.setBindGroup(0, l), m.draw(3), m.setScissorRect(0, 0, c, h)));
  }, setVisible: (m) => {
    P(), i = !!m;
  }, dispose: () => {
    if (!n) {
      n = true;
      try {
        f.destroy();
      } catch {
      }
      c = 0, h = 0, d = { x: 0, y: 0, w: 0, h: 0 }, w = false;
    }
  } };
}
var as = `// Reference line renderer (axis-aligned, instanced quads).
//
// Coordinate conventions:
// - Instance position is provided in CANVAS-LOCAL CSS pixels (same coordinate space as pointer events).
// - Plot rect is provided in DEVICE pixels (computed from grid margins + DPR).
// - Line width and dash lengths are provided in CSS pixels and converted in-shader using DPR.
//
// Scissoring/clipping:
// - The render coordinator is expected to set a scissor rect for the plot area before drawing.
// - This shader simply draws full-height/full-width quads; clipping is handled by scissor.
//
// Dash semantics:
// - lineDash is a repeating on/off sequence in CSS pixels, starting with "on" at t=0.
// - Up to 8 dash entries are supported per line (truncated on CPU).
//
// Performance:
// - Vertex stage expands each instance into a quad (2 triangles, 6 vertices).
// - We intentionally avoid snapping to integer device pixels to prevent visible stepping/jiggle
//   while zooming; edge AA is handled in the fragment stage.

struct VSUniforms {
  canvasSize : vec2<f32>,     // device pixels (canvas.width, canvas.height)
  plotOrigin : vec2<f32>,     // device pixels (plotLeft, plotTop)
  plotSize : vec2<f32>,       // device pixels (plotWidth, plotHeight)
  devicePixelRatio : f32,
  _pad0 : f32,
};

@group(0) @binding(0) var<uniform> u : VSUniforms;

struct VSIn {
  // axisPos.x = axis (0 = vertical, 1 = horizontal)
  // axisPos.y = position in CANVAS-LOCAL CSS pixels (x for vertical, y for horizontal)
  @location(0) axisPos : vec2<f32>,

  // widthDashCount.x = lineWidth in CSS px
  // widthDashCount.y = dashCount (float, cast to u32)
  @location(1) widthDashCount : vec2<f32>,

  // dashMeta.x = dashTotal (CSS px)
  // dashMeta.y = reserved (unused)
  @location(2) dashMeta : vec2<f32>,

  @location(3) dash0_3 : vec4<f32>,
  @location(4) dash4_7 : vec4<f32>,

  // Premultiplied or straight alpha is fine; blending is handled by pipeline state.
  @location(5) color : vec4<f32>,
};

struct VSOut {
  @builtin(position) position : vec4<f32>,

  // Distance along the line in CSS pixels (0..plotLengthCss).
  @location(0) alongCss : f32,

  // Packed dash metadata to avoid extra varyings.
  // dashInfo.x = dashCount (float, cast to u32)
  // dashInfo.y = dashTotal (CSS px)
  @location(1) @interpolate(flat) dashInfo : vec2<f32>,

  @location(2) @interpolate(flat) dash0_3 : vec4<f32>,
  @location(3) @interpolate(flat) dash4_7 : vec4<f32>,
  @location(4) @interpolate(flat) color : vec4<f32>,

  // Axis-aligned quad anti-aliasing (device pixels).
  // acrossDevice ranges [0..widthDevice] across the stroke thickness.
  @location(5) acrossDevice : f32,
  @location(6) @interpolate(flat) widthDevice : f32,
};

fn quadUv(vid : u32) -> vec2<f32> {
  // Two triangles covering [0,1]x[0,1].
  // 0: (0,0) 1:(1,0) 2:(0,1) 3:(0,1) 4:(1,0) 5:(1,1)
  switch (vid) {
    case 0u: { return vec2<f32>(0.0, 0.0); }
    case 1u: { return vec2<f32>(1.0, 0.0); }
    case 2u: { return vec2<f32>(0.0, 1.0); }
    case 3u: { return vec2<f32>(0.0, 1.0); }
    case 4u: { return vec2<f32>(1.0, 0.0); }
    default: { return vec2<f32>(1.0, 1.0); }
  }
}

@vertex
fn vsMain(in : VSIn, @builtin(vertex_index) vid : u32) -> VSOut {
  let uv = quadUv(vid);
  let dpr = max(1e-6, u.devicePixelRatio);
  // IMPORTANT: Do NOT snap reference lines to integer device pixels.
  // Snapping looks crisp at rest but causes visible "jiggle" / stepping while zooming because
  // the line position is continuously changing (data-space \u2192 screen-space), and rounding
  // quantizes that motion to adjacent pixels. We rely on analytic AA in the fragment stage
  // to keep strokes stable and reasonably crisp across DPRs.

  let axis = in.axisPos.x;
  let posCss = in.axisPos.y;
  let widthCss = max(0.0, in.widthDashCount.x);
  let widthDevice = max(1.0, widthCss * dpr);

  var xDevice : f32;
  var yDevice : f32;
  var alongCss : f32;
  var acrossDevice : f32;

  if (axis < 0.5) {
    // Vertical line at x = posCss (canvas-local CSS px), spanning plot height.
    let centerX = posCss * dpr;
    let startX = centerX - 0.5 * widthDevice;
    xDevice = startX + uv.x * widthDevice;
    yDevice = u.plotOrigin.y + uv.y * u.plotSize.y;
    alongCss = (uv.y * u.plotSize.y) / dpr;
    acrossDevice = uv.x * widthDevice;
  } else {
    // Horizontal line at y = posCss (canvas-local CSS px), spanning plot width.
    let centerY = posCss * dpr;
    let startY = centerY - 0.5 * widthDevice;
    xDevice = u.plotOrigin.x + uv.x * u.plotSize.x;
    yDevice = startY + uv.y * widthDevice;
    alongCss = (uv.x * u.plotSize.x) / dpr;
    acrossDevice = uv.y * widthDevice;
  }

  let clipX = (xDevice / u.canvasSize.x) * 2.0 - 1.0;
  let clipY = 1.0 - (yDevice / u.canvasSize.y) * 2.0;

  var out : VSOut;
  out.position = vec4<f32>(clipX, clipY, 0.0, 1.0);
  out.alongCss = alongCss;
  out.dashInfo = vec2<f32>(in.widthDashCount.y, in.dashMeta.x);
  out.dash0_3 = in.dash0_3;
  out.dash4_7 = in.dash4_7;
  out.color = in.color;
  out.acrossDevice = acrossDevice;
  out.widthDevice = widthDevice;
  return out;
}

fn dashValue(i : u32, d0 : vec4<f32>, d1 : vec4<f32>) -> f32 {
  switch (i) {
    case 0u: { return d0.x; }
    case 1u: { return d0.y; }
    case 2u: { return d0.z; }
    case 3u: { return d0.w; }
    case 4u: { return d1.x; }
    case 5u: { return d1.y; }
    case 6u: { return d1.z; }
    default: { return d1.w; }
  }
}

@fragment
fn fsMain(in : VSOut) -> @location(0) vec4<f32> {
  // Analytic edge anti-aliasing for axis-aligned quads (reduces shimmering during zoom).
  // This is a lightweight alternative to full MSAA for thin strokes.
  let edgeDist = min(in.acrossDevice, in.widthDevice - in.acrossDevice);
  // Slightly widen AA to reduce temporal shimmer on moving 1-2px strokes.
  // Keep conservative so lines remain reasonably crisp.
  let aa = max(fwidth(in.acrossDevice), 1e-3) * 1.25;
  let edgeCoverage = smoothstep(0.0, aa, edgeDist);
  var color = in.color;
  color.a = color.a * edgeCoverage;

  let dashCount = u32(round(in.dashInfo.x));
  let dashTotal = in.dashInfo.y;

  // IMPORTANT: derivative ops (fwidth) must execute in uniform control flow.
  // So compute the dash parameterization unconditionally (using a safe total) BEFORE any early-return.
  let dashTotalSafe = max(dashTotal, 1.0);
  let t = in.alongCss - floor(in.alongCss / dashTotalSafe) * dashTotalSafe;
  // Anti-alias dash edges along the line axis (CSS pixels).
  // This reduces shimmer during zoom for dashed reference lines without requiring MSAA.
  let dashAa = max(fwidth(t), 1e-3);

  // Solid line (no dash pattern).
  if (dashCount == 0u || dashTotal <= 0.0) {
    return color;
  }

  var acc = 0.0;
  var on = true;

  for (var i : u32 = 0u; i < 8u; i = i + 1u) {
    if (i >= dashCount) { break; }
    let seg = dashValue(i, in.dash0_3, in.dash4_7);
    if (seg <= 0.0) { continue; }

    if (t < acc + seg) {
      // IMPORTANT: Avoid \`discard\` for off segments.
      // Discard can cause temporal popping on moving dashed edges; prefer a smooth alpha mask.
      //
      // Fade in/out near dash boundaries for smooth edges. This produces coverage in [0..1]
      // within the current segment, going to 0 at segment boundaries.
      let inFromStart = smoothstep(0.0, dashAa, t - acc);
      let inFromEnd = smoothstep(0.0, dashAa, (acc + seg) - t);
      let segCoverage = min(inFromStart, inFromEnd);

      // On segments contribute alpha; off segments contribute 0 alpha (no discard).
      let dashMask = select(0.0, segCoverage, on);
      color.a = color.a * dashMask;
      return color;
    }

    acc = acc + seg;
    on = !on;
  }

  // Defensive fallback if the dash list is degenerate.
  // If we didn't find a segment (shouldn't happen), default to transparent (safer than solid).
  color.a = 0.0;
  return color;
}
`;
var kn = 8;
var Tu = "bgra8unorm";
var Au = (e) => Number.isFinite(e.left) && Number.isFinite(e.right) && Number.isFinite(e.top) && Number.isFinite(e.bottom) && Number.isFinite(e.canvasWidth) && Number.isFinite(e.canvasHeight);
var Iu = (e) => {
  if (!e || e.length === 0)
    return { dashCount: 0, dashTotal: 0, values: new Array(kn).fill(0) };
  const t = [];
  for (let s = 0; s < e.length; s++) {
    const a = e[s];
    typeof a == "number" && Number.isFinite(a) && a > 0 && t.push(a);
  }
  if (t.length === 0)
    return { dashCount: 0, dashTotal: 0, values: new Array(kn).fill(0) };
  const n = t.length % 2 === 1 ? t.concat(t) : t, i = Math.min(kn, n.length), r = new Array(kn).fill(0);
  let o = 0;
  for (let s = 0; s < i; s++)
    r[s] = n[s], o += n[s];
  return !Number.isFinite(o) || o <= 0 ? { dashCount: 0, dashTotal: 0, values: new Array(kn).fill(0) } : { dashCount: i, dashTotal: o, values: r };
};
function cs(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Tu, r = (t == null ? void 0 : t.sampleCount) ?? 1, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }]
  }), u = mt(e, 32, { label: "referenceLineRenderer/vsUniforms" }), f = e.createBindGroup({
    layout: a,
    entries: [{ binding: 0, resource: { buffer: u } }]
  }), l = 72, g = l / 4, c = _t(
    e,
    {
      label: "referenceLineRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: as,
        label: "referenceLine.wgsl",
        buffers: [
          {
            arrayStride: l,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, format: "float32x2", offset: 0 },
              // axisPos
              { shaderLocation: 1, format: "float32x2", offset: 8 },
              // widthDashCount
              { shaderLocation: 2, format: "float32x2", offset: 16 },
              // dashMeta
              { shaderLocation: 3, format: "float32x4", offset: 24 },
              // dash0_3
              { shaderLocation: 4, format: "float32x4", offset: 40 },
              // dash4_7
              { shaderLocation: 5, format: "float32x4", offset: 56 }
              // color
            ]
          }
        ]
      },
      fragment: {
        code: as,
        label: "referenceLine.wgsl",
        formats: i,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let h = null, d = 0, w = 0;
  const P = () => {
    if (n) throw new Error("ReferenceLineRenderer is disposed.");
  };
  return { prepare: (v, m) => {
    if (P(), !Array.isArray(m))
      throw new Error("ReferenceLineRenderer.prepare: lines must be an array.");
    if (!Au(v))
      throw new Error("ReferenceLineRenderer.prepare: gridArea dimensions must be finite numbers.");
    if (v.canvasWidth <= 0 || v.canvasHeight <= 0)
      throw new Error("ReferenceLineRenderer.prepare: canvas dimensions must be positive.");
    if (v.left < 0 || v.right < 0 || v.top < 0 || v.bottom < 0)
      throw new Error("ReferenceLineRenderer.prepare: gridArea margins must be non-negative.");
    const x = Number.isFinite(v.devicePixelRatio) && v.devicePixelRatio > 0 ? v.devicePixelRatio : 1, b = v.left * x, M = v.top * x, I = v.canvasWidth - v.right * x, A = v.canvasHeight - v.bottom * x, S = I - b, p = A - M;
    if (!(S > 0) || !(p > 0)) {
      w = 0;
      return;
    }
    const y = new Float32Array(8);
    if (y[0] = v.canvasWidth, y[1] = v.canvasHeight, y[2] = b, y[3] = M, y[4] = S, y[5] = p, y[6] = x, y[7] = 0, ft(e, u, y), m.length === 0) {
      w = 0;
      return;
    }
    if (!h || d < m.length) {
      const N = Math.max(1, Math.ceil(m.length * 1.5)), D = Math.max(4, N * l);
      if (h)
        try {
          h.destroy();
        } catch {
        }
      h = e.createBuffer({
        label: "referenceLineRenderer/instanceBuffer",
        size: D,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      }), d = N;
    }
    const F = new Float32Array(m.length * g);
    for (let N = 0; N < m.length; N++) {
      const D = m[N], B = N * g;
      if (D.axis !== "vertical" && D.axis !== "horizontal")
        throw new Error("ReferenceLineRenderer.prepare: line.axis must be 'vertical' or 'horizontal'.");
      if (!Number.isFinite(D.positionCssPx))
        throw new Error("ReferenceLineRenderer.prepare: line.positionCssPx must be a finite number.");
      if (!Number.isFinite(D.lineWidth) || D.lineWidth < 0)
        throw new Error("ReferenceLineRenderer.prepare: line.lineWidth must be a finite non-negative number.");
      const E = D.rgba;
      if (!Array.isArray(E) || E.length !== 4)
        throw new Error("ReferenceLineRenderer.prepare: line.rgba must be a tuple [r,g,b,a].");
      const z = Iu(D.lineDash);
      F[B + 0] = D.axis === "vertical" ? 0 : 1, F[B + 1] = D.positionCssPx, F[B + 2] = D.lineWidth, F[B + 3] = z.dashCount, F[B + 4] = z.dashTotal, F[B + 5] = 0;
      for (let G = 0; G < kn; G++)
        F[B + 6 + G] = z.values[G];
      F[B + 14] = E[0], F[B + 15] = E[1], F[B + 16] = E[2], F[B + 17] = E[3];
    }
    e.queue.writeBuffer(h, 0, F.buffer, F.byteOffset, F.byteLength), w = m.length;
  }, render: (v, m = 0, x) => {
    if (P(), w === 0 || !h) return;
    const b = Number.isFinite(m) ? Math.max(0, Math.floor(m)) : 0, M = Math.max(0, w - b), I = x == null ? M : Number.isFinite(x) ? Math.max(0, Math.min(M, Math.floor(x))) : M;
    I !== 0 && (v.setPipeline(c), v.setBindGroup(0, f), v.setVertexBuffer(0, h), v.draw(6, I, 0, b));
  }, dispose: () => {
    if (!n) {
      n = true;
      try {
        u.destroy();
      } catch {
      }
      if (h)
        try {
          h.destroy();
        } catch {
        }
      h = null, d = 0, w = 0;
    }
  } };
}
var ls = `// annotationMarker.wgsl
// Instanced annotation marker shader (circle SDF with optional stroke).
//
// Coordinate contract:
// - Instance center is CANVAS-LOCAL CSS pixels (xCssPx, yCssPx)
// - Instance size is diameter in CSS pixels (sizeCssPx)
// - Uniform provides render target size in *device* pixels and DPR for CSS\u2192device conversion.
//
// Draw call: draw(6, instanceCount) using triangle-list quad expansion in VS.

struct VSUniforms {
  viewportPx: vec2<f32>, // render target size in device pixels (width, height)
  dpr: f32,              // device pixel ratio (CSS px -> device px)
  _pad0: f32,
};

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;

struct VSIn {
  // Center in CANVAS-LOCAL CSS pixels.
  @location(0) centerCssPx: vec2<f32>,
  // Marker diameter in CSS pixels.
  @location(1) sizeCssPx: f32,
  // Stroke width in CSS pixels (0 disables stroke).
  @location(2) strokeWidthCssPx: f32,
  // Colors are straight-alpha RGBA in 0..1.
  @location(3) fillRgba: vec4<f32>,
  @location(4) strokeRgba: vec4<f32>,
};

struct VSOut {
  @builtin(position) clipPosition: vec4<f32>,
  // Local quad coordinates in [-1, 1]^2 (used for circle SDF).
  @location(0) local: vec2<f32>,
  // Half-size in device pixels (radius in screen space).
  @location(1) halfSizePx: f32,
  @location(2) strokeWidthPx: f32,
  @location(3) fillRgba: vec4<f32>,
  @location(4) strokeRgba: vec4<f32>,
};

@vertex
fn vsMain(in: VSIn, @builtin(vertex_index) vertexIndex: u32) -> VSOut {
  // Fixed local corners for 2 triangles (triangle-list).
  let localCorners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let corner = localCorners[vertexIndex];

  let dpr = select(1.0, vsUniforms.dpr, vsUniforms.dpr > 0.0);
  let centerPx = in.centerCssPx * dpr;
  let halfSizePx = 0.5 * max(0.0, in.sizeCssPx) * dpr;
  let strokeWidthPx = max(0.0, in.strokeWidthCssPx) * dpr;

  let posPx = centerPx + corner * halfSizePx;

  // Convert device pixels to clip-space with origin at top-left:
  // x: [0..w] -> [-1..1], y: [0..h] -> [1..-1]
  let clipX = (posPx.x / vsUniforms.viewportPx.x) * 2.0 - 1.0;
  let clipY = 1.0 - (posPx.y / vsUniforms.viewportPx.y) * 2.0;

  var out: VSOut;
  out.clipPosition = vec4<f32>(clipX, clipY, 0.0, 1.0);
  out.local = corner;
  out.halfSizePx = halfSizePx;
  out.strokeWidthPx = strokeWidthPx;
  out.fillRgba = in.fillRgba;
  out.strokeRgba = in.strokeRgba;
  return out;
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4<f32> {
  if (in.halfSizePx <= 0.0) {
    discard;
  }

  // Circle SDF in normalized space: dist == 1 at the circle boundary.
  let dist = length(in.local);
  let aa = max(1e-6, fwidth(dist));

  // Coverage inside the circle.
  let outerCoverage = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, dist);
  if (outerCoverage <= 0.0) {
    discard;
  }

  // Optional stroke: compute inner radius in normalized units.
  let strokeNorm = clamp(in.strokeWidthPx / max(1e-6, in.halfSizePx), 0.0, 1.0);
  let inner = max(0.0, 1.0 - strokeNorm);
  let innerCoverage = 1.0 - smoothstep(inner - aa, inner + aa, dist);

  let fillCoverage = clamp(innerCoverage, 0.0, 1.0);
  let strokeCoverage = clamp(outerCoverage - innerCoverage, 0.0, 1.0);

  let fillA = clamp(in.fillRgba.a, 0.0, 1.0) * fillCoverage;
  let strokeA = clamp(in.strokeRgba.a, 0.0, 1.0) * strokeCoverage;
  let outA = fillA + strokeA;
  if (outA <= 0.0) {
    discard;
  }

  // Straight-alpha output: compute a weighted average RGB for correct blending.
  let rgb = (in.fillRgba.rgb * fillA + in.strokeRgba.rgb * strokeA) / outA;
  return vec4<f32>(rgb, outA);
}

`;
var Pu = "bgra8unorm";
var Ki = 12;
var Er = Ki * 4;
var fn = (e) => Math.min(1, Math.max(0, e));
var us = (e) => {
  if (!Number.isFinite(e) || e <= 0) return 1;
  const t = Math.ceil(e);
  return 2 ** Math.ceil(Math.log2(t));
};
function fs(e, t) {
  let n = false;
  const i = (t == null ? void 0 : t.targetFormat) ?? Pu, r = (t == null ? void 0 : t.sampleCount) ?? 1, o = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1, s = t == null ? void 0 : t.pipelineCache, a = e.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }]
  }), u = mt(e, 16, { label: "annotationMarkerRenderer/vsUniforms" }), f = new Float32Array(4), l = e.createBindGroup({
    layout: a,
    entries: [{ binding: 0, resource: { buffer: u } }]
  }), g = _t(
    e,
    {
      label: "annotationMarkerRenderer/pipeline",
      bindGroupLayouts: [a],
      vertex: {
        code: ls,
        label: "annotationMarker.wgsl",
        buffers: [
          {
            arrayStride: Er,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, format: "float32x2", offset: 0 },
              // centerCssPx
              { shaderLocation: 1, format: "float32", offset: 8 },
              // sizeCssPx
              { shaderLocation: 2, format: "float32", offset: 12 },
              // strokeWidthCssPx
              { shaderLocation: 3, format: "float32x4", offset: 16 },
              // fillRgba
              { shaderLocation: 4, format: "float32x4", offset: 32 }
              // strokeRgba
            ]
          }
        ]
      },
      fragment: {
        code: ls,
        label: "annotationMarker.wgsl",
        formats: i,
        blend: {
          color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: o }
    },
    s
  );
  let c = null, h = 0, d = new ArrayBuffer(0), w = new Float32Array(d);
  const P = () => {
    if (n) throw new Error("AnnotationMarkerRenderer is disposed.");
  }, R = (x) => {
    if (x <= w.length) return;
    const b = Math.max(32, us(x));
    d = new ArrayBuffer(b * 4), w = new Float32Array(d);
  }, T = (x, b, M) => {
    const I = Number.isFinite(x) && x > 0 ? x : 1, A = Number.isFinite(b) && b > 0 ? b : 1, S = Number.isFinite(M) && M > 0 ? M : 1;
    f[0] = I, f[1] = A, f[2] = S, f[3] = 0, ft(e, u, f);
  };
  return { prepare: ({ canvasWidth: x, canvasHeight: b, devicePixelRatio: M, instances: I }) => {
    if (P(), !Number.isFinite(x) || !Number.isFinite(b) || x <= 0 || b <= 0)
      throw new Error("AnnotationMarkerRenderer.prepare: canvasWidth/canvasHeight must be positive finite numbers.");
    if (!Array.isArray(I))
      throw new Error("AnnotationMarkerRenderer.prepare: instances must be an array.");
    T(x, b, M), R(I.length * Ki);
    const A = w;
    let S = 0;
    for (let y = 0; y < I.length; y++) {
      const F = I[y];
      if (!Number.isFinite(F.xCssPx) || !Number.isFinite(F.yCssPx) || !Number.isFinite(F.sizeCssPx) || F.sizeCssPx <= 0) continue;
      const N = F.strokeWidthCssPx ?? 0, D = F.strokeRgba ?? [0, 0, 0, 0], B = fn(F.fillRgba[0]), E = fn(F.fillRgba[1]), z = fn(F.fillRgba[2]), G = fn(F.fillRgba[3]), Y = fn(D[0]), V = fn(D[1]), j = fn(D[2]), K = fn(D[3]);
      A[S + 0] = F.xCssPx, A[S + 1] = F.yCssPx, A[S + 2] = F.sizeCssPx, A[S + 3] = Number.isFinite(N) ? Math.max(0, N) : 0, A[S + 4] = B, A[S + 5] = E, A[S + 6] = z, A[S + 7] = G, A[S + 8] = Y, A[S + 9] = V, A[S + 10] = j, A[S + 11] = K, S += Ki;
    }
    if (h = S / Ki, h === 0)
      return;
    const p = Math.max(4, h * Er);
    if (!c || c.size < p) {
      const y = Math.max(Math.max(4, us(p)), c ? c.size : 0);
      if (c)
        try {
          c.destroy();
        } catch {
        }
      c = e.createBuffer({
        label: "annotationMarkerRenderer/instanceBuffer",
        size: y,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    e.queue.writeBuffer(c, 0, d, 0, h * Er);
  }, render: (x, b = 0, M) => {
    if (P(), !c || h === 0) return;
    const I = Number.isFinite(b) ? Math.max(0, Math.floor(b)) : 0, A = Math.max(0, h - I), S = M == null ? A : Number.isFinite(M) ? Math.max(0, Math.min(A, Math.floor(M))) : A;
    S !== 0 && (x.setPipeline(g), x.setBindGroup(0, l), x.setVertexBuffer(0, c), x.draw(6, S, 0, I));
  }, dispose: () => {
    if (!n) {
      if (n = true, c)
        try {
          c.destroy();
        } catch {
        }
      c = null, h = 0;
      try {
        u.destroy();
      } catch {
      }
    }
  } };
}
var Ru = 6;
var Du = 500;
function Eu(e, t) {
  let n = false, i = t;
  const r = {
    mousemove: /* @__PURE__ */ new Set(),
    click: /* @__PURE__ */ new Set(),
    mouseleave: /* @__PURE__ */ new Set()
  };
  let o = null, s = null;
  const a = (v) => {
    const m = e.getBoundingClientRect();
    if (m.width === 0 || m.height === 0) return null;
    const x = v.clientX - m.left, b = v.clientY - m.top, M = i.left, I = i.top, A = m.width - i.left - i.right, S = m.height - i.top - i.bottom, p = x - M, y = b - I, F = p >= 0 && p <= A && y >= 0 && y <= S;
    return { x, y: b, gridX: p, gridY: y, plotWidthCss: A, plotHeightCss: S, isInGrid: F, originalEvent: v };
  }, u = (v, m) => {
    const x = a(m);
    if (x)
      for (const b of r[v]) b(x);
  }, f = (v) => {
    o && v.isPrimary && v.pointerId === o.pointerId && (o = null);
  }, l = (v) => {
    n || u("mousemove", v);
  }, g = (v) => {
    n || (f(v), u("mouseleave", v));
  }, c = (v) => {
    n || (f(v), u("mouseleave", v));
  }, h = (v) => {
    if (!n) {
      if (s === v.pointerId) {
        s = null;
        return;
      }
      f(v), u("mouseleave", v);
    }
  }, d = (v) => {
    if (n || !v.isPrimary || v.pointerType === "mouse" && v.button !== 0) return;
    const m = e.getBoundingClientRect();
    if (!(m.width === 0 || m.height === 0)) {
      o = {
        pointerId: v.pointerId,
        startClientX: v.clientX,
        startClientY: v.clientY,
        startTimeMs: v.timeStamp
      };
      try {
        e.setPointerCapture(v.pointerId);
      } catch {
      }
    }
  }, w = (v) => {
    if (n || !v.isPrimary || !o || v.pointerId !== o.pointerId) return;
    const m = v.timeStamp - o.startTimeMs, x = v.clientX - o.startClientX, b = v.clientY - o.startClientY, M = x * x + b * b;
    o = null;
    try {
      e.hasPointerCapture(v.pointerId) && (s = v.pointerId, e.releasePointerCapture(v.pointerId));
    } catch {
    }
    const I = Ru;
    m <= Du && M <= I * I && u("click", v);
  };
  return e.addEventListener("pointermove", l, { passive: true }), e.addEventListener("pointerleave", g, { passive: true }), e.addEventListener("pointercancel", c, { passive: true }), e.addEventListener("lostpointercapture", h, { passive: true }), e.addEventListener("pointerdown", d, { passive: true }), e.addEventListener("pointerup", w, { passive: true }), { canvas: e, on: (v, m) => {
    n || r[v].add(m);
  }, off: (v, m) => {
    r[v].delete(m);
  }, updateGridArea: (v) => {
    i = v;
  }, dispose: () => {
    n || (n = true, o = null, s = null, e.removeEventListener("pointermove", l), e.removeEventListener("pointerleave", g), e.removeEventListener("pointercancel", c), e.removeEventListener("lostpointercapture", h), e.removeEventListener("pointerdown", d), e.removeEventListener("pointerup", w), r.mousemove.clear(), r.click.clear(), r.mouseleave.clear());
  } };
}
var ds = (e, t, n) => Math.min(n, Math.max(t, e));
var Bu = (e, t) => {
  const n = e.deltaY;
  if (!Number.isFinite(n) || n === 0) return 0;
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_PIXEL:
      return n;
    case WheelEvent.DOM_DELTA_LINE:
      return n * 16;
    case WheelEvent.DOM_DELTA_PAGE:
      return n * (Number.isFinite(t) && t > 0 ? t : 800);
    default:
      return n;
  }
};
var Lu = (e, t) => {
  const n = e.deltaX;
  if (!Number.isFinite(n) || n === 0) return 0;
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_PIXEL:
      return n;
    case WheelEvent.DOM_DELTA_LINE:
      return n * 16;
    case WheelEvent.DOM_DELTA_PAGE:
      return n * (Number.isFinite(t) && t > 0 ? t : 800);
    default:
      return n;
  }
};
var _u = (e) => {
  const t = Math.abs(e);
  if (!Number.isFinite(t) || t === 0) return 1;
  const n = Math.min(t, 200);
  return Math.exp(n * 2e-3);
};
var Uu = (e) => e.pointerType === "mouse" && (e.buttons & 4) !== 0;
var ku = (e) => e.pointerType === "mouse" && e.shiftKey && (e.buttons & 1) !== 0;
function Gu(e, t) {
  let n = false, i = false, r = null, o = false, s = 0;
  const a = () => {
    o = false, s = 0;
  }, u = (d) => {
    if (r = d, !i) return;
    const w = d.originalEvent;
    if (!(d.isInGrid && (ku(w) || Uu(w)))) {
      a();
      return;
    }
    const R = d.plotWidthCss;
    if (!(R > 0) || !Number.isFinite(R)) {
      a();
      return;
    }
    if (!o) {
      o = true, s = d.gridX;
      return;
    }
    const T = d.gridX - s;
    if (s = d.gridX, !Number.isFinite(T) || T === 0) return;
    const { start: C, end: v } = t.getRange(), m = v - C;
    if (!Number.isFinite(m) || m === 0) return;
    const x = -(T / R) * m;
    !Number.isFinite(x) || x === 0 || t.pan(x);
  }, f = (d) => {
    r = null, a();
  }, l = (d) => {
    if (!i || n) return;
    const w = r;
    if (!w || !w.isInGrid) return;
    const P = w.plotWidthCss, R = w.plotHeightCss;
    if (!(P > 0) || !(R > 0)) return;
    const T = Bu(d, R), C = Lu(d, P);
    if (Math.abs(C) > Math.abs(T) && C !== 0) {
      const { start: A, end: S } = t.getRange(), p = S - A;
      if (!Number.isFinite(p) || p === 0) return;
      const y = C / P * p;
      if (!Number.isFinite(y) || y === 0) return;
      d.preventDefault(), t.pan(y);
      return;
    }
    if (T === 0) return;
    const v = _u(T);
    if (!(v > 1)) return;
    const { start: m, end: x } = t.getRange(), b = x - m;
    if (!Number.isFinite(b) || b === 0) return;
    const M = ds(w.gridX / P, 0, 1), I = ds(m + M * b, 0, 100);
    d.preventDefault(), T < 0 ? t.zoomIn(I, v) : t.zoomOut(I, v);
  }, g = () => {
    n || i || (i = true, e.on("mousemove", u), e.on("mouseleave", f), e.canvas.addEventListener("wheel", l, { passive: false }));
  }, c = () => {
    n || !i || (i = false, e.off("mousemove", u), e.off("mouseleave", f), e.canvas.removeEventListener("wheel", l), r = null, a());
  };
  return { enable: g, disable: c, dispose: () => {
    n || (c(), n = true);
  } };
}
var zu = 0.5;
var Vu = 100;
var Qt = (e, t, n) => Math.min(n, Math.max(t, e));
var Br = (e) => Qt(e, 0, 1);
var ms = (e) => Object.is(e, -0) ? 0 : e;
var Wu = (e) => ({ start: e.start, end: e.end });
function Ou(e, t, n) {
  let i = 0, r = 100, o = null;
  const s = /* @__PURE__ */ new Set();
  let a = (() => {
    const x = Number.isFinite(n == null ? void 0 : n.minSpan) ? n.minSpan : zu;
    return Qt(Number.isFinite(x) ? x : 0, 0, 100);
  })(), u = (() => {
    const x = Number.isFinite(n == null ? void 0 : n.maxSpan) ? n.maxSpan : Vu;
    return Qt(Number.isFinite(x) ? x : 100, 0, 100);
  })(), f = Math.min(a, u), l = Math.max(a, u);
  const g = () => {
    const x = { start: i, end: r };
    if (o !== null && o.start === x.start && o.end === x.end)
      return;
    o = Wu(x);
    const b = Array.from(s);
    for (const M of b) M({ start: i, end: r });
  }, c = (x, b, M) => {
    if (M) {
      if (typeof M == "string")
        switch (M) {
          case "start":
            return { center: x, ratio: 0 };
          case "end":
            return { center: b, ratio: 1 };
          case "center":
            return { center: (x + b) * 0.5, ratio: 0.5 };
        }
      if (M && Number.isFinite(M.center) && Number.isFinite(M.ratio))
        return { center: M.center, ratio: M.ratio };
    }
  }, h = (x, b, M) => {
    if (!Number.isFinite(x) || !Number.isFinite(b)) return;
    let I = x, A = b;
    if (I > A) {
      const y = I;
      I = A, A = y;
    }
    let S = A - I;
    if (!Number.isFinite(S) || S < 0) return;
    const p = Qt(S, f, l);
    if (p !== S) {
      const y = M != null && M.anchor && Number.isFinite(M.anchor.center) ? Qt(M.anchor.center, 0, 100) : (I + A) * 0.5, F = M != null && M.anchor && Number.isFinite(M.anchor.ratio) ? Br(M.anchor.ratio) : 0.5;
      I = y - F * p, A = I + p, S = p;
    }
    if (S > 100 && (I = 0, A = 100, S = 100), I < 0) {
      const y = -I;
      I += y, A += y;
    }
    if (A > 100) {
      const y = A - 100;
      I -= y, A -= y;
    }
    I = Qt(I, 0, 100), A = Qt(A, 0, 100), I = ms(I), A = ms(A), !(I === i && A === r) && (i = I, r = A, (M == null ? void 0 : M.emit) !== false && g());
  };
  return h(e, t, { emit: false }), { getRange: () => ({ start: i, end: r }), setRange: (x, b) => {
    h(x, b);
  }, setRangeAnchored: (x, b, M) => {
    h(x, b, { anchor: c(x, b, M) });
  }, setSpanConstraints: (x, b) => {
    const M = typeof x == "number" && Number.isFinite(x) ? Qt(x, 0, 100) : a, I = typeof b == "number" && Number.isFinite(b) ? Qt(b, 0, 100) : u;
    if (M === a && I === u) return;
    a = M, u = I, f = Math.min(a, u), l = Math.max(a, u);
    const A = i, S = r, p = 1e-6, y = S >= 100 - p ? "end" : A <= 0 + p ? "start" : "center";
    h(A, S, { anchor: c(A, S, y) });
  }, zoomIn: (x, b) => {
    if (!Number.isFinite(x) || !Number.isFinite(b) || b <= 1) return;
    const M = Qt(x, 0, 100), I = r - i, A = I === 0 ? 0.5 : Br((M - i) / I), S = I / b, p = M - A * S, y = p + S;
    h(p, y, { anchor: { center: M, ratio: A } });
  }, zoomOut: (x, b) => {
    if (!Number.isFinite(x) || !Number.isFinite(b) || b <= 1) return;
    const M = Qt(x, 0, 100), I = r - i, A = I === 0 ? 0.5 : Br((M - i) / I), S = I * b, p = M - A * S, y = p + S;
    h(p, y, { anchor: { center: M, ratio: A } });
  }, pan: (x) => {
    Number.isFinite(x) && h(i + x, r + x);
  }, onChange: (x) => (s.add(x), () => {
    s.delete(x);
  }) };
}
var Lr = /* @__PURE__ */ new WeakMap();
var ps = (e) => {
  const t = typeof e == "object" && e !== null ? e : null;
  if (t && Lr.has(t))
    return Lr.get(t);
  let n = false;
  const i = Ie(e);
  for (let r = 0; r < i; r++) {
    const o = Ae(e, r);
    if (Number.isNaN(o)) {
      n = true;
      break;
    }
  }
  return t && Lr.set(t, n), n;
};
var Xu = (e, t) => {
  const n = [];
  for (let u = 0; u < e.length; u++) {
    const f = e[u];
    (f == null ? void 0 : f.type) === "bar" && n.push({ globalSeriesIndex: u, s: f });
  }
  if (n.length === 0) return null;
  const i = Ks(
    n.map((u) => u.s),
    t
  ), r = i.barWidthPx, o = i.gapPx, s = i.clusterWidthPx;
  if (!Number.isFinite(r) || !(r > 0)) return null;
  const a = /* @__PURE__ */ new Map();
  for (let u = 0; u < n.length; u++) {
    const f = n[u].globalSeriesIndex, l = i.clusterSlots.clusterIndexBySeries[u] ?? 0;
    a.set(f, l);
  }
  return {
    barWidth: r,
    gap: o,
    clusterWidth: s,
    clusterIndexByGlobalSeriesIndex: a
  };
};
var hs = (e, t) => {
  let n = 0, i = Ie(e);
  for (; n < i; ) {
    const r = n + i >>> 1;
    Ae(e, r) < t ? n = r + 1 : i = r;
  }
  return n;
};
function ys(e, t, n, i) {
  if (!Number.isFinite(t)) return [];
  const r = Number.POSITIVE_INFINITY, o = r * r, s = n.invert(t);
  if (!Number.isFinite(s)) return [];
  const a = [], u = Xu(e, n);
  for (let f = 0; f < e.length; f++) {
    const l = e[f];
    if (l.type === "pie" || l.type === "candlestick" || l.visible === false) continue;
    const g = l.data, c = Ie(g);
    if (c === 0) continue;
    if (l.type === "bar" && u) {
      const R = u.clusterIndexByGlobalSeriesIndex.get(f);
      if (R !== void 0) {
        const { barWidth: T, gap: C, clusterWidth: v } = u, m = -v / 2 + R * (T + C), x = 0;
        if (Number.isFinite(T) && T > 0 && Number.isFinite(m)) {
          let b = -1;
          const M = (I) => {
            if (!Number.isFinite(I)) return false;
            const A = I + m, S = A + T;
            return t >= A - x && t < S + x;
          };
          if (ps(g))
            for (let I = 0; I < c; I++) {
              const A = Ae(g, I);
              if (!Number.isFinite(A)) continue;
              const S = n.scale(A);
              M(S) && (b = b < 0 ? I : Math.min(b, I));
            }
          else {
            const I = n.invert(t - m);
            if (Number.isFinite(I)) {
              const A = hs(g, I), S = (p) => {
                if (p < 0 || p >= c) return null;
                const y = Ae(g, p);
                if (!Number.isFinite(y)) return null;
                const F = n.scale(y);
                return Number.isFinite(F) ? F : null;
              };
              for (let p = A - 1; p >= 0; p--) {
                const y = S(p);
                if (y === null) continue;
                const F = y + m, N = F + T;
                if (N + x <= t) break;
                t >= F - x && t < N + x && (b = b < 0 ? p : Math.min(b, p));
              }
              for (let p = A; p < c; p++) {
                const y = S(p);
                if (y === null) continue;
                const F = y + m;
                if (F - x > t) break;
                const N = F + T;
                t < N + x && (b = b < 0 ? p : Math.min(b, p));
              }
            }
          }
          if (b >= 0) {
            const I = Ae(g, b), A = Ue(g, b), S = at(g, b), p = S !== void 0 ? [I, A, S] : [I, A];
            a.push({ seriesIndex: f, dataIndex: b, point: p });
            continue;
          }
        }
      }
    }
    let h = -1, d = null, w = o;
    const P = (R, T) => {
      if (!Number.isFinite(T) || !(T < w || T === w && (h < 0 || R < h))) return;
      w = T, h = R;
      const v = Ae(g, R), m = Ue(g, R), x = at(g, R);
      d = x !== void 0 ? [v, m, x] : [v, m];
    };
    if (ps(g))
      for (let R = 0; R < c; R++) {
        const T = Ae(g, R);
        if (!Number.isFinite(T)) continue;
        const C = n.scale(T);
        if (!Number.isFinite(C)) continue;
        const v = C - t;
        P(R, v * v);
      }
    else {
      const R = hs(g, s);
      let T = R - 1, C = R;
      const v = (m) => {
        const x = Ae(g, m);
        if (!Number.isFinite(x)) return null;
        const b = n.scale(x);
        if (!Number.isFinite(b)) return null;
        const M = b - t;
        return M * M;
      };
      for (; T >= 0 || C < c; ) {
        for (; T >= 0 && v(T) === null; ) T--;
        for (; C < c && v(C) === null; ) C++;
        if (T < 0 && C >= c) break;
        const m = T >= 0 ? v(T) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY, x = C < c ? v(C) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        if (m > w && x > w) break;
        m <= x ? (T >= 0 && m <= w && P(T, m), T--, C < c && x <= w && x === m && (P(C, x), C++)) : (C < c && x <= w && P(C, x), C++);
      }
    }
    d !== null && a.push({ seriesIndex: f, dataIndex: h, point: d });
  }
  return a;
}
var $u = (e) => Math.min(1, Math.max(0, e));
var Yu = (e) => {
  const t = e.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!t) return null;
  const n = Number(t[1]) / 100;
  return Number.isFinite(n) ? n : null;
};
var io = (e) => Array.isArray(e);
var Tn = (e) => io(e) ? e[0] : e.timestamp;
var Hu = (e) => io(e) ? e[1] : e.open;
var qu = (e) => io(e) ? e[2] : e.close;
var gs = /* @__PURE__ */ new WeakMap();
var Zu = (e) => {
  const t = gs.get(e);
  if (t !== void 0) return t;
  const n = [];
  for (let o = 0; o < e.length; o++) {
    const s = Tn(e[o]);
    Number.isFinite(s) && n.push(s);
  }
  if (n.length < 2) return 1;
  n.sort((o, s) => o - s);
  let i = Number.POSITIVE_INFINITY;
  for (let o = 1; o < n.length; o++) {
    const s = n[o] - n[o - 1];
    s > 0 && s < i && (i = s);
  }
  const r = Number.isFinite(i) && i > 0 ? i : 1;
  return gs.set(e, r), r;
};
function Hr(e, t, n, i) {
  if (t.length === 0) return 0;
  const r = Zu(t);
  let o = 0;
  if (Number.isFinite(r) && r > 0) {
    let g = null;
    for (let c = 0; c < t.length; c++) {
      const h = Tn(t[c]);
      if (Number.isFinite(h)) {
        g = h;
        break;
      }
    }
    if (g != null) {
      const c = n.scale(g), h = n.scale(g + r), d = Math.abs(h - c);
      Number.isFinite(d) && d > 0 && (o = d);
    }
  }
  (!(o > 0) || !Number.isFinite(o)) && (o = (Number.isFinite(i ?? Number.NaN) ? i : 0) / Math.max(1, t.length));
  let s = 0;
  const a = e.barWidth;
  if (typeof a == "number")
    s = Number.isFinite(a) ? Math.max(0, a) : 0;
  else if (typeof a == "string") {
    const g = Yu(a);
    s = g == null ? 0 : o * $u(g);
  }
  const u = Number.isFinite(e.barMinWidth) ? Math.max(0, e.barMinWidth) : 0, f = Number.isFinite(e.barMaxWidth) ? Math.max(0, e.barMaxWidth) : Number.POSITIVE_INFINITY, l = Math.max(u, f);
  return s = Math.min(Math.max(s, u), l), Number.isFinite(s) ? s : 0;
}
var Oi = /* @__PURE__ */ new WeakMap();
var ju = (e) => {
  const t = Oi.get(e);
  if (t !== void 0) return t;
  let n = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < e.length; i++) {
    const r = Tn(e[i]);
    if (!Number.isFinite(r) || r < n)
      return Oi.set(e, false), false;
    n = r;
  }
  return Oi.set(e, true), true;
};
var Ku = (e, t) => {
  let n = 0, i = e.length;
  for (; n < i; ) {
    const r = n + i >>> 1;
    Tn(e[r]) < t ? n = r + 1 : i = r;
  }
  return n;
};
function qr(e, t, n, i, r, o) {
  if (!Number.isFinite(t) || !Number.isFinite(n) || !Number.isFinite(o) || !(o > 0)) return null;
  const s = i.invert(t);
  if (!Number.isFinite(s)) return null;
  const a = o / 2;
  let u = null, f = Number.POSITIVE_INFINITY;
  const l = (c, h, d, w) => {
    if (Number.isFinite(w)) {
      if (w < f) {
        f = w, u = { seriesIndex: c, dataIndex: h, point: d };
        return;
      }
      w === f && u && (h < u.dataIndex ? u = { seriesIndex: c, dataIndex: h, point: d } : h === u.dataIndex && c < u.seriesIndex && (u = { seriesIndex: c, dataIndex: h, point: d }));
    }
  }, g = (c) => {
    const h = Hu(c), d = qu(c);
    if (!Number.isFinite(h) || !Number.isFinite(d)) return false;
    const w = r.scale(h), P = r.scale(d);
    if (!Number.isFinite(w) || !Number.isFinite(P)) return false;
    const R = Math.min(w, P), T = Math.max(w, P);
    return n >= R && n <= T;
  };
  for (let c = 0; c < e.length; c++) {
    const d = e[c].data, w = d.length;
    if (w === 0) continue;
    if (!ju(d)) {
      for (let T = 0; T < w; T++) {
        const C = d[T], v = Tn(C);
        if (!Number.isFinite(v)) continue;
        const m = i.scale(v);
        if (!Number.isFinite(m)) continue;
        const x = Math.abs(t - m);
        x > a || g(C) && l(c, T, C, x);
      }
      continue;
    }
    const R = Ku(d, s);
    for (let T = R - 1; T >= 0; T--) {
      const C = d[T], v = Tn(C), m = i.scale(v);
      if (!Number.isFinite(m)) continue;
      if (m < t - a) break;
      const x = Math.abs(t - m);
      x > a || g(C) && l(c, T, C, x);
    }
    for (let T = R; T < w; T++) {
      const C = d[T], v = Tn(C), m = i.scale(v);
      if (!Number.isFinite(m)) continue;
      if (m > t + a) break;
      const x = Math.abs(t - m);
      x > a || g(C) && l(c, T, C, x);
    }
  }
  return u;
}
var dn = Math.PI * 2;
var Xi = (e) => {
  if (!Number.isFinite(e)) return 0;
  const t = e % dn;
  return t < 0 ? t + dn : t;
};
function Zr(e, t, n, i, r) {
  if (!Number.isFinite(e) || !Number.isFinite(t) || !Number.isFinite(i.x) || !Number.isFinite(i.y)) return null;
  const o = Number.isFinite(r.inner) ? Math.max(0, r.inner) : 0, s = Number.isFinite(r.outer) ? Math.max(0, r.outer) : 0;
  if (!(s > 0)) return null;
  const a = e - i.x, u = i.y - t, f = Math.hypot(a, u);
  if (!Number.isFinite(f) || f <= o || f > s) return null;
  const l = Xi(Math.atan2(u, a)), g = n.series, c = g.data;
  let h = 0, d = 0;
  for (let C = 0; C < c.length; C++) {
    const v = c[C], m = v == null ? void 0 : v.value;
    typeof m == "number" && Number.isFinite(m) && m > 0 && v.visible !== false && (h += m, d++);
  }
  if (!(h > 0) || d === 0) return null;
  const w = typeof g.startAngle == "number" && Number.isFinite(g.startAngle) ? g.startAngle : 90;
  let P = Xi(w * Math.PI / 180), R = 0, T = 0;
  for (let C = 0; C < c.length; C++) {
    const v = c[C], m = v == null ? void 0 : v.value;
    if (typeof m != "number" || !Number.isFinite(m) || m <= 0 || (v == null ? void 0 : v.visible) === false) continue;
    T++;
    const x = T === d;
    let M = m / h * dn;
    if (x ? M = Math.max(0, dn - R) : M = Math.max(0, Math.min(dn, M)), R += M, !(M > 0)) continue;
    const I = P, A = d === 1 ? P + dn : Xi(P + M);
    P = Xi(P + M);
    let S = A - I;
    S < 0 && (S += dn);
    let p = l - I;
    if (p < 0 && (p += dn), p <= S)
      return { seriesIndex: n.seriesIndex, dataIndex: C, slice: v };
  }
  return null;
}
var Wn = (e, t) => {
  if (!Number.isFinite(t))
    throw new Error(`${e} must be a finite number. Received: ${String(t)}`);
};
function hn() {
  let e = 0, t = 1, n = 0, i = 1;
  const r = {
    domain(o, s) {
      return Wn("domain min", o), Wn("domain max", s), e = o, t = s, r;
    },
    range(o, s) {
      return Wn("range min", o), Wn("range max", s), n = o, i = s, r;
    },
    scale(o) {
      if (!Number.isFinite(o)) return Number.NaN;
      if (e === t)
        return (n + i) / 2;
      const s = (o - e) / (t - e);
      return n + s * (i - n);
    },
    invert(o) {
      if (!Number.isFinite(o)) return Number.NaN;
      if (e === t)
        return e;
      if (n === i)
        return (e + t) / 2;
      const s = (o - n) / (i - n);
      return e + s * (t - e);
    }
  };
  return r;
}
var Ju = (e) => {
  switch (e) {
    case "start":
      return { translateX: "0%", originX: "0%" };
    case "middle":
      return { translateX: "-50%", originX: "50%" };
    case "end":
      return { translateX: "-100%", originX: "100%" };
  }
};
function xs(e, t) {
  const n = getComputedStyle(e), i = n.position, r = n.overflow, o = (t == null ? void 0 : t.clip) ?? false, s = i === "static", a = !o && (r === "hidden" || r === "scroll" || r === "auto"), u = s ? e.style.position : null, f = a ? e.style.overflow : null;
  s && (e.style.position = "relative"), a && (e.style.overflow = "visible");
  const l = document.createElement("div");
  l.style.position = "absolute", l.style.inset = "0", l.style.pointerEvents = "none", l.style.overflow = o ? "hidden" : "visible", l.style.zIndex = "10", e.appendChild(l);
  let g = false;
  return { clear: () => {
    g || l.replaceChildren();
  }, addLabel: (w, P, R, T) => {
    if (g)
      return document.createElement("span");
    const C = document.createElement("span");
    C.textContent = w, C.style.position = "absolute", C.style.left = `${P}px`, C.style.top = `${R}px`, C.style.pointerEvents = "none", C.style.userSelect = "none", C.style.whiteSpace = "nowrap", C.style.lineHeight = "1", (T == null ? void 0 : T.fontSize) != null && (C.style.fontSize = `${T.fontSize}px`), (T == null ? void 0 : T.color) != null && (C.style.color = T.color);
    const v = (T == null ? void 0 : T.rotation) ?? 0, m = (T == null ? void 0 : T.anchor) ?? "start", { translateX: x, originX: b } = Ju(m);
    return C.style.transformOrigin = `${b} 50%`, C.style.transform = `translateX(${x}) translateY(-50%) rotate(${v}deg)`, l.appendChild(C), C;
  }, dispose: () => {
    if (!g) {
      g = true;
      try {
        l.remove();
      } finally {
        u !== null && (e.style.position = u), f !== null && (e.style.overflow = f);
      }
    }
  } };
}
var bs = (e, t) => {
  var i;
  const n = (i = e.name) == null ? void 0 : i.trim();
  return n || `Series ${t + 1}`;
};
var Qu = (e, t, n) => {
  var o;
  const i = (o = e.color) == null ? void 0 : o.trim();
  if (i) return i;
  const r = n.colorPalette;
  return r.length > 0 ? r[t % r.length] ?? "#000000" : "#000000";
};
var vs = (e, t) => {
  const n = e == null ? void 0 : e.trim();
  return n || `Slice ${t + 1}`;
};
var ef = (e, t, n, i) => {
  const r = e == null ? void 0 : e.trim();
  if (r) return r;
  const o = i.colorPalette, s = o.length;
  return s > 0 ? o[(t + n) % s] ?? "#000000" : "#000000";
};
function tf(e, t = "right", n) {
  const r = getComputedStyle(e).position === "static", o = r ? e.style.position : null;
  r && (e.style.position = "relative");
  const s = document.createElement("div");
  s.style.position = "absolute", s.style.pointerEvents = "auto", s.style.userSelect = "none", s.style.boxSizing = "border-box", s.style.padding = "8px", s.style.borderRadius = "8px", s.style.borderStyle = "solid", s.style.borderWidth = "1px", s.style.maxHeight = "calc(100% - 16px)", s.style.overflow = "auto";
  const a = document.createElement("div");
  a.style.display = "flex", a.style.gap = "8px", s.appendChild(a), n && (a.addEventListener("click", (c) => {
    const d = c.target.closest("[data-series-index]");
    if (d) {
      const w = parseInt(d.dataset.seriesIndex, 10);
      if (!isNaN(w)) {
        const P = d.dataset.sliceIndex;
        if (P !== void 0) {
          const R = parseInt(P, 10);
          if (!isNaN(R)) {
            n(w, R);
            return;
          }
        }
        n(w);
      }
    }
  }), a.addEventListener("keydown", (c) => {
    if (c.key === "Enter" || c.key === " ") {
      const d = c.target.closest("[data-series-index]");
      if (d) {
        c.preventDefault();
        const w = parseInt(d.dataset.seriesIndex, 10);
        if (!isNaN(w)) {
          const P = d.dataset.sliceIndex;
          if (P !== void 0) {
            const R = parseInt(P, 10);
            if (!isNaN(R)) {
              n(w, R);
              return;
            }
          }
          n(w);
        }
      }
    }
  })), ((c) => {
    switch (s.style.top = "", s.style.right = "", s.style.bottom = "", s.style.left = "", s.style.maxWidth = "", a.style.flexDirection = "", a.style.flexWrap = "", a.style.alignItems = "", c) {
      case "right": {
        s.style.top = "8px", s.style.right = "8px", s.style.maxWidth = "40%", a.style.flexDirection = "column", a.style.flexWrap = "nowrap", a.style.alignItems = "flex-start";
        return;
      }
      case "left": {
        s.style.top = "8px", s.style.left = "8px", s.style.maxWidth = "40%", a.style.flexDirection = "column", a.style.flexWrap = "nowrap", a.style.alignItems = "flex-start";
        return;
      }
      case "top": {
        s.style.top = "8px", s.style.left = "8px", s.style.right = "8px", a.style.flexDirection = "row", a.style.flexWrap = "wrap", a.style.alignItems = "center";
        return;
      }
      case "bottom": {
        s.style.bottom = "8px", s.style.left = "8px", s.style.right = "8px", a.style.flexDirection = "row", a.style.flexWrap = "wrap", a.style.alignItems = "center";
        return;
      }
    }
  })(t), e.appendChild(s);
  let f = false;
  return { update: (c, h) => {
    if (f) return;
    s.style.color = h.textColor, s.style.background = h.backgroundColor, s.style.borderColor = h.axisLineColor, s.style.fontFamily = h.fontFamily, s.style.fontSize = `${h.fontSize}px`;
    const d = [];
    for (let w = 0; w < c.length; w++) {
      const P = c[w];
      if (P.type === "pie")
        for (let R = 0; R < P.data.length; R++) {
          const T = P.data[R], C = (T == null ? void 0 : T.visible) !== false, v = document.createElement("div");
          v.style.display = "flex", v.style.alignItems = "center", v.style.gap = "6px", v.style.lineHeight = "1.1", v.style.whiteSpace = "nowrap", v.style.cursor = n ? "pointer" : "default", v.style.opacity = C ? "1" : "0.5", v.style.transition = "opacity 0.2s", n && (v.setAttribute("role", "button"), v.setAttribute("aria-pressed", String(C)), v.setAttribute("aria-label", `Toggle ${vs(T == null ? void 0 : T.name, R)} visibility`), v.tabIndex = 0, v.dataset.seriesIndex = String(w), v.dataset.sliceIndex = String(R));
          const m = document.createElement("div");
          m.style.width = "10px", m.style.height = "10px", m.style.borderRadius = "2px", m.style.flex = "0 0 auto", m.style.background = ef(T == null ? void 0 : T.color, w, R, h), m.style.border = `1px solid ${h.axisLineColor}`;
          const x = document.createElement("span");
          x.textContent = vs(T == null ? void 0 : T.name, R), x.style.textDecoration = C ? "none" : "line-through", v.appendChild(m), v.appendChild(x), d.push(v);
        }
      else {
        const R = P.visible !== false, T = document.createElement("div");
        T.style.display = "flex", T.style.alignItems = "center", T.style.gap = "6px", T.style.lineHeight = "1.1", T.style.whiteSpace = "nowrap", T.style.cursor = n ? "pointer" : "default", T.style.opacity = R ? "1" : "0.5", T.style.transition = "opacity 0.2s", n && (T.setAttribute("role", "button"), T.setAttribute("aria-pressed", String(R)), T.setAttribute("aria-label", `Toggle ${bs(P, w)} visibility`), T.tabIndex = 0, T.dataset.seriesIndex = String(w));
        const C = document.createElement("div");
        C.style.width = "10px", C.style.height = "10px", C.style.borderRadius = "2px", C.style.flex = "0 0 auto", C.style.background = Qu(P, w, h), C.style.border = `1px solid ${h.axisLineColor}`;
        const v = document.createElement("span");
        v.textContent = bs(P, w), v.style.textDecoration = R ? "none" : "line-through", T.appendChild(C), T.appendChild(v), d.push(T);
      }
    }
    a.replaceChildren(...d);
  }, dispose: () => {
    if (!f) {
      f = true;
      try {
        s.remove();
      } finally {
        o !== null && (e.style.position = o);
      }
    }
  } };
}
var ws = (e, t, n) => n < t || e < t ? t : e > n ? n : e;
function Cs(e) {
  const n = getComputedStyle(e).position === "static", i = n ? e.style.position : null;
  n && (e.style.position = "relative");
  const r = document.createElement("div");
  r.style.position = "absolute", r.style.left = "0", r.style.top = "0", r.style.pointerEvents = "none", r.style.userSelect = "none", r.style.boxSizing = "border-box", r.style.zIndex = "var(--chartgpu-tooltip-z, 10)", r.style.padding = "var(--chartgpu-tooltip-padding, 6px 8px)", r.style.borderRadius = "var(--chartgpu-tooltip-radius, 8px)", r.style.borderStyle = "solid", r.style.borderWidth = "var(--chartgpu-tooltip-border-width, 1px)", r.style.borderColor = "var(--chartgpu-tooltip-border, rgba(224,224,224,0.35))", r.style.boxShadow = "var(--chartgpu-tooltip-shadow, 0 6px 18px rgba(0,0,0,0.35))", r.style.maxWidth = "var(--chartgpu-tooltip-max-width, min(320px, 100%))", r.style.overflow = "hidden", r.style.fontFamily = 'var(--chartgpu-tooltip-font-family, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji")', r.style.fontSize = "var(--chartgpu-tooltip-font-size, 12px)", r.style.lineHeight = "var(--chartgpu-tooltip-line-height, 1.2)", r.style.color = "var(--chartgpu-tooltip-color, #e0e0e0)", r.style.background = "var(--chartgpu-tooltip-bg, rgba(26,26,46,0.95))", r.style.whiteSpace = "normal", r.style.opacity = "0", r.style.transitionProperty = "opacity";
  const o = 140;
  r.style.transitionDuration = `${o}ms`, r.style.transitionTimingFunction = "ease", r.style.willChange = "opacity", r.style.display = "none", r.style.visibility = "hidden", r.setAttribute("role", "tooltip"), e.appendChild(r);
  let s = false, a = 0, u = null, f = null;
  const l = () => {
    u != null && (window.clearTimeout(u), u = null), f != null && (window.cancelAnimationFrame(f), f = null);
  }, g = () => r.style.display === "none" || r.style.visibility === "hidden", c = () => {
    const P = r.style.visibility;
    r.style.visibility = "hidden";
    const R = r.offsetWidth, T = r.offsetHeight;
    return r.style.visibility = P, { width: R, height: T };
  };
  return { show: (P, R, T) => {
    if (s) return;
    a += 1, l();
    const C = g();
    r.innerHTML = T;
    const v = 12, m = 12, x = 8;
    r.style.display = "block", r.style.visibility = "hidden";
    const { width: b, height: M } = c(), I = e.clientWidth, A = e.clientHeight;
    let S = P + v, p = R + m;
    if (S + b > I - x && (S = P - v - b), p + M > A - x && (p = R - m - M), S = ws(S, x, I - x - b), p = ws(p, x, A - x - M), r.style.left = `${S}px`, r.style.top = `${p}px`, r.style.visibility = "visible", C) {
      r.style.opacity = "0";
      const y = a;
      f = window.requestAnimationFrame(() => {
        f = null, !s && y === a && (r.style.opacity = "1");
      });
    } else
      r.style.opacity = "1";
  }, hide: () => {
    if (s) return;
    if (a += 1, l(), r.style.display === "none" || r.style.visibility === "hidden") {
      r.style.opacity = "0", r.style.visibility = "hidden", r.style.display = "none";
      return;
    }
    r.style.opacity = "0";
    const P = a;
    u = window.setTimeout(() => {
      u = null, !s && P === a && (r.style.visibility = "hidden", r.style.display = "none");
    }, o + 50);
  }, dispose: () => {
    if (!s) {
      s = true;
      try {
        l(), r.remove();
      } finally {
        i !== null && (e.style.position = i);
      }
    }
  } };
}
var Ji = "\u2014";
function sn(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Nn(e) {
  if (!Number.isFinite(e)) return Ji;
  const i = (Object.is(e, -0) ? 0 : e).toFixed(2).replace(/\.?0+$/, "");
  return i === "-0" ? "0" : i;
}
function na(e) {
  const t = e.seriesName.trim();
  return t.length > 0 ? t : `Series ${e.seriesIndex + 1}`;
}
function ia(e) {
  const t = e.trim();
  return t.length === 0 ? "#888" : /^#[0-9a-fA-F]{3}$/.test(t) || /^#[0-9a-fA-F]{6}$/.test(t) || /^#[0-9a-fA-F]{8}$/.test(t) || /^rgba?\(\s*\d{1,3}\s*(?:,\s*|\s+)\d{1,3}\s*(?:,\s*|\s+)\d{1,3}(?:\s*(?:,\s*|\/\s*)(?:0|1|0?\.\d+))?\s*\)$/.test(
    t
  ) || /^[a-zA-Z]+$/.test(t) ? t : "#888";
}
function ra(e) {
  return e.length === 5;
}
function nf(e, t) {
  if (!Number.isFinite(e) || !Number.isFinite(t) || e === 0) return Ji;
  const n = (t - e) / e * 100;
  return Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : Ji;
}
function oa(e, t) {
  const n = sn(na(e)), i = sn(t);
  return [
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">',
    '<span style="display:flex;align-items:center;gap:8px;min-width:0;">',
    `<span style="width:8px;height:8px;border-radius:999px;flex:0 0 auto;background-color:${sn(ia(e.color))};"></span>`,
    `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n}</span>`,
    "</span>",
    `<span style="font-variant-numeric:tabular-nums;white-space:nowrap;">${i}</span>`,
    "</div>"
  ].join("");
}
function sa(e) {
  const [, t, n, i, r] = e.value, o = sn(na(e)), s = sn(ia(e.color)), a = Nn(t), u = Nn(r), f = Nn(i), l = Nn(n), g = n > t, c = g ? "\u25B2" : "\u25BC", h = g ? "#22c55e" : "#ef4444", d = nf(t, n), w = `O: ${a} H: ${u} L: ${f} C: ${l}`, P = sn(w), R = sn(c), T = sn(d), C = sn(h);
  return [
    '<div style="display:flex;flex-direction:column;gap:4px;">',
    // Series name row
    '<div style="display:flex;align-items:center;gap:8px;">',
    `<span style="width:8px;height:8px;border-radius:999px;flex:0 0 auto;background-color:${s};"></span>`,
    `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">${o}</span>`,
    "</div>",
    // OHLC values row
    `<div style="font-variant-numeric:tabular-nums;white-space:nowrap;font-size:0.9em;">${P}</div>`,
    // Change row with arrow
    '<div style="display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums;">',
    `<span style="color:${C};font-weight:700;">${R}</span>`,
    `<span style="color:${C};font-weight:600;">${T}</span>`,
    "</div>",
    "</div>"
  ].join("");
}
function rf(e) {
  return sa(e);
}
function ai(e) {
  return ra(e.value) ? rf(e) : oa(e, Nn(e.value[1]));
}
function _r(e) {
  if (e.length === 0) return "";
  const t = `x: ${Nn(e[0].value[0])}`, n = `<div style="margin:0 0 6px 0;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;">${sn(
    t
  )}</div>`, i = e.map((r) => ra(r.value) ? sa(r) : oa(r, Nn(r.value[1]))).join('<div style="height:4px;"></div>');
  return `${n}${i}`;
}
var of = (e) => Number.isFinite(e) ? e : 0;
var sf = (e) => Number.isFinite(e) ? e : null;
function Ms() {
  const e = /* @__PURE__ */ new Map();
  function t(o, s, a, u, f, l) {
    const g = /* @__PURE__ */ Symbol("Animation");
    if (Array.isArray(o) || Array.isArray(s)) {
      if (!Array.isArray(o) || !Array.isArray(s))
        throw new Error('Array animation requires both "from" and "to" to be arrays');
      if (o.length !== s.length)
        throw new Error(
          `Array animation length mismatch: from.length=${o.length}, to.length=${s.length}`
        );
      const c = new Array(o.length);
      return e.set(g, {
        kind: "array",
        from: o,
        to: s,
        duration: a,
        easing: u,
        onUpdate: f,
        onComplete: l,
        startTime: null,
        out: c
      }), g;
    }
    return e.set(g, {
      kind: "scalar",
      from: o,
      to: s,
      duration: a,
      easing: u,
      onUpdate: f,
      onComplete: l,
      startTime: null
    }), g;
  }
  function n(o) {
    e.delete(o);
  }
  function i() {
    e.clear();
  }
  function r(o) {
    var u;
    const s = sf(o);
    if (s === null) return;
    const a = Array.from(e.keys());
    for (const f of a) {
      const l = e.get(f);
      if (!l) continue;
      const g = l.startTime ?? s;
      l.startTime === null && e.set(f, { ...l, startTime: g });
      const c = of(l.duration), h = Math.max(0, s - g), d = c <= 0 || h >= c, w = c <= 0 ? 1 : h / c, P = d ? 1 : l.easing(w);
      if (l.kind === "scalar") {
        const R = l.from + (l.to - l.from) * P;
        if (l.onUpdate(R), !e.has(f)) continue;
      } else {
        const R = l.out.length;
        for (let T = 0; T < R; T++) {
          const C = l.from[T] ?? 0, v = l.to[T] ?? 0;
          l.out[T] = C + (v - C) * P;
        }
        if (l.onUpdate(l.out), !e.has(f)) continue;
      }
      d && ((u = l.onComplete) == null || u.call(l), e.delete(f));
    }
  }
  return {
    animate: t,
    cancel: n,
    cancelAll: i,
    update: r
  };
}
var lr = (e) => Number.isNaN(e) || e <= 0 ? 0 : e >= 1 ? 1 : e;
function Ss(e) {
  return lr(e);
}
function af(e) {
  const n = 1 - lr(e);
  return 1 - n * n * n;
}
function cf(e) {
  const t = lr(e);
  if (t < 0.5) return 4 * t * t * t;
  const n = -2 * t + 2;
  return 1 - n * n * n / 2;
}
function lf(e) {
  const t = lr(e), n = 7.5625, i = 2.75;
  if (t < 1 / i)
    return n * t * t;
  if (t < 2 / i) {
    const o = t - 1.5 / i;
    return n * o * o + 0.75;
  }
  if (t < 2.5 / i) {
    const o = t - 2.25 / i;
    return n * o * o + 0.9375;
  }
  const r = t - 2.625 / i;
  return n * r * r + 0.984375;
}
function uf(e) {
  switch (e) {
    case "linear":
      return Ss;
    case "cubicOut":
      return af;
    case "cubicInOut":
      return cf;
    case "bounceOut":
      return lf;
    default:
      return Ss;
  }
}
var On = ya;
function ff(e) {
  return e ? e.clientWidth : 0;
}
function df(e) {
  if (!e) return { width: 0, height: 0 };
  const t = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return { width: e.width / t, height: e.height / t };
}
var mf = "bgra8unorm";
var jr = 5;
var sr = 24 * 60 * 60 * 1e3;
var pf = 30 * sr;
var hf = 365 * sr;
var yf = 9;
var Ur = 1;
var gf = 6;
var ar = (e) => typeof e == "number" && Number.isFinite(e) ? e : null;
var yn = (e) => typeof e == "number" && Number.isFinite(e) ? e : void 0;
var xf = 2e4;
var bf = (e) => {
  throw new Error(`RenderCoordinator: unreachable value: ${String(e)}`);
};
var aa = (e) => Array.isArray(e);
var vf = (e) => aa(e) ? { x: e[0], y: e[1] } : { x: e.x, y: e.y };
var Fs = (e) => {
  const t = Ie(e);
  if (t === 0) return { x: [], y: [] };
  const n = new Array(t), i = new Array(t);
  let r = false, o;
  for (let s = 0; s < t; s++) {
    n[s] = Ae(e, s), i[s] = Ue(e, s);
    const a = at(e, s);
    a !== void 0 ? (r = true, o || (o = new Array(s)), o[s] = a) : o && (o[s] = void 0);
  }
  return r && o ? { x: n, y: i, size: o } : { x: n, y: i };
};
var wf = (e, t) => {
  const n = Vt(t);
  if (!n) return e;
  if (!e) return n;
  let i = Math.min(e.xMin, n.xMin), r = Math.max(e.xMax, n.xMax), o = Math.min(e.yMin, n.yMin), s = Math.max(e.yMax, n.yMax);
  return i === r && (r = i + 1), o === s && (s = o + 1), { xMin: i, xMax: r, yMin: o, yMax: s };
};
var Cf = (e, t) => {
  if (t.length === 0) return e;
  let n = (e == null ? void 0 : e.xMin) ?? Number.POSITIVE_INFINITY, i = (e == null ? void 0 : e.xMax) ?? Number.NEGATIVE_INFINITY, r = (e == null ? void 0 : e.yMin) ?? Number.POSITIVE_INFINITY, o = (e == null ? void 0 : e.yMax) ?? Number.NEGATIVE_INFINITY;
  for (let s = 0; s < t.length; s++) {
    const a = t[s], u = an(a) ? a[0] : a.timestamp, f = an(a) ? a[3] : a.low, l = an(a) ? a[4] : a.high;
    !Number.isFinite(u) || !Number.isFinite(f) || !Number.isFinite(l) || (u < n && (n = u), u > i && (i = u), f < r && (r = f), l > o && (o = l));
  }
  return !Number.isFinite(n) || !Number.isFinite(i) || !Number.isFinite(r) || !Number.isFinite(o) ? e : (n === i && (i = n + 1), r === o && (o = r + 1), { xMin: n, xMax: i, yMin: r, yMax: o });
};
var ca = (e, t) => {
  let n = Number.POSITIVE_INFINITY, i = Number.NEGATIVE_INFINITY, r = Number.POSITIVE_INFINITY, o = Number.NEGATIVE_INFINITY;
  for (let s = 0; s < e.length; s++) {
    const a = e[s];
    if (a.type === "pie") continue;
    const u = (t == null ? void 0 : t[s]) ?? null;
    if (u) {
      const c = u;
      if (Number.isFinite(c.xMin) && Number.isFinite(c.xMax) && Number.isFinite(c.yMin) && Number.isFinite(c.yMax)) {
        c.xMin < n && (n = c.xMin), c.xMax > i && (i = c.xMax), c.yMin < r && (r = c.yMin), c.yMax > o && (o = c.yMax);
        continue;
      }
    }
    const f = a.rawBounds;
    if (f) {
      const c = f;
      if (Number.isFinite(c.xMin) && Number.isFinite(c.xMax) && Number.isFinite(c.yMin) && Number.isFinite(c.yMax)) {
        c.xMin < n && (n = c.xMin), c.xMax > i && (i = c.xMax), c.yMin < r && (r = c.yMin), c.yMax > o && (o = c.yMax);
        continue;
      }
    }
    if (a.type === "candlestick") {
      const c = a.rawData ?? a.data;
      for (let h = 0; h < c.length; h++) {
        const d = c[h];
        if (an(d)) {
          const w = d[0], P = d[3], R = d[4];
          if (!Number.isFinite(w) || !Number.isFinite(P) || !Number.isFinite(R)) continue;
          const T = Math.min(P, R), C = Math.max(P, R);
          w < n && (n = w), w > i && (i = w), T < r && (r = T), C > o && (o = C);
        } else {
          const w = d.timestamp, P = d.low, R = d.high;
          if (!Number.isFinite(w) || !Number.isFinite(P) || !Number.isFinite(R)) continue;
          const T = Math.min(P, R), C = Math.max(P, R);
          w < n && (n = w), w > i && (i = w), T < r && (r = T), C > o && (o = C);
        }
      }
      continue;
    }
    const l = a.data, g = Ie(l);
    for (let c = 0; c < g; c++) {
      const h = Ae(l, c), d = Ue(l, c);
      !Number.isFinite(h) || !Number.isFinite(d) || (h < n && (n = h), h > i && (i = h), d < r && (r = d), d > o && (o = d));
    }
  }
  return !Number.isFinite(n) || !Number.isFinite(i) || !Number.isFinite(r) || !Number.isFinite(o) ? { xMin: 0, xMax: 1, yMin: 0, yMax: 1 } : (n === i && (i = n + 1), r === o && (o = r + 1), { xMin: n, xMax: i, yMin: r, yMax: o });
};
var yi = (e, t) => {
  let n = e, i = t;
  if ((!Number.isFinite(n) || !Number.isFinite(i)) && (n = 0, i = 1), n === i)
    i = n + 1;
  else if (n > i) {
    const r = n;
    n = i, i = r;
  }
  return { min: n, max: i };
};
var Ns = (e, t) => {
  const n = e.canvas;
  if (!n) throw new Error("RenderCoordinator: gpuContext.canvas is required.");
  const i = e.devicePixelRatio ?? 1, r = Number.isFinite(i) && i > 0 ? i : 1, o = n.width, s = n.height;
  if (!Number.isFinite(o) || !Number.isFinite(s))
    throw new Error(
      `RenderCoordinator: Invalid canvas dimensions: width=${o}, height=${s}. Canvas must be initialized with finite dimensions before rendering.`
    );
  const a = Math.max(1, Math.floor(o)), u = Math.max(1, Math.floor(s)), f = Number.isFinite(t.grid.left) ? t.grid.left : 0, l = Number.isFinite(t.grid.right) ? t.grid.right : 0, g = Number.isFinite(t.grid.top) ? t.grid.top : 0, c = Number.isFinite(t.grid.bottom) ? t.grid.bottom : 0, h = Math.max(0, f), d = Math.max(0, l), w = Math.max(0, g), P = Math.max(0, c);
  return {
    left: h,
    right: d,
    top: w,
    bottom: P,
    canvasWidth: a,
    // Device pixels (clamped above)
    canvasHeight: u,
    // Device pixels (clamped above)
    devicePixelRatio: r
    // Explicit DPR (validated above)
  };
};
var Mf = (e) => {
  const t = Math.max(0, Math.min(255, Math.round(e[0] * 255))), n = Math.max(0, Math.min(255, Math.round(e[1] * 255))), i = Math.max(0, Math.min(255, Math.round(e[2] * 255))), r = Math.max(0, Math.min(1, e[3]));
  return `rgba(${t},${n},${i},${r})`;
};
var Ts = (e, t) => {
  const n = ht(e);
  if (!n) return e;
  const i = Math.max(0, Math.min(1, n[3] * t));
  return Mf([n[0], n[1], n[2], i]);
};
var Sf = (e) => {
  const { left: t, right: n, top: i, bottom: r, canvasWidth: o, canvasHeight: s, devicePixelRatio: a } = e, u = t * a, f = o - n * a, l = i * a, g = s - r * a, c = u / o * 2 - 1, h = f / o * 2 - 1, d = 1 - l / s * 2, w = 1 - g / s * 2;
  return {
    left: c,
    right: h,
    top: d,
    bottom: w
  };
};
var on = (e) => Math.min(1, Math.max(0, e));
var Xn = (e, t, n) => Math.min(n, Math.max(t, e | 0));
var fi = (e, t, n) => e + (t - e) * on(n);
var $i = (e, t, n) => yi(fi(e.min, t.min, n), fi(e.max, t.max, n));
var Ff = (e) => {
  const { canvasWidth: t, canvasHeight: n, devicePixelRatio: i } = e, r = e.left * i, o = t - e.right * i, s = e.top * i, a = n - e.bottom * i, u = Xn(Math.floor(r), 0, Math.max(0, t)), f = Xn(Math.floor(s), 0, Math.max(0, n)), l = Xn(Math.ceil(o), 0, Math.max(0, t)), g = Xn(Math.ceil(a), 0, Math.max(0, n)), c = Math.max(0, l - u), h = Math.max(0, g - f);
  return { x: u, y: f, w: c, h };
};
var Kr = (e, t) => (e + 1) / 2 * t;
var As = (e, t) => (1 - e) / 2 * t;
var an = nr;
var di = (e, t) => {
  if (typeof e == "number") return Number.isFinite(e) ? e : null;
  if (typeof e != "string") return null;
  const n = e.trim();
  if (n.length === 0) return null;
  if (n.endsWith("%")) {
    const r = Number.parseFloat(n.slice(0, -1));
    return Number.isFinite(r) ? r / 100 * t : null;
  }
  const i = Number.parseFloat(n);
  return Number.isFinite(i) ? i : null;
};
var Nf = (e, t, n) => {
  const i = (e == null ? void 0 : e[0]) ?? "50%", r = (e == null ? void 0 : e[1]) ?? "50%", o = di(i, t), s = di(r, n);
  return {
    x: Number.isFinite(o) ? o : t * 0.5,
    y: Number.isFinite(s) ? s : n * 0.5
  };
};
var Tf = (e) => Array.isArray(e);
var Af = (e, t) => {
  if (e == null) return { inner: 0, outer: t * 0.7 };
  if (Tf(e)) {
    const r = di(e[0], t), o = di(e[1], t), s = Math.max(0, Number.isFinite(r) ? r : 0), a = Math.max(s, Number.isFinite(o) ? o : t * 0.7);
    return { inner: s, outer: Math.min(t, a) };
  }
  const n = di(e, t), i = Math.max(0, Number.isFinite(n) ? n : t * 0.7);
  return { inner: 0, outer: Math.min(t, i) };
};
var Zt = (e) => String(Math.trunc(e)).padStart(2, "0");
var If = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var Pf = (e, t) => {
  if (!Number.isFinite(e)) return null;
  (!Number.isFinite(t) || t < 0) && (t = 0);
  const n = new Date(e);
  if (!Number.isFinite(n.getTime())) return null;
  const i = n.getFullYear(), r = n.getMonth() + 1, o = n.getDate(), s = n.getHours(), a = n.getMinutes();
  return t < sr ? `${Zt(s)}:${Zt(a)}` : t <= 7 * sr ? `${Zt(r)}/${Zt(o)} ${Zt(s)}:${Zt(a)}` : t < 3 * pf ? `${Zt(r)}/${Zt(o)}` : t <= hf ? `${If[n.getMonth()] ?? Zt(r)} ${Zt(o)}` : `${i}/${Zt(r)}`;
};
var Qi = (e, t, n) => {
  const i = Math.max(1, Math.floor(n)), r = new Array(i);
  for (let o = 0; o < i; o++) {
    const s = i === 1 ? 0.5 : o / (i - 1);
    r[o] = e + s * (t - e);
  }
  return r;
};
var Rf = (e) => {
  const {
    axisMin: t,
    axisMax: n,
    xScale: i,
    plotClipLeft: r,
    plotClipRight: o,
    canvasCssWidth: s,
    visibleRangeMs: a,
    measureCtx: u,
    measureCache: f,
    fontSize: l,
    fontFamily: g
  } = e, c = ar(t) ?? i.invert(r), h = ar(n) ?? i.invert(o);
  if (!u || s <= 0)
    return { tickCount: jr, tickValues: Qi(c, h, jr) };
  u.font = `${l}px ${g}`, f && f.size > 2e3 && f.clear();
  const d = f ? `${l}px ${g}@@` : null;
  for (let w = yf; w >= Ur; w--) {
    const P = Qi(c, h, w);
    let R = Number.NEGATIVE_INFINITY, T = true;
    for (let C = 0; C < P.length; C++) {
      const v = P[C], m = Pf(v, a);
      if (m == null) continue;
      const x = (() => {
        if (!d) return u.measureText(m).width;
        const p = d + m, y = f.get(p);
        if (y != null) return y;
        const F = u.measureText(m).width;
        return f.set(p, F), F;
      })(), b = i.scale(v), M = Kr(b, s), I = w === 1 ? "middle" : C === 0 ? "start" : C === P.length - 1 ? "end" : "middle", A = I === "start" ? M : I === "end" ? M - x : M - x * 0.5, S = I === "start" ? M + x : I === "end" ? M : M + x * 0.5;
      if (A < R + gf) {
        T = false;
        break;
      }
      R = S;
    }
    if (T)
      return { tickCount: w, tickValues: P };
  }
  return { tickCount: Ur, tickValues: Qi(c, h, Ur) };
};
var Sn = (e, t) => {
  const n = ca(e.series, t), i = yn(e.xAxis.min) ?? n.xMin, r = yn(e.xAxis.max) ?? n.xMax;
  return yi(i, r);
};
var Df = (e) => {
  let t = Number.POSITIVE_INFINITY, n = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < e.length; i++) {
    const r = e[i];
    if (r.type === "pie") continue;
    if (r.type === "candlestick") {
      const a = r.data;
      for (let u = 0; u < a.length; u++) {
        const f = a[u], l = an(f) ? f[3] : f.low, g = an(f) ? f[4] : f.high;
        if (!Number.isFinite(l) || !Number.isFinite(g)) continue;
        const c = Math.min(l, g), h = Math.max(l, g);
        c < t && (t = c), h > n && (n = h);
      }
      continue;
    }
    const o = r.data, s = Ie(o);
    for (let a = 0; a < s; a++) {
      const u = Ue(o, a);
      Number.isFinite(u) && (u < t && (t = u), u > n && (n = u));
    }
  }
  return !Number.isFinite(t) || !Number.isFinite(n) ? { xMin: 0, xMax: 1, yMin: 0, yMax: 1 } : (t === n && (n = t + 1), { xMin: 0, xMax: 1, yMin: t, yMax: n });
};
var kr = (e, t, n) => {
  const i = yn(e.yAxis.min), r = yn(e.yAxis.max);
  if (i !== void 0 && r !== void 0)
    return yi(i, r);
  const o = e.yAxis.autoBounds ?? "visible";
  let s;
  o === "visible" && n ? s = n : s = ca(e.series, t);
  const a = i ?? s.yMin, u = r ?? s.yMax;
  return yi(a, u);
};
var Fn = (e, t) => {
  if (!t) return { ...e, spanFraction: 1 };
  const n = e.max - e.min;
  if (!Number.isFinite(n) || n === 0) return { ...e, spanFraction: 1 };
  const i = t.start, r = t.end, o = e.min + i / 100 * n, s = e.min + r / 100 * n, a = yi(o, s), u = (r - i) / 100, f = Number.isFinite(u) ? Math.max(0, Math.min(1, u)) : 1;
  return { min: a.min, max: a.max, spanFraction: f };
};
var la = (e) => {
  if (e === false || e == null) return null;
  const t = e === true ? {} : e;
  if (!t) return null;
  const n = t.duration ?? 300, i = t.delay ?? 0, r = Number.isFinite(n) ? Math.max(0, n) : 300, o = Number.isFinite(i) ? Math.max(0, i) : 0;
  return {
    durationMs: r,
    delayMs: o,
    easing: uf(t.easing)
  };
};
var Ef = (e) => la(e);
var Bf = (e) => la(e);
var Gr = (e, t, n, i, r) => {
  const o = e.point, s = an(o) ? o[0] : o.timestamp, a = an(o) ? o[1] : o.open, u = an(o) ? o[2] : o.close;
  if (!Number.isFinite(s) || !Number.isFinite(a) || !Number.isFinite(u))
    return null;
  const f = (a + u) / 2, l = t.scale(s), g = n.scale(f);
  if (!Number.isFinite(l) || !Number.isFinite(g))
    return null;
  const c = i.left + l, h = i.top + g, d = On(r) ? r.offsetLeft + c : c, w = On(r) ? r.offsetTop + h : h;
  return !Number.isFinite(d) || !Number.isFinite(w) ? null : { x: d, y: w };
};
var Is = (e) => {
  let t = Number.POSITIVE_INFINITY, n = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < e.length; i++) {
    const r = e[i].data, o = Ie(r);
    for (let s = 0; s < o; s++) {
      const a = Ue(r, s);
      Number.isFinite(a) && (a < t && (t = a), a > n && (n = a));
    }
  }
  return !Number.isFinite(t) || !Number.isFinite(n) || t <= 0 && 0 <= n ? 0 : Math.abs(t) < Math.abs(n) ? t : n;
};
var Lf = (e, t, n) => {
  const i = t.invert(n.bottom), r = t.invert(n.top), o = Math.min(i, r), s = Math.max(i, r);
  return !Number.isFinite(o) || !Number.isFinite(s) ? Is(e) : o <= 0 && 0 <= s ? 0 : o > 0 ? o : s < 0 ? s : Is(e);
};
var _f = (e, t, n, i) => {
  const r = on(i);
  if (r >= 1) return e;
  const o = Lf(n, e, t), s = e.scale(o), a = {
    domain(u, f) {
      return e.domain(u, f), a;
    },
    range(u, f) {
      return e.range(u, f), a;
    },
    scale(u) {
      const f = e.scale(u);
      return !Number.isFinite(f) || !Number.isFinite(s) ? f : s + (f - s) * r;
    },
    invert(u) {
      return e.invert(u);
    }
  };
  return a;
};
function Uf(e, t, n) {
  var so, ao, co;
  if (!e.initialized)
    throw new Error("RenderCoordinator: gpuContext must be initialized.");
  const i = e.device;
  if (!i)
    throw new Error("RenderCoordinator: gpuContext.device is required.");
  if (!e.canvas)
    throw new Error("RenderCoordinator: gpuContext.canvas is required.");
  if (!e.canvasContext)
    throw new Error("RenderCoordinator: gpuContext.canvasContext is required.");
  const r = e.preferredFormat ?? mf, o = n == null ? void 0 : n.pipelineCache, s = On(e.canvas) ? e.canvas.parentElement : null, a = s ? xs(s) : null, u = s ? xs(s, { clip: true }) : null, f = (U, O) => {
    if (h) return;
    const k = d.series;
    if (U < 0 || U >= k.length) return;
    const $ = k[U];
    if (!$) return;
    if (O !== void 0 && $.type === "pie") {
      const re = $.data;
      if (O < 0 || O >= re.length) return;
      const ae = re.map(
        (ie, Re) => Re === O ? { ...ie, visible: ie.visible === false } : ie
      ), xe = k.map(
        (ie, Re) => Re === U ? { ...ie, data: ae } : ie
      );
      yt({ ...d, series: xe });
      return;
    }
    const Q = k.map(
      (re, ae) => ae === U ? { ...re, visible: re.visible === false } : re
    );
    yt({ ...d, series: Q });
  }, l = s && ((so = t.legend) == null ? void 0 : so.show) !== false ? tf(s, (ao = t.legend) == null ? void 0 : ao.position, f) : null, g = (() => {
    if (typeof document > "u")
      return null;
    try {
      return document.createElement("canvas").getContext("2d");
    } catch {
      return null;
    }
  })(), c = g ? /* @__PURE__ */ new Map() : null;
  let h = false, d = t, w = t.series.length, P = "pending", R = 0;
  const T = Ms();
  let C = null, v = false;
  const m = Ms();
  let x = null, b = 1, M = null;
  const I = {
    cartesianDataBySeriesIndex: [],
    pieDataBySeriesIndex: []
  }, A = () => {
    I.cartesianDataBySeriesIndex.length = 0, I.pieDataBySeriesIndex.length = 0;
  }, S = (U, O, k, $, Q) => {
    if (k === 0) return Q ?? [];
    const re = Q && Q.length === k ? Q : (() => {
      const xe = new Array(k);
      for (let ie = 0; ie < k; ie++) {
        const Re = Ae(O, ie);
        xe[ie] = [Re, 0];
      }
      return xe;
    })(), ae = on($);
    for (let xe = 0; xe < k; xe++) {
      const ie = Ae(U, xe), Re = Ae(O, xe), Fe = Ue(U, xe), Se = Ue(O, xe), Pe = Number.isFinite(ie) && Number.isFinite(Re) ? fi(ie, Re, ae) : Re, De = Number.isFinite(Fe) && Number.isFinite(Se) ? fi(Fe, Se, ae) : Se, Ee = re[xe];
      aa(Ee) ? (Ee[0] = Pe, Ee[1] = De) : (Ee.x = Pe, Ee.y = De);
    }
    return re;
  }, p = (U, O, k, $) => {
    var Re, Fe;
    const Q = U.data, re = O.data;
    if (Q.length !== re.length) return O;
    const ae = re.length, xe = $ && $.length === ae ? $ : (() => {
      const Se = new Array(ae);
      for (let Pe = 0; Pe < ae; Pe++)
        Se[Pe] = { ...re[Pe], value: 0 };
      return Se;
    })(), ie = on(k);
    for (let Se = 0; Se < ae; Se++) {
      const Pe = (Re = Q[Se]) == null ? void 0 : Re.value, De = (Fe = re[Se]) == null ? void 0 : Fe.value, Ee = typeof Pe == "number" && typeof De == "number" && Number.isFinite(Pe) && Number.isFinite(De) ? Math.max(0, fi(Pe, De, ie)) : typeof De == "number" && Number.isFinite(De) ? De : 0;
      xe[Se].value = Ee;
    }
    return { ...O, data: xe };
  }, y = (U, O, k, $) => {
    if (U.length !== O.length) return O;
    const Q = new Array(O.length);
    for (let re = 0; re < O.length; re++) {
      const ae = U[re], xe = O[re];
      if (ae.type !== xe.type) {
        Q[re] = xe;
        continue;
      }
      if (xe.type === "pie") {
        const Ee = ($ == null ? void 0 : $.pieDataBySeriesIndex[re]) ?? null, It = p(ae, xe, k, Ee);
        $ && ($.pieDataBySeriesIndex[re] = It.data), Q[re] = It;
        continue;
      }
      const ie = ae.data, Re = xe.data, Fe = Ie(ie), Se = Ie(Re);
      if (Fe !== Se) {
        Q[re] = xe;
        continue;
      }
      if (Se > xf) {
        Q[re] = xe;
        continue;
      }
      const Pe = ($ == null ? void 0 : $.cartesianDataBySeriesIndex[re]) ?? null, De = S(ie, Re, Fe, k, Pe);
      if (!De) {
        Q[re] = xe;
        continue;
      }
      $ && ($.cartesianDataBySeriesIndex[re] = De), Q[re] = { ...xe, data: De };
    }
    return Q;
  }, F = (U, O, k) => {
    const $ = $i(U.from.xBaseDomain, U.to.xBaseDomain, O), Q = Fn($, k), re = $i(U.from.yBaseDomain, U.to.yBaseDomain, O), ae = y(U.from.series, U.to.series, O, null);
    return {
      xBaseDomain: $,
      xVisibleDomain: { min: Q.min, max: Q.max },
      yBaseDomain: re,
      series: ae
    };
  }, N = /* @__PURE__ */ new Set(), D = /* @__PURE__ */ new Set();
  let B = new Array(t.series.length).fill(null), E = new Array(t.series.length).fill(null), z = d.series, G = d.series, Y = null;
  const V = (U) => {
    if ((U.yAxis.autoBounds ?? "visible") !== "visible") return false;
    const k = yn(U.yAxis.min), $ = yn(U.yAxis.max);
    return !(k !== void 0 && $ !== void 0);
  }, j = () => {
    V(d) ? Y = Df(G) : Y = null;
  };
  let K = [], J = false, oe = null, W = null, fe = null, _ = false, H = false;
  const X = /* @__PURE__ */ new Map();
  let pe = new Array(d.series.length).fill("unknown");
  const ce = /* @__PURE__ */ new Set();
  let me = s && ((co = d.tooltip) == null ? void 0 : co.show) !== false ? Cs(s) : null, q = null, se = null, te = null;
  const ee = (U, O, k, $) => {
    me == null || me.show(U, O, k);
  }, be = () => {
    me == null || me.hide();
  }, le = () => {
    q = null, se = null, te = null, be();
  };
  ((U, O) => {
    l == null || l.update(U, O);
  })(d.series, d.theme);
  let ye = wa(i);
  const Be = Jc(i, { targetFormat: r, sampleCount: Vn, pipelineCache: o }), Le = Uo(i, { targetFormat: r, pipelineCache: o }), st = Uo(i, { targetFormat: r, pipelineCache: o }), rt = vu(i, { targetFormat: r, pipelineCache: o });
  rt.setVisible(false);
  const ve = Nu(i, { targetFormat: r, pipelineCache: o });
  ve.setVisible(false);
  const Te = cs(i, { targetFormat: r, sampleCount: Vn, pipelineCache: o }), Xe = fs(i, { targetFormat: r, sampleCount: Vn, pipelineCache: o }), He = cs(i, {
    targetFormat: r,
    sampleCount: ui,
    pipelineCache: o
  }), ke = fs(i, {
    targetFormat: r,
    sampleCount: ui,
    pipelineCache: o
  }), bt = ru({ device: i, targetFormat: r, pipelineCache: o }), vt = Ns(e, d), We = On(e.canvas) ? Eu(e.canvas, vt) : null;
  let nt = {
    source: "mouse",
    x: 0,
    y: 0,
    gridX: 0,
    gridY: 0,
    isInGrid: false,
    hasPointer: false
  }, Rt = null, Wt;
  const Ft = /* @__PURE__ */ new Set();
  let Ut = null;
  const Ot = (U, O) => {
    const k = Array.from(Ft);
    for (const $ of k) $(U, O);
  }, wt = (U, O) => {
    const k = U !== null && Number.isFinite(U) ? U : null;
    Rt === k && Wt === O || (Rt = k, Wt = O, Ot(Rt, Wt));
  }, Qe = () => {
    var U;
    (U = n == null ? void 0 : n.onRequestRender) == null || U.call(n);
  }, kt = (U) => U ? Number.isFinite(U.start) && Number.isFinite(U.end) && U.start <= 0 && U.end >= 100 : true, Xt = () => {
    oe !== null && (cancelAnimationFrame(oe), oe = null), W !== null && (clearTimeout(W), W = null), J = false;
  }, cn = () => {
    fe !== null && (clearTimeout(fe), fe = null);
  }, gi = () => {
    var xe;
    if (X.size === 0) return false;
    ce.clear();
    const U = (ne == null ? void 0 : ne.getRange()) ?? null, O = kt(U), k = d.autoScroll === true && ne != null && d.xAxis.min == null && d.xAxis.max == null, $ = Sn(d, E), Q = U ? Fn($, U) : null;
    let re = false;
    for (const [ie, Re] of X) {
      if (Re.length === 0) continue;
      const Fe = d.series[ie];
      if (!(!Fe || Fe.type === "pie")) {
        if (re = true, Fe.type === "candlestick") {
          let Se = B[ie];
          if (!Se) {
            const Pe = Fe.rawData ?? Fe.data;
            Se = Pe.length === 0 ? [] : Pe.slice(), B[ie] = Se, E[ie] = Fe.rawBounds ?? null;
          }
          for (const Pe of Re) {
            const De = Pe;
            Se.push(...De), E[ie] = Cf(
              E[ie],
              De
            );
          }
        } else {
          let Se = B[ie];
          if (!Se) {
            const De = Fe.rawData ?? Fe.data;
            Se = Fs(De), B[ie] = Se, E[ie] = Fe.rawBounds ?? Vt(De);
          }
          const Pe = Fe.type === "line" && Fe.sampling === "none" && O && pe[ie] === "fullRawLine";
          for (const De of Re) {
            const Ee = De;
            if (Pe)
              try {
                ye.appendSeries(ie, Ee), ce.add(ie);
              } catch {
              }
            else Fe.type === "line" && Fe.sampling !== "none" && !D.has(ie) && (D.add(ie), console.warn(
              `[ChartGPU] appendData() on series ${ie} with sampling='${Fe.sampling}' causes full buffer re-upload every frame. For optimal streaming performance, use sampling='none'. See docs/internal/INCREMENTAL_APPEND_OPTIMIZATION.md for details.`
            ));
            const It = Ie(Ee), tn = Se.x.length;
            for (let it = 0; it < It; it++) {
              Se.x.push(Ae(Ee, it)), Se.y.push(Ue(Ee, it));
              const Gt = at(Ee, it);
              Gt !== void 0 ? (Se.size || (Se.size = new Array(tn + it)), Se.size.push(Gt)) : Se.size && Se.size.push(void 0);
            }
            E[ie] = wf(
              E[ie],
              Ee
            );
          }
        }
        K[ie] = null;
      }
    }
    if (X.clear(), !re) return false;
    if (k && (Ne = "auto-scroll"), ne) {
      const ie = Ct(), Re = ne;
      (xe = Re.setSpanConstraints) == null || xe.call(Re, ie.minSpan, ie.maxSpan);
    }
    if (k && U && Q) {
      Ne = "auto-scroll";
      const ie = U;
      if (ie.end >= 99.5) {
        const Re = ie.end - ie.start, Fe = ne;
        Fe.setRangeAnchored ? Fe.setRangeAnchored(100 - Re, 100, "end") : ne.setRange(100 - Re, 100);
      } else {
        const Re = Sn(d, E), Fe = Re.max - Re.min;
        if (Number.isFinite(Fe) && Fe > 0) {
          const Se = (Q.min - Re.min) / Fe * 100, Pe = (Q.max - Re.min) / Fe * 100, De = Math.max(0, Math.min(100, Se)), Ee = Math.max(0, Math.min(100, Pe));
          ne.setRange(De, Ee);
        }
      }
    }
    k && (Ne = void 0), Mt();
    const ae = (ne == null ? void 0 : ne.getRange()) ?? null;
    return (ae == null || kt(ae)) && (G = z, j()), true;
  }, An = (U) => {
    if (h) return;
    const O = (U == null ? void 0 : U.requestRenderAfter) ?? true, k = gi(), $ = (ne == null ? void 0 : ne.getRange()) ?? null, Q = kt($), re = $ != null && !Q;
    let ae = false;
    _ ? (_ = false, cn(), !$ || Q ? (G = z, j()) : At(), ae = true) : k && re && (_ = false, cn(), At(), ae = true), (k || ae) && O && Qe();
  }, qn = (U) => {
    h || J || (oe !== null && (cancelAnimationFrame(oe), oe = null), W !== null && (clearTimeout(W), W = null), J = true, oe = requestAnimationFrame(() => {
      if (oe = null, h) {
        Xt();
        return;
      }
      W !== null && (clearTimeout(W), W = null), J = false, An();
    }), W = (typeof self < "u" ? self : window).setTimeout(() => {
      if (h) {
        Xt();
        return;
      }
      J && (oe !== null && (cancelAnimationFrame(oe), oe = null), J = false, W = null, An());
    }, 16));
  }, xi = () => {
    h || (cn(), _ = false, fe = (typeof self < "u" ? self : window).setTimeout(() => {
      fe = null, !h && (_ = true, qn());
    }, 100));
  }, Zn = (U, O) => {
    let k, $;
    const Q = U.getBoundingClientRect();
    if (!(Q.width > 0) || !(Q.height > 0)) return null;
    k = Q.width, $ = Q.height;
    const re = k - O.left - O.right, ae = $ - O.top - O.bottom;
    return !(re > 0) || !(ae > 0) ? null : { plotWidthCss: re, plotHeightCss: ae };
  }, bi = (U, O) => {
    const k = e.canvas;
    if (!k) return null;
    const $ = Zn(k, U);
    if (!$) return null;
    const Q = hn().domain(O.xDomain.min, O.xDomain.max).range(0, $.plotWidthCss), re = hn().domain(O.yDomain.min, O.yDomain.max).range($.plotHeightCss, 0);
    return { xScale: Q, yScale: re, plotWidthCss: $.plotWidthCss, plotHeightCss: $.plotHeightCss };
  }, xn = (U, O, k) => {
    const $ = d.series[U], { x: Q, y: re } = vf(k);
    return {
      seriesName: ($ == null ? void 0 : $.name) ?? "",
      seriesIndex: U,
      dataIndex: O,
      value: [Q, re],
      color: ($ == null ? void 0 : $.color) ?? "#888"
    };
  }, vi = (U, O, k) => {
    const $ = d.series[U];
    return an(k) ? {
      seriesName: ($ == null ? void 0 : $.name) ?? "",
      seriesIndex: U,
      dataIndex: O,
      value: [k[0], k[1], k[2], k[3], k[4]],
      color: ($ == null ? void 0 : $.color) ?? "#888"
    } : {
      seriesName: ($ == null ? void 0 : $.name) ?? "",
      seriesIndex: U,
      dataIndex: O,
      value: [k.timestamp, k.open, k.close, k.low, k.high],
      color: ($ == null ? void 0 : $.color) ?? "#888"
    };
  }, L = (U, O, k, $, Q) => {
    const re = 0.5 * Math.min($, Q);
    if (!(re > 0)) return null;
    for (let ae = U.length - 1; ae >= 0; ae--) {
      const xe = U[ae];
      if (xe.type !== "pie" || xe.visible === false) continue;
      const ie = xe, Re = Nf(ie.center, $, Q), Fe = Af(ie.radius, re), Se = Zr(O, k, { seriesIndex: ae, series: ie }, Re, Fe);
      if (Se) return Se;
    }
    return null;
  }, Z = (U, O, k, $) => {
    for (let Q = U.length - 1; Q >= 0; Q--) {
      const re = U[Q];
      if (re.type !== "candlestick" || re.visible === false) continue;
      const ae = re, xe = Hr(
        ae,
        ae.data,
        $.xScale,
        $.plotWidthCss
      ), ie = qr(
        [ae],
        O,
        k,
        $.xScale,
        $.yScale,
        xe
      );
      if (!ie) continue;
      return { params: vi(Q, ie.dataIndex, ie.point), match: { point: ie.point }, seriesIndex: Q };
    }
    return null;
  }, ue = (U) => {
    if (nt = {
      source: "mouse",
      x: U.x,
      y: U.y,
      gridX: U.gridX,
      gridY: U.gridY,
      isInGrid: U.isInGrid,
      hasPointer: true
    }, U.isInGrid && Ut) {
      const O = Ut.xScale.invert(U.gridX);
      wt(Number.isFinite(O) ? O : null, "mouse");
    } else U.isInGrid || wt(null, "mouse");
    rt.setVisible(U.isInGrid), Qe();
  }, we = (U) => {
    nt.source === "mouse" && (nt = { ...nt, isInGrid: false, hasPointer: false }, rt.setVisible(false), le(), wt(null, "mouse"), Qe());
  };
  We && (We.on("mousemove", ue), We.on("mouseleave", we));
  let ne = null, Ce = null, de = null, he = null, Ne;
  const Me = /* @__PURE__ */ new Set(), et = (U, O) => {
    const k = Array.from(Me);
    for (const $ of k) $(U, O);
  }, Nt = (U) => {
    var ae, xe;
    const O = (ae = U.dataZoom) == null ? void 0 : ae.find((ie) => (ie == null ? void 0 : ie.type) === "inside"), k = (xe = U.dataZoom) == null ? void 0 : xe.find((ie) => (ie == null ? void 0 : ie.type) === "slider"), $ = O ?? k;
    if (!$) return null;
    const Q = Number.isFinite($.start) ? $.start : 0, re = Number.isFinite($.end) ? $.end : 100;
    return { start: Q, end: re, hasInside: !!O };
  }, _e = (U) => Math.min(100, Math.max(0, U)), Oe = (U) => {
    let O = null, k = null;
    const $ = U.dataZoom ?? [];
    for (const Q of $)
      if (Q && !(Q.type !== "inside" && Q.type !== "slider")) {
        if (Number.isFinite(Q.minSpan)) {
          const re = _e(Q.minSpan);
          O = O == null ? re : Math.max(O, re);
        }
        if (Number.isFinite(Q.maxSpan)) {
          const re = _e(Q.maxSpan);
          k = k == null ? re : Math.min(k, re);
        }
      }
    return { minSpan: O ?? void 0, maxSpan: k ?? void 0 };
  }, ct = () => {
    if (d.xAxis.type === "category") return null;
    let U = 0;
    for (let k = 0; k < d.series.length; k++) {
      const $ = d.series[k];
      if ($.type === "pie") continue;
      if ($.type === "candlestick") {
        const ae = B[k] ?? $.rawData ?? $.data;
        U = Math.max(U, ae.length);
        continue;
      }
      const Q = B[k] ?? null, re = Q ? Q.x.length : Ie($.rawData ?? $.data);
      U = Math.max(U, re);
    }
    if (U < 2) return null;
    const O = 100 / (U - 1);
    return Number.isFinite(O) ? _e(O) : null;
  }, Ct = () => {
    const U = Oe(d), O = ct(), k = Number.isFinite(U.minSpan) ? _e(U.minSpan) : O ?? 0.5, $ = Number.isFinite(U.maxSpan) ? _e(U.maxSpan) : 100;
    return { minSpan: k, maxSpan: $ };
  }, en = () => {
    var O;
    const U = Nt(d);
    if (!U) {
      Ce == null || Ce.dispose(), Ce = null, de == null || de(), de = null, ne = null, he = null;
      return;
    }
    if (ne) {
      const k = Ct(), $ = ne;
      (O = $.setSpanConstraints) == null || O.call($, k.minSpan, k.maxSpan), (he == null || he.start !== U.start || he.end !== U.end) && (ne.setRange(U.start, U.end), he = { start: U.start, end: U.end });
    } else {
      const k = Ct();
      ne = Ou(U.start, U.end, k), he = { start: U.start, end: U.end }, de = ne.onChange(($) => {
        H = true, Qe(), xi();
        const Q = Ne;
        et({ start: $.start, end: $.end }, Q), Ne = void 0;
      });
    }
    U.hasInside && We ? Ce || (Ce = Gu(We, ne), Ce.enable()) : (Ce == null || Ce.dispose(), Ce = null);
  }, Tt = () => {
    const U = d.series.length;
    B = new Array(U).fill(null), E = new Array(U).fill(null), X.clear();
    for (let O = 0; O < U; O++) {
      const k = d.series[O];
      if (k.type === "pie") continue;
      if (k.type === "candlestick") {
        const re = k.rawData ?? k.data, ae = re.length === 0 ? [] : re.slice();
        B[O] = ae, E[O] = k.rawBounds ?? null;
        continue;
      }
      const $ = k.rawData ?? k.data, Q = Fs($);
      B[O] = Q, E[O] = k.rawBounds ?? Vt($);
    }
  }, Mt = () => {
    const U = new Array(d.series.length);
    for (let O = 0; O < d.series.length; O++) {
      const k = d.series[O];
      if (k.type === "pie") {
        U[O] = k;
        continue;
      }
      if (k.type === "candlestick") {
        const ae = B[O] ?? k.rawData ?? k.data, xe = E[O] ?? k.rawBounds ?? void 0, ie = k.sampling === "ohlc" && ae.length > k.samplingThreshold ? $r(ae, k.samplingThreshold) : ae;
        U[O] = { ...k, rawData: ae, rawBounds: xe, data: ie };
        continue;
      }
      const $ = B[O] ?? k.rawData ?? k.data, Q = E[O] ?? k.rawBounds ?? void 0, re = Gn($, k.sampling, k.samplingThreshold);
      U[O] = { ...k, rawData: $, rawBounds: Q, data: re };
    }
    z = U;
  };
  function ur() {
    const U = (ne == null ? void 0 : ne.getRange()) ?? null, O = Sn(d, E), k = Fn(O, U);
    if (U == null || Number.isFinite(U.start) && Number.isFinite(U.end) && U.start <= 0 && U.end >= 100) {
      G = z, j();
      return;
    }
    const Q = new Array(z.length);
    for (let re = 0; re < z.length; re++) {
      const ae = z[re];
      if (ae.type === "pie") {
        Q[re] = ae;
        continue;
      }
      const xe = K[re];
      if (xe && k.min >= xe.cachedRange.min && k.max <= xe.cachedRange.max) {
        ae.type === "candlestick" ? Q[re] = {
          ...ae,
          data: Pi(xe.data, k.min, k.max)
        } : Q[re] = {
          ...ae,
          data: Ii(xe.data, k.min, k.max)
        };
        continue;
      }
      ae.type === "candlestick" ? Q[re] = {
        ...ae,
        data: Pi(ae.data, k.min, k.max)
      } : Q[re] = {
        ...ae,
        data: Ii(ae.data, k.min, k.max)
      };
    }
    G = Q, j();
  }
  function At() {
    const U = (ne == null ? void 0 : ne.getRange()) ?? null, O = Sn(d, E), k = Fn(O, U), re = (k.max - k.min) * 0.1, ae = k.min - re, xe = k.max + re, ie = 2, Re = 2e5, Fe = 32, Se = Math.max(1e-3, Math.min(1, k.spanFraction)), Pe = new Array(z.length);
    for (let De = 0; De < z.length; De++) {
      const Ee = z[De];
      if (Ee.type === "pie") {
        Pe[De] = Ee;
        continue;
      }
      if (U == null || Number.isFinite(U.start) && Number.isFinite(U.end) && U.start <= 0 && U.end >= 100) {
        Pe[De] = Ee;
        continue;
      }
      if (Ee.type === "candlestick") {
        const Mi = B[De] ?? Ee.rawData ?? Ee.data, Pn = Pi(Mi, ae, xe), dr = Ee.sampling, jn = Ee.samplingThreshold, Si = Number.isFinite(jn) ? Math.max(1, jn | 0) : 1, mr = Math.min(Re, Math.max(ie, Si * Fe)), Kn = Xn(Math.round(Si / Se), ie, mr), Rn = dr === "ohlc" && Pn.length > Kn ? $r(Pn, Kn) : Pn;
        K[De] = {
          data: Rn,
          cachedRange: { min: ae, max: xe },
          timestamp: Date.now()
        };
        const Jn = Pi(Rn, k.min, k.max);
        Pe[De] = { ...Ee, data: Jn };
        continue;
      }
      const tn = B[De] ?? Ee.rawData ?? Ee.data, it = Ii(tn, ae, xe), Gt = Ee.sampling, nn = Ee.samplingThreshold, bn = Number.isFinite(nn) ? Math.max(1, nn | 0) : 1, wi = Math.min(Re, Math.max(ie, bn * Fe)), fr = Xn(Math.round(bn / Se), ie, wi), Et = Gn(it, Gt, fr);
      K[De] = {
        data: Et,
        cachedRange: { min: ae, max: xe },
        timestamp: Date.now()
      };
      const Ci = Ii(Et, k.min, k.max);
      Pe[De] = { ...Ee, data: Ci };
    }
    G = Pe, j();
  }
  Tt(), Mt(), en(), At(), K = new Array(d.series.length).fill(null);
  const lt = iu({ device: i, targetFormat: r, pipelineCache: o, sampleCount: Vn });
  lt.ensureAreaRendererCount(d.series.length), lt.ensureLineRendererCount(d.series.length), lt.ensureScatterRendererCount(d.series.length), lt.ensureScatterDensityRendererCount(d.series.length), lt.ensurePieRendererCount(d.series.length), lt.ensureCandlestickRendererCount(d.series.length);
  const Dt = () => {
    if (h) throw new Error("RenderCoordinator is disposed.");
  }, Ge = () => {
    if (x)
      try {
        m.cancel(x);
      } catch {
      }
    x = null, b = 1, M = null, A();
  }, ze = (U, O) => U.min === O.min && U.max === O.max, dt = (U, O) => {
    if (U.length !== O.length) return true;
    for (let k = 0; k < U.length; k++) {
      const $ = U[k], Q = O[k];
      if ($.type !== Q.type) return true;
      if ($.type === "pie") {
        const re = $, ae = Q;
        if (re.data !== ae.data || re.data.length !== ae.data.length) return true;
      } else {
        const re = $, ae = Q, xe = re.rawData ?? re.data, ie = ae.rawData ?? ae.data;
        if (xe !== ie || xe.length !== ie.length) return true;
      }
    }
    return false;
  }, yt = (U) => {
    var tn;
    Dt();
    const O = (ne == null ? void 0 : ne.getRange()) ?? null, k = (() => {
      if (M && x) {
        try {
          m.update(performance.now());
        } catch {
        }
        return F(M, b, O);
      }
      const it = Sn(d, E), Gt = Fn(it, O), nn = kr(d, E, Y);
      return {
        xBaseDomain: it,
        xVisibleDomain: { min: Gt.min, max: Gt.max },
        yBaseDomain: nn,
        series: G
      };
    })();
    Ge();
    const $ = dt(d.series, U.series);
    if (d = U, $ && (z = U.series, G = U.series, pe = new Array(U.series.length).fill("unknown"), K = new Array(U.series.length).fill(null), cn(), _ = false, Xt(), Tt()), Y = null, l == null || l.update(U.series, U.theme), Mt(), en(), At(), s) {
      const it = ((tn = d.tooltip) == null ? void 0 : tn.show) !== false;
      it && !me && (me = Cs(s), q = null, se = null, te = null), !it && me && le();
    } else
      le();
    const Q = U.series.length;
    if (lt.ensureAreaRendererCount(Q), lt.ensureLineRendererCount(Q), lt.ensureScatterRendererCount(Q), lt.ensureScatterDensityRendererCount(Q), lt.ensurePieRendererCount(Q), lt.ensureCandlestickRendererCount(Q), Q < w)
      for (let it = Q; it < w; it++)
        ye.removeSeries(it);
    if (w = Q, d.animation === false && P === "running" && (T.cancelAll(), C = null, P = "done", R = 1), d.animation === false) {
      Ge(), Qe();
      return;
    }
    const re = (ne == null ? void 0 : ne.getRange()) ?? null, ae = Sn(d, E), xe = Fn(ae, re), ie = kr(d, E, Y), Re = G, Fe = !ze(k.xBaseDomain, ae) || !ze(k.yBaseDomain, ie);
    if (!(v && (Fe || $))) {
      Qe();
      return;
    }
    const Pe = Bf(d.animation);
    if (!Pe) return;
    M = {
      from: {
        xBaseDomain: k.xBaseDomain,
        xVisibleDomain: k.xVisibleDomain,
        yBaseDomain: k.yBaseDomain,
        series: k.series
      },
      to: {
        xBaseDomain: ae,
        xVisibleDomain: { min: xe.min, max: xe.max },
        yBaseDomain: ie,
        series: Re
      }
    }, A();
    const De = Pe.delayMs + Pe.durationMs, Ee = (it) => {
      const Gt = on(it);
      if (!(De > 0)) return 1;
      const nn = Gt * De;
      if (nn <= Pe.delayMs) return 0;
      if (!(Pe.durationMs > 0)) return 1;
      const bn = (nn - Pe.delayMs) / Pe.durationMs;
      return Pe.easing(bn);
    };
    b = 0;
    const It = m.animate(
      0,
      1,
      De,
      Ee,
      (it) => {
        h || x !== It || (b = on(it), b < 1 && Qe());
      },
      () => {
        h || x !== It || (b = 1, M = null, x = null, A());
      }
    );
    x = It, Qe();
  };
  return {
    setOptions: yt,
    appendData: (U, O) => {
      if (Dt(), !Number.isFinite(U) || U < 0 || U >= d.series.length || !O) return;
      const k = d.series[U];
      if (k.type === "pie") {
        N.has(U) || (N.add(U), console.warn(
          `RenderCoordinator.appendData(${U}, ...): pie series are not supported by streaming append.`
        ));
        return;
      }
      if ((k.type === "candlestick" ? O.length : Ie(O)) === 0) return;
      const Q = X.get(U);
      Q ? Q.push(O) : X.set(U, [O]), qn();
    },
    getInteractionX: () => Rt,
    setInteractionX: (U, O) => {
      Dt();
      const k = U !== null && Number.isFinite(U) ? U : null;
      nt = { ...nt, source: k === null ? "mouse" : "sync" }, wt(k, O), k === null && nt.hasPointer === false && (rt.setVisible(false), ve.setVisible(false), be()), Qe();
    },
    onInteractionXChange: (U) => (Dt(), Ft.add(U), () => {
      Ft.delete(U);
    }),
    getZoomRange: () => (ne == null ? void 0 : ne.getRange()) ?? null,
    setZoomRange: (U, O) => {
      Dt(), ne && ne.setRange(U, O);
    },
    onZoomRangeChange: (U) => (Dt(), Me.add(U), () => {
      Me.delete(U);
    }),
    render: () => {
      var ho, yo, go;
      if (Dt(), !e.canvasContext || !e.canvas) return;
      (X.size > 0 || _) && (Xt(), An({ requestRenderAfter: false })), H && (H = false, ur());
      const U = d.series.some((Ve) => Ve.type !== "pie"), O = G;
      if (P !== "done") {
        const Ve = Ef(d.animation), Ze = (() => {
          for (let zt = 0; zt < O.length; zt++) {
            const tt = O[zt];
            switch (tt.type) {
              case "pie": {
                if (tt.data.some(($e) => typeof ($e == null ? void 0 : $e.value) == "number" && Number.isFinite($e.value) && $e.value > 0))
                  return true;
                break;
              }
              case "line":
              case "area":
              case "bar":
              case "scatter": {
                if (Ie(tt.data) > 0) return true;
                break;
              }
              case "candlestick": {
                if (tt.data.length > 0) return true;
                break;
              }
              default:
                bf(tt);
            }
          }
          return false;
        })();
        if (P === "pending" && Ve && Ze) {
          const zt = Ve.delayMs + Ve.durationMs, tt = ($e) => {
            const gt = on($e);
            if (!(zt > 0)) return 1;
            const qe = gt * zt;
            if (qe <= Ve.delayMs) return 0;
            if (!(Ve.durationMs > 0)) return 1;
            const Ye = (qe - Ve.delayMs) / Ve.durationMs;
            return Ve.easing(Ye);
          };
          R = 0, P = "running", C = T.animate(
            0,
            1,
            zt,
            tt,
            ($e) => {
              h || P !== "running" || (R = on($e), R < 1 && Qe());
            },
            () => {
              h || (P = "done", R = 1, C = null);
            }
          );
        }
        T.update(performance.now());
      }
      M !== null && x && m.update(performance.now());
      const k = Ns(e, d);
      We == null || We.updateGridArea(k);
      const $ = (ne == null ? void 0 : ne.getRange()) ?? null, Q = M ? on(b) : 1, re = M ? $i(M.from.xBaseDomain, M.to.xBaseDomain, Q) : Sn(d, E), ae = M ? $i(M.from.yBaseDomain, M.to.yBaseDomain, Q) : kr(d, E, Y), xe = Fn(re, $), ie = Sf(k), Re = Ff(k), Fe = hn().domain(xe.min, xe.max).range(ie.left, ie.right), Se = hn().domain(ae.min, ae.max).range(ie.bottom, ie.top), Pe = e.canvas, De = df(Pe), Ee = De.width, It = De.height, tn = Ee > 0 ? Kr(ie.left, Ee) : 0, it = Ee > 0 ? Kr(ie.right, Ee) : 0, Gt = It > 0 ? As(ie.top, It) : 0, nn = It > 0 ? As(ie.bottom, It) : 0, bn = Math.max(0, it - tn), wi = Math.max(0, nn - Gt), fr = U ? d.annotations ?? [] : [], Et = Tc({
        annotations: fr,
        xScale: Fe,
        yScale: Se,
        plotBounds: {
          leftCss: tn,
          rightCss: it,
          topCss: Gt,
          bottomCss: nn,
          widthCss: bn,
          heightCss: wi
        },
        canvasCssWidth: Ee,
        canvasCssHeight: It,
        theme: d.theme
      }), Ci = Et.linesBelow.length + Et.linesAbove.length > 0 ? [...Et.linesBelow, ...Et.linesAbove] : [], Mi = Et.markersBelow.length + Et.markersAbove.length > 0 ? [...Et.markersBelow, ...Et.markersAbove] : [], Pn = Et.linesBelow.length, dr = Et.linesAbove.length, jn = Et.markersBelow.length, Si = Et.markersAbove.length, mr = ff(e.canvas), Kn = Math.abs(xe.max - xe.min);
      let Rn = jr, Jn = [];
      if (d.xAxis.type === "time") {
        const Ve = Rf({
          axisMin: ar(d.xAxis.min),
          axisMax: ar(d.xAxis.max),
          xScale: Fe,
          plotClipLeft: ie.left,
          plotClipRight: ie.right,
          canvasCssWidth: mr,
          visibleRangeMs: Kn,
          measureCtx: g,
          measureCache: c ?? void 0,
          fontSize: d.theme.fontSize,
          fontFamily: d.theme.fontFamily || "sans-serif"
        });
        Rn = Ve.tickCount, Jn = Ve.tickValues;
      } else {
        const Ve = yn(d.xAxis.min) ?? Fe.invert(ie.left), Ze = yn(d.xAxis.max) ?? Fe.invert(ie.right);
        Jn = Qi(Ve, Ze, Rn);
      }
      const Ke = bi(k, {
        xDomain: { min: xe.min, max: xe.max },
        yDomain: ae
      });
      Ut = Ke;
      const rn = M && Q < 1 ? y(M.from.series, M.to.series, Q, I) : G;
      if (nt.source === "mouse" && nt.hasPointer && nt.isInGrid && Ke) {
        const Ve = Ke.xScale.invert(nt.gridX);
        wt(Number.isFinite(Ve) ? Ve : null, "mouse");
      }
      let pt = nt;
      if (nt.source === "sync")
        if (Rt === null || !Ke)
          pt = { ...nt, hasPointer: false, isInGrid: false };
        else {
          const Ve = Ke.xScale.scale(Rt), Ze = Ke.plotHeightCss * 0.5, zt = Number.isFinite(Ve) && Number.isFinite(Ze) && Ve >= 0 && Ve <= Ke.plotWidthCss && Ze >= 0 && Ze <= Ke.plotHeightCss;
          pt = {
            source: "sync",
            gridX: Number.isFinite(Ve) ? Ve : 0,
            gridY: Number.isFinite(Ze) ? Ze : 0,
            // Crosshair/tooltip expect CANVAS-LOCAL CSS px.
            x: k.left + (Number.isFinite(Ve) ? Ve : 0),
            y: k.top + (Number.isFinite(Ze) ? Ze : 0),
            isInGrid: zt,
            hasPointer: zt
          };
        }
      if (Mc(
        { gridRenderer: Be, xAxisRenderer: Le, yAxisRenderer: st, crosshairRenderer: rt, highlightRenderer: ve },
        {
          currentOptions: d,
          xScale: Fe,
          yScale: Se,
          gridArea: k,
          xTickCount: Rn,
          hasCartesianSeries: U,
          effectivePointer: pt,
          interactionScales: Ke,
          seriesForRender: rn,
          withAlpha: Ts
        }
      ), pt.hasPointer && pt.isInGrid && ((ho = d.tooltip) == null ? void 0 : ho.show) !== false) {
        const Ve = e.canvas;
        if (Ke && Ve && On(Ve)) {
          const Ze = (yo = d.tooltip) == null ? void 0 : yo.formatter, zt = ((go = d.tooltip) == null ? void 0 : go.trigger) ?? "item", tt = Ve.offsetLeft + pt.x, $e = Ve.offsetTop + pt.y;
          if (pt.source === "sync") {
            const gt = ys(rn, pt.gridX, Ke.xScale);
            if (gt.length === 0)
              le();
            else if (zt === "axis") {
              const qe = gt.map((ot) => xn(ot.seriesIndex, ot.dataIndex, ot.point)), Ye = Ze ? Ze(qe) : _r(qe);
              Ye && (Ye !== q || tt !== se || $e !== te) ? (q = Ye, se = tt, te = $e, ee(tt, $e, Ye)) : Ye || le();
            } else {
              const qe = gt[0], Ye = xn(qe.seriesIndex, qe.dataIndex, qe.point), ot = Ze ? Ze(Ye) : ai(Ye);
              ot && (ot !== q || tt !== se || $e !== te) ? (q = ot, se = tt, te = $e, ee(tt, $e, ot)) : ot || le();
            }
          } else if (zt === "axis") {
            const gt = L(
              rn,
              pt.gridX,
              pt.gridY,
              Ke.plotWidthCss,
              Ke.plotHeightCss
            );
            if (gt) {
              const qe = {
                seriesName: gt.slice.name,
                seriesIndex: gt.seriesIndex,
                dataIndex: gt.dataIndex,
                value: [0, gt.slice.value],
                color: gt.slice.color
              }, Ye = Ze ? Ze([qe]) : ai(qe);
              Ye && (Ye !== q || tt !== se || $e !== te) ? (q = Ye, se = tt, te = $e, ee(tt, $e, Ye)) : Ye || le();
            } else {
              const qe = Z(
                rn,
                pt.gridX,
                pt.gridY,
                Ke
              ), Ye = ys(rn, pt.gridX, Ke.xScale);
              if (Ye.length === 0)
                if (qe) {
                  const ot = [qe.params], ut = Ze ? Ze(ot) : _r(ot);
                  if (ut) {
                    const xt = Gr(
                      qe.match,
                      Ke.xScale,
                      Ke.yScale,
                      k,
                      Ve
                    ), Yt = (xt == null ? void 0 : xt.x) ?? tt, vn = (xt == null ? void 0 : xt.y) ?? $e;
                    (ut !== q || Yt !== se || vn !== te) && (q = ut, se = Yt, te = vn, ee(Yt, vn, ut));
                  } else
                    le();
                } else
                  le();
              else {
                const ot = Ye.map((xt) => xn(xt.seriesIndex, xt.dataIndex, xt.point));
                qe && ot.push(qe.params);
                const ut = Ze ? Ze(ot) : _r(ot);
                if (ut) {
                  let xt = tt, Yt = $e;
                  if (qe) {
                    const vn = Gr(
                      qe.match,
                      Ke.xScale,
                      Ke.yScale,
                      k,
                      Ve
                    );
                    vn && (xt = vn.x, Yt = vn.y);
                  }
                  (ut !== q || xt !== se || Yt !== te) && (q = ut, se = xt, te = Yt, ee(xt, Yt, ut));
                } else
                  le();
              }
            }
          } else {
            const gt = L(
              rn,
              pt.gridX,
              pt.gridY,
              Ke.plotWidthCss,
              Ke.plotHeightCss
            );
            if (gt) {
              const qe = {
                seriesName: gt.slice.name,
                seriesIndex: gt.seriesIndex,
                dataIndex: gt.dataIndex,
                value: [0, gt.slice.value],
                color: gt.slice.color
              }, Ye = Ze ? Ze(qe) : ai(qe);
              Ye && (Ye !== q || tt !== se || $e !== te) ? (q = Ye, se = tt, te = $e, ee(tt, $e, Ye)) : Ye || le();
            } else {
              const qe = Z(
                rn,
                pt.gridX,
                pt.gridY,
                Ke
              );
              if (qe) {
                const ot = Ze ? Ze(qe.params) : ai(qe.params);
                if (ot) {
                  const ut = Gr(
                    qe.match,
                    Ke.xScale,
                    Ke.yScale,
                    k,
                    Ve
                  ), xt = (ut == null ? void 0 : ut.x) ?? tt, Yt = (ut == null ? void 0 : ut.y) ?? $e;
                  (ot !== q || xt !== se || Yt !== te) && (q = ot, se = xt, te = Yt, ee(xt, Yt, ot, qe.params));
                } else
                  le();
                return;
              }
              const Ye = rr(
                rn,
                pt.gridX,
                pt.gridY,
                Ke.xScale,
                Ke.yScale
              );
              if (!Ye)
                le();
              else {
                const ot = xn(Ye.seriesIndex, Ye.dataIndex, Ye.point), ut = Ze ? Ze(ot) : ai(ot);
                ut && (ut !== q || tt !== se || $e !== te) ? (q = ut, se = tt, te = $e, ee(tt, $e, ut)) : ut || le();
              }
            }
          }
        } else
          le();
      } else
        le();
      const Qn = Ke ?? (Pe && On(Pe) ? Zn(Pe, k) : null), pa = Qn && typeof Qn.plotWidthCss == "number" && typeof Qn.plotHeightCss == "number" ? 0.5 * Math.min(Qn.plotWidthCss, Qn.plotHeightCss) : 0, Fi = lt.getState(), lo = Ic(
        Fi,
        {
          currentOptions: d,
          seriesForRender: rn,
          xScale: Fe,
          yScale: Se,
          gridArea: k,
          dataStore: ye,
          appendedGpuThisFrame: ce,
          gpuSeriesKindByIndex: pe,
          zoomState: ne,
          visibleXDomain: xe,
          introPhase: P,
          introProgress01: R,
          withAlpha: Ts,
          maxRadiusCss: pa
        }
      ), { visibleBarSeriesConfigs: uo } = lo, fo = P === "running" ? on(R) : 1, ha = fo < 1 ? _f(Se, ie, uo, fo) : Se;
      Fi.barRenderer.prepare(uo, ye, Fe, ha, k), U ? (Te.prepare(k, Ci), He.prepare(k, Ci), Xe.prepare({
        canvasWidth: k.canvasWidth,
        canvasHeight: k.canvasHeight,
        devicePixelRatio: k.devicePixelRatio,
        instances: Mi
      }), ke.prepare({
        canvasWidth: k.canvasWidth,
        canvasHeight: k.canvasHeight,
        devicePixelRatio: k.devicePixelRatio,
        instances: Mi
      })) : (Te.prepare(k, []), He.prepare(k, []), Xe.prepare({
        canvasWidth: k.canvasWidth,
        canvasHeight: k.canvasHeight,
        devicePixelRatio: k.devicePixelRatio,
        instances: []
      }), ke.prepare({
        canvasWidth: k.canvasWidth,
        canvasHeight: k.canvasHeight,
        devicePixelRatio: k.devicePixelRatio,
        instances: []
      })), bt.ensureTextures(k.canvasWidth, k.canvasHeight);
      const ei = bt.getState(), mo = e.canvasContext.getCurrentTexture().createView(), ti = i.createCommandEncoder({ label: "renderCoordinator/commandEncoder" }), po = Ga(d.theme.backgroundColor, { r: 0, g: 0, b: 0, a: 1 });
      Pc(
        Fi,
        rn,
        ti
      );
      const pr = ti.beginRenderPass({
        label: "renderCoordinator/mainPass",
        colorAttachments: [
          {
            view: ei.mainColorView,
            // MSAA texture (4x)
            resolveTarget: ei.mainResolveView,
            // single-sample resolve target
            clearValue: po,
            loadOp: "clear",
            storeOp: "discard"
            // MSAA content discarded after resolve
          }
        ]
      });
      Be && Be.render(pr), Rc(
        Fi,
        { referenceLineRenderer: Te, annotationMarkerRenderer: Xe },
        {
          hasCartesianSeries: U,
          gridArea: k,
          mainPass: pr,
          plotScissor: Re,
          introPhase: P,
          introProgress01: R,
          referenceLineBelowCount: Pn,
          markerBelowCount: jn
        },
        lo
      ), pr.end();
      const ni = ti.beginRenderPass({
        label: "renderCoordinator/annotationOverlayMsaaPass",
        colorAttachments: [
          {
            view: ei.overlayMsaaView,
            resolveTarget: mo,
            clearValue: po,
            loadOp: "clear",
            storeOp: "discard"
          }
        ]
      });
      ni.setPipeline(ei.overlayBlitPipeline), ni.setBindGroup(0, ei.overlayBlitBindGroup), ni.draw(3), Dc(
        { referenceLineRendererMsaa: He, annotationMarkerRendererMsaa: ke },
        {
          hasCartesianSeries: U,
          gridArea: k,
          overlayPass: ni,
          plotScissor: Re,
          referenceLineBelowCount: Pn,
          referenceLineAboveCount: dr,
          markerBelowCount: jn,
          markerAboveCount: Si
        }
      ), ni.end();
      const ii = ti.beginRenderPass({
        label: "renderCoordinator/topOverlayPass",
        colorAttachments: [
          {
            view: mo,
            loadOp: "load",
            storeOp: "store"
          }
        ]
      });
      ve.render(ii), U && (Le.render(ii), st.render(ii)), rt.render(ii), ii.end(), i.queue.submit([ti.finish()]), v = true, Qa(a, s, {
        gpuContext: e,
        currentOptions: d,
        xScale: Fe,
        yScale: Se,
        xTickValues: Jn,
        plotClipRect: ie,
        visibleXRangeMs: Kn
      }), ic(u, s, {
        currentOptions: d,
        xScale: Fe,
        yScale: Se,
        canvasCssWidthForAnnotations: Ee,
        canvasCssHeightForAnnotations: It,
        plotLeftCss: tn,
        plotTopCss: Gt,
        plotWidthCss: bn,
        plotHeightCss: wi,
        canvas: Pe
      });
    },
    dispose: () => {
      if (!h) {
        h = true;
        try {
          C && T.cancel(C), T.cancelAll();
        } catch {
        }
        C = null, P = "done", R = 1;
        try {
          x && m.cancel(x), m.cancelAll();
        } catch {
        }
        x = null, b = 1, M = null, Xt(), cn(), _ = false, X.clear(), Ce == null || Ce.dispose(), Ce = null, de == null || de(), de = null, ne = null, he = null, Me.clear(), We == null || We.dispose(), rt.dispose(), ve.dispose(), lt.dispose(), Be.dispose(), Le.dispose(), st.dispose(), Te.dispose(), Xe.dispose(), He.dispose(), ke.dispose(), bt.dispose(), ye.dispose(), me == null || me.dispose(), me = null, l == null || l.dispose(), a == null || a.dispose(), u == null || u.dispose();
      }
    }
  };
}
var Ht = {
  left: 60,
  right: 20,
  top: 40,
  bottom: 40
};
var er = [
  "#5470C6",
  "#91CC75",
  "#FAC858",
  "#EE6666",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
  "#9A60B4",
  "#EA7CCC"
];
var Ps = {
  width: 2,
  opacity: 1
};
var Rs = {
  opacity: 0.25
};
var jt = {
  style: "classic",
  itemStyle: {
    upColor: "#22c55e",
    downColor: "#ef4444",
    upBorderColor: "#22c55e",
    downBorderColor: "#ef4444",
    borderWidth: 1
  },
  barWidth: "80%",
  barMinWidth: 1,
  barMaxWidth: 50,
  sampling: "ohlc",
  samplingThreshold: 5e3
};
var Yi = {
  mode: "points",
  // Bin size in CSS pixels for density mode. Must be > 0.
  binSize: 2,
  densityColormap: "viridis",
  densityNormalization: "log"
};
var Ds = {
  horizontal: {
    count: 5
  },
  vertical: {
    count: 6
  }
};
var Bt = {
  grid: Ht,
  xAxis: { type: "value" },
  yAxis: { type: "value", autoBounds: "visible" },
  autoScroll: false,
  theme: "dark",
  palette: er,
  series: []
};
var kf = [
  "#00E5FF",
  "#FF2D95",
  "#B026FF",
  "#00F5A0",
  "#FFD300",
  "#FF6B00",
  "#4D5BFF",
  "#FF3D3D"
];
var Gf = {
  backgroundColor: "#1a1a2e",
  textColor: "#e0e0e0",
  axisLineColor: "rgba(224,224,224,0.35)",
  axisTickColor: "rgba(224,224,224,0.55)",
  gridLineColor: "rgba(255,255,255,0.1)",
  colorPalette: [...kf],
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontSize: 12
};
var zf = [
  "#1F77B4",
  "#FF7F0E",
  "#2CA02C",
  "#D62728",
  "#9467BD",
  "#8C564B",
  "#E377C2",
  "#17BECF"
];
var Vf = {
  backgroundColor: "#ffffff",
  textColor: "#333333",
  axisLineColor: "rgba(0,0,0,0.35)",
  axisTickColor: "rgba(0,0,0,0.55)",
  gridLineColor: "rgba(0,0,0,0.1)",
  colorPalette: [...zf],
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontSize: 12
};
function zr(e) {
  return e === "dark" ? Gf : Vf;
}
var Wf = (e) => {
  if (!Array.isArray(e)) return;
  const t = [];
  for (const n of e) {
    if (n === null || typeof n != "object" || Array.isArray(n)) continue;
    const i = n, r = i.type;
    if (r !== "inside" && r !== "slider") continue;
    const o = i.xAxisIndex, s = i.start, a = i.end, u = i.minSpan, f = i.maxSpan, l = typeof o == "number" && Number.isFinite(o) ? o : void 0, g = typeof s == "number" && Number.isFinite(s) ? s : void 0, c = typeof a == "number" && Number.isFinite(a) ? a : void 0, h = typeof u == "number" && Number.isFinite(u) ? u : void 0, d = typeof f == "number" && Number.isFinite(f) ? f : void 0;
    t.push({ type: r, xAxisIndex: l, start: g, end: c, minSpan: h, maxSpan: d });
  }
  return t;
};
var Of = (e) => {
  if (!Array.isArray(e)) return;
  const t = [], n = (f) => f === "start" || f === "center" || f === "end", i = (f) => f === "circle" || f === "rect" || f === "triangle", r = (f) => {
    if (typeof f != "string") return;
    const l = f.trim();
    return l.length > 0 ? l : void 0;
  }, o = (f) => typeof f == "number" && Number.isFinite(f) ? f : void 0, s = (f) => {
    const l = o(f);
    if (l != null)
      return Math.min(1, Math.max(0, l));
  }, a = (f) => {
    if (!Array.isArray(f)) return;
    const l = f.filter((g) => typeof g == "number" && Number.isFinite(g)).map((g) => g);
    if (l.length !== 0)
      return Object.freeze(l), l;
  }, u = (f) => {
    if (typeof f == "number" && Number.isFinite(f)) return f;
    if (!Array.isArray(f) || f.length !== 4) return;
    const l = o(f[0]), g = o(f[1]), c = o(f[2]), h = o(f[3]);
    if (!(l == null || g == null || c == null || h == null))
      return [l, g, c, h];
  };
  for (const f of e) {
    if (f === null || typeof f != "object" || Array.isArray(f)) continue;
    const l = f, g = l.type;
    if (g !== "lineX" && g !== "lineY" && g !== "point" && g !== "text") continue;
    const c = r(l.id), h = l.layer, d = h === "belowSeries" || h === "aboveSeries" ? h : void 0, w = l.style, P = w && typeof w == "object" && !Array.isArray(w) ? (() => {
      const C = w, v = r(C.color), m = o(C.lineWidth), x = a(C.lineDash), b = s(C.opacity), M = {
        ...v ? { color: v } : {},
        ...m != null ? { lineWidth: m } : {},
        ...x ? { lineDash: x } : {},
        ...b != null ? { opacity: b } : {}
      };
      return Object.keys(M).length > 0 ? M : void 0;
    })() : void 0, R = l.label, T = R && typeof R == "object" && !Array.isArray(R) ? (() => {
      const C = R, v = r(C.text), m = r(C.template), x = C.decimals, b = typeof x == "number" && Number.isFinite(x) && x >= 0 ? Math.min(20, Math.floor(x)) : void 0, M = C.offset, I = Array.isArray(M) && M.length === 2 && typeof M[0] == "number" && Number.isFinite(M[0]) && typeof M[1] == "number" && Number.isFinite(M[1]) ? [M[0], M[1]] : void 0, A = C.anchor, S = n(A) ? A : void 0, p = C.background, y = p && typeof p == "object" && !Array.isArray(p) ? (() => {
        const N = p, D = r(N.color), B = s(N.opacity), E = u(N.padding), z = o(N.borderRadius), G = {
          ...D ? { color: D } : {},
          ...B != null ? { opacity: B } : {},
          ...E != null ? { padding: E } : {},
          ...z != null ? { borderRadius: z } : {}
        };
        return Object.keys(G).length > 0 ? G : void 0;
      })() : void 0, F = {
        ...v ? { text: v } : {},
        ...m ? { template: m } : {},
        ...b != null ? { decimals: b } : {},
        ...I ? { offset: I } : {},
        ...S ? { anchor: S } : {},
        ...y ? { background: y } : {}
      };
      return Object.keys(F).length > 0 ? F : void 0;
    })() : void 0;
    if (g === "lineX") {
      const C = o(l.x);
      if (C == null) continue;
      const v = { type: "lineX", x: C, ...c ? { id: c } : {}, ...d ? { layer: d } : {}, ...P ? { style: P } : {}, ...T ? { label: T } : {} };
      t.push(v);
      continue;
    }
    if (g === "lineY") {
      const C = o(l.y);
      if (C == null) continue;
      const v = { type: "lineY", y: C, ...c ? { id: c } : {}, ...d ? { layer: d } : {}, ...P ? { style: P } : {}, ...T ? { label: T } : {} };
      t.push(v);
      continue;
    }
    if (g === "point") {
      const C = o(l.x), v = o(l.y);
      if (C == null || v == null) continue;
      const m = l.marker, x = m && typeof m == "object" && !Array.isArray(m) ? (() => {
        const M = m, I = M.symbol, A = i(I) ? I : void 0, S = o(M.size), p = M.style, y = p && typeof p == "object" && !Array.isArray(p) ? (() => {
          const N = p, D = r(N.color), B = s(N.opacity), E = o(N.lineWidth), z = a(N.lineDash), G = {
            ...D ? { color: D } : {},
            ...B != null ? { opacity: B } : {},
            ...E != null ? { lineWidth: E } : {},
            ...z ? { lineDash: z } : {}
          };
          return Object.keys(G).length > 0 ? G : void 0;
        })() : void 0, F = {
          ...A ? { symbol: A } : {},
          ...S != null ? { size: S } : {},
          ...y ? { style: y } : {}
        };
        return Object.keys(F).length > 0 ? F : void 0;
      })() : void 0, b = {
        type: "point",
        x: C,
        y: v,
        ...x ? { marker: x } : {},
        ...c ? { id: c } : {},
        ...d ? { layer: d } : {},
        ...P ? { style: P } : {},
        ...T ? { label: T } : {}
      };
      t.push(b);
      continue;
    }
    {
      const C = l.position, v = r(l.text);
      if (!v || !C || typeof C != "object" || Array.isArray(C)) continue;
      const m = C, x = m.space;
      if (x !== "data" && x !== "plot") continue;
      const b = o(m.x), M = o(m.y);
      if (b == null || M == null) continue;
      const A = {
        type: "text",
        position: { space: x, x: b, y: M },
        text: v,
        ...c ? { id: c } : {},
        ...d ? { layer: d } : {},
        ...P ? { style: P } : {},
        ...T ? { label: T } : {}
      };
      t.push(A);
      continue;
    }
  }
  if (t.length !== 0)
    return Object.freeze(t), t;
};
var ci = (e) => Array.isArray(e) ? e.filter((t) => typeof t == "string").map((t) => t.trim()).filter((t) => t.length > 0) : [];
var Xf = (e) => {
  const t = zr("dark");
  if (typeof e == "string") {
    const a = e.trim().toLowerCase();
    return zr(a === "light" ? "light" : "dark");
  }
  if (e === null || typeof e != "object" || Array.isArray(e))
    return t;
  const n = e, i = (a) => {
    const u = n[a];
    if (typeof u != "string") return;
    const f = u.trim();
    return f.length > 0 ? f : void 0;
  }, r = n.fontSize, o = typeof r == "number" && Number.isFinite(r) ? r : void 0, s = ci(n.colorPalette);
  return {
    backgroundColor: i("backgroundColor") ?? t.backgroundColor,
    textColor: i("textColor") ?? t.textColor,
    axisLineColor: i("axisLineColor") ?? t.axisLineColor,
    axisTickColor: i("axisTickColor") ?? t.axisTickColor,
    gridLineColor: i("gridLineColor") ?? t.gridLineColor,
    colorPalette: s.length > 0 ? s : Array.from(t.colorPalette),
    fontFamily: i("fontFamily") ?? t.fontFamily,
    fontSize: o ?? t.fontSize
  };
};
var Kt = (e) => {
  if (typeof e != "string") return;
  const t = e.trim();
  return t.length > 0 ? t : void 0;
};
var $f = (e) => {
  if (typeof e != "string") return;
  const t = e.trim().toLowerCase();
  return t === "none" || t === "lttb" || t === "average" || t === "max" || t === "min" || t === "ohlc" ? t : void 0;
};
var Yf = (e) => {
  if (typeof e != "string") return;
  const t = e.trim().toLowerCase();
  return t === "points" || t === "density" ? t : void 0;
};
var Hf = (e) => {
  if (typeof e != "string") return;
  const t = e.trim().toLowerCase();
  return t === "linear" || t === "sqrt" || t === "log" ? t : void 0;
};
var qf = (e) => {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.floor(e);
  return t > 0 ? Math.max(1, t) : void 0;
};
var Zf = (e) => {
  if (typeof e == "string") {
    const i = e.trim().toLowerCase();
    return i === "viridis" || i === "plasma" || i === "inferno" ? i : void 0;
  }
  if (!Array.isArray(e)) return;
  if (e.length > 0 && e.every((i) => typeof i == "string" && i.length > 0 && i === i.trim())) {
    const i = e;
    return Object.isFrozen(i) || Object.freeze(i), i;
  }
  const n = e.filter((i) => typeof i == "string").map((i) => i.trim()).filter((i) => i.length > 0);
  if (n.length !== 0)
    return Object.freeze(n), n;
};
var jf = (e) => {
  if (typeof e != "string") return;
  const t = e.trim().toLowerCase();
  return t === "none" || t === "ohlc" ? t : void 0;
};
var Es = (e) => {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.floor(e);
  return t > 0 ? t : void 0;
};
var Bs = (e) => {
  if (typeof e != "string") return;
  const t = e.trim().toLowerCase();
  return t === "global" || t === "visible" ? t : void 0;
};
var Kf = (e) => Array.isArray(e);
var Jf = (e) => {
  if (e.length === 0) return;
  let t = Number.POSITIVE_INFINITY, n = Number.NEGATIVE_INFINITY, i = Number.POSITIVE_INFINITY, r = Number.NEGATIVE_INFINITY;
  if (Kf(e[0])) {
    const s = e;
    for (let a = 0; a < s.length; a++) {
      const u = s[a], f = u[0], l = u[3], g = u[4];
      if (!Number.isFinite(f) || !Number.isFinite(l) || !Number.isFinite(g)) continue;
      const c = Math.min(l, g), h = Math.max(l, g);
      f < t && (t = f), f > n && (n = f), c < i && (i = c), h > r && (r = h);
    }
  } else {
    const s = e;
    for (let a = 0; a < s.length; a++) {
      const u = s[a], f = u.timestamp, l = u.low, g = u.high;
      if (!Number.isFinite(f) || !Number.isFinite(l) || !Number.isFinite(g)) continue;
      const c = Math.min(l, g), h = Math.max(l, g);
      f < t && (t = f), f > n && (n = f), c < i && (i = c), h > r && (r = h);
    }
  }
  if (!(!Number.isFinite(t) || !Number.isFinite(n) || !Number.isFinite(i) || !Number.isFinite(r)))
    return t === n && (n = t + 1), i === r && (r = i + 1), { xMin: t, xMax: n, yMin: i, yMax: r };
};
var Qf = (e) => {
  throw new Error(
    `Unhandled series type: ${(e == null ? void 0 : e.type) ?? "unknown"}`
  );
};
var Ls = false;
var ed = () => {
  Ls || (console.warn(
    "ChartGPU: Candlestick series rendering is not yet implemented. Series will be skipped."
  ), Ls = true);
};
function ua(e = {}) {
  var C, v, m, x;
  const t = Xf(e.theme), n = e.autoScroll, i = typeof n == "boolean" ? n : Bt.autoScroll, r = e.animation, s = (typeof r == "boolean" || r !== null && typeof r == "object" && !Array.isArray(r) ? r : void 0) ?? true, a = ci(e.palette), u = a.length > 0 ? { ...t, colorPalette: a } : t, f = ci(u.colorPalette), l = f.length > 0 ? f : ci(Bt.palette ?? er).length > 0 ? ci(Bt.palette ?? er) : Array.from(er), g = l.length > 0 ? l : ["#000000"], c = { ...u, colorPalette: g.slice() }, h = {
    left: ((C = e.grid) == null ? void 0 : C.left) ?? Bt.grid.left,
    right: ((v = e.grid) == null ? void 0 : v.right) ?? Bt.grid.right,
    top: ((m = e.grid) == null ? void 0 : m.top) ?? Bt.grid.top,
    bottom: ((x = e.grid) == null ? void 0 : x.bottom) ?? Bt.grid.bottom
  }, w = ((b, M) => {
    const I = (b == null ? void 0 : b.show) !== false, A = Kt(b == null ? void 0 : b.color) ?? M.gridLineColor, S = typeof (b == null ? void 0 : b.opacity) == "number" && Number.isFinite(b.opacity) ? Math.min(1, Math.max(0, b.opacity)) : 1, p = (N, D) => {
      if (D === 1) return N;
      const B = ht(N);
      return B ? `rgba(${Math.round(B[0] * 255)}, ${Math.round(B[1] * 255)}, ${Math.round(B[2] * 255)}, ${B[3] * D})` : N;
    }, y = p(A, S), F = (N, D) => {
      if (N === false)
        return { show: false, count: 0, color: y };
      if (N === true || N === void 0)
        return { show: I, count: D, color: y };
      const B = N.show !== false && I, E = typeof N.count == "number" && Number.isFinite(N.count) && N.count >= 0 ? Math.floor(N.count) : D, z = Kt(N.color), G = z != null ? p(z, S) : y;
      return { show: B, count: E, color: G };
    };
    return {
      show: I,
      color: y,
      opacity: S,
      horizontal: F(b == null ? void 0 : b.horizontal, Ds.horizontal.count),
      vertical: F(b == null ? void 0 : b.vertical, Ds.vertical.count)
    };
  })(e.gridLines, c), P = e.xAxis ? {
    ...Bt.xAxis,
    ...e.xAxis,
    // runtime safety for JS callers
    type: e.xAxis.type ?? Bt.xAxis.type,
    autoBounds: Bs(e.xAxis.autoBounds) ?? Bt.xAxis.autoBounds
  } : { ...Bt.xAxis }, R = e.yAxis ? {
    ...Bt.yAxis,
    ...e.yAxis,
    // runtime safety for JS callers
    type: e.yAxis.type ?? Bt.yAxis.type,
    autoBounds: Bs(e.yAxis.autoBounds) ?? Bt.yAxis.autoBounds
  } : { ...Bt.yAxis }, T = (e.series ?? []).map((b, M) => {
    var N, D, B, E, z, G, Y, V, j, K;
    const I = Kt(b.color), A = c.colorPalette[M % c.colorPalette.length], S = I ?? A, p = b.visible !== false, y = $f(b.sampling) ?? "lttb", F = Es(b.samplingThreshold) ?? 5e3;
    switch (b.type) {
      case "area": {
        const oe = Kt((N = b.areaStyle) == null ? void 0 : N.color) ?? I ?? A, W = {
          opacity: ((D = b.areaStyle) == null ? void 0 : D.opacity) ?? Rs.opacity,
          color: oe
        }, fe = Vt(b.data) ?? void 0;
        return {
          ...b,
          visible: p,
          rawData: b.data,
          data: Gn(b.data, y, F),
          color: oe,
          areaStyle: W,
          sampling: y,
          samplingThreshold: F,
          rawBounds: fe
        };
      }
      case "line": {
        const oe = Kt((B = b.lineStyle) == null ? void 0 : B.color) ?? I ?? A, W = {
          width: ((E = b.lineStyle) == null ? void 0 : E.width) ?? Ps.width,
          opacity: ((z = b.lineStyle) == null ? void 0 : z.opacity) ?? Ps.opacity,
          color: oe
        }, { areaStyle: fe, ..._ } = b, H = Vt(b.data) ?? void 0, X = Gn(b.data, y, F);
        return {
          ..._,
          visible: p,
          rawData: b.data,
          data: X,
          color: oe,
          lineStyle: W,
          ...b.areaStyle ? {
            areaStyle: {
              opacity: b.areaStyle.opacity ?? Rs.opacity,
              // Fill color precedence: areaStyle.color → resolved stroke color
              color: Kt(b.areaStyle.color) ?? oe
            }
          } : {},
          sampling: y,
          samplingThreshold: F,
          rawBounds: H
        };
      }
      case "bar": {
        const J = Vt(b.data) ?? void 0;
        return {
          ...b,
          visible: p,
          rawData: b.data,
          data: Gn(b.data, y, F),
          color: S,
          sampling: y,
          samplingThreshold: F,
          rawBounds: J
        };
      }
      case "scatter": {
        const J = Vt(b.data) ?? void 0, oe = Yf(b.mode) ?? Yi.mode, W = qf(b.binSize) ?? Yi.binSize, fe = Zf(b.densityColormap) ?? Yi.densityColormap, _ = Hf(
          b.densityNormalization
        ) ?? Yi.densityNormalization;
        return {
          ...b,
          visible: p,
          rawData: b.data,
          data: Gn(b.data, y, F),
          color: S,
          mode: oe,
          binSize: W,
          densityColormap: fe,
          densityNormalization: _,
          sampling: y,
          samplingThreshold: F,
          rawBounds: J
        };
      }
      case "pie": {
        const { sampling: J, samplingThreshold: oe, ...W } = b, fe = (b.data ?? []).map((_, H) => {
          const X = Kt(_ == null ? void 0 : _.color), pe = c.colorPalette[(M + H) % c.colorPalette.length], ce = (_ == null ? void 0 : _.visible) !== false;
          return {
            ..._,
            color: X ?? pe,
            visible: ce
          };
        });
        return { ...W, visible: p, color: S, data: fe };
      }
      case "candlestick": {
        ed();
        const J = jf(b.sampling) ?? jt.sampling, oe = Es(b.samplingThreshold) ?? jt.samplingThreshold, W = {
          upColor: Kt((G = b.itemStyle) == null ? void 0 : G.upColor) ?? jt.itemStyle.upColor,
          downColor: Kt((Y = b.itemStyle) == null ? void 0 : Y.downColor) ?? jt.itemStyle.downColor,
          upBorderColor: Kt((V = b.itemStyle) == null ? void 0 : V.upBorderColor) ?? jt.itemStyle.upBorderColor,
          downBorderColor: Kt((j = b.itemStyle) == null ? void 0 : j.downBorderColor) ?? jt.itemStyle.downBorderColor,
          borderWidth: typeof ((K = b.itemStyle) == null ? void 0 : K.borderWidth) == "number" && Number.isFinite(b.itemStyle.borderWidth) ? b.itemStyle.borderWidth : jt.itemStyle.borderWidth
        }, fe = Jf(b.data), _ = J === "ohlc" && b.data.length > oe ? $r(b.data, oe) : b.data;
        return {
          ...b,
          visible: p,
          rawData: b.data,
          data: _,
          color: S,
          style: b.style ?? jt.style,
          itemStyle: W,
          barWidth: b.barWidth ?? jt.barWidth,
          barMinWidth: b.barMinWidth ?? jt.barMinWidth,
          barMaxWidth: b.barMaxWidth ?? jt.barMaxWidth,
          sampling: J,
          samplingThreshold: oe,
          rawBounds: fe
        };
      }
      default:
        return Qf(b);
    }
  });
  return {
    grid: h,
    gridLines: w,
    xAxis: P,
    yAxis: R,
    autoScroll: i,
    dataZoom: Wf(e.dataZoom),
    annotations: Of(e.annotations),
    animation: s,
    theme: c,
    palette: c.colorPalette,
    series: T,
    legend: e.legend
  };
}
var td = 32;
var nd = 8;
var id = td + nd;
var rd = (e) => {
  var t;
  return ((t = e.dataZoom) == null ? void 0 : t.some((n) => (n == null ? void 0 : n.type) === "slider")) ?? false;
};
function _s(e = {}) {
  const t = { ...ua(e), tooltip: e.tooltip };
  return rd(e) ? {
    ...t,
    grid: {
      ...t.grid,
      bottom: t.grid.bottom + id
    }
  } : t;
}
var Jr = (e, t, n) => Math.min(n, Math.max(t, e));
var od = (e) => {
  let { start: t, end: n } = e;
  if (t > n) {
    const i = t;
    t = n, n = i;
  }
  return { start: Jr(t, 0, 100), end: Jr(n, 0, 100) };
};
function sd(e, t, n) {
  const i = n == null ? void 0 : n.height, r = n == null ? void 0 : n.marginTop, o = (n == null ? void 0 : n.zIndex) ?? 4, s = (n == null ? void 0 : n.showPreview) ?? false, a = document.createElement("div");
  a.style.display = "block", a.style.width = "100%", a.style.height = `${i}px`, a.style.marginTop = `${r}px`, a.style.boxSizing = "border-box", a.style.position = "relative", a.style.zIndex = `${o}`, a.style.userSelect = "none", a.style.touchAction = "none";
  const u = document.createElement("div");
  u.style.position = "relative", u.style.height = "100%", u.style.width = "100%", u.style.boxSizing = "border-box", u.style.borderRadius = "8px", u.style.borderStyle = "solid", u.style.borderWidth = "1px", u.style.overflow = "hidden", a.appendChild(u);
  const f = document.createElement("div");
  f.style.position = "absolute", f.style.inset = "0", f.style.pointerEvents = "none", f.style.opacity = "0.4", f.style.display = s ? "block" : "none", u.appendChild(f);
  const l = document.createElement("div");
  l.style.position = "absolute", l.style.top = "0", l.style.bottom = "0", l.style.left = "0%", l.style.width = "100%", l.style.boxSizing = "border-box", l.style.cursor = "grab", u.appendChild(l);
  const g = document.createElement("div");
  g.style.position = "absolute", g.style.left = "0", g.style.top = "0", g.style.bottom = "0", g.style.width = "10px", g.style.cursor = "ew-resize", l.appendChild(g);
  const c = document.createElement("div");
  c.style.position = "absolute", c.style.right = "0", c.style.top = "0", c.style.bottom = "0", c.style.width = "10px", c.style.cursor = "ew-resize", l.appendChild(c);
  const h = document.createElement("div");
  h.style.position = "absolute", h.style.left = "10px", h.style.right = "10px", h.style.top = "0", h.style.bottom = "0", h.style.cursor = "grab", l.appendChild(h), e.appendChild(a);
  let d = false, w = null;
  const P = (p) => {
    const y = od(p), F = Jr(y.end - y.start, 0, 100);
    l.style.left = `${y.start}%`, l.style.width = `${F}%`;
  }, R = () => {
    const p = u.getBoundingClientRect().width;
    return Number.isFinite(p) && p > 0 ? p : null;
  }, T = (p) => {
    const y = R();
    if (y === null) return null;
    const F = p / y * 100;
    return Number.isFinite(F) ? F : null;
  }, C = (p, y) => {
    try {
      p.setPointerCapture(y);
    } catch {
    }
  }, v = (p, y) => {
    try {
      p.releasePointerCapture(y);
    } catch {
    }
  }, m = (p, y) => {
    if (d || p.button !== 0) return;
    p.preventDefault(), w == null || w(), w = null;
    const F = p.clientX, N = t.getRange(), D = p.currentTarget instanceof Element ? p.currentTarget : l;
    C(D, p.pointerId), y === "pan-window" && (l.style.cursor = "grabbing", h.style.cursor = "grabbing");
    const B = (Y) => {
      if (d || Y.pointerId !== p.pointerId) return;
      Y.preventDefault();
      const V = T(Y.clientX - F);
      if (V !== null)
        switch (y) {
          case "left-handle": {
            const j = Math.min(N.end, N.start + V), K = t;
            K.setRangeAnchored ? K.setRangeAnchored(j, N.end, "end") : t.setRange(j, N.end);
            return;
          }
          case "right-handle": {
            const j = Math.max(N.start, N.end + V), K = t;
            K.setRangeAnchored ? K.setRangeAnchored(N.start, j, "start") : t.setRange(N.start, j);
            return;
          }
          case "pan-window": {
            t.setRange(N.start + V, N.end + V);
            return;
          }
        }
    };
    let E = false;
    const z = () => {
      E || (E = true, window.removeEventListener("pointermove", B), window.removeEventListener("pointerup", G), window.removeEventListener("pointercancel", G), y === "pan-window" && (l.style.cursor = "grab", h.style.cursor = "grab"), v(D, p.pointerId), w === z && (w = null));
    }, G = (Y) => {
      Y.pointerId === p.pointerId && z();
    };
    w = z, window.addEventListener("pointermove", B, { passive: false }), window.addEventListener("pointerup", G, { passive: true }), window.addEventListener("pointercancel", G, { passive: true });
  }, x = (p) => m(p, "left-handle"), b = (p) => m(p, "right-handle"), M = (p) => m(p, "pan-window");
  g.addEventListener("pointerdown", x, { passive: false }), c.addEventListener("pointerdown", b, { passive: false }), h.addEventListener("pointerdown", M, { passive: false });
  const I = t.onChange((p) => {
    d || P(p);
  });
  return P(t.getRange()), { update: (p) => {
    if (d) return;
    u.style.background = p.backgroundColor, u.style.borderColor = p.axisLineColor, f.style.background = p.gridLineColor, l.style.background = p.gridLineColor, l.style.border = `1px solid ${p.axisTickColor}`, l.style.borderRadius = "8px", l.style.boxSizing = "border-box";
    const y = `1px solid ${p.axisLineColor}`;
    g.style.background = p.axisTickColor, g.style.borderRight = y, c.style.background = p.axisTickColor, c.style.borderLeft = y, h.style.background = "transparent", h.style.backgroundImage = "linear-gradient(90deg, rgba(255,255,255,0.0) 0, rgba(255,255,255,0.0) 42%, rgba(255,255,255,0.18) 42%, rgba(255,255,255,0.18) 46%, rgba(255,255,255,0.0) 46%, rgba(255,255,255,0.0) 54%, rgba(255,255,255,0.18) 54%, rgba(255,255,255,0.18) 58%, rgba(255,255,255,0.0) 58%, rgba(255,255,255,0.0) 100%)", h.style.mixBlendMode = "normal";
  }, dispose: () => {
    if (!d) {
      d = true, w == null || w(), w = null;
      try {
        I();
      } catch {
      }
      g.removeEventListener("pointerdown", x), c.removeEventListener("pointerdown", b), h.removeEventListener("pointerdown", M), a.remove();
    }
  } };
}
var Hi = null;
async function ad() {
  return Hi || (Hi = (async () => {
    if (typeof window > "u")
      return {
        supported: false,
        reason: "Not running in a browser environment (window is undefined)."
      };
    if (typeof navigator > "u")
      return {
        supported: false,
        reason: "Navigator is not available in this environment."
      };
    if (!navigator.gpu)
      return {
        supported: false,
        reason: "WebGPU API (navigator.gpu) is not available. Your browser does not support WebGPU."
      };
    try {
      let e = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      });
      return e || (e = await navigator.gpu.requestAdapter()), e ? { supported: true } : {
        supported: false,
        reason: "No compatible WebGPU adapter found. This may occur if: (1) no GPU is available, (2) GPU drivers are outdated or incompatible, (3) running in a VM or headless environment, or (4) WebGPU is disabled in browser settings."
      };
    } catch (e) {
      let t = "Failed to request WebGPU adapter.";
      return e instanceof DOMException ? (t = `Failed to request WebGPU adapter: ${e.name}`, e.message && (t += ` - ${e.message}`)) : e instanceof Error ? t = `Failed to request WebGPU adapter: ${e.message}` : t = `Failed to request WebGPU adapter: ${String(e)}`, { supported: false, reason: t };
    }
  })(), Hi);
}
var Jt = 120;
var cd = 1e3 / 60;
var ld = 1.5;
var ud = 6;
var fd = 500;
var dd = (e) => Array.isArray(e);
var $n = (e) => Array.isArray(e);
var Us = (e) => dd(e) ? { x: e[0], y: e[1] } : { x: e.x, y: e.y };
var md = (e) => {
  const t = Ie(e);
  if (t === 0) return { x: [], y: [] };
  const n = new Array(t), i = new Array(t), r = [];
  let o = false;
  for (let s = 0; s < t; s++) {
    n[s] = Ae(e, s), i[s] = Ue(e, s);
    const a = at(e, s);
    r[s] = a, a !== void 0 && (o = true);
  }
  return o ? { x: n, y: i, size: r } : { x: n, y: i };
};
var mi = (e) => $n(e) ? e[0] : e.timestamp;
var ks = (e) => $n(e) ? e[2] : e.close;
var pd = (e) => {
  var t;
  return ((t = e.dataZoom) == null ? void 0 : t.some((n) => (n == null ? void 0 : n.type) === "slider")) ?? false;
};
var Vr = (e, t, n) => Math.min(n, Math.max(t, e));
var hd = (e, t) => {
  const n = Ie(t);
  if (n === 0) return e;
  let i = e;
  if (!i)
    return Vt(t);
  let r = i.xMin, o = i.xMax, s = i.yMin, a = i.yMax;
  const u = typeof t == "object" && t !== null && !Array.isArray(t) && "x" in t && "y" in t, f = typeof t == "object" && t !== null && !Array.isArray(t) && ArrayBuffer.isView(t);
  if (u) {
    const l = t;
    for (let g = 0; g < n; g++) {
      const c = l.x[g], h = l.y[g];
      !Number.isFinite(c) || !Number.isFinite(h) || (c < r && (r = c), c > o && (o = c), h < s && (s = h), h > a && (a = h));
    }
  } else if (f) {
    const l = t;
    for (let g = 0; g < n; g++) {
      const c = l[g * 2], h = l[g * 2 + 1];
      !Number.isFinite(c) || !Number.isFinite(h) || (c < r && (r = c), c > o && (o = c), h < s && (s = h), h > a && (a = h));
    }
  } else
    for (let l = 0; l < n; l++) {
      const g = Ae(t, l), c = Ue(t, l);
      !Number.isFinite(g) || !Number.isFinite(c) || (g < r && (r = g), g > o && (o = g), c < s && (s = c), c > a && (a = c));
    }
  return r === o && (o = r + 1), s === a && (a = s + 1), { xMin: r, xMax: o, yMin: s, yMax: a };
};
var yd = (e, t) => {
  if (t.length === 0) return e;
  let n = (e == null ? void 0 : e.xMin) ?? Number.POSITIVE_INFINITY, i = (e == null ? void 0 : e.xMax) ?? Number.NEGATIVE_INFINITY, r = (e == null ? void 0 : e.yMin) ?? Number.POSITIVE_INFINITY, o = (e == null ? void 0 : e.yMax) ?? Number.NEGATIVE_INFINITY;
  for (let s = 0; s < t.length; s++) {
    const a = t[s], u = mi(a), f = $n(a) ? a[3] : a.low, l = $n(a) ? a[4] : a.high;
    !Number.isFinite(u) || !Number.isFinite(f) || !Number.isFinite(l) || (u < n && (n = u), u > i && (i = u), f < r && (r = f), l > o && (o = l));
  }
  return !Number.isFinite(n) || !Number.isFinite(i) || !Number.isFinite(r) || !Number.isFinite(o) ? e : (n === i && (i = n + 1), r === o && (o = r + 1), { xMin: n, xMax: i, yMin: r, yMax: o });
};
var Wr = (e, t) => {
  let n = Number.POSITIVE_INFINITY, i = Number.NEGATIVE_INFINITY, r = Number.POSITIVE_INFINITY, o = Number.NEGATIVE_INFINITY;
  for (let s = 0; s < e.length; s++) {
    const a = e[s];
    if (a.type === "pie") continue;
    const u = (t == null ? void 0 : t[s]) ?? null;
    if (u) {
      const g = u;
      if (Number.isFinite(g.xMin) && Number.isFinite(g.xMax) && Number.isFinite(g.yMin) && Number.isFinite(g.yMax)) {
        g.xMin < n && (n = g.xMin), g.xMax > i && (i = g.xMax), g.yMin < r && (r = g.yMin), g.yMax > o && (o = g.yMax);
        continue;
      }
    }
    const f = a.rawBounds ?? null;
    if (f) {
      const g = f;
      if (Number.isFinite(g.xMin) && Number.isFinite(g.xMax) && Number.isFinite(g.yMin) && Number.isFinite(g.yMax)) {
        g.xMin < n && (n = g.xMin), g.xMax > i && (i = g.xMax), g.yMin < r && (r = g.yMin), g.yMax > o && (o = g.yMax);
        continue;
      }
    }
    if (a.type === "candlestick") {
      const g = a.data;
      for (let c = 0; c < g.length; c++) {
        const h = g[c], d = mi(h), w = $n(h) ? h[3] : h.low, P = $n(h) ? h[4] : h.high;
        !Number.isFinite(d) || !Number.isFinite(w) || !Number.isFinite(P) || (d < n && (n = d), d > i && (i = d), w < r && (r = w), P > o && (o = P));
      }
      continue;
    }
    const l = Vt(a.data);
    l && (l.xMin < n && (n = l.xMin), l.xMax > i && (i = l.xMax), l.yMin < r && (r = l.yMin), l.yMax > o && (o = l.yMax));
  }
  return !Number.isFinite(n) || !Number.isFinite(i) || !Number.isFinite(r) || !Number.isFinite(o) ? { xMin: 0, xMax: 1, yMin: 0, yMax: 1 } : (n === i && (i = n + 1), r === o && (o = r + 1), { xMin: n, xMax: i, yMin: r, yMax: o });
};
var _n = (e, t) => {
  let n = e, i = t;
  if ((!Number.isFinite(n) || !Number.isFinite(i)) && (n = 0, i = 1), n === i)
    i = n + 1;
  else if (n > i) {
    const r = n;
    n = i, i = r;
  }
  return { min: n, max: i };
};
var pi = (e, t) => {
  if (typeof e == "number") return Number.isFinite(e) ? e : null;
  if (typeof e != "string") return null;
  const n = e.trim();
  if (n.length === 0) return null;
  if (n.endsWith("%")) {
    const r = Number.parseFloat(n.slice(0, -1));
    return Number.isFinite(r) ? r / 100 * t : null;
  }
  const i = Number.parseFloat(n);
  return Number.isFinite(i) ? i : null;
};
var Gs = (e, t, n) => {
  const i = (e == null ? void 0 : e[0]) ?? "50%", r = (e == null ? void 0 : e[1]) ?? "50%", o = pi(i, t), s = pi(r, n);
  return {
    x: Number.isFinite(o) ? o : t * 0.5,
    y: Number.isFinite(s) ? s : n * 0.5
  };
};
var gd = (e) => Array.isArray(e);
var zs = (e, t) => {
  if (e == null) return { inner: 0, outer: t * 0.7 };
  if (gd(e)) {
    const r = pi(e[0], t), o = pi(e[1], t), s = Math.max(0, Number.isFinite(r) ? r : 0), a = Math.max(s, Number.isFinite(o) ? o : t * 0.7);
    return { inner: s, outer: Math.min(t, a) };
  }
  const n = pi(e, t), i = Math.max(0, Number.isFinite(n) ? n : t * 0.7);
  return { inner: 0, outer: Math.min(t, i) };
};
async function xd(e, t, n) {
  var vi;
  if (n) {
    if (typeof navigator > "u" || !navigator.gpu)
      throw new Error("ChartGPU: Shared device mode requires WebGPU globals (navigator.gpu) to be available.");
  } else {
    const L = await ad();
    if (!L.supported) {
      const Z = L.reason || "Unknown reason";
      throw new Error(
        `ChartGPU: WebGPU is not available.
Reason: ${Z}
Browser support: Chrome/Edge 113+, Safari 18+, Firefox not yet supported.
Resources:
  - MDN WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
  - Browser compatibility: https://caniuse.com/webgpu
  - WebGPU specification: https://www.w3.org/TR/webgpu/
  - Check your system: https://webgpureport.org/`
      );
    }
  }
  if (n != null && n.pipelineCache && n.pipelineCache.device !== n.device)
    throw new Error(
      "ChartGPU: pipelineCache.device must match the GPUDevice in the creation context. Create the pipeline cache with the same device: createPipelineCache(device)."
    );
  const i = document.createElement("canvas");
  i.style.display = "block", i.style.width = "100%", i.style.height = "100%", e.appendChild(i);
  const r = !!n;
  let o = false, s = t.renderMode ?? "auto", a = false, u = false, f = null, l = null, g = null, c = null, h = null, d, w = false, P = null, R = null, T = t, C = _s(T), v = new Array(C.series.length).fill(null).map(() => ({ x: [], y: [] })), m = new Array(C.series.length).fill(null), x = null;
  const b = () => {
    v = new Array(C.series.length).fill(null).map(() => ({ x: [], y: [] })), m = new Array(C.series.length).fill(null), x = null;
    for (let L = 0; L < C.series.length; L++) {
      const Z = C.series[L];
      if (Z.type === "pie") {
        v[L] = { x: [], y: [] };
        continue;
      }
      if (Z.type === "candlestick") {
        const ue = Z.rawData ?? Z.data;
        v[L] = ue.length === 0 ? [] : ue.slice(), m[L] = Z.rawBounds ?? null;
      } else {
        const ue = Z.rawData ?? Z.data;
        v[L] = md(ue), m[L] = Z.rawBounds ?? null ?? Vt(ue);
      }
    }
  }, M = () => x || (x = C.series.map((L, Z) => {
    if (L.type === "pie") return L;
    if (L.type === "candlestick")
      return { ...L, data: v[Z] ?? L.data };
    const ue = v[Z];
    return { ...L, data: ue };
  }), x);
  b();
  let I = Wr(C.series, m), A = null;
  const S = {
    click: /* @__PURE__ */ new Set(),
    mouseover: /* @__PURE__ */ new Set(),
    mouseout: /* @__PURE__ */ new Set(),
    crosshairMove: /* @__PURE__ */ new Set(),
    zoomRangeChange: /* @__PURE__ */ new Set(),
    deviceLost: /* @__PURE__ */ new Set(),
    dataAppend: /* @__PURE__ */ new Set()
  };
  let p = false, y = null, F = null, N = null;
  const D = /* @__PURE__ */ new Set();
  let B = null, E = null, z = true;
  const G = new Float64Array(Jt);
  let Y = 0, V = 0, j = 0, K = 0, J = 0, oe = 0;
  const W = performance.now();
  let fe = 0, _ = 0;
  const H = /* @__PURE__ */ new Set(), X = () => S.mouseover.size > 0 || S.mouseout.size > 0, pe = () => S.click.size > 0, ce = () => {
    B !== null && (cancelAnimationFrame(B), B = null);
  }, me = () => {
    fe = 0, K = 0, J = 0, oe = 0, Y = 0, V = 0;
  }, q = (L) => {
    if (o || u || a) return;
    a = true;
    const Z = performance.now();
    try {
      if (G[Y] = Z, Y = (Y + 1) % Jt, V < Jt && V++, j++, L && (fe > 0 && (Z - fe > cd * ld ? (K++, J++, oe = Z) : J = 0), fe = Z), nt(false), !l || !(f != null && f.device)) return;
      if (z) {
        z = false;
        try {
          l.render();
        } catch {
          z = true;
        }
      }
      _ = performance.now() - Z;
      const ue = Ot();
      for (const we of H)
        try {
          we(ue);
        } catch (ne) {
          console.error("Error in performance update callback:", ne);
        }
    } finally {
      a = false;
    }
  }, se = () => {
    o || (z = true, s !== "external" && B === null && (B = requestAnimationFrame(() => {
      B = null, !o && q(true);
    })));
  }, te = () => {
    if (c)
      try {
        c();
      } finally {
        c = null;
      }
  }, ee = () => {
    if (h)
      try {
        h();
      } finally {
        h = null;
      }
  }, be = () => {
    R == null || R.dispose(), R = null;
  }, le = () => {
    P == null || P.remove(), P = null;
  }, ge = () => {
    be(), le();
  }, ye = 32, Be = 8, Le = ye + Be, st = () => {
    if (P) return P;
    try {
      window.getComputedStyle(e).position === "static" && (e.style.position = "relative");
    } catch {
    }
    const L = document.createElement("div");
    return L.style.position = "absolute", L.style.left = "0", L.style.right = "0", L.style.bottom = "0", L.style.height = `${Le}px`, L.style.paddingTop = `${Be}px`, L.style.boxSizing = "border-box", L.style.pointerEvents = "auto", L.style.zIndex = "5", e.appendChild(L), P = L, L;
  }, rt = (L, Z) => {
    const ue = L.end - L.start;
    return !Number.isFinite(ue) || ue === 0 ? 0.5 : Vr((Z - L.start) / ue, 0, 1);
  }, ve = () => ({ getRange: () => (l == null ? void 0 : l.getZoomRange()) ?? { start: 0, end: 100 }, setRange: (de, he) => {
    l == null || l.setZoomRange(de, he);
  }, zoomIn: (de, he) => {
    if (!Number.isFinite(de) || !Number.isFinite(he) || he <= 1) return;
    const Ne = l == null ? void 0 : l.getZoomRange();
    if (!Ne) return;
    const Me = Vr(de, 0, 100), et = rt(Ne, Me), _e = (Ne.end - Ne.start) / he, Oe = Me - et * _e;
    l == null || l.setZoomRange(Oe, Oe + _e);
  }, zoomOut: (de, he) => {
    if (!Number.isFinite(de) || !Number.isFinite(he) || he <= 1) return;
    const Ne = l == null ? void 0 : l.getZoomRange();
    if (!Ne) return;
    const Me = Vr(de, 0, 100), et = rt(Ne, Me), _e = (Ne.end - Ne.start) * he, Oe = Me - et * _e;
    l == null || l.setZoomRange(Oe, Oe + _e);
  }, pan: (de) => {
    if (!Number.isFinite(de)) return;
    const he = l == null ? void 0 : l.getZoomRange();
    he && (l == null || l.setZoomRange(he.start + de, he.end + de));
  }, onChange: (de) => (l == null ? void 0 : l.onZoomRangeChange(de)) ?? (() => {
  }) }), Te = () => {
    if (!pd(T)) {
      ge();
      return;
    }
    if (!l || !l.getZoomRange()) return;
    const Z = st();
    R || (R = sd(Z, ve(), {
      height: ye,
      marginTop: 0
      // host provides vertical spacing
    })), R.update(C.theme);
  }, Xe = { x: null, source: void 0 }, He = { start: 0, end: 100, source: void 0, sourceKind: void 0 }, ke = { seriesIndex: 0, count: 0, xExtent: { min: 0, max: 0 } }, bt = () => {
    te(), !o && l && (c = l.onInteractionXChange((L, Z) => {
      Xe.x = L, Xe.source = Z, Qe("crosshairMove", Xe);
    }));
  }, vt = () => {
    ee(), !o && l && (h = l.onZoomRangeChange((L, Z) => {
      const ue = w, we = d;
      w = false, d = void 0;
      const ne = we !== void 0 ? we : void 0, Ce = Z ?? (ue ? "api" : void 0);
      He.start = L.start, He.end = L.end, He.source = ne, He.sourceKind = Ce, Qe("zoomRangeChange", He);
    }));
  }, We = () => {
    if (o || !f || !f.initialized) return;
    const L = (l == null ? void 0 : l.getZoomRange()) ?? null;
    te(), ee(), be(), l == null || l.dispose(), w = false, d = void 0;
    const Z = {
      onRequestRender: se,
      pipelineCache: n == null ? void 0 : n.pipelineCache
    };
    l = Uf(f, C, Z), g = f.preferredFormat, bt(), vt(), L && l.setZoomRange(L.start, L.end), Te();
  }, nt = (L) => {
    var Nt;
    if (o) return;
    const Z = i.getBoundingClientRect(), ue = window.devicePixelRatio || 1, we = ((Nt = f == null ? void 0 : f.device) == null ? void 0 : Nt.limits.maxTextureDimension2D) ?? 8192, ne = Math.min(we, Math.max(1, Math.round(Z.width * ue))), Ce = Math.min(we, Math.max(1, Math.round(Z.height * ue))), de = i.width !== ne || i.height !== Ce;
    de && (i.width = ne, i.height = Ce);
    const he = f == null ? void 0 : f.device, Ne = f == null ? void 0 : f.canvasContext, Me = f == null ? void 0 : f.preferredFormat;
    let et = false;
    he && Ne && Me && (de || !E || E.width !== i.width || E.height !== i.height || E.format !== Me) && (Ne.configure({
      device: he,
      format: Me,
      alphaMode: "opaque"
    }), E = { width: i.width, height: i.height, format: Me }, et = true, l && g !== Me && We()), L && (de || et) && se();
  }, Rt = () => nt(true), Wt = (L) => {
    const Z = i.getBoundingClientRect();
    if (!(Z.width > 0) || !(Z.height > 0)) return { match: null, isInGrid: false };
    const ue = L.clientX - Z.left, we = L.clientY - Z.top, ne = C.grid.left, Ce = C.grid.top, de = Z.width - C.grid.left - C.grid.right, he = Z.height - C.grid.top - C.grid.bottom;
    if (!(de > 0) || !(he > 0)) return { match: null, isInGrid: false };
    const Ne = ue - ne, Me = we - Ce;
    if (!(Ne >= 0 && Ne <= de && Me >= 0 && Me <= he)) return { match: null, isInGrid: false };
    const Nt = C.xAxis.min ?? I.xMin, _e = C.xAxis.max ?? I.xMax, Oe = C.yAxis.min ?? I.yMin, ct = C.yAxis.max ?? I.yMax, Ct = _n(Nt, _e), en = (l == null ? void 0 : l.getZoomRange()) ?? null, Tt = (() => {
      if (!en) return Ct;
      const Ge = Ct.max - Ct.min;
      if (!Number.isFinite(Ge) || Ge === 0) return Ct;
      const ze = en.start, dt = en.end, yt = Ct.min + ze / 100 * Ge, St = Ct.min + dt / 100 * Ge;
      return _n(yt, St);
    })(), Mt = _n(Oe, ct);
    if (!(A !== null && A.rectWidthCss === Z.width && A.rectHeightCss === Z.height && A.plotWidthCss === de && A.plotHeightCss === he && A.xDomainMin === Tt.min && A.xDomainMax === Tt.max && A.yDomainMin === Mt.min && A.yDomainMax === Mt.max)) {
      const Ge = hn().domain(Tt.min, Tt.max).range(0, de), ze = hn().domain(Mt.min, Mt.max).range(he, 0);
      A = {
        rectWidthCss: Z.width,
        rectHeightCss: Z.height,
        plotWidthCss: de,
        plotHeightCss: he,
        xDomainMin: Tt.min,
        xDomainMax: Tt.max,
        yDomainMin: Mt.min,
        yDomainMax: Mt.max,
        xScale: Ge,
        yScale: ze
      };
    }
    const At = A, lt = (() => {
      const Ge = 0.5 * Math.min(de, he);
      if (!(Ge > 0)) return null;
      for (let ze = C.series.length - 1; ze >= 0; ze--) {
        const dt = C.series[ze];
        if (dt.type !== "pie" || dt.visible === false) continue;
        const yt = dt, St = Gs(yt.center, de, he), In = zs(yt.radius, Ge), $t = Zr(Ne, Me, { seriesIndex: ze, series: yt }, St, In);
        if (!$t) continue;
        const ln = $t.slice.value;
        return {
          kind: "pie",
          seriesIndex: $t.seriesIndex,
          dataIndex: $t.dataIndex,
          sliceValue: typeof ln == "number" && Number.isFinite(ln) ? ln : 0
        };
      }
      return null;
    })();
    if (lt) return { match: lt, isInGrid: true };
    for (let Ge = C.series.length - 1; Ge >= 0; Ge--) {
      const ze = C.series[Ge];
      if ((ze == null ? void 0 : ze.type) !== "candlestick" || ze.visible === false) continue;
      const dt = ze, yt = Hr(dt, dt.data, At.xScale, de), St = qr([dt], Ne, Me, At.xScale, At.yScale, yt);
      if (St)
        return {
          match: { kind: "candlestick", seriesIndex: Ge, dataIndex: St.dataIndex, point: St.point },
          isInGrid: true
        };
    }
    const Dt = rr(
      M(),
      Ne,
      Me,
      At.xScale,
      At.yScale
    );
    return {
      match: Dt ? { kind: "cartesian", match: Dt } : null,
      isInGrid: true
    };
  }, Ft = () => {
    if (V < 2)
      return 0;
    const L = (Y - V + Jt) % Jt;
    let Z = 0;
    for (let ne = 1; ne < V; ne++) {
      const Ce = (L + ne - 1) % Jt, de = (L + ne) % Jt, he = G[de] - G[Ce];
      Z += he;
    }
    const ue = Z / (V - 1);
    return ue > 0 ? 1e3 / ue : 0;
  }, Ut = () => {
    if (V < 2)
      return {
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    const L = (Y - V + Jt) % Jt, Z = new Array(V - 1);
    let ue = Number.POSITIVE_INFINITY, we = Number.NEGATIVE_INFINITY, ne = 0;
    for (let Me = 1; Me < V; Me++) {
      const et = (L + Me - 1) % Jt, Nt = (L + Me) % Jt, _e = G[Nt] - G[et];
      Z[Me - 1] = _e, _e < ue && (ue = _e), _e > we && (we = _e), ne += _e;
    }
    const Ce = ne / Z.length;
    Z.sort((Me, et) => Me - et);
    const de = Math.floor(Z.length * 0.5), he = Math.floor(Z.length * 0.95), Ne = Math.floor(Z.length * 0.99);
    return {
      min: ue,
      max: we,
      avg: Ce,
      p50: Z[de],
      p95: Z[he],
      p99: Z[Ne]
    };
  }, Ot = () => {
    const L = Ft(), Z = Ut(), ue = {
      enabled: false,
      // GPU timing not yet implemented for main thread
      cpuTime: _,
      gpuTime: 0
    }, we = {
      used: 0,
      peak: 0,
      allocated: 0
    }, ne = s === "external" ? { totalDrops: 0, consecutiveDrops: 0, lastDropTimestamp: 0 } : {
      totalDrops: K,
      consecutiveDrops: J,
      lastDropTimestamp: oe
    }, Ce = performance.now() - W;
    return {
      fps: L,
      frameTimeStats: Z,
      gpuTiming: ue,
      memory: we,
      frameDrops: ne,
      totalFrames: j,
      elapsedTime: Ce
    };
  }, wt = (L, Z) => {
    if (!L)
      return { seriesIndex: null, dataIndex: null, value: null, seriesName: null, event: Z };
    const ue = L.kind === "cartesian" ? L.match.seriesIndex : L.seriesIndex, we = L.kind === "cartesian" ? L.match.dataIndex : L.dataIndex, ne = C.series[ue], Ce = (ne == null ? void 0 : ne.name) ?? null, de = Ce && Ce.trim().length > 0 ? Ce : null;
    if (L.kind === "pie")
      return {
        seriesIndex: ue,
        dataIndex: we,
        value: [0, L.sliceValue],
        seriesName: de,
        event: Z
      };
    if (L.kind === "candlestick") {
      const Me = mi(L.point), et = ks(L.point);
      return {
        seriesIndex: ue,
        dataIndex: we,
        value: [Me, et],
        seriesName: de,
        event: Z
      };
    }
    const { x: he, y: Ne } = Us(L.match.point);
    return {
      seriesIndex: ue,
      dataIndex: we,
      value: [he, Ne],
      seriesName: de,
      event: Z
    };
  }, Qe = (L, Z) => {
    if (!o)
      for (const ue of S[L]) ue(Z);
  }, kt = (L, Z) => {
    const ue = N;
    if (N = L, ue === null && L === null) return;
    if (ue === null && L !== null) {
      Qe("mouseover", wt(L, Z));
      return;
    }
    if (ue !== null && L === null) {
      Qe("mouseout", wt(ue, Z));
      return;
    }
    if (ue === null || L === null) return;
    const we = ue.kind === "cartesian" ? ue.match.seriesIndex : ue.seriesIndex, ne = ue.kind === "cartesian" ? ue.match.dataIndex : ue.dataIndex, Ce = L.kind === "cartesian" ? L.match.seriesIndex : L.seriesIndex, de = L.kind === "cartesian" ? L.match.dataIndex : L.dataIndex;
    we === Ce && ne === de || (Qe("mouseout", wt(ue, Z)), Qe("mouseover", wt(L, Z)));
  }, Xt = (L) => {
    y && L.isPrimary && L.pointerId === y.pointerId && (y = null);
  }, cn = (L) => {
    if (o || !X()) return;
    const { match: Z, isInGrid: ue } = Wt(L);
    if (!ue) {
      kt(null, L);
      return;
    }
    kt(Z, L);
  }, gi = (L) => {
    o || !X() && !y || (Xt(L), kt(null, L));
  }, An = (L) => {
    o || !X() && !y || (Xt(L), kt(null, L));
  }, qn = (L) => {
    if (!o && !(!X() && !y && F !== L.pointerId)) {
      if (F === L.pointerId) {
        F = null;
        return;
      }
      Xt(L), kt(null, L);
    }
  }, xi = (L) => {
    if (!o && pe() && L.isPrimary && !(L.pointerType === "mouse" && L.button !== 0)) {
      y = {
        pointerId: L.pointerId,
        startClientX: L.clientX,
        startClientY: L.clientY,
        startTimeMs: L.timeStamp
      };
      try {
        i.setPointerCapture(L.pointerId);
      } catch {
      }
    }
  }, Zn = (L) => {
    if (o || !pe() || !L.isPrimary || !y || L.pointerId !== y.pointerId) return;
    const Z = L.timeStamp - y.startTimeMs, ue = L.clientX - y.startClientX, we = L.clientY - y.startClientY, ne = ue * ue + we * we;
    y = null;
    try {
      i.hasPointerCapture(L.pointerId) && (F = L.pointerId, i.releasePointerCapture(L.pointerId));
    } catch {
    }
    const Ce = ud;
    if (!(Z <= fd && ne <= Ce * Ce)) return;
    const { match: he } = Wt(L);
    Qe("click", wt(he, L));
  };
  i.addEventListener("pointermove", cn, { passive: true }), i.addEventListener("pointerleave", gi, { passive: true }), i.addEventListener("pointercancel", An, { passive: true }), i.addEventListener("lostpointercapture", qn, { passive: true }), i.addEventListener("pointerdown", xi, { passive: true }), i.addEventListener("pointerup", Zn, { passive: true });
  const bi = () => {
    if (!o) {
      o = true;
      try {
        ce(), ge(), te(), ee(), l == null || l.dispose(), l = null, g = null, f == null || f.destroy();
      } finally {
        y = null, F = null, N = null, A = null, w = false, d = void 0, i.removeEventListener("pointermove", cn), i.removeEventListener("pointerleave", gi), i.removeEventListener("pointercancel", An), i.removeEventListener("lostpointercapture", qn), i.removeEventListener("pointerdown", xi), i.removeEventListener("pointerup", Zn), S.click.clear(), S.mouseover.clear(), S.mouseout.clear(), S.crosshairMove.clear(), S.zoomRangeChange.clear(), S.deviceLost.clear(), S.dataAppend.clear(), p = false, f = null, i.remove();
      }
    }
  }, xn = {
    get options() {
      return T;
    },
    get disposed() {
      return o;
    },
    setOption(L) {
      o || (T = L, C = _s(L), l == null || l.setOptions(C), b(), I = Wr(C.series, m), A = null, Te(), se());
    },
    appendData(L, Z) {
      if (o || !Number.isFinite(L) || L < 0 || L >= C.series.length) return;
      const ue = C.series[L];
      if (ue.type === "pie") {
        D.has(L) || (D.add(L), console.warn(
          `ChartGPU.appendData(${L}, ...): pie series are not supported by streaming append. Use setOption(...) to replace pie data.`
        ));
        return;
      }
      let we = 0;
      if (ue.type === "candlestick") {
        if (!Array.isArray(Z)) return;
        we = Z.length;
      } else
        we = Ie(Z);
      if (we === 0) return;
      l == null || l.appendData(L, Z);
      let ne = Number.POSITIVE_INFINITY, Ce = Number.NEGATIVE_INFINITY;
      if (ue.type === "candlestick") {
        const de = v[L], he = Array.isArray(de) ? de : [], Ne = Z;
        if (p)
          for (let Me = 0; Me < we; Me++) {
            const et = mi(Ne[Me]);
            Number.isFinite(et) && (et < ne && (ne = et), et > Ce && (Ce = et));
          }
        he.push(...Ne), v[L] = he, m[L] = yd(
          m[L],
          Ne
        );
      } else {
        const de = v[L], he = Z, Ne = typeof he == "object" && he !== null && !Array.isArray(he) && "x" in he && "y" in he, Me = typeof he == "object" && he !== null && !Array.isArray(he) && ArrayBuffer.isView(he);
        let et = false;
        const Nt = new Array(we);
        if (Ne) {
          const _e = he;
          for (let Oe = 0; Oe < we; Oe++) {
            const ct = _e.x[Oe];
            de.x.push(ct), de.y.push(_e.y[Oe]), p && Number.isFinite(ct) && (ct < ne && (ne = ct), ct > Ce && (Ce = ct));
          }
          if (_e.size) {
            et = true;
            for (let Oe = 0; Oe < we; Oe++)
              Nt[Oe] = _e.size[Oe];
          }
        } else if (Me) {
          const _e = he;
          for (let Oe = 0; Oe < we; Oe++) {
            const ct = _e[Oe * 2];
            de.x.push(ct), de.y.push(_e[Oe * 2 + 1]), p && Number.isFinite(ct) && (ct < ne && (ne = ct), ct > Ce && (Ce = ct));
          }
        } else
          for (let _e = 0; _e < we; _e++) {
            const Oe = Ae(he, _e);
            de.x.push(Oe), de.y.push(Ue(he, _e));
            const ct = at(he, _e);
            Nt[_e] = ct, ct !== void 0 && (et = true), p && Number.isFinite(Oe) && (Oe < ne && (ne = Oe), Oe > Ce && (Ce = Oe));
          }
        (de.size || et) && (de.size || (de.size = new Array(de.x.length - we)), de.size.push(...Nt)), m[L] = hd(
          m[L],
          he
        );
      }
      I = Wr(C.series, m), x = null, A = null, se(), p && ((!Number.isFinite(ne) || !Number.isFinite(Ce)) && (ne = 0, Ce = 0), ke.seriesIndex = L, ke.count = we, ke.xExtent.min = ne, ke.xExtent.max = Ce, Qe("dataAppend", ke));
    },
    renderFrame() {
      if (o || u) return false;
      if (s === "auto")
        return console.warn('renderFrame() called in auto mode - this is a no-op. Set renderMode to "external" to use manual rendering.'), false;
      if (a || !l || !(f != null && f.device) || !z) return false;
      try {
        return q(false), true;
      } catch {
        return false;
      }
    },
    needsRender: () => o ? false : z,
    getRenderMode: () => s,
    setRenderMode(L) {
      if (!o) {
        if (L !== "auto" && L !== "external") {
          console.warn(`setRenderMode(): invalid mode '${String(L)}', ignoring.`);
          return;
        }
        s !== L && (me(), s = L, L === "external" ? ce() : z && se());
      }
    },
    resize: Rt,
    dispose: bi,
    on(L, Z) {
      o || (S[L].add(Z), L === "dataAppend" && (p = true));
    },
    off(L, Z) {
      S[L].delete(Z), L === "dataAppend" && (p = S.dataAppend.size > 0);
    },
    getInteractionX() {
      return o ? null : (l == null ? void 0 : l.getInteractionX()) ?? null;
    },
    setInteractionX(L, Z) {
      o || l == null || l.setInteractionX(L, Z);
    },
    setCrosshairX(L, Z) {
      o || l == null || l.setInteractionX(L, Z);
    },
    onInteractionXChange(L) {
      return o ? () => {
      } : (l == null ? void 0 : l.onInteractionXChange(L)) ?? (() => {
      });
    },
    getZoomRange() {
      return o ? null : (l == null ? void 0 : l.getZoomRange()) ?? null;
    },
    setZoomRange(L, Z, ue) {
      if (o || !l) return;
      const we = l.getZoomRange();
      if (!we) return;
      w = true, d = ue, l.setZoomRange(L, Z);
      const ne = l.getZoomRange();
      (!ne || ne.start === we.start && ne.end === we.end) && (w = false, d = void 0);
    },
    getPerformanceMetrics() {
      return o ? null : Ot();
    },
    getPerformanceCapabilities() {
      return o ? null : {
        gpuTimingSupported: false,
        // Not yet implemented for main thread
        highResTimerSupported: typeof performance < "u" && typeof performance.now == "function",
        performanceMetricsSupported: true
      };
    },
    onPerformanceUpdate(L) {
      return o ? () => {
      } : (H.add(L), () => {
        H.delete(L);
      });
    },
    hitTest(L) {
      const Z = i.getBoundingClientRect(), ue = L.clientX - Z.left, we = L.clientY - Z.top;
      if (o || !(Z.width > 0) || !(Z.height > 0))
        return {
          isInGrid: false,
          canvasX: ue,
          canvasY: we,
          gridX: 0,
          gridY: 0,
          match: null
        };
      const ne = C.grid.left, Ce = C.grid.top, de = Z.width - C.grid.left - C.grid.right, he = Z.height - C.grid.top - C.grid.bottom, Ne = ue - ne, Me = we - Ce;
      if (!(de > 0) || !(he > 0))
        return {
          isInGrid: false,
          canvasX: ue,
          canvasY: we,
          gridX: Ne,
          gridY: Me,
          match: null
        };
      if (!(Ne >= 0 && Ne <= de && Me >= 0 && Me <= he))
        return {
          isInGrid: false,
          canvasX: ue,
          canvasY: we,
          gridX: Ne,
          gridY: Me,
          match: null
        };
      const Nt = C.xAxis.min ?? I.xMin, _e = C.xAxis.max ?? I.xMax, Oe = C.yAxis.min ?? I.yMin, ct = C.yAxis.max ?? I.yMax, Ct = _n(Nt, _e), en = (l == null ? void 0 : l.getZoomRange()) ?? null, Tt = (() => {
        if (!en) return Ct;
        const Ge = Ct.max - Ct.min;
        if (!Number.isFinite(Ge) || Ge === 0) return Ct;
        const ze = en.start, dt = en.end, yt = Ct.min + ze / 100 * Ge, St = Ct.min + dt / 100 * Ge;
        return _n(yt, St);
      })(), Mt = _n(Oe, ct);
      if (!(A !== null && A.rectWidthCss === Z.width && A.rectHeightCss === Z.height && A.plotWidthCss === de && A.plotHeightCss === he && A.xDomainMin === Tt.min && A.xDomainMax === Tt.max && A.yDomainMin === Mt.min && A.yDomainMax === Mt.max)) {
        const Ge = hn().domain(Tt.min, Tt.max).range(0, de), ze = hn().domain(Mt.min, Mt.max).range(he, 0);
        A = {
          rectWidthCss: Z.width,
          rectHeightCss: Z.height,
          plotWidthCss: de,
          plotHeightCss: he,
          xDomainMin: Tt.min,
          xDomainMax: Tt.max,
          yDomainMin: Mt.min,
          yDomainMax: Mt.max,
          xScale: Ge,
          yScale: ze
        };
      }
      const At = A, lt = (() => {
        const Ge = 0.5 * Math.min(de, he);
        if (!(Ge > 0)) return null;
        for (let ze = C.series.length - 1; ze >= 0; ze--) {
          const dt = C.series[ze];
          if (dt.type !== "pie" || dt.visible === false) continue;
          const yt = dt, St = Gs(yt.center, de, he), In = zs(yt.radius, Ge), $t = Zr(Ne, Me, { seriesIndex: ze, series: yt }, St, In);
          if (!$t) continue;
          const ln = $t.slice.value;
          return {
            kind: "pie",
            seriesIndex: $t.seriesIndex,
            dataIndex: $t.dataIndex,
            sliceValue: typeof ln == "number" && Number.isFinite(ln) ? ln : 0
          };
        }
        return null;
      })();
      if (lt)
        return {
          isInGrid: true,
          canvasX: ue,
          canvasY: we,
          gridX: Ne,
          gridY: Me,
          match: {
            kind: "pie",
            seriesIndex: lt.seriesIndex,
            dataIndex: lt.dataIndex,
            value: [0, lt.sliceValue]
          }
        };
      for (let Ge = C.series.length - 1; Ge >= 0; Ge--) {
        const ze = C.series[Ge];
        if ((ze == null ? void 0 : ze.type) !== "candlestick" || ze.visible === false) continue;
        const dt = ze, yt = Hr(dt, dt.data, At.xScale, de), St = qr([dt], Ne, Me, At.xScale, At.yScale, yt);
        if (!St) continue;
        const In = mi(St.point), $t = ks(St.point);
        return {
          isInGrid: true,
          canvasX: ue,
          canvasY: we,
          gridX: Ne,
          gridY: Me,
          match: {
            kind: "candlestick",
            seriesIndex: Ge,
            dataIndex: St.dataIndex,
            value: [In, $t]
          }
        };
      }
      const Dt = rr(
        M(),
        Ne,
        Me,
        At.xScale,
        At.yScale
      );
      if (Dt) {
        const { x: Ge, y: ze } = Us(Dt.point);
        return {
          isInGrid: true,
          canvasX: ue,
          canvasY: we,
          gridX: Ne,
          gridY: Me,
          match: {
            kind: "cartesian",
            seriesIndex: Dt.seriesIndex,
            dataIndex: Dt.dataIndex,
            value: [Ge, ze]
          }
        };
      }
      return {
        isInGrid: true,
        canvasX: ue,
        canvasY: we,
        gridX: Ne,
        gridY: Me,
        match: null
      };
    }
  };
  try {
    nt(false);
    try {
      const L = n ? { device: n.device, adapter: n.adapter } : void 0;
      f = await to.create(i, L);
    } catch (L) {
      const Z = L instanceof Error ? L.message : String(L);
      throw new Error(
        `ChartGPU: WebGPU is not available.
Reason: ${Z}
Browser support: Chrome/Edge 113+, Safari 18+, Firefox not yet supported.
Resources:
  - MDN WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
  - Browser compatibility: https://caniuse.com/webgpu
  - WebGPU specification: https://www.w3.org/TR/webgpu/
  - Check your system: https://webgpureport.org/`
      );
    }
    return (vi = f.device) == null || vi.lost.then((L) => {
      u = true, !o && (L.reason !== "destroyed" && console.warn("WebGPU device lost:", L), r && L.reason !== "destroyed" && Qe("deviceLost", { reason: L.reason, message: L.message }), bi());
    }), nt(false), We(), Te(), s === "auto" && se(), xn;
  } catch (L) {
    throw xn.dispose(), L;
  }
}
var Td = 1e3 / 60;

// src/index.js
async function render({ model, el: el2 }) {
  const container = document.createElement("div");
  container.style.width = `${model.get("width")}px`;
  container.style.height = `${model.get("height")}px`;
  container.style.position = "relative";
  el2.appendChild(container);
  if (!navigator.gpu) {
    container.innerHTML = `
            <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                <strong>\u26A0\uFE0F WebGPU Not Available</strong><br>
                ChartGPU requires WebGPU support. Please use Chrome 113+, Edge 113+, or Safari 18+.
            </div>
        `;
    model.set("gpu_available", false);
    model.save_changes();
    return;
  }
  model.set("gpu_available", true);
  model.save_changes();
  let chart = null;
  function formatSeriesData(seriesData) {
    const vis = model.get("series_visibility") || [];
    return seriesData.map((series, i) => {
      const formattedSeries = {
        type: series.type || "line",
        data: series.data
      };
      if (series.name) formattedSeries.name = series.name;
      if (series.color) formattedSeries.color = series.color;
      if (vis[i] === false) formattedSeries.visible = false;
      return formattedSeries;
    });
  }
  function buildChartConfig() {
    const config = {
      series: formatSeriesData(model.get("series_data"))
    };
    const title = model.get("title");
    const xLabel = model.get("x_label");
    const yLabel = model.get("y_label");
    if (title) {
      config.title = { text: title };
    }
    const theme = model.get("theme");
    if (theme) {
      config.theme = theme;
    }
    if (model.get("zoom_enabled")) {
      config.dataZoom = [{ type: "inside" }];
    }
    if (model.get("tooltips_enabled")) {
      config.tooltip = { enabled: true };
    }
    if (model.get("crosshair_enabled")) {
      config.crosshair = { enabled: true };
    }
    if (model.get("show_fps")) {
      config.performance = {
        monitor: true,
        position: "top-right"
      };
    }
    const customOptions = model.get("chart_options");
    if (customOptions) {
      Object.assign(config, customOptions);
    }
    return config;
  }
  async function createOrUpdateChart() {
    const config = buildChartConfig();
    if (!chart) {
      try {
        console.log("Creating ChartGPU chart with config:", config);
        chart = await xd(container, config);
        console.log("ChartGPU chart created successfully:", chart);
        console.log("Chart created, skipping event handlers (ChartGPU uses different event API)");
      } catch (error) {
        console.error("Failed to create ChartGPU chart:", error);
        container.innerHTML = `
                    <div style="padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                        <strong>Error Creating Chart</strong><br>
                        ${error.message}<br>
                        <small>Check browser console for details</small>
                    </div>
                `;
      }
    } else {
      try {
        if (chart && typeof chart.setOption === "function") {
          chart.setOption(config);
        } else {
          console.warn("Chart does not support setOption, recreating...");
          if (chart && typeof chart.destroy === "function") {
            chart.destroy();
          }
          chart = null;
          createOrUpdateChart();
        }
      } catch (error) {
        console.error("Failed to update chart:", error);
      }
    }
  }
  if (model.get("series_data") && model.get("series_data").length > 0) {
    createOrUpdateChart();
  }
  model.on("change:series_data", () => {
    createOrUpdateChart();
  });
  model.on("change:series_visibility", () => {
    createOrUpdateChart();
  });
  model.on("change:chart_options", () => {
    const options = model.get("chart_options");
    if (options && options.resetZoom && chart && typeof chart.resetZoom === "function") {
      chart.resetZoom();
      const newOptions = { ...options };
      delete newOptions.resetZoom;
      model.set("chart_options", newOptions);
      model.save_changes();
    } else {
      createOrUpdateChart();
    }
  });
  model.on("change:theme", () => {
    createOrUpdateChart();
  });
  model.on("change:title change:x_label change:y_label", () => {
    createOrUpdateChart();
  });
  model.on("change:width change:height", () => {
    container.style.width = `${model.get("width")}px`;
    container.style.height = `${model.get("height")}px`;
    if (chart && typeof chart.resize === "function") {
      chart.resize();
    }
  });
  model.on("change:zoom_enabled change:tooltips_enabled change:crosshair_enabled change:show_fps", () => {
    createOrUpdateChart();
  });
  model.on("msg:custom", (msg) => {
    if (msg.type === "export" && chart && typeof chart.export === "function") {
      chart.export(msg.format || "png");
    }
  });
  return () => {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }
  };
}
var index_default = { render };
export {
  index_default as default
};
