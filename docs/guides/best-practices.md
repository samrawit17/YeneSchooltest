# Best Practices for AI-Readable Documentation

> Purpose: Guidelines for maintaining documentation that AI agents can efficiently consume.

---

## 1. Structure Principles

### 1.1 Modular but Connected
- Each doc file is independently useful but links to related files
- No single file (except ARCHITECTURE.md) is a prerequisite for all others
- Follow the "One Thing Well" principle — each file covers one topic

### 1.2 Consistent Format
Every document should include:
```markdown
# Title
> Purpose: One-line purpose statement

---  (horizontal rule separating sections)

## 1. Section Title
Content...

## Related Documents
- `path/to/file.md` — Brief description
```

### 1.3 Progressive Disclosure
```
ARCHITECTURE.md          → High-level everything
├── docs/PROJECT_*.md    → Product/tech overview
├── docs/FEATURES/*/     → Deep dive per module
├── docs/API/*/          → API specifications
├── docs/UI/*/           → UI documentation
└── docs/decisions/      → Architecture decisions
```

---

## 2. Writing for AI (Not Humans)

### Do
- Use tables for structured data (schema, rules, references)
- Use bullet points for lists
- Include code snippets as examples
- Use consistent terminology throughout
- Reference file paths with line numbers where relevant
- Keep paragraphs short (3-5 sentences max)

### Don't
- Don't write long prose paragraphs
- Don't assume the AI knows project conventions
- Don't leave information implied — state it explicitly
- Don't use vague terms like "recently" or "soon"

---

## 3. Keeping Docs Synchronized with Code

### 3.1 Change Triggers

| Trigger | Action | Owner |
|---------|--------|-------|
| Add new module | Create `docs/FEATURES/<Module>/README.md` | Developer |
| Change API | Update `docs/API/v1/<resource>.md` | Developer |
| Change schema | Update `docs/DATABASE.md` | Developer |
| Add dependency | Update `docs/TECH_STACK.md` | Developer |
| Add business rule | Update `docs/BUSINESS_RULES.md` | Developer |
| Change architecture | Update `ARCHITECTURE.md` + ADR | Architect |

### 3.2 PR Gate
- Add "Documentation updated" checkbox to PR template
- CI check: verify all referenced docs exist
- Code review: verify docs match implementation

### 3.3 Automated Verification (Future)
```bash
# Check that API routes in docs match backend controllers
# Check that feature list matches backend modules
# Check that env vars in docs match .env.example
```

---

## 4. Minimum Token Guidelines

| File | Target Tokens |
|------|---------------|
| ARCHITECTURE.md | 3,000 - 4,000 |
| AGENTS.md | 1,500 - 2,000 |
| Feature docs | 500 - 1,000 each |
| API specs | 500 - 1,000 each |
| ADRs | 500 each |
| Total docs build | ~15,000 tokens |

---

## 5. Review Cycle

- Full docs review: Every major release
- Feature doc updates: With every PR touching that feature
- ADR updates: When architecture decisions are revisited
- Stale doc cleanup: Monthly

---

## Related Documents
- `docs/AI_CONTEXT.md` — Context loading strategy
- `docs/CONTRIBUTING.md` — Documentation update requirements
- `docs/AGENTS.md` — Agent conventions
