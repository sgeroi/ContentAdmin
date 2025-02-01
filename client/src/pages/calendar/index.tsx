import { usePackages } from "@/hooks/use-packages";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useLocation } from "wouter";

const getPackageStatus = (pkg: any) => {
  if (!pkg.rounds?.length) return { label: "Новый", color: "bg-blue-500" };

  const hasQuestions = pkg.rounds.some((r: any) => r.questions?.length > 0);
  if (!hasQuestions) return { label: "Новый", color: "bg-blue-500" };

  const allQuestionsFactChecked = pkg.rounds.every((r: any) => 
    r.questions?.every((q: any) => q.factChecked)
  );
  if (allQuestionsFactChecked) return { label: "Готов", color: "bg-green-500" };

  const hasFactCheckedQuestions = pkg.rounds.some((r: any) => 
    r.questions?.some((q: any) => q.factChecked)
  );
  if (hasFactCheckedQuestions) return { label: "Факт-чек", color: "bg-yellow-500" };

  return { label: "Редактура", color: "bg-orange-500" };
};

export default function CalendarPage() {
  const { packages } = usePackages();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [, setLocation] = useLocation();

  // Создаем Map для быстрого поиска пакетов по дате
  const packagesByDate = new Map();
  packages.forEach(pkg => {
    if (pkg.playDate) {
      const date = format(new Date(pkg.playDate), "yyyy-MM-dd");
      if (!packagesByDate.has(date)) {
        packagesByDate.set(date, []);
      }
      packagesByDate.get(date).push(pkg);
    }
  });

  // Функция для определения дат с пакетами
  const isDayWithPackage = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    return packagesByDate.has(formatted);
  };

  // Получаем пакеты для выбранного дня
  const getPackagesForDate = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    return packagesByDate.get(formatted) || [];
  };

  const handleViewPackage = (id: number) => {
    setLocation(`/packages/${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Календарь игр</h1>
        <p className="text-muted-foreground">
          Расписание игр и пакетов вопросов
        </p>
      </div>

      <div className="flex gap-6">
        <div className="border rounded-lg p-4 bg-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ru}
            modifiers={{
              hasPackage: (date) => isDayWithPackage(date),
            }}
            modifiersStyles={{
              hasPackage: {
                fontWeight: "bold",
                backgroundColor: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
              },
            }}
            className="rounded-md"
          />
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate || new Date(), "d MMMM yyyy", { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getPackagesForDate(selectedDate || new Date()).map((pkg: any) => {
                const status = getPackageStatus(pkg);
                return (
                  <div
                    key={pkg.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewPackage(pkg.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{pkg.title}</h3>
                        {pkg.description && (
                          <p className="text-muted-foreground text-sm mt-1">
                            {pkg.description}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            Автор: {pkg.author?.username || "Не указан"}
                          </Badge>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {getPackagesForDate(selectedDate || new Date()).length === 0 && (
                <p className="text-muted-foreground">
                  Нет запланированных пакетов на этот день
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}