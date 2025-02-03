import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";

interface VerifyResultState {
  correctedText: string;
  comments: Array<{
    text: string;
    correction: string;
    explanation: string;
  }>;
}

export default function VerifyResult() {
  const [location, params] = useLocation();
  const { correctedText = '', comments = [] } = (params || {}) as VerifyResultState;

  useEffect(() => {
    // If no data is present, redirect back to verify page
    if (!correctedText && !comments.length) {
      window.location.href = '/verify';
    }
  }, [correctedText, comments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/verify">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Результаты проверки</h1>
          <p className="text-muted-foreground">
            Исправленный текст и комментарии
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Исправленный текст</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: correctedText }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Комментарии</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={index} className="space-y-2">
                  <div className="font-medium">
                    <span className="text-red-500 line-through">{comment.text}</span>
                    {' → '}
                    <span className="text-green-500">{comment.correction}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {comment.explanation}
                  </p>
                </div>
              ))}
              {!comments.length && (
                <p className="text-muted-foreground">Нет комментариев</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}