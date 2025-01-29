import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuestions } from "@/hooks/use-questions";
import { usePackages } from "@/hooks/use-packages";
import { useUser } from "@/hooks/use-user";
import { Package, HelpCircle, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { questions } = useQuestions();
  const { packages } = usePackages();
  const { user } = useUser();

  const stats = [
    {
      name: "Всего вопросов",
      value: questions.length,
      icon: HelpCircle,
      href: "/questions",
    },
    {
      name: "Пакеты вопросов",
      value: packages.length,
      icon: Package,
      href: "/packages",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Добро пожаловать, {user?.username}</h1>
        <p className="text-muted-foreground">
          Управляйте содержимым викторины и пакетами вопросов через эту панель управления
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/questions/new">
              <Button className="w-full">Создать новый вопрос</Button>
            </Link>
            <Link href="/packages">
              <Button className="w-full" variant="outline">
                Управление пакетами
              </Button>
            </Link>
          </CardContent>
        </Card>

        {user?.role === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Действия администратора</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Управляйте пользователями и их ролями.
              </p>
              <Button variant="secondary" className="w-full">
                Управление пользователями
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}