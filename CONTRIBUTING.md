# Contributing to teleconference-mcp

**Welcome!** This guide outlines the modern development standards and processes for the teleconference-mcp monorepo.

---

## 🎯 Contribution Policy

We follow a **reductionist, mission-oriented** approach to collaboration.
- **Maintainer**: Sandra Schipal
- **Code of Conduct**: Professional technical excellence. Zero sycophancy.
- **Standard**: SOTA v13.1 Compliance (FastMCP 3.1+).

---

## 🛠️ Development Setup

### Prerequisites
- **Git**: Primary version control.
- **Python 3.10+**: Managed via `uv`.
- **Node.js 18+**: Managed via `npm` and `turbo`.
- **Just**: Project orchestration.
- **Ollama**: Local AI inference.

### Initialization
```powershell
# Clone and setup monorepo
git clone https://github.com/sandraschi/teleconference-mcp.git
cd teleconference-mcp
.\setup.ps1
```

---

## 📁 Monorepo Structure

- **apps/web**: Next.js conferencing dashbaord.
- **apps/agent**: AI Voice Agent (Visio) orchestrator.
- **packages/remoting-mcp**: Native remoting interface (input/capture).
- **packages/conferencing-mcp**: meeting intelligence tools.

---

## 🧪 Quality Standards

### Linting & Formatting
We use **Ruff** for Python and **ESLint/Prettier** for Typescript.
```powershell
just lint    # Check all
just fix     # Auto-fix all
```

### Security
We use **Bandit** and **Safety** for vulnerability audits.
```powershell
just check-sec
```

### Testing
- **Python**: Use `pytest` in `apps/agent` and `packages/` directories.
- **Native Remoting**: Requires `UIAccess` privileges for input injection testing.

---

## 🔄 Pull Request Process

1. **Branching**: Use semantic names (`feature/`, `fix/`, `docs/`).
2. **Quality Check**: Run `just fix` before committing.
3. **Documentation**: Update `CHANGELOG.md` for major architectural changes.
4. **Validation**: Ensure all `just` dashboard commands execute successfully.

---

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the **MIT License**.

---

**Last Updated:** 2026-04-06  
**Status:** Modern v2.0.0 (Teams++) Compliance  
**Author:** Sandra Schipal

