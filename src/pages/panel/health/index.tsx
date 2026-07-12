import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { DataList, type ListColumn } from "@/components/data-list";
import sportService, {
  type Measurement,
  type Training,
  type Workout,
} from "@/api/services/sport-service";
import healthService, {
  type HealthDay,
  type PulseSample,
} from "@/api/services/health-service";

const ms = (at?: number) => (at ? format(new Date(at), "dd.MM.yyyy HH:mm") : "–");
const num = (v?: number) => (v == null ? "–" : String(v));

export default function HealthPage() {
  const { t } = useTranslation();
  const { view } = useParams();

  const workoutCols: ListColumn<Workout>[] = [
    { header: t("health.col_name"), cell: (w) => w.name ?? "–" },
    { header: t("health.col_time"), cell: (w) => ms(w.at) },
    { header: t("health.col_sets"), cell: (w) => String(w.sets?.length ?? 0) },
  ];
  const trainingCols: ListColumn<Training>[] = [
    { header: t("health.col_type"), cell: (tr) => tr.type ?? "–" },
    { header: t("health.col_start"), cell: (tr) => ms(tr.startMs) },
    {
      header: t("health.col_distance"),
      cell: (tr) =>
        tr.distanceM != null ? (tr.distanceM / 1000).toFixed(2) : "–",
    },
  ];
  const measurementCols: ListColumn<Measurement>[] = [
    { header: t("health.col_type"), cell: (m) => m.type ?? "–" },
    { header: t("health.col_value"), cell: (m) => num(m.value) },
    { header: t("health.col_time"), cell: (m) => ms(m.time) },
  ];
  const dayCols: ListColumn<HealthDay>[] = [
    { header: t("health.col_day"), cell: (d) => d.d },
    { header: t("health.col_resting_hr"), cell: (d) => num(d.rhr) },
    {
      header: t("health.col_sleep"),
      cell: (d) => (d.sleep != null ? (d.sleep / 60).toFixed(1) : "–"),
    },
    { header: t("health.col_spo2"), cell: (d) => num(d.spo2) },
  ];
  const pulseCols: ListColumn<PulseSample>[] = [
    { header: t("health.col_time"), cell: (p) => ms(p.t) },
    { header: t("health.col_bpm"), cell: (p) => num(p.b) },
  ];

  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: sportService.trainings });
  const measurements = useQuery({
    queryKey: ["measurements"],
    queryFn: sportService.measurements,
  });
  const days = useQuery({ queryKey: ["health-days"], queryFn: healthService.days });
  const pulse = useQuery({ queryKey: ["pulse"], queryFn: healthService.pulse });

  const views = {
    workouts: (
      <DataList
        title={t("health.workouts")}
        columns={workoutCols}
        data={workouts.data?.workouts ?? []}
        isLoading={workouts.isLoading}
      />
    ),
    cardio: (
      <DataList
        title={t("health.cardio")}
        columns={trainingCols}
        data={trainings.data?.trainings ?? []}
        isLoading={trainings.isLoading}
      />
    ),
    measurements: (
      <DataList
        title={t("health.measurements")}
        columns={measurementCols}
        data={measurements.data?.entries ?? []}
        isLoading={measurements.isLoading}
      />
    ),
    days: (
      <DataList
        title={t("health.health_days")}
        columns={dayCols}
        data={days.data?.days ?? []}
        isLoading={days.isLoading}
      />
    ),
    pulse: (
      <DataList
        title={t("health.pulse")}
        columns={pulseCols}
        data={pulse.data?.samples ?? []}
        isLoading={pulse.isLoading}
      />
    ),
  };

  return (
    <PanelPage title={t("health.title")}>
      <div className="py-6">{views[(view as keyof typeof views) ?? "workouts"] ?? views.workouts}</div>
    </PanelPage>
  );
}
