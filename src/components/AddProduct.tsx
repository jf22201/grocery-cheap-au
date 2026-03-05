"use client";
import {
  ButtonHTMLAttributes,
  SetStateAction,
  useState,
  Dispatch,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AddProduct({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const [url1, setURL1] = useState("");
  const [url2, setURL2] = useState("");
  const [priceAlert, setpriceAlert] = useState("");
  const [productName, setproductName] = useState("");
  async function addProduct(e: React.SubmitEvent) {
    e.preventDefault();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addProduct} action="" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="text"
                type="text"
                value={productName}
                placeholder="Name"
                onChange={(e) => setproductName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url1">Coles URL</Label>
              <Input
                id="text"
                type="text"
                value={url1}
                placeholder="www.coles.com.au/..."
                onChange={(e) => setURL1(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url2">Woolworths URL</Label>
              <Input
                id="text"
                type="text"
                placeholder="www.woolworths.com.au/..."
                value={url2}
                onChange={(e) => setURL2(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceAlert">Price Alert</Label>
              <Input
                id="text"
                type="text"
                value={priceAlert}
                placeholder="$$$"
                onChange={(e) => setpriceAlert(e.target.value)}
              />
            </div>
            {
              <Button
                type="submit"
                className="w-full hover:bg-primary/50"
                variant="outline"
              >
                Add
              </Button>
            }
          </form>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
