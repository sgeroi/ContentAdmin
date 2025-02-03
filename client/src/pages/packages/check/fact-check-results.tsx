import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WysiwygEditor } from "@/components/wysiwyg-editor";

export default function FactCheckResults() {
  const [originalContent, setOriginalContent] = useState<any>(null);
  const [analysis, setAnalysis] = useState<string[]>([]);
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const contentParam = params.get('content');
    const analysisParam = params.get('analysis');
    
    if (contentParam) {
      try {
        setOriginalContent(JSON.parse(decodeURIComponent(contentParam)));
      } catch (e) {
        console.error('Failed to parse content:', e);
      }
    }
    
    if (analysisParam) {
      try {
        setAnalysis(JSON.parse(decodeURIComponent(analysisParam)));
      } catch (e) {
        console.error('Failed to parse analysis:', e);
      }
    }
  }, [location]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/packages/check">
          <Button variant="ghost" className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Назад к проверке
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Результаты фактчекинга</h1>
        <p className="text-muted-foreground">
          Проверка фактов и достоверности информации
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Оригинальный текст</h2>
          <ScrollArea className="h-[600px]">
            <WysiwygEditor
              content={originalContent}
              onChange={() => {}}
              editable={false}
            />
          </ScrollArea>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Результаты проверки</h2>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {analysis.length > 0 ? (
                analysis.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded bg-muted/50"
                  >
                    <p>{item}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  Результаты проверки отсутствуют
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
