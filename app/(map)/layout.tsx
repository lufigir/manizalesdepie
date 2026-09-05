import { DemoBanner } from "./_components/demo-banner";
import { DemoProvider } from "./_components/demo-store";

/**
 * The frame every map route sits in: the demo strip along the top, and the
 * store that remembers what the reader did underneath it.
 *
 * Both belong here rather than on each page for the same reason. The strip
 * has to be on screen on every route, including the four shared-link ones and
 * the report forms, and a layout is what survives navigation between them —
 * which is exactly the property the store needs too, so that a case reported
 * from `/reportar/necesidad` is still on the map after landing back on `/`.
 *
 * It also owns the height. The routes below used to each declare `h-dvh`;
 * now the viewport is split once, here, and they fill what is left.
 */
export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <DemoBanner />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DemoProvider>{children}</DemoProvider>
      </div>
    </div>
  );
}
