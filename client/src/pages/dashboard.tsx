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
      name: "Total Questions",
      value: questions.length,
      icon: HelpCircle,
      href: "/questions",
    },
    {
      name: "Question Packages",
      value: packages.length,
      icon: Package,
      href: "/packages",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground">
          Manage your quiz content and packages from this dashboard
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
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/questions/new">
              <Button className="w-full">Create New Question</Button>
            </Link>
            <Link href="/packages">
              <Button className="w-full" variant="outline">
                Manage Packages
              </Button>
            </Link>
          </CardContent>
        </Card>

        {user?.role === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Admin Actions</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Manage users and their roles from here.
              </p>
              <Button variant="secondary" className="w-full">
                Manage Users
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
