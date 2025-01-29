import { QuestionValidationResult } from '../types';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getImageBase64(url: string): string | null {
  try {
    // Remove /uploads/ prefix from URL and construct full path
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

    // Get all images from content
    const images = extractImagesFromContent(content);
    console.log('Found images:', images);

    // Create base messages array
    const messages: any[] = [
      {
        role: "system",
        content: "Ты - эксперт по проверке фактов. Проанализируй вопрос викторины и изображения к нему на предмет фактической точности. Ответь на русском языке."
      },
    ];

    // Add main question content
    const userMessage: any = {
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
    };

    // Add images to message if present
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
      } else {
        console.log('Failed to encode image to base64');
      }
    }

    messages.push(userMessage);

    // Log message structure for debugging
    console.log('Sending request to OpenAI with message structure:', 
      messages.map(m => ({
        role: m.role,
        content: Array.isArray(m.content) 
          ? m.content.map(c => ({ type: c.type }))
          : 'text'
      }))
    );

    const response = await openai.chat.completions.create({
      model: "gpt4-turbo-vision",
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