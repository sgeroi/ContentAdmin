import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getImageBase64(url: string): string | null {
  try {
    const imagePath = path.join(process.cwd(), url.replace(/^\/uploads\//, 'uploads/'));
    console.log('Reading image from:', imagePath);

    if (!fs.existsSync(imagePath)) {
      console.log('Image file not found at path:', imagePath);
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    console.log('Successfully read and encoded image');
    return base64Image;
  } catch (error) {
    console.error('Error reading image:', error);
    return null;
  }
}

function extractImagesFromContent(content: any): string[] {
  const images: string[] = [];
  try {
    if (content && typeof content === 'object' && content.content) {
      const traverse = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.type === 'image' && node.attrs?.src) {
            images.push(node.attrs.src);
          }
          if (node.content && Array.isArray(node.content)) {
            traverse(node.content);
          }
        }
      };
      traverse(content.content);
    }
    console.log('Found images in content:', images);
  } catch (error) {
    console.error('Error extracting images from content:', error);
  }
  return images;
}

export async function validateQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting validation for:', { title, topic });

    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Ты - эксперт по русскому языку. Исправь орфографические, пунктуационные и грамматические ошибки в тексте, сохраняя оригинальное написание слов заглавными буквами (ПРИМЕР, ВАЖНО). Верни JSON в формате:
          {
            "correctedContent": "исправленное содержание",
            "corrections": ["список всех внесенных исправлений"]
          }`
        },
        {
          role: "user",
          content: `Исправь следующий текст:
Содержание: ${JSON.stringify(content)}
Тема: ${topic}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '');

    return {
      isValid: true,
      spellingErrors: [],
      grammarErrors: [],
      punctuationErrors: [],
      factualIssues: [],
      suggestions: result.corrections || [],
      citations: [],
      correctedTitle: title,
      correctedContent: result.correctedContent || content
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
    console.log('Found images:', images);

    const messages: any[] = [
      {
        role: "system",
        content: "Ты - эксперт по проверке фактов. Кратко проанализируй точность информации в вопросе викторины. Дай ответ в 2-3 предложения."
      },
    ];

    const userMessage: any = {
      role: "user",
      content: [
        { 
          type: "text", 
          text: `Проверь следующий вопрос для викторины:
Содержание: ${JSON.stringify(content)}
Тема: ${topic}`
        }
      ]
    };

    let hasValidImages = false;
    for (const imageUrl of images) {
      console.log('Processing image:', imageUrl);
      const base64Image = getImageBase64(imageUrl);

      if (base64Image) {
        console.log('Successfully encoded image to base64');
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        });
        hasValidImages = true;
      } else {
        console.log('Failed to encode image to base64');
      }
    }

    messages.push(userMessage);

    const model = hasValidImages ? "gpt-4o" : "gpt-4-turbo";
    console.log(`Using model: ${model} (hasValidImages: ${hasValidImages})`);

    const response = await openai.chat.completions.create({
      model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.2
    });

    const resultText = response.choices[0]?.message?.content || '';
    console.log('Fact check complete response:', resultText);

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
    throw new Error('Не удалось выполнить проверку фактов: ' + error.message);
  }
}