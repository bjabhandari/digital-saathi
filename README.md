# Digital Saathi

Website for **Digital Saathi**: online courses, editing tools, expert teachers, and creative services (graphic design, video editing, Facebook boost).

The website and admin panel are a **React** app (Vite + React Router). A small **Node.js/Express** server (`server.js`) provides the API: content, orders with **tracking**, contact messages, image uploads and the **help chat**. The site loads its content from the API, so anything you change in the admin panel shows up right away without rebuilding.

## Project structure

```
client/                 React app (Vite root)
  index.html            website entry
  admin.html            admin panel entry
  public/assets/img/    logos, service & teacher images
  src/
    pages/              one component per page
    components/         layout (header, footer…), cards, shared UI
    context/            content (from the API), cart, toasts
    chat/               help chat widget
    admin/              admin panel (its own entry and styles)
    lib/                helpers: API, formatting, animations, offer timer
    styles/site.css     site styles
seed/content.json       default content (loaded into data/ on first start)
server.js               Express API + serves the built app from dist/
```

## Pages

| Page | URL | Component |
| --- | --- | --- |
| Home | `/` | `pages/Home.jsx` |
| Courses (search, filter, sort) | `/courses` (`?cat=Design`, `?q=`) | `pages/Courses.jsx` |
| Course detail | `/course/<course-id>` | `pages/CourseDetail.jsx` |
| Editing tools + neon **Titles** store | `/tools` (`#titles`) | `pages/Tools.jsx` |
| Product detail (titles packs & tools) | `/product/<tool-id>` | `pages/Product.jsx` |
| Services + pricing | `/services` (`#design`, `#video`, `#boost`, `#calculator`) | `pages/Services.jsx` |
| Service detail | `/service/design` · `video` · `boost` | `pages/ServiceDetail.jsx` |
| Teachers + "Become a teacher" form | `/teachers` (`#apply`) | `pages/Teachers.jsx` |
| Teacher profile + 1:1 mentorship | `/teacher/<teacher-id>` | `pages/TeacherDetail.jsx` |
| Contact + FAQ | `/contact` | `pages/Contact.jsx` |
| Cart & checkout | `/cart` | `pages/Cart.jsx` |
| Order tracking | `/track?id=<order-id>` | `pages/Track.jsx` |
| Admin panel | `/admin/` | `admin/` |

Old links from the static site (`course.html?id=…`, `services.html#boost`, …) redirect to the new URLs.

## Brand

