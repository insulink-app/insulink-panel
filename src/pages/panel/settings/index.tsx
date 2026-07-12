import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import settingsService, {
  type UserSettings,
} from "@/api/services/settings-service";

const toggles: { key: keyof UserSettings; label: string }[] = [
  { key: "notifications", label: "Benachrichtigungen" },
  { key: "live_glucose_notification", label: "Live-Glukose-Benachrichtigung" },
  { key: "sensor_expiry_alert", label: "Sensor-Ablauf-Warnung" },
  { key: "connection_lost_alert", label: "Verbindungsverlust-Warnung" },
  { key: "prediction_enabled", label: "Vorhersage aktiviert" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });

  // Keep the full blob so app-only keys survive the full-replace save.
  // Reset local edits whenever fresh server data arrives (adjust-state-on-prop-change).
  const [form, setForm] = useState<UserSettings>({});
  const [synced, setSynced] = useState<UserSettings>();
  if (data && data !== synced) {
    setSynced(data);
    setForm(data);
  }

  const mutation = useMutation({
    mutationFn: (s: UserSettings) => settingsService.change(s),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Einstellungen gespeichert.");
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      } else {
        toast.error("Speichern fehlgeschlagen.");
      }
    },
    onError: () => toast.error("Speichern fehlgeschlagen."),
  });

  const setNum = (key: keyof UserSettings, v: string) =>
    setForm((f) => ({ ...f, [key]: v === "" ? undefined : Number(v) }));

  if (isLoading) {
    return (
      <PanelPage title="Einstellungen">
        <div className="py-6 text-sm text-muted-foreground">Lädt…</div>
      </PanelPage>
    );
  }

  return (
    <PanelPage title="Einstellungen">
      <div className="py-6 flex flex-col gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Glukose</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Einheit</Label>
              <select
                className="border rounded-md h-9 px-2 bg-transparent w-40"
                value={form.glucose_unit ?? "mgdl"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    glucose_unit: e.target.value as "mgdl" | "mmol",
                  }))
                }
              >
                <option value="mgdl">mg/dL</option>
                <option value="mmol">mmol/L</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumField
                label="Ziel unten (mg/dL)"
                value={form.glucose_target_low}
                onChange={(v) => setNum("glucose_target_low", v)}
              />
              <NumField
                label="Ziel oben (mg/dL)"
                value={form.glucose_target_high}
                onChange={(v) => setNum("glucose_target_high", v)}
              />
              <NumField
                label="Dringend niedrig (mg/dL)"
                value={form.glucose_urgent_low}
                onChange={(v) => setNum("glucose_urgent_low", v)}
              />
              <NumField
                label="Dringend hoch (mg/dL)"
                value={form.glucose_urgent_high}
                onChange={(v) => setNum("glucose_urgent_high", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-center justify-between">
                <Label>{t.label}</Label>
                <Switch
                  checked={!!form[t.key]}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, [t.key]: v }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
          >
            Speichern
            {mutation.isPending && <Spinner className="ml-2" />}
          </Button>
        </div>
      </div>
    </PanelPage>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
