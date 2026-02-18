"use client";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";
Amplify.configure(outputs);
//Wrapper used inside layout.tsx so that all pages are automatically configured for AWS Amplify.
export default function ConfigureAmplifyClientSide() {
  return null; //No need to do anything here, just need to run the above imports + config.
}
