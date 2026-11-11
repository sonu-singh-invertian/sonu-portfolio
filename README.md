# Sonu Singh Portfolio v2

Run locally (Node 18+):

    npm install
    cp .env.example .env   # optional: SMTP + GitHub token
    npm start              # http://localhost:3000

- All content lives in `public/data/portfolio.json`. Edit that file, never the HTML.
- Copy `sonu-new.jpg`, `resume.pdf` and all `*_cert.pdf` files into `public/`.
- Backend: `/api/contact` (validation, rate limit, saved to `data/messages.jsonl`, optional email), `/api/github` (cached repo stats).
- GitHub Pages only (no backend)? Upload the `public/` folder. The form falls back to FormSubmit automatically.
- Backend on Render/Railway? Deploy this folder and set `API_BASE` at the top of the script in `index.html` to its URL.
