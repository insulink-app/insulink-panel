import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CheckIcon, CopyIcon, Trash2 } from "@/components/icons";
import { formatDay } from "@/lib/when";
import { shareUrl, type GlucoseShare } from "@/api/services/share-service";

/**
 * One link: whom it is for and since when, a copy button that turns into a
 * tick for two seconds, and delete behind a confirmation.
 */
export function ShareRow({ share, onDelete }: { share: GlucoseShare; onDelete: () => void }) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = () => navigator.clipboard.writeText(shareUrl(share.id)).then(() => setCopied(true));
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{share.name}</span>
        <span className="text-[13px] text-muted-foreground">
          {t("share.created", { day: formatDay(share.created_at, t, i18n.language) })}
        </span>
      </span>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        {t(copied ? "share.copied" : "share.copy")}
      </Button>
      <ConfirmDelete title={t("share.delete_title")} description={t("share.delete_confirm", { name: share.name })} onConfirm={onDelete}>
        <Button variant="ghost" size="sm" aria-label={t("share.delete_title")}>
          <Trash2 className="size-4" />
        </Button>
      </ConfirmDelete>
    </li>
  );
}
