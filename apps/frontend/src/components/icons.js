// Ready-made icons from lucide-react (the icon set shadcn/ui uses).
// Re-exported from a single place so components import icons consistently and
// the nav config can reference them by string key via ICONS. Each icon accepts
// a `className` (e.g. "size-[18px]") like any lucide icon.
import {
  Calculator,
  BookOpen,
  Mail,
  ShieldCheck,
  User,
  PanelLeft,
  Sun,
  Moon,
  Info,
  Zap,
  ChevronRight,
  GripVertical,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';

export {
  Calculator as CalculatorIcon,
  BookOpen as BookIcon,
  Mail as ContactIcon,
  ShieldCheck as ShieldIcon,
  User as UserIcon,
  PanelLeft as PanelLeftIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Info as InfoIcon,
  Zap as ZapIcon,
  ChevronRight as ChevronRightIcon,
  GripVertical as GripIcon,
  Trash2 as TrashIcon,
  Pencil as EditIcon,
  Check as CheckIcon,
  X as CrossIcon,
};

// Map nav-config `icon` string keys -> components.
export const ICONS = {
  calculator: Calculator,
  book: BookOpen,
  contact: Mail,
  shield: ShieldCheck,
  user: User,
};
