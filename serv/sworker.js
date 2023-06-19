import { extract_domain, core, data_post } from "./helper.js"

/** Global Variables */
let network_cache = []
let timeout_integer = null;
let timeout_cancel_count = 0;
let TIMEOUT_MAX = 15
let TIMEOUT_DURATION = 1000;
let data_exfil = false;
let current_jobpk = null;
let current_tab = null;


function register_agent() {

}

async function get_job() {
    let request_data = {

    }

    let response = data_post(`${core.hostname}/agent/queue/job`, request_data);
    let target_url = await response.then((raw) => {return raw.json()})
        .then((data) => {
            current_jobpk = data.jobpk;
            return data.target_url;
        });
    
    return target_url;
}

async function exfiltrate_data(jobpk) {
    let request_data = {
        expected_domains: network_cache,
    }
    let response = data_post(`${core.hostname}/agent/job/${jobpk}`, request_data);
    chrome.tabs.remove(current_tab)

    data_exfil = false;
    timeout_cancel_count = 0;
    timeout_integer = null;
    network_cache = []
    current_tab = null;

    return true;
}

/** Content Script Monitoring */
chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.action == "start-timer") {
        timeout_integer = setTimeout(() => {exfiltrate_data(current_jobpk)}, 3000);
    }
});

/** Network Request Monitoring */
function extract_before_request(details) {
    // we extract all we can from this event and add it to the
    // object for later serialization. We will harvest most of 
    // the informtion from this event.
    if (JSON.stringify(details).includes("chrome-extension://")) {
        return;
    }
    
    let domain = extract_domain(details.url);
    if (!network_cache.includes(domain)) {
        network_cache.push(domain);

        if (!data_exfil && timeout_cancel_count < TIMEOUT_MAX) {
            clearTimeout(timeout_integer);
            timeout_integer = setTimeout(() => {exfiltrate_data(current_jobpk)}, TIMEOUT_DURATION);
            timeout_cancel_count++;
        } else if (!data_exfil && timeout_cancel_count >= TIMEOUT_MAX) {
            exfiltrate_data(current_jobpk);
        }
    }

    
}

chrome.webRequest.onBeforeRequest.addListener(extract_before_request, {urls: ["<all_urls>"]}, ["requestBody"]);
setInterval(async () => {
    let url = await get_job();
    if (url == null || url == undefined) {
        return;
    } else {
        chrome.tabs.create({url: url}, (tab) => {
            current_tab = tab.id;
        });
    }
}, 3000);