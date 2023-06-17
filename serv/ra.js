// this serves as our reality-check agent. It will open a new tab after registering with
// the rs server, collect info for 5 seconds, then send it back to the hq.

/** Global Variables used for STATE */
let core = {
    // this points to the location of the server
    // set this to localhost for testing purposes.
    hostname: "http://127.0.0.1:8000",

    // the consumer primary key, used to access the pool of jobs that
    // this consumer has requested from the RS servers.
    cpk: null,
    is_working: false,
};

/** Helper Functions */
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

/**
 * This function will query the RS server for any jobs that need processing.
 * Once we get one, we begin to work on it.
 */
async function get_job() {
    if (!core.is_working) {
        let response = await post(`${core.hostname}/agent/job/get`, {});
        core.is_working = true;

        console.log(response);
    }
}

async function main() {
    // first we register the agent.
    register();

    // next we ask for jobs until we get one using an interval
    // for repetition
    let job_check_interval = setInterval(get_job, 500);
}