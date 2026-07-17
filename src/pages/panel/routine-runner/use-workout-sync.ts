// Everything the runner says to the outside world: it mirrors the session to the
// account so the app can take it back over, follows the account so a workout
// ended elsewhere ends here too, and saves the finished session.
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import sportService, { type Routine, type Workout } from "@/api/services/sport-service";
import { snapshotOf, type Core } from "./core";

export function useWorkoutSync({
  core,
  routine,
  pastWorkouts,
}: {
  core: Core;
  routine: Routine;
  pastWorkouts: Workout[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const abandonedRef = useRef(false);

  useFollowAccount({ core, routine, abandonedRef, navigate, t });
  useMirrorToAccount({ core, routine, abandonedRef });
  useSaveOnFinish({ core, routine, pastWorkouts, navigate, queryClient, t });
}

type Translate = (key: string, options?: Record<string, unknown>) => string;
type Navigate = ReturnType<typeof useNavigate>;
type AbandonedRef = ReturnType<typeof useRef<boolean>>;

// Follow the account so a workout ended on the phone ends here too. Only the
// ending is adopted, never the state: this tab drives the workout while it is
// open, and applying a snapshot mid-set would fight the user's own input.
function useFollowAccount({
  core,
  routine,
  abandonedRef,
  navigate,
  t,
}: {
  core: Core;
  routine: Routine;
  abandonedRef: AbandonedRef;
  navigate: Navigate;
  t: Translate;
}) {
  const active = useQuery({
    queryKey: ["active-workout"],
    queryFn: sportService.activeWorkout,
    refetchInterval: 5000,
  });

  // Set once the account is seen holding *our* workout. Without it the very
  // first poll — before the mirror below has pushed anything — reads as "ended
  // elsewhere" and closes the runner the moment it opens.
  const confirmedRef = useRef(false);
  useEffect(() => {
    if (core.phase === "done" || abandonedRef.current) {
      return;
    }
    const remote = active.data?.workout;
    if (remote?.started === core.startedAt) {
      confirmedRef.current = true;
      return;
    }
    if (!confirmedRef.current) {
      return;
    }
    // The account moved on: our workout was finished, or another one replaced
    // it. Leave without saving — whoever ended it already logged the session.
    abandonedRef.current = true;
    toast.info(t("routines.ended_elsewhere"));
    navigate(`/health/routines/${routine.id}`);
  }, [active.data, core.phase, core.startedAt, navigate, routine.id, abandonedRef, t]);
}

// Mirror every change to the account so the app follows along and can take the
// workout back over. `core` only changes on a real interaction (the 1 Hz clock
// is separate state), so this is one write per action — debounced so holding
// the rep/weight buttons does not send a request per tap. Best-effort, like
// the app's own push: a failed mirror must not interrupt the workout, and the
// next action re-sends the full snapshot anyway.
function useMirrorToAccount({
  core,
  routine,
  abandonedRef,
}: {
  core: Core;
  routine: Routine;
  abandonedRef: AbandonedRef;
}) {
  useEffect(() => {
    if (core.phase === "done" || abandonedRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      // Re-checked at fire time, not just when armed: the workout may have been
      // ended elsewhere during the wait, and pushing now would recreate the one
      // the other device just finished.
      if (abandonedRef.current) {
        return;
      }
      sportService.syncActiveWorkout(snapshotOf(core, routine)).catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [core, routine, abandonedRef]);
}

// Persist the finished session (append to the full workout list, then sync),
// end the shared workout so no device offers to resume it afterwards, and
// leave for the activity list — the requests below outlive the unmount.
// Finishing cancels the armed mirror above (its cleanup runs first), so no
// snapshot lands after the clear. ponytail: a mirror already in flight when
// the user finishes still could, leaving a workout that resumes to a finished
// session — a `clear` that fences later writes by timestamp fixes it if it
// ever shows up in practice.
function useSaveOnFinish({
  core,
  routine,
  pastWorkouts,
  navigate,
  queryClient,
  t,
}: {
  core: Core;
  routine: Routine;
  pastWorkouts: Workout[];
  navigate: Navigate;
  queryClient: ReturnType<typeof useQueryClient>;
  t: Translate;
}) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (core.phase !== "done" || savedRef.current) {
      return;
    }
    savedRef.current = true;
    sportService
      .clearActiveWorkout()
      .then(() => queryClient.invalidateQueries({ queryKey: ["active-workout"] }))
      .catch(() => undefined);
    const session: Workout = {
      id: core.startedAt.toString(36),
      routine: routine.id,
      started: core.startedAt,
      sets: core.sets,
    };
    sportService
      .syncWorkouts([...pastWorkouts, session])
      .then((res) => {
        if (res.success) {
          toast.success(t("routines.workout_saved"));
          queryClient.invalidateQueries({ queryKey: ["workouts"] });
        } else {
          toast.error(t("routines.save_failed"));
        }
      })
      .catch(() => toast.error(t("routines.save_failed")));
    navigate("/health/activity");
  }, [core.phase, core.sets, core.startedAt, navigate, pastWorkouts, queryClient, routine.id, t]);
}
