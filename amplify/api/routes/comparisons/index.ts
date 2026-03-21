import { Hono } from "hono";
import { LambdaEvent } from "hono/aws-lambda";
// import { db } from "../../../db";
import { Logger } from "@aws-lambda-powertools/logger";
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
import { getRequestContext, logEndpointError } from "amplify/api/lib/logging";
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

type RenderableComparisonProduct = {
  price: number;
  product_name: string;
  product_id: number;
  vendor_slug: string;
  group: number;
  url: string;
};

type RenderableComparisonGroup = {
  groupId: number;
  name: string;
  price_alert: number;
  products: RenderableComparisonProduct[];
};

function groupComparisonProducts(comparisonProducts: ComparisonProduct[]) {
  const groupInfo = {} as Record<number, { name: string; price_alert: number }>;

  const grouped = comparisonProducts.reduce(
    (acc, product) => {
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

  return Object.entries(grouped).map(([groupId, products]) => ({
    groupId: parseInt(groupId),
    products,
    name: groupInfo[parseInt(groupId)].name,
    price_alert: groupInfo[parseInt(groupId)].price_alert,
  }));
}

const logger = new Logger({ serviceName: "comparisons-api" });

export const comparisons = new Hono<{ Bindings: Bindings }>();

comparisons.get("/", async (c) => {
  const requestContext = getRequestContext(c);
  logger.appendKeys({ requestId: requestContext.requestId });
  logger.info("GET /comparisons started", requestContext);
  try {
    const userId = await getUserId(c);
    logger.debug("Resolved user for GET /comparisons", { userId });
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
    logger.info("Fetched comparison products", {
      userId,
      rowCount: comparisonProducts.length,
    });
    const groupedArray = groupComparisonProducts(comparisonProducts);

    logger.info("GET /comparisons completed", {
      userId,
      groupCount: groupedArray.length,
    });

    return c.json(groupedArray);
  } catch (err) {
    logEndpointError("GET /comparisons failed", err, requestContext.requestId);
    return c.json({ error: "Internal server error" }, 500);
  }
});

comparisons.post("/", async (c) => {
  const requestContext = getRequestContext(c);
  logger.appendKeys({ requestId: requestContext.requestId });
  //function to check if product already exists and input new values if not
  try {
    logger.info("POST /comparisons started", requestContext);
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

    logger.debug("Parsed POST /comparisons payload", {
      userId,
      name,
      productCount: products.length,
      price_alert,
    });

    //validate product urls
    for (const product of products) {
      const normalisedUrl = validateAndNormaliseUrl(
        product.url,
        product.vendor_slug,
      );
      if (!normalisedUrl) {
        logger.warn("Invalid product URL in POST /comparisons payload", {
          userId,
          vendor_slug: product.vendor_slug,
          url: product.url,
        });
        throw new Error("Invalid product URL in request body");
      }
      product.url = normalisedUrl;
    }
    //TODO: insert priceAlert validation here
    //need to treat creation of comparisonGroup + comparisonProducts as 1 atomic unit
    let createdGroup: RenderableComparisonGroup | null = null;
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
      if (!groupId) {
        throw new Error("Failed to create comparison group");
      }
      createdGroup = {
        groupId,
        name,
        price_alert,
        products: [],
      };
      logger.info("Created comparison group", { userId, groupId, name });
      for (const product of products) {
        const { vendor_slug, url } = product;
        //check if this url already exists on the productsTable
        const productQuery = await tx
          .select({ id: productsTable.id })
          .from(productsTable)
          .where(eq(productsTable.url, url));
        let productId;
        if (productQuery.length === 0) {
          logger.debug("Product not found in DB, scraping", {
            groupId,
            vendor_slug,
            url,
          });
          //Product doesn't exist yet on products table - need to create new product and price entry for this url
          //TODO refactor this to use Promise.all for parllelisation if it becomes a bottleneck (AWS api gateway timeout is 30s)
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
          logger.info("Created product for comparison group", {
            groupId,
            productId,
            vendor_slug,
            url,
          });
          //insert new price record and comparisonProduct entry
          await Promise.all([
            tx.insert(pricesTable).values({
              product_id: productId,
              date_recorded: new Date().toISOString().split("T")[0], //record the current date (YYYY-MM-DD)
              price: price,
            }),
            tx
              .insert(comparisonProductsTable)
              .values({ group: groupId, product_id: productId }),
          ]);
          createdGroup.products.push({
            price,
            product_name: name,
            product_id: productId,
            vendor_slug,
            group: groupId,
            url,
          });
          logger.debug("Inserted initial price and group mapping", {
            groupId,
            productId,
          });
        } else {
          //product does exist in products table already - only need to create comparisonProduct entry
          productId = productQuery[0].id;
          await tx.insert(comparisonProductsTable).values({
            group: groupId,
            product_id: productId,
          });

          const existingProductResult = await tx.execute(sql`
            SELECT
              ${dbSchema}.products.id AS product_id,
              ${dbSchema}.products.product_name,
              ${dbSchema}.vendors.vendor_slug,
              ${dbSchema}.products.url,
              ${dbSchema}.prices.price
            FROM ${dbSchema}.products
            JOIN ${dbSchema}.vendors ON ${dbSchema}.products.vendor_id = ${dbSchema}.vendors.id
            JOIN ${dbSchema}.prices ON ${dbSchema}.prices.product_id = ${dbSchema}.products.id
            WHERE ${dbSchema}.products.id = ${productId}
            ORDER BY ${dbSchema}.prices.date_recorded DESC
            LIMIT 1
          `);

          const existingProduct = existingProductResult.rows[0] as
            | {
                product_id: number;
                product_name: string;
                vendor_slug: string;
                url: string;
                price: number;
              }
            | undefined;

          if (!existingProduct) {
            throw new Error("Failed to load existing product details");
          }

          createdGroup.products.push({
            price: existingProduct.price,
            product_name: existingProduct.product_name,
            product_id: existingProduct.product_id,
            vendor_slug: existingProduct.vendor_slug,
            group: groupId,
            url: existingProduct.url,
          });
          logger.debug("Linked existing product to comparison group", {
            groupId,
            productId,
            vendor_slug,
          });
        }
      }
    });

    if (!createdGroup) {
      throw new Error("Failed to create comparison group");
    }
    const createdGroupResponse = createdGroup as RenderableComparisonGroup;

    logger.info("POST /comparisons completed", {
      requestId: requestContext.requestId,
      createdGroupId: createdGroupResponse.groupId,
    });

    return c.json(createdGroupResponse, 201);
  } catch (err) {
    logEndpointError("POST /comparisons failed", err, requestContext.requestId);
    return c.json({ error: (err as Error).message }, 500);
  }
});

