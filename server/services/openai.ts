import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function validateQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting validation for:', { title, topic });

    // Собираем сообщения для API
    const messages: any[] = [
      {
        role: "system",
        content: "Ты - эксперт по русскому языку. Проверь текст вопроса для викторины на наличие ошибок и предложи исправления. Анализируй орфографию, пунктуацию и грамматику. Если есть изображения, проанализируй их содержание и уместность. Дай ответ простым текстом."
      }
    ];

    // Преобразуем контент для анализа изображений
    const contentMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Тема: ${topic}\n\n`
        }
      ]
    };

    // Добавляем изображения из контента, если они есть
    if (content.content) {
      for (const node of content.content) {
        if (node.type === 'image' && node.attrs?.src) {
          const imageUrl = node.attrs.src;
          if (imageUrl.startsWith('/uploads/')) {
            // Преобразуем относительный путь в полный URL
            const fullUrl = `${process.env.REPL_SLUG}.repl.co${imageUrl}`;
            contentMessage.content.push({
              type: "image_url",
              image_url: {
                url: `https://${fullUrl}`,
              }
            });
          }
        } else if (node.type === 'text' || node.type === 'paragraph') {
          contentMessage.content.push({
            type: "text",
            text: node.text || JSON.stringify(node)
          });
        }
      }
    }

    messages.push(contentMessage);

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    const resultText = response.choices[0]?.message?.content || '';
    console.log('Validation response:', resultText);

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
    console.error('Error validating question:', error);
    throw new Error('Не удалось выполнить валидацию вопроса');
  }
}

export async function factCheckQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting fact check for:', { title, topic });

    const messages: any[] = [
      {
        role: "system",
        content: "Ты - эксперт по проверке фактов. Проверь точность информации в вопросе викторины. Проверь историческую точность, научную достоверность, актуальность информации и терминологию. Если есть изображения, проанализируй их содержание и уместность. Дай ответ простым текстом."
      }
    ];

    const contentMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Тема: ${topic}\n\n`
        }
      ]
    };

    if (content.content) {
      for (const node of content.content) {
        if (node.type === 'image' && node.attrs?.src) {
          const imageUrl = node.attrs.src;
          if (imageUrl.startsWith('/uploads/')) {
            const fullUrl = `${process.env.REPL_SLUG}.repl.co${imageUrl}`;
            contentMessage.content.push({
              type: "image_url",
              image_url: {
                url: `https://${fullUrl}`,
              }
            });
          }
        } else if (node.type === 'text' || node.type === 'paragraph') {
          contentMessage.content.push({
            type: "text",
            text: node.text || JSON.stringify(node)
          });
        }
      }
    }

    messages.push(contentMessage);

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
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
    throw new Error('Не удалось выполнить проверку фактов');
  }
}