import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { useQuestions } from "@/hooks/use-questions";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FormData = {
  title: string;
  content: any;
  topic: string;
  difficulty: string;
};

const topics = [
  "History",
  "Science",
  "Geography",
  "Literature",
  "Art",
  "Music",
  "Sports",
  "Technology",
];

export default function QuestionEditor() {
  const [, setLocation] = useLocation();
  const { createQuestion, validateQuestion } = useQuestions();
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      title: "",
      content: {},
      topic: "",
      difficulty: "1",
    },
  });

  const handleValidate = async (data: FormData) => {
    try {
      const result = await validateQuestion({
        title: data.title,
        content: data.content,
        topic: data.topic,
      });
      setValidationResult(result);
      setShowValidationDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createQuestion({
        ...data,
        difficulty: parseInt(data.difficulty),
      });
      toast({
        title: "Success",
        description: "Question saved successfully",
      });
      setLocation("/questions");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Question</h1>
        <p className="text-muted-foreground">
          Create a new question for your quiz
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the question title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Content</FormLabel>
                <FormControl>
                  <WysiwygEditor
                    content={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/questions")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit(handleValidate)}
            >
              Validate
            </Button>
            <Button type="submit">Save Question</Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {validationResult?.isValid ? "Validation Passed" : "Validation Issues Found"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {validationResult?.spellingErrors.length > 0 && (
                <div>
                  <p className="font-semibold">Spelling Errors:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.spellingErrors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.grammarErrors.length > 0 && (
                <div>
                  <p className="font-semibold">Grammar Errors:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.grammarErrors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.punctuationErrors.length > 0 && (
                <div>
                  <p className="font-semibold">Punctuation Errors:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.punctuationErrors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.factualIssues.length > 0 && (
                <div>
                  <p className="font-semibold">Factual Issues:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.factualIssues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.suggestions.length > 0 && (
                <div>
                  <p className="font-semibold">Suggestions:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {validationResult?.isValid && (
              <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                Save Question
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}