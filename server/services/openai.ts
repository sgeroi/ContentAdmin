import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function validateQuestion(title: string, content: string, topic: string): Promise<QuestionValidationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Ты - эксперт по русскому языку и проверке корректности текста.
Твоя задача - проверить текст вопроса для викторины на наличие ошибок и предложить исправления.
Анализируй орфографию, пунктуацию, грамматику и стилистику.
Всегда возвращай ответ в формате JSON с полями:
{
  "isValid": boolean,
  "spellingErrors": string[],
  "grammarErrors": string[],
  "punctuationErrors": string[],
  "factualIssues": string[],
  "suggestions": string[],
  "correctedTitle": string,
  "correctedContent": object
}`
        },
        {
          role: "user",
          content: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${JSON.stringify(content)}
Тема: ${topic}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const resultText = response.choices[0]?.message?.content || '';

    try {
      const result = JSON.parse(resultText);
      return {
        isValid: result.isValid || false,
        spellingErrors: result.spellingErrors || [],
        grammarErrors: result.grammarErrors || [],
        punctuationErrors: result.punctuationErrors || [],
        factualIssues: result.factualIssues || [],
        suggestions: result.suggestions || [],
        citations: [],
        correctedTitle: result.correctedTitle || title,
        correctedContent: result.correctedContent || content
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', resultText);
      throw new Error('Ошибка при разборе ответа от API');
    }
  } catch (error: any) {
    console.error('Error validating question:', error);
    throw new Error('Не удалось выполнить валидацию вопроса');
  }
}