- **Logo green `#7CC15A`** (sampled from the logo) for accents, highlights and fills
- Deeper greens `#3F8F27` / `#2F7219` for buttons and text, so they stay readable
- Forest `#0E2616` for dark sections, lime `#D4F27A` for highlights on dark
- Fonts: **Oswald** for headings (echoes the logo's "DIGITAL" lettering), **Outfit** for body text, **Kalam** for Devanagari accents
- Logo files in `client/public/assets/img/`: `logo.png` (full badge), `wordmark.png` (header), white versions for dark backgrounds, and favicons

## Animations & interactive features

- Logo preloader (first visit per session), scroll progress bar, header that shrinks on scroll, soft page transitions
- Hero with line-by-line headline reveal, rotating words, spinning orbit around the logo, floating cards and animated blobs
- Skills marquee, counters that count up, staggered scroll reveals, 3D card tilt on hover, animated FAQ/curriculum accordions
- Add-to-cart "fly to cart" animation, sliding tab indicator, auto-playing testimonial slider
- **Facebook Boost calculator** (`/services#calculator`) with live reach/price estimates; tune its numbers in **Admin → Boost calculator**
- Form validation with an animated success state
- Everything respects the visitor's "reduce motion" setting

## Admin panel

Open **http://localhost:8000/admin/** and sign in. The first time the server starts it prints the admin password in the terminal (or set `ADMIN_PASSWORD` before the first start). Change it in **Settings**, or run `npm run set-password -- <new password>`.

- **Dashboard**: active orders, confirmed revenue, unread messages, orders by stage
- **Orders**: every checkout creates an order with an ID like `DS-AB12CD`. Open one to move it through the stages (Received → Payment confirmed → In progress → Client review → Delivered), set the progress %, say who's working on it, add a delivery/preview link and send a note. The customer sees all of it on the tracking page. **WhatsApp update** opens a ready-made message with the tracking link.
- **Messages**: contact form messages and teacher applications, with WhatsApp/email reply buttons
- **Website content**: edit services (images, showcase, packages), courses (cover images), editing tools, teachers, testimonials, FAQs, help-chat answers, contact info, daily offer, boost calculator. Upload images directly (PNG/JPG/WEBP/GIF, resized automatically). Changes go live as soon as you save.

## Order tracking

After checkout the customer gets an order ID and a **Track my order** button. On `/track` they enter the ID and their phone number to see the progress bar, stage steps, who's working on it, the delivery link and a timeline of updates. The page refreshes every minute while the order is active. Orders placed from a browser are remembered there, so returning customers see them listed.

## Help chat

A chat button on every page answers questions about services, prices, courses, tools and how to order, using the site content, and can check an order's status. Add extra answers in **Admin → Help chat**.

For AI answers to any question, start the server with an Anthropic API key (needs **Node 18+**):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

The chat then uses Claude (`claude-opus-5-5`) with your website content as its knowledge. Order lookups still go through the built-in tracker.

## Editing content

Default content lives in **`seed/content.json`**. On first start the server copies it into `data/content.json`, and from then on you edit it in the admin panel (use **Restore default** in a section to reload it from the seed):

- `SITE`: phone, WhatsApp number, email, address, social links (Facebook, TikTok, WhatsApp)
- `OFFER`: the daily discount. The countdown ends at midnight Nepal time and restarts every day; set `enabled: false` to hide all timers
- `SOFTWARE`: the app tiles (Pr, Ae, CapCut, DaVinci) shown on titles packs
- `COURSES`, `TOOLS`, `TEACHERS`: add or edit entries and the pages update automatically
- `SERVICES`: pricing packages, illustration (`image`) and "Recent work" images (`showcase`) for design, video and boost
- `COURSES[].images`: 1–3 cover images per course, shown as an animated 3D stack
- `CHATBOT`: help-chat greeting, quick replies and extra answers
- `BOOST`: NPR rate per $1 of ad spend and the reach/result estimates for the calculator
- `TESTIMONIALS`, `FAQS`

**Teacher photos:** placeholder illustrations live in `client/public/assets/img/teachers/`. Replace each with a real photo (e.g. `aarav.jpg`) and update that teacher's `photo` path.

**Before going live, replace the placeholder email in `SITE`.**

**Service images** live in `client/public/assets/img/services/`: one illustration per service (`design.svg`, `video.svg`, `boost.svg`) and six "Recent work" images each. Replace them from the admin panel with real work.

## How orders work

Visitors add courses, tools or service packages to the cart. At checkout the server saves the order (prices are looked up on the server, not taken from the browser) and returns an order ID. The customer then sends payment details on WhatsApp. Contact and teacher forms are saved to **Admin → Messages** and still open WhatsApp as before.

If the site is hosted without the API (plain static hosting), it uses the bundled seed content and checkout and forms fall back to WhatsApp only.

Next steps for a full platform: eSewa/Khalti payment gateway integration, student login and course video hosting.

## Run locally

Requires Node.js 16 or newer (18+ for AI chat).

**While developing** (hot reload):

```bash
npm install
npm run dev
# site:  http://localhost:5173
# admin: http://localhost:5173/admin/
```

This runs the API on port 8000 and the Vite dev server on 5173 (which forwards `/api` and `/uploads` to the API).

**Production build:**

```bash
npm run build     # builds the React app into dist/
npm start         # serves the site + admin + API on http://localhost:8000
```

Set `PORT` to use another port.

## Data & backups

- `data/content.json`: website content edited in the admin panel
- `data/orders.json`, `data/messages.json`: orders and messages
- `data/admin.json`: admin password hash
- `uploads/`: images uploaded in the admin panel

These are not committed to git. Back up `data/` and `uploads/` regularly.

## Deploy

**Recommended: one Node.js server** (VPS, Render, Railway, cPanel with Node.js). It serves the site, admin and API together:

```bash
npm install
npm run build
npm start          # or: pm2 start server.js --name digital-saathi
```

Use a persistent disk for `data/` and `uploads/`, and put it behind HTTPS.

**Split hosting:** you can host the built site (`dist/`) on a static host (Netlify, Vercel, Cloudflare Pages) and run the API elsewhere:

- build the site with `VITE_API_URL=https://api.example.com npm run build`
- start the API with `CORS_ORIGIN=https://www.example.com npm start`
- configure the static host to serve `index.html` for all routes (and `admin.html` for `/admin/*`), or open the admin panel on the API server itself (`https://api.example.com/admin/`, after building there)

Without any API, the static site still works with the bundled content, but orders, tracking, messages and the admin panel need the server.

## Deploy on Cloudflare Pages (no separate server)

The site on Cloudflare Pages can run the whole backend itself (`functions/` + `cloudflare/api.js`) using a free **D1** database: admin panel, orders, live chats, voice messages, calls and WhatsApp alerts.

One-time setup in the Cloudflare dashboard:

1. **Storage & Databases → D1 SQL Database → Create** — name it `digital-saathi`.
2. **Workers & Pages → digitalsaathi → Settings → Bindings → Add → D1 database**: variable name **`DB`**, database `digital-saathi`.
3. **Settings → Variables and Secrets → Add**: `ADMIN_PASSWORD` (type *Secret*) = your admin password. It's used the first time you sign in; change it later in Admin → Settings.
4. **Deployments → latest → Retry deployment** (bindings apply to new deployments).

Then open `/admin` on the site. Tables are created automatically on first use.

Limits compared to the Node server: live updates and call setup are polled (1–3 s delay), class videos are links (YouTube unlisted, Vimeo, Google Drive or .mp4), and voice messages / images are stored in D1 (up to ~1.9 MB each). Set `API_ORIGIN` instead of a D1 binding to forward `/api` to a Node server (e.g. Railway) and use that instead.

## Deploy on Railway (full site + server)

Calls, voice messages, live chats, WhatsApp alerts, class recordings, orders and the admin panel need the Node server, so they don't work on static hosting such as Cloudflare Pages. Railway runs the whole thing:

1. On [railway.com](https://railway.com) create a project → **Deploy from GitHub repo** → pick this repo (branch `main`). `railway.json` sets the build (`npm run build`) and start (`node server.js`) commands.
2. Add a **Volume** to the service, mounted at `/app/storage`.
3. In **Variables** add:
   - `DATA_DIR=/app/storage/data`
   - `UPLOAD_DIR=/app/storage/uploads`
   - `ADMIN_PASSWORD=<your admin password>` (used on the very first start only)
4. In **Settings → Networking** click **Generate Domain** (or add your own domain). Open it, then sign in at `/admin`.

Every push to `main` redeploys. Chats, voice notes, recordings and settings live on the volume and survive redeploys.
