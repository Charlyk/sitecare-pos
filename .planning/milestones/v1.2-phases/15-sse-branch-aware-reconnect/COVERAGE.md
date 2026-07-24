# Phase 15 — External API Coverage

No external API integration: modifies the existing SSE order-stream consumer (`src/use-sse.js`) to react to branch changes; no new API surface added.

**Reason:** This phase re-wires an already-integrated consumer of the `/v1/sse/orders` stream. It adds no new endpoints, verbs, or SDK calls — the server-side branch scoping is unchanged (the client simply reopens the same connection so the server re-resolves `selected_branch_id` from existing session state). The deterministic detector returned `detected: false` against the phase scope; this declaration is recorded so the `verify:pre` gate has an explicit no-op rationale rather than a fabricated matrix.
