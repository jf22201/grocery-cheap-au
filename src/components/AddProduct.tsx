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
import { apiPost, apiPut } from "@/lib/api";
import {
  validateAndNormaliseUrl,
  colesProductPathRegex,
  woolworthsProductPathRegex,
} from "@/lib/validators/url";
import { toast } from "sonner";
export default function AddProduct({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const [woolworthsUrl, setWoolworthsUrl] = useState("");
  const [colesUrl, setColesUrl] = useState("");
  const [priceAlert, setPriceAlert] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  async function addProduct(e: React.SubmitEvent) {
    e.preventDefault();
    setIsLoading(true);
    //Url checks
    const parsedColesUrl = validateAndNormaliseUrl(colesUrl, "coles");
    if (!parsedColesUrl) {
      toast.error("The inputted url for Coles appears to be invalid", {
        position: "top-center",
      });
      return;
    }
    const parsedWoolworthsUrl = validateAndNormaliseUrl(
      woolworthsUrl,
      "woolworths",
    );
    if (!parsedWoolworthsUrl) {
      toast.error("The inputted url for Woolworths appears to be invalid");
      return;
    }
    let processedPriceAlert = 0;
    if (priceAlert) {
      processedPriceAlert = priceAlert * 100;
    }
    const reqBody = {
      price_alert: processedPriceAlert,
      name: productName,
      products: [
        {
          vendor_slug: "coles",
          url: parsedColesUrl,
        },
        {
          vendor_slug: "woolworths",
          url: parsedWoolworthsUrl,
        },
      ],
    };
    console.log(reqBody);
    try {
      const res = await apiPost("comparisons", reqBody);
    } catch (error) {
      toast.error(
        "An error occurred while adding the comparison. Please try again.",
        { position: "top-center" },
      );
      setIsLoading(false);
      return;
    }
    toast.success("Product added successfully!", { position: "top-center" });
    setIsLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      //this is to prevent closing dialog when loading
      onOpenChange={(val) => {
        isLoading ? null : onOpenChange(val);
      }}
    >
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add Comparison</DialogTitle>
        </DialogHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addProduct} action="" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Comparison Name</Label>
              <Input
                id="product-name"
                type="text"
                value={productName}
                placeholder="Name"
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url1">Coles URL</Label>
              <Input
                id="coles-url-input"
                type="url"
                value={colesUrl}
                placeholder="www.coles.com.au/..."
                onChange={(e) => setColesUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url2">Woolworths URL</Label>
              <Input
                id="woolworths-url-input"
                type="url"
                placeholder="www.woolworths.com.au/..."
                value={woolworthsUrl}
                onChange={(e) => setWoolworthsUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceAlert">Price Alert (Optional)</Label>
              <Input
                id="price-alert-input"
                type="number"
                min="0"
                step="0.01"
                value={priceAlert ?? ""}
                placeholder="Leave at 0 to disable"
                onChange={(e) => setPriceAlert(Number(e.target.value))}
              />
            </div>
            {
              <Button
                type="submit"
                className="w-full hover:bg-primary/50"
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? "Adding Comparison..." : "Add Comparison"}
              </Button>
            }
          </form>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
