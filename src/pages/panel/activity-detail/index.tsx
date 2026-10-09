import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { positionAt, speedSeries } from "@/lib/track";
import sportService from "@/api/services/sport-service";
import glucoseService from "@/api/services/glucose-service";
import healthService from "@/api/services/health-service";
import { TrainingBody } from "./training-body";
import { WorkoutBody } from "./workout-body";
import { WorkoutSummaryCard } from "./workout-summary-card";
import { VitalsChart } from "./vitals-chart";
import { workoutTitle } from "@/lib/workout";
import { formatWhen } from "@/lib/when";

export default function ActivityDetailPage() {
  const { t, i18n } = useTranslation();
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
      ? workoutTitle(workout.routine, routineName, t)
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
  // Speed is derived from the GPS track, not stored — no series for a training
  // without a route (e.g. a workout).
  const speedTrack = useMemo(() => speedSeries(orderedTrack), [orderedTrack]);
  const vitals = window && (
    <VitalsChart
      window={window}
      glucose={glucoseSeries}
      pulse={pulseSeries}
      speed={speedTrack}
      onHover={setHoverTime}
    />
  );

  return (
    <PanelPage
      title={title || t("activity.title")}
      parents={[{ title: t("nav.health") }, { title: t("activity.title"), href: "/health/activity" }]}
    >
      <div className="flex flex-col gap-4">
        <Button asChild variant="secondary" size="sm" className="self-start">
          <Link to="/health/activity">
            <ArrowLeft className="size-4" />
            {t("activity.back")}
          </Link>
        </Button>

        {!workout && !training ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <>
            <PageHeader
              title={title}
              subtitle={at != null && formatWhen(at, t, i18n.language)}
              actions={
                <ConfirmDelete
                  onConfirm={() => deletion.mutate()}
                  description={t("activity.delete_confirm")}
                >
                  <Button variant="outline" className="bg-panel hover:bg-raised" disabled={deletion.isPending}>
                    <Trash2 className="size-4 text-destructive" />
                    {t("activity.delete")}
                  </Button>
                </ConfirmDelete>
              }
            />

            {workout && (
              <WorkoutSummaryCard workout={workout} allWorkouts={workouts.data?.workouts ?? []} />
            )}

            {/* Cardio: the chart sits between the map and the km splits (passed
                into TrainingBody). Workout: it sits above the sets. */}
            {training && (
              <TrainingBody training={training} highlight={highlight} chart={vitals} />
            )}

            {workout && vitals}
            {workout && <WorkoutBody workout={workout} exerciseName={exerciseName} />}
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
