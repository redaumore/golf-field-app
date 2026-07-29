# Skill Registry

This registry indexes available tools, plugins, and skills for execution in `golf-field-app`.

## Project Context & Tools
- **Build / Type Check**: `npm run build` (`tsc -b && vite build`)
- **Linting**: `npm run lint` (`eslint .`)
- **Dev Server**: `npm run dev` (`vite`)
- **Preview**: `npm run preview` (`vite preview`)
- **Test Runner**: None currently configured (Vitest proposed in `docs/testing_plan.md`)

## Installed Plugins & Agent Skills

### Modern Web Guidance (`modern-web-guidance-plugin`)
- **`modern-web-guidance`**: Search and guidance for modern web standards (React, CSS, Tailwind v4, View Transitions, Accessibility, Performance).
- **`chrome-extensions`**: Guidance for Chrome extension development and V3 manifests.

### Chrome DevTools (`chrome-devtools-plugin`)
- **`a11y-debugging`**: Accessibility auditing and debugging.
- **`chrome-devtools`**: Browser automation, inspecting DOM/styles, and network profiling.
- **`debug-optimize-lcp`**: Core Web Vitals and LCP performance optimization.
- **`memory-leak-debugging`**: Heap profiling and memory leak detection.
- **`troubleshooting`**: DevTools connection and target resolution.

### AI & Agent SDK (`google-antigravity-sdk`)
- **`google-antigravity-sdk`**: Design and orchestrate Google Antigravity autonomous multi-agent workflows.

### Science & Research (`science`)
- Domain skills available for scientific database access (PubChem, PubMed, Ensembl, UniProt, ClinicalTrials, etc.) when required.
