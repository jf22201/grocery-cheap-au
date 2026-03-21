"use client";

import AddProduct from "@/components/AddProduct";
import useAuth from "../../hooks/useAuth";
import { signOut } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet } from "@/lib/api";
import ProductComparisons from "@/components/ProductComparisonCard";
import { toast } from "sonner";
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
export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [comparisons, setComparisons] = useState<ComparisonGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);

  const logout = async () => {
    await signOut();
    router.push("/login");
  };
  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await apiGet("/comparisons");
      setComparisons(
        Array.isArray(response) ? (response as ComparisonGroup[]) : [],
      );
    } catch (error) {
      toast.error("Error fetching comparisons. Please try again later.", {
        position: "top-center",
      });
      console.error("Error fetching comparisons:", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void loadData();
  }, []);

  const deleteComparisonGroup = async (groupId: number) => {
    try {
      setDeletingGroupId(groupId);
      await apiDelete("/comparisons", { group_id: groupId });
      toast.success("Comparison group deleted successfully", {
        position: "top-center",
      });
      setComparisons((prev) =>
        prev.filter((group) => group.groupId !== groupId),
      );
    } catch (error) {
      toast.error("Error deleting. Please try again later.", {
        position: "top-center",
      });
      console.error("Error deleting comparison group:", error);
    } finally {
      setDeletingGroupId(null);
    }
  };
  const addComparisonGroup = (newGroup: ComparisonGroup) => {
    setComparisons((prev) => [...prev, newGroup]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full bg-black px-6 py-3 flex justify-between items-center gap-3">
        <Button
          variant="secondary"
          className="bg-white text-black hover:bg-gray-200"
          size="icon"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>

        <Button
          variant="secondary"
          className="bg-white text-black hover:bg-gray-200"
          onClick={logout}
        >
          Sign Out
        </Button>
      </div>

      <div className="p-6">
        <h1 className="text-2xl font-semibold">Home</h1>
        <div className="mt-4">
          <ProductComparisons
            comparisons={comparisons}
            isLoading={isLoading}
            onDeleteGroup={deleteComparisonGroup}
            deletingGroupId={deletingGroupId}
          />
        </div>
      </div>
      <AddProduct
        open={showModal}
        onOpenChange={setShowModal}
        onAddGroup={addComparisonGroup}
      />
    </div>
  );
}
