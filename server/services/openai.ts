import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractTextContent(content: any): string {
  if (!content.content) return '';

  return content.content.map((node: any) => {
    if (node.type === 'text') {
      return node.text;
    } else if (node.type === 'paragraph' && node.content) {
      return node.content.map((n: any) => n.text || '').join(' ');
    }
    return '';
  }).join('\n').trim();
}

export async function validateQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting validation for:', { title, topic });

    const textContent = extractTextContent(content);
    console.log('Extracted text content:', textContent);

    const messages = [
      {
        role: "system",
        content: "Ты - эксперт по русскому языку и проверке фактов. Проверь текст вопроса для викторины на наличие ошибок и предложи исправления. Анализируй орфографию, пунктуацию, грамматику и фактическую точность."
      },
      {
        role: "user",
        content: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${textContent}
Тема: ${topic}

Проверь и дай оценку по следующим критериям:
1. Орфографические ошибки
2. Грамматические ошибки
3. Пунктуационные ошибки
4. Фактические неточности
5. Предложения по улучшению`
      }
    ];

    console.log('Sending messages to OpenAI:', JSON.stringify(messages, null, 2));

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    const resultText = response.choices[0]?.message?.content || '';
    console.log('Validation response:', resultText);

    return {
      isValid: !resultText.includes("ошибк") && !resultText.includes("неточност"),
      spellingErrors: [],
      grammarErrors: [],
      punctuationErrors: [],
      factualIssues: [],
      suggestions: [resultText],
      citations: [],
      correctedTitle: title,
      correctedContent: content
    };
  } catch (error: any) {
    console.error('Error validating question:', error);
    if (error.response) {
      console.error('OpenAI API error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Не удалось выполнить валидацию вопроса: ${error.message}`);
  }
}

export async function factCheckQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting fact check for:', { title, topic });

    const textContent = extractTextContent(content);
    console.log('Extracted text content:', textContent);

    const messages = [
      {
        role: "system",
        content: "Ты - эксперт по проверке фактов. Проанализируй информацию в вопросе викторины на предмет фактической точности. Проверь историческую достоверность, научную корректность, актуальность информации и правильность терминологии."
      },
      {
        role: "user",
        content: `Проверь фактическую точность следующего вопроса для викторины:
Заголовок: ${title}
Содержание: ${textContent}
Тема: ${topic}

Пожалуйста, дай подробный анализ:
1. Исторической точности
2. Научной достоверности
3. Актуальности информации
4. Правильности использования терминологии`
      }
    ];

    console.log('Sending messages to OpenAI:', JSON.stringify(messages, null, 2));

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.2,
      max_tokens: 1500
    });

    const resultText = response.choices[0]?.message?.content || '';
    console.log('Fact check response:', resultText);

    return {
      isValid: true,
      spellingErrors: [],
      grammarErrors: [],
      punctuationErrors: [],
      factualIssues: [],
      suggestions: [resultText],
      citations: [],
      correctedTitle: title,
      correctedContent: content
    };
  } catch (error: any) {
    console.error('Error fact-checking question:', error);
    if (error.response) {
      console.error('OpenAI API error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Не удалось выполнить проверку фактов: ${error.message}`);
  }
}