import Link from "next/link";
import { createProduct } from "@/app/actions/products";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/products"
        className="text-sm text-warm-600 hover:text-pink-700"
      >
        ← Products
      </Link>
      <h1 className="mt-3 text-3xl">New product</h1>
      <p className="mt-2 text-warm-700">
        Describe the thing you need. You&rsquo;ll add photos on the next step,
        and nothing is visible to donors until you publish it.
      </p>
      <div className="mt-8 rounded-xl border border-warm-200 bg-white p-6 sm:p-8">
        <ProductForm action={createProduct} submitLabel="Create product" />
      </div>
    </div>
  );
}
