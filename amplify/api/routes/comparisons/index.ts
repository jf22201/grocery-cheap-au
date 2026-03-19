import { Hono } from "hono";
import { LambdaEvent } from "hono/aws-lambda";
// import { db } from "../../../db";
import { db, dbSchema } from "amplify/db";
import {
  usersTable,
  comparisonGroupsTable,
  comparisonProductsTable,
  productsTable,
  pricesTable,
  VENDOR_IDS,
  vendorsTable,
} from "amplify/db/schema";
import { sql, eq } from "drizzle-orm";
import { getCognitoId, getUserId } from "amplify/api/lib/auth";
import { scrapeHtml } from "amplify/api/lib/product";
import { getParser } from "collector/parsers";
import {
  extractProductIdFromUrl,
  validateAndNormaliseUrl,
} from "src/lib/validators/url";
type Bindings = {
  event: LambdaEvent;
}; //Adding AWS lambda specific bindings
type ComparisonProduct = {
  price: number;
  product_name: string;
  product_id: number;
  group: number;
  vendor_slug: string;
  price_alert: number;
  url: string;
  name: string;
};
export const comparisons = new Hono<{ Bindings: Bindings }>();

comparisons.get("/", async (c) => {
  const userId = await getUserId(c);
  const result = await db.execute(sql`
  SELECT latest.price, products.product_name, products.id AS product_id, comparison_products.group, vendors.vendor_slug, comparison_groups.price_alert, products.url,comparison_groups.name
  FROM ${dbSchema}.comparison_groups 
  JOIN ${dbSchema}.comparison_products ON ${dbSchema}.comparison_groups.id = ${dbSchema}.comparison_products.group
  JOIN ${dbSchema}.products ON ${dbSchema}.comparison_products.product_id = ${dbSchema}.products.id
  JOIN ${dbSchema}.vendors ON ${dbSchema}.products.vendor_id = ${dbSchema}.vendors.id
  JOIN (
    SELECT DISTINCT ON (product_id) * 
    FROM ${dbSchema}.prices 
    ORDER BY product_id, date_recorded DESC
  ) latest ON latest.product_id = ${dbSchema}.products.id
  WHERE ${dbSchema}.comparison_groups.user_id = ${userId}
`);
  const comparisonProducts = result.rows as ComparisonProduct[];
  const groupInfo = {} as Record<number, { name: string; price_alert: number }>;
  //now group together all products with the same group
  const grouped = comparisonProducts.reduce(
    (acc, product) => {
      //store record of the comparison group name for this product group id
      groupInfo[product.group] = {
        name: product.name,
        price_alert: product.price_alert,
      };
      const key = product.group;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(product);
      return acc;
    },
    {} as Record<number, ComparisonProduct[]>,
  );
  const groupedArray = Object.entries(grouped).map(([groupId, products]) => ({
    groupId: parseInt(groupId), //need to parse this as int as object keys are always strings
    products,
    name: groupInfo[parseInt(groupId)].name,
    price_alert: groupInfo[parseInt(groupId)].price_alert,
  }));

  return c.json(groupedArray);
});

comparisons.post("/", async (c) => {
  //function to check if product already exists and input new values if not
  try {
    const userId = await getUserId(c);
    const reqBody = await c.req.json();
    //TODO: currently assumes that both url are valid price pages - need validation workflow
    const {
      price_alert,
      products,
      name,
    }: {
      price_alert: number;
      products: { vendor_slug: string; url: string }[];
      name: string;
    } = reqBody;
    //validate product urls
    for (const product of products) {
      const normalisedUrl = validateAndNormaliseUrl(
        product.url,
        product.vendor_slug,
      );
      if (!normalisedUrl) {
        throw new Error("Invalid product URL in request body");
      }
      product.url = normalisedUrl;
    }
    //TODO: insert priceAlert validation here
    //need to treat creation of comparisonGroup + comparisonProducts as 1 atomic unit
    await db.transaction(async (tx) => {
      //create group
      const [newGroup] = await tx
        .insert(comparisonGroupsTable)
        .values({
          user_id: userId,
          price_alert,
          name,
        })
        .returning();
      const groupId = newGroup?.id;
      for (const product of products) {
        const { vendor_slug, url } = product;
        //check if this url already exists on the productsTable
        const productQuery = await tx
          .select({ id: productsTable.id })
          .from(productsTable)
          .where(eq(productsTable.url, url));
        let productId;
        if (productQuery.length === 0) {
          //Product doesn't exist yet - need to create new product and price entry for this url
          const pageHtml = await scrapeHtml(url);
          const parser = getParser(vendor_slug);
          const { name, price } = parser(pageHtml);
          const vendorProductId = extractProductIdFromUrl(url, vendor_slug);
          //insert new product record
          const [{ id }] = await tx
            .insert(productsTable)
            .values({
              product_name: name,
              vendor_id: VENDOR_IDS[vendor_slug],
              url,
              vendor_product_id: vendorProductId,
            })
            .returning();
          productId = id;
          //insert new price record and comparisonProduct entry
          Promise.all([
            tx.insert(pricesTable).values({
              product_id: productId,
              date_recorded: new Date().toISOString().split("T")[0], //record the current date (YYYY-MM-DD)
              price: price,
            }),
            tx
              .insert(comparisonProductsTable)
              .values({ group: groupId, product_id: productId }),
          ]);
        } else {
          //product does exist already - only need to create comparisonProduct entry
          productId = productQuery[0].id;
          await tx.insert(comparisonProductsTable).values({
            group: groupId,
            product_id: productId,
          });
        }
      }
    });
  } catch (err) {
    throw err;
    return c.json({ error: (err as Error).message }, 500);
  }
  return c.json({ message: "ok" }, 200);
});

