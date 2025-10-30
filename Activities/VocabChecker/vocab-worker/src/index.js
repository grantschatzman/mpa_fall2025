// Cloudflare Worker for My Pixel Academy Activities
// This worker securely calls the Claude API without exposing the API key to students
// Handles multiple activity types: vocab checker, do now writing, etc.

export default {
  async fetch(request, env) {
    // CORS headers to allow requests from GitHub Pages
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Parse the request body
      const body = await request.json();
      const { activityType } = body;

      // Route to appropriate handler
      let prompt, maxTokens;

      if (activityType === 'doNowWriting') {
        const validation = validateDoNowRequest(body);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        prompt = buildDoNowPrompt(body);
        maxTokens = 300;
      } else {
        // Default to vocab checker (backwards compatibility)
        const { word, sentence, hint } = body;

        // Validate required fields for vocab
        if (!word || !sentence) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: word and sentence' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        prompt = buildVocabPrompt(word, sentence, hint);
        maxTokens = 200;
      }

      // Call Claude API with secure key from environment variable
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      // Check if Claude API call was successful
      if (!claudeResponse.ok) {
        const errorData = await claudeResponse.json();
        console.error('Claude API error:', errorData);
        return new Response(
          JSON.stringify({
            error: 'API validation failed',
            details: errorData.error?.message || 'Unknown error'
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return Claude's response to the student
      const data = await claudeResponse.json();
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};

// Helper function to build vocab checker prompt
function buildVocabPrompt(word, sentence, hint) {
  return `You are Bev, the thoughtful robotic director of the Wordworking Lab at My Pixel Academy. You're kind but measured, like Roz in The Wild Robot. You help students exercise vocabulary words (like sheepdogs that need work to stay healthy). You give only simply and direct praise; you don't flatter or give multi-sentence fluff. You are kind but thoughtful, so that your praise means something when it arrives. You pay close attention to the rules of your task.

Word: "${word}"
${hint ? `Definition/Hint: "${hint}"` : ''}
Student's sentence: "${sentence}"

Check if the word is used correctly (correct meaning, proper grammar, demonstrates understanding). Note the threshold for "demonstrating understanding": "Your shoes are shabby" does not demonstrate understanding of the word "shabby", since it can be replaced by any adjective. Likewise, "How cryptic!", despite being a common phrase, doesn't show understanding of what the word actually means; it could just as easily say, "How purple!". In this case, the student should be prompted to "say more" in order to show they know what "shabby" actually means: "Your shoes are too shabby for such a nice restaurant!" Here, the contrast is evident from the context, placing "shabby" (correctly!) as an antonym to "nice".

IMPORTANT: Do not use any names for the student. You don't know who they are. Refer to their sentence or word usage directly.

Respond in this EXACT format:
CORRECT: YES, NO, or ALMOST
FEEDBACK: [1-2 sentences following these rules]

If CORRECT: Give creative, varied praise. Occasionally mention the word "working" or sheepdog metaphor. Examples: "Excellent! That word is practically glowing now." "Perfect! I can picture that scene clearly." "Nicely shaped! Like a sheepdog who found its flock, that word is right where it belongs."

If INCORRECT: Use Socratic questions to guide without giving example sentences. AGAIN: NEVER GIVE EXAMPLE SENTENCES USING THE TARGET WORD. Point to the problem without stating the solution. For meaning errors, ask how the word would look/act. For grammar errors, ask about word form. For nonsense, use gentle humor. Examples: "Hmm, if someone is ${word}, how would they move?" "You're describing how something happens - what action could happen that way?" "That's a puzzler - what kinds of things can do that?"

If ALMOST: Warmly prompt to say more or revise the sentence. Example: "Hmm, maybe...but that sentence seems like it could fit all sorts of words. Let's revise to make it specific to just this word! What could you add to show what [word] really means?"
Stay concise, warm, and assume capability. 5th-8th grade level.`;
}

// Helper function to validate do now writing request
function validateDoNowRequest(body) {
  const { mode, writingPrompt, studentText } = body;

  if (!mode || !writingPrompt || !studentText) {
    return { valid: false, error: 'Missing required fields for Do Now Writing' };
  }

  if (mode !== 'check' && mode !== 'submit') {
    return { valid: false, error: 'Invalid mode. Must be "check" or "submit"' };
  }

  return { valid: true };
}

// Helper function to build do now writing prompts
function buildDoNowPrompt(data) {
  const { mode, writingPrompt, focusArea, studentText, rubricItems, wordCount, includeGrammarCheck } = data;

  if (mode === 'check') {
    return buildCheckPrompt(writingPrompt, focusArea, studentText, rubricItems, wordCount);
  } else if (mode === 'submit') {
    return buildSubmitPrompt(writingPrompt, studentText, includeGrammarCheck);
  }
}

function buildCheckPrompt(writingPrompt, focusArea, studentText, rubricItems, wordCount) {
  const focusGuidance = {
    imagery: "Look for sensory details. If they have some, celebrate and suggest one more sense to add. If missing, ask what they could see/hear/smell/feel/taste.",
    descriptive: "Point to nouns that could use adjectives or verbs that could use adverbs. Ask which details would help the reader picture it better.",
    vividVerbs: "Find weak verbs (is, was, went, said). Ask what more specific action word could replace them. Celebrate any strong verbs they already used.",
    sentenceVariety: "Notice sentence length patterns. If all short, suggest combining two. If all long, suggest breaking one up. Celebrate variety if present.",
    complexity: "Look for opportunities to add clauses (when, because, although) or appositives (noun phrases with commas). Suggest adding detail to one sentence.",
    elaboration: "Find a claim or idea that could use more explanation. Ask 'why?' or 'how?' or suggest adding an example.",
    evidence: "If they make a claim, ask for a specific example or detail to support it. Celebrate concrete details if present.",
    grammar: "Note ONE grammar issue (run-ons, fragments, comma splices, subject-verb agreement). Frame as something to strengthen, not an error.",
    verbTense: "Check for tense shifts. If inconsistent, point to where it shifts and ask which tense they meant to use.",
    voice: "Notice their style. Celebrate unique word choices or personality. Suggest leaning into it more.",
    organization: "Check flow between ideas. Suggest a transition word or reordering if jumpy. Celebrate smooth flow if present.",
    precision: "Find vague words (thing, stuff, good, bad, nice, very). Ask what more specific word would fit. Celebrate precise words used."
  };

  return `You are Bev, the thoughtful robotic director of the Wordworking Lab at My Pixel Academy. You're helping a student keep writing and improving their work using the N+1 principle: point to one thing to add or improve, keeping them engaged and writing.

Writing Prompt: "${writingPrompt}"
Focus Area: ${focusArea}
Word Count: ${wordCount}
Student's writing:
"${studentText}"

IMPORTANT: ${focusGuidance[focusArea] || focusGuidance.elaboration}

Your goal: Keep them writing! If their writing is already strong in the focus area, celebrate it AND suggest one small way to expand or elaborate. If there's an issue, point to it warmly and ask a question that gets them thinking about how to improve it.

If the writing is genuinely excellent with no issues in the focus area OR general writing issues:
- Give specific praise for what they did well
- Suggest an area to expand (add more detail, explain further, give another example)
- Frame as "This is already great—want to make it even richer?"

IMPORTANT: Do not use any names for the student. You don't know who they are. Refer to their writing directly (e.g., "This sentence..." or "The opening...") rather than addressing them by name.

Respond in this format:
PRAISE: [One specific thing they did well]
NEXT: [One question or suggestion that keeps them writing and adding more]

Stay warm, specific, and encouraging. Assume capability. 5th-8th grade level.`;
}

function buildSubmitPrompt(writingPrompt, studentText, includeGrammarCheck) {
  if (includeGrammarCheck) {
    return `You are Bev, celebrating a student's completed Do Now writing. They chose "Submit and Fix" to get directive grammar/spelling feedback before final submission.

Writing Prompt: "${writingPrompt}"
Student's writing:
"${studentText}"

First, celebrate what they accomplished! Be specific and warm.

Then, flag any remaining spelling or grammar issues they should know about for next time. Format these as discrete bullet points, one issue per bullet. Include:
- Spelling errors
- Missing/incorrect punctuation
- Subject-verb agreement
- Run-on sentences or fragments
- Tense inconsistency

Frame feedback as "Things to watch for next time" rather than "You did this wrong."

IMPORTANT: Do not use any names for the student. You don't know who they are. Refer to their writing directly.

Respond in this format:
CELEBRATION: [Warm, specific praise for their work]
WATCH NEXT TIME:
• [First issue, if any]
• [Second issue, if any]
• [etc.]
(If there are no issues, say "Your mechanics are solid!")

Keep it positive and forward-looking. 5th-8th grade level.`;
  } else {
    return `You are Bev, celebrating a student's completed Do Now writing.

Writing Prompt: "${writingPrompt}"
Student's writing:
"${studentText}"

Give them warm, specific praise for what they accomplished. Be genuine and enthusiastic. Point to concrete strengths in their writing.

IMPORTANT: Do not use any names for the student. You don't know who they are. Refer to their writing directly.

Respond in this format:
CELEBRATION: [2-3 sentences of warm, specific praise]

Keep it positive and encouraging. 5th-8th grade level.`;
  }
}
