import React from "react";
import { getCategoriesTree } from "@/lib/finance/service";
import { CategoriesClient } from "@/components/categories/CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategoriesTree(true);
  return <CategoriesClient initialCategories={categories} />;
}
