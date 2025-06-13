
import { supabaseAdmin, supabase } from './supabase';
import { QuestionAnswer } from '../types/interview';

export interface InterviewResult {
  candidate_id: string;
  overall_score: number;
  overall_level: string;
  technical_accuracy: number;
  problem_solving: number;
  communication: number;
  documentation: number;
  feedback: string;
  ai_detected: boolean;
  completed_at: string;
  answers: QuestionAnswer[];
}

export const saveInterviewResults = async (
  candidateId: string,
  answers: QuestionAnswer[],
  averageScore: number,
  overallLevel: 'Level 1' | 'Level 2' | 'Level 3'
): Promise<void> => {
  // Calculate average metrics
  const avgTechnicalAccuracy = answers.reduce((sum, a) => sum + a.technicalAccuracy, 0) / answers.length;
  const avgProblemSolving = answers.reduce((sum, a) => sum + a.problemSolving, 0) / answers.length;
  const avgCommunication = answers.reduce((sum, a) => sum + a.communication, 0) / answers.length;
  const avgDocumentation = answers.reduce((sum, a) => sum + a.documentation, 0) / answers.length;

  // Generate Assessment Summary based on overall performance
  const aiDetectedCount = answers.filter(a => a.aiDetected).length;
  const hasAiDetection = aiDetectedCount > 0;
  const isSuitableForSeniorRole = averageScore >= 80 && !hasAiDetection;
  const isSuitableForStandardRole = averageScore >= 40 && !hasAiDetection;

  let assessmentSummary = "Assessment Summary & Next Steps: ";
  
  if (hasAiDetection) {
    assessmentSummary += `This candidate's assessment integrity was compromised due to AI-generated responses. This candidate is disqualified from this assessment round. Recommend retaking assessment under proper supervision. Consider implementing additional verification measures for this candidate.`;
  } else if (overallLevel === 'Level 3' && isSuitableForSeniorRole) {
    assessmentSummary += `This candidate demonstrates exceptional technical competencies (Score: ${averageScore}/100). This candidate is highly suitable for senior technical roles and mentoring positions. This candidate showed strong performance across all evaluation metrics. Consider this candidate for specialized project leadership opportunities.`;
  } else if (overallLevel === 'Level 2' && isSuitableForStandardRole) {
    assessmentSummary += `This candidate shows solid technical foundation (Score: ${averageScore}/100). This candidate is suitable for standard MSP technician roles with appropriate support. This candidate has areas for improvement identified in evaluation metrics. This candidate should continue professional development to reach senior level.`;
  } else {
    assessmentSummary += `This candidate needs significant improvement (Score: ${averageScore}/100). This candidate is not suitable for MSP technician roles at this time. This candidate has significant gaps identified across multiple evaluation areas. Recommend comprehensive training and skill development before this candidate reapplies.`;
  }

  const interviewResult: Omit<InterviewResult, 'id'> = {
    candidate_id: candidateId,
    overall_score: averageScore,
    overall_level: overallLevel,
    technical_accuracy: Number(avgTechnicalAccuracy.toFixed(1)),
    problem_solving: Number(avgProblemSolving.toFixed(1)),
    communication: Number(avgCommunication.toFixed(1)),
    documentation: Number(avgDocumentation.toFixed(1)),
    feedback: assessmentSummary,
    ai_detected: hasAiDetection,
    completed_at: new Date().toISOString(),
    answers: answers
  };

  try {
    console.log('Saving interview results to Supabase:', interviewResult);
    
    // Use supabaseAdmin client to bypass RLS
    const { error } = await supabaseAdmin
      .from('interview_results')
      .insert([interviewResult]);

    if (error) {
      throw error;
    }

    console.log('Interview results saved successfully to Supabase');
  } catch (error) {
    console.error('Error saving interview results to Supabase:', error);
    throw new Error('Failed to save interview results to database');
  }
};

export const getInterviewResults = async (candidateId?: string) => {
  try {
    let query = supabase
      .from('interview_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching interview results from Supabase:', error);
    throw new Error('Failed to fetch interview results from database');
  }
};
