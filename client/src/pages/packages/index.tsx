import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePackages } from "@/hooks/use-packages";
import { useTemplates } from "@/hooks/use-templates";
import { Plus, FileDown, Trash2, Plus as PlusIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Round = {
  id?: number;
  name: string;
  description: string;
  questionCount: number;
  orderIndex: number;
};

type CreatePackageData = {
  title: string;
  description?: string;
  templateId?: number;
  rounds: Round[];
};

export default function Packages() {
  const { packages, createPackage, deletePackage } = usePackages();
  const { templates } = useTemplates();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [manualRounds, setManualRounds] = useState<Round[]>([]);
  const [createMode, setCreateMode] = useState<"template" | "manual">("template");

  const handleCreate = async () => {
    if (!title) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const packageData: CreatePackageData = {
        title,
        description,
        rounds: manualRounds,
      };

      if (createMode === "template" && selectedTemplateId) {
        packageData.templateId = parseInt(selectedTemplateId);
      }

      await createPackage(packageData);
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedTemplateId("");
    setManualRounds([]);
    setCreateMode("template");
  };

  const addRound = () => {
    setManualRounds([
      ...manualRounds,
      {
        name: "",
        description: "",
        questionCount: 1,
        orderIndex: manualRounds.length,
      },
    ]);
  };

  const updateRound = (index: number, field: keyof Round, value: any) => {
    const newRounds = [...manualRounds];
    newRounds[index] = {
      ...newRounds[index],
      [field]: value,
    };
    setManualRounds(newRounds);
  };

  const removeRound = (index: number) => {
    setManualRounds(manualRounds.filter((_, i) => i !== index));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
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
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Package</DialogTitle>
              <DialogDescription>
                Create a new package by selecting a template or creating rounds manually
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
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
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter package description"
                  />
                </div>
              </div>

              <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as "template" | "manual")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="template">Use Template</TabsTrigger>
                  <TabsTrigger value="manual">Create Manually</TabsTrigger>
                </TabsList>
                <TabsContent value="template" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Template</Label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplateId && (
                      <div className="pt-4">
                        <Label>Template Rounds</Label>
                        {templates
                          .find((t) => t.id.toString() === selectedTemplateId)
                          ?.roundSettings?.map((round) => (
                            <div key={round.id} className="mt-2 p-2 border rounded-lg">
                              <div className="font-medium">{round.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {round.description}
                              </div>
                              <Badge variant="secondary">
                                {round.questionCount} questions
                              </Badge>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Rounds</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addRound}
                        size="sm"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Round
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <div className="space-y-4">
                        {manualRounds.map((round, index) => (
                          <div key={index} className="space-y-2 p-4 border rounded-lg">
                            <div className="flex justify-between">
                              <Label>Round {index + 1}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRound(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Round name"
                              value={round.name}
                              onChange={(e) =>
                                updateRound(index, "name", e.target.value)
                              }
                            />
                            <Textarea
                              placeholder="Round description"
                              value={round.description}
                              onChange={(e) =>
                                updateRound(index, "description", e.target.value)
                              }
                            />
                            <div className="flex items-center gap-2">
                              <Label>Questions</Label>
                              <Input
                                type="number"
                                min={1}
                                value={round.questionCount}
                                onChange={(e) =>
                                  updateRound(
                                    index,
                                    "questionCount",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-24"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={handleCreate} className="w-full">
                Create Package
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell className="font-medium">{pkg.title}</TableCell>
                <TableCell>{pkg.description}</TableCell>
                <TableCell>{pkg.template?.name || "Custom Package"}</TableCell>
                <TableCell>{formatDate(pkg.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Export functionality will be available soon",
                        });
                      }}
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}