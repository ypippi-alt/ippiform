import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Download, FileSpreadsheet, ImageDown, Edit, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface Form {
  title: string;
}

interface FormField {
  id: string;
  label: string;
  field_type: string;
}

interface Response {
  id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

const Responses = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResponse, setEditingResponse] = useState<Response | null>(null);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [formId]);

  const loadData = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from("forms")
        .select("title")
        .eq("id", formId)
        .single();

      if (formError) throw formError;
      setForm(formData);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from("form_fields")
        .select("id, label, field_type")
        .eq("form_id", formId)
        .order("order_index");

      if (fieldsError) throw fieldsError;
      setFields(fieldsData);

      const { data: responsesData, error: responsesError } = await supabase
        .from("form_responses")
        .select("id, submitted_at")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });

      if (responsesError) throw responsesError;

      const responsesWithAnswers = await Promise.all(
        responsesData.map(async (response) => {
          const { data: answersData } = await supabase
            .from("response_answers")
            .select("field_id, answer")
            .eq("response_id", response.id);

          const answers: Record<string, string> = {};
          answersData?.forEach((a) => {
            answers[a.field_id] = a.answer;
          });

          return {
            ...response,
            answers,
          };
        })
      );

      setResponses(responsesWithAnswers);
    } catch (error: any) {
      toast.error("Failed to load responses");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ["Submitted At", ...fields.map((f) => f.label)];
    const rows = responses.map((r) => [
      new Date(r.submitted_at).toLocaleString(),
      ...fields.map((f) => r.answers[f.id] || ""),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form?.title || "form"}-responses.csv`;
    a.click();
  };

  const downloadExcel = () => {
    const headers = ["Submitted At", ...fields.map((f) => f.label)];
    const rows = responses.map((r) => [
      new Date(r.submitted_at).toLocaleString(),
      ...fields.map((f) => r.answers[f.id] || ""),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    XLSX.writeFile(workbook, `${form?.title || "form"}-responses.xlsx`);
    toast.success("Excel file downloaded!");
  };

  const downloadImages = async () => {
    try {
      const zip = new JSZip();
      const imageFields = fields.filter(f => f.field_type === "image");
      
      if (imageFields.length === 0) {
        toast.error("No image fields in this form");
        return;
      }

      let imageCount = 0;
      
      for (const response of responses) {
        for (const field of imageFields) {
          const imageUrl = response.answers[field.id];
          if (imageUrl) {
            try {
              const imageResponse = await fetch(imageUrl);
              const blob = await imageResponse.blob();
              const timestamp = new Date(response.submitted_at).toISOString().split('T')[0];
              const fileName = `${timestamp}_${field.label.replace(/[^a-z0-9]/gi, '_')}_${imageCount}.jpg`;
              zip.file(fileName, blob);
              imageCount++;
            } catch (error) {
              console.error("Failed to fetch image:", imageUrl);
            }
          }
        }
      }

      if (imageCount === 0) {
        toast.error("No images found in responses");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form?.title || "form"}-images.zip`;
      a.click();
      toast.success(`Downloaded ${imageCount} images!`);
    } catch (error) {
      toast.error("Failed to download images");
    }
  };

  const isImageUrl = (url: string) => {
    return url && (url.includes('form-uploads') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  };

  const handleEditClick = (response: Response) => {
    setEditingResponse(response);
    setEditedAnswers({ ...response.answers });
  };

  const handleSaveEdit = async () => {
    if (!editingResponse) return;

    try {
      // Update each answer
      for (const fieldId of Object.keys(editedAnswers)) {
        const { error } = await supabase
          .from("response_answers")
          .update({ answer: editedAnswers[fieldId] })
          .eq("response_id", editingResponse.id)
          .eq("field_id", fieldId);

        if (error) throw error;
      }

      toast.success("Response updated successfully!");
      setEditingResponse(null);
      loadData(); // Reload data
    } catch (error) {
      toast.error("Failed to update response");
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm("Are you sure you want to delete this response?")) return;

    try {
      // Delete answers first
      await supabase
        .from("response_answers")
        .delete()
        .eq("response_id", responseId);

      // Delete response
      const { error } = await supabase
        .from("form_responses")
        .delete()
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response deleted successfully!");
      loadData();
    } catch (error) {
      toast.error("Failed to delete response");
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
          {responses.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={downloadCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button onClick={downloadExcel} variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              {fields.some(f => f.field_type === "image") && (
                <Button onClick={downloadImages} variant="outline">
                  <ImageDown className="mr-2 h-4 w-4" />
                  Images
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Responses: {form?.title}
            </CardTitle>
            <p className="text-muted-foreground">
              Total responses: {responses.length}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No responses yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted At</TableHead>
                      {fields.map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(response.submitted_at).toLocaleString()}
                        </TableCell>
                        {fields.map((field) => (
                          <TableCell key={field.id}>
                            {field.field_type === "image" && response.answers[field.id] && isImageUrl(response.answers[field.id]) ? (
                              <a 
                                href={response.answers[field.id]} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={response.answers[field.id]} 
                                  alt={field.label}
                                  className="h-20 w-20 object-cover rounded border hover:scale-150 transition-transform cursor-pointer"
                                />
                              </a>
                            ) : (
                              response.answers[field.id] || "-"
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(response)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteResponse(response.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editingResponse} onOpenChange={(open) => !open && setEditingResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}</Label>
                {field.field_type === "textarea" ? (
                  <Textarea
                    value={editedAnswers[field.id] || ""}
                    onChange={(e) =>
                      setEditedAnswers({ ...editedAnswers, [field.id]: e.target.value })
                    }
                    rows={4}
                  />
                ) : field.field_type === "image" ? (
                  <div className="space-y-2">
                    <Input
                      value={editedAnswers[field.id] || ""}
                      onChange={(e) =>
                        setEditedAnswers({ ...editedAnswers, [field.id]: e.target.value })
                      }
                      placeholder="Image URL"
                    />
                    {editedAnswers[field.id] && isImageUrl(editedAnswers[field.id]) && (
                      <img
                        src={editedAnswers[field.id]}
                        alt={field.label}
                        className="h-32 w-32 object-cover rounded border"
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                    value={editedAnswers[field.id] || ""}
                    onChange={(e) =>
                      setEditedAnswers({ ...editedAnswers, [field.id]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingResponse(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Responses;
