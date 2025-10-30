# Setting Up Google Sheets for Do Now Submissions

This guide will help you collect student Do Now writing submissions in a Google Sheet.

---

## Step 1: Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **"Blank"** to create a new spreadsheet
3. Name it: **"Do Now Writing Submissions - Fall 2025"** (or whatever you prefer)

### Add Column Headers

In the first row, add these headers:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| **Timestamp** | **Student Name** | **Prompt Name** | **Prompt Text** | **Student Writing** | **Word Count** | **Teacher Notes** |

**Formatting tips:**
- Make row 1 bold
- Freeze row 1 (View → Freeze → 1 row) so headers stay visible
- Adjust column widths:
  - A: 140px (Timestamp)
  - B: 120px (Name)
  - C: 120px (Prompt Name)
  - D: 300px (Prompt Text)
  - E: 500px (Student Writing)
  - F: 80px (Word Count)
  - G: 200px (Notes)

---

## Step 2: Create the Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. A new tab will open with a code editor
3. Delete any existing code
4. Copy the code from `GoogleAppsScript_DoNowSubmissions.js` in this folder
5. Paste it into the Apps Script editor
6. Click **💾 Save** (or Ctrl+S)
7. Name the project: **"Do Now Submissions Handler"**

---

## Step 3: Deploy as Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **"Web app"**
4. Configure the deployment:
   - **Description:** "Do Now Writing Receiver" (optional)
   - **Execute as:** **Me** (your email)
   - **Who has access:** **Anyone**

   ⚠️ **Important:** Choose "Anyone" so students can submit without signing in

5. Click **Deploy**
6. A dialog will pop up asking for permissions:
   - Click **"Review permissions"**
   - Choose your Google account
   - Click **"Advanced"** → **"Go to Do Now Submissions Handler (unsafe)"**
   - Click **"Allow"**

7. **Copy the Web App URL** that appears - it will look like:
   ```
   https://script.google.com/macros/s/ABC123.../exec
   ```

   Keep this URL handy!

---

## Step 4: Add the URL to Your Activity

1. Open the file: `Activities/DoNowWriting/DoNow_Activity.html`
2. Find this line near the top of the `<script>` section:
   ```javascript
   submissionUrl: '' // TEACHER: Add your Google Apps Script Web App URL here
   ```
3. Paste your Web App URL between the quotes:
   ```javascript
   submissionUrl: 'https://script.google.com/macros/s/ABC123.../exec'
   ```
4. Save the file
5. Commit and push to GitHub:
   ```bash
   git add Activities/DoNowWriting/DoNow_Activity.html
   git commit -m "Add submission URL for Do Now Writing"
   git push
   ```

---

## Step 5: Test It!

1. Wait 1-2 minutes for GitHub Pages to rebuild
2. Visit your Do Now activity URL (e.g., `DoNow_Activity.html?prompt=week1_imagery`)
3. Enter your name
4. Write a short test sentence
5. Click **"Submit to Teacher"**
6. Confirm the submission
7. Check your Google Sheet - you should see a new row!

---

## Using the Sheet

### Viewing Submissions

Your sheet will automatically populate with:
- **Timestamp** - When the student submitted
- **Student Name** - Who submitted it
- **Prompt Name** - Which week/prompt (e.g., "week1_imagery")
- **Prompt Text** - The full writing prompt
- **Student Writing** - Their complete response
- **Word Count** - How many words they wrote
- **Teacher Notes** - (Empty) - Add your own notes, scores, comments here

### Filtering and Sorting

**Filter by prompt:**
- Click Data → Create a filter
- Click the filter icon on "Prompt Name" column
- Select which prompt(s) you want to see

**Sort by student:**
- Highlight your data
- Click Data → Sort range
- Sort by "Student Name" A→Z

### Exporting for Grading

**Export to Google Classroom:**
1. File → Download → Microsoft Excel (.xlsx)
2. Upload to Google Classroom as an assignment attachment

**Export individual student work:**
1. Use filters to find their submissions
2. Copy their writing
3. Paste into your grading tool

---

## Troubleshooting

### "Submission URL not configured" message

**Problem:** Students see this after submitting
**Fix:** You forgot to add the Web App URL to `DoNow_Activity.html` (see Step 4)

### "Failed to submit to Google Sheets" error

**Problem:** The script can't write to the sheet
**Possible causes:**
1. Wrong URL in the HTML file
2. Apps Script not deployed as "Anyone" can access
3. Sheet permissions issue

**Fix:**
1. Check the URL is correct
2. Redeploy the Apps Script with "Anyone" access
3. Make sure the script has permission to write to your sheet

### Duplicate submissions appearing

**Problem:** Student clicked submit multiple times
**Fix:** This is normal! Students can submit multiple revisions. You can delete duplicate rows or just keep the latest timestamp.

### Script permissions expired

**Problem:** Sheet stops receiving submissions after a few months
**Fix:** Go to Apps Script → Deploy → Manage deployments → Click "Edit" → Redeploy

---

## Privacy & Security Notes

- ✅ **Students don't need Google accounts** - The script accepts submissions from anyone
- ✅ **API key is secure** - Students can't see your API key (it's on Cloudflare)
- ✅ **Sheet is private** - Only you can view the submission sheet
- ⚠️ **Students can submit as anyone** - They could enter a fake name. Use Google Classroom if this is a concern.

---

## Optional: Add Automatic Grading

You can add formulas in column G (Teacher Notes) to auto-grade:

**Word count check:**
```
=IF(F2>=70, "Met word count ✓", "Below minimum ✗")
```

**Auto-score:**
```
=IF(F2>=70, 10, IF(F2>=50, 7, 5))
```

---

## Questions?

If you run into issues:
1. Check that all steps were followed exactly
2. Test with a simple submission first
3. Check the Apps Script logs (View → Logs in Apps Script editor)
4. Make sure your Web App URL ends with `/exec`

---

**Setup complete!** 🎉 You're now collecting student writing submissions automatically!
