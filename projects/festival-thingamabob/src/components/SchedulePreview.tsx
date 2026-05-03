import React from 'react';
import { FestivalSet } from '../types/festival';
import { formatTimeRange } from '../lib/timeUtils';
import { STAGES } from '../lib/sampleData';

interface SchedulePreviewProps {
  sets: FestivalSet[];
  selectedDay: string;
}

export function SchedulePreview({ sets, selectedDay }: SchedulePreviewProps) {
  const daySets = sets
    .filter(s => s.day === selectedDay)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const byStage: Record<string, FestivalSet[]> = {};
  for (const stage of STAGES) {
    const stageSets = daySets.filter(s => s.stage === stage);
    if (stageSets.length > 0) byStage[stage] = stageSets;
  }

  return (
    <div className="space-y-4">
      {Object.entries(byStage).map(([stage, stageSets]) => (
        <div key={stage} className="bg-festival-card border border-festival-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-festival-border bg-festival-fuchsia/5">
            <h3 className="font-semibold text-festival-fuchsia text-sm">{stage}</h3>
          </div>
          <div className="divide-y divide-festival-border/40">
            {stageSets.map(s => (
              <div key={s.id} className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-slate-200">{s.artist}</span>
                <span className="text-xs text-slate-500">{formatTimeRange(s.startTime, s.endTime)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
