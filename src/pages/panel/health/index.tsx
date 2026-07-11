import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import PanelPage from "@/layouts/panel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/table";
import sportService, {
  type Measurement,
  type Training,
  type Workout,
} from "@/api/services/sport-service";
import healthService, {
  type HealthDay,
  type PulseSample,
} from "@/api/services/health-service";

const ms = (t?: number) => (t ? format(new Date(t), "dd.MM.yyyy HH:mm") : "–");
const num = (v?: number) => (v == null ? "–" : String(v));

const workoutCols: ColumnDef<Workout, unknown>[] = [
  { accessorKey: "name", header: "Name", cell: ({ row }) => row.original.name ?? "–" },
  { accessorKey: "at", header: "Zeitpunkt", cell: ({ row }) => ms(row.original.at) },
  {
    id: "sets",
    header: "Sätze",
    cell: ({ row }) => String(row.original.sets?.length ?? 0),
  },
];

const trainingCols: ColumnDef<Training, unknown>[] = [
  { accessorKey: "type", header: "Typ", cell: ({ row }) => row.original.type ?? "–" },
  { accessorKey: "startMs", header: "Start", cell: ({ row }) => ms(row.original.startMs) },
  {
    id: "distance",
    header: "Distanz (km)",
    cell: ({ row }) =>
      row.original.distanceM != null
        ? (row.original.distanceM / 1000).toFixed(2)
        : "–",
  },
];

const measurementCols: ColumnDef<Measurement, unknown>[] = [
  { accessorKey: "type", header: "Typ", cell: ({ row }) => row.original.type ?? "–" },
  { accessorKey: "value", header: "Wert", cell: ({ row }) => num(row.original.value) },
  { accessorKey: "time", header: "Zeitpunkt", cell: ({ row }) => ms(row.original.time) },
];

const dayCols: ColumnDef<HealthDay, unknown>[] = [
  { accessorKey: "d", header: "Tag", cell: ({ row }) => row.original.d },
  { accessorKey: "rhr", header: "Ruhepuls", cell: ({ row }) => num(row.original.rhr) },
  {
    id: "sleep",
    header: "Schlaf (h)",
    cell: ({ row }) =>
      row.original.sleep != null ? (row.original.sleep / 60).toFixed(1) : "–",
  },
  { accessorKey: "spo2", header: "SpO₂", cell: ({ row }) => num(row.original.spo2) },
];

const pulseCols: ColumnDef<PulseSample, unknown>[] = [
  { accessorKey: "t", header: "Zeitpunkt", cell: ({ row }) => ms(row.original.t) },
  { accessorKey: "b", header: "bpm", cell: ({ row }) => num(row.original.b) },
];

function TableTab<T>({
  name,
  columns,
  data,
  isLoading,
}: {
  name: string;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <DataTable name={name} columns={columns} data={data} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: sportService.trainings });
  const measurements = useQuery({
    queryKey: ["measurements"],
    queryFn: sportService.measurements,
  });
  const days = useQuery({ queryKey: ["health-days"], queryFn: healthService.days });
  const pulse = useQuery({ queryKey: ["pulse"], queryFn: healthService.pulse });

  return (
    <PanelPage title="Sport & Gesundheit">
      <div className="py-6">
        <Tabs defaultValue="workouts">
          <TabsList>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="cardio">Cardio</TabsTrigger>
            <TabsTrigger value="measurements">Messungen</TabsTrigger>
            <TabsTrigger value="days">Health-Tage</TabsTrigger>
            <TabsTrigger value="pulse">Puls</TabsTrigger>
          </TabsList>
          <TabsContent value="workouts">
            <TableTab
              name="workouts"
              columns={workoutCols}
              data={workouts.data?.workouts ?? []}
              isLoading={workouts.isLoading}
            />
          </TabsContent>
          <TabsContent value="cardio">
            <TableTab
              name="trainings"
              columns={trainingCols}
              data={trainings.data?.trainings ?? []}
              isLoading={trainings.isLoading}
            />
          </TabsContent>
          <TabsContent value="measurements">
            <TableTab
              name="measurements"
              columns={measurementCols}
              data={measurements.data?.entries ?? []}
              isLoading={measurements.isLoading}
            />
          </TabsContent>
          <TabsContent value="days">
            <TableTab
              name="health-days"
              columns={dayCols}
              data={days.data?.days ?? []}
              isLoading={days.isLoading}
            />
          </TabsContent>
          <TabsContent value="pulse">
            <TableTab
              name="pulse"
              columns={pulseCols}
              data={pulse.data?.samples ?? []}
              isLoading={pulse.isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PanelPage>
  );
}
