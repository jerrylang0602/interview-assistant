
import { QuestionAnswer } from '../types/interview';

interface InterviewResultPayload {
  id: string;
  "Overall Score": string;
  "Overall Level": string;
  "Technical Accuracy": string;
  "Problem Solving": string;
  "Communication": string;
  "Documentation": string;
}

export const sendInterviewResults = async (
  candidateId: string,
  answers: QuestionAnswer[],
  averageScore: number,
  overallLevel: 'Level 1' | 'Level 2' | 'Level 3'
): Promise<void> => {
  const webhookUrl = 'https://flow.zoho.com/881059997/flow/webhook/incoming?zapikey=1001.d05613f40e8286ac4314821393246f81.bd7c5cabd1405d63d22b91933c934de4&isdebug=false';

  // Calculate average metrics
  const avgTechnicalAccuracy = answers.reduce((sum, a) => sum + a.technicalAccuracy, 0) / answers.length;
  const avgProblemSolving = answers.reduce((sum, a) => sum + a.problemSolving, 0) / answers.length;
  const avgCommunication = answers.reduce((sum, a) => sum + a.communication, 0) / answers.length;
  const avgDocumentation = answers.reduce((sum, a) => sum + a.documentation, 0) / answers.length;

  const payload: InterviewResultPayload = {
    id: candidateId,
    "Overall Score": averageScore.toString(),
    "Overall Level": overallLevel,
    "Technical Accuracy": avgTechnicalAccuracy.toFixed(1),
    "Problem Solving": avgProblemSolving.toFixed(1),
    "Communication": avgCommunication.toFixed(1),
    "Documentation": avgDocumentation.toFixed(1)
  };

  try {
    console.log('Sending interview results to Zoho Flow:', payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Interview results sent successfully to Zoho Flow');
  } catch (error) {
    console.error('Error sending interview results to Zoho Flow:', error);
    throw new Error('Failed to send interview results to external system');
  }
};
