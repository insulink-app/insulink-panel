import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Share } from "@/components/icons";
import shareService from "@/api/services/share-service";
import { SettingsCardHeader } from "../settings-card";
import { ShareRow } from "./share-row";

const SHARES_KEY = ["glucose-shares"];

/**
 * The glucose share links: a name for whom the next one is, the links already
 * given out (copy or delete each), and beside them what a link shows.
 */
export function ShareSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: SHARES_KEY, queryFn: shareService.find });
  const refresh = () => queryClient.invalidateQueries({ queryKey: SHARES_KEY });
  const create = useMutation({ mutationFn: shareService.create, onSuccess: refresh });
  const remove = useMutation({ mutationFn: shareService.remove, onSuccess: refresh });
  const shares = data?.shares ?? [];
  return (
    <>
      <Card className="gap-5 p-6">
        <SettingsCardHeader icon={Share} title={t("settings.section_share")} description={t("settings.desc_share")} />
        <CreateShareForm busy={create.isPending} onCreate={(name) => create.mutate(name)} />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("share.none")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider">
            {shares.map((share) => (
              <ShareRow key={share.id} share={share} onDelete={() => remove.mutate(share.id)} />
            ))}
          </ul>
        )}
      </Card>
      <Card className="gap-3 p-6 text-sm text-muted-foreground">
        <h2 className="text-lg font-extrabold text-foreground">{t("share.about_title")}</h2>
        <p>{t("share.about_shows")}</p>
        <p>{t("share.about_revoke")}</p>
      </Card>
    </>
  );
}

function CreateShareForm({ busy, onCreate }: { busy: boolean; onCreate: (name: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName("");
    }
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={name}
        maxLength={64}
        placeholder={t("share.name_placeholder")}
        aria-label={t("share.name")}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" disabled={busy || !name.trim()}>
        <Plus className="size-4" />
        {t("share.create")}
      </Button>
    </form>
  );
}
