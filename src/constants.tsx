export const secretKey: string = process.env.REACT_APP_SECRET_KEY || '';

// Level to Difficulty mapping
export const LEVEL_TO_DIFFICULTY: { [key: string]: string } = {
  level1: 'Easy',
  level2: 'Medium',
  level3: 'Hard',
};

// Difficulty colors
export const DIFFICULTY_COLORS: { [key: string]: string } = {
  Easy: '#12B500',
  Medium: '#FF9800',
  Hard: '#F44336',
};

// Get max length for question title based on window width
export const getQuestionTitleMaxLength = (): number => {
  if (window.innerWidth < 600) {
    return 22;
  } else if (window.innerWidth < 1024) {
    return 55;
  } else if (window.innerWidth < 1400) {
    return 75;
  } else {
    return 110;
  }
};