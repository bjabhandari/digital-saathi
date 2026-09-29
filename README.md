# Digital Saathi

Website for **Digital Saathi**: online courses, editing tools, expert teachers, and creative services (graphic design, video editing, Facebook boost).

The site is plain HTML, CSS and JavaScript (no build step), served by a small Node.js server (`server.js`) that adds an **admin panel**, **order tracking**, contact messages, image uploads and a **help chat**.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Courses (search, filter, sort) | `courses.html` |
| Course detail | `course.html?id=<course-id>` |
| Editing tools + neon **Titles** store | `tools.html` (`#titles`) |
| Product detail (titles packs & tools) | `product.html?id=<tool-id>` |
| Service detail (design / video / boost) | `service.html?id=design` · `video` · `boost` |
| Teacher profile + 1:1 mentorship | `teacher.html?id=<teacher-id>` |
| Services + pricing (Design / Video / FB Boost) | `services.html` (supports `#design`, `#video`, `#boost`) |
| Teachers + "Become a teacher" form | `teachers.html` |
| Contact + FAQ | `contact.html` |
| Cart & checkout | `cart.html` |
| Order tracking | `track.html?id=<order-id>` |
| Admin panel | `/admin/` |

## Brand

- **Logo green `#7CC15A`** (sampled from the logo) for accents, highlights and fills
- Deeper greens `#3F8F27` / `#2F7219` for buttons and text, so they stay readable
- Forest `#0E2616` for dark sections, lime `#D4F27A` for highlights on dark
- Fonts: **Oswald** for headings (echoes the logo's "DIGITAL" lettering), **Outfit** for body text, **Kalam** for Devanagari accents
- Logo files in `assets/img/`: `logo.png` (full badge), `wordmark.png` (header), white versions for dark backgrounds, and favicons

## Animations & interactive features

- Logo preloader (first visit per session), scroll progress bar, header that shrinks on scroll, soft page transitions
- Hero with line-by-line headline reveal, rotating words, spinning orbit around the logo, floating cards and animated blobs
- Skills marquee, counters that count up, staggered scroll reveals, 3D card tilt on hover, animated FAQ/curriculum accordions
- Add-to-cart "fly to cart" animation, sliding tab indicator, auto-playing testimonial slider
- **Facebook Boost calculator** (`services.html#calculator`) with live reach/price estimates; tune its numbers in `BOOST` in `data.js`
- Form validation with an animated success state
- Everything respects the visitor's "reduce motion" setting

## Admin panel

Open **http://localhost:8000/admin/** and sign in. The first time the server starts it prints the admin password in the terminal (or set `ADMIN_PASSWORD` before the first start). Change it in **Settings**, or run `npm run set-password -- <new password>`.

- **Dashboard**: active orders, confirmed revenue, unread messages, orders by stage
- **Orders**: every checkout creates an order with an ID like `DS-AB12CD`. Open one to move it through the stages (Received → Payment confirmed → In progress → Client review → Delivered), set the progress %, say who's working on it, add a delivery/preview link and send a note. The customer sees all of it on the tracking page. **WhatsApp update** opens a ready-made message with the tracking link.
- **Messages**: contact form messages and teacher applications, with WhatsApp/email reply buttons
- **Website content**: edit services (images, showcase, packages), courses (cover images), editing tools, teachers, testimonials, FAQs, help-chat answers, contact info, daily offer, boost calculator. Upload images directly (PNG/JPG/WEBP/GIF, resized automatically). Changes go live as soon as you save.

## Order tracking

After checkout the customer gets an order ID and a **Track my order** button. On `track.html` they enter the ID and their phone number to see the progress bar, stage steps, who's working on it, the delivery link and a timeline of updates. The page refreshes every minute while the order is active. Orders placed from a browser are remembered there, so returning customers see them listed.

## Help chat

A chat button on every page answers questions about services, prices, courses, tools and how to order, using the site content, and can check an order's status. Add extra answers in **Admin → Help chat**.

For AI answers to any question, start the server with an Anthropic API key (needs **Node 18+**):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

The chat then uses Claude (`claude-opus-5-5`) with your website content as its knowledge. Order lookups still go through the built-in tracker.

## Editing content

Content starts out in **`assets/js/data.js`**. On first start the server copies it into `data/content.json`, and from then on you edit it in the admin panel (use **Restore default** in a section to reload it from `data.js`):

- `SITE`: phone, WhatsApp number, email, address, social links (Facebook, TikTok, WhatsApp)
- `OFFER`: the daily discount. The countdown ends at midnight Nepal time and restarts every day; set `enabled: false` to hide all timers
- `SOFTWARE`: the app tiles (Pr, Ae, CapCut, DaVinci) shown on titles packs
- `COURSES`, `TOOLS`, `TEACHERS`: add or edit entries and the pages update automatically
- `SERVICES`: pricing packages, illustration (`image`) and "Recent work" images (`showcase`) for design, video and boost
- `COURSES[].images`: 1–3 cover images per course, shown as an animated 3D stack
- `CHATBOT`: help-chat greeting, quick replies and extra answers
- `BOOST`: NPR rate per $1 of ad spend and the reach/result estimates for the calculator
- `TESTIMONIALS`, `FAQS`

**Teacher photos:** placeholder illustrations live in `assets/img/teachers/`. Replace each with a real photo (e.g. `aarav.jpg`) and update that teacher's `photo` path.

**Before going live, replace the placeholder email in `SITE`.**

**Service images** live in `assets/img/services/`: one illustration per service (`design.svg`, `video.svg`, `boost.svg`) and six "Recent work" images each. Replace them from the admin panel with real work.

## How orders work

Visitors add courses, tools or service packages to the cart. At checkout the server saves the order (prices are looked up on the server, not taken from the browser) and returns an order ID. The customer then sends payment details on WhatsApp. Contact and teacher forms are saved to **Admin → Messages** and still open WhatsApp as before.

If the site is opened without the server (plain static hosting), checkout and forms fall back to WhatsApp only.

Next steps for a full platform: eSewa/Khalti payment gateway integration, student login and course video hosting.

## Run locally

```bash
npm install
npm start
# site:  http://localhost:8000
# admin: http://localhost:8000/admin/
```

Set `PORT` to use another port.

## Data & backups

- `data/content.json`: website content edited in the admin panel
- `data/orders.json`, `data/messages.json`: orders and messages
- `data/admin.json`: admin password hash
- `uploads/`: images uploaded in the admin panel

These are not committed to git. Back up `data/` and `uploads/` regularly.

## Deploy

The admin panel, tracking and chat need a Node.js host with a persistent disk, e.g. a VPS, Render, Railway or cPanel with Node.js support. Run `npm install --omit=dev && npm start` (or use a process manager like pm2), and put it behind HTTPS. Purely static hosts (Netlify, GitHub Pages) can still serve the public pages, but without the admin panel, tracking or saved orders.
