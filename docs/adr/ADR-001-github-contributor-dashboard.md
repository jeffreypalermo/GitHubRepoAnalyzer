# ADR-001: GitHub Contributor Dashboard — Architecture Decision Record

**Date:** 2025-07-14  
**Status:** Accepted  
**Authors:** Jeffrey Palermo, Team

---

## Business Case

Engineering leadership currently has no lightweight, on-demand way to see how a team is contributing to a codebase — not just whether builds are green, but behavioral patterns: who is committing, how often, how broadly, and how quickly work moves from branch to merge.

The GitHub Contributor Dashboard closes that gap by surfacing four key behavioral signals directly from the GitHub API, requiring no backend infrastructure and no special tooling beyond a modern browser.

---

## Context

The team met to scope a deliverable that could be completed within a single focused build session (end of day / lunch). The meeting was transcribed live and fed into an AI tool to generate this plan.

The goal is a **browser-only web application** that visualizes GitHub contribution patterns for a target repository. Scope is intentionally narrow: four confirmed use cases, one public data source, no server-side processing.

A secondary goal — noted for future adoption but not required today — is Jeffrey's structured work breakdown workflow: epics → plan → tasks, each task as an independent AI context session, stored as GitHub Issues.

---

## Decision

Build the **GitHub Contributor Dashboard** as a browser-only single-page application using **React + TypeScript + Tailwind CSS**, consuming the **GitHub public REST API** directly from the browser, pointed at Jeffrey's public ClearMeasure work orders repository as the data source.

---

## Use Cases (Scope)

| # | Use Case | Description |
|---|----------|-------------|
| 1 | **Commits by User** | Leaderboard ranking contributors by total commit count |
| 2 | **Most-Changed Files** | File change leaderboard identifying frequently touched files and potential god-class bloat |
| 3 | **Commit Granularity** | Analysis of whether changes are isolated (single-file, focused) or broad (many files per commit) — a proxy for discipline |
| 4 | **Branch-to-Merge Duration** | Time elapsed from the first commit on a branch to the pull request merge — a proxy for cycle time |

---

## Tech Stack

### Chosen

| Concern | Choice | Rationale |
|---------|--------|-----------|
| UI framework | **React** | Component model suits a dashboard with multiple independent visualizations |
| Styling | **Tailwind CSS** | Utility-first; fast to iterate without a design system |
| Language | **TypeScript** | Type safety on GitHub API response shapes reduces runtime surprises |
| Rendering target | **Browser-only (SPA)** | Eliminates backend infrastructure for this iteration |
| Data source | **GitHub public REST API** | No auth required for public repos; no CORS proxy needed |
| Target repo | **Jeffrey's public ClearMeasure work orders repo** | Publicly accessible, already familiar, has branching history suitable for use case #4 |
| Build tooling | **Local build script** | Serves as a starting point for a CI pipeline |
| Tests | **Automated tests** | Baseline test coverage ships with the initial build |
| Deployment | **GitHub Pages** *(raised, not committed)* | Viable zero-infrastructure option for a browser-only app |

### Rejected Alternatives

| Alternative | Reason Rejected |
|-------------|-----------------|
| Plain TypeScript (no framework) | More boilerplate for DOM manipulation; React's component model is net faster for a multi-panel dashboard |
| Bootstrap | Less flexible than Tailwind for rapid custom layout; heavier bundle |
| Private biBerk repo as data source | Requires managing a temporary GitHub token, adding auth complexity out of scope for this session |
| Backend API layer | Unnecessary; GitHub's public API is callable directly from the browser for a public repo |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (SPA)                     │
│                                                     │
│  ┌─────────────┐   ┌──────────────────────────┐    │
│  │  React App  │──▶│  GitHub REST API (public) │    │
│  │  TypeScript │   │  api.github.com           │    │
│  │  Tailwind   │   └──────────────────────────┘    │
│  └──────┬──────┘                                    │
│         │                                           │
│  ┌──────▼───────────────────────────────────────┐  │
│  │              Dashboard Panels                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Commits  │ │Top Files │ │  Granularity │  │  │
│  │  │ by User  │ │ Changed  │ │   Analysis   │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  │                ┌────────────────────┐         │  │
│  │                │ Branch→Merge Time  │         │  │
│  │                └────────────────────┘         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Data flow:**  
React components → GitHub REST API calls (`/commits`, `/pulls`, `/repos/{owner}/{repo}/stats/contributors`) → parse + aggregate in-browser → render visualizations.

No server. No auth tokens. No build-time secrets.

---

## Action Items

- [ ] Scaffold React + TypeScript + Tailwind project with local build script
- [ ] Wire GitHub public REST API client (typed fetch wrapper for ClearMeasure work orders repo)
- [ ] Implement **Use Case 1** — Commits by User leaderboard
- [ ] Implement **Use Case 2** — Most-Changed Files leaderboard
- [ ] Implement **Use Case 3** — Commit Granularity analysis panel
- [ ] Implement **Use Case 4** — Branch-to-Merge Duration panel
- [ ] Write automated tests (baseline coverage for each use case)
- [ ] Validate build script produces a deployable artifact
- [ ] *(Future)* Adopt Jeffrey's epic → plan → task breakdown workflow stored as GitHub Issues
- [ ] *(Future)* Evaluate GitHub Pages deployment

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| GitHub API rate limiting (60 req/hr unauthenticated) | Medium | Batch API calls; cache responses in `sessionStorage`; display rate-limit warnings in UI |
| ClearMeasure repo history insufficient for use case #4 | Low | Repo was explicitly chosen for its branching history; verify early in build session |
| Scope creep past end-of-day target | Medium | Four use cases are fixed; defer everything else to future ADR |
| Browser CORS issues | Low | GitHub API sets permissive CORS headers for public endpoints |

---

## Future Considerations

- **Auth-gated repos** — Add optional GitHub token input (stored in `localStorage`, never sent to any backend) to support private repos such as biBerk's internal codebase
- **CI pipeline** — Promote the local build script to a GitHub Actions workflow
- **GitHub Pages deployment** — Zero-infrastructure hosting aligned with the browser-only architecture
- **Structured work breakdown** — Adopt Jeffrey's epic → plan → tasks model, posting each task as a GitHub Issue with a dedicated AI context session per task
- **Additional use cases** — PR review turnaround, code churn rate, test coverage trends

---

## References

- Meeting transcript (Notion, 2025-07-14)
- [GitHub REST API — Commits](https://docs.github.com/en/rest/commits/commits)
- [GitHub REST API — Pulls](https://docs.github.com/en/rest/pulls/pulls)
- [GitHub REST API — Statistics](https://docs.github.com/en/rest/metrics/statistics)
- ClearMeasure work orders public repository (data source)
