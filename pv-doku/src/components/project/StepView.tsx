"use client";

import type { ProjectStep } from "@/lib/constants";
import AbschlussStep from "./steps/AbschlussStep";
import BauherrStep from "./steps/BauherrStep";
import DachflaechenStep from "./steps/DachflaechenStep";
import FotosStep from "./steps/FotosStep";
import KomponentenStep from "./steps/KomponentenStep";
import MaengelStep from "./steps/MaengelStep";
import ProtokollStep from "./steps/ProtokollStep";
import PruefungStep from "./steps/PruefungStep";
import StammdatenStep from "./steps/StammdatenStep";

export default function StepView({ step }: { step: ProjectStep }) {
  switch (step) {
    case "stammdaten":
      return <StammdatenStep />;
    case "bauherr":
      return <BauherrStep />;
    case "dachflaechen":
      return <DachflaechenStep />;
    case "komponenten":
      return <KomponentenStep />;
    case "fotos":
      return <FotosStep />;
    case "pruefung":
      return <PruefungStep />;
    case "maengel":
      return <MaengelStep />;
    case "abschluss":
      return <AbschlussStep />;
    case "protokoll":
      return <ProtokollStep />;
  }
}
