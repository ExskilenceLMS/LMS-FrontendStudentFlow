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
  { currentPath: '/practice-coding/', previousPath: '/Subject-Roadmap', description: 'CourseCoding -> SubjectRoadmap', allowBack: true },
  { currentPath: '/test', previousPath: '/Dashboard', description: 'Test -> Dashboard', allowBack: true },
  { currentPath: '/test-introduction', previousPath: '/test', description: 'TestIntroduction -> Test', allowBack: true },
  { currentPath: '/test-section', previousPath: '/test-introduction', description: 'TestSection -> TestIntroduction', allowBack: true },
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
  { currentPath: '/Online-Session', previousPath: '/Dashboard', description: 'OnlineSession -> Dashboard', allowBack: true },
  { currentPath: '/project-roadmap', previousPath: '/Dashboard', description: 'ProjectRoadmap -> Dashboard', allowBack: true },
  { currentPath: '/project-tasks', previousPath: '/project-roadmap', description: 'ProjectTasks -> ProjectRoadmap', allowBack: true },
  { currentPath: '/editor', previousPath: '/project-tasks', description: 'UnifiedEditor -> ProjectTasks', allowBack: true },
];

export const getPreviousPath = (currentPath: string): string => {
  const normalizedPath = currentPath.toLowerCase();
  
  // Handle dynamic routes with subject_id parameters
  if (normalizedPath.startsWith('/testing/coding/')) {
    return '/Dashboard';
  }
  
  const rule = navigationRules.find(rule => rule.currentPath.toLowerCase() === normalizedPath);
  return rule ? rule.previousPath : '/Dashboard';
};

export const isBackNavigationAllowed = (currentPath: string): boolean => {
  const normalizedPath = currentPath.toLowerCase();
  
  // Handle dynamic routes with subject_id parameters
  if (normalizedPath.startsWith('/testing/coding/')) {
    return true;
  }
  
  const rule = navigationRules.find(rule => rule.currentPath.toLowerCase() === normalizedPath);
  return rule ? rule.allowBack : true;
};

export const getNavigationDescription = (currentPath: string): string => {
  const normalizedPath = currentPath.toLowerCase();
  
  // Handle dynamic routes with subject_id parameters
  if (normalizedPath.startsWith('/testing/coding/')) {
    return 'Coding Editor -> Dashboard';
  }
  
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
  
  // Handle dynamic routes with subject_id parameters
  if (normalizedPath.startsWith('/testing/coding/')) {
    return '/Dashboard';
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

/**
 * Navigate to a path and replace the current history entry
 * This prevents the user from going back to the previous page
 */
export const navigateWithReplace = (navigate: any, path: string, state?: any) => {
  navigate(path, { 
    state: state,
    replace: true 
  });
};

/**
 * Navigate back using navigation rules and replace history
 */
export const navigateBackWithReplace = (navigate: any, currentPath: string, state?: any) => {
  const targetPath = getBackNavigationPath(currentPath);
  navigate(targetPath, { 
    state: state,
    replace: true 
  });
}; 