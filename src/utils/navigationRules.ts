import { secretKey } from '../constants';
import CryptoJS from 'crypto-js';

export interface NavigationRule {
  currentPath: string;
  previousPath: string;
  description: string;
  allowBack: boolean;
}

export const navigationRules: NavigationRule[] = [
  { currentPath: '/Dashboard', previousPath: '/Dashboard', description: 'Dashboard - no back navigation', allowBack: false },
  { currentPath: '/SubjectOverview', previousPath: '/Dashboard', description: 'SubjectOverview -> Dashboard', allowBack: true },
  { currentPath: '/Subject-Roadmap', previousPath: '/SubjectOverview', description: 'SubjectRoadmap -> SubjectOverview', allowBack: true },
  { currentPath: '/test', previousPath: '/Dashboard', description: 'Test -> Dashboard', allowBack: true },
  { currentPath: '/test-introduction', previousPath: '/test', description: 'TestIntroduction -> Test', allowBack: true },
  { currentPath: '/test-section', previousPath: '/test-introduction', description: 'TestSection -> TestIntroduction', allowBack: false },
  { currentPath: '/mcq-temp', previousPath: '/test-section', description: 'MCQ Test -> TestSection', allowBack: true },
  { currentPath: '/coding-temp', previousPath: '/test-section', description: 'Coding Test -> TestSection', allowBack: true },
  { currentPath: '/dynamic-coding-editor', previousPath: '/test-section', description: 'Dynamic Coding -> TestSection', allowBack: true },
  { currentPath: '/test-report', previousPath: '/test', description: 'TestReport -> Test', allowBack: true },
  { currentPath: '/Report-Problem', previousPath: '/Dashboard', description: 'ReportProblem -> Dashboard', allowBack: true },
  { currentPath: '/Profile', previousPath: '/Dashboard', description: 'Profile -> Dashboard', allowBack: true },
  { currentPath: '/EditProfile', previousPath: '/Profile', description: 'EditProfile -> Profile', allowBack: true },
  { currentPath: '/FAQ', previousPath: '/Dashboard', description: 'FAQ -> Dashboard', allowBack: true },
  { currentPath: '/Placement', previousPath: '/Dashboard', description: 'Placement -> Dashboard', allowBack: true },
  { currentPath: '/Reports', previousPath: '/Dashboard', description: 'Reports -> Dashboard', allowBack: true },
  { currentPath: '/OnlineSession', previousPath: '/Dashboard', description: 'OnlineSession -> Dashboard', allowBack: true },
  { currentPath: '/DeviceSessions', previousPath: '/Dashboard', description: 'DeviceSessions -> Dashboard', allowBack: true },
  { currentPath: '/InternetInfo', previousPath: '/Dashboard', description: 'InternetInfo -> Dashboard', allowBack: true },
  { currentPath: '/PyEditor', previousPath: '/Dashboard', description: 'PyEditor -> Dashboard', allowBack: true },
  { currentPath: '/SQLEditor', previousPath: '/Dashboard', description: 'SQLEditor -> Dashboard', allowBack: true },
  { currentPath: '/HTMLCSSEditor', previousPath: '/Dashboard', description: 'HTMLCSSEditor -> Dashboard', allowBack: true },
  { currentPath: '/JSEditor', previousPath: '/Dashboard', description: 'JSEditor -> Dashboard', allowBack: true },
  { currentPath: '/PythonContentTester', previousPath: '/Dashboard', description: 'PythonContentTester -> Dashboard', allowBack: true },
  { currentPath: '/RaiseTicket', previousPath: '/Report-Problem', description: 'RaiseTicket -> ReportProblem', allowBack: true },
  { currentPath: '/Upcoming', previousPath: '/Dashboard', description: 'Upcoming -> Dashboard', allowBack: true },
  { currentPath: '/Activity', previousPath: '/Dashboard', description: 'Activity -> Dashboard', allowBack: true },
  { currentPath: '/Calendar', previousPath: '/Dashboard', description: 'Calendar -> Dashboard', allowBack: true },
  { currentPath: '/Courses', previousPath: '/Dashboard', description: 'Courses -> Dashboard', allowBack: true },
  { currentPath: '/Progress', previousPath: '/Dashboard', description: 'Progress -> Dashboard', allowBack: true },
  { currentPath: '/DashBoardProfile', previousPath: '/Dashboard', description: 'DashBoardProfile -> Dashboard', allowBack: true },
  { currentPath: '/DetailPanel', previousPath: '/Dashboard', description: 'DetailPanel -> Dashboard', allowBack: true },
  { currentPath: '/Layout', previousPath: '/Dashboard', description: 'Layout -> Dashboard', allowBack: true },
  { currentPath: '/Sidebar', previousPath: '/Dashboard', description: 'Sidebar -> Dashboard', allowBack: true },
  { currentPath: '/Footer', previousPath: '/Dashboard', description: 'Footer -> Dashboard', allowBack: true },
  { currentPath: '/TestingMCQS', previousPath: '/Dashboard', description: 'TestingMCQS -> Dashboard', allowBack: true },
  { currentPath: '/QuestionNavigation', previousPath: '/Dashboard', description: 'QuestionNavigation -> Dashboard', allowBack: true },
  { currentPath: '/SkeletonTestSection', previousPath: '/Dashboard', description: 'SkeletonTestSection -> Dashboard', allowBack: true },
  { currentPath: '/MCQSkeletonCode', previousPath: '/Dashboard', description: 'MCQSkeletonCode -> Dashboard', allowBack: true },
  { currentPath: '/CodingSkeletonCode', previousPath: '/Dashboard', description: 'CodingSkeletonCode -> Dashboard', allowBack: true },
  { currentPath: '/EditorSkeletonCode', previousPath: '/Dashboard', description: 'EditorSkeletonCode -> Dashboard', allowBack: true },
  { currentPath: '/DynamicCodingEditorWrapper', previousPath: '/Dashboard', description: 'DynamicCodingEditorWrapper -> Dashboard', allowBack: true },
  { currentPath: '/PythonCodeEditor', previousPath: '/Dashboard', description: 'PythonCodeEditor -> Dashboard', allowBack: true },
  { currentPath: '/SQLCodeEditor', previousPath: '/Dashboard', description: 'SQLCodeEditor -> Dashboard', allowBack: true },
  { currentPath: '/SubjectRoadMap', previousPath: '/Dashboard', description: 'SubjectRoadMap -> Dashboard', allowBack: true },
  { currentPath: '/TestHeader', previousPath: '/Dashboard', description: 'TestHeader -> Dashboard', allowBack: true },
  { currentPath: '/TestIntroduction', previousPath: '/Dashboard', description: 'TestIntroduction -> Dashboard', allowBack: true },
  { currentPath: '/TestMcq', previousPath: '/Dashboard', description: 'TestMcq -> Dashboard', allowBack: true },
  { currentPath: '/TestSQLCoding', previousPath: '/Dashboard', description: 'TestSQLCoding -> Dashboard', allowBack: true },
  { currentPath: '/TestReport', previousPath: '/Dashboard', description: 'TestReport -> Dashboard', allowBack: true },
  { currentPath: '/TestSection', previousPath: '/Dashboard', description: 'TestSection -> Dashboard', allowBack: true },
  { currentPath: '/Test', previousPath: '/Dashboard', description: 'Test -> Dashboard', allowBack: true },
  { currentPath: '/Login', previousPath: '/Dashboard', description: 'Login -> Dashboard', allowBack: true },
  { currentPath: '/', previousPath: '/Dashboard', description: 'Root -> Dashboard', allowBack: true }
];

