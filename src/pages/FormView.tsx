import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Upload } from "lucide-react";

interface Form {
  id: string;
  title: string;
  description: string | null;
}

interface FormField {
  id: string;
  label: string;
  field_type: string;
  is_required: boolean;
  order_index: number;
  options?: string[];
}

const FormView = () => {
  const { id } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (formError) throw formError;
      setForm(formData);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", id)
        .order("order_index");

      if (fieldsError) throw fieldsError;
      setFields(
        fieldsData.map((field) => ({
          ...field,
          options: field.options as string[] | undefined,
        }))
      );
    } catch (error: any) {
      toast.error("Form not found or inactive");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = fields.filter((field) => {
      if (!field.is_required) return false;
      if (field.field_type === "image") return !files[field.id];
      return !answers[field.id] || answers[field.id].trim() === "";
    });

    if (missingFields.length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      // Upload images first
      const uploadedAnswers = { ...answers };
      
      for (const [fieldId, file] of Object.entries(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('form-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('form-uploads')
          .getPublicUrl(filePath);

        uploadedAnswers[fieldId] = publicUrl;
      }

      const { data: response, error: responseError } = await supabase
        .from("form_responses")
        .insert({ form_id: id })
        .select()
        .single();

      if (responseError) throw responseError;

      const answersToInsert = Object.entries(uploadedAnswers).map(([fieldId, answer]) => ({
        response_id: response.id,
        field_id: fieldId,
        answer,
      }));

      const { error: answersError } = await supabase
        .from("response_answers")
        .insert(answersToInsert);

      if (answersError) throw answersError;

      setSubmitted(true);
      toast.success("Form submitted successfully!");
    } catch (error: any) {
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">
              This form may have been removed or is no longer active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary to-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your response has been recorded successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-secondary to-background">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {form.title}
            </CardTitle>
            {form.description && (
              <CardDescription className="text-base">
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {fields.map((field) => {
                if (field.field_type === "textarea") {
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.is_required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Textarea
                        id={field.id}
                        value={answers[field.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [field.id]: e.target.value })
                        }
                        required={field.is_required}
                        rows={4}
                      />
                    </div>
                  );
                }
                
                if (field.field_type === "select") {
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.is_required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Select
                        value={answers[field.id] || ""}
                        onValueChange={(value) =>
                          setAnswers({ ...answers, [field.id]: value })
                        }
                        required={field.is_required}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                
                if (field.field_type === "image") {
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.is_required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={field.id}
                          type="file"
                          accept="image/*"
                          required={field.is_required}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFiles({ ...files, [field.id]: file });
                            }
                          }}
                          className="cursor-pointer"
                        />
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                      id={field.id}
                      type={field.field_type}
                      value={answers[field.id] || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [field.id]: e.target.value })
                      }
                      required={field.is_required}
                    />
                  </div>
                );
              })}
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FormView;
