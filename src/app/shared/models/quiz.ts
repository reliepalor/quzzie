export interface AcademicLevel {
  id: string;
  name: string;
  subLevels: string[];
}

export const LEVELS: AcademicLevel[] = [
  { id: 'elem', name: 'Elementary', subLevels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] },
  { id: 'high', name: 'High School', subLevels: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'] },
  { id: 'senior', name: 'Senior High', subLevels: ['Grade 11', 'Grade 12'] },
  { id: 'college', name: 'College', subLevels: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
  { id: 'any', name: 'Anyone', subLevels: ['All Ages'] }
];

export type TestType = 'Multiple Choice' | 'Enumeration' | 'True/False';

export interface QuizSettings {
  level: string;
  subLevel: string;
  topic: string;
  subject: string;
  testType: TestType;
  questionCount: number;
  fileBase64?: string;
  fileName?: string;
  timer?: number | null;
}