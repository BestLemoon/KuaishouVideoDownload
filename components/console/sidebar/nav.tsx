"use client";

import Icon from "@/components/icon";
import Link from "next/link";
import { NavItem } from "@/types/blocks/base";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function ({
  className,
  items,
  ...props
}: {
  className?: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // 避免hydration mismatch，只在客户端挂载后才使用pathname
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className
      )}
      {...props}
    >
      {items.map((item, index) => {
        // 只在客户端挂载后才检查路径匹配，避免hydration mismatch
        const isActive = mounted && (pathname === item.url || item.is_active);

        return (
          <Link
            key={index}
            href={item.url || ""}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              isActive
                ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                : "hover:bg-primary/10 hover:text-primary hover:no-underline transition-colors",
              "justify-start"
            )}
          >
            {item.icon && <Icon name={item.icon} className="w-4 h-4" />}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
