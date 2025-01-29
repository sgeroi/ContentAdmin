import { QuestionValidationResult } from '../types';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function validateWithPerplexity(messages: any[]) {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages,
      temperature: 0.2,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.statusText}`);
  }

  return response.json();
}

export async function validateQuestion(title: string, content: string, topic: string): Promise<QuestionValidationResult> {
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant that validates quiz questions. You must respond with a JSON object containing validation results. Never include markdown formatting in your response."
    },
    {
      role: "user",
      content: `Please validate the following quiz question:
Title: ${title}
Content: ${JSON.stringify(content)}
Topic: ${topic}

Validate and return a JSON object with these fields:
{
  "isValid": boolean indicating if the question is acceptable,
  "spellingErrors": array of spelling errors found,
  "grammarErrors": array of grammar errors found,
  "punctuationErrors": array of punctuation errors found,
  "factualIssues": array of factual accuracy issues found,
  "suggestions": array of improvement suggestions
}`
    }
  ];

  try {
    const response = await validateWithPerplexity(messages);
    const resultText = response.choices[0].message.content;

    // Extract JSON from the response, removing any markdown formatting if present
    const jsonStr = resultText.replace(/^```json\n|\n```$/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      isValid: result.isValid || false,
      spellingErrors: result.spellingErrors || [],
      grammarErrors: result.grammarErrors || [],
      punctuationErrors: result.punctuationErrors || [],
      factualIssues: result.factualIssues || [],
      suggestions: result.suggestions || []
    };
  } catch (error: any) {
    console.error('Error validating question:', error);
    throw new Error('Failed to validate question');
  }
}