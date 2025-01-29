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
      content: "Ты помощник для валидации вопросов для викторины. Ты должен отвечать JSON объектом, содержащим результаты проверки и исправления. Никогда не включай markdown форматирование в свой ответ. Все сообщения об ошибках и предложения должны быть на русском языке. Обязательно используй достоверные источники для проверки фактов."
    },
    {
      role: "user",
      content: `Пожалуйста, проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${JSON.stringify(content)}
Тема: ${topic}

Проверь и верни JSON объект со следующими полями:
{
  "isValid": boolean - указывает, допустим ли вопрос,
  "spellingErrors": массив найденных орфографических ошибок,
  "grammarErrors": массив грамматических ошибок,
  "punctuationErrors": массив пунктуационных ошибок,
  "factualIssues": массив проблем с фактической точностью,
  "suggestions": массив предложений по улучшению,
  "citations": массив ссылок на достоверные источники,
  "correctedTitle": исправленный заголовок с учетом всех ошибок,
  "correctedContent": исправленное содержание с учетом всех ошибок
}`
    }
  ];

  try {
    const response = await validateWithPerplexity(messages);
    const resultText = response.choices[0].message.content;
    const citations = response.citations || [];

    // Log the raw response for debugging
    console.log('Raw response from Perplexity:', resultText);

    // Extract JSON from the response, cleaning any potential formatting
    const jsonStr = resultText
      .replace(/^```json\s*|\s*```$/g, '') // Remove code blocks
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .trim();

    console.log('Cleaned JSON string:', jsonStr);

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', jsonStr);
      throw new Error('Ошибка при разборе ответа от API');
    }

    // Ensure all required fields are present with default values if missing
    return {
      isValid: result.isValid || false,
      spellingErrors: result.spellingErrors || [],
      grammarErrors: result.grammarErrors || [],
      punctuationErrors: result.punctuationErrors || [],
      factualIssues: result.factualIssues || [],
      suggestions: result.suggestions || [],
      citations: citations,
      correctedTitle: result.correctedTitle || title,
      correctedContent: result.correctedContent || content
    };
  } catch (error: any) {
    console.error('Error validating question:', error);
    throw new Error('Не удалось выполнить валидацию вопроса');
  }
}