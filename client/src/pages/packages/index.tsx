import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { usePackages } from "@/hooks/use-packages";
import { useQuestions } from "@/hooks/use-questions";
import { Plus, FileDown, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type Question = {
  id: number;
  title: string;
  topic: string;
  difficulty: number;
};

type Package = {
  id: number;
  title: string;
  description?: string;
  packageQuestions: { questionId: number }[];
};

type CreatePackageData = {
  title: string;
  description?: string;
  questions: Question[];
};

export default function Packages() {
  const { packages, createPackage, deletePackage } = usePackages();
  const { questions } = useQuestions();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  const handleCreate = async () => {
    if (!title) return;

    try {
      const selectedQuestionsData = questions.filter(q => selectedQuestions.includes(q.id));
      await createPackage({
        title,
        description,
        questions: selectedQuestionsData,
      });
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setSelectedQuestions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = (id: number) => {
    // TODO: Implement export functionality
    toast({
      title: "Coming Soon",
      description: "Export functionality will be available soon",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Packages</h1>
          <p className="text-muted-foreground">
            Create and manage packages of questions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Package</DialogTitle>
              <DialogDescription>
                Create a new package to group questions together
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter package title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter package description"
                />
              </div>
              <div className="space-y-2">
                <Label>Select Questions</Label>
                <ScrollArea className="h-72 rounded-md border">
                  <div className="p-4 space-y-4">
                    {questions.map((question) => (
                      <div key={question.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`question-${question.id}`}
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedQuestions([...selectedQuestions, question.id]);
                            } else {
                              setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                            }
                          }}
                        />
                        <div className="grid gap-1.5">
                          <label
                            htmlFor={`question-${question.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {question.title}
                          </label>
                          <div className="flex gap-2">
                            <Badge>{question.topic}</Badge>
                            <Badge variant="outline">Level {question.difficulty}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create Package ({selectedQuestions.length} questions selected)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader>
              <CardTitle>{pkg.title}</CardTitle>
              {pkg.description && (
                <CardDescription>{pkg.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {pkg.packageQuestions?.length || 0} questions selected
                </div>
                <div className="flex flex-wrap gap-2">
                  {pkg.packageQuestions?.map((pq) => (
                    <Badge key={pq.questionId} variant="outline">
                      {questions.find(q => q.id === pq.questionId)?.title}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport(pkg.id)}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePackage(pkg.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {packages.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No packages yet</CardTitle>
              <CardDescription>
                Create your first question package to get started
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}