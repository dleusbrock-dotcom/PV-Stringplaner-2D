"use client";

import { useMemo } from "react";
import { checkCompleteness } from "@/lib/completeness";
import type { ProjectData } from "./ProjectContext";

export function useCompleteness(data: ProjectData) {
  return useMemo(
    () =>
      checkCompleteness({
        project: data.project,
        roofs: data.roofs,
        moduleTypes: data.moduleTypes,
        strings: data.strings,
        components: data.components,
        files: data.files,
        testValues: data.testValues,
        checklist: data.checklist,
        defects: data.defects,
        signatures: data.signatures,
        requiredPhotoCategories: data.company?.required_photo_categories ?? [],
      }),
    [data],
  );
}
