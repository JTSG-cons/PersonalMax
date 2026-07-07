import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { NewWorkoutEditor } from "./editor";

export const metadata: Metadata = { title: "Log workout" };

export default function NewWorkoutPage() {
  return (
    <>
      <PageTitle title="Log workout" subtitle="Exercises, sets, reps, load. Get it in." />
      <NewWorkoutEditor />
    </>
  );
}
