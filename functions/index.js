const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const {logger} = require("firebase-functions");
const admin = require('firebase-admin');

// const serviceAccount = require('./key.json');
// initializeApp({ credential: admin.credential.cert(serviceAccount) });

initializeApp();

exports.summary = onRequest(async (req, res) => {
    try {
        const startTimeStr = req.query.startTime;
        const endTimeStr = req.query.endTime;

        const startTime = admin.firestore.Timestamp.fromDate(new Date(startTimeStr.toString()));
        const endTime = admin.firestore.Timestamp.fromDate(new Date(endTimeStr.toString()));

        const querySnapshot = await getFirestore()
            .collection("gh-gmc").doc('test').collection('haul-cycle-summary').where("DumpingEndTime", '<', endTime).where('DumpingEndTime', '>', startTime).get();

        const filteredData = [];
        querySnapshot.forEach((doc) => {
            filteredData.push(doc.data());
        });

        const combinationMap = new Map();

        filteredData.forEach((doc) => {
            const loaderName = doc["LoaderName"];
            const dumpName = doc["DumpName"];
            const netWeight = doc["NetWeight_tonne"];

            // Create a unique key for each combination
            const key = `${loaderName}_${dumpName}`;

            if (combinationMap.has(key)) {
                combinationMap.set(key, combinationMap.get(key) + netWeight);
            } else {
                combinationMap.set(key, netWeight);
            }
        });

        const uniqueCombinations = [];
        combinationMap.forEach((netWeight, key) => {
            const [loaderName, dumpName] = key.split('_');
            uniqueCombinations.push({ loaderName, dumpName, netWeight });
        });

        res.json(uniqueCombinations)
    } catch (error) {
        logger.error(error.message);
        res.status(500).send(`Error fetching summary: ${error.message}`);
    }
});