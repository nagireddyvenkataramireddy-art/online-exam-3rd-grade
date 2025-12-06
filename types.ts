

export type QuestionType = 'mcq' | 'tf' | 'short';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  context?: string; // Optional passage or story text for reading comprehension
  image?: string; // Base64 image data for visual questions
  options: string[]; // For TF, this will be ['True', 'False']. For Short, empty or hints.
  correctAnswer: string;
  explanation: string;
}

export interface PdfTopic {
  name: string;
  questionCount: number;
}

export interface ExamConfig {
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Genius';
  questionCount: number;
  pdfData?: string; // Base64 encoded PDF data
  imageData?: string; // Base64 encoded Image data
  topicPlan?: PdfTopic[]; // Specific breakdown for PDF chapters
}

export interface ExamSessionState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>; // questionId -> selectedOption
  markedQuestions: string[]; // List of question IDs marked for review
  isFinished: boolean;
  startTime: number;
  endTime?: number;
}

export type Screen = 'login' | 'teacher-dashboard' | 'student-dashboard' | 'exam' | 'results';
export type Role = 'teacher' | 'student';

export interface Topic {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface ExamData {
  id: string; // The 4-digit code
  topic: string;
  questions: Question[];
  createdAt: number;
  difficulty: string;
  timeLimit?: number; // In seconds
}