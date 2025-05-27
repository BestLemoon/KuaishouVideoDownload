"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface DeleteButtonProps {
  apiKey: string;
  onDelete?: () => void;
}

export default function DeleteButton({ apiKey, onDelete }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const t = useTranslations("api_keys.delete");

  const handleDelete = async () => {
    const confirmed = confirm(t("confirm_message"));
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/api-keys/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success(t("success_message"));
        if (onDelete) {
          onDelete();
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message || t("error_message"));
      }
    } catch (error) {
      console.error("Delete API key error:", error);
      toast.error(t("error_message"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">{t("button_delete")}</span>
    </Button>
  );
} 