# Do Now Writing Activity

**Status:** ✅ Live and deployed
**Documentation:** See Obsidian Vault → Activities → DoNowWriting → Architecture_Outline.md

---

## Quick Overview

A daily writing activity system with AI feedback and automatic submission to Google Sheets. Students write short responses to prompts, focusing on specific skills (imagery, grammar, verb tense, etc.), get immediate feedback from BevBot, and submit directly to the teacher.

---

## Folder Contents

```
DoNowWriting/
├── README.md (this file)
├── DoNow_Activity.html (main activity)
├── SETUP_GOOGLE_SHEETS.md (teacher setup guide)
├── GoogleAppsScript_DoNowSubmissions.js (Apps Script code)
└── prompts/
    ├── week1_imagery.json
    ├── week2_vividVerbs.json
    ├── week3_sentenceVariety.json
    ├── week4_complexity.json
    ├── week5_elaboration.json
    └── week6_evidence.json
```

---

## How It Works

### For Teachers

**First-time setup (15 minutes):**
1. Follow the guide in `SETUP_GOOGLE_SHEETS.md`
2. Create a Google Sheet to collect submissions
3. Deploy the Apps Script
4. Add the Web App URL to `DoNow_Activity.html`
5. Push to GitHub

**Daily use (30 seconds):**
1. Share URL with students: `DoNow_Activity.html?prompt=week1_imagery`
2. Check Google Sheet for submissions throughout class
3. Add notes/scores in the "Teacher Notes" column

### For Students

1. Click teacher's link
2. Enter their name
3. See writing prompt and focus area
4. Write response (50-100 words)
5. Click "Check My Writing" for formative feedback (as many times as needed)
6. Click "Submit to Teacher" when done
7. Get grammar/spelling feedback from BevBot
8. Writing automatically sent to teacher's Google Sheet

---

## Features

✅ **N+1 Pedagogy** - "Check" button gives iterative feedback to keep students writing
✅ **Grammar Check** - "Submit to Teacher" provides discrete bullet points of issues to watch
✅ **Auto-Collection** - Submissions go directly to your Google Sheet
✅ **Multiple Revisions** - Students can check and revise as many times as needed
✅ **12 Focus Areas** - Based on Common Core ELA standards for grades 6-8
✅ **Easy Prompt Management** - Just add JSON files and share new URLs

---

## Example URLs

```
Week 1 (Imagery):
https://grantschatzman.github.io/mpa_fall2025/Activities/DoNowWriting/DoNow_Activity.html?prompt=week1_imagery

Week 2 (Vivid Verbs):
https://grantschatzman.github.io/mpa_fall2025/Activities/DoNowWriting/DoNow_Activity.html?prompt=week2_vividVerbs

Week 3 (Sentence Variety):
https://grantschatzman.github.io/mpa_fall2025/Activities/DoNowWriting/DoNow_Activity.html?prompt=week3_sentenceVariety
```

See `SETUP_GOOGLE_SHEETS.md` for complete setup instructions.

---

**Related:** This builds on the VocabChecker activity's worker architecture.
