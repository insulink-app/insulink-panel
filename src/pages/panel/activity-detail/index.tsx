import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  getRelativeCoordinate,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  useXAxisInverseScale,
  type InverseScaleFunction,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { RouteMap } from "@/components/route-map";
import { positionAt, type TrackPoint } from "@/lib/track";
import sportService, {
  type SetLog,
  type Training,
  type Workout,
} from "@/api/services/sport-service";
import glucoseService from "@/api/services/glucose-service";
import healthService from "@/api/services/health-service";

const GLUCOSE_COLOR = "#6366f1";
const PULSE_COLOR = "#e0533d";
// Pad the vitals window so the run-up and recovery around the activity show.
const PAD_MS = 10 * 60 * 1000;

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
    kind === "workout"
      ? workouts.data?.workouts?.find((entry) => entry.id === id)
      : undefined;
  const training =
    kind === "training"
      ? trainings.data?.trainings?.find((entry) => entry.id === id)
      : undefined;

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
      ? routineName.get(workout.routine) ?? t("activity.workout")
      : "";
  const at = training?.start ?? workout?.started;

  // Delete this activity by re-syncing its collection without it (full-replace).
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deletion = useMutation({
    mutationFn: () => {
      if (workout) {
        const rest = (workouts.data?.workouts ?? []).filter((entry) => entry.id !== workout.id);
        return sportService.syncWorkouts(rest);
      }
      if (training) {
        const rest = (trainings.data?.trainings ?? []).filter((entry) => entry.id !== training.id);
        return sportService.syncTrainings(rest);
      }
      return Promise.resolve({ success: false });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("activity.deleted"));
        queryClient.invalidateQueries({ queryKey: [workout ? "workouts" : "trainings"] });
        navigate("/health/activity");
      } else {
        toast.error(t("activity.delete_failed"));
      }
    },
    onError: () => toast.error(t("activity.delete_failed")),
  });

  // Timestamp under the vitals-chart cursor; drives the marker on the map.
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  // Sorted once per training, not per hover: `positionAt` only reads it.
  const orderedTrack = useMemo(
    () => (training?.track ?? []).slice().sort((left, right) => left.t - right.t),
    [training],
  );
  const highlight = useMemo(
    () => positionAt(orderedTrack, hoverTime),
    [orderedTrack, hoverTime],
  );

  return (
    <PanelPage
      title={title || t("activity.title")}
      parents={[
        { title: t("nav.health") },
        { title: t("activity.title"), href: "/health/activity" },
      ]}
    >
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/health/activity">
            <ArrowLeft className="size-4" />
            {t("activity.back")}
          </Link>
        </Button>

        {!workout && !training ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
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

function TrainingBody({
  training,
  highlight,
}: {
  training: Training;
  highlight?: { lat: number; lng: number } | null;
}) {
  const { t } = useTranslation();
  const seconds = Math.max(0, Math.round((training.end - training.start) / 1000));
  const km = training.dist / 1000;
  // Average pace in seconds per kilometre — the app's per-km metric.
  const paceSecPerKm = km > 0 ? seconds / km : 0;
  // Walks the whole track, and `highlight` changes on every hover — so memoise.
  const splits = useMemo(() => kmSplits(training.track ?? []), [training.track]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("activity.duration")} value={formatDuration(seconds)} />
        <StatTile label={t("activity.distance")} value={`${km.toFixed(2)} ${t("body.km")}`} />
        <StatTile label={t("activity.avg_pace")} value={formatPace(paceSecPerKm)} />
        <StatTile label={t("activity.track_points")} value={String(training.track?.length ?? 0)} />
      </div>
      {training.track && training.track.length >= 2 ? (
        <RouteMap track={training.track} highlight={highlight} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("activity.no_route")}
          </CardContent>
        </Card>
      )}
      <SplitsPanel splits={splits} />
    </div>
  );
}

