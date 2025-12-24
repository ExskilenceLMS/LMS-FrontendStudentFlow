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