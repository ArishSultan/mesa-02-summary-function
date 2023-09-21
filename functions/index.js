const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const {logger} = require("firebase-functions");
const admin = require('firebase-admin');

initializeApp();

exports.summary = onRequest(async (req, res) => {
    try {
        const startTimeStr = req.query.startTime;
        const endTimeStr = req.query.endTime;

        if (!startTimeStr || !endTimeStr) {
            res.status(400).send("Invalid parameters");
        }

        const startTime = admin.firestore.Timestamp.fromDate(new Date(startTimeStr.toString()));
        const endTime = admin.firestore.Timestamp.fromDate(new Date(endTimeStr.toString()));

        const querySnapshot = await getFirestore()
            .collection("gh-gmc")
            .doc('test')
            .collection('haul-cycle-summary')
            .where("DumpingEndTime", '<', endTime)
            .where('DumpingEndTime', '>', startTime)
            .get();

        const combinationMap = new Map();

        querySnapshot.forEach((doc) => {
            const loaderName = doc.data()["LoaderName"];
            const dumpName = doc.data()["DumpName"];
            const netWeight = doc.data()["NetWeight_tonne"];

            const key = `${loaderName}_${dumpName}`;
            const currentValue = combinationMap.get(key) || 0;
            combinationMap.set(key, currentValue + netWeight);
        });

        const uniqueCombinations = Array.from(combinationMap, ([key, netWeight]) => {
            const [loaderName, dumpName] = key.split('_');
            return { loaderName, dumpName, netWeight };
        });

        res.send(uniqueCombinations)
    } catch (error) {
        logger.error(error.message);
        res.status(500).send(`Error fetching summary: ${error.message}`);
    }
});