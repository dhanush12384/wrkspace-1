/* eslint-disable no-console */
(function attachStudentForgeMonitor(globalScope) {
  const state = {
    initialized: false,
    config: null,
    queue: [],
    inFlight: false,
    timerId: null,
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function endpoint(path) {
    return `${state.config.baseUrl.replace(/\/+$/, "")}${path}`;
  }

  function postJson(url, body, extraHeaders) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  }

  function enqueue(payload) {
    state.queue.push(payload);
    flushQueue();
  }

  async function flushQueue() {
    if (state.inFlight || !state.queue.length || !state.config) return;
    state.inFlight = true;
    const item = state.queue.shift();
    try {
      const res = await postJson(
        endpoint("/api/metrics/ingest"),
        item,
        { "x-metrics-ingest-key": state.config.metricsIngestKey }
      );
      if (!res.ok && (res.status >= 500 || res.status === 429)) {
        state.queue.unshift(item);
      }
    } catch (_err) {
      state.queue.unshift(item);
    } finally {
      state.inFlight = false;
      if (state.queue.length) {
        setTimeout(flushQueue, 1200);
      }
    }
  }

  function detectStatus(responseMs) {
    if (responseMs > 3500) return "critical";
    if (responseMs > 1800) return "warning";
    return "ok";
  }

  function pushResourceMetric(metric) {
    enqueue({
      client_id: state.config.clientId,
      property_id: state.config.propertyId || null,
      source: "browser_sdk",
      status: metric.status || "ok",
      cpu_pct: null,
      memory_pct: null,
      disk_pct: null,
      bandwidth_in_mb: null,
      bandwidth_out_mb: null,
      captured_at: nowIso(),
      heartbeat_check_name: "browser-page",
      expected_interval_sec: state.config.heartbeatIntervalSec || 300,
      heartbeat_meta: {
        page: location.pathname,
        href: location.href,
        ...metric.heartbeat_meta,
      },
    });
  }

  function collectNavigationTiming() {
    const navEntries = performance.getEntriesByType("navigation");
    const nav = navEntries && navEntries[0];
    if (!nav) return;
    pushResourceMetric({
      status: detectStatus(nav.responseEnd),
      heartbeat_meta: {
        dns_ms: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp_ms: Math.round(nav.connectEnd - nav.connectStart),
        ttfb_ms: Math.round(nav.responseStart - nav.requestStart),
        dom_content_loaded_ms: Math.round(
          nav.domContentLoadedEventEnd - nav.startTime
        ),
        page_load_ms: Math.round(nav.loadEventEnd - nav.startTime),
      },
    });
  }

  function collectMemoryHint() {
    const perf = performance;
    const memory = perf && perf.memory ? perf.memory : null;
    if (!memory) return;
    const usedPct =
      memory.jsHeapSizeLimit > 0
        ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        : null;
    pushResourceMetric({
      status: usedPct !== null && usedPct > 85 ? "warning" : "ok",
      heartbeat_meta: {
        js_heap_used_bytes: memory.usedJSHeapSize,
        js_heap_total_bytes: memory.totalJSHeapSize,
        js_heap_limit_bytes: memory.jsHeapSizeLimit,
      },
      memory_pct: usedPct,
    });
  }

  function wireErrors() {
    if (!state.config.crashIngestKey) return;
    globalScope.addEventListener("error", function onError(event) {
      postJson(
        endpoint("/api/crash/ingest"),
        {
          client_id: state.config.clientId,
          property_id: state.config.propertyId || null,
          source: "browser_sdk",
          app_version: state.config.appVersion || "web-unknown",
          os: navigator.platform || "web",
          device_model: navigator.userAgent || "browser",
          event_type: "js_error",
          fingerprint: `${event.filename || "script"}:${event.lineno || 0}`,
          stack_trace: event.error && event.error.stack ? String(event.error.stack) : null,
          message: event.message || "Unhandled JS error",
          severity: "error",
          occurred_at: nowIso(),
        },
        { "x-crash-ingest-key": state.config.crashIngestKey }
      ).catch(function ignore() {});
    });

    globalScope.addEventListener("unhandledrejection", function onReject(event) {
      postJson(
        endpoint("/api/crash/ingest"),
        {
          client_id: state.config.clientId,
          property_id: state.config.propertyId || null,
          source: "browser_sdk",
          app_version: state.config.appVersion || "web-unknown",
          os: navigator.platform || "web",
          device_model: navigator.userAgent || "browser",
          event_type: "promise_rejection",
          fingerprint: "unhandledrejection",
          stack_trace: null,
          message: String(event.reason || "Unhandled promise rejection"),
          severity: "error",
          occurred_at: nowIso(),
        },
        { "x-crash-ingest-key": state.config.crashIngestKey }
      ).catch(function ignore() {});
    });
  }

  function startHeartbeat() {
    if (state.timerId) clearInterval(state.timerId);
    const everyMs = Math.max(
      Number(state.config.heartbeatIntervalSec || 300) * 1000,
      30000
    );
    state.timerId = setInterval(function pushHeartbeat() {
      pushResourceMetric({
        status: "ok",
        heartbeat_meta: {
          kind: "periodic-heartbeat",
          online: navigator.onLine,
        },
      });
    }, everyMs);
  }

  function init(config) {
    if (state.initialized) return;
    if (!config || !config.baseUrl || !config.clientId || !config.metricsIngestKey) {
      throw new Error("Missing required monitor config");
    }
    state.config = config;
    state.initialized = true;

    collectNavigationTiming();
    collectMemoryHint();
    wireErrors();
    startHeartbeat();
    flushQueue();

    if (config.debug) {
      console.info("[StudentForgeMonitor] initialized");
    }
  }

  function trackCustomMetric(name, value, metadata) {
    if (!state.initialized) return;
    pushResourceMetric({
      status: "ok",
      heartbeat_meta: {
        kind: "custom",
        metric_name: name,
        metric_value: value,
        ...metadata,
      },
    });
  }

  globalScope.StudentForgeMonitor = {
    init,
    trackCustomMetric,
  };
})(window);
