require("dotenv").config();
const os = require("os");
const pino = require("pino");
const moment = require("moment");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const firebase = require("firebase");
const config  = require("./config/firebase.config")
firebase.initializeApp(config);
logger.info("APP started")

const MAC_ADDR = os.networkInterfaces().wlan0[0].mac;

const db = firebase.database();
logger.debug("Database reference acquired")

let devicesRef = db.ref("devices");
devicesRef.once("value", function(snapshot) {
    var devices = snapshot.val();
    var noDevices = Object.keys(devices).length;

    if (noDevices > 0) {
        var isDeviceExist = false;
        Object.keys(devices).forEach(function(key) {
            if (devices[key].mac == MAC_ADDR) {
                isDeviceExist = true;
            }
        })

        if (!isDeviceExist) {
            devicesRef.push({
                name: process.env.DEVICE_NAME,
                mac: MAC_ADDR
            })
        }
    }
})

const miflora = require("miflora");
var opts = {
    duration: process.env.SCANNER_POLLTIME
}
logger.info(`Scan duration set at: ${opts.duration / 1000}s`);


const interval = parseInt(process.env["SCHEDULER_INTERVAL"]);
logger.info(`Scheduler is set to run every ${interval} minutes`)

readSensors();
let nextScan = moment().add(interval, "m").fromNow();
logger.info(`SCAN COMPLETED. NEXT SCAN ${nextScan}`)

setInterval(function() {
    readSensors();
    let nextScan = moment().add(interval, "m").fromNow();
    logger.info(`SCAN COMPLETED. NEXT SCAN ${nextScan}`)

}, process.env.SCHEDULER_INTERVAL * 60 * 1000);


function readSensors() {
    const scanner = miflora.discover(opts);

    (async function() {

        logger.info("STARTING SCAN")
        let result = await scanner;
        logger.info(`FOUND ${result.length} sensors nearby`)
    
        for (var device of result) {
            logger.info("Reading sensor data");
            try {
                let query = device.query();
                let data = await query;
                let reading = {
                    ...data.sensorValues,
                    ...data.firmwareInfo,
                    rssi: data.rssi,
                    mac: data.address,
                    timestamp: Date.now()
                }
                saveReading(reading);
                logger.info("Sensor data saved to DB")
            } catch (err) {
                logger.error(`Failed to read sensor. error: ${err}`)
            }    

        }

    })();
}


function saveReading(reading) {

    let readingRef = db.ref("readings/" + process.env.DEVICE_NAME);
    readingRef.push(reading);

}