comparisons.delete("/", async (c) => {
  const requestContext = getRequestContext(c);
  logger.appendKeys({ requestId: requestContext.requestId });
  logger.info("DELETE /comparisons started", requestContext);
  try {
    const cognitoId = getCognitoId(c);
    const reqBody = await c.req.json();
    const { group_id } = reqBody;
    logger.debug("DELETE /comparisons payload", { cognitoId, group_id });
    const groupToDelete = await db
      .select({ group_id: comparisonGroupsTable.id })
      .from(comparisonGroupsTable)
      .where(eq(comparisonGroupsTable.id, group_id))
      .innerJoin(usersTable, eq(usersTable.cognito_user_id, cognitoId));
    if (groupToDelete.length === 0) {
      //if the query returns nothing then either invalid group id or doesn't exist for this user.
      logger.warn("Comparison group not found for delete", {
        cognitoId,
        group_id,
      });
      return c.json(
        { error: "Comparison not found or doesn't belong to user." },
        404,
      );
    }
    //
    await db
      .delete(comparisonGroupsTable)
      .where(eq(comparisonGroupsTable.id, group_id));
    logger.info("DELETE /comparisons completed", { cognitoId, group_id });
    return c.json({ message: "ok" }, 200);
  } catch (err) {
    logEndpointError(
      "DELETE /comparisons failed",
      err,
      requestContext.requestId,
    );
    return c.json({ error: "Internal server error" }, 500);
  }
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
