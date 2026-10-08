// Phosphor-backed icon set.
//
// The panel was scaffolded against lucide-react's icon names. Rather than rename
// ~80 call sites, this module re-exports the matching Phosphor icons under those
// same names, so `import { X } from "@/components/icons"` is a drop-in for the
// old `from "lucide-react"`. Sizing/colour come from `className`/`size`, which
// both libraries accept identically. Phosphor's default "regular" weight matches
// lucide's stroked look. A handful of names have no exact Phosphor twin and use
// the closest glyph (noted inline).

// Names Phosphor already spells the same way.
export {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ArrowsLeftRight,
  ChartLine,
  ChartPie,
  Cpu,
  Eye,
  Flag,
  Footprints,
  Heart,
  ListChecks,
  Minus,
  Moon,
  Package,
  Pause,
  Play,
  Plus,
  Ruler,
  SkipForward,
  Sun,
  Syringe,
  Timer,
} from "@phosphor-icons/react";

// Names that map to a differently-named Phosphor glyph.
export {
  Pulse as Activity,
  PersonSimpleRun as Running,
  Bicycle as Bike,
  Book as BookA,
  ChartBar as ChartColumnBig,
  Checks as CheckCheck,
  Check as CheckIcon,
  CaretDown as ChevronDown,
  CaretDown as ChevronDownIcon,
  CaretLeft as ChevronLeft,
  CaretLeft as ChevronLeftIcon,
  CaretRight as ChevronRight,
  CaretRight as ChevronRightIcon,
  CaretUpDown as ChevronsUpDown,
  CaretUpDown as ChevronsUpDownIcon,
  CaretUp as ChevronUpIcon,
  CalendarDots as CalendarClock, // no calendar-clock glyph; dots read as scheduled events
  CheckCircle as CircleCheckIcon,
  Circle as CircleIcon,
  Columns as Columns3Icon,
  Coffee as CupSoda,
  DownloadSimple as Download,
  Drop as Droplet,
  Barbell as Dumbbell,
  EyeSlash as EyeOff,
  Funnel as Filter,
  Drop as GlassWater, // no water-glass glyph; a drop reads as a liquid
  Heartbeat as HeartPulse,
  Info as InfoIcon,
  Translate as Languages,
  SquaresFour as LayoutDashboard,
  CircleNotch as Loader2Icon,
  SignOut as LogOut,
  ArrowsOut as Maximize,
  Drop as Milk, // no milk glyph; a drop reads as a liquid
  Minus as MinusIcon,
  Monitor as MonitorCog,
  DotsThree as MoreHorizontal,
  DotsThree as MoreHorizontalIcon,
  DotsThreeVertical as MoreVertical,
  SidebarSimple as PanelLeftIcon,
  PencilSimple as Pencil,
  ArrowsClockwise as RefreshCcwIcon,
  MagnifyingGlass as Search,
  MagnifyingGlass as SearchIcon,
  Gear as Settings,
  CircleHalf as SunMoon,
  ClockCounterClockwise as TimerReset,
  Trash as Trash2,
  Warning as TriangleAlertIcon,
  User as UserRound,
  ForkKnife as Utensils,
  X as XIcon,
  Lightning as Zap,
} from "@phosphor-icons/react";

// The codebase types icon props as `LucideIcon`; Phosphor's equivalent is `Icon`.
export type { Icon as LucideIcon } from "@phosphor-icons/react";
