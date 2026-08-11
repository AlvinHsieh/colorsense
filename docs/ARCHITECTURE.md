# Architecture

## Current foundation

```text
Popup (React)
  |-- PING --> Background service worker
  |             `-- PONG with local extension version
  |
  `-- activeTab + scripting.executeScript --> isolated page probe
                                                `-- PONG without page data
```

The foundation intentionally has one WXT application under `apps/extension`. Shared packages will be
introduced only when real cross-module behavior requires them.

## Runtime boundaries

- **Popup:** user interaction, status, and future scan-result presentation.
- **Background:** orchestration, permission boundaries, and future scan lifecycle.
- **Injected page probe:** one-time isolated-world code invoked through `activeTab`; it returns only a
  typed health response in v0.1.
- **Domain engine:** future pure TypeScript extraction, detection, confidence, and transformation
  rules; it must remain independent of React and browser globals.

## Message contract

v0.1 has no stable public API. Internal runtime messages are a discriminated union:

```ts
type PingMessage = { type: 'PING'; requestId: string };
type PongMessage = {
  type: 'PONG';
  requestId: string;
  source: 'background' | 'page';
  version: string;
};
```

Untrusted runtime messages are validated before use. Unknown messages receive no response.

## Permission model

- `activeTab`: temporary access following an explicit extension interaction.
- `scripting`: inject the isolated page probe into the active tab.
- `storage`: reserved for local preferences; v0.1 does not sync data.
- No persistent host permissions and no `<all_urls>` content script.

## Future data flow

```text
User starts scan
  -> background injects scanner into active tab
  -> scanner extracts bounded, non-sensitive visual properties
  -> local deterministic engine returns candidates and confidence
  -> popup asks for confirmation or applies reversible overlay
```

Input values, editable text, credentials, browsing history, and page content unrelated to visual
semantics are outside the data contract.
