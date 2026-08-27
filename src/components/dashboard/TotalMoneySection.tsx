"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, toDecimal, toFixed2, Decimal } from "@/lib/finance/decimal";
import { Wallet, ArrowLeftRight, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExchangeRateItem {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
}

interface TotalMoneySectionProps {
  totalMoneyByCurrency: { [currency: string]: string };
  exchangeRates: ExchangeRateItem[];
}

export function TotalMoneySection({
  totalMoneyByCurrency,
  exchangeRates,
}: TotalMoneySectionProps) {
  const currencyKeys = Object.keys(totalMoneyByCurrency);

  // Collect all known currencies across accounts and exchange rates
  const allCurrencies = useMemo(() => {
    const set = new Set<string>(currencyKeys);
    for (const r of exchangeRates) {
      if (r.fromCurrency) set.add(r.fromCurrency.toUpperCase());
      if (r.toCurrency) set.add(r.toCurrency.toUpperCase());
    }
    // Common default priorities
    const defaults = ["CNY", "MAD", "USD", "EUR"];
    for (const d of defaults) {
      set.add(d);
    }
    return Array.from(set);
  }, [currencyKeys, exchangeRates]);

  // Default target currency from localStorage or first available
  const [targetCurrency, setTargetCurrency] = useState<string>("MAD");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("myqian_aggregate_currency");
      if (saved && allCurrencies.includes(saved)) {
        setTargetCurrency(saved);
      } else if (currencyKeys.length > 0) {
        // Prefer MAD or CNY or first available
        if (currencyKeys.includes("MAD")) setTargetCurrency("MAD");
        else if (currencyKeys.includes("CNY")) setTargetCurrency("CNY");
        else setTargetCurrency(currencyKeys[0]);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [allCurrencies, currencyKeys]);

  const handleCurrencyChange = (newCurr: string) => {
    setTargetCurrency(newCurr);
    try {
      localStorage.setItem("myqian_aggregate_currency", newCurr);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Compute conversion into the selected target currency
  const aggregateResult = useMemo(() => {
    if (currencyKeys.length === 0) return null;

    let aggregateTotal = new Decimal(0);
    const convertedItems: string[] = [];
    const missingRates: string[] = [];

    for (const [sourceCurr, amountStr] of Object.entries(totalMoneyByCurrency)) {
      const sourceAmount = toDecimal(amountStr);
      if (sourceAmount.eq(0)) continue;

      if (sourceCurr.toUpperCase() === targetCurrency.toUpperCase()) {
        aggregateTotal = aggregateTotal.add(sourceAmount);
        convertedItems.push(formatCurrency(amountStr, sourceCurr));
      } else {
        // Direct rate: sourceCurr -> targetCurrency
        const directRate = exchangeRates.find(
          (r) =>
            r.fromCurrency.toUpperCase() === sourceCurr.toUpperCase() &&
            r.toCurrency.toUpperCase() === targetCurrency.toUpperCase()
        );

        if (directRate && toDecimal(directRate.rate).gt(0)) {
          const rateDec = toDecimal(directRate.rate);
          const inTarget = sourceAmount.mul(rateDec);
          aggregateTotal = aggregateTotal.add(inTarget);
          convertedItems.push(
            `${formatCurrency(amountStr, sourceCurr)} (@ ${directRate.rate})`
          );
          continue;
        }

        // Reverse rate: targetCurrency -> sourceCurr (inverts 1 / rate)
        const reverseRate = exchangeRates.find(
          (r) =>
            r.fromCurrency.toUpperCase() === targetCurrency.toUpperCase() &&
            r.toCurrency.toUpperCase() === sourceCurr.toUpperCase()
        );

        if (reverseRate && toDecimal(reverseRate.rate).gt(0)) {
          const revDec = toDecimal(reverseRate.rate);
          const inTarget = sourceAmount.div(revDec);
          aggregateTotal = aggregateTotal.add(inTarget);
          convertedItems.push(
            `${formatCurrency(amountStr, sourceCurr)} (1 ${targetCurrency} = ${reverseRate.rate} ${sourceCurr})`
          );
          continue;
        }

        missingRates.push(`${sourceCurr} → ${targetCurrency}`);
      }
    }

    return {
      amount: toFixed2(aggregateTotal),
      convertedItems,
      missingRates,
      hasMultipleCurrencies: currencyKeys.length > 1,
    };
  }, [totalMoneyByCurrency, exchangeRates, targetCurrency, currencyKeys]);

  if (currencyKeys.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Total Money
        </h2>
        <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/30">
          No accounts configured. Total money will appear once accounts are created.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Total Money
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Individual Native Currency Total Cards */}
        {currencyKeys.map((curr) => (
          <MetricCard
            key={curr}
            label={`${curr} Total`}
            value={formatCurrency(totalMoneyByCurrency[curr], curr)}
            subValue={`Sum across all ${curr} accounts`}
            icon={<Wallet className="w-4 h-4" />}
          />
        ))}

        {/* Dynamic Selectable Estimated Aggregate Card */}
        {aggregateResult && (
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
            {/* Top row: Label + Currency Selector */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-400" />
                <span>Estimated Aggregate</span>
              </span>

              {/* Currency Dropdown Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={targetCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="appearance-none text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 py-1 pl-2.5 pr-6 rounded-lg border border-zinc-200/80 dark:border-zinc-700 cursor-pointer focus:outline-hidden transition-colors"
                  aria-label="Select aggregate currency"
                >
                  {allCurrencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-400 pointer-events-none absolute right-1.5" />
              </div>
            </div>

            {/* Middle: Converted Total */}
            <div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatCurrency(aggregateResult.amount, targetCurrency)}
              </div>

              {/* SubValue Note & Rate Status */}
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                {aggregateResult.missingRates.length > 0 ? (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span>Rate for {aggregateResult.missingRates.join(", ")} not set.</span>
                    <Link href="/settings" className="underline hover:text-amber-700">
                      Configure
                    </Link>
                  </div>
                ) : aggregateResult.convertedItems.length > 1 ? (
                  <span>Converted sum in {targetCurrency}</span>
                ) : (
                  <span>Aggregated in {targetCurrency}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
