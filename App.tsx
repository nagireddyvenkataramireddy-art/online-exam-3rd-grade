import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import LoginScreen from './components/LoginScreen';
import ExamSession from './components/ExamSession';
import ResultsView from './components/ResultsView';
import StudentDetailsScreen from './components/StudentDetailsScreen';
import { generateQuestions } from './services/geminiService';
import { Question, Screen, Role, ExamData, PdfTopic } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | 'student-details'>('login');
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Current Exam State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentExamId, setCurrentExamId] = useState('');
  
  // Student Profile State
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  
  // State for resuming
  const [resumedState, setResumedState] = useState<{
      userAnswers: Record<string, string>, 
      timeTaken: number, 
      currentQuestionIndex: number,
      markedQuestions: string[]
  } | undefined>(undefined);
  
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeTaken, setTimeTaken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'Medium' | 'Genius'>('Medium');

  // Gamification Stats
  const [studentStats, setStudentStats] = useState(() => {
      const saved = localStorage.getItem('examo_student_stats');
      return saved ? JSON.parse(saved) : { points: 0, examsCompleted: 0, streak: 1 };
  });

  // In-memory "Database" for exams created by teachers
  const [activeExams, setActiveExams] = useState<Record<string, ExamData>>({});

  const handleSelectRole = (role: Role) => {
    setUserRole(role);
    setCurrentScreen(role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
  };

  // --- TEACHER ACTIONS ---

  const handleCreateExam = useCallback(async (type: 'pdf' | 'topic' | 'image', data: File | string, topicPlan?: PdfTopic[]) => {
    setLoading(true);
    setError(null);
    
    try {
      let qs: Question[] = [];
      let examTopic = '';

      if (type === 'pdf') {
        const file = data as File;
        examTopic = file.name.replace('.pdf', '');
        const reader = new FileReader();
        
        const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                 const res = reader.result as string;
                 resolve(res.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        qs = await generateQuestions({
            topic: "Custom Document",
            difficulty: 'Medium',
            questionCount: topicPlan ? 0 : 5, 
            pdfData: base64Data,
            topicPlan: topicPlan
        });
      } else if (type === 'image') {
          const file = data as File;
          examTopic = "Visual Quiz: " + file.name;
          const reader = new FileReader();

          const base64Data = await new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                   const res = reader.result as string;
                   resolve(res.split(',')[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
          });
          
          qs = await generateQuestions({
              topic: "Visual Content",
              difficulty: 'Medium',
              questionCount: 5,
              imageData: base64Data
          });
      } else {
        const topicName = data as string;
        examTopic = topicName;
        qs = await generateQuestions({
            topic: topicName,
            difficulty: 'Medium',
            questionCount: 20
        });
      }

      if (qs.length === 0) {
         throw new Error("No questions generated.");
      }

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      const newExam: ExamData = {
          id: code,
          topic: examTopic,
          questions: qs,
          createdAt: Date.now(),
          difficulty: 'Medium',
          timeLimit: qs.length * 60
      };

      setActiveExams(prev => ({...prev, [code]: newExam}));
    } catch (err: any) {
      console.error(err);
      setError("Failed to create exam. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteExam = (id: string) => {
      setActiveExams(prev => {
          const newState = {...prev};
          delete newState[id];
          return newState;
      });
  };

  const handleUpdateExam = (id: string, updatedExam: ExamData) => {
      setActiveExams(prev => ({
          ...prev,
          [id]: updatedExam
      }));
  };

  const handlePreviewExam = (exam: ExamData) => {
      setQuestions(exam.questions);
      setCurrentTopic(exam.topic);
      setCurrentExamId(`${exam.id}_preview`);
      setStudentName("Teacher Preview");
      setStudentClass("N/A");
      setResumedState(undefined);
      setCurrentScreen('exam');
  };

  // --- STUDENT ACTIONS ---

  const checkAndLoadProgress = (examId: string): boolean => {
      const saved = localStorage.getItem(`examo_progress_${examId}`);
      if (saved) {
          try {
              const data = JSON.parse(saved);
              if (data.questions && data.questions.length > 0) {
                if (window.confirm(`Found saved progress for ${data.examId}. Do you want to resume?`)) {
                    setQuestions(data.questions);
                    setResumedState({
                        userAnswers: data.userAnswers,
                        timeTaken: data.timeTaken,
                        currentQuestionIndex: data.currentQuestionIndex,
                        markedQuestions: data.markedQuestions || []
                    });
                    setCurrentExamId(data.examId);
                    setStudentName("Resuming Student"); 
                    setStudentClass("");
                    setCurrentScreen('exam');
                    return true;
                } else {
                    localStorage.removeItem(`examo_progress_${examId}`);
                }
              }
          } catch (e) {
              console.error("Failed to parse saved progress", e);
              localStorage.removeItem(`examo_progress_${examId}`);
          }
      }
      return false;
  };

  const handleStartPractice = useCallback(async (topic: string) => {
    const practiceId = `practice-${topic.toLowerCase()}`;
    setCurrentTopic(topic);
    
    if (checkAndLoadProgress(practiceId)) return;

    setLoading(true);
    setError(null);
    setResumedState(undefined);

    try {
      const qs = await generateQuestions({
        topic,
        difficulty: difficulty === 'Genius' ? 'Hard' : 'Medium', 
        questionCount: 20,
      });
      setQuestions(qs);
      setCurrentExamId(practiceId);
      setStudentName('');
      setStudentClass('');
      setCurrentScreen('student-details');
    } catch (err: any) {
      setError("Something went wrong starting the quiz.");
      setCurrentScreen('student-dashboard');
    } finally {
      setLoading(false);
    }
  }, [difficulty]);

  const handleJoinExam = useCallback((code: string) => {
      if (checkAndLoadProgress(code)) {
           const saved = localStorage.getItem(`examo_progress_${code}`);
           if (saved) {
               const ex = activeExams[code];
               setCurrentTopic(ex ? ex.topic : "Class Exam");
           }
           return;
      }

      const exam = activeExams[code];
      if (exam) {
          setQuestions(exam.questions);
          setCurrentTopic(exam.topic);
          setCurrentExamId(code);
          setResumedState(undefined);
          setStudentName('');
          setStudentClass('');
          setCurrentScreen('student-details');
      } else {
          setError("Invalid Exam Code. Please ask your teacher for the correct code.");
      }
  }, [activeExams]);

  const handleStudentDetailsSubmit = (name: string, className: string) => {
      setStudentName(name);
      setStudentClass(className);
      setCurrentScreen('exam');
  };

  const finishExam = useCallback((answers: Record<string, string>, time: number) => {
    // Calculate Score for Stats
    let score = 0;
    questions.forEach(q => {
        const userAnswer = answers[q.id]?.toString().trim().toLowerCase() || "";
        const correctAnswer = q.correctAnswer.toString().trim().toLowerCase();
        if (userAnswer === correctAnswer) score++;
    });

    // Update Stats if it's not a teacher preview
    if (userRole === 'student') {
        const pointsEarned = score * 10;
        setStudentStats((prev: any) => {
            const newStats = {
                points: prev.points + pointsEarned,
                examsCompleted: prev.examsCompleted + 1,
                streak: prev.streak // Logic for streak would involve dates, keeping simple for now
            };
            localStorage.setItem('examo_student_stats', JSON.stringify(newStats));
            return newStats;
        });
    }

    setUserAnswers(answers);
    setTimeTaken(time);
    setCurrentScreen('results');
  }, [questions, userRole]);

  const goHome = useCallback(() => {
    if (userRole === 'teacher') {
        setCurrentScreen('teacher-dashboard');
    } else {
        setCurrentScreen('student-dashboard');
    }
    setQuestions([]);
    setUserAnswers({});
    setTimeTaken(0);
    setResumedState(undefined);
    setStudentName('');
    setStudentClass('');
  }, [userRole]);

  const handleLogout = () => {
      setUserRole(null);
      setCurrentScreen('login');
      setQuestions([]);
      setError(null);
  };
  
  const retryExam = useCallback(() => {
      setUserAnswers({});
      setTimeTaken(0);
      setResumedState(undefined);
      setCurrentScreen('exam');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mx-auto w-full shadow-2xl overflow-hidden relative">
      
      {currentScreen !== 'login' && currentScreen !== 'exam' && currentScreen !== 'student-details' && (
        <Header 
          title={userRole === 'teacher' ? 'Teacher Dashboard' : 'Examo Kids'} 
          showBack={false}
          onBack={() => {}} 
        />
      )}

      {(currentScreen === 'teacher-dashboard' || currentScreen === 'student-dashboard') && (
          <button onClick={handleLogout} className="absolute top-3 right-3 z-50 text-xs font-bold bg-white/20 text-white border border-white/50 px-3 py-1 rounded-full hover:bg-white/30">
              Exit
          </button>
      )}

      <main className="flex-1 relative overflow-y-auto no-scrollbar h-full">
        {loading && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                </div>
            </div>
            <h3 className="mt-6 text-xl font-bold text-gray-800">
                {userRole === 'teacher' ? "Preparing Exam..." : "Getting Questions Ready!"}
            </h3>
            <p className="text-gray-500 mt-2 text-sm max-w-[200px]">
                AI is reading and writing...
            </p>
          </div>
        )}
        
        {error && (
             <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center relative animate-fade-in">
                 <p className="font-bold mb-1">Oops!</p>
                 {error}
                 <button onClick={() => setError(null)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">✕</button>
             </div>
        )}

        {currentScreen === 'login' && (
            <LoginScreen onSelectRole={handleSelectRole} />
        )}

        {currentScreen === 'teacher-dashboard' && (
            <TeacherDashboard 
                activeExams={activeExams} 
                onCreateExam={handleCreateExam} 
                onDeleteExam={handleDeleteExam}
                onUpdateExam={handleUpdateExam}
                onPreviewExam={handlePreviewExam}
                loading={loading}
            />
        )}

        {currentScreen === 'student-dashboard' && (
          <StudentDashboard 
            onStartPractice={handleStartPractice} 
            onJoinExam={handleJoinExam} 
            stats={studentStats}
          />
        )}

        {currentScreen === 'student-details' && (
          <StudentDetailsScreen
            topic={currentTopic}
            onStart={handleStudentDetailsSubmit}
            onCancel={goHome}
          />
        )}

        {currentScreen === 'exam' && !loading && (
          <ExamSession 
            questions={questions} 
            topic={currentTopic} 
            examId={currentExamId}
            initialState={resumedState}
            onFinish={finishExam}
            onBack={goHome}
            timeLimit={currentExamId && activeExams[currentExamId] ? activeExams[currentExamId].timeLimit : undefined}
          />
        )}

        {currentScreen === 'results' && (
          <ResultsView 
            questions={questions}
            userAnswers={userAnswers}
            timeTaken={timeTaken}
            studentName={studentName}
            studentClass={studentClass}
            onHome={goHome}
            onRetry={retryExam}
          />
        )}
      </main>
    </div>
  );
};

export default App;