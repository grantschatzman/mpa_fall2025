# Do Now Writing Activity

**Status:** Architecture planned, not yet implemented
**Documentation:** See Obsidian Vault → Activities → DoNowWriting → Architecture_Outline.md

---

## Quick Overview

This folder will contain a daily writing activity system with AI feedback. Students write short responses to prompts, focusing on specific skills (imagery, grammar, verb tense, etc.), and get immediate feedback from BevBot.

---

## Folder Contents

```
DoNowWriting/
├── README.md (this file)
├── DoNow_Activity.html (coming soon)
└── prompts/
    ├── week1_imagery.json (coming soon)
    ├── week2_grammar.json (coming soon)
    └── ...
```

---

## How It Will Work

### For Teachers
1. Create a JSON prompt file in `prompts/` folder
2. Commit and push to GitHub
3. Share URL: `DoNow_Activity.html?prompt=week1_imagery`

### For Students
1. Click teacher's link
2. See writing prompt and focus area
3. Write response (50-100 words)
4. Get Bev's feedback instantly

---

## Next Steps

See full architecture documentation in Obsidian Vault for implementation details.

**Related:** This builds on the VocabChecker activity's worker architecture.
