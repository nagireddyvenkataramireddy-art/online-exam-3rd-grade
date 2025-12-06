import React, { useState } from 'react';
import { Topic } from '../types';
import { BookOpen, Calculator, FlaskConical, Globe, Puzzle, Pencil, Play, Hash, Award, Star, Zap } from 'lucide-react';

interface StudentDashboardProps {
  onStartPractice: (topic: string) => void;
  onJoinExam: (code: string) => void;
  stats: { points: number; examsCompleted: number; streak: number };
}

const TOPICS: Topic[] = [
  { id: 'math', name: 'Math', icon: 'math', color: 'bg-blue-500', description: 'Multiplication, Division, and Fractions' },
  { id: 'science', name: 'Science', icon: 'science', color: 'bg-green-500', description: 'Animals, Plants, Weather, and Space' },
  { id: 'english', name: 'English', icon: 'english', color: 'bg-red-500', description: 'Grammar, Spelling, and Reading' },
  { id: 'geo', name: 'Geography', icon: 'geo', color: 'bg-orange-500', description: 'Continents, Oceans, and Maps' },
  { id: 'history', name: 'History', icon: 'history', color: 'bg-yellow-500', description: 'Famous People and Past Events' },
  { id: 'logic', name: 'Puzzles', icon: 'logic', color: 'bg-purple-500', description: 'Patterns, Riddles, and Logic' },
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'math': return <Calculator size={24} className="text-white" />;
    case 'science': return <FlaskConical size={24} className="text-white" />;
    case 'english': return <BookOpen size={24} className="text-white" />;
    case 'geo': return <Globe size={24} className="text-white" />;
    case 'history': return <Pencil size={24} className="text-white" />;
    case 'logic': return <Puzzle size={24} className="text-white" />;
    default: return <BookOpen size={24} className="text-white" />;
  }
};

const getBadgeCount = (exams: number) => {
    let count = 0;
    if (exams >= 1) count++; // Rookie
    if (exams >= 5) count++; // Scholar
    if (exams >= 10) count++; // Master
    if (exams >= 25) count++; // Grandmaster
    if (exams >= 50) count++; // Legend
    return count;
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onStartPractice, onJoinExam, stats }) => {
  const [examCode, setExamCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (examCode.length === 4) {
      onJoinExam(examCode);
    }
  };

  return (
    <div className="pb-20">
      {/* Welcome Banner */}
      <div className="bg-blue-600 text-white px-6 pb-8 pt-2 rounded-b-3xl shadow-lg mb-6">
        <h2 className="text-3xl font-bold mb-1">Hi, Student! 👋</h2>
        <p className="text-blue-100 text-sm">Ready to take your exam or practice?</p>
        
        {/* Gamification Strip */}
        <div className="flex gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 min-w-[140px] border border-white/20">
                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-yellow-800 shadow-lg">
                    <Star size={16} fill="currentColor" />
                </div>
                <div>
                    <p className="text-xs font-bold text-blue-100 uppercase">Streak</p>
                    <p className="text-sm font-bold">{stats.streak} Days</p>
                </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 min-w-[140px] border border-white/20">
                <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-purple-900 shadow-lg">
                    <Award size={16} fill="currentColor" />
                </div>
                <div>
                    <p className="text-xs font-bold text-blue-100 uppercase">Badges</p>
                    <p className="text-sm font-bold">{getBadgeCount(stats.examsCompleted)} Earned</p>
                </div>
            </div>
             <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 min-w-[140px] border border-white/20">
                <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-green-900 shadow-lg">
                    <Zap size={16} fill="currentColor" />
                </div>
                <div>
                    <p className="text-xs font-bold text-blue-100 uppercase">Points</p>
                    <p className="text-sm font-bold">{stats.points}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="px-5">
        {/* Join Live Exam */}
        <div className="mb-8">
           <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
            Join Class Exam
          </h3>
          <form onSubmit={handleJoin} className="bg-white p-4 rounded-2xl shadow-md border-2 border-pink-100 flex flex-col gap-3">
             <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    maxLength={4}
                    placeholder="Enter 4-digit Code"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-xl font-bold tracking-widest text-gray-800 placeholder:text-gray-300 placeholder:text-base placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
             </div>
             <button 
                type="submit"
                disabled={examCode.length !== 4}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 py-3 rounded-xl font-bold text-white shadow-lg shadow-pink-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
             >
                Start Exam <Play size={18} fill="currentColor" />
             </button>
          </form>
        </div>

        <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
          Self Practice
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onStartPractice(topic.name)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all text-left group"
            >
              <div className={`w-12 h-12 ${topic.color} rounded-2xl flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg transition-shadow`}>
                {getIcon(topic.icon)}
              </div>
              <h4 className="font-bold text-gray-800 mb-1">{topic.name}</h4>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{topic.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;