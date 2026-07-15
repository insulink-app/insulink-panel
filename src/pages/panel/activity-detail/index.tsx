import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Trash2 } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { positionAt } from "@/lib/track";
import sportService from "@/api/services/sport-service";
import glucoseService from "@/api/services/glucose-service";
import healthService from "@/api/services/health-service";
import { TrainingBody } from "./training-body";
import { WorkoutBody } from "./workout-body";
import { VitalsChart } from "./vitals-chart";

export default function ActivityDetailPage() {
  const { t } = useTranslation();
  const { kind, id } = useParams();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: sportService.trainings });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const glucose = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });
  const pulse = useQuery({ queryKey: ["pulse"], queryFn: healthService.pulse });

  const workout =
    kind === "workout" ? workouts.data?.workouts?.find((entry) => entry.id === id) : undefined;
  const training =
    kind === "training" ? trainings.data?.trainings?.find((entry) => entry.id === id) : undefined;

  // Everything below is memoised on the query data, not rebuilt per render: the
  // hover state lives on this component, so anything computed inline here would
  // re-run on every mouse move across the chart.
  const routineName = useMemo(
    () => new Map((routines.data?.routines ?? []).map((routine) => [routine.id, routine.name])),
    [routines.data],
  );
  const exerciseName = useMemo(
    () => new Map((exercises.data?.exercises ?? []).map((exercise) => [exercise.id, exercise.name])),
    [exercises.data],
  );
  const glucoseSeries = useMemo(
    () => (glucose.data?.entries ?? []).map((entry) => ({ t: entry.time, glucose: entry.value })),
    [glucose.data],
  );
  const pulseSeries = useMemo(
    () => (pulse.data?.samples ?? []).map((sample) => ({ t: sample.t, pulse: sample.b })),
    [pulse.data],
  );

  // Time window the vitals chart covers.
  const window = useMemo(() => {
    if (training) {
      return { start: training.start, end: training.end };
    }
    if (workout) {
      const last = workout.sets.reduce((max, set) => Math.max(max, set.ts), workout.started);
      return { start: workout.started, end: Math.max(last, workout.started + 60 * 60 * 1000) };
    }
    return null;
  }, [workout, training]);

  const title = training
    ? t("activity.type_" + training.type)
    : workout
      ? (routineName.get(workout.routine) ?? t("activity.workout"))
      : "";
  const at = training?.start ?? workout?.started;

  const deletion = useDeleteActivity({
    workoutId: workout?.id,
    trainingId: training?.id,
    allWorkouts: workouts.data?.workouts ?? [],
    allTrainings: trainings.data?.trainings ?? [],
  });

  // Timestamp under the vitals-chart cursor; drives the marker on the map.
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  // Sorted once per training, not per hover: `positionAt` only reads it.
  const orderedTrack = useMemo(
    () => (training?.track ?? []).slice().sort((left, right) => left.t - right.t),
    [training],
  );
  const highlight = useMemo(() => positionAt(orderedTrack, hoverTime), [orderedTrack, hoverTime]);

  return (
    <PanelPage
      title={title || t("activity.title")}
      parents={[{ title: t("nav.health") }, { title: t("activity.title"), href: "/health/activity" }]}
    >
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/health/activity">
            <ArrowLeft className="size-4" />
            {t("activity.back")}
          </Link>
        </Button>

        {!workout && !training ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                {at != null && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(at), "EEEE, dd.MM.yyyy HH:mm")}
                  </p>
                )}
              </div>
              <ConfirmDelete
                onConfirm={() => deletion.mutate()}
                description={t("activity.delete_confirm")}
              >
                <Button variant="outline" disabled={deletion.isPending}>
                  <Trash2 className="size-4 text-destructive" />
                  {t("activity.delete")}
                </Button>
              </ConfirmDelete>
            </div>

            {training && <TrainingBody training={training} highlight={highlight} />}
            {workout && <WorkoutBody workout={workout} exerciseName={exerciseName} />}

            {window && (
              <VitalsChart
                window={window}
                glucose={glucoseSeries}
                pulse={pulseSeries}
                onHover={setHoverTime}
              />
            )}
          </>
        )}
      </div>
    </PanelPage>
  );
}

// Delete this activity by re-syncing its collection without it (full-replace).
function useDeleteActivity({
  workoutId,
  trainingId,
  allWorkouts,
  allTrainings,
}: {
  workoutId?: string;
  trainingId?: string;
  allWorkouts: Awaited<ReturnType<typeof sportService.workouts>>["workouts"];
  allTrainings: Awaited<ReturnType<typeof sportService.trainings>>["trainings"];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (workoutId) {
        return sportService.syncWorkouts((allWorkouts ?? []).filter((entry) => entry.id !== workoutId));
      }
      if (trainingId) {
        return sportService.syncTrainings(
          (allTrainings ?? []).filter((entry) => entry.id !== trainingId),
        );
      }
      return Promise.resolve({ success: false });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("activity.deleted"));
        queryClient.invalidateQueries({ queryKey: [workoutId ? "workouts" : "trainings"] });
        navigate("/health/activity");
      } else {
        toast.error(t("activity.delete_failed"));
      }
    },
    onError: () => toast.error(t("activity.delete_failed")),
  });
}
