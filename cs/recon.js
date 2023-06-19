// This file is our recon file. It gathers information about a website for the purpose of
// fingerprinting it.

chrome.runtime.sendMessage({action: "start-timer"}, null, (response) => {});