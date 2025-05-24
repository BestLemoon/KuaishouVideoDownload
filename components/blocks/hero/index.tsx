import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HappyUsers from "./happy-users";
import HeroBg from "./bg";
import { Hero as HeroType } from "@/types/blocks/hero";
import Icon from "@/components/icon";
import Link from "next/link";
import { DownloadTabs } from "@/components/downloads";

export default function Hero({ hero }: { hero: HeroType }) {
  if (hero.disabled) {
    return null;
  }

  const highlightText = hero.highlight_text;
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  return (
    <>
      <HeroBg />
      <section className="py-24">
        <div className="container">
          {hero.show_badge && (
            <div className="flex items-center justify-center mb-8">
              <img
                src="/imgs/badges/phdaily.svg"
                alt="phdaily"
                className="h-10 object-cover"
              />
            </div>
          )}
          <div className="text-center">
            {hero.announcement && (
              <a
                href={hero.announcement.url}
                className="mx-auto mb-3 inline-flex items-center gap-3 rounded-full border px-2 py-1 text-sm"
              >
                {hero.announcement.label && (
                  <Badge>{hero.announcement.label}</Badge>
                )}
                {hero.announcement.title}
              </a>
            )}

            {texts && texts.length > 1 ? (
              <h1 className="mx-auto mb-3 mt-4 max-w-4xl text-balance text-4xl font-bold lg:mb-7 lg:text-7xl">
                {texts[0]}
                <span className="bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent">
                  {highlightText}
                </span>
                {texts[1]}
              </h1>
            ) : (
              <h1 className="mx-auto mb-3 mt-4 max-w-4xl text-balance text-4xl font-bold lg:mb-7 lg:text-7xl">
                {hero.title}
              </h1>
            )}

            <p
              className="m mx-auto max-w-4xl text-muted-foreground lg:text-xl"
              dangerouslySetInnerHTML={{ __html: hero.description || "" }}
            />
            
            <div className="mx-auto mt-8 max-w-4xl">
              <DownloadTabs />
            </div>
            
            {hero.tip && (
              <p className="mt-8 text-md text-muted-foreground">{hero.tip}</p>
            )}
            {hero.show_happy_users && <HappyUsers />}
          </div>
        </div>
      </section>
    </>
  );
}
