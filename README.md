# Digital Saathi

Website for **Digital Saathi**: online courses, editing tools, expert teachers, and creative services (graphic design, video editing, Facebook boost).

It's a static site in plain HTML, CSS and JavaScript. There's no build step and no dependencies.

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

## Editing content

All content is in **`assets/js/data.js`**:

- `SITE`: phone, WhatsApp number, email, address, social links (Facebook, TikTok, WhatsApp)
- `OFFER`: the daily discount. The countdown ends at midnight Nepal time and restarts every day; set `enabled: false` to hide all timers
- `SOFTWARE`: the app tiles (Pr, Ae, CapCut, DaVinci) shown on titles packs
- `COURSES`, `TOOLS`, `TEACHERS`: add or edit entries and the pages update automatically
- `SERVICES`: pricing packages for design, video and boost
- `BOOST`: NPR rate per $1 of ad spend and the reach/result estimates for the calculator
- `TESTIMONIALS`, `FAQS`

**Teacher photos:** placeholder illustrations live in `assets/img/teachers/`. Replace each with a real photo (e.g. `aarav.jpg`) and update that teacher's `photo` path.

**Before going live, replace the placeholder email in `SITE`.**

## How orders work

The site has no backend yet. The cart is stored in the visitor's browser. Checkout, the contact form, the teacher application and every "Order via WhatsApp" button open WhatsApp with the details already filled in, sent to the number in `SITE.whatsapp`.

Next steps for a full platform: eSewa/Khalti payment gateway integration, student login and course video hosting.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Upload the folder to any static host: Netlify, Vercel, Cloudflare Pages, GitHub Pages, or cPanel `public_html`.
