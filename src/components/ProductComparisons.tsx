"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Product = {
  price: number;
  product_name: string;
  product_id: number;
  vendor_slug: string;
  group: number;
  url: string;
};

type ComparisonGroup = {
  groupId: number;
  name: string;
  price_alert: number;
  products: Product[];
};

type ProductComparisonsProps = {
  comparisons: ComparisonGroup[];
  isLoading: boolean;
};

function formatPrice(price: number) {
  return `$${(price / 100).toFixed(2)}`;
}

export default function ProductComparisons({
  comparisons,
  isLoading,
}: ProductComparisonsProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading comparisons...</p>
    );
  }

  if (!comparisons.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No comparison groups yet. Add products to create your first group.
      </p>
    );
  }

  return (
    <div className="flex flex-col w-1/2 gap-4 mx-auto">
      {comparisons.map((comparison) => (
        <Card key={comparison.groupId}>
          <CardHeader>
            <CardTitle>{comparison.name}</CardTitle>
            <CardDescription>
              Alert at {formatPrice(comparison.price_alert)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.products.map((product) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {product.product_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.vendor_slug}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {formatPrice(product.price)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
