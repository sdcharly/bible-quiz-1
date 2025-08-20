import { 
  BookOpenIcon, 
  HomeIcon, 
  DocumentTextIcon, 
  PlusCircleIcon, 
  UserGroupIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  SparklesIcon,
  HeartIcon,
  LightBulbIcon,
  StarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  FireIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

import { 
  BookOpenIcon as BookOpenSolid,
  HomeIcon as HomeSolid,
  HeartIcon as HeartSolid,
  StarIcon as StarSolid
} from "@heroicons/react/24/solid";

// Sacred/Biblical themed icon mappings
export const SacredIcons = {
  // Main navigation
  dashboard: HomeIcon,
  scrolls: DocumentTextIcon,
  createQuest: PlusCircleIcon,
  disciples: UserGroupIcon,
  quests: ClipboardDocumentListIcon,
  journey: ChartBarIcon,
  
  // Status icons
  wisdom: BookOpenSolid,
  enlightenment: LightBulbIcon,
  blessing: HeartSolid,
  achievement: StarSolid,
  protection: ShieldCheckIcon,
  divine: SparklesIcon,
  sacred: FireIcon,
  power: BoltIcon,
  
  // State icons
  processing: ClockIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
  warning: ExclamationTriangleIcon,
  
  // Feature icons
  knowledge: AcademicCapIcon,
  inspiration: LightBulbIcon,
  love: HeartIcon,
  excellence: TrophyIcon,
  guidance: StarIcon,
} as const;

export type SacredIconName = keyof typeof SacredIcons;

interface SacredIconProps {
  name: SacredIconName;
  className?: string;
  solid?: boolean;
}

export function SacredIcon({ name, className = "h-5 w-5", solid = false }: SacredIconProps) {
  const IconComponent = SacredIcons[name];
  
  return <IconComponent className={className} />;
}

// Gradient icon wrapper for special occasions
interface GradientIconProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientIcon({ children, className = "p-3 rounded-lg" }: GradientIconProps) {
  return (
    <div className={`bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg ${className}`}>
      {children}
    </div>
  );
}