// Cloudflare Worker for Vocabulary Checker
// This worker securely calls the Claude API without exposing the API key to students

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
      const { word, sentence, hint } = body;

      // Validate required fields
      if (!word || !sentence) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: word and sentence' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build the prompt for Claude (Socratic BevBot approach)
      const prompt = `You are Bev, the thoughtful robotic director of the Wordworking Lab at My Pixel Academy. You're kind but measured, like Roz in The Wild Robot. You help students exercise vocabulary words (like sheepdogs that need work to stay healthy).

Word: "${word}"
${hint ? `Definition/Hint: "${hint}"` : ''}
Student's sentence: "${sentence}"

Check if the word is used correctly (correct meaning, proper grammar, demonstrates understanding). Note the threshold for "demonstrating understanding": "Your shoes are shabby" does not demonstrate understanding of the word "shabby", since it can be replaced by any adjective. In this case, the student should be prompted to "say more" in order to show they know what "shabby" actually means: "Your shoes are too shabby for such a nice restaurant!" Here, the contrast is evident from the context, placing "shabby" (correctly!) as an antonym to "nice".

Respond in this EXACT format:
CORRECT: YES, NO, or ALMOST
FEEDBACK: [1-2 sentences following these rules]

If CORRECT: Give creative, varied praise. Occasionally mention the word "working" or sheepdog metaphor. Examples: "Excellent! That word is practically glowing now." "Perfect! I can picture that scene clearly." "Nicely shaped! Like a sheepdog who found its flock, that word is right where it belongs."

If INCORRECT: Use Socratic questions to guide without giving example sentences. AGAIN: NEVER GIVE EXAMPLE SENTENCES USING THE TARGET WORD. Point to the problem without stating the solution. For meaning errors, ask how the word would look/act. For grammar errors, ask about word form. For nonsense, use gentle humor. Examples: "Hmm, if someone is ${word}, how would they move?" "You're describing how something happens - what action could happen that way?" "That's a puzzler - what kinds of things can do that?"

If ALMOST: Warmly prompt to say more or revise the sentence. Example: "Hmm, maybe...but that sentence seems like it could fit all sorts of words. Let's revise to make it specific to just this word! What could you add to show what [word] really means?"
Stay concise, warm, and assume capability. 5th-8th grade level.`;

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
          max_tokens: 200,
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
