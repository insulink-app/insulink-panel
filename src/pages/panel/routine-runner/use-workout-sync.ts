// Everything the runner says to the outside world: it mirrors the session to the
// account so the app can take it back over, follows the account so a set logged
// on the phone shows up here (and a workout ended there ends here too), and
// saves the finished session.
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import sportService, {
  type ActiveWorkout,
  type Routine,
  type Workout,
} from "@/api/services/sport-service";
import { shouldAdopt, snapshotOf, type Core } from "./core";

export function useWorkoutSync({
  core,
  adopt,
  routine,
  pastWorkouts,
}: {
  core: Core;
  adopt: (remote: ActiveWorkout) => void;
  routine: Routine;
  pastWorkouts: Workout[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const abandonedRef = useRef(false);
  // The `updated` stamp of the account copy this tab last saw — from its own
  // push or from a poll. The server writes it, so it orders the devices' writes
  // without trusting any of their clocks: a higher one came from another device
  // and is adopted, and sending it back lets the account refuse a push that
  // carries on a workout someone has already ended.
  const knownUpdateRef = useRef(0);
  // The snapshot as a string, so both hooks work off the session's CONTENT. The
  // objects around it are rebuilt on every render and every poll, and keying on
  // those mirrored the workout back to the account every few seconds — which is
  // how a push ends up in flight at the moment it is finished elsewhere.
  const payload = JSON.stringify(snapshotOf(core, routine));

  useFollowAccount({ core, adopt, routine, payload, knownUpdateRef, abandonedRef, navigate, t });
  useMirrorToAccount({ done: core.phase === "done", payload, knownUpdateRef, abandonedRef });
  useSaveOnFinish({ core, routine, pastWorkouts, navigate, queryClient, t });
}

// Long enough to coalesce a burst of taps on the rep/weight buttons, short
// enough that the other screen does not visibly lag behind an action.
const MIRROR_DEBOUNCE_MS = 400;

// Ending the shared workout is the one request here that may not be dropped: we
// navigate away regardless, so a `clear` lost to a moment of no signal leaves
// the workout running on the account — the phone keeps its runner open on a
// session that is over, and offers to resume it afterwards. Retried a few times
// with a short backoff; it is idempotent (clearing nothing is a success).
async function endSharedWorkout(attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await sportService.clearActiveWorkout();
      if (response.success) {
        return;
      }
    } catch {
      // Fall through to the retry below.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
  }
}

type Translate = (key: string, options?: Record<string, unknown>) => string;
type Navigate = ReturnType<typeof useNavigate>;
type BoolRef = { current: boolean };
type NumberRef = { current: number };

// Follow the account: adopt what the driving device pushed, and leave once the
// workout is over. Having the runner open does not make this tab the driver —
// the phone may be the one logging the sets, and ignoring its snapshots leaves
// this screen counting up on a set that finished long ago.
function useFollowAccount({
  core,
  adopt,
  routine,
  payload,
  knownUpdateRef,
  abandonedRef,
  navigate,
  t,
}: {
  core: Core;
  adopt: (remote: ActiveWorkout) => void;
  routine: Routine;
  payload: string;
  knownUpdateRef: NumberRef;
  abandonedRef: BoolRef;
  navigate: Navigate;
  t: Translate;
}) {
  // Polled hard while the runner is open: the phone may be the one logging the
  // sets, and a set that takes five seconds to appear here reads as no sync at
  // all. The snapshot is small and only this page polls this fast.
  const active = useQuery({
    queryKey: ["active-workout"],
    queryFn: sportService.activeWorkout,
    refetchInterval: 2000,
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
      const updated = active.data?.updated ?? 0;
      if (updated <= knownUpdateRef.current) {
        return;
      }
      if (shouldAdopt(remote, routine, payload, updated, knownUpdateRef.current)) {
        adopt(remote);
      }
      knownUpdateRef.current = updated;
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
  }, [
    active.data,
    adopt,
    core.phase,
    core.startedAt,
    knownUpdateRef,
    navigate,
    payload,
    routine,
    abandonedRef,
    t,
  ]);
}

// Mirror every change to the account so the app follows along and can take the
// workout back over. Keyed on the snapshot's content, so this is one write per
// action — debounced so holding the rep/weight buttons does not send a request
// per tap. Best-effort, like the app's own push: a failed mirror must not
// interrupt the workout, and the next action re-sends the full snapshot anyway.
function useMirrorToAccount({
  done,
  payload,
  knownUpdateRef,
  abandonedRef,
}: {
  done: boolean;
  payload: string;
  knownUpdateRef: NumberRef;
  abandonedRef: BoolRef;
}) {
  useEffect(() => {
    if (done || abandonedRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      // Re-checked at fire time, not just when armed: the workout may have been
      // ended elsewhere during the wait, and pushing now would recreate the one
      // the other device just finished. The stamp is the account's own fence
      // against the same thing for a push already in flight by then.
      if (abandonedRef.current) {
        return;
      }
      sportService
        .syncActiveWorkout(JSON.parse(payload) as ActiveWorkout, knownUpdateRef.current)
        .then((response) => {
          if (response.success && response.updated) {
            knownUpdateRef.current = response.updated;
          }
        })
        .catch(() => undefined);
    }, MIRROR_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [done, payload, knownUpdateRef, abandonedRef]);
}

// Persist the finished session (append to the full workout list, then sync),
// end the shared workout so no device offers to resume it afterwards, and
// leave for the activity list — the requests below outlive the unmount.
// Finishing cancels the armed mirror above (its cleanup runs first), so no
// snapshot lands after the clear; one already in flight when it does is refused
// by the account, which knows the row its stamp names is gone.
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
    endSharedWorkout().then(() =>
      queryClient.invalidateQueries({ queryKey: ["active-workout"] }),
    );
    const session: Workout = {
      id: core.startedAt.toString(36),
      routine: routine.id,
      started: core.startedAt,
      sets: core.sets,
    };
    // The id is the session's start, so re-saving one already in the logbook
    // replaces it rather than logging the same workout twice.
    const nextWorkouts = [...pastWorkouts.filter((entry) => entry.id !== session.id), session];
    // Seed the cache with the finished session so the summary (detail) page we
    // navigate to finds it immediately, before the sync round-trips. The sync's
    // own invalidate below refetches the authoritative list afterwards.
    queryClient.setQueryData<{ success: boolean; workouts?: Workout[] }>(["workouts"], (old) => ({
      success: old?.success ?? true,
      workouts: nextWorkouts,
    }));
    sportService
      .syncWorkouts(nextWorkouts)
      .then((res) => {
        if (res.success) {
          toast.success(t("routines.workout_saved"));
          queryClient.invalidateQueries({ queryKey: ["workouts"] });
        } else {
          toast.error(t("routines.save_failed"));
        }
      })
      .catch(() => toast.error(t("routines.save_failed")));
    navigate(`/health/activity/workout/${session.id}`);
  }, [core.phase, core.sets, core.startedAt, navigate, pastWorkouts, queryClient, routine.id, t]);
}
