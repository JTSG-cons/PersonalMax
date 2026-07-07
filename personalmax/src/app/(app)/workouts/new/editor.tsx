"use client";

import { defaultDraft, WorkoutEditor } from "@/components/workout-editor";

export function NewWorkoutEditor() {
  return <WorkoutEditor mode="create" initial={defaultDraft()} />;
}
