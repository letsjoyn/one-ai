# Frontend

React and Vite client with registration, verification, password recovery,
workspace teams, private account-synced chats, source passages, document
deletion, responsive navigation, and persistent dark/light modes.

```powershell
npm.cmd install
npm.cmd run dev
```

Production check:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Set `VITE_GATEWAY_URL` to the deployed gateway URL before deploying to Vercel.
