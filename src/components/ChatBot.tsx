import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { InterviewResults } from './InterviewResults';
import { evaluateAnswer, calculateOverallResults } from '../lib/interview';
import { getZohoIdFromUrl } from '../lib/urlUtils';
import { sendInterviewResults } from '../lib/webhookService';
import { saveInterviewResults } from '../lib/supabaseService';
import { Message } from '../types/chat';
import { InterviewState, QuestionAnswer } from '../types/interview';
import { useInterviewQuestions } from '../hooks/useInterviewQuestions';
import { Bot, ClipboardList, Trophy, Target, Users, TrendingUp } from 'lucide-react';

export const ChatBot = () => {
  const { questions, loading: questionsLoading, error: questionsError, getQuestionCounts } = useInterviewQuestions();
  const questionCounts = getQuestionCounts();

  const [messages, setMessages] = useState<Message[]>([]);
  const [interviewState, setInterviewState] = useState<InterviewState>({
    currentQuestionIndex: 0,
    answers: [],
    isComplete: false,
    averageScore: 0,
    overallLevel: 'Level 2'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [zohoId, setZohoId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract zoho_id from URL on component mount
  useEffect(() => {
    const id = getZohoIdFromUrl();
    setZohoId(id);
    console.log('Zoho ID extracted from URL:', id);
  }, []);

  // Initialize welcome message when questions are loaded
  useEffect(() => {
    if (!questionsLoading && questions.length > 0 && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        content: `Welcome to Scaled Inc's Interactive AI Screening Interview for Level 1, Level 2, and Level 3 MSP Technicians!

This structured interview will evaluate your technical proficiency, problem-solving skills, and professional experience. Please answer each question thoughtfully and clearly.

I'll ask you ${questionCounts.total} questions covering:
• Technical Competencies (${questionCounts.technical} questions)
• Scenario-based Problem Solving (${questionCounts.scenarioBased} questions) 
• Behavioral & Soft Skills (${questionCounts.behavioral} questions)

Each answer will be evaluated and scored:
• Score 80-100: Level 3 (Advanced expertise)
• Score 40-79: Level 2 (Solid foundation) 
• Score 0-39: Level 1 (Basic understanding)

Ready to begin?

**Question 1:** ${questions[0].question}`,
        role: 'assistant',
        timestamp: new Date(),
        questionId: 1
      };
      setMessages([welcomeMessage]);
    }
  }, [questionsLoading, questions, messages.length, questionCounts]);

  // Show loading state while fetching questions
  if (questionsLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-6 h-6 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Loading Interview Questions...</h2>
            <p className="text-slate-600">Please wait while we prepare your assessment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if questions failed to load
  if (questionsError) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Questions</h2>
            <p className="text-slate-600">{questionsError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // If interview is complete, don't process answers
      if (interviewState.isComplete) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Thank you! The interview has been completed. We appreciate your time and interest in our position.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      // Evaluate the current answer
      const currentQuestion = questions[interviewState.currentQuestionIndex];
      const evaluation = await evaluateAnswer(currentQuestion.id, content);
      
      // Update interview state with the new answer
      const updatedAnswers = [...interviewState.answers, evaluation];
      const nextQuestionIndex = interviewState.currentQuestionIndex + 1;
      const isComplete = nextQuestionIndex >= questions.length;

      let responseContent = '';

      if (!isComplete) {
        const nextQuestion = questions[nextQuestionIndex];
        responseContent = `**Question ${nextQuestion.id}:** ${nextQuestion.question}`;
      } else {
        const { averageScore, overallLevel } = calculateOverallResults(updatedAnswers);
        responseContent = `🎉 **Interview Complete!** 

Thank you for completing our AI-powered pre-screening interview. Your responses will be carefully evaluated, and we will follow up with you regarding the next steps in our hiring process. We appreciate your interest in joining our team!`;
        
        // Save results to both Zoho Flow webhook and Supabase if zoho_id is available
        if (zohoId) {
          try {
            // Save to Supabase database
            await saveInterviewResults(zohoId, updatedAnswers, averageScore, overallLevel);
            console.log('Interview results successfully saved to Supabase');
            
            // Send to Zoho Flow webhook
            await sendInterviewResults(zohoId, updatedAnswers, averageScore, overallLevel);
            console.log('Interview results successfully sent to Zoho Flow');
          } catch (error) {
            console.error('Failed to save/send results:', error);
            // Continue with the interview completion even if saving fails
          }
        } else {
          console.warn('No zoho_id found in URL, skipping data persistence');
        }
        
        setInterviewState({
          currentQuestionIndex: nextQuestionIndex,
          answers: updatedAnswers,
          isComplete: true,
          averageScore,
          overallLevel: overallLevel as 'Level 2' | 'Level 3'
        });
      }

      // Update interview state
      if (!isComplete) {
        setInterviewState(prev => ({
          ...prev,
          currentQuestionIndex: nextQuestionIndex,
          answers: updatedAnswers
        }));
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
        questionId: !isComplete ? questions[nextQuestionIndex].id : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing interview answer:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error processing your answer. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Sidebar */}
      <div className="w-96 bg-white/95 backdrop-blur-xl border-r border-slate-200/50 shadow-xl hidden md:block">
        <div className="p-8">
          {/* Logo & Header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardList className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                AI Interview
              </h1>
              <p className="text-sm text-slate-500 font-medium">MSP Technician Assessment</p>
              {zohoId && (
                <p className="text-xs text-slate-400">Zoho ID: {zohoId}</p>
              )}
            </div>
          </div>
          
          {/* Progress Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-800">Progress Overview</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Questions</span>
                <span className="text-sm font-bold text-slate-800">
                  {Math.min(interviewState.currentQuestionIndex + 1, questions.length)}/{questions.length}
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm" 
                    style={{ width: `${(Math.min(interviewState.currentQuestionIndex + 1, questions.length) / questions.length) * 100}%` }}
                  ></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
              
              {interviewState.answers.length > 0 && interviewState.isComplete && (
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Average Score</span>
                    <span className="text-lg font-bold text-blue-600">
                      {(interviewState.answers.reduce((sum, ans) => sum + ans.score, 0) / interviewState.answers.length).toFixed(1)}/100
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Assessment Sections */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100/50 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-800">Scoring System</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-emerald-200/30">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Level 3</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-auto">80-100</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-emerald-200/30">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Level 2</span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full ml-auto">40-79</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-emerald-200/30">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Level 1</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full ml-auto">0-39</span>
              </div>
            </div>
          </div>

          {/* Achievement Badge */}
          {interviewState.isComplete && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-slate-800">Completed!</h3>
              </div>
              <p className="text-sm text-slate-600">
                Interview assessment finished successfully.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Interview Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center md:hidden shadow-lg">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">MSP Technician Assessment</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Evaluating your response...
                      </span>
                    ) : interviewState.isComplete ? (
                      <span className="flex items-center gap-2 text-emerald-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Assessment completed successfully
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Question {interviewState.currentQuestionIndex + 1} of {questions.length}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className={`px-4 py-2 rounded-full text-xs font-bold ${
                interviewState.isComplete 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {interviewState.isComplete ? 'Completed' : 'In Progress'}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area - Fixed height and scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Enhanced Input Area */}
        <div className="border-t border-slate-200/50 bg-white/95 backdrop-blur-xl shadow-lg">
          <MessageInput 
            onSendMessage={handleSendMessage} 
            disabled={isLoading || questions.length === 0}
            placeholder={interviewState.isComplete ? "Interview completed - thank you for your time" : "Share your detailed response..."}
          />
        </div>
      </div>
    </div>
  );
};
