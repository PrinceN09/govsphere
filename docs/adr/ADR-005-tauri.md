# ADR-005 — Use Tauri 2 for the Desktop Application

**Status:** Accepted **Date:** 2026-06 **Deciders:** Prinodia Workspace Engineering Team

---

## Context

Prinodia Workspace needs a desktop client for government employees who:

- Work on Windows machines (most DRC government workstations run Windows)
- Need desktop notifications for messages and alerts
- May need offline capability for viewing cached documents
- Require a more integrated OS experience (system tray, file drag-and-drop)

The desktop app must share as much code as possible with the web app.

## Decision

We will use **Tauri 2** for the desktop application (`apps/desktop/`).

Tauri wraps the Next.js web app in a native WebView, with a Rust backend for OS-level integration
(notifications, system tray, file access, auto-update). The web app bundle is embedded in the Tauri
binary — no separate web server is needed.

## Alternatives Considered

**Electron:**

- Rejected. Ships a full Chromium and Node.js runtime per installation — typical binary is 150–200
  MB. Tauri binaries are 10–30 MB. On DRC government networks with limited bandwidth, installer size
  matters significantly. Electron's memory usage is also substantially higher.

**Electron with Next.js:**

- Same rejection reason as Electron above.

**Native Windows app (WPF / WinUI):**

- Rejected. Requires a separate Windows-specific codebase, cannot share the React component library,
  and limits the team's ability to contribute across platforms.

**Flutter Desktop:**

- Rejected. Requires a separate Dart codebase and design system. No code sharing with our
  React/Next.js web app.

## Consequences

**Positive:**

- Tauri 2 uses the OS WebView (Edge on Windows, WebKit on macOS, WebKitGTK on Linux) — no bundled
  browser
- Binary size 10–30 MB vs. 150–200 MB for Electron
- Rust backend for OS integration is memory-safe and performant
- The web app is the authoritative UI — the desktop app renders the same components
- Auto-update via Tauri's built-in updater (signed updates from our CDN)
- Code signing supported for Windows (required by government IT policies)

**Negative:**

- WebView rendering differences across Windows versions (Edge may differ from Chrome)
- Rust backend requires Rust knowledge — not a common skill in the team
- OS WebView on older Windows 10 machines may not support all CSS features
- Desktop-specific features (system tray, native notifications) require Tauri Rust plugin APIs

## Implementation Plan

Phase 10 in the roadmap. The Tauri shell is scaffolded in `apps/desktop/` but the Rust integration
layer will be implemented in Sprint 9+.
