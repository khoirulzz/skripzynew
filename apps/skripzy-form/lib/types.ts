export type QuestionType = 'likert' | 'text' | 'choice' | 'checkbox' | 'info';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // for choice, checkbox
  scale?: number;     // for likert
  description?: string; // for info text
}

export type SectionType = 'variable' | 'identity' | 'info';

export interface Section {
  id: string;
  name: string; 
  type: SectionType;
  items: Question[];
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  targetRespondents: number;
  themeColor: string;
  sections: Section[];
}

export interface ResponseAnswer {
  questionId: string;
  value: string | number | string[];
}

export interface FormResponse {
  id: string;
  timestamp: string;
  answers: Record<string, string | number | string[]>; 
}
