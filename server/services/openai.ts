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

function extractTextFromContent(content: any): string {
  try {
    if (!content?.content) return '';

    let text = '';
    const traverse = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.type === 'text') {
          text += node.text + ' ';
        }
        if (node.content) {
          traverse(node.content);
        }
      }
    };
    traverse(content.content);
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from content:', error);
    return '';
  }
}

function updateContentWithCorrections(originalContent: any, correctedText: string): any {
  if (!originalContent?.content) return originalContent;

  let currentPosition = 0;
  const correctedWords = correctedText.split(/\s+/);
  let wordIndex = 0;

  const traverse = (nodes: any[]): any[] => {
    return nodes.map(node => {
      if (node.type === 'text' && wordIndex < correctedWords.length) {
        const words = node.text.split(/(\s+)/);
        const corrected = words.map(word => {
          if (word.trim()) {
            const correctedWord = correctedWords[wordIndex++] || word;
            return correctedWord;
          }
          return word;
        }).join('');

        return { ...node, text: corrected };
      }
      if (node.content) {
        return { ...node, content: traverse(node.content) };
      }
      return node;
    });
  };

  return {
    ...originalContent,
    content: traverse(originalContent.content)
  };
}

export async function validateQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting validation for:', { title, topic });
    const textContent = extractTextFromContent(content);

    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Ты - эксперт по русскому языку. Исправь орфографические, пунктуационные и грамматические ошибки в тексте. 
          ВАЖНО: сохраняй без изменений весь текст, написанный ЗАГЛАВНЫМИ буквами (например: ПРИМЕР, ВАЖНО, ЛИТЕРАТУРА).
          Верни JSON в формате:
          {
            "correctedText": "исправленный текст",
            "corrections": ["список всех внесенных исправлений"]
          }`
        },
        {
          role: "user",
          content: `Исправь следующий текст: "${textContent}"`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '');
    const correctedContent = updateContentWithCorrections(content, result.correctedText);

    return {
      isValid: true,
      spellingErrors: [],
      grammarErrors: [],
      punctuationErrors: [],
      factualIssues: [],
      suggestions: result.corrections || [],
      citations: [],
      correctedTitle: title,
      correctedContent
    };
  } catch (error: any) {
    console.error('Error validating question:', error);
    throw new Error('Не удалось выполнить валидацию вопроса');
  }
}

export async function factCheckQuestion(title: string, content: any, topic: string): Promise<QuestionValidationResult> {
  try {
    console.log('Starting fact check for:', { title, topic });
    const textContent = extractTextFromContent(content);
    const images = extractImagesFromContent(content);
    console.log('Found images:', images);

    const messages: any[] = [
      {
        role: "system",
        content: `Ты - эксперт по проверке фактов. 
        ВАЖНО: сохраняй без изменений весь текст, написанный ЗАГЛАВНЫМИ буквами (например: ПРИМЕР, ВАЖНО, ЛИТЕРАТУРА).
        Кратко проанализируй точность информации в вопросе викторины. Дай ответ в 2-3 предложения.`
      },
    ];

    const userMessage: any = {
      role: "user",
      content: [
        { 
          type: "text", 
          text: `Проверь следующий текст: "${textContent}"` 
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

export async function generateQuizQuestions(count: number = 10, topic?: string, prompt?: string): Promise<Array<{
  title: string;
  content: any;
  answer: string;
  topic: string;
  difficulty: number;
}>> {
  try {
    console.log('Starting quiz questions generation');

    let promptText;
    if (prompt) {
      promptText = prompt;
    } else {
      promptText = topic ? 
        `Создай ${count} уникальных вопросов на тему "${topic}" на русском языке.` :
        `Создай ${count} уникальных вопросов на логику на русском языке.`;
    }

    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Ты - эксперт по созданию интересных вопросов для викторины. 
          ${promptText}
          Вопросы должны быть разной сложности (от 1 до 5).
          Для каждого вопроса обязательно укажи правильный ответ.
          Верни JSON в формате:
          {
            "questions": [{
              "title": "заголовок вопроса",
              "content": {
                "type": "doc",
                "content": [
                  {
                    "type": "paragraph",
                    "content": [
                      {
                        "type": "text",
                        "text": "Вопрос: [текст вопроса]"
                      }
                    ]
                  },
                  {
                    "type": "paragraph",
                    "content": [
                      {
                        "type": "text",
                        "text": "Ответ: [правильный ответ]"
                      }
                    ]
                  }
                ]
              },
              "answer": "правильный ответ на вопрос",
              "topic": "${topic || 'тема вопроса (одна из: История, Наука, География, Литература, Искусство, Музыка, Спорт, Технологии)'}",
              "difficulty": число от 1 до 5
            }]
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '');
    console.log('Generated questions:', result);

    if (!result?.questions || !Array.isArray(result.questions)) {
      throw new Error('Некорректный формат ответа от API');
    }

    // If topic is specified, ensure all questions have that topic
    if (topic) {
      result.questions = result.questions.map(q => ({ ...q, topic }));
    }

    return result.questions;
  } catch (error: any) {
    console.error('Error generating quiz questions:', error);
    throw new Error('Не удалось сгенерировать вопросы: ' + error.message);
  }
}