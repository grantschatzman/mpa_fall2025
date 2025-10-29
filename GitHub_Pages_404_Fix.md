# GitHub Pages 404 Error - Troubleshooting Guide

**Date:** October 29, 2025
**Issue:** 404 Not Found when visiting GitHub Pages root URL
**Status:** Resolved

---

## Problem

When visiting `https://grantschatzman.github.io/mpa_fall2025/`, users encountered a **404 Not Found** error, even though:
- GitHub Pages was enabled in repository settings
- The repository was public
- All files (HTML, assets) were committed and pushed
- The specific file URL worked: `https://grantschatzman.github.io/mpa_fall2025/TheFounding_Cutscene.html`

## Root Cause

**GitHub Pages requires an `index.html` file in the root directory** to serve as the default landing page.

When you navigate to a GitHub Pages URL without specifying a file:
- GitHub looks for `index.html` in that directory
- If no `index.html` exists, it returns a 404 error
- This happens even if other HTML files exist in the repository

Our repository had:
- ✅ `TheFounding_Cutscene.html`
- ❌ No `index.html`

## How GitHub Pages Serves Files

GitHub Pages serves your entire repository as a static website with the directory structure preserved:

```
Repository root (/)
├── index.html                    → https://example.github.io/repo/
├── TheFounding_Cutscene.html     → https://example.github.io/repo/TheFounding_Cutscene.html
├── Scenes/
│   └── Campus Map.png            → https://example.github.io/repo/Scenes/Campus%20Map.png
├── Sprites/
│   └── FourFounders.png          → https://example.github.io/repo/Sprites/FourFounders.png
└── Music/
    └── track.mp3                 → https://example.github.io/repo/Music/track.mp3
```

**Key Point:** Relative paths in your HTML (like `./Scenes/Campus Map.png`) work because the folder structure is maintained on the web server.

## Solutions

### Solution 1: Use the Full URL (Temporary Fix)
Share the complete file path:
```
https://grantschatzman.github.io/mpa_fall2025/TheFounding_Cutscene.html
```

**Pros:** Works immediately, no code changes needed
**Cons:** Less elegant, requires remembering the full filename

### Solution 2: Create an Index Landing Page (Recommended)
Create an `index.html` that serves as a menu/landing page for all your cutscenes:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Pixel Academy - Cutscenes</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        h1 {
            font-size: 3em;
            margin-bottom: 0.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .cutscene-list {
            list-style: none;
            padding: 0;
        }
        .cutscene-list li {
            margin: 15px 0;
        }
        .cutscene-list a {
            display: block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 1.5em;
            transition: all 0.3s;
            backdrop-filter: blur(10px);
        }
        .cutscene-list a:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <h1>My Pixel Academy</h1>
    <h2>Interactive Cutscenes</h2>
    <ul class="cutscene-list">
        <li><a href="TheFounding_Cutscene.html">Lore: The Founding</a></li>
        <li><a href="EtymologyEscape_Cutscene.html">Etymology Escape</a></li>
        <li><a href="VocabChecker_Cutscene.html">Vocabulary Checker</a></li>
    </ul>
</body>
</html>
```

**Pros:**
- Clean root URL works: `https://grantschatzman.github.io/mpa_fall2025/`
- Professional landing page
- Easy to add more cutscenes
- Better user experience

**Cons:** Requires creating and maintaining the index file

### Solution 3: Auto-Redirect Index (Quick Fix)
Create a minimal `index.html` that automatically redirects to your main cutscene:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=TheFounding_Cutscene.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to cutscene...</p>
    <p>If you are not redirected, <a href="TheFounding_Cutscene.html">click here</a>.</p>
</body>
</html>
```

**Pros:** Simple, automatic redirect
**Cons:** Not great for multiple cutscenes, loses SEO benefits

### Solution 4: Rename File to index.html (Single Cutscene Only)
If you only have one cutscene, rename it:
```bash
git mv TheFounding_Cutscene.html index.html
git commit -m "Rename main cutscene to index.html for GitHub Pages"
git push
```

**Pros:** Simplest solution for single-file projects
**Cons:** Loses descriptive filename, not scalable for multiple cutscenes

## Recommended Approach

For the My Pixel Academy project with multiple cutscenes and activities:

**Use Solution 2** - Create a menu-style `index.html` landing page

This provides:
1. A professional entry point for students
2. Easy navigation between multiple cutscenes
3. Room to grow as you add more content
4. Better organization and discoverability

## Implementation Steps

1. Create `index.html` in the project root directory
2. Add links to all your cutscenes and activities
3. Test locally by opening `index.html` in a browser
4. Commit and push:
   ```bash
   cd "G:/My Drive/My Pixel Academy/Assets/MPA Fall 2025 build"
   git add index.html
   git commit -m "Add landing page index.html for GitHub Pages"
   git push
   ```
5. Wait 1-2 minutes for GitHub Pages to rebuild
6. Test the root URL: `https://grantschatzman.github.io/mpa_fall2025/`

## Key Takeaways

1. ⚠️ **Always create an `index.html` file** for GitHub Pages projects
2. 📁 GitHub Pages preserves your directory structure
3. 🔗 Direct file URLs always work: `https://username.github.io/repo/filename.html`
4. 🏠 Root URL without `index.html` returns 404: `https://username.github.io/repo/`
5. 📋 Use `index.html` as a landing page/menu for multi-file projects

## Future Reference

**Before deploying to GitHub Pages, checklist:**
- [ ] Repository is public (or you have GitHub Pro for private Pages)
- [ ] `index.html` exists in the root directory
- [ ] All asset paths are relative (e.g., `./Scenes/file.png`)
- [ ] File names match case-sensitivity (Linux servers are case-sensitive)
- [ ] GitHub Pages is enabled in Settings → Pages
- [ ] Source is set to correct branch (usually `main`) and folder (`/ (root)`)

---

*Issue discovered and resolved on October 29, 2025*