// Per-kilometre pace list: one row per km with a bar scaled to that km's pace
// relative to the run's fastest/slowest, mirroring the app's splits panel.
function SplitsPanel({ splits }: { splits: KmSplit[] }) {
  const { t } = useTranslation();
  if (splits.length === 0) {
    return null;
  }
  const paces = splits.map((split) => split.paceSecPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const span = slowest - fastest;
  // Bar fill 0.35..1.0, longest for the fastest km (shortest pace).
  const fractionOf = (pace: number) =>
    span === 0 ? 1 : 0.35 + 0.65 * (1 - (pace - fastest) / span);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("activity.splits")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {splits.map((split) => (
          <div key={split.index} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              {split.km < 1
                ? `${split.km.toFixed(2)} ${t("body.km")}`
                : t("activity.km_label", { n: split.index })}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${fractionOf(split.paceSecPerKm) * 100}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-sm font-semibold">
              {formatPace(split.paceSecPerKm)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WorkoutBody({
  workout,
  exerciseName,
}: {
  workout: Workout;
  exerciseName: Map<string, string>;
}) {
  const { t } = useTranslation();
  const groups: { exerciseId: string; sets: SetLog[] }[] = [];
  for (const set of workout.sets) {
    let group = groups.find((entry) => entry.exerciseId === set.ex);
    if (!group) {
      group = { exerciseId: set.ex, sets: [] };
      groups.push(group);
    }
    group.sets.push(set);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("routines.exercises")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.exerciseId}>
            <div className="mb-1 font-medium">
              {exerciseName.get(group.exerciseId) ?? t("activity.exercise")}
            </div>
            <div className="flex flex-col gap-1">
              {group.sets.map((set, index) => (
                <div
                  key={set.ts + "-" + index}
                  className="flex justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t("activity.set")} {index + 1}
                  </span>
                  <span className="font-medium">{formatSet(set, t)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const TICK_STEPS_MS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720].map(
  (minutes) => minutes * 60000,
);

// Recharts derives its ticks from the data points, and the pulse samples every
// few seconds — so the axis came out as a minute-by-minute smear. Lay the ticks
// on round times across the window instead, at the coarsest step that still
// leaves ~`target` of them.
// ponytail: steps are aligned against epoch (UTC), so a step above an hour can
// land off-hour in a half-hour timezone. Activity windows never get that long.
function timeTicks(from: number, to: number, target = 6) {
  const step =
    TICK_STEPS_MS.find((candidate) => (to - from) / candidate <= target) ??
    TICK_STEPS_MS[TICK_STEPS_MS.length - 1];
  const ticks: number[] = [];
  for (let tick = Math.ceil(from / step) * step; tick <= to; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

type VitalsRow = {
  t: number;
  glucose?: number;
  pulse?: number;
  // The last reading of each series at this row's time — tooltip only, never drawn.
  glucoseAt?: number;
  pulseAt?: number;
};

// Glucose (mg/dL, left axis) and pulse (bpm, right axis) over the activity's
// window. The two series carry different timestamps, so they're merged into one
// sorted series and bridged with connectNulls.
// Memoised: hovering it updates the map marker via state on the page above, and
// without this the chart would rebuild its merged series on every mouse move.
const VitalsChart = memo(function VitalsChart({
  window,
  glucose,
  pulse,
  onHover,
}: {
  window: { start: number; end: number };
  glucose: { t: number; glucose: number }[];
  pulse: { t: number; pulse: number }[];
  onHover: (time: number | null) => void;
}) {
  const { t } = useTranslation();
  const from = window.start - PAD_MS;
  const to = window.end + PAD_MS;
  // The cursor pixel, not `activeLabel`: the label is the *nearest data point's*
  // timestamp, so reporting it makes the map marker hop from reading to reading.
  // The inverse scale turns the pixel back into an exact time, but it is only
  // reachable from a hook inside the chart — `ScaleProbe` parks it here so the
  // handler can read it without holding the cursor in state and re-rendering
  // the whole chart on every mouse move.
  const inverseScaleRef = useRef<InverseScaleFunction | null>(null);

  const data = useMemo(() => {
    const inWindow = (time: number) => time >= from && time <= to;
    const merged = [
      ...glucose.filter((point) => inWindow(point.t)),
      ...pulse.filter((point) => inWindow(point.t)),
    ] as VitalsRow[];
    merged.sort((left, right) => left.t - right.t);
    // A row only ever holds the value of the series it came from, so the hovered
    // row would show just one of the two. Carry the last reading of each series
    // forward into every row — under tooltip-only keys, so the drawn lines keep
    // their own (sparser) points instead of gaining stair steps. Copies, because
    // the rows are still the caller's memoised objects, not ours to write to.
    let lastGlucose: number | undefined;
    let lastPulse: number | undefined;
    return merged.map((row) => {
      lastGlucose = row.glucose ?? lastGlucose;
      lastPulse = row.pulse ?? lastPulse;
      return { ...row, glucoseAt: lastGlucose, pulseAt: lastPulse };
    });
  }, [glucose, pulse, from, to]);

  const ticks = useMemo(() => timeTicks(from, to), [from, to]);

  const hasGlucose = data.some((point) => point.glucose != null);
  const hasPulse = data.some((point) => point.pulse != null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("activity.vitals")}</CardTitle>
        <div className="flex gap-4 text-xs">
          {hasGlucose && <Legend color={GLUCOSE_COLOR} label={t("activity.glucose")} />}
          {hasPulse && <Legend color={PULSE_COLOR} label={t("activity.pulse")} />}
        </div>
      </CardHeader>
      <CardContent>
        {!hasGlucose && !hasPulse ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("activity.no_vitals")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              onMouseMove={(_, event) => {
                const inverseScale = inverseScaleRef.current;
                if (inverseScale) {
                  onHover(Number(inverseScale(getRelativeCoordinate(event).relativeX)));
                }
              }}
              onMouseLeave={() => onHover(null)}
            >
              <ScaleProbe scaleRef={inverseScaleRef} />
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[from, to]}
                ticks={ticks}
                tickFormatter={(value) => format(new Date(value), "HH:mm")}
                fontSize={12}
              />
              <YAxis yAxisId="glucose" fontSize={12} width={40} domain={["dataMin - 10", "dataMax + 10"]} stroke={GLUCOSE_COLOR} />
              <YAxis yAxisId="pulse" orientation="right" fontSize={12} width={36} domain={["dataMin - 5", "dataMax + 5"]} stroke={PULSE_COLOR} />
              <Tooltip content={<VitalsTooltip glucoseLabel={t("activity.glucose")} pulseLabel={t("activity.pulse")} />} isAnimationActive={false} />
              <Line yAxisId="glucose" type="monotone" dataKey="glucose" stroke={GLUCOSE_COLOR} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              <Line yAxisId="pulse" type="monotone" dataKey="pulse" stroke={PULSE_COLOR} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});

// Hands the x-axis inverse scale to the chart's mouse handler. The hook only
// works inside the chart, so this rides along as a child and renders nothing.
function ScaleProbe({ scaleRef }: { scaleRef: RefObject<InverseScaleFunction | null> }) {
  const inverseScale = useXAxisInverseScale();
  useEffect(() => {
    scaleRef.current = inverseScale ?? null;
  }, [inverseScale, scaleRef]);
  return null;
}

function VitalsTooltip({
  active,
  payload,
  label,
  glucoseLabel,
  pulseLabel,
}: {
  active?: boolean;
  payload?: { payload?: VitalsRow }[];
  label?: number;
  glucoseLabel: string;
  pulseLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  // The source row, not the per-series entries: those only carry the one value
  // the hovered row was built from.
  const row = payload[0]?.payload;
  const glucose = row?.glucoseAt;
  const pulse = row?.pulseAt;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {format(new Date(label as number), "dd.MM. HH:mm")}
      </div>
      {glucose != null && (
        <div className="text-sm font-semibold" style={{ color: GLUCOSE_COLOR }}>
          {glucoseLabel}: {glucose} mg/dL
        </div>
      )}
      {pulse != null && (
        <div className="text-sm font-semibold" style={{ color: PULSE_COLOR }}>
          {pulseLabel}: {pulse} bpm
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}


function formatSet(set: SetLog, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (set.dur != null) {
    return formatDuration(set.dur);
  }
  const reps = set.reps ?? set.secs ?? 0;
  if (set.kg != null && set.kg > 0) {
    return `${reps} × ${set.kg} ${t("body.kg")}`;
  }
  return t("activity.reps", { n: reps });
}

type KmSplit = { index: number; km: number; paceSecPerKm: number };

// Great-circle distance between two coordinates in metres (haversine).
function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radius = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

// Per-kilometre splits from a GPS track, interpolating the exact time each km
// mark is crossed within its segment (so a split isn't rounded to a fix
// boundary). The final entry is the leftover distance (< 1 km). Mirrors the
// app's kmSplits().
function kmSplits(track: TrackPoint[]): KmSplit[] {
  if (track.length < 2) {
    return [];
  }
  const splits: KmSplit[] = [];
  let cumDist = 0;
  let boundaryDist = 0;
  let boundaryMs = track[0].t;
  for (let index = 1; index < track.length; index += 1) {
    const prev = track[index - 1];
    const curr = track[index];
    const segStart = cumDist;
    const segDist = distanceM(prev.lat, prev.lng, curr.lat, curr.lng);
    cumDist += segDist;
    while (cumDist >= boundaryDist + 1000) {
      const target = boundaryDist + 1000;
      const into = segDist === 0 ? 0 : (target - segStart) / segDist;
      const crossMs = prev.t + (curr.t - prev.t) * into;
      splits.push({
        index: splits.length + 1,
        km: 1,
        paceSecPerKm: (crossMs - boundaryMs) / 1000,
      });
      boundaryDist = target;
      boundaryMs = crossMs;
    }
  }
  const leftover = cumDist - boundaryDist;
  if (leftover > 50) {
    const km = leftover / 1000;
    const seconds = (track[track.length - 1].t - boundaryMs) / 1000;
    splits.push({
      index: splits.length + 1,
      km,
      paceSecPerKm: km > 0 ? seconds / km : 0,
    });
  }
  return splits;
}

// Seconds-per-km → "m:ss /km" (mirrors the app's formatPace); "–" when unknown.
function formatPace(secPerKm: number) {
  if (secPerKm <= 0) {
    return "–";
  }
  const total = Math.round(secPerKm);
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${Math.floor(total / 60)}:${seconds} /km`;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m ${seconds}s`;
}
