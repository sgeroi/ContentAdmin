export interface QuestionValidationResult {
  isValid: boolean;
  spellingErrors: string[];
  grammarErrors: string[];
  punctuationErrors: string[];
  factualIssues: string[];
  suggestions: string[];
  citations: string[];
  correctedTitle: string;
  correctedContent: any;
}