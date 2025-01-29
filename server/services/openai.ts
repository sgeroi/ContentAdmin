import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractImagesFromContent(content: any): string[] {
  const images: string[] = [];
  if (content.content) {
    for (const node of content.content) {
      if (node.type === 'image' && node.attrs?.src) {
        images.push(node.attrs.src);
      }
    }
  }
  return images;
}

function getImageDescription(url: string): string {
  return `[Изображение: ${url.split('/').pop()}]`;
}

export async function validateQuestion(title: string, content: string, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting validation for:', { title, topic });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты - эксперт по русскому языку. Проверь текст вопроса для викторины на наличие ошибок и предложи исправления. Анализируй орфографию, пунктуацию и грамматику. Дай ответ простым текстом."
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
      max_tokens: 1000
    });

    const resultText = response.choices[0]?.message?.content || '';
    console.log('Validation response:', resultText);

    // Возвращаем простой текстовый ответ в поле suggestions
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

    // Получаем список изображений и добавляем их описания к контенту
    const images = extractImagesFromContent(content);
    let contentWithImages = JSON.stringify(content);
    if (images.length > 0) {
      contentWithImages += '\n\nИзображения в вопросе:\n' + 
        images.map(img => getImageDescription(img)).join('\n');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты - эксперт по проверке фактов. Проверь точность информации в вопросе викторины. Проверь историческую точность, научную достоверность, актуальность информации и терминологию. Если в вопросе есть изображения, проверь их уместность в контексте вопроса. Дай ответ простым текстом."
        },
        {
          role: "user",
          content: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${contentWithImages}
Тема: ${topic}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const resultText = response.choices[0]?.message?.content || '';
    console.log('Fact check response:', resultText);

    // Возвращаем простой текстовый ответ в поле suggestions
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