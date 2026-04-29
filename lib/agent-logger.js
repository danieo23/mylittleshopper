// Structured JSON logger for agent steps.
// All events emit to stdout as newline-delimited JSON — Vercel, Datadog,
// and any log aggregator can parse these without additional configuration.

function emit(obj) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj }));
}

function flattenUsage(usage) {
  if (!usage) return {};
  return {
    input_tokens:          usage.input_tokens          ?? 0,
    output_tokens:         usage.output_tokens         ?? 0,
    cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_tokens:     usage.cache_read_input_tokens     ?? 0,
  };
}

export const agentLog = {
  /** Called once at the start of every runAgent() invocation. */
  agentStart(userId, message) {
    emit({ type: 'agent_start', userId, message: (message ?? '').slice(0, 120) });
  },

  /** Called after every client.messages.create() inside the loop. */
  agentTurn(turn, stopReason, usage) {
    emit({ type: 'agent_turn', turn, stop_reason: stopReason, ...flattenUsage(usage) });
    // Log cache utilisation so we can track savings over time.
    const u = flattenUsage(usage);
    if (u.cache_creation_tokens || u.cache_read_tokens) {
      const saved = u.cache_read_tokens;
      const pct   = u.input_tokens ? Math.round((saved / u.input_tokens) * 100) : 0;
      emit({ type: 'cache_hit', turn, cache_read: saved, input_total: u.input_tokens, pct_saved: pct });
    }
  },

  /** Called immediately before executeTool() dispatches a tool. */
  toolCall(name, input) {
    emit({ type: 'tool_call', tool: name, input_keys: Object.keys(input ?? {}) });
  },

  /** Called after a tool completes (whether success or error). */
  toolResult(name, durationMs, ok, summary) {
    emit({ type: 'tool_result', tool: name, duration_ms: durationMs, ok, summary: (summary ?? '').slice(0, 200) });
  },

  /** Called once when runAgent() is about to return. */
  agentEnd(turns, hadOutfits) {
    emit({ type: 'agent_end', turns, had_outfits: hadOutfits });
  },

  /** Structured error — use instead of console.error inside agent code. */
  error(context, err) {
    emit({ type: 'error', context, message: err?.message, stack: err?.stack?.split('\n')[1]?.trim() });
  },
};
