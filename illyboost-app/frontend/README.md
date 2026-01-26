# Frontend

Run locally (development):

```bash
cd frontend
npm install
npm run dev
```

Open the Vite dev URL (typically `http://localhost:5173`). The frontend expects the backend API at `http://localhost:3001` and the frontend WS at `ws://localhost:3003`.

Build for production:

```bash
npm run build
npm run preview
```

Notes:
- Use `frontend/demo.html` to preview a static simulated UI without the backend.
- If your backend is remote, set the `API` constant in `src/App.jsx` or proxy requests during development.
