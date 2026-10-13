# Manasvi Modi portfolio

A plain static site: HTML, CSS and a little JavaScript. No build step.

```
index.html              Home
about/index.html        About
work/entripy/index.html Case study: B2B bulk ordering
work/duplin/index.html  Case study: winery
work/rennai/index.html  Case study: luxury beauty
404.html                Not-found page
assets/css/site.css     Shared rules (resume link toggle lives here)
assets/js/dc-lite.js    Small runtime that fills the {{ }} parts of each page
assets/media/           Images and videos
assets/og.jpg           Preview image for link shares
```

## Run it locally

Double-click `index.html`. Every link is relative, so it works straight from the folder.

Or run a local server and open http://localhost:8000:

```
python3 -m http.server 8000
```

## Deploy on Vercel (free)

1. Push this folder to a GitHub repo.
2. In Vercel: Add New, Project, import the repo.
3. Framework preset: Other. Leave build command and output directory empty.
4. Deploy. The site lives at www.manasvimodi.work (domain from GoDaddy, DNS pointed at Vercel). manasvimodi.vercel.app keeps working too.

Every push to the main branch redeploys automatically.

## When the resume is ready

1. Add `resume.pdf` next to `index.html`.
2. In `assets/css/site.css`, delete the `a[data-resume]` rule.

## Editing

Each page keeps its own styles in its `<style>` tag and its behaviour in the
`class Component` script at the bottom. Text is plain HTML, so copy edits are
just text edits.

If the domain ever changes, search the pages for `www.manasvimodi.work` and replace it, so link previews and canonical links point to the right address.
