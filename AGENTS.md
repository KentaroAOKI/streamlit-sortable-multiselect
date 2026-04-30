# Repository Guidelines

## Project Structure & Module Organization

This repository is for `streamlit-sortable-multiselect`, a Streamlit custom component.

Expected layout for implementation work:

- `streamlit_sortable_multiselect/` contains the Python package and public Streamlit API.
- `streamlit_sortable_multiselect/frontend/` contains the component frontend app, usually React/TypeScript or Vite-based code.
- `streamlit_sortable_multiselect/frontend/build/` contains built frontend assets used by the Python package.
- `examples/` contains runnable Streamlit apps that demonstrate component behavior.
- `tests/` contains Python tests for wrapper logic and any frontend tests if configured.
- `pyproject.toml` defines Python package metadata, dependencies, build settings, and tool config when added.
- `apm.yml` and `apm.lock.yaml` manage local agent/skill dependencies for this repository.
- `.github/agents/` and `.github/skills/` contain reusable agent and skill definitions.
- `apm_modules/` is generated dependency content and must not be edited directly.

If the source tree is still missing, create it in the conventional Streamlit component shape rather than adding loose files at the repository root.

## Build, Test, and Development Commands

No Streamlit component scripts are currently committed. When implementation files are added, prefer these standard commands and document any differences:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
```

For frontend development, run commands from the frontend directory:

```bash
cd streamlit_sortable_multiselect/frontend
npm install
npm run dev
npm run build
```

For component testing and examples:

```bash
pytest
streamlit run examples/basic.py
```

Useful repository inspection commands:

```bash
git status --short
git ls-files
rg "term" streamlit_sortable_multiselect examples tests .github apm.yml
```

If scripts are added to `pyproject.toml`, `package.json`, or `apm.yml`, keep this section in sync.

## Coding Style & Naming Conventions

Use Python for the Streamlit wrapper and TypeScript for frontend component code unless the existing implementation establishes a different convention.

Python guidelines:

- Package name: `streamlit_sortable_multiselect`.
- Public API should be small and Streamlit-friendly, for example `sortable_multiselect(...)`.
- Keep wrapper arguments explicit and documented.
- Preserve Streamlit rerun semantics: component values should be serializable, stable, and backward compatible.
- Avoid import-time side effects beyond declaring the component.

Frontend guidelines:

- Keep component state synchronized with Streamlit props and returned values.
- Return plain JSON-serializable values through Streamlit's component API.
- Prefer accessible controls, keyboard support, and predictable focus behavior for drag/sort interactions.
- Keep styling scoped to the component to avoid leaking styles into the host Streamlit app.
- Do not hard-code development server URLs outside the conventional `_RELEASE` or dev-mode switch.

Documentation and agent files:

- Use Markdown with descriptive headings and concrete examples.
- Name agent files as `name.agent.md`.
- Name skill directories in lowercase kebab-case, each with `.github/skills/<skill-name>/SKILL.md`.

YAML files use two-space indentation. Do not commit generated dependency directories such as `apm_modules/`, Python caches, virtualenvs, frontend dependency directories, or build artifacts unless the built frontend assets are intentionally packaged.

## Testing Guidelines

When implementation code is added, include tests for both the Python wrapper contract and the frontend behavior that affects returned values.

Recommended coverage:

- Python tests under `tests/` for defaults, argument validation, value serialization, and release/dev component declaration.
- Frontend tests for selection, deselection, ordering, disabled states, and keyboard interactions when a frontend test runner is configured.
- At least one example app under `examples/` that can be launched with `streamlit run`.

Before packaging or release, verify:

```bash
pytest
cd streamlit_sortable_multiselect/frontend && npm run build
streamlit run examples/basic.py
```

For documentation-only changes, validate rendered Markdown, paths, and command examples.

## Commit & Pull Request Guidelines

Use concise imperative commit messages, for example `Add sortable multiselect wrapper` or `Document component development flow`.

Pull requests should include:

- What changed and why.
- Affected Python package, frontend, examples, docs, or APM files.
- Validation performed, including tests and example app checks.
- Screenshots or screen recordings for user-facing component behavior changes.

## Agent-Specific Instructions

Before broad edits, map the relevant files and preserve existing agent/skill frontmatter.

For Streamlit component work:

- Keep Python package changes, frontend changes, and generated build output clearly separated.
- Do not edit `apm_modules/` directly; update APM dependency declarations instead.
- Do not vendor `node_modules/`, virtualenvs, caches, or generated lockfile changes unrelated to the task.
- If dependency selections change, update the matching lockfile (`apm.lock.yaml`, Python lockfile, or frontend lockfile) intentionally.
- When changing the frontend contract, update the Python wrapper, frontend props/types, tests, and examples together.
