"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { NavItem } from "@/types/blocks/base";
import { useRouter } from "next/navigation";

export default function ({ items }: { items: NavItem[] }) {
  const router = useRouter();

  const handleItemClick = (item: NavItem) => {
    if (item.url) {
      if (item.target === "_blank") {
        window.open(item.url, "_blank");
      } else {
        router.push(item.url);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {items.map((item) => {
          return (
            <DropdownMenuItem 
              key={item.title}
              onClick={() => handleItemClick(item)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {item.icon && <Icon name={item.icon} className="w-4 h-4" />}
                {item.title}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
