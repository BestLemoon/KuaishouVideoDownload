"use client";

import { Check, Loader } from "lucide-react";
import { PricingItem, Pricing as PricingType } from "@/types/blocks/pricing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Label } from "@/components/ui/label";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";

export default function Pricing({ pricing }: { pricing: PricingType }) {
  if (pricing.disabled) {
    return null;
  }

  const { user, setShowSignModal } = useAppContext();

  const [group, setGroup] = useState(pricing.groups?.[0]?.name);
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const handleCheckout = async (item: PricingItem, cn_pay: boolean = false) => {
    try {
      if (!user) {
        setShowSignModal(true);
        return;
      }

      const params = {
        product_id: item.product_id,
        product_name: item.product_name,
        credits: item.credits,
        interval: item.interval,
        amount: cn_pay ? item.cn_amount : item.amount,
        currency: cn_pay ? "cny" : item.currency,
        valid_months: item.valid_months,
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);

        setShowSignModal(true);
        return;
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        toast.error(message);
        return;
      }

      const { public_key, session_id } = data;

      const stripe = await loadStripe(public_key);
      if (!stripe) {
        toast.error("checkout failed");
        return;
      }

      const result = await stripe.redirectToCheckout({
        sessionId: session_id,
      });

      if (result.error) {
        toast.error(result.error.message);
      }
    } catch (e) {
      console.log("checkout failed: ", e);

      toast.error("checkout failed");
    } finally {
      setIsLoading(false);
      setProductId(null);
    }
  };

  useEffect(() => {
    if (pricing.groups && pricing.groups.length > 0) {
      // 默认显示年付tab（如果存在），否则显示第一个
      const yearGroup = pricing.groups.find(g => g.name === 'year');
      setGroup(yearGroup ? yearGroup.name : pricing.groups[0].name);
    }
    setIsLoading(false);
  }, [pricing.groups]);



  return (
    <section id={pricing.name} className="py-16">
      <div className="container">
        <div className="mx-auto mb-12 text-center">
          <h2 className="mb-4 text-4xl font-semibold lg:text-5xl">
            {pricing.title}
          </h2>
          <p className="text-muted-foreground lg:text-lg">
            {pricing.description}
          </p>
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          {pricing.groups && pricing.groups.length > 0 && (
            <div className="flex h-14 mb-12 items-center rounded-xl bg-gradient-to-r from-muted/80 to-muted border p-1.5 text-lg shadow-sm">
              <RadioGroup
                value={group}
                className={`h-full grid-cols-${pricing.groups.length} gap-1`}
                onValueChange={(value) => {
                  setGroup(value);
                }}
              >
                {pricing.groups.map((item, i) => {
                  const isYearly = item.name === 'year';
                  return (
                    <div
                      key={i}
                      className='h-full rounded-lg transition-all duration-200 has-[button[data-state="checked"]]:bg-white has-[button[data-state="checked"]]:shadow-md'
                    >
                      <RadioGroupItem
                        value={item.name || ""}
                        id={item.name}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={item.name}
                        className="flex h-full cursor-pointer items-center justify-center px-8 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary hover:text-primary/80 transition-colors relative"
                      >
                        {item.label}
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="border-green-500 bg-green-500 px-2 py-0.5 ml-2 text-xs text-white font-medium"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
          <div
            className={`w-full mt-0 grid gap-6 md:grid-cols-${
              pricing.items?.filter(
                (item) => !item.group || item.group === group
              )?.length || 3
            }`}
          >
            {pricing.items?.map((item, index) => {
              // 如果没有groups，显示所有items
              // 如果有groups但item没有group，总是显示（比如免费版）
              // 如果有groups且item有group，只显示匹配的group
              if (pricing.groups && pricing.groups.length > 0 && item.group && item.group !== group) {
                return null;
              }

              return (
                <div
                  key={index}
                  className={`rounded-lg p-6 relative ${
                    item.is_featured
                      ? "border-primary border-2 bg-card text-card-foreground shadow-xl"
                      : "border-muted border"
                  }`}
                >
                  {/* 限时优惠角标 */}
                  {item.is_featured && item.label?.includes("限时") && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold transform rotate-12 shadow-lg">
                      限时优惠
                    </div>
                  )}
                  {item.is_featured && item.label?.includes("FREE") && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold transform rotate-12 shadow-lg">
                      LIMITED
                    </div>
                  )}
                  
                  <div className="flex h-full flex-col justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        {item.title && (
                          <h3 className="text-xl font-semibold">
                            {item.title}
                          </h3>
                        )}
                        <div className="flex-1"></div>
                        {item.label && (
                          <Badge
                            variant="outline"
                            className="border-primary bg-primary px-1.5 text-primary-foreground"
                          >
                            {item.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-end gap-2 mb-4">
                        {item.original_price && (
                          <span className="text-xl text-muted-foreground font-semibold line-through">
                            {item.original_price}
                          </span>
                        )}
                        {item.price && (
                          <span className="text-5xl font-semibold">
                            {item.price}
                          </span>
                        )}
                        {item.unit && (
                          <span className="block font-semibold">
                            {item.unit}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.features_title && (
                        <p className="mb-3 mt-6 font-semibold">
                          {item.features_title}
                        </p>
                      )}
                      {item.features && (
                        <ul className="flex flex-col gap-3">
                          {item.features.map((feature, fi) => {
                            return (
                              <li className="flex gap-2" key={`feature-${fi}`}>
                                <Check className="mt-1 size-4 shrink-0" />
                                {feature}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {item.cn_amount && item.cn_amount > 0 ? (
                        <div className="flex items-center gap-x-2 mt-2">
                          <span className="text-sm">人民币支付 👉</span>
                          <div
                            className="inline-block p-2 hover:cursor-pointer hover:bg-base-200 rounded-md"
                            onClick={() => {
                              if (isLoading) {
                                return;
                              }
                              handleCheckout(item, true);
                            }}
                          >
                            <img
                              src="/imgs/cnpay.png"
                              alt="cnpay"
                              className="w-20 h-10 rounded-lg"
                            />
                          </div>
                        </div>
                      ) : null}
                      {item.button && (
                        <Button
                          className="w-full flex items-center justify-center gap-2 font-semibold"
                          disabled={isLoading}
                          onClick={() => {
                            if (isLoading) {
                              return;
                            }
                            handleCheckout(item);
                          }}
                        >
                          {(!isLoading ||
                            (isLoading && productId !== item.product_id)) && (
                            <p>{item.button.title}</p>
                          )}

                          {isLoading && productId === item.product_id && (
                            <p>{item.button.title}</p>
                          )}
                          {isLoading && productId === item.product_id && (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {item.button.icon && (
                            <Icon name={item.button.icon} className="size-4" />
                          )}
                        </Button>
                      )}
                      {item.tip && (
                        <p className="text-muted-foreground text-sm mt-2">
                          {item.tip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}