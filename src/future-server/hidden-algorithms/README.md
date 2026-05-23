# Future Server — Hidden Algorithms

This directory is reserved for server-side migration of sensitive detection logic.

## Migration targets

| Module | Current location | Migrate to |
|--------|-----------------|------------|
| Scoring engine | `src/core/scoring/scoring-engine.ts` | `src/future-server/hidden-algorithms/scoring.worker.ts` |
| XPath validator | `src/core/validators/xpath-validator.ts` | `src/future-server/hidden-algorithms/xpath.worker.ts` |
| DOM similarity | `src/core/similarity/dom-similarity.ts` | `src/future-server/hidden-algorithms/dom.worker.ts` |
| Visual analyzer | `src/core/visual-analysis/visual-analyzer.ts` | `src/future-server/hidden-algorithms/vision.worker.ts` |
| Template registry | `src/services/template-registry.service.ts` | PostgreSQL + encrypted JSON columns |

## Architecture notes

- All service calls already use async abstractions (`await templateService.verify(...)`)
- Replace service implementations with `apiClient.post(...)` calls
- Backend: Fastify/NestJS + Bull queues + Playwright workers
- Protect with JWT + request signing + rate limiting
