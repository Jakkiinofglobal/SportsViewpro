import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PLANS } from "@shared/schema";
import type { User } from "@shared/schema";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  const { data: usersData, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users"],
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/plan`, {
        plan,
        reason: "Admin manual change",
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Plan updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User banned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Ban failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>SportSight Admin Dashboard</CardTitle>
          <CardDescription>Manage users, subscriptions, and access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Total Users: {usersData?.users.length || 0}
              </h3>
              <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-back-to-app">
                Back to App
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Plan</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Sport</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usersData?.users.map((u) => (
                    <tr key={u.id} data-testid={`row-user-${u.id}`}>
                      <td className="px-4 py-3 text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          value={u.plan}
                          onChange={(e) =>
                            changePlanMutation.mutate({ userId: u.id, plan: e.target.value })
                          }
                          className="border rounded px-2 py-1"
                          data-testid={`select-plan-${u.id}`}
                        >
                          {Object.keys(PLANS).map((planId) => (
                            <option key={planId} value={planId}>
                              {PLANS[planId as keyof typeof PLANS].name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">{u.selectedSport || "None"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            u.subscriptionStatus === "banned"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          {u.subscriptionStatus || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        {u.subscriptionStatus !== "banned" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Enter reason for ban:");
                              if (reason) {
                                banUserMutation.mutate({ userId: u.id, reason });
                              }
                            }}
                            data-testid={`button-ban-${u.id}`}
                          >
                            Ban
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!usersData || usersData.users.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No users yet. First signup will appear here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
