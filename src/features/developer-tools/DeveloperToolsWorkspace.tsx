import { useOutletContext } from "react-router-dom";
import type { AppBootstrapState } from "@/types/app";
import { ColorConverterPanel } from "./ColorConverterPanel";
import { JwtDecoderPanel } from "./JwtDecoderPanel";
import { RegexTesterPanel } from "./RegexTesterPanel";
import { TimestampConverterPanel } from "./TimestampConverterPanel";
import { UuidGeneratorPanel } from "./UuidGeneratorPanel";

export function DeveloperToolsWorkspace() {
  useOutletContext<AppBootstrapState>();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <UuidGeneratorPanel />
        <TimestampConverterPanel />
        <RegexTesterPanel className="xl:col-span-2" />
        <JwtDecoderPanel />
        <ColorConverterPanel />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Timestamp tips", description: "10-digit numbers are read as Unix seconds; longer numbers are read as milliseconds." },
          { title: "JWT note", description: "The decoder only reads the header and payload. Signatures are not verified." },
          { title: "Color formats", description: "The color converter accepts HEX, RGB, and HSL with range validation for consistent results." },
        ].map((item) => (
          <div key={item.title} className="surface-panel-alt p-4">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
