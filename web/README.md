# LINGO — Web (Frontend)

React + Vite frontend for LINGO.

## Local development

## Known limitation: HTTP + non-localhost origins

The session cookie is set with `Secure` and `SameSite=None`, which requires
HTTPS. Browsers treat `localhost` as a trustworthy origin even over plain
HTTP, so the default `npm run dev` workflow works fine. However, testing
over plain HTTP on any other origin — e.g. `vite --host` for phone/LAN
testing, or an HTTP staging box — will silently fail: the UI may appear
logged in, but the browser drops the cookie and `/api/auth/me` returns 401
with no visible error. Use HTTPS (or a tunnel like ngrok) for any non-
localhost testing.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.