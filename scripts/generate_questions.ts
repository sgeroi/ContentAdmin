import OpenAI from "openai";
import { db } from "@db";
import { questions, users } from "@db/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const TOPICS = [
  "История России",
  "Мировая история",
  "География",
  "Искусство",
  "Литература",
  "Наука",
  "Спорт",
  "Кино и телевидение",
  "Музыка",
  "Технологии"
];

async function generateQuestion(topic: string, authorId: number) {
  try {
    const prompt = `Создайте вопрос для викторины по теме "${topic}". 
    Ответ должен быть в формате JSON:
    {
      "title": "Краткое название вопроса",
      "content": "Полный текст вопроса",
      "answer": "Правильный ответ",
      "difficulty": число от 1 до 5
    }`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      ...result,
      topic,
      authorId,
      isGenerated: true,
      factChecked: false,
    };
  } catch (error) {
    console.error(`Error generating question for topic ${topic}:`, error);
    return null;
  }
}

async function generateQuestions(count: number) {
  console.log(`Starting generation of ${count} questions...`);

  // Get system user id
  const [systemUser] = await db.select().from(users).where(eq(users.username, 'system'));
  if (!systemUser) {
    throw new Error('System user not found');
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < count; i++) {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const question = await generateQuestion(topic, systemUser.id);

    if (question) {
      try {
        const [inserted] = await db.insert(questions).values(question).returning();
        console.log(`Created question ${i + 1}/${count}: ${inserted.title}`);
        results.push(inserted);
        successCount++;
      } catch (error) {
        console.error(`Failed to insert question ${i + 1}:`, error);
        failureCount++;
      }
    } else {
      failureCount++;
    }

    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\nGeneration completed:`);
  console.log(`Successfully created: ${successCount} questions`);
  console.log(`Failed: ${failureCount} questions`);
  return results;
}

// Запускаем генерацию 500 вопросов
generateQuestions(500).catch(console.error);