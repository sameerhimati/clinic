"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function ToastOnParam({
  param,
  message,
}: {
  param: string;
  message: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (searchParams.get(param) === "1" && !fired.current) {
      fired.current = true;
      toast.success(message);
      // Remove the param from URL without navigation
      const next = new URLSearchParams(searchParams.toString());
      next.delete(param);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, param, message, router, pathname]);

  return null;
}
