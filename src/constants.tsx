export const secretKey: string = process.env.REACT_APP_SECRET_KEY || '';

// Activity Types
export const ACTIVITY_TYPE = {
  TICKET: 'ticket',
  DASHBOARD: 'dashboard',
  TEST: 'test',
  LIVE_SESSION: 'live_session',
} as const;

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

// Test Question Navigation colors
export const TEST_QUESTION_NAV_COLORS = {
  GREEN_BG: '#42FF58',
  GRAY_BG: '#808080',
  WHITE_BG: '#fff',
  WHITE_TEXT: '#fff',
  BLACK_TEXT: '#000',
} as const;

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