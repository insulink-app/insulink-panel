import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CheckIcon, type LucideIcon } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatDay } from "@/lib/when";

/** The round icon, title and one-line description over a settings card. */
export function SettingsCardHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <h2 className="text-[22px] leading-tight font-extrabold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </span>
    </div>
  );
}

/**
 * The form card: header, divider rows, and the footer pinned to the bottom with
 * when it was last saved, Zurücksetzen and Speichern.
 */
export function SettingsCard({
  header,
  children,
  dirty,
  saving,
  savedAt,
  onReset,
  onSave,
}: {
  header: ReactNode;
  children: ReactNode;
  dirty: boolean;
  saving: boolean;
  savedAt?: number;
  onReset: () => void;
  onSave: () => void;
}) {
  const { t, i18n } = useTranslation();
  const status = dirty
    ? t("settings.unsaved")
    : savedAt
      ? t("settings.last_saved", { when: `${formatDay(savedAt, t, i18n.language)}, ${format(new Date(savedAt), "HH:mm")}` })
      : "";
  return (
    <Card className="gap-0 p-6">
      {header}
      <div className="mt-3 divide-y divide-divider border-b border-divider">{children}</div>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
        <span className="flex-1 text-[13px] text-muted-foreground">{status}</span>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty || saving}
          className="h-11 rounded-full border border-divider px-4 text-sm font-bold transition-colors hover:bg-raised disabled:opacity-50"
        >
          {t("settings.reset")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {saving ? <Spinner className="size-4" /> : <CheckIcon className="size-4" aria-hidden />}
          {t("common.save")}
        </button>
      </div>
    </Card>
  );
}
