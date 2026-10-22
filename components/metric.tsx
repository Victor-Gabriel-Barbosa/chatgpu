import type { LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type MetricProps = {
  icon: LucideIcon;
  value: string | number;
  label: string;
};

export function Metric({ icon: Icon, value, label }: Readonly<MetricProps>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 cursor-pointer"
          aria-label={`${label}: ${value}`}
        >
          <Icon width={15} height={15} aria-hidden="true" />
          <span>{value}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" className="flex-row items-center w-auto px-2 py-1 gap-1">
        <Icon width={15} height={15} aria-hidden="true" /> 
        <span>{label}</span>
      </PopoverContent>
    </Popover>
  );
}