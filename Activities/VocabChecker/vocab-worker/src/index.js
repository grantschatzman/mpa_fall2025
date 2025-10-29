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

      // Build the prompt for Claude
      const prompt = `You are a vocabulary teacher checking if a student used a word correctly in a sentence.

Word: "${word}"
${hint ? `Definition/Hint: "${hint}"` : ''}
Student's sentence: "${sentence}"

Is the word "${word}" used correctly in this sentence? Consider:
1. Is the word used with the correct meaning?
2. Is it grammatically appropriate?
3. Does the sentence demonstrate understanding of the word?

Respond in this EXACT format:
CORRECT: YES or NO
FEEDBACK: [One clear sentence explaining why it's correct or how to improve]`;

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
