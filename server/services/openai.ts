import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getImageBase64(url: string): string | null {
  try {
    // Убираем префикс /uploads/ из URL
    const imagePath = path.join(process.cwd(), url.replace('/uploads/', 'uploads/'));
    if (!fs.existsSync(imagePath)) {
      return null;
    }
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading image:', error);
    return null;
  }
}

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

    const images = extractImagesFromContent(content);
    const messages: any[] = [
      {
        role: "system",
        content: "Ты - эксперт по проверке фактов. Проверь точность информации в вопросе викторины. Проверь историческую точность, научную достоверность, актуальность информации и терминологию. Если есть изображения, проверь их соответствие тексту вопроса. Дай ответ простым текстом."
      }
    ];

    // Добавляем текст вопроса
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${JSON.stringify(content)}
Тема: ${topic}`
        }
      ]
    });

    // Добавляем изображения, если они есть
    for (const imageUrl of images) {
      const base64Image = getImageBase64(imageUrl);
      if (base64Image) {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Проверь это изображение на соответствие контексту вопроса:"
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ]
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-0125", // Обновленная модель
      messages,
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