import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, X } from "lucide-react";

interface FormField {
  id?: string;
  label: string;
  field_type: string;
  is_required: boolean;
  order_index: number;
  options?: string[];
}

const FormBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id !== "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      loadForm();
    }
  }, [isEdit, id]);

  const loadForm = async () => {
    try {
      const { data: form, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", id)
        .single();

      if (formError) throw formError;

      setTitle(form.title);
      setDescription(form.description || "");

      const { data: formFields, error: fieldsError } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", id)
        .order("order_index");

      if (fieldsError) throw fieldsError;

      setFields(
        formFields.map((field) => ({
          ...field,
          options: field.options as string[] | undefined,
        }))
      );
    } catch (error: any) {
      toast.error("Failed to load form");
      navigate("/admin");
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        label: "",
        field_type: "text",
        is_required: false,
        order_index: fields.length,
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a form title");
      return;
    }

    if (fields.length === 0) {
      toast.error("Please add at least one field");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let formId = id;

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("forms")
          .update({ title, description })
          .eq("id", id);

        if (updateError) throw updateError;

        await supabase.from("form_fields").delete().eq("form_id", id);
      } else {
        const { data: newForm, error: createError } = await supabase
          .from("forms")
          .insert({
            title,
            description,
            admin_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        formId = newForm.id;
      }

      const fieldsToInsert = fields.map((field, index) => ({
        form_id: formId,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        order_index: index,
        options: field.options || null,
      }));

      const { error: fieldsError } = await supabase
        .from("form_fields")
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      toast.success(isEdit ? "Form updated!" : "Form created!");
      navigate("/admin");
    } catch (error: any) {
      toast.error("Failed to save form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Form"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Form Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Contact Form, Survey, Registration"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your form"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Form Fields</h2>
          <Button onClick={addField}>
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={index}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Field Label *</Label>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, { label: e.target.value })
                        }
                        placeholder="e.g., Full Name, Email Address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Field Type</Label>
                        <Select
                          value={field.field_type}
                          onValueChange={(value) =>
                            updateField(index, { field_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="image">Image Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Checkbox
                          id={`required-${index}`}
                          checked={field.is_required}
                          onCheckedChange={(checked) =>
                            updateField(index, { is_required: !!checked })
                          }
                        />
                        <Label htmlFor={`required-${index}`}>Required</Label>
                      </div>
                    </div>
                    {field.field_type === "select" && (
                      <div>
                        <Label>Dropdown Options</Label>
                        <div className="space-y-2">
                          {(field.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  updateField(index, { options: newOptions });
                                }}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newOptions = (field.options || []).filter(
                                    (_, i) => i !== optIndex
                                  );
                                  updateField(index, { options: newOptions });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(field.options || []), ""];
                              updateField(index, { options: newOptions });
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {fields.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  No fields added yet. Click "Add Field" to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default FormBuilder;
