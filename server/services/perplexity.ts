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
      content: "You are a helpful assistant that validates quiz questions. Check for spelling, grammar, punctuation, and factual accuracy. Be precise and concise in your feedback."
    },
    {
      role: "user",
      content: `Please validate the following quiz question:
Title: ${title}
Content: ${content}
Topic: ${topic}

Please check:
1. Spelling and grammar
2. Punctuation
3. Factual accuracy
4. Topic relevance

Respond in JSON format with the following structure:
{
  "isValid": boolean,
  "spellingErrors": string[],
  "grammarErrors": string[],
  "punctuationErrors": string[],
  "factualIssues": string[],
  "suggestions": string[]
}`
    }
  ];

  try {
    const response = await validateWithPerplexity(messages);
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error: any) {
    console.error('Error validating question:', error);
    throw new Error('Failed to validate question');
  }
}
