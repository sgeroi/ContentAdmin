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
          content: "Ты - эксперт по русскому языку и проверке корректности текста. Твоя задача - проверить текст вопроса для викторины на наличие ошибок и предложить исправления. Анализируй орфографию, пунктуацию и грамматику."
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
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content || '';

    try {
      const result = JSON.parse(resultText);
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

export async function factCheckQuestion(title: string, content: string, topic: string): Promise<QuestionValidationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Ты - эксперт по проверке фактов. Твоя задача - проверить фактическую точность вопроса для викторины.
Проверь следующие аспекты:
1. Историческая точность дат, имен и событий
2. Научная достоверность фактов и концепций
3. Актуальность информации
4. Отсутствие распространенных заблуждений
5. Точность терминологии

Верни результат в формате JSON с полями:
{
  "isValid": boolean,
  "factualIssues": string[],
  "suggestions": string[],
  "citations": string[],
  "correctedTitle": string,
  "correctedContent": object
}`
        },
        {
          role: "user",
          content: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${JSON.stringify(content)}
Тема: ${topic}

Пожалуйста, проверь фактическую точность и предоставь исправления, если необходимо.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content || '';

    try {
      const result = JSON.parse(resultText);
      return {
        isValid: result.isValid || false,
        spellingErrors: [],
        grammarErrors: [],
        punctuationErrors: [],
        factualIssues: result.factualIssues || [],
        suggestions: result.suggestions || [],
        citations: result.citations || [],
        correctedTitle: result.correctedTitle || title,
        correctedContent: result.correctedContent || content
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', resultText);
      throw new Error('Ошибка при разборе ответа от API');
    }
  } catch (error: any) {
    console.error('Error fact-checking question:', error);
    throw new Error('Не удалось выполнить проверку фактов');
  }
}