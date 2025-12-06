

import { GoogleGenAI, Type } from "@google/genai";
import { Question, ExamConfig, PdfTopic } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Analyze PDF to find chapters/topics
export const analyzePdfContent = async (pdfData: string): Promise<PdfTopic[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "application/pdf",
                            data: pdfData
                        }
                    },
                    {
                        text: `Analyze this document. Identify the main chapters, sections, or distinct topics. 
                        Return a JSON list of strictly strings representing these topics. 
                        Do not include page numbers, just the topic names. Limit to maximum 8 major topics.`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        if (response.text) {
            const topics = JSON.parse(response.text) as string[];
            return topics.map(t => ({ name: t, questionCount: 0 })); // Default 0 questions
        }
        return [];
    } catch (e) {
        console.error("PDF Analysis failed", e);
        // Fallback if analysis fails
        return [{ name: "General Content", questionCount: 5 }];
    }
};

export const generateQuestions = async (config: ExamConfig): Promise<Question[]> => {
  try {
    const model = "gemini-2.5-flash";
    let promptText = "";
    let parts: any[] = [];

    const commonInstructions = `
      The questions should be suitable for a 3rd Grade student.
      
      CRITICAL INSTRUCTION FOR CONTEXT:
      - If the question is based on a specific story, paragraph, or passage from the input, YOU MUST include that text in the "context" field. 
      - The student needs to see the story to answer the question.
      - If it is a standalone question (like Math or General Knowledge), leave "context" empty string.
      
      Generate a mix of question types:
      1. Multiple Choice (4 options)
      2. True/False (2 options: "True", "False")
      3. Short Answer (The 'options' array should be empty. The 'correctAnswer' must be a simple, single word or number).

      Include the correct answer and a simple explanation.
    `;

    if (config.pdfData) {
      // PDF-based generation
      let structureInstruction = "";
      
      if (config.topicPlan && config.topicPlan.length > 0) {
          // Filter out topics with 0 questions
          const activeTopics = config.topicPlan.filter(t => t.questionCount > 0);
          const totalQ = activeTopics.reduce((sum, t) => sum + t.questionCount, 0);
          
          if (totalQ === 0) throw new Error("No questions requested.");

          structureInstruction = `
            Analyze the PDF. Generate exactly ${totalQ} questions based on the following distribution plan:
            ${activeTopics.map(t => `- Topic: "${t.name}" -> Generate ${t.questionCount} questions`).join('\n')}
            
            Ensure the questions strictly relate to the specific topics requested from the PDF content.
          `;
      } else {
          structureInstruction = `Analyze the attached PDF document. Generate ${config.questionCount} questions based on the content.`;
      }

      promptText = `${structureInstruction} ${commonInstructions}`;
      
      parts = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: config.pdfData
          }
        },
        {
          text: promptText
        }
      ];
    } else if (config.imageData) {
       // Image-based generation
       promptText = `
         Analyze this image. Generate ${config.questionCount} questions based on the visual information in the image.
         The questions should test the student's observation and understanding of what is shown.
         ${commonInstructions}
       `;
       parts = [
           {
               inlineData: {
                   mimeType: "image/jpeg", // Assuming jpeg for simplicity, or could detect
                   data: config.imageData
               }
           },
           { text: promptText }
       ];
    } else {
      // Topic-based generation
      promptText = `Generate ${config.questionCount} questions about "${config.topic}" at a ${config.difficulty} difficulty level. 
      ${commonInstructions}`;
      
      parts = [{ text: promptText }];
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['mcq', 'tf', 'short'] },
              text: { type: Type.STRING },
              context: { type: Type.STRING, description: "The story, passage, or paragraph text the student needs to read to answer. Empty if not applicable." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["id", "type", "text", "options", "correctAnswer", "explanation"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as Question[];
      // Ensure IDs are unique and attach image if needed
      return data.map((q, i) => ({ 
          ...q, 
          id: `${Date.now()}-${i}`,
          image: config.imageData // Attach the source image to the question so it can be displayed
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to generate questions:", error);
    throw new Error("Could not generate quiz questions. Please try again.");
  }
};

export const getAiHint = async (question: string, options: string[]): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `I am a 3rd grade student taking a quiz. The question is: "${question}". The options are: ${options.join(', ')}. Without giving me the answer, give me a simple, encouraging hint to help me figure it out. Keep it very short.`,
        });
        return response.text || "No hint available.";
    } catch (e) {
        return "Could not retrieve a hint at this time.";
    }
};

export const getPersonalizedExplanation = async (question: string, userAnswer: string, correctAnswer: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a friendly teacher for 3rd graders. The student answered "${userAnswer}" to the question "${question}". The correct answer is "${correctAnswer}". Explain simply and kindly why their answer is wrong and why the correct answer is right. Use an emoji. Keep it under 50 words.`,
        });
        return response.text || "Let's review this topic together!";
    } catch (e) {
        return "Could not load AI explanation.";
    }
};