export const getPreviousPath = (currentPath: string): string => {
  const normalizedPath = currentPath.toLowerCase();
  const rule = navigationRules.find(rule => rule.currentPath.toLowerCase() === normalizedPath);
  return rule ? rule.previousPath : '/Dashboard';
};

export const isBackNavigationAllowed = (currentPath: string): boolean => {
  const normalizedPath = currentPath.toLowerCase();
  const rule = navigationRules.find(rule => rule.currentPath.toLowerCase() === normalizedPath);
  return rule ? rule.allowBack : true;
};

export const getNavigationDescription = (currentPath: string): string => {
  const normalizedPath = currentPath.toLowerCase();
  const rule = navigationRules.find(rule => rule.currentPath.toLowerCase() === normalizedPath);
  return rule ? rule.description : 'Default navigation';
};

export const handleSpecialCases = (currentPath: string): string | null => {
  const normalizedPath = currentPath.toLowerCase();
  
  // Handle root path
  if (normalizedPath === '/' || normalizedPath === '') {
    return '/Dashboard';
  }
  
  return null;
};

export const getBackNavigationPath = (currentPath: string): string => {
  const normalizedPath = currentPath.toLowerCase();
  
  // Check for special cases first
  const specialCase = handleSpecialCases(currentPath);
  if (specialCase) {
    return specialCase;
  }
  
  // Find matching rule
  const rule = navigationRules.find(rule => rule.currentPath.toLowerCase() === normalizedPath);
  
  if (rule) {
    return rule.previousPath;
  }
  
  // Default fallback
  return '/Dashboard';
};

export const getAllNavigationRules = (): NavigationRule[] => {
  return navigationRules;
};

export const validateNavigationRules = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for duplicate current paths
  const currentPaths = navigationRules.map(rule => rule.currentPath.toLowerCase());
  const uniquePaths = new Set(currentPaths);
  
  if (currentPaths.length !== uniquePaths.size) {
    errors.push('Duplicate current paths found');
  }
  
  // Check for invalid previous paths
  navigationRules.forEach(rule => {
    if (!rule.previousPath.startsWith('/')) {
      errors.push(`Invalid previous path for ${rule.currentPath}: ${rule.previousPath}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 