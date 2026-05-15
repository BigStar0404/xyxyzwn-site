```markdown
# xyxyzwn-site (Local Development Guide)

## 1. Project Overview

This is a multi-module personal website project based on a static site architecture:

- Hugo: main website (blog / content system)
- Vite: game / sub-application module
- Git: version control for the entire project
- WSL Ubuntu: local development environment

---

## 2. Local Directory Structure

Root directory:

```

~/projects/xyxyzwn-site

```

Project structure:

```

xyxyzwn-site/
├── site/                # Hugo main site
├── apps/
│   └── game/            # Vite game sub-project
└── deploy/              # optional deployment scripts

```

---

## 3. Hugo Main Site (site)

### Location

```

~/projects/xyxyzwn-site/site

```

### Structure

```

site/
├── archetypes/          # content templates
├── assets/              # SCSS / JS assets
├── content/             # markdown content
├── layouts/             # layout templates
├── static/              # static files (images, etc.)
├── themes/              # Hugo theme (hugo-theme-stack)
├── resources/           # generated cache files
├── public/              # build output directory (auto-generated)
├── hugo.yaml            # Hugo configuration file

````

### Local Development

```bash
hugo server
````

Access:

```
http://localhost:1313
```

### Production Build

```bash
hugo
```

Output:

```
site/public/
```

---

## 4. Vite Game Project (apps/game)

### Location

```
~/projects/xyxyzwn-site/apps/game
```

### Structure

```
game/
├── src/                 # source code
├── public/              # static assets
├── dist/                # production build output
├── index.html
├── package.json
├── vite.config.js
```

### Development Mode

```bash
npm install
npm run dev
```

Access:

```
http://localhost:5173
```

---

### Production Build

```bash
npm run build
```

Output:

```
apps/game/dist/
```

---

## 5. Relationship Between Hugo and Game

This project uses a multi-application architecture:

* `/site` → main Hugo website
* `/apps/game` → Vite sub-application

They are fully independent:

* Hugo does not depend on Vite
* Vite does not depend on Hugo

Integration happens at deployment level:

* Hugo serves as the main entry site
* Game is mounted as a sub-path module

---

## 6. Git Management

Entire repository:

```
xyxyzwn-site/
```

Basic workflow:

```bash
git add .
git commit -m "update"
git push
```

---

## 7. Local Development Workflow

### Hugo workflow

```bash
cd site
hugo server
```

### Game workflow

```bash
cd apps/game
npm run dev
```

---

## 8. Build Workflow

### Hugo build

```bash
cd site
hugo
```

Output:

```
site/public
```

---

### Vite build

```bash
cd apps/game
npm run build
```

Output:

```
apps/game/dist
```

---

## 9. Key Rules

### Hugo

* Content edits go to `content/`
* Layouts go to `layouts/`
* Theme files are in `themes/`
* Never edit `public/` directly

### Vite

* Source code in `src/`
* Static assets in `public/`
* Never edit `dist/` directly

---

## 10. Project Purpose

This project is designed as:

* Personal website
* Blog system
* Game showcase platform
* Extensible multi-app architecture

---

## 11. Future Extensions

Possible expansions:

* Additional sub-apps under `/apps`
* Backend API integration
* CI/CD automated deployment
* Component-based content system

```
```

