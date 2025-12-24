import React, { createContext, useContext, useState, ReactNode } from "react";

// Common types that work for both old and new project JSON structures
export interface ProjectTask {
  task_name: string;
  task_id: string;
  data: any[];
  no_of_days: number; // Number of days for this task
}

export interface ProjectPart {
  part_name: string;
  tasks: ProjectTask[];
  days?: string;
  progress?: number; // Progress percentage (0-100)
}

export interface ProjectPhase {
  phase_name: string;
  parts: ProjectPart[];
}

export interface ProjectData {
  // Optional fields for older structures
  project_id?: string;
  project_name?: string;
  project_description?: string;
  slots_left?: string;
  start_date?: string; // Project start date
  // Older structure
  project_data?: ProjectPhase[];
  // Newer structure (as in the latest project.json)
  content?: ProjectPhase[];
}

interface SelectedPart {
  phaseName: string;
  partName: string;
  tasks: ProjectTask[];
}

interface ProjectContextType {
  projectData: ProjectData | null;
  setProjectData: (data: ProjectData | null) => void;
  selectedPart: SelectedPart | null;
  setSelectedPart: (part: SelectedPart | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null);

  return (
    <ProjectContext.Provider
      value={{
        projectData,
        setProjectData,
        selectedPart,
        setSelectedPart
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

