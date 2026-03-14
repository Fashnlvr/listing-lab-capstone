# Listing Lab

Listing Lab is a fully client-side prototype that helps secondhand sellers create resale listings faster. It combines a guided intake form, pricing guidance, live listing preview, and export-ready copy in a responsive web app that runs on GitHub Pages.

## Purpose

The project demonstrates a practical front-end workflow for listing creation without requiring a backend. Users can:
- search eBay sold comps from the listing builder to assess market value,
- apply a comp-based median price or formula fallback pricing,
- generate smarter keyword suggestions from comparable listings,
- save drafts and listings locally,
- review/edit listings from a dashboard,
- export all saved listings as CSV.

## Inspiration

The app is inspired by the repetitive work involved in listing items across resale platforms. The goal was to build a lightweight browser tool that reduces friction in intake and copywriting while keeping the architecture simple enough for a static deployment.

## Core Features

- Responsive UI using Bootstrap 5 grid/components.
- Modular HTML, CSS, and vanilla JavaScript structure.
- LocalStorage persistence for:
  - saved listings,
  - listing drafts.
- eBay sold-comps integration on the Create Listing page.
- USPS rates integration on the Smart Templates page.
- Formula pricing fallback based on category, condition, and brand.
- Condition reference guidance linked directly under condition selection.

## Technologies Used

- HTML5
- CSS3
- Bootstrap 5.3
- Vanilla JavaScript (ES6+)
- Browser LocalStorage
- External APIs:
  - eBay Finding API (`findCompletedItems`)
  - USPS Web Tools Rate API (`RateV4`)

## File Structure

- `index.html` - landing page
- `new-listing.html` - listing builder + eBay comps + formula pricing + live preview
- `dashboard.html` - saved listings table + CSV export
- `listing.html` - listing detail and actions
- `about.html`, `features.html`, `how-it-works.html`, `pricing.html`, `templates.html`, `integrations.html` - informational pages
- `styles.css` - custom styles layered on Bootstrap
- `script.js` - client-side app logic

## Running Locally

Open `index.html` in a browser, or use a simple static server.

Example:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. Go to repository `Settings` > `Pages`.
3. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main` (or your default branch), folder `/ (root)`
4. Save and wait for deployment.
5. Your site will be available at:
   `https://<your-username>.github.io/<repo-name>/`

## API Notes

- eBay pricing research uses app-side config in `config.js` (not user-entered credentials).
- In frontend/demo mode, the app can fall back to sample comps and shows: "Live eBay comps are unavailable in this demo."
- USPS shipping templates require a USPS Web Tools User ID.
- API requests are asynchronous and fail gracefully.
- If APIs fail or credentials are unavailable, formula pricing and manual workflows still work.

## Repository

- GitHub: https://github.com/Fashnlvr/listing-lab-capstone
- GitHub Pages: https://fashnlvr.github.io/listing-lab-capstone/
