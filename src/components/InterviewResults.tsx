
import React from 'react';
import { QuestionAnswer } from '../types/interview';
import { CheckCircle, Award, FileText, AlertTriangle } from 'lucide-react';

interface InterviewResultsProps {
  answers: QuestionAnswer[];
  averageScore: number;
  overallLevel: 'Level 1' | 'Level 2' | 'Level 3';
}

export const InterviewResults: React.FC<InterviewResultsProps> = ({
  answers,
  averageScore,
  overallLevel
}) => {
  // Count questions by level
  const levelCounts = {
    'Level 1': answers.filter(a => a.level === 'Level 1').length,
    'Level 2': answers.filter(a => a.level === 'Level 2').length,
    'Level 3': answers.filter(a => a.level === 'Level 3').length
  };

  // Determine suitability based on average score and level distribution
  const isSuitableForSeniorRole = averageScore >= 80;
  const isSuitableForStandardRole = averageScore >= 40;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Interview Complete</h3>
          <p className="text-sm text-gray-500">Technical Screening Results</p>
        </div>
      </div>

      {/* Overall Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-800">Overall Score</h4>
          </div>
          <p className="text-2xl font-bold text-blue-600">{averageScore}/100</p>
        </div>

        <div className={`rounded-xl p-4 border ${
          overallLevel === 'Level 3' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' 
            : overallLevel === 'Level 2'
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-100'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-100'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <FileText className={`w-5 h-5 ${
              overallLevel === 'Level 3' ? 'text-green-600' 
              : overallLevel === 'Level 2' ? 'text-yellow-600' 
              : 'text-red-600'
            }`} />
            <h4 className="font-semibold text-gray-800">Overall Level</h4>
          </div>
          <p className={`text-2xl font-bold ${
            overallLevel === 'Level 3' ? 'text-green-600' 
            : overallLevel === 'Level 2' ? 'text-yellow-600' 
            : 'text-red-600'
          }`}>
            {overallLevel}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-800">Level Distribution</h4>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-red-600">Level 1:</span>
              <span className="font-bold">{levelCounts['Level 1']}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Level 2:</span>
              <span className="font-bold">{levelCounts['Level 2']}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Level 3:</span>
              <span className="font-bold">{levelCounts['Level 3']}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Breakdown */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 mb-3">Question Breakdown:</h4>
        {answers.map((answer, index) => (
          <div key={answer.questionId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-gray-600">Question {answer.questionId}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">{answer.score}/100</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  answer.level === 'Level 3' 
                    ? 'bg-green-100 text-green-700' 
                    : answer.level === 'Level 2'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {answer.level}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{answer.feedback}</p>
          </div>
        ))}
      </div>

      {/* Recommendations based on overall performance */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
        <h4 className="font-semibold text-gray-800 mb-2">Assessment Summary & Next Steps:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          {overallLevel === 'Level 3' && isSuitableForSeniorRole ? (
            <>
              <li>• Candidate demonstrates exceptional technical competencies (Score: {averageScore}/100)</li>
              <li>• Highly suitable for senior technical roles and mentoring positions</li>
              <li>• {levelCounts['Level 3']} questions at Level 3, {levelCounts['Level 2']} at Level 2, {levelCounts['Level 1']} at Level 1</li>
              <li>• Consider for specialized project leadership opportunities</li>
            </>
          ) : overallLevel === 'Level 2' && isSuitableForStandardRole ? (
            <>
              <li>• Candidate shows solid technical foundation (Score: {averageScore}/100)</li>
              <li>• Suitable for standard MSP technician roles with appropriate support</li>
              <li>• {levelCounts['Level 3']} questions at Level 3, {levelCounts['Level 2']} at Level 2, {levelCounts['Level 1']} at Level 1</li>
              <li>• Continue professional development to reach senior level</li>
            </>
          ) : (
            <>
              <li>• Candidate needs significant improvement (Score: {averageScore}/100)</li>
              <li>• Not suitable for MSP technician roles at this time</li>
              <li>• {levelCounts['Level 3']} questions at Level 3, {levelCounts['Level 2']} at Level 2, {levelCounts['Level 1']} at Level 1</li>
              <li>• Recommend comprehensive training and skill development before reapplying</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};
