
export const SUBJECT_ROADMAP = {
  DAY_COMPLETED: "Day Completed",
  ALREADY_COMPLETED: "Already Completed",
  UPDATED: "Updated",
  PRACTICE: "Practice"
} as const;

export const QUESTION_STATUS = {
  PRACTICE: "practice"
} as const;

export const INDUSTRY_OPTIONS = [
  { label: "Data Science", value: "data_science" },
  { label: "Full Stack", value: "full_stack" },
  { label: "Cloud", value: "cloud" },
  { label: "AI/ML", value: "ai_ml" },
  { label: "Automation", value: "automation" },
] as const;