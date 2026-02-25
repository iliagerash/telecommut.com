import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CircleCheckBig,
  Code2,
  Coins,
  Database,
  FilePenLine,
  GraduationCap,
  HardDrive,
  Headset,
  LineChart,
  ListTodo,
  Megaphone,
  Palette,
  Scale,
  Stethoscope,
  Sun,
  Users,
} from "lucide-react";

type CategoryIconProps = {
  name: string | null;
  className?: string;
};

const iconByName: Record<string, LucideIcon> = {
  CalendarDays,
  CircleCheckBig,
  Code2,
  Coins,
  Database,
  FilePenLine,
  GraduationCap,
  HardDrive,
  Headset,
  LineChart,
  ListTodo,
  Megaphone,
  Palette,
  Scale,
  Stethoscope,
  Sun,
  Users,
};

export default function CategoryIcon({ name, className }: CategoryIconProps) {
  const normalized = String(name ?? "").trim();
  const Icon = iconByName[normalized];
  if (!Icon) return null;
  return <Icon aria-hidden="true" className={className} />;
}
