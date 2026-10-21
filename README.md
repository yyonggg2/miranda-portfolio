# Miranda's Journey

## About

My personal portfolio at [mirandayong.com](http://mirandayong.com/). The idea is that life is a journey. Inspired by Dora the Explorer, visitors learn about my projects, experiences, and taste through the items in my backpack.

The site is being rebuilt from scratch as a 3D experience. The earlier version (2D pages with hand drawn buttons) is kept in the git history.

## The New Direction

The home page is a low-poly Three.js scene:

- A backpack sits in the center, and items orbit around it on an ellipse
- Items in front look bigger, items in the back look smaller and lighter, so the scene has depth
- Hover an item and the orbit pauses, the item grows and glows, and its name shows up
- Clicking an item only logs its name to the console for now

## Status

Work in progress. The project was just cleared out, and the new scene has not been built yet.

## Tech Stack

- Plain HTML, CSS, and JavaScript, no framework and no build tools
- Three.js loaded from a CDN with an import map
- Opens with the VS Code Live Server extension
- Every 3D object is made from basic shapes only, no downloaded models

## What's Next

- Set up the Three.js scene and the orbit and hover logic
- Build each item as its own low-poly object
- Add the About page, journal, and project pages
