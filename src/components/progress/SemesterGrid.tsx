import { InfoPopup } from '@/components/ui/info-popup';

interface SemesterGridProps {
  currentSemester: number;
  totalSemesters: number;
  completedSemesters: number;
  showInfo?: boolean;
  infoText?: string;
}

export function SemesterGrid({ 
  currentSemester, 
  totalSemesters, 
  completedSemesters,
  showInfo = false,
  infoText = ''
}: SemesterGridProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Semestre</h3>
          {showInfo && (
            <InfoPopup
              iconClassName="w-3.5 h-3.5"
              content={infoText}
            />
          )}
        </div>
        <span className="text-sm font-medium text-foreground">
          {currentSemester}º
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalSemesters }).map((_, index) => {
          const semesterNumber = index + 1;
          const isCompleted = semesterNumber <= completedSemesters;
          const isCurrent = semesterNumber === currentSemester && !isCompleted;
          
          return (
            <div key={index} className="space-y-1">
              <div 
                className={`h-8 rounded-md flex items-center justify-center text-xs font-medium
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-muted text-muted-foreground'}`}
              >
                {semesterNumber}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
