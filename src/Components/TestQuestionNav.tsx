import React, { useRef, useEffect } from "react";
import { TEST_QUESTION_NAV_COLORS } from "../constants";

interface TestQuestionNavProps {
  totalQuestions: number;
  currentIndex: number;
  onQuestionClick: (index: number) => void;
  questionStatuses: { [key: string]: string };
  questions: any[];
}

// Store scroll position outside component to persist across re-renders
let savedScrollTop = 0;

const TestQuestionNav: React.FC<TestQuestionNavProps> = React.memo(({
  totalQuestions,
  currentIndex,
  onQuestionClick,
  questionStatuses,
  questions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Restore scroll position after render
  useEffect(() => {
    if (containerRef.current && savedScrollTop > 0) {
      containerRef.current.scrollTop = savedScrollTop;
    }
  });

  // Save scroll position on scroll
  const handleScroll = () => {
    if (containerRef.current) {
      savedScrollTop = containerRef.current.scrollTop;
    }
  };

  const handleQuestionClick = (index: number) => {
    // Scroll to clicked question button
    if (buttonRefs.current[index] && containerRef.current) {
      const button = buttonRefs.current[index];
      const container = containerRef.current;
      
      if (button) {
        const buttonTop = button.offsetTop;
        const buttonHeight = button.offsetHeight;
        const containerHeight = container.clientHeight;
        
        // Scroll to center the button in the container
        const scrollPosition = buttonTop - (containerHeight / 2) + (buttonHeight / 2);
        savedScrollTop = Math.max(0, scrollPosition);
        container.scrollTo({
          top: savedScrollTop,
          behavior: 'smooth'
        });
      }
    }
    
    // Call the parent handler
    onQuestionClick(index);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        width: "70px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {Array.from({ length: totalQuestions }).map((_, index) => {
        const questionStatus = questionStatuses[`coding_${questions[index]?.Qn_name}`];
        const isSubmitted = questionStatus === "Submitted" || questionStatus === "Attempted";
        const isSelected = currentIndex === index;
        let backgroundColor: string;
        let textColor: string;
        
        if (isSelected && isSubmitted) {
          // selected and Submitted - green bg and white text
          backgroundColor = TEST_QUESTION_NAV_COLORS.GREEN_BG;
          textColor = TEST_QUESTION_NAV_COLORS.WHITE_TEXT;
        } else if (isSelected) {
          // selected - gray bg and white text
          backgroundColor = TEST_QUESTION_NAV_COLORS.GRAY_BG;
          textColor = TEST_QUESTION_NAV_COLORS.WHITE_TEXT;
        } else if (isSubmitted) {
          // Submitted - green bg and black text
          backgroundColor = TEST_QUESTION_NAV_COLORS.GREEN_BG;
          textColor = TEST_QUESTION_NAV_COLORS.BLACK_TEXT;
        } else {
          // Not submitted - white bg and black text
          backgroundColor = TEST_QUESTION_NAV_COLORS.WHITE_BG;
          textColor = TEST_QUESTION_NAV_COLORS.BLACK_TEXT;
        }

        return (
          <button
            key={index}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            className="btn rounded-2 mb-2 px-1 mx-auto"
            style={{
              width: "50px",
              height: "50px",
              backgroundColor,
              color: textColor,
              cursor: "pointer",
              boxShadow: "#888 1px 2px 5px 0px",
            }}
            onClick={() => handleQuestionClick(index)}
          >
            Q{index + 1}
          </button>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.totalQuestions === nextProps.totalQuestions &&
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.questionStatuses === nextProps.questionStatuses &&
    prevProps.questions === nextProps.questions
    // Ignore onQuestionClick function reference changes
  );
});

TestQuestionNav.displayName = 'TestQuestionNav';

export default TestQuestionNav;
