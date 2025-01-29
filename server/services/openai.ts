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
          content: "Ты - эксперт по русскому языку и проверке корректности текста. Проверь текст вопроса для викторины на наличие ошибок и предложи исправления. Анализируй орфографию, пунктуацию и грамматику."
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

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Пустой ответ от API');
    }

    console.log('Validation API Response:', resultText);

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
      throw new Error('Ошибка при разборе ответа от API: неверный формат JSON');
    }
  } catch (error: any) {
    console.error('Error validating question:', error);
    if (error.response) {
      console.error('API error response:', error.response.data);
    }
    throw new Error(`Ошибка валидации: ${error.message}`);
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
          content: "Проверь фактическую точность вопроса викторины. Верни JSON с полями isValid (boolean), factualIssues (массив строк с проблемами), suggestions (массив строк с предложениями), correctedTitle (строка), correctedContent (объект)."
        },
        {
          role: "user",
          content: `Проверь точность информации:
Заголовок: ${title}
Содержание: ${JSON.stringify(content)}
Тема: ${topic}

Проверь: историческую точность, научную достоверность, актуальность информации и терминологию.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Пустой ответ от API');
    }

    console.log('Fact Check API Response:', resultText);

    try {
      const result = JSON.parse(resultText);
      return {
        isValid: result.isValid || false,
        spellingErrors: [],
        grammarErrors: [],
        punctuationErrors: [],
        factualIssues: result.factualIssues || [],
        suggestions: result.suggestions || [],
        citations: [],
        correctedTitle: result.correctedTitle || title,
        correctedContent: result.correctedContent || content
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', resultText);
      throw new Error('Ошибка при разборе ответа от API: неверный формат JSON');
    }
  } catch (error: any) {
    console.error('Error fact-checking question:', error);
    if (error.response) {
      console.error('API error response:', error.response.data);
    }
    throw new Error(`Ошибка проверки фактов: ${error.message}`);
  }
}