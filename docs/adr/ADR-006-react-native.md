# ADR-006 — Use React Native for the Mobile Application

**Status:** Accepted **Date:** 2026-06 **Deciders:** GovSphere Engineering Team

---

## Context

GovSphere needs a mobile client for government employees who:

- Access GovSphere from Android phones (dominant device in the DRC)
- Need mobile push notifications for messages and alerts
- May work in areas with intermittent connectivity

The mobile app must share as much logic as possible with the web application.

## Decision

We will use **React Native 0.74** (with Expo) for the mobile application (`apps/mobile/`).

## Alternatives Considered

**Flutter:**

- Rejected. Flutter uses Dart — a different language from our TypeScript stack. No code sharing with
  the web/API. The team would need to maintain two separate UI codebases with two separate component
  systems.

**Native Android (Kotlin):**

- Rejected. DRC government workstations run Windows; the development team has no Android native
  expertise. A native iOS app would also be required, doubling the effort.

**Native iOS + Android:**

- Rejected. Two separate codebases, two separate teams, two separate review cycles. Not justified at
  the current stage.

**PWA (Progressive Web App):**

- Considered as a lower-cost alternative. Rejected because PWAs on Android have limited support for
  push notifications, background sync, and OS integration. The government requires a proper Play
  Store listing for distribution through government IT channels.

**Capacitor (with Next.js web app):**

- Considered. Capacitor wraps a web app in a native shell (similar to Tauri for desktop). However,
  mobile-specific UX patterns (bottom navigation, swipe gestures, native modals) are harder to
  implement well in a shared web app. React Native gives us full native rendering.

## Consequences

**Positive:**

- React Native renders native UI components — not a WebView; performs like a real native app
- Shared business logic, API client, TypeScript types, and i18n with the web app (via `@govsphere/`
  packages)
- Expo simplifies native build configuration and OTA updates
- React Native is dominant in the African tech ecosystem — easier to hire for locally
- Single codebase for Android and iOS (iOS deployment can be added later without rewriting)
- React Native New Architecture (Fabric + JSI) improves bridge performance

**Negative:**

- Some native modules require platform-specific code (camera, biometrics, push notifications)
- Expo managed workflow limits some native customizations
- React Native performance in animation-heavy UIs can lag behind native, but GovSphere is primarily
  a productivity tool, not a game

## Implementation Plan

Phase 10 in the roadmap. The scaffold is in `apps/mobile/`. Implementation begins after the web app
reaches feature parity (Sprint 7+).
