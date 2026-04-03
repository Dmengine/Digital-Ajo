# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Deployment Checklist (Vercel + Render)

Use this checklist when deploying the frontend (Vercel) and backend (Render).

### 1. Vercel project root

- Set the Vercel project root directory to `web`.
- Confirm `vercel.json` is present in this folder.

### 2. SPA route fallback

- Keep `web/vercel.json` with an SPA rewrite so deep links like `/login` work:

```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

### 3. Frontend environment variable (Vercel)

- Add this env var in Vercel:

`VITE_API_BASE_URL=https://digital-ajo.onrender.com/api`

- Apply it to Production (and Preview if you want preview deployments to hit the same backend).
- Redeploy after saving env vars.

### 4. Backend CORS origin (Render)

- Set this env var in Render:

`CORS_ORIGIN=https://digital-ajo.vercel.app`

- No trailing slash is required.

### 5. Backend required env vars (Render)

- Ensure these are set:
- `MONGO_URI`
- `JWT_SECRET`
- `AJOPAY_PAYSTACK_KEY` (or `PAYSTACK_SECRET`)
- `PAYSTACK_WEBHOOK_SECRET` (or `WEBHOOK_SECRET`)

### 6. Quick post-deploy smoke tests

- Open frontend routes directly:
- `/`
- `/login`
- `/register`

- Verify backend is reachable:
- `https://digital-ajo.onrender.com/` should return status JSON.

- Verify login call reaches backend from browser network tab:
- `POST /api/auth/login` on `digital-ajo.onrender.com`
