"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiPut } from "@/lib/api/api";

type EditableGroup = {
  groupId: number;
  name: string;
  price_alert: number;
};

type EditComparisonGroupProps = {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  group: EditableGroup | null;
  onSaveGroup: (updatedGroup: EditableGroup) => void;
};

export default function EditComparisonGroup({
  open,
  onOpenChange,
  group,
  onSaveGroup,
}: EditComparisonGroupProps) {
  const [name, setName] = useState("");
  const [priceAlertDollars, setPriceAlertDollars] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (group) {
      setName(group.name ?? "");
      setPriceAlertDollars(group.price_alert / 100);
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!group) {
      return;
    }
    const reqBody = {
      group_id: group.groupId,
      name: name.trim(),
      price_alert: priceAlertDollars ? Math.round(priceAlertDollars * 100) : 0,
    };
    setLoading(true);
    try {
      await apiPut(`comparisons`, reqBody);
      const normalisedPriceAlert = priceAlertDollars
        ? Math.round(priceAlertDollars * 100)
        : 0;
      onSaveGroup({
        groupId: group.groupId,
        name: name.trim(),
        price_alert: normalisedPriceAlert,
      });
      onOpenChange(false);
      toast.success("Comparison group updated successfully!", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error editing comparison group:", error);
      toast.error(
        "An error occurred while saving changes. Please try again later.",
        {
          position: "top-center",
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        //this is to prevent closing dialog when loading
        loading ? null : onOpenChange(val);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Comparison Group</DialogTitle>
        </DialogHeader>

        <CardContent className="space-y-4 px-0 pb-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-comparison-name">Comparison Name</Label>
              <Input
                id="edit-comparison-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price-alert">Price Alert (Optional)</Label>
              <Input
                id="edit-price-alert"
                type="number"
                min="0"
                step="0.01"
                value={priceAlertDollars ?? ""}
                placeholder="Leave at 0 to disable"
                onChange={(e) => setPriceAlertDollars(Number(e.target.value))}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="outline"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
