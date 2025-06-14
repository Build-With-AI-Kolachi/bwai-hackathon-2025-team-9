
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Key } from "lucide-react";

const LOCAL_KEY = "gemini-api-key";

export default function ApiKeyInput({
  onChange,
}: {
  onChange?: (key: string) => void;
}) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY) || "";
    setValue(stored);
    if (stored && onChange) onChange(stored);
  }, []);

  const handleSave = () => {
    if (!value || !value.startsWith("AIza")) {
      toast({
        title: "Invalid Gemini API key",
        description: "API key must start with 'AIza...'.",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem(LOCAL_KEY, value);
    setSaved(true);
    if (onChange) onChange(value);
    toast({ title: "API key saved" });
  };

  return (
    <div className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-secondary mb-2">
      <Key className="mr-2 text-muted-foreground" size={20} />
      <Input
        type="password"
        value={value}
        placeholder="Enter Gemini API Key"
        onChange={e => {
          setValue(e.target.value);
          setSaved(false);
        }}
        className="max-w-xs"
      />
      <Button size="sm" onClick={handleSave} className="ml-2">
        Save
      </Button>
      {saved && <span className="text-xs text-green-600 ml-2">Saved!</span>}
    </div>
  );
}
