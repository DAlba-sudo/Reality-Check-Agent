// this serves as our reality-check agent. It will open a new tab after registering with
// the rs server, collect info for 5 seconds, then send it back to the hq.

/** Global Variables used for STATE */
let core = {
    // this points to the location of the server
    // set this to localhost for testing purposes.
    hostname: "http://recon-webserver:8000",

    // the consumer primary key, used to access the pool of jobs that
    // this consumer has requested from the RS servers.
    cpk: null,
    is_working: false,
};

let current_target = null;
let network_cache = []

/** Helper Functions */
function extract_domain(url) {
    let protocol_end = url.indexOf("://");
    let path_start = url.indexOf('/', protocol_end+3);
    let domains = url.substring(protocol_end+3, path_start);
    let domains_arr = domains.split('.');

    if (domains_arr.length > 2) {
        return `${domains_arr[domains_arr.length-2]}.${domains_arr[domains_arr.length-1]}`; 
    } else {
        return domains;
    }

}

/**
 * This takes a hostname and a url and compares to see if they are both within
 * the same domain.
 * 
 * @param {String} url the url that we check to see if it is foreign.
 * @returns 
 */
function is_foreign(url, hostname) {
    let revised_url = url
    if (url.charAt(0) == '/') {
        return false;
    } else if (url.indexOf('://') == -1) {
        // no protocol specified, we assume https.
        revised_url = `https://${url}`;
    }

    // we break the url into its component pieces
    return extract_domain(revised_url) != extract_domain(hostname);
}

/**
 * Helper func to post data to a server without having to specify
 * the headers each time.
 * @param {String} url The url that we are posting to.
 * @param {JSON} data Data being sent in the request body.
 * @returns A js promise.
 */
async function post(url, data) {
    return fetch(url, {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
        },
        "body": JSON.stringify(data),
    });
}

function register() {

}

async function start_job(target, jpk) {
    // clear the network cache
    network_cache = []
    current_target = target;

    // open a tab to the target 
    chrome.tabs.create(
        {url: target}, (tab) => {
            setTimeout((handler) => {
                chrome.tabs.remove(tab.id);
            }, 2500);
        }
    );

    setTimeout((handler) => {
        let results = {
            result: {expected_foreign_traffic: network_cache},
        }

        // send the data back to HQ after 2 seconds
        let response = post(`${core.hostname}/agent/job/${jpk}`, results);
        core.is_working = false;
        current_target = null;

    }, 2000);
}

/**
 * This function will query the RS server for any jobs that need processing.
 * Once we get one, we begin to work on it.
 */
async function get_job() {
    if (!core.is_working) {
        let response = await post(`${core.hostname}/agent/job/get`, {})
            .then((raw) => {return raw.json()})
            .then((data) => {
                return data;
            });
        if (response.pk != undefined || response.pk != null) {
            core.is_working = true;
            start_job(response.target, response.pk);
        }
        
        console.log(response);
    }
}

/** Network Request Monitoring */
function extract_before_request(details) {
    // we extract all we can from this event and add it to the
    // object for later serialization. We will harvest most of 
    // the informtion from this event.
    if (current_target = null) {
        return;
    }
    else if (JSON.stringify(details).includes("chrome-extension")) {
        return;
    }
    
    let url_domain = extract_domain(details.url);
    if (is_foreign(details.url, current_target) && !network_cache.includes(url_domain)) {
        network_cache.push(url_domain);
    }
}

async function main() {
    // first we register the agent.
    register();

    // now we set the onBeforeRequest network listener
    chrome.webRequest.onBeforeRequest.addListener(extract_before_request, {urls: ["<all_urls>"]}, ["requestBody"]);

    // next we ask for jobs until we get one using an interval
    // for repetition
    let job_check_interval = setInterval(get_job, 500);
}

main();