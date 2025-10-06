import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, LogOut, FileText, Eye, Trash2, Edit, Share2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Form {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadForms();
    }
  }, [user]);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return;

    try {
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;
      toast.success("Form deleted successfully");
      loadForms();
    } catch (error: any) {
      toast.error("Failed to delete form");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("forms")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentStatus ? "Form deactivated" : "Form activated");
      loadForms();
    } catch (error: any) {
      toast.error("Failed to update form");
    }
  };

  const handleShare = (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(url);
    toast.success("Form link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FormBuilder Admin
          </h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">Your Forms</h2>
            <p className="text-muted-foreground">Create and manage your forms</p>
          </div>
          <Button onClick={() => navigate("/admin/form/new")} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : forms.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No forms yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first form to start collecting responses
              </p>
              <Button onClick={() => navigate("/admin/form/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="line-clamp-1">{form.title}</CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        form.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {form.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {form.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/form/${form.id}`)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(form.id)}
                    >
                      <Share2 className="mr-1 h-3 w-3" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/responses/${form.id}`)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Responses
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(form.id, form.is_active)}
                    >
                      {form.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(form.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
