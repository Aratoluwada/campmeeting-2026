# Homecoming & Campmeeting 2026 Attendance Generator

A mobile-first React + Vite app for City Harvest Church International. Visitors enter their first name, upload a photo, drag/zoom to position it, generate a personalized attendance PNG, and share the image or a prewritten WhatsApp message.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To make a production build:

```bash
npm run build
npm run preview
```

## Template artwork

The project includes a custom SVG starter template at `public/assets/attendance-template.svg`, styled in navy, purple, cream and gold. It is a placeholder inspired by the event flyer, not a pixel-perfect export of your Canva artwork.

To use your final Canva design, export the design as a high-resolution PNG and save it as `public/assets/attendance-template.png`. Then update `TEMPLATE_URL` in `src/App.jsx` to `/assets/attendance-template.png`.

**Important:** the dynamic photo/name coordinates are currently set for the included starter template. If you replace it with the exact Canva artwork, adjust `PHOTO_FRAME`, `NAME_FRAME`, and the percentage positions used by `.poster-person` and `.poster-name` in `src/App.css` so the live preview and exported PNG line up with the white photo/name spaces in the new artwork.

All uploaded photos are processed locally in the browser. The app does not send photos to a server or store them in a database. Native image sharing depends on browser/device support; otherwise the user can download the PNG and share it manually.

## Deploy to Vercel

Import the project repository into Vercel. Vite defaults should be detected automatically; build command `npm run build`, output directory `dist`.
