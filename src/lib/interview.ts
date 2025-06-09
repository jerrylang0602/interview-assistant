
import { sendMessage } from './openai';
import { Message } from '../types/chat';
import { QuestionAnswer, INTERVIEW_QUESTIONS } from '../types/interview';

export const evaluateAnswer = async (questionId: number, answer: string): Promise<QuestionAnswer> => {
  const question = INTERVIEW_QUESTIONS.find(q => q.id === questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  const evaluationPrompt = `
You are an expert technical interviewer evaluating MSP technician candidates for Level 1, Level 2, and Level 3 positions.

Question: ${question.question}
Candidate Answer: ${answer}

Evaluate this answer based on:
- Technical Accuracy (0-40 points)
- Problem-Solving Methodology (0-30 points) 
- Professional Communication (0-20 points)
- Completeness (0-10 points)

Provide your response in this exact JSON format:
{
  "score": [total score out of 100],
  "feedback": "[brief constructive feedback explaining the score]"
}

Score Guidelines:
- 80-100: Advanced expertise, comprehensive understanding, proactive approaches
- 40-79: Solid foundational knowledge, standard procedures, some guidance needed
- 0-39: Basic understanding, significant gaps, requires substantial training
`;

  try {
    const messages: Message[] = [
      {
        id: '1',
        content: evaluationPrompt,
        role: 'user',
        timestamp: new Date()
      }
    ];

    const response = await sendMessage(messages);
    
    // Parse the JSON response
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const evaluation = JSON.parse(cleanResponse);
    
    // Determine level based on score
    let level: 'Level 1' | 'Level 2' | 'Level 3';
    if (evaluation.score >= 80) {
      level = 'Level 3';
    } else if (evaluation.score >= 40) {
      level = 'Level 2';
    } else {
      level = 'Level 1';
    }
    
    return {
      questionId,
      question: question.question,
      answer,
      score: evaluation.score,
      level,
      feedback: evaluation.feedback
    };
  } catch (error) {
    console.error('Error evaluating answer:', error);
    // Fallback evaluation
    return {
      questionId,
      question: question.question,
      answer,
      score: 50,
      level: 'Level 2',
      feedback: 'Answer received but evaluation service encountered an error.'
    };
  }
};

export const calculateOverallResults = (answers: QuestionAnswer[]) => {
  if (answers.length === 0) {
    return { averageScore: 0, overallLevel: 'Level 2' as const };
  }

  const averageScore = answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length;
  
  // Determine overall level based on average score using same criteria
  let overallLevel: 'Level 1' | 'Level 2' | 'Level 3';
  if (averageScore >= 80) {
    overallLevel = 'Level 3';
  } else if (averageScore >= 40) {
    overallLevel = 'Level 2';
  } else {
    overallLevel = 'Level 1';
  }

  return { averageScore: Math.round(averageScore * 10) / 10, overallLevel };
};