comparisons.delete("/", async (c) => {
  const cognitoId = getCognitoId(c);
  const reqBody = await c.req.json();
  const { group_id } = reqBody;
  const groupToDelete = await db
    .select({ group_id: comparisonGroupsTable.id })
    .from(comparisonGroupsTable)
    .where(eq(comparisonGroupsTable.id, group_id))
    .innerJoin(usersTable, eq(usersTable.cognito_user_id, cognitoId));
  if (groupToDelete.length === 0) {
    //if the query returns nothing then either invalid group id or doesn't exist for this user.
    return c.json(
      { error: "Comparison not found or doesn't belong to user." },
      404,
    );
  }
  //
  await db
    .delete(comparisonGroupsTable)
    .where(eq(comparisonGroupsTable.id, group_id));
  return c.json({ message: "ok" }, 200);
});
//TODO: Figure out how to implement this once FE is done.
// comparisons.put("/", async (c) => {
//   const cognitoId = getCognitoId(c);
//   const reqBody = await c.req.json();
//   const { group_id, price_alert, insertionProducts } = reqBody;
//   //this makes the assumption that all existing comparisonGroups have at least 1 corresponding comparisonProduct
//   const dbGroupAndProducts = await db
//     .select({
//       groupId: comparisonGroupsTable.id,
//       comparisonProductId: comparisonProductsTable.id,
//       productId: comparisonProductsTable.product_id,
//       productUrl: productsTable.url,
//       vendorSlug: vendorsTable.vendor_slug,
//     })
//     .from(comparisonGroupsTable)
//     .where(eq(comparisonGroupsTable.id, group_id))
//     .innerJoin(usersTable, eq(usersTable.cognito_user_id, cognitoId))
//     .innerJoin(
//       comparisonProductsTable,
//       eq(comparisonProductsTable.group, group_id),
//     )
//     .innerJoin(
//       productsTable,
//       eq(productsTable.id, comparisonProductsTable.product_id),
//     )
//     .innerJoin(vendorsTable, eq(productsTable.vendor_id, vendorsTable.id));
//   if (dbGroupAndProducts.length === 0) {
//     //if the query returns nothing then either invalid group id or doesn't exist for this user.
//     return c.json(
//       { error: "Comparison not found or doesn't belong to user." },
//       404,
//     );
//   }

//   // do update atomically
//   await db.transaction(async (tx) => {
//     await tx
//       .update(comparisonGroupsTable)
//       .set({ price_alert })
//       .where(eq(comparisonGroupsTable.id, group_id));
//     //determine which products need to be updated
//     //
//     let productUpdateMap:Record<string,{comparisonProductId?:Number,newProductId?:Number,newUrl?:string,needsUpdate:boolean,needsScrape:boolean}> = {}
//     for (const insertionProduct of insertionProducts) {
//       const { insertionVendorSlug, insertionUrl } = insertionProduct
//       let currDbProduct = dbGroupAndProducts.find((item)=>(item.vendorSlug === insertionVendorSlug));
//       if (currDbProduct?.productUrl === insertionUrl){
//         productUpdateMap[insertionVendorSlug] = {needsScrape:false,needsUpdate:false}
//       }
//       else if(currDbProduct.)

//     }
//   });
// }
