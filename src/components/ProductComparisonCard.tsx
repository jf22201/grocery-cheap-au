"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { set } from "react-hook-form";

type Product = {
  price: number;
  product_name: string;
  product_id: number;
  vendor_slug: string;
  group: number;
  url: string;
};

export type ComparisonGroup = {
  groupId: number;
  name: string;
  price_alert: number;
  products: Product[];
};

type ProductComparisonsProps = {
  comparisons: ComparisonGroup[];
  isLoading: boolean;
  onDeleteGroup?: (groupId: number) => void;
  deletingGroupId: number | null;
};

function formatPrice(price: number) {
  return `$${(price / 100).toFixed(2)}`;
}

export default function ProductComparisonCard({
  comparisons,
  isLoading,
  onDeleteGroup,
  deletingGroupId,
}: ProductComparisonsProps) {
  const [confirmingGroupId, setConfirmingGroupId] = useState<number | null>(
    null,
  );
  const [prevDeletingGroupId, setPrevDeletingGroupId] = useState<number | null>(
    null,
  );
  //reset confirming group id if we have started deleting a new group since the last render
  if (prevDeletingGroupId !== deletingGroupId) {
    setConfirmingGroupId(null);
    setPrevDeletingGroupId(deletingGroupId);
  }

  const handleDeleteClick = (groupId: number) => {
    if (deletingGroupId === groupId) {
      //do nothing if there is something currently being deleted
      return;
    }

    if (confirmingGroupId === groupId) {
      //user has already clicked once, so we can proceed with deletion
      onDeleteGroup?.(groupId);
      return;
    }
    //set confirming group id to require confirmation on the next click
    setConfirmingGroupId(groupId);
  };

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
          <CardHeader className="flex flex-row justify-between">
            <div className="card-title-alert-container flex flex-col gap-y-1">
              <CardTitle>{comparison.name ?? "Unnamed Group"}</CardTitle>
              <CardDescription>
                Alert at {formatPrice(comparison.price_alert)}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-fit"
              onClick={() => handleDeleteClick(comparison.groupId)}
              disabled={deletingGroupId === comparison.groupId}
            >
              {deletingGroupId === comparison.groupId
                ? "Deleting..."
                : confirmingGroupId === comparison.groupId
                  ? "Click again to confirm"
                  : "Delete"}
            </Button>
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
