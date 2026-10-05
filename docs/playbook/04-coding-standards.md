# 04. Coding standards

Code standard for humans and agents. The reference is mature OSS projects (Go stdlib, Kubernetes, FastAPI, React): code reads by itself, comments are rare and precise.

## Language

- **Everything in code is in English:** identifiers, comments, docstrings, log and error messages, commits, branch names.
- UI texts are in the user's language (RU / KZ / EN), kept in one place, not scattered across the code.
- Docs for humans (`README`, `docs/`) are in English too: the repository is public.

## Comments

**Main rule: a comment explains *why*, not *what*.** What the code does must be visible from the names.

| ✅ Write | ❌ Do not write |
|---|---|
| A non-obvious reason for a decision | A retelling of the line of code |
| An external system limitation, a workaround with a link | A comment on every line / every block |
| An invariant that is easy to break | Poems, "This function is responsible for…" |
| Unit / format, if not visible from the type | Change history (that is what git is for) |
| Public API docstring: one line, what it returns and when it fails | Commented-out code |
| `TODO(owner): action`: specific | Decorative banners `# ====== SECTION ======` |

Length: **one line** in most cases, at most 2–3 for a complex invariant. If you need more, rename or split the code.

```python
# ❌
# This function calculates the total price by iterating over all items
# and summing up their prices multiplied by quantities, then returns it.
def calc(items):
    t = 0  # initialize total
    for i in items:  # loop over items
        t += i.price * i.qty  # add price
    return t  # return total

# ✅
def order_total(items: list[LineItem]) -> Decimal:
    return sum((item.price * item.qty for item in items), Decimal(0))
```

```go
// ✅ Why, not what.
// Upstream API rate-limits at 10 rps per token; stay below to avoid 429 bans.
limiter := rate.NewLimiter(8, 1)
```

```ts
// ✅ Public API: one line.
/** Returns masked text; IIN, phones and card numbers are replaced with tokens. */
export function maskPii(text: string): string { ... }
```

## Naming

- Names convey meaning: `risk_score`, `fetchInvoices`, `ParseReceipt`, not `data`, `tmp`, `handle2`, `doStuff`.
- Booleans as a question: `is_valid`, `hasAccess`, `shouldRetry`.
- Units in the name if the type does not carry them: `timeout_ms`, `size_bytes`.
- Language idioms: `snake_case` (Python), `camelCase`/`PascalCase` (TS), `MixedCaps` + short names in a narrow scope (Go).
- No abbreviations except common ones (`id`, `url`, `ctx`, `db`, `cfg`).

## Functions and modules

- A function does one thing. Guideline: up to ~40 lines; longer is a reason to split.
- Early return instead of nested `if`.
- Pure functions in `domain/`, side effects in `adapters/`.
- A file covers one topic. Guideline: up to ~300 lines.
- No circular imports; dependencies go `api → domain ← adapters`.
- No "utils" dumping grounds; a helper lives next to whoever uses it.

## Errors

- Do not swallow errors. Either handle them or propagate with context.
- Go: `fmt.Errorf("fetch invoice %s: %w", id, err)`. Python: own domain exceptions, mapping to an HTTP response only in `api/`. TS: a typed result or `Error` with `cause`.
- Outward (HTTP): a single error format without stack traces: `{"error": {"code": "...", "message": "..."}}`.
- Error and log messages: lowercase, no trailing period, with context (`"parse receipt: missing total"`).

## Logs

- Structured (JSON), key-value, not string concatenation.
- Levels: `debug` for details, `info` for business events, `warn` for degradation (a fallback kicked in), `error` when a human is needed.
- Never log secrets or PII (mask before logging).

## Types and validation

- Python: type hints everywhere in public functions, Pydantic at the boundaries (API, LLM structured output).
- TS: `strict: true`, `zod` at the boundaries, no `any` (an exception needs a comment saying why).
- Go: explicit structs, validation at the handler input.

## Formatting and linters (no style debates)

| Language | Format | Lint | Tests |
|---|---|---|---|
| Python | `ruff format` | `ruff check` | `pytest` |
| TS/JS | `prettier` | `eslint` | `vitest`, Playwright for e2e |
| Go | `gofmt` / `goimports` | `golangci-lint` (or `go vet`) | `go test ./...` |

No commit if format/lint is red (pre-commit).

## Tests

- The test name describes behavior: `test_masks_iin_in_free_text`, `TestScore_ReturnsZeroForEmptyHistory`.
- Arrange / Act / Assert, no logic in tests.
- Test behavior through the public interface, not private details.
- Mocks only at the boundary (adapters), domain is tested on real objects.

## Dependencies

- A new dependency only if it saves > 30 minutes or is the de facto standard.
- Add it to `THIRD_PARTY.md` right away.
- Versions are pinned by the lock file.

## Git

- Conventional commits in English, imperative mood: `feat(api): add receipt upload endpoint`.
- Subject ≤ 72 characters, body only if the "why" is not obvious.
- One commit, one logical change.
- Branches: `feat/<area>-<short>`, `fix/...`, `docs/...`, `chore/...`.

## Frontend

- A component has one responsibility; > ~150 lines, split it.
- Build UI from `@/components/ui` (shadcn); your own is composition on top of them, no "just in case" design system.
- Colors, radii, fonts are theme tokens from `index.css`, not raw palette classes (`gray-500`, `red-600`).
- Server state: TanStack Query (or server components in Next), not hand-written `useEffect` loads.
- Loading, empty and error states on every screen with data.
- Accessibility: semantic tags, `label` on inputs, keyboard focus.

## What the agent checks before "done"

- [ ] No retelling comments or commented-out code
- [ ] Names convey meaning
- [ ] Format + lint + tests are green
- [ ] Errors are not swallowed, logs contain no secrets/PII
- [ ] Changes only in its own area
