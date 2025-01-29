import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function validateQuestion(title: string, content: string, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting validation for:', { title, topic });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты помощник для валидации вопросов для викторины. Ты должен отвечать JSON объектом, содержащим результаты проверки и исправления. Никогда не включай markdown форматирование в свой ответ."
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
  "suggestions": массив предложений по улучшению,
  "correctedTitle": исправленный заголовок с учетом всех ошибок,
  "correctedContent": исправленное содержание с учетом всех ошибок
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Пустой ответ от API');
    }

    // Log the raw response for debugging
    console.log('Raw response from OpenAI:', resultText);

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
      factualIssues: [],
      suggestions: result.suggestions || [],
      citations: [],
      correctedTitle: result.correctedTitle || title,
      correctedContent: result.correctedContent || content
    };
  } catch (error: any) {
    console.error('Error validating question:', error);
    throw new Error('Не удалось выполнить валидацию вопроса');
  }
}

export async function factCheckQuestion(title: string, content: string, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting fact check for:', { title, topic });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты помощник для валидации вопросов для викторины. Ты должен отвечать JSON объектом, содержащим результаты проверки и исправления. Никогда не включай markdown форматирование в свой ответ. Обязательно используй достоверные источники для проверки фактов."
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
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Пустой ответ от API');
    }

    // Log the raw response for debugging
    console.log('Raw response from OpenAI:', resultText);

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
      citations: result.citations || [],
      correctedTitle: result.correctedTitle || title,
      correctedContent: result.correctedContent || content
    };
  } catch (error: any) {
    console.error('Error fact-checking question:', error);
    throw new Error('Не удалось выполнить проверку фактов');
  }
}