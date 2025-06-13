import { supabaseAdmin, supabase } from './supabase';
import { QuestionAnswer } from '../types/interview';
import { analyzeInterviewMetrics, generateDynamicFeedback } from './feedbackGenerator';

export interface InterviewResult {
  id?: string;
  zoho_id: string;
  candidate_id?: string; // Made optional
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
  questions?: QuestionAnswer[]; // For compatibility with the questions field
  status?: string;
}

export const saveInterviewResults = async (
  zohoId: string,
  answers: QuestionAnswer[],
  averageScore: number,
  overallLevel: 'Level 1' | 'Level 2' | 'Level 3'
): Promise<void> => {
  // Analyze interview metrics and generate dynamic feedback
  const analysis = analyzeInterviewMetrics(answers, averageScore, overallLevel);
  const dynamicFeedback = generateDynamicFeedback(analysis);

  // Transform answers to match the expected structure for the questions field
  const questionsData = answers.map(answer => ({
    id: answer.questionId.toString(),
    score: answer.score,
    answer: answer.answer,
    question: answer.question,
    aiDetected: answer.aiDetected
  }));

  const interviewResult = {
    zoho_id: zohoId,
    overall_score: averageScore,
    overall_level: overallLevel,
    technical_accuracy: analysis.technicalAccuracy,
    problem_solving: analysis.problemSolving,
    communication: analysis.communication,
    documentation: analysis.documentation,
    feedback: dynamicFeedback,
    ai_detected: analysis.aiDetected,
    completed_at: new Date().toISOString(),
    answers: answers,
    questions: questionsData,
    status: 'completed'
  };

  try {
    console.log('Saving interview results to Supabase with zoho_id:', zohoId);
    console.log('Generated dynamic feedback:', dynamicFeedback);
    
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

export const getInterviewResults = async (zohoId?: string) => {
  try {
    let query = supabase
      .from('interview_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (zohoId) {
      query = query.eq('zoho_id', zohoId);
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

// Function to get interview results with candidate information (like populate/inner join)
export const getInterviewResultsWithCandidateInfo = async (zohoId?: string) => {
  try {
    let query = supabase
      .from('interview_results')
      .select(`
        *,
        candidates!inner(
          zoho_id,
          first_name,
          last_name,
          full_name,
          email,
          mobile,
          current_job_title,
          experience_in_years,
          candidate_status,
          candidate_stage
        )
      `)
      .order('completed_at', { ascending: false });

    if (zohoId) {
      query = query.eq('zoho_id', zohoId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching interview results with candidate info:', error);
    throw new Error('Failed to fetch interview results with candidate information');
  }
};
