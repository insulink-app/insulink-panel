import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import sportService, { type Routine } from "@/api/services/sport-service";
import { newId, RoutineForm, useRoutineWrites } from "../routines/shared";

export default function RoutineEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const { save, saving } = useRoutineWrites();

  const existing = id ? routines.data?.routines?.find((entry) => entry.id === id) : undefined;
  // Stable initial: a fresh routine for create mode, the loaded one for edit.
  const initial = useMemo<Routine>(
    () => existing ?? { id: newId(), name: "", items: [] },
    [existing],
  );

  const backTo = existing ? `/health/routines/${existing.id}` : "/health/routines";
  const loadingExisting = id != null && routines.isLoading;

  return (
    <PanelPage
      title={existing ? t("routines.edit") : t("routines.add")}
      parents={[
        { title: t("nav.health") },
        { title: t("routines.title"), href: "/health/routines" },
        ...(existing
          ? [
              {
                title: existing.name || t("routines.untitled"),
                href: `/health/routines/${existing.id}`,
              },
            ]
          : []),
      ]}
    >
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={backTo}>
            <ArrowLeft className="size-4" />
            {t("routines.back")}
          </Link>
        </Button>

        {loadingExisting ? (
          <CardSkeleton />
        ) : id != null && !existing ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <RoutineForm
            key={initial.id}
            initial={initial}
            exercises={exercises.data?.exercises ?? []}
            saving={saving}
            onCancel={() => navigate(backTo)}
            onSave={(routine) => save(routine, () => navigate(`/health/routines/${routine.id}`))}
          />
        )}
      </div>
    </PanelPage>
  );
}
