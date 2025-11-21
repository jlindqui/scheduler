import { BookOpen } from 'lucide-react';
import { lusitana } from '@/app/ui/fonts';

export function AcmeLogo() {
  return (
    <div className={`${lusitana.className} flex flex-row items-center leading-none text-white`}>
      <BookOpen className="h-12 w-12 rotate-[15deg]" />
      <p className="text-[44px]">B&B</p>
    </div>
  );
} 