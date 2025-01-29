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
      console.log('Image file not found');
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
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

    // First, check the text content
    const textResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Ты - эксперт по проверке фактов. Проверь точность информации в вопросе викторины. Проверь историческую точность, научную достоверность, актуальность информации и терминологию. Дай ответ простым текстом."
        },
        {
          role: "user",
          content: `Проверь следующий вопрос для викторины:
Заголовок: ${title}
Содержание: ${JSON.stringify(content)}
Тема: ${topic}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    let resultText = textResponse.choices[0]?.message?.content || '';

    // Then check images if present
    const images = extractImagesFromContent(content);
    console.log('Found images:', images);

    for (const imageUrl of images) {
      console.log('Processing image:', imageUrl);
      const base64Image = getImageBase64(imageUrl);

      if (base64Image) {
        console.log('Successfully encoded image to base64');
        try {
          const imageResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Это изображение относится к следующему вопросу викторины. Проверь, соответствует ли оно контексту вопроса и нет ли в нем фактических ошибок:" },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          });

          const imageAnalysis = imageResponse.choices[0]?.message?.content;
          if (imageAnalysis) {
            resultText += "\n\nАнализ изображения: " + imageAnalysis;
          }
        } catch (imageError) {
          console.error('Error analyzing image:', imageError);
          resultText += "\n\nНе удалось проанализировать изображение.";
        }
      } else {
        console.log('Failed to encode image to base64');
        resultText += "\n\nНе удалось загрузить изображение для анализа.";
      }
    }

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
    throw new Error('Не удалось выполнить проверку фактов');
  }
}