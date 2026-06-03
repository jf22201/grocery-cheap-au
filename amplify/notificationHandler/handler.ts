import { EventBridgeEvent } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { sql, inArray } from "drizzle-orm";
import { comparisonGroupsTable } from "amplify/db/schema";
import { getDb } from "amplify/db";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "notification-handler" });
const ses = new SESClient({ region: "ap-southeast-2" });
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL!;

type AffectedGroupRow = {
  group_id: number;
  group_name: string | null;
  price_alert: number;
  alert_armed: boolean;
  user_id: number;
  email: string;
  product_id: number;
  product_name: string;
  vendor_name: string;
  price: number;
};

type GroupSummary = {
  group_id: number;
  group_name: string | null;
  price_alert: number;
  alert_armed: boolean;
  user_id: number;
  email: string;
  products: {
    product_id: number;
    product_name: string;
    vendor_name: string;
    price: number;
  }[];
};

export const handler = async (
  event: EventBridgeEvent<"ScrapeComplete", { changedProductIds: number[] }>,
) => {
  const db = await getDb();
  const { changedProductIds } = event.detail;
  logger.info("Notification handler invoked", { changedProductIds });

  if (changedProductIds.length === 0) {
    logger.info("No changed products, exiting early");
    return;
  }

  // Single query: get all groups containing any changed product (price_alert > 0 only),
  // with latest prices for ALL products in those groups (not just the changed ones).
  const result = await db.execute<AffectedGroupRow>(sql`
    SELECT
      cg.id            AS group_id,
      cg.name          AS group_name,
      cg.price_alert,
      cg.alert_armed,
      cg.user_id,
      u.email,
      p.id             AS product_id,
      p.product_name,
      v.vendor_name,
      lp.price
    FROM comparison_groups cg
    JOIN users u ON u.id = cg.user_id
    JOIN comparison_products cp ON cp.group = cg.id
    JOIN products p ON p.id = cp.product_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN latest_prices lp ON lp.product_id = p.id
    WHERE cg.price_alert > 0
      AND cg.id IN (
        SELECT DISTINCT cp2.group
        FROM comparison_products cp2
        WHERE cp2.product_id = ANY(ARRAY[${sql.raw(changedProductIds.join(","))}]::int[])
      )
  `);

  if (result.rows.length === 0) {
    logger.info("No affected groups with price alerts configured");
    return;
  }

  // Group flat rows by group_id
  const groupMap = new Map<number, GroupSummary>();
  for (const row of result.rows) {
    if (!groupMap.has(row.group_id)) {
      groupMap.set(row.group_id, {
        group_id: row.group_id,
        group_name: row.group_name,
        price_alert: row.price_alert,
        alert_armed: row.alert_armed,
        user_id: row.user_id,
        email: row.email,
        products: [],
      });
    }
    groupMap.get(row.group_id)!.products.push({
      product_id: row.product_id,
      product_name: row.product_name,
      price: row.price,
      vendor_name: row.vendor_name,
    });
  }

  const groupsToDisarm: number[] = [];
  const groupsToRearm: number[] = [];

  // Per-user map of triggered groups (for email aggregation)
  const userTriggeredGroups = new Map<
    string,
    {
      email: string;
      groups: {
        group: GroupSummary;
        triggeredProducts: GroupSummary["products"];
      }[];
    }
  >();
  for (const group of groupMap.values()) {
    const { price_alert, alert_armed, products, email } = group;
    const triggeredProducts = products.filter((p) => p.price < price_alert);
    const allAboveAlert = products.every((p) => p.price >= price_alert);
    if (alert_armed && triggeredProducts.length > 0) {
      groupsToDisarm.push(group.group_id);
      if (!userTriggeredGroups.has(email)) {
        userTriggeredGroups.set(email, { email, groups: [] });
      }
      userTriggeredGroups.get(email)!.groups.push({ group, triggeredProducts });
    } else if (!alert_armed && allAboveAlert) {
      groupsToRearm.push(group.group_id);
    }
  }

  // Apply DB updates
  await Promise.all([
    groupsToDisarm.length > 0
      ? db
          .update(comparisonGroupsTable)
          .set({ alert_armed: false })
          .where(inArray(comparisonGroupsTable.id, groupsToDisarm))
      : Promise.resolve(),
    groupsToRearm.length > 0
      ? db
          .update(comparisonGroupsTable)
          .set({ alert_armed: true })
          .where(inArray(comparisonGroupsTable.id, groupsToRearm))
      : Promise.resolve(),
  ]);

  // Send one email per user covering all their triggered groups
  await Promise.all(
    Array.from(userTriggeredGroups.values()).map(({ email, groups }) =>
      sendNotificationEmail(email, groups),
    ),
  );

  logger.info("Notification handler complete", {
    emailsSent: userTriggeredGroups.size,
    groupsDisarmed: groupsToDisarm.length,
    groupsRearmed: groupsToRearm.length,
  });
};

async function sendNotificationEmail(
  toEmail: string,
  triggeredGroups: {
    group: GroupSummary;
    triggeredProducts: GroupSummary["products"];
  }[],
): Promise<void> {
  const groupCount = triggeredGroups.length;
  const subject =
    groupCount === 1
      ? `Price alert: "${triggeredGroups[0].group.group_name ?? "Unnamed group"}" — products below ${formatCents(triggeredGroups[0].group.price_alert)}`
      : `Grocery price alert — ${groupCount} groups triggered`;

  const textLines: string[] = [
    "The following comparison groups have products below your alert price:",
    "",
  ];
  const htmlSections: string[] = [];

  for (const { group, triggeredProducts } of triggeredGroups) {
    const groupLabel = group.group_name ?? `Group #${group.group_id}`;
    const alertFormatted = formatCents(group.price_alert);
    //plain text version
    textLines.push(`${groupLabel} (alert: ${alertFormatted})`);
    for (const p of triggeredProducts) {
      textLines.push(
        `  - ${p.product_name} (${p.vendor_name}): ${formatCents(p.price)}`,
      );
    }
    textLines.push("");
    //html version
    htmlSections.push(`
      <h3>${escapeHtml(groupLabel)} <small style="color:#666">(alert: ${alertFormatted})</small></h3>
      <ul>
        ${triggeredProducts
          .map(
            (p) =>
              `<li><strong>${escapeHtml(p.product_name)}</strong> (${escapeHtml(p.vendor_name)}): ${formatCents(p.price)}</li>`,
          )
          .join("\n        ")}
      </ul>`);
  }
  const bodyText = textLines.join("\n");
  const bodyHtml = `
<h2>Grocery price alert</h2>
${htmlSections.join("\n")}
<p>You will receive another notification once all products in a group rise back above the alert price.</p>`;

  await ses.send(
    new SendEmailCommand({
      Source: SENDER_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: bodyText, Charset: "UTF-8" },
          Html: { Data: bodyHtml, Charset: "UTF-8" },
        },
      },
    }),
  );

  logger.info("Sent notification email", { toEmail, groupCount, subject });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
