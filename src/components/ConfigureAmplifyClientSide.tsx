"use client";
import ConfigureAmplify from "./ConfigureAmplify";
//Wrapper used inside layout.tsx so that all pages are automatically configured for AWS Amplify.
ConfigureAmplify();
export default function ConfigureAmplifyClientSide() {
  return null; //No need to do anything here, just need to run the above imports + config.
}
