import { EventBridgeEvent } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "ap-southeast-2" });

export const handler = async (
  event: EventBridgeEvent<"ScrapeComplete", { changedProductIds: number[] }>,
) => {
  const { changedProductIds } = event.detail;
  //TODO: write logic to determine which users to send notifications to based on changedProductIds and their notification preferences
};
