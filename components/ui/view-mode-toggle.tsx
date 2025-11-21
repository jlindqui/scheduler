'use client';

import { useState } from 'react';
import { Check, ChevronDown, Eye, Shield, User, Users, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useViewMode, type ViewMode } from '@/app/contexts/ViewModeContext';

const viewModeOptions = [
  {
    value: 'super_admin' as ViewMode,
    label: 'Super Admin',
    description: 'Full access across all organizations',
    icon: Shield,
  },
  {
    value: 'org_admin' as ViewMode,
    label: 'Org Admin',
    description: 'Admin access within current organization',
    icon: Users,
  },
  {
    value: 'member' as ViewMode,
    label: 'Org Member',
    description: 'Member access within current organization',
    icon: User,
  },
];

interface ViewModeToggleProps {
  isCollapsed?: boolean;
}

export function ViewModeToggle({ isCollapsed = false }: ViewModeToggleProps) {
  const { viewMode, setViewMode } = useViewMode();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = viewModeOptions.find(option => option.value === viewMode) || viewModeOptions[0];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-10 w-full text-sm font-medium text-[#182D5D]/70 transition-colors hover:bg-accent hover:text-[#182D5D]",
            isCollapsed ? "px-0 justify-center" : "px-3 justify-between"
          )}
          title={isCollapsed ? `Viewing as: ${currentOption.label}` : undefined}
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="truncate">
                View as: {currentOption.label}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-64"
        side={isCollapsed ? "right" : "bottom"}
      >
        {viewModeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = viewMode === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setViewMode(option.value)}
              className="flex items-start gap-3 p-3"
            >
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}