import Link from "next/link";

export function StickyMobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/10 bg-ivory/95 p-3 backdrop-blur md:hidden">
      <Link
        href="/request-service"
        className="flex w-full items-center justify-center rounded-sm bg-navy px-5 py-3 font-sans text-sm font-medium text-ivory"
      >
        Request Service
      </Link>
    </div>
  );
}
