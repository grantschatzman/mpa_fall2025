# Vocabulary Checker - Cloudflare Worker Setup

This worker securely handles Claude API calls for the Vocabulary Checker activity without exposing your API key to students.

## Prerequisites

- Node.js installed (to run npm commands)
- A Cloudflare account (free tier is sufficient)
- Your Claude API key from console.anthropic.com

## One-Time Setup (15 minutes)

### Step 1: Install Wrangler CLI

Open a terminal and run:
```bash
npm install -g wrangler
```

This installs Cloudflare's deployment tool globally.

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window asking you to authorize Wrangler. Click "Allow" and return to the terminal.

### Step 3: Deploy the Worker

Navigate to this folder:
```bash
cd "G:/My Drive/My Pixel Academy/Assets/MPA Fall 2025 build/Activities/VocabChecker/vocab-worker"
```

Deploy the worker:
```bash
wrangler deploy
```

You'll see output like:
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded vocab-checker (X.XX sec)
Published vocab-checker (X.XX sec)
  https://vocab-checker.YOUR-SUBDOMAIN.workers.dev
```

**IMPORTANT:** Copy that URL! You'll need it in Step 5.

### Step 4: Add Your Claude API Key as a Secret

```bash
wrangler secret put CLAUDE_API_KEY
```

When prompted, paste your Claude API key and press Enter.

**Security Note:** The key is encrypted and stored securely in Cloudflare. It's never visible in your code or to students.

### Step 5: Update VocabChecker_Activity.html

Open `VocabChecker_Activity.html` in your editor.

Find line 748 (or search for `validateWithClaude` function):
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
```

Change it to your worker URL:
```javascript
const response = await fetch('https://vocab-checker.YOUR-SUBDOMAIN.workers.dev', {
```

**Also change the request body** (line 755-762) from:
```javascript
body: JSON.stringify({
    model: 'claude-3-haiku-20240307',
    max_tokens: 200,
    messages: [{
        role: 'user',
        content: prompt
    }]
})
```

To:
```javascript
body: JSON.stringify({
    word: word,
    sentence: sentence,
    hint: hint
})
```

The worker will handle constructing the Claude API call internally.

### Step 6: Test Locally

Open `VocabChecker_Activity.html` in your browser and test with a vocabulary word. The worker should now handle all API calls.

### Step 7: Deploy to GitHub Pages

```bash
cd "G:/My Drive/My Pixel Academy/Assets/MPA Fall 2025 build"
git add VocabChecker_Activity.html
git commit -m "Update VocabChecker to use secure Cloudflare Worker backend"
git push
```

Wait 1-2 minutes for GitHub Pages to rebuild, then test the live URL!

## Architecture

```
Student Browser
    ↓ (sends: word, sentence, hint)
Cloudflare Worker (https://vocab-checker.*.workers.dev)
    ↓ (uses secure CLAUDE_API_KEY environment variable)
Claude API
    ↓ (returns: validation result)
Cloudflare Worker
    ↓ (returns: result to student)
Student Browser
```

## Updating the Worker

If you need to make changes to `worker.js`:

1. Edit the file
2. Run `wrangler deploy` again
3. No other steps needed - changes are live immediately!

## Monitoring Usage

View worker analytics at:
https://dash.cloudflare.com → Workers & Pages → vocab-checker → Metrics

You can see:
- Number of requests
- Success/error rates
- Response times

## Cost Breakdown

- **Cloudflare Workers:** FREE (up to 100,000 requests/day)
- **Claude API:** ~$0.001-0.01 per sentence validation
- **GitHub Pages:** FREE

**Total new cost:** $0 for the infrastructure

## Troubleshooting

### "Worker not found" error
- Make sure you deployed with `wrangler deploy`
- Check the URL matches exactly (including https://)

### "Authentication error" from Claude
- Your API key secret might not be set correctly
- Run `wrangler secret put CLAUDE_API_KEY` again

### CORS errors in browser console
- The worker has CORS enabled for all origins (*)
- If you still see errors, make sure you're using POST requests

### "Method not allowed"
- The worker only accepts POST requests
- Make sure the fetch call in VocabChecker_Activity.html uses `method: 'POST'`

## Security Benefits

✅ API key never exposed to students
✅ Students can't view or steal your key
✅ You can monitor all usage in Cloudflare dashboard
✅ You can rate-limit or block abuse if needed
✅ Key is encrypted at rest in Cloudflare

## Future Enhancements

- Add rate limiting (e.g., max 10 requests per minute per student)
- Log all validations for teacher review
- Add authentication for specific classrooms
- Track which words students struggle with most

---

*Created: October 29, 2025*
*Part of My Pixel Academy project*
