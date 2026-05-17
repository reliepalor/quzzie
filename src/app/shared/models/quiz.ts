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

export type TestMode = 'learning' | 'exam';

export interface QuizSettings {
  testMode: TestMode;
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

export interface LevelContent {
  subjects: string[];
  suggestedTopics: string[];
}

export const LEVEL_YEAR_CONTENT: Record<string, Record<string, LevelContent>> = {
  elem: {
    'Grade 1': {
      subjects: ['Reading', 'Phonics', 'Math', 'Science', 'Values Education', 'Art'],
      suggestedTopics: ['Alphabet Sounds', 'Counting to 100', 'Community Helpers', 'Parts of Plants', 'Primary Colors', 'Healthy Habits']
    },
    'Grade 2': {
      subjects: ['Reading Comprehension', 'Math', 'Science', 'English', 'Araling Panlipunan', 'Music'],
      suggestedTopics: ['Nouns and Verbs', 'Two-Digit Addition', 'Weather and Seasons', 'Philippine Symbols', 'Simple Fractions', 'Animal Life Cycles']
    },
    'Grade 3': {
      subjects: ['English', 'Math', 'Science', 'Filipino', 'Araling Panlipunan', 'MAPEH'],
      suggestedTopics: ['Multiplication Basics', 'Forces and Motion', 'Reading Main Idea', 'Plant Reproduction', 'Local Government', 'Simple Paragraph Writing']
    },
    'Grade 4': {
      subjects: ['English', 'Math', 'Science', 'Filipino', 'Araling Panlipunan', 'TLE'],
      suggestedTopics: ['Long Division', 'Matter and Its Properties', 'Ecosystems', 'Adjectives and Adverbs', 'Early Philippine History', 'Fractions and Decimals']
    },
    'Grade 5': {
      subjects: ['English', 'Math', 'Science', 'Filipino', 'Araling Panlipunan', 'EPP'],
      suggestedTopics: ['Percent and Ratio', 'Human Body Systems', 'Energy Sources', 'Research Skills', 'Philippine Geography', 'Grammar Editing']
    },
    'Grade 6': {
      subjects: ['English', 'Math', 'Science', 'Filipino', 'Araling Panlipunan', 'Computer'],
      suggestedTopics: ['Integers', 'Basic Statistics', 'Earth and Space', 'News Writing', 'Philippine Constitution Basics', 'Digital Citizenship']
    }
  },
  high: {
    'Grade 7': {
      subjects: ['Mathematics', 'Science', 'English', 'Filipino', 'Araling Panlipunan', 'MAPEH'],
      suggestedTopics: ['Set Theory', 'Scientific Method', 'Plot and Conflict', 'Parts of Speech Review', 'Pre-Colonial Philippines', 'Nutrition and Fitness']
    },
    'Grade 8': {
      subjects: ['Mathematics', 'Biology', 'English', 'Filipino', 'Araling Panlipunan', 'TLE'],
      suggestedTopics: ['Linear Equations', 'Cell Structure', 'Types of Literature', 'Verb Aspects', 'Asian History', 'Entrepreneurship Basics']
    },
    'Grade 9': {
      subjects: ['Algebra', 'Chemistry', 'English', 'Filipino', 'Economics', 'Computer'],
      suggestedTopics: ['Quadratic Functions', 'Chemical Bonding', 'Argumentative Writing', 'Ibong Adarna', 'Demand and Supply', 'Programming Logic']
    },
    'Grade 10': {
      subjects: ['Geometry', 'Physics', 'English', 'Filipino', 'Contemporary Issues', 'Research'],
      suggestedTopics: ['Proofs and Theorems', 'Laws of Motion', 'Technical Writing', 'Oral Communication', 'Climate Change', 'Research Methodology']
    }
  },
  senior: {
    'Grade 11': {
      subjects: ['General Mathematics', 'Earth Science', 'Oral Communication', 'Reading and Writing', 'Personal Development', 'Statistics'],
      suggestedTopics: ['Functions and Graphs', 'Plate Tectonics', 'Public Speaking', 'Academic Writing', 'Stress Management', 'Data Collection Methods']
    },
    'Grade 12': {
      subjects: ['Pre-Calculus', 'Practical Research', 'Contemporary Arts', 'Media and Information Literacy', 'Physical Science', 'Entrepreneurship'],
      suggestedTopics: ['Trigonometric Functions', 'Research Defense', 'Art Movements', 'Fake News Detection', 'Electromagnetism', 'Business Model Canvas']
    }
  },
  college: {
    '1st Year': {
      subjects: ['College Algebra', 'General Biology', 'Purposive Communication', 'Philippine History', 'Computer Fundamentals', 'NSTP'],
      suggestedTopics: ['Polynomial Functions', 'Cellular Respiration', 'Academic Presentations', 'Constitutional Milestones', 'Operating Systems Basics', 'Community Engagement']
    },
    '2nd Year': {
      subjects: ['Data Structures', 'Microeconomics', 'Organic Chemistry', 'World Literature', 'Statistics', 'Ethics'],
      suggestedTopics: ['Linked Lists', 'Market Equilibrium', 'Hydrocarbons', 'Modernism', 'Hypothesis Testing', 'Ethical Decision Models']
    },
    '3rd Year': {
      subjects: ['Algorithms', 'Thermodynamics', 'Macroeconomics', 'Research Methods', 'Database Systems', 'Social Science'],
      suggestedTopics: ['Sorting and Searching', 'Laws of Thermodynamics', 'GDP and Inflation', 'Sampling Techniques', 'SQL Joins', 'Policy Analysis']
    },
    '4th Year': {
      subjects: ['Capstone Project', 'Advanced Programming', 'Operations Management', 'Strategic Management', 'Machine Learning', 'Professional Practice'],
      suggestedTopics: ['Project Proposal Writing', 'System Design Patterns', 'Process Optimization', 'SWOT Analysis', 'Model Evaluation', 'Career Readiness']
    }
  },
  any: {
    'All Ages': {
      subjects: ['General Knowledge', 'Language', 'Math', 'Science', 'History'],
      suggestedTopics: ['Current Events', 'Famous Inventions', 'World Capitals', 'Nature Facts', 'Logic Puzzles', 'Digital Safety']
    }
  }
};