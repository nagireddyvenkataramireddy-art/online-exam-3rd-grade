import React from 'react';
import { GraduationCap, School } from 'lucide-react';

interface LoginScreenProps {
  onSelectRole: (role: 'teacher' | 'student') => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 animate-fade-in">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-200 rotate-3 mb-4">
            <School className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Examo<span className="text-blue-600">Class</span></h1>
        <p className="text-gray-500 mt-2">The AI Classroom Assistant</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => onSelectRole('student')}
          className="w-full bg-white p-6 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <School size={80} className="text-blue-500 rotate-12" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl group-hover:scale-110 transition-transform">
              🎒
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-800">I am a Student</h3>
              <p className="text-sm text-gray-400">Join a quiz or practice</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelectRole('teacher')}
          className="w-full bg-white p-6 rounded-2xl shadow-md border-2 border-transparent hover:border-purple-500 hover:shadow-lg transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <GraduationCap size={80} className="text-purple-500 -rotate-12" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-2xl group-hover:scale-110 transition-transform">
              🍎
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-800">I am a Teacher</h3>
              <p className="text-sm text-gray-400">Create exams & questions</p>
            </div>
          </div>
        </button>
      </div>
      
      <p className="mt-12 text-xs text-gray-400">Powered by Google Gemini</p>
    </div>
  );
};

export default LoginScreen;
