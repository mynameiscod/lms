import React, { useState, useEffect } from 'react';
import { Button, Alert, Spinner } from '../common';
import QuestionSelector from '../QuestionSelector/QuestionSelector';
import './QuizQuestionLinking.css';
import { quizApi } from '../../api';

interface QuizQuestionLinkingProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuizQuestionLinking: React.FC<QuizQuestionLinkingProps> = ({
  quizId,
  quizTitle,
  onClose,
  onSuccess
}) => {
  const [linkedCount, setLinkedCount] = useState(0);
  const [totalLinkedMarks, setTotalLinkedMarks] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch current linked questions count
  useEffect(() => {
    const fetchLinkedQuestions = async () => {
      try {
        setLoading(true);
        const response = await quizApi.getQuizById(quizId);
        const count = response?.questionIds?.length || 0;
        
        // Calculate total marks from linked questions
        if (response?.questions) {
          const totalMarks = response.questions.reduce(
            (sum: number, q: any) => sum + (q.marks || 0),
            0
          );
          setTotalLinkedMarks(totalMarks);
        }
        
        setLinkedCount(count);
      } catch (err) {
        console.error('Failed to fetch linked questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedQuestions();
  }, [quizId]);

  const handleQuestionsLinked = (count: number, totalMarks: number) => {
    setLinkedCount(count);
    setTotalLinkedMarks(totalMarks);
    onSuccess?.();
  };

  return (
    <div className="quiz-question-linking">
      <div className="linking-header">
        <h2>🔗 Link Questions to Quiz</h2>
        <p className="quiz-title">{quizTitle}</p>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="linking-stats">
        <div className="stat-card">
          <span className="stat-label">Questions Linked</span>
          <span className="stat-value">{linkedCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Marks</span>
          <span className="stat-value">{totalLinkedMarks}</span>
        </div>
      </div>

      <div className="linking-content">
        {loading ? (
          <div className="loading-container">
            <Spinner />
            <p>Loading quiz details...</p>
          </div>
        ) : (
          <QuestionSelector
            quizId={quizId}
            onQuestionsLinked={handleQuestionsLinked}
          />
        )}
      </div>

      <div className="linking-footer">
        <Button onClick={onClose} className="btn-secondary">
          Done
        </Button>
      </div>
    </div>
  );
};

export default QuizQuestionLinking;
