
---

```markdown
# xyxyzwn-site (Codex Agent Guide)

---

## 0. Agent Execution Rules (CRITICAL)

This file defines how AI coding agents (Codex) are allowed to interact with this repository.

### 0.1 Scope Limitation

The agent must only modify files directly related to the requested task.

It must NOT:
- restructure the project unless explicitly requested
- delete unrelated modules
- modify deployment configuration (e.g. Nginx) unless explicitly requested
- introduce new architecture patterns without approval

---

### 0.2 Build Output Safety Rule

These directories are BUILD OUTPUTS and must NEVER be manually edited:

- site/public (Hugo output)
- apps/game/dist (Vite output)

If changes are needed:
- modify source code only
- regenerate using build commands

---

### 0.3 Deployment Assumption

Production serves only static built files:

- Hugo → site/public
- Vite → apps/game/dist

No backend runtime exists.

Agents must always assume static hosting only.

---

### 0.4 Change Discipline Rule

All modifications must follow minimal diff principle:

- Prefer smallest possible change
- Avoid unrelated refactoring
- Preserve existing structure unless required

---

### 0.5 Priority Order

If conflicts exist:

1. Production stability
2. Existing architecture
3. Requested feature
4. Code quality improvements

---

## 1. Project Overview

This is a multi-module personal website project based on a static site architecture:

- Hugo: main website (blog / content system)
- Vite: game / sub-application module
- Git: version control for the entire project
- WSL Ubuntu: local development environment
- Nginx: production web server

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
├── public/              # build output directory (DO NOT EDIT)
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
├── dist/                # production build output (DO NOT EDIT)
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

They are fully independent systems.

Integration happens only at deployment level.

---

## 6. Git Management

Entire repository:

```
xyxyzwn-site/
```

Workflow:

```bash
git add .
git commit -m "update"
git push
```

---

## 7. Local Development Workflow

### Hugo

```bash
cd site
hugo server
```

### Game

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

## 9. Key Rules (HARD RULES)

### Hugo Rules

* Content edits go to `content/`
* Layouts go to `layouts/`
* Static assets go to `static/`
* NEVER edit `public/` manually

### Vite Rules

* Source code goes to `src/`
* Static assets go to `public/`
* NEVER edit `dist/` manually

---

## 10. Production Deployment Assumptions

Nginx serves only built outputs:

* `/` → site/public
* `/game` → apps/game/dist

No runtime server logic exists.

---

## 11. Nginx Integration Rule

Game app must always use:

```js
base: "/game/"
```

to ensure correct routing under subpath deployment.

---

## 12. Project Purpose

This project serves as:

* Personal website
* Blog system
* Game showcase platform
* Multi-module static web architecture

---

## 13. Future Extensions

Possible expansions:

* Additional apps under `/apps`
* CI/CD automation (GitHub Actions)
* HTTPS (Let’s Encrypt)
* Docker deployment
* AI-assisted development workflow (Codex automation)

---

