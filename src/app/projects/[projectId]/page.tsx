import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RequirementInput } from "@/lib/types";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { data: inputs } = await supabase
    .from("requirement_inputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to projects
        </Link>
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Link href={`/projects/${projectId}/inputs/new`}>
          <Button>New Requirement</Button>
        </Link>
      </div>

      {!inputs?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No requirements yet. Add your first requirement to generate user stories.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(inputs as RequirementInput[]).map((input) => (
            <Link
              key={input.id}
              href={`/projects/${projectId}/inputs/${input.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{input.title}</CardTitle>
                  <Badge className={statusColor[input.status] || ""}>
                    {input.status}
                  </Